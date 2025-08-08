// CÓDIGO CORRIGIDO - js/components/itemManagement.js
import { apiClient } from '../modules/apiClient.js';
import { getItemById, deleteItem, getAllItems } from '../modules/itemManager.js';
import { openConfirmationModal, closeModal, showToast, openMovementModal, openAdjustmentModal, openDirectLossModal } from '../modules/uiManager.js';
import { MODAL_IDS } from '../constants.js';
import { getSettings } from '../modules/settings.js';
import { suggestLocation } from '../modules/mapping.js';

// Função para fechar todos os menus de ação abertos
const closeAllActionDropdowns = () => {
    document.querySelectorAll('.actions-dropdown-content:not(.hidden)').forEach(dropdown => {
        dropdown.classList.add('hidden');
    });
};

// Adiciona um listener para fechar os menus ao clicar fora
document.addEventListener('click', (event) => {
    if (!event.target.closest('.actions-dropdown-container')) {
        closeAllActionDropdowns();
    }
});


export function initializeItemManagement() {
    document.body.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        const action = button?.dataset.action;
        if (!action) return;

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
                    const isHidden = dropdown.classList.contains('hidden');

                    closeAllActionDropdowns(); // Fecha todos os outros

                    if (isHidden) {
                        dropdown.classList.remove('hidden');
                        // Lógica para reposicionar o dropdown se estiver fora da tela
                        const rect = dropdown.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        if (rect.bottom > viewportHeight) {
                            dropdown.style.top = `auto`;
                            dropdown.style.bottom = `100%`;
                        } else {
                            dropdown.style.top = `100%`;
                            dropdown.style.bottom = `auto`;
                        }
                    }
                    event.stopPropagation(); // Impede que o listener do documento feche o menu imediatamente
                    break;
                }
        }
    });
}

export function renderItemsTable(items) {
    const tableBody = document.getElementById('items-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum item encontrado.</td></tr>';
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        row.dataset.id = item.id;
        row.innerHTML = `
            <td data-label="Item">${item.name}</td>
            <td data-label="Tipo">${item.type}</td>
            <td data-label="Estoque">${item.currentStock || 0}</td>
            <td data-label="Preço (R$)">${Number(item.price || 0).toFixed(2)}</td>
            <td data-label="Status"><span class="status-badge status-${item.status || 'disponível'}">${item.status || 'disponível'}</span></td>
            <td data-label="Ações">
                <div class="actions-dropdown-container">
                    <button class="btn btn-secondary btn-sm btn-icon-only" data-action="toggle-actions-dropdown" aria-label="Mais ações">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="actions-dropdown-content hidden">
                        <a href="#" data-action="register-loan" data-id="${item.id}"><i class="fas fa-sign-out-alt"></i> Saída / Empréstimo</a>
                        <a href="#" data-action="adjust-stock" data-id="${item.id}"><i class="fas fa-sync-alt"></i> Ajustar Estoque</a>
                        <a href="#" data-action="direct-loss" data-id="${item.id}"><i class="fas fa-heart-broken"></i> Registrar Perda</a>
                        <div class="dropdown-divider"></div>
                        <a href="#" data-action="edit-item" data-id="${item.id}"><i class="fas fa-edit"></i> Editar Detalhes</a>
                        <a href="#" data-action="manage-batches" data-id="${item.id}"><i class="fas fa-boxes"></i> Gerenciar Lotes</a>
                        <a href="#" data-action="view-history" data-id="${item.id}"><i class="fas fa-history"></i> Ver Histórico</a>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="danger-action" data-action="delete-item" data-id="${item.id}"><i class="fas fa-trash"></i> Excluir Item</a>
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

            const stockLabel = form.querySelector('#item-form-current-stock-label');
            const stockInput = form.querySelector('#item-form-current-stock');
            if (stockLabel) stockLabel.parentElement.style.display = 'none';
            if (stockInput) stockInput.parentElement.style.display = 'none';
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

async function openItemBatchesModal(itemId) {
    const modal = document.getElementById(MODAL_IDS.ITEM_BATCHES);
    const template = document.getElementById('item-batches-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;
    const item = getItemById(itemId);
    modal.querySelector('#item-batches-modal-title').textContent = `Lotes de: ${item.name}`;
    modal.querySelector('#item-batches-item-id').value = itemId;

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
                <td>...</td> 
                <td>...</td>
                <td>...</td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="7">Nenhum lote encontrado.</td></tr>';
    }

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
            const typeClass = entry.type.toLowerCase().replace(' ', '-');
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