// CÓDIGO CORRIGIDO - js/components/itemManagement.js
import { apiClient } from '../modules/apiClient.js';
import { getItemById, deleteItem, getAllItems } from '../modules/itemManager.js'; // Importar getAllItems
import { openConfirmationModal, closeModal, showToast, openMovementModal, openAdjustmentModal, openDirectLossModal } from '../modules/uiManager.js';
import { MODAL_IDS } from '../constants.js';
import { getSettings } from '../modules/settings.js';
import { suggestLocation } from '../modules/mapping.js'; // Importar suggestLocation

export function initializeItemManagement() {
    document.body.addEventListener('click', (event) => {
        const action = event.target.dataset.action || event.target.closest('button')?.dataset.action;
        if (!action) return;

        const button = event.target.closest('button');
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
                if (itemId) {
                    openAdjustmentModal(itemId);
                }
                break;
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
            <td data-label="Estoque">${item.current_stock || 0}</td>
            <td data-label="Preço (R$)">${Number(item.price || 0).toFixed(2)}</td>
            <td data-label="Status"><span class="status-badge status-${item.status || 'disponível'}">${item.status || 'disponível'}</span></td>
            <td data-label="Ações">
                <div class="actions-dropdown-container">
                    <button class="btn btn-secondary btn-sm btn-icon-only" data-action="toggle-actions-dropdown" aria-label="Mais ações">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="actions-dropdown-content hidden">
                        <button class="btn btn-sm" data-action="register-loan" data-id="${item.id}"><i class="fas fa-sign-out-alt"></i> Saída</button>
                        <button class="btn btn-sm" data-action="adjust-stock" data-id="${item.id}"><i class="fas fa-sync-alt"></i> Ajuste</button>
                        <button class="btn btn-sm" data-action="direct-loss" data-id="${item.id}"><i class="fas fa-heart-broken"></i> Perda</button>
                        <hr>
                        <button class="btn btn-sm" data-action="edit-item" data-id="${item.id}"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-sm" data-action="manage-batches" data-id="${item.id}"><i class="fas fa-boxes"></i> Lotes</button>
                        <button class="btn btn-sm" data-action="view-history" data-id="${item.id}"><i class="fas fa-history"></i> Histórico</button>
                        <button class="btn btn-sm btn-danger" data-action="delete-item" data-id="${item.id}"><i class="fas fa-trash"></i> Excluir</button>
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
            form.elements.minStock.value = item.min_stock || 0;
            form.elements.maxStock.value = item.max_stock || 0;
            form.elements.price.value = item.price || 0;
            form.elements.shelfLifeDays.value = item.shelf_life_days || 0;
            form.elements.status.value = item.status || 'disponível';
            form.elements.aisle.value = item.location?.aisle || '';
            form.elements.shelf.value = item.location?.shelf || '';
            form.elements.box.value = item.location?.box || '';

            const stockLabel = form.querySelector('#item-form-current-stock-label');
            const stockInput = form.querySelector('#item-form-current-stock');
            if (stockLabel) stockLabel.style.display = 'none';
            if (stockInput) stockInput.style.display = 'none';
        }
    } else {
        title.textContent = 'Adicionar Novo Item';
        // CORREÇÃO: Sugerir localização para novo item
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
    if (batches.length > 0) {
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
        tableBody.innerHTML = '<tr><td colspan="5">Nenhum lote encontrado.</td></tr>';
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

    if (history.length > 0) {
        const list = document.createElement('ul');
        list.className = 'history-list';
        history.forEach(entry => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <strong>${new Date(entry.created_at).toLocaleString('pt-BR')} - ${entry.type}</strong>
                <p>Detalhes: ${entry.details}</p>
                <p>Alteração: ${entry.quantity_change > 0 ? '+' : ''}${entry.quantity_change} | Responsável: ${entry.responsible}</p>
            `;
            list.appendChild(listItem);
        });
        historyContent.appendChild(list);
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