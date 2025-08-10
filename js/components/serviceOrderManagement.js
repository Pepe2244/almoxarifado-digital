import { getAllServiceOrders, createServiceOrder, updateServiceOrder, deleteServiceOrder, getServiceOrderById } from '../modules/serviceOrderManager.js';
import { getAllCollaborators } from '../modules/collaboratorManager.js';
import { getAllItems } from '../modules/itemManager.js';
import { showToast, openModal, closeModal } from '../modules/uiManager.js';

let osForm, osModal, osTableBody, filterOsInput, osIdField, technicianSelect;

export function initializeServiceOrderManagement() {
    osForm = document.getElementById('os-form');
    osModal = document.getElementById('os-modal');
    osTableBody = document.getElementById('os-table-body');
    filterOsInput = document.getElementById('filter-os');
    osIdField = document.getElementById('os-id');
    technicianSelect = document.getElementById('os-technicianId');

    osForm.addEventListener('submit', handleFormSubmit);
    filterOsInput.addEventListener('input', renderServiceOrders);
    osTableBody.addEventListener('click', handleTableClick);

    document.querySelector('[data-modal-target="os-modal"]').addEventListener('click', () => {
        populateSelects();
    });

    renderServiceOrders();
}

function populateSelects() {
    const collaborators = getAllCollaborators();
    technicianSelect.innerHTML = '<option value="">Selecione um Técnico</option>';
    collaborators.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        technicianSelect.appendChild(option);
    });
}

function renderServiceOrders() {
    const filterText = filterOsInput.value.toLowerCase();
    const allServiceOrders = getAllServiceOrders();
    osTableBody.innerHTML = '';

    const filteredOS = allServiceOrders.filter(os =>
        os.customer.toLowerCase().includes(filterText) ||
        (os.technicianName && os.technicianName.toLowerCase().includes(filterText))
    );

    if (filteredOS.length === 0) {
        osTableBody.innerHTML = '<tr><td colspan="5">Nenhuma Ordem de Serviço encontrada.</td></tr>';
        return;
    }

    filteredOS.forEach(os => {
        const row = document.createElement('tr');
        const itemsList = (os.items || []).map(i => `${i.quantity}x ${i.itemName}`).join(', ') || 'Nenhum';
        row.innerHTML = `
            <td>${os.id}</td>
            <td>${os.customer}</td>
            <td>${os.technicianName || 'N/A'}</td>
            <td><span class="status status-${os.status.toLowerCase()}">${os.status}</span></td>
            <td>
                <button class="view-btn" data-id="${os.id}">Ver</button>
                <button class="edit-btn" data-id="${os.id}">Editar</button>
                <button class="delete-btn" data-id="${os.id}">Excluir</button>
            </td>
        `;
        osTableBody.appendChild(row);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = osIdField.value;
    const formData = new FormData(osForm);
    const osData = {
        customer: formData.get('customer'),
        technicianId: parseInt(formData.get('technicianId')),
        description: formData.get('description'),
        status: formData.get('status'),
        openDate: formData.get('openDate') ? new Date(formData.get('openDate')).toISOString() : null,
        closeDate: formData.get('closeDate') ? new Date(formData.get('closeDate')).toISOString() : null,
        items: [] // Lógica para adicionar itens deve ser implementada aqui
    };

    showToast('Salvando Ordem de Serviço...', 'info');

    let success = false;
    if (id) {
        osData.id = parseInt(id);
        success = await updateServiceOrder(osData);
    } else {
        success = await createServiceOrder(osData);
    }

    if (success) {
        renderServiceOrders();
        closeModal(osModal);
        osForm.reset();
    }
}

async function handleTableClick(e) {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return;

    if (target.classList.contains('edit-btn')) {
        const os = getServiceOrderById(id);
        if (os) {
            populateSelects();
            populateForm(os);
            openModal(osModal);
        }
    }

    if (target.classList.contains('delete-btn')) {
        if (confirm(`Tem certeza que deseja excluir a O.S. com ID ${id}?`)) {
            const success = await deleteServiceOrder(id);
            if (success) {
                renderServiceOrders();
            }
        }
    }

    if (target.classList.contains('view-btn')) {
        const os = getServiceOrderById(id);
        if (os) {
            alert(`Detalhes da O.S. ${os.id}:\nCliente: ${os.customer}\nTécnico: ${os.technicianName}\nDescrição: ${os.description}\nStatus: ${os.status}`);
        }
    }
}

function populateForm(os) {
    osForm.reset();
    osIdField.value = os.id;
    osForm.querySelector('#os-customer').value = os.customer;
    osForm.querySelector('#os-technicianId').value = os.technicianId;
    osForm.querySelector('#os-description').value = os.description;
    osForm.querySelector('#os-status').value = os.status;
    osForm.querySelector('#os-openDate').value = os.openDate ? os.openDate.split('T')[0] : '';
    osForm.querySelector('#os-closeDate').value = os.closeDate ? os.closeDate.split('T')[0] : '';
    // Lógica para popular os itens da OS no formulário precisa ser adicionada.
}
