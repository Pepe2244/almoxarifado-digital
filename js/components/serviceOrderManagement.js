import { apiClient } from '../modules/apiClient.js';
import { getServiceOrderById, deleteServiceOrder, removeItemFromServiceOrder, addServiceOrder, updateServiceOrder } from '../modules/serviceOrderManager.js';
import { getAllCollaborators } from '../modules/collaboratorManager.js';
import { getAllItems, getItemById } from '../modules/itemManager.js';
import { openConfirmationModal, closeModal, showToast } from '../modules/uiManager.js';
import { MODAL_IDS } from '../constants.js';

export function initializeServiceOrderManagement() {
    document.body.addEventListener('click', (event) => {
        const action = event.target.dataset.action || event.target.closest('button')?.dataset.action;
        if (!action) return;

        const osId = event.target.dataset.id || event.target.closest('tr')?.dataset.id;

        switch (action) {
            case 'open-service-order-modal':
                openServiceOrderModal();
                break;
            case 'edit-service-order':
                if (osId) openServiceOrderModal(osId);
                break;
            case 'delete-service-order':
                if (osId) handleDeleteServiceOrder(osId);
                break;
            case 'view-service-order-details':
                if (osId) openServiceOrderDetailsModal(osId);
                break;
        }
    });
}

export function renderServiceOrdersTable(serviceOrders) {
    const tableBody = document.getElementById('service-orders-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (serviceOrders.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Nenhuma Ordem de Serviço encontrada.</td></tr>`;
        return;
    }

    serviceOrders.forEach(os => {
        const row = document.createElement('tr');
        row.dataset.id = os.id;
        const createdAt = new Date(os.createdAt).toLocaleDateString('pt-BR');

        row.innerHTML = `
            <td data-label="Nº O.S.">${os.id}</td>
            <td data-label="Cliente/Local">${os.customer}</td>
            <td data-label="Técnico">${os.technicianName || 'N/A'}</td>
            <td data-label="Status"><span class="status-badge status-${os.status.toLowerCase().replace(' ', '-')}">${os.status}</span></td>
            <td data-label="Data Abertura">${createdAt}</td>
            <td data-label="Ações">
                <div class="actions-dropdown-container">
                    <button class="btn btn-secondary btn-sm btn-icon-only" data-action="toggle-actions-dropdown" aria-label="Mais ações">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="actions-dropdown-content hidden">
                         <button class="btn btn-sm" data-action="view-service-order-details" data-id="${os.id}"><i class="fas fa-eye"></i> Detalhes</button>
                        <button class="btn btn-sm" data-action="edit-service-order" data-id="${os.id}"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-sm btn-danger" data-action="delete-service-order" data-id="${os.id}"><i class="fas fa-trash"></i> Excluir</button>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function openServiceOrderModal(osId = null) {
    const modal = document.getElementById(MODAL_IDS.SERVICE_ORDER);
    const template = document.getElementById('service-order-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;
    const form = modal.querySelector('#service-order-form');
    const title = form.querySelector('h2');
    const technicianSelect = form.elements.technicianId;

    const collaborators = getAllCollaborators();
    technicianSelect.innerHTML = '<option value="">Selecione um técnico</option>';
    collaborators.forEach(c => {
        const option = new Option(c.name, c.id);
        technicianSelect.add(option);
    });

    if (osId) {
        const os = getServiceOrderById(osId);
        if (os) {
            title.textContent = `Editar Ordem de Serviço #${os.id}`;
            form.elements['os-id'].value = os.id;
            form.elements.customer.value = os.customer;
            form.elements.technicianId.value = os.technicianId;
            form.elements.status.value = os.status;
            form.elements.description.value = os.description;
        }
    } else {
        title.textContent = 'Abrir Nova Ordem de Serviço';
    }

    modal.showModal();
}

async function openServiceOrderDetailsModal(osId) {
    const modal = document.getElementById(MODAL_IDS.SERVICE_ORDER_DETAILS);
    const template = document.getElementById('service-order-details-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;

    const os = await apiClient.get(`service-orders/${osId}`);
    if (!os) {
        showToast('Ordem de Serviço não encontrada.', 'error');
        return;
    }

    modal.querySelector('#os-details-modal-title').textContent = `Detalhes da O.S. #${os.id}`;
    modal.querySelector('#os-details-id').value = os.id;

    const infoCard = modal.querySelector('#os-details-info-card');
    infoCard.innerHTML = `
        <p><strong>Cliente:</strong> ${os.customer}</p>
        <p><strong>Técnico:</strong> ${os.technicianName || 'N/A'}</p>
        <p><strong>Status:</strong> <span class="status-badge status-${os.status.toLowerCase().replace(' ', '-')}">${os.status}</span></p>
        <p><strong>Abertura:</strong> ${new Date(os.createdAt).toLocaleString('pt-BR')}</p>
        <p><strong>Descrição:</strong> ${os.description || 'Nenhuma'}</p>
    `;

    const items = getAllItems().filter(item => item.type !== 'Kit');
    const itemSelect = modal.querySelector('#os-item-select');
    itemSelect.innerHTML = '<option value="">Selecione um item para alocar</option>';
    items.forEach(item => {
        const option = new Option(`${item.name} (Estoque: ${item.currentStock || 0})`, item.id);
        option.disabled = (item.currentStock || 0) <= 0;
        itemSelect.add(option);
    });

    const itemsTableBody = modal.querySelector('#os-items-table-body');
    itemsTableBody.innerHTML = '';
    let totalCost = 0;
    if (os.items && os.items.length > 0) {
        os.items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.itemName}</td>
                <td>${item.itemType}</td>
                <td>${item.quantity}</td>
                <td>
                    <button class="btn btn-danger btn-sm" data-action="remove-item-from-os" data-os-id="${os.id}" data-item-id="${item.itemId}">
                        <i class="fas fa-times"></i> Remover
                    </button>
                </td>
            `;
            itemsTableBody.appendChild(row);
            totalCost += item.quantity * parseFloat(item.unitPrice);
        });
    } else {
        itemsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum item alocado para esta O.S.</td></tr>';
    }

    const costCard = modal.querySelector('#os-details-cost-card');
    costCard.innerHTML = `
        <h4>Custo Total dos Itens</h4>
        <p class="total-cost">R$ ${totalCost.toFixed(2)}</p>
    `;

    modal.showModal();
}

function handleDeleteServiceOrder(osId) {
    openConfirmationModal({
        title: 'Confirmar Exclusão',
        message: `Tem a certeza de que deseja excluir a Ordem de Serviço #${osId}? Todos os itens alocados serão desvinculados. Esta ação não pode ser desfeita.`,
        onConfirm: async () => {
            const success = await deleteServiceOrder(osId);
            if (success) {
                showToast(`Ordem de Serviço #${osId} excluída com sucesso!`, 'success');
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            } else {
                showToast('Falha ao excluir a Ordem de Serviço.', 'error');
            }
            closeModal(MODAL_IDS.CONFIRMATION);
        }
    });
}
