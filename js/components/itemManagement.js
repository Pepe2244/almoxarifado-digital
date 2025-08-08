import { apiClient } from '../modules/apiClient.js';
import { getItemById, deleteItem, getAllItems } from '../modules/itemManager.js';
import { openConfirmationModal, closeModal, showToast, openMovementModal, openAdjustmentModal, openDirectLossModal } from '../modules/uiManager.js';
import { MODAL_IDS } from '../constants.js';
import { getSettings } from '../modules/settings.js';
import { suggestLocation } from '../modules/mapping.js';

const closeAllActionDropdowns = () => {
    const openDropdowns = document.querySelectorAll('.actions-dropdown-content.active');
    openDropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
        dropdown.classList.add('hidden');
        // Se o dropdown foi movido para o body, ele deve ser removido
        if (dropdown.parentElement === document.body) {
            document.body.removeChild(dropdown);
        }
    });
};

document.addEventListener('click', (event) => {
    // Se o clique não for no botão de toggle nem dentro de um dropdown ativo, fecha todos
    if (!event.target.closest('[data-action="toggle-actions-dropdown"]') && !event.target.closest('.actions-dropdown-content.active')) {
        closeAllActionDropdowns();
    }
});


function populateTypeFilter() {
    const settings = getSettings();
    const filterSelect = document.getElementById('item-type-filter');
    if (!filterSelect) return;

    const selectedValue = filterSelect.value;
    while (filterSelect.options.length > 1) {
        filterSelect.remove(1);
    }
    settings.itemTypes.forEach(type => {
        const option = new Option(type, type);
        filterSelect.add(option);
    });
    filterSelect.value = selectedValue;
}

export function initializeItemManagement() {
    populateTypeFilter();

    const typeFilter = document.getElementById('item-type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            document.body.dispatchEvent(new CustomEvent('dataChanged'));
        });
    }

    const searchContainer = document.querySelector('#item-management .search-container');
    if (searchContainer) {
        searchContainer.addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('active');
            const input = e.currentTarget.querySelector('.search-input');
            if (e.currentTarget.classList.contains('active')) {
                input.focus();
            }
        });
    }

    document.body.addEventListener('click', (event) => {
        const button = event.target.closest('button, a');
        const action = button?.dataset.action;
        if (!action) return;

        if (button.tagName === 'A') {
            event.preventDefault();
        }

        const itemId = button?.dataset.id || button?.dataset.itemId || event.target.closest('tr')?.dataset.id;

        switch (action) {
            case 'open-item-form-modal':
                openItemFormModal();
                break;
            case 'open-mass-add-modal':
                openMassAddModal();
                break;
            case 'edit-item':
                if (itemId) openItemFormModal(itemId);
                break;
            case 'delete-item':
                if (itemId) handleDeleteItem(itemId);
                break;
            case 'manage-batches':
                if (itemId) openItemBatchesModal(itemId);
                break;
            case 'view-history':
                if (itemId) openItemHistoryModal(itemId);
                break;
            case 'register-loan':
                if (itemId) openMovementModal(itemId);
                break;
            case 'adjust-stock':
                if (itemId) openAdjustmentModal(itemId);
                break;
            case 'direct-loss':
                if (itemId) openDirectLossModal(itemId);
                break;
            case 'quick-add-stock':
                if (itemId) openAdjustmentModal(itemId);
                break;
            case 'toggle-actions-dropdown':
                {
                    const dropdownContainer = button.closest('.actions-dropdown-container');
                    const dropdown = dropdownContainer.querySelector('.actions-dropdown-content');
                    const isActive = dropdown.classList.contains('active');

                    // Fecha todos os outros dropdowns abertos antes de decidir o que fazer
                    closeAllActionDropdowns();

                    if (!isActive) {
                        // Move o dropdown para o body para evitar problemas de overflow
                        document.body.appendChild(dropdown);
                        dropdown.classList.remove('hidden');
                        dropdown.classList.add('active');

                        // Calcula a posição
                        const buttonRect = button.getBoundingClientRect();
                        dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`;
                        dropdown.style.left = `${buttonRect.left + window.scrollX}px`;

                        // Ajusta a posição para não sair da tela
                        const dropdownRect = dropdown.getBoundingClientRect();
                        if (dropdownRect.right > window.innerWidth) {
                            dropdown.style.left = `${buttonRect.right + window.scrollX - dropdownRect.width}px`;
                        }
                        if (dropdownRect.bottom > window.innerHeight) {
                            dropdown.style.top = `${buttonRect.top + window.scrollY - dropdownRect.height}px`;
                        }
                    }
                    event.stopPropagation();
                    break;
                }
        }
    });
}

export function renderItemsTable(items) {
    const tableBody = document.getElementById('items-table-body');
    if (!tableBody) return;

    // Antes de renderizar, move qualquer dropdown de volta para seu container original
    document.querySelectorAll('.actions-dropdown-content.active').forEach(dropdown => {
        const originalContainerId = dropdown.dataset.originalContainer;
        const originalContainer = document.querySelector(`[data-container-id="${originalContainerId}"]`);
        if (originalContainer) {
            originalContainer.appendChild(dropdown);
            dropdown.classList.remove('active');
            dropdown.classList.add('hidden');
        }
    });


    tableBody.innerHTML = '';

    const filterValue = document.getElementById('item-type-filter')?.value;
    const filteredItems = filterValue && filterValue !== 'all' ? items.filter(item => item.type === filterValue) : items;

    if (filteredItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum item encontrado com os filtros atuais.</td></tr>';
        return;
    }

    filteredItems.forEach(item => {
        const row = document.createElement('tr');
        const uniqueId = `dropdown-container-${item.id}`;
        row.dataset.id = item.id;
        row.innerHTML = `
            <td data-label="Item">${item.name}</td>
            <td data-label="Tipo">${item.type}</td>
            <td data-label="Estoque">${item.currentStock || 0}</td>
            <td data-label="Preço (R$)">${Number(item.price || 0).toFixed(2)}</td>
            <td data-label="Status"><span class="status-badge status-${item.status || 'disponível'}">${item.status || 'disponível'}</span></td>
            <td data-label="Ações">
                <div class="actions-dropdown-container" data-container-id="${uniqueId}">
                    <button class="btn btn-secondary btn-sm btn-icon-only" data-action="toggle-actions-dropdown" aria-label="Mais ações">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="actions-dropdown-content hidden" data-original-container="${uniqueId}">
                        <button data-action="register-loan" data-id="${item.id}"><i class="fas fa-sign-out-alt"></i> Saída / Empréstimo</button>
                        <button data-action="adjust-stock" data-id="${item.id}"><i class="fas fa-sync-alt"></i> Ajustar Estoque</button>
                        <button data-action="direct-loss" data-id="${item.id}"><i class="fas fa-heart-broken"></i> Registrar Perda</button>
                        <div class="dropdown-divider"></div>
                        <button data-action="edit-item" data-id="${item.id}"><i class="fas fa-edit"></i> Editar Detalhes</button>
                        <button data-action="manage-batches" data-id="${item.id}"><i class="fas fa-boxes"></i> Gerenciar Lotes</button>
                        <button data-action="view-history" data-id="${item.id}"><i class="fas fa-history"></i> Ver Histórico</button>
                        <div class="dropdown-divider"></div>
                        <button class="danger-action" data-action="delete-item" data-id="${item.id}"><i class="fas fa-trash"></i> Excluir Item</button>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function openItemFormModal(itemId = null) {
    const modal = document.getElementById(MODAL_IDS.ITEM_FORM);
    const template = document.getElementById('item-form-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;
    const form = modal.querySelector('#item-form');
    const title = modal.querySelector('#item-form-modal-title');
    const typeSelect = form.elements.type;

    const settings = getSettings();
    typeSelect.innerHTML = '';
    settings.itemTypes.forEach(type => {
        const option = new Option(type, type);
        typeSelect.add(option);
    });

    if (itemId) {
        const item = getItemById(itemId);
        if (item) {
            title.textContent = `Editar Item: ${item.name}`;
            form.elements.id.value = item.id;
            form.elements.name.value = item.name;
            form.elements.barcode.value = item.barcode || '';
            form.elements.type.value = item.type;
            form.elements.unit.value = item.unit || '';
            form.elements.minStock.value = item.minStock || 0;
            form.elements.maxStock.value = item.maxStock || 0;
            form.elements.price.value = item.price || 0;
            form.elements.shelfLifeDays.value = item.shelfLifeDays || 0;
            form.elements.status.value = item.status || 'disponível';
            form.elements.aisle.value = item.location?.aisle || '';
            form.elements.shelf.value = item.location?.shelf || '';
            form.elements.box.value = item.location?.box || '';

            const stockField = form.querySelector('[name="currentStock"]').parentElement;
            if (stockField) stockField.style.display = 'none';
        }
    } else {
        title.textContent = 'Adicionar Novo Item';
        const suggested = suggestLocation();
        if (suggested) {
            form.elements.aisle.value = suggested.aisle;
            form.elements.shelf.value = suggested.shelf;
            form.elements.box.value = suggested.box;
        }
    }
    modal.showModal();
}

async function _renderBatchesTable(modal, itemId) {
    const batches = await apiClient.get(`item-details/${itemId}/batches`);
    const tableBody = modal.querySelector('#batches-table-body');
    tableBody.innerHTML = '';

    if (batches && batches.length > 0) {
        batches.forEach(batch => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${batch.id}</td>
                <td>${batch.quantity}</td>
                <td>${new Date(batch.acquisition_date).toLocaleDateString('pt-BR')}</td>
                <td>${batch.manufacturing_date ? new Date(batch.manufacturing_date).toLocaleDateString('pt-BR') : 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="4">Nenhum lote encontrado.</td></tr>';
    }
}

async function openItemBatchesModal(itemId) {
    const modal = document.getElementById(MODAL_IDS.ITEM_BATCHES);
    const template = document.getElementById('item-batches-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;
    const item = getItemById(itemId);
    modal.querySelector('#item-batches-modal-title').textContent = `Lotes de: ${item.name}`;
    modal.querySelector('#item-batches-item-id').value = itemId;

    await _renderBatchesTable(modal, itemId);

    modal.querySelector('#batch-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const batchData = {
            quantity: parseInt(form.elements.quantity.value, 10),
            acquisitionDate: form.elements.acquisitionDate.value,
            manufacturingDate: form.elements.manufacturingDate.value || null,
            shelfLifeDays: parseInt(form.elements.shelfLifeDays.value, 10) || null
        };

        if (itemId && batchData.quantity > 0 && batchData.acquisitionDate) {
            await apiClient.post(`item-details/${itemId}/batches`, batchData);
            showToast('Lote adicionado com sucesso!', 'success');
            form.reset();
            document.body.dispatchEvent(new CustomEvent('dataChanged', { detail: { noClose: true } }));
            await _renderBatchesTable(modal, itemId);
        } else {
            showToast('Por favor, preencha a quantidade e a data de aquisição.', 'error');
        }
    });

    modal.showModal();
}


async function openItemHistoryModal(itemId) {
    const modal = document.getElementById(MODAL_IDS.ITEM_HISTORY);
    const template = document.getElementById('item-history-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;
    const item = getItemById(itemId);
    modal.querySelector('#item-history-modal-title').textContent = `Histórico de: ${item.name}`;

    const history = await apiClient.get(`item-details/${itemId}/history`);
    const historyContent = modal.querySelector('#history-content');
    historyContent.innerHTML = '';

    if (history && history.length > 0) {
        let historyHTML = '<div class="history-list">';
        history.forEach(entry => {
            const date = new Date(entry.created_at).toLocaleString('pt-BR');
            const typeClass = (entry.type || '').toLowerCase().replace(/[^a-z]/g, '-');
            const icon = {
                'entrada': 'fa-arrow-circle-down',
                'saída': 'fa-arrow-circle-up',
                'ajuste': 'fa-sync-alt',
                'perda': 'fa-heart-broken',
                'devolução': 'fa-undo-alt'
            }[typeClass] || 'fa-history';

            historyHTML += `
                <div class="history-entry history-${typeClass}">
                    <div class="history-icon"><i class="fas ${icon}"></i></div>
                    <div class="history-details">
                        <p><strong>${entry.type}</strong> por <strong>${entry.responsible || 'Sistema'}</strong></p>
                        <p>${entry.details}</p>
                        <small>${date}</small>
                    </div>
                    <div class="history-quantity">
                        <span>${entry.quantity_change > 0 ? '+' : ''}${entry.quantity_change}</span>
                    </div>
                </div>
            `;
        });
        historyHTML += '</div>';
        historyContent.innerHTML = historyHTML;
    } else {
        historyContent.innerHTML = '<p>Nenhum histórico de movimentação para este item.</p>';
    }

    modal.showModal();
}


function openMassAddModal() {
    const modal = document.getElementById(MODAL_IDS.MASS_ADD);
    const template = document.getElementById('mass-add-modal-template');
    if (!modal || !template) return;
    modal.innerHTML = template.innerHTML;
    modal.showModal();
}

function handleDeleteItem(itemId) {
    const item = getItemById(itemId);
    if (!item) return;

    openConfirmationModal({
        title: 'Confirmar Exclusão',
        message: `Tem a certeza de que deseja excluir o item "${item.name}"? Esta ação não pode ser desfeita.`,
        onConfirm: async () => {
            const success = await deleteItem(itemId);
            if (success) {
                showToast('Item excluído com sucesso!', 'success');
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            } else {
                showToast('Falha ao excluir o item.', 'error');
            }
            closeModal(MODAL_IDS.CONFIRMATION);
        }
    });
}