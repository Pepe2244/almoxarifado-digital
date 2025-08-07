// Define a URL base da nossa API.
// Quando rodando localmente com 'netlify dev', a Netlify automaticamente
// redireciona chamadas para este caminho para nossas funções.
const API_BASE_URL = '/.netlify/functions';

/**
 * Lida com respostas da API, tratando sucessos e erros de forma padronizada.
 * @param {Response} response - O objeto de resposta do fetch.
 * @returns {Promise<any>} - O corpo da resposta em JSON.
 * @throws {Error} - Lança um erro se a resposta não for bem-sucedida.
 */
async function handleResponse(response) {
    if (response.ok) {
        // Se a resposta for "No Content" (código 204), não há corpo para ler.
        if (response.status === 204) {
            return null;
        }
        return response.json();
    } else {
        // Se houver um erro, tenta ler a mensagem de erro da API.
        const errorBody = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
        const errorMessage = errorBody.error || `Request failed with status ${response.status}`;
        console.error('API Error:', errorMessage, 'Details:', errorBody.details || 'N/A');
        throw new Error(errorMessage);
    }
}

/**
 * Busca todos os itens da API.
 * Corresponde ao método GET em /items.
 * @returns {Promise<Array>} - Uma lista de itens.
 */
export async function getAllItems() {
    try {
        const response = await fetch(`${API_BASE_URL}/items`);
        return await handleResponse(response);
    } catch (error) {
        showToast(`Erro ao buscar itens: ${error.message}`, "error");
        return [];
    }
}

/**
 * Cria um novo item na API.
 * Corresponde ao método POST em /items.
 * @param {object} itemDetails - Os detalhes do item a ser criado.
 * @returns {Promise<object|null>} - O item criado ou null em caso de erro.
 */
export async function createItem(itemDetails) {
    try {
        const response = await fetch(`${API_BASE_URL}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemDetails),
        });
        return await handleResponse(response);
    } catch (error) {
        showToast(`Erro ao criar item: ${error.message}`, "error");
        return null;
    }
}

/**
 * Atualiza um item existente na API.
 * Corresponde ao método PUT em /items/:id.
 * @param {string} itemId - O ID do item a ser atualizado.
 * @param {object} updatedDetails - Os novos detalhes do item.
 * @returns {Promise<object|null>} - O item atualizado ou null em caso de erro.
 */
export async function updateItem(itemId, updatedDetails) {
    try {
        const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedDetails),
        });
        return await handleResponse(response);
    } catch (error) {
        showToast(`Erro ao atualizar item: ${error.message}`, "error");
        return null;
    }
}

/**
 * Deleta um item da API.
 * Corresponde ao método DELETE em /items/:id.
 * @param {string} itemId - O ID do item a ser deletado.
 * @returns {Promise<boolean>} - True se foi bem-sucedido, false caso contrário.
 */
export async function deleteItem(itemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
            method: 'DELETE',
        });
        await handleResponse(response);
        return true;
    } catch (error) {
        showToast(`Erro ao deletar item: ${error.message}`, "error");
        return false;
    }
}

// Futuramente, adicionaremos aqui as funções para os outros endpoints:
// export async function getAllCollaborators() { ... }
// export async function createCollaborator(details) { ... }