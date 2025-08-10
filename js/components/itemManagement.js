// Importa as funções refatoradas do nosso novo itemManager.
// Agora elas conversam com a API!
import { getAllItems, createItem, updateItem, deleteItem, getItemById } from '../modules/itemManager.js';
import { showToast } from '../modules/uiManager.js';
import { openModal, closeModal } from '../modules/uiManager.js';

// Guarda as referências aos elementos do DOM para não precisar buscá-los toda hora.
let itemForm, itemModal, itemsTableBody, filterInput, itemIdField;

/**
 * Inicializa o componente de gestão de itens, adicionando os listeners de eventos.
 */
export function initializeItemManagement() {
    itemForm = document.getElementById('item-form');
    itemModal = document.getElementById('item-modal');
    itemsTableBody = document.getElementById('items-table-body');
    filterInput = document.getElementById('filter-items');
    itemIdField = document.getElementById('item-id');

    // Listener para o formulário (criar ou editar item).
    itemForm.addEventListener('submit', handleFormSubmit);

    // Listener para o campo de busca/filtro.
    filterInput.addEventListener('input', renderItems);

    // Listener para cliques na tabela (para botões de editar e excluir).
    itemsTableBody.addEventListener('click', handleTableClick);

    // Renderiza a lista de itens que já foram carregados no cache.
    renderItems();
}

/**
 * Renderiza os itens na tabela, aplicando o filtro de busca.
 */
function renderItems() {
    const filterText = filterInput.value.toLowerCase();
    const allItems = getAllItems(); // Pega os itens do cache local.

    itemsTableBody.innerHTML = ''; // Limpa a tabela antes de adicionar as novas linhas.

    const filteredItems = allItems.filter(item =>
        item.name.toLowerCase().includes(filterText) ||
        (item.barcode && item.barcode.toLowerCase().includes(filterText))
    );

    if (filteredItems.length === 0) {
        itemsTableBody.innerHTML = '<tr><td colspan="6">Nenhum item encontrado.</td></tr>';
        return;
    }

    filteredItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name || 'N/A'}</td>
            <td>${item.currentStock || 0} ${item.unit || ''}</td>
            <td>${item.status || 'N/A'}</td>
            <td>R$ ${Number(item.price || 0).toFixed(2)}</td>
            <td>
                <button class="edit-btn" data-id="${item.id}">Editar</button>
                <button class="delete-btn" data-id="${item.id}">Excluir</button>
            </td>
        `;
        itemsTableBody.appendChild(row);
    });
}

/**
 * Lida com o envio do formulário para criar ou atualizar um item.
 * @param {Event} e - O evento de submit.
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const id = itemIdField.value;

    // Cria um objeto com os dados do formulário.
    const formData = new FormData(itemForm);
    const itemData = Object.fromEntries(formData.entries());

    // Converte os valores numéricos.
    itemData.minStock = parseInt(itemData.minStock) || 0;
    itemData.maxStock = parseInt(itemData.maxStock) || 0;
    itemData.currentStock = parseInt(itemData.currentStock) || 0;
    itemData.price = parseFloat(itemData.price) || 0;

    // Mostra um indicador de loading
    showToast('Salvando...', 'info');

    let success = false;
    if (id) {
        // Se tem ID, é uma atualização.
        itemData.id = parseInt(id);
        success = await updateItem(itemData);
    } else {
        // Se não tem ID, é uma criação.
        success = await createItem(itemData);
    }

    if (success) {
        renderItems(); // Re-renderiza a tabela para mostrar as mudanças.
        closeModal(itemModal);
        itemForm.reset();
    }
    // As mensagens de sucesso/erro já são mostradas pelo itemManager.
}

/**
 * Lida com cliques nos botões de 'Editar' e 'Excluir' na tabela.
 * @param {Event} e - O evento de clique.
 */
async function handleTableClick(e) {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        const item = getItemById(id);
        if (item) {
            populateForm(item);
            openModal(itemModal);
        }
    }

    if (target.classList.contains('delete-btn')) {
        if (confirm(`Tem certeza que deseja excluir o item com ID ${id}?`)) {
            const success = await deleteItem(id);
            if (success) {
                renderItems(); // Atualiza a lista na tela.
            }
        }
    }
}

/**
 * Preenche o formulário com os dados de um item para edição.
 * @param {object} item - O objeto do item.
 */
function populateForm(item) {
    itemForm.reset();
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-name').value = item.name || '';
    document.getElementById('item-barcode').value = item.barcode || '';
    document.getElementById('item-type').value = item.type || '';
    document.getElementById('item-unit').value = item.unit || '';
    document.getElementById('item-minStock').value = item.minStock || 0;
    document.getElementById('item-maxStock').value = item.maxStock || 0;
    document.getElementById('item-currentStock').value = item.currentStock || 0;
    document.getElementById('item-price').value = item.price || 0;
    document.getElementById('item-status').value = item.status || 'disponível';
    // Para o campo de localização JSON, você pode precisar de um tratamento especial
    // document.getElementById('item-location').value = JSON.stringify(item.location || {});
}
