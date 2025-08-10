// Importa nosso novo "mensageiro" de API.
import { apiClient } from './apiClient.js';

// Importa o sistema de alertas para dar feedback ao usuário.
// Certifique-se de que o caminho para o uiManager está correto.
import { showToast } from './uiManager.js';

// 'items' agora é um cache em memória. Guardamos os dados aqui depois de buscá-los
// uma vez da API, para não precisar fazer requisições o tempo todo.
let items = [];
const endpoint = 'items'; // Nome do nosso endpoint da API.

/**
 * Busca todos os itens da API e preenche o cache local.
 * Esta função deve ser chamada quando a aplicação inicia.
 * @returns {Promise<Array>} Uma promessa que resolve com a lista de itens.
 */
export async function fetchItems() {
    try {
        // Usa o apiClient para fazer uma requisição GET para o endpoint 'items'.
        items = await apiClient.get(endpoint);
        console.log('Itens carregados do banco de dados:', items);
        return items;
    } catch (error) {
        // Se a API falhar, exibe uma mensagem de erro para o usuário.
        showToast(`Erro ao carregar itens do servidor: ${error.message}`, 'error');
        items = []; // Garante que o cache fique vazio em caso de erro.
        return [];
    }
}

/**
 * Retorna todos os itens do cache local.
 * @returns {Array} A lista de itens.
 */
export function getAllItems() {
    return items;
}

/**
 * Encontra um item pelo seu ID no cache local.
 * @param {number | string} id - O ID do item a ser encontrado.
 * @returns {object | undefined} O objeto do item ou undefined se não for encontrado.
 */
export function getItemById(id) {
    // O ID vindo do banco é um número, mas de elementos HTML pode vir como string.
    // Convertemos para número para garantir a comparação correta.
    const numericId = parseInt(id, 10);
    return items.find(item => item.id === numericId);
}

/**
 * Envia um novo item para ser criado no banco de dados via API.
 * @param {object} itemData - Os dados do novo item.
 * @returns {Promise<object | null>} O novo item criado ou nulo em caso de falha.
 */
export async function createItem(itemData) {
    try {
        const newItem = await apiClient.post(endpoint, itemData);
        // Adiciona o novo item retornado pela API ao nosso cache local.
        items.push(newItem);
        showToast('Item criado com sucesso!', 'success');
        return newItem;
    } catch (error) {
        showToast(`Erro ao criar item: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Envia os dados de um item para serem atualizados no banco de dados.
 * @param {object} itemData - Os dados atualizados do item (deve incluir o ID).
 * @returns {Promise<object | null>} O item atualizado ou nulo em caso de falha.
 */
export async function updateItem(itemData) {
    try {
        const updatedItem = await apiClient.put(endpoint, itemData);
        // Encontra o índice do item antigo no cache e o substitui pelo item atualizado.
        const index = items.findIndex(item => item.id === updatedItem.id);
        if (index !== -1) {
            items[index] = updatedItem;
        }
        showToast('Item atualizado com sucesso!', 'success');
        return updatedItem;
    } catch (error) {
        showToast(`Erro ao atualizar item: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Solicita a exclusão de um item do banco de dados.
 * @param {number | string} id - O ID do item a ser deletado.
 * @returns {Promise<boolean>} Verdadeiro se a exclusão for bem-sucedida, falso caso contrário.
 */
export async function deleteItem(id) {
    try {
        await apiClient.delete(endpoint, id);
        // Remove o item do nosso cache local.
        items = items.filter(item => item.id !== parseInt(id, 10));
        showToast('Item excluído com sucesso!', 'success');
        return true;
    } catch (error) {
        showToast(`Erro ao excluir item: ${error.message}`, 'error');
        return false;
    }
}
