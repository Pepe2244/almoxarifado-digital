import { getAllDebits, createDebit, updateDebit, deleteDebit, getDebitById } from '../modules/debitManager.js';
import { getAllCollaborators } from '../modules/collaboratorManager.js';
import { getAllItems } from '../modules/itemManager.js';
import { showToast, openModal, closeModal } from '../modules/uiManager.js';

let debitForm, debitModal, debitsTableBody, filterDebitsInput, debitIdField, collaboratorSelect, itemSelect;

export function initializeDebitManagement() {
    debitForm = document.getElementById('debit-form');
    debitModal = document.getElementById('debit-modal');
    debitsTableBody = document.getElementById('debits-table-body');
    filterDebitsInput = document.getElementById('filter-debits');
    debitIdField = document.getElementById('debit-id');
    collaboratorSelect = document.getElementById('debit-collaboratorId');
    itemSelect = document.getElementById('debit-itemName');

    debitForm.addEventListener('submit', handleFormSubmit);
    filterDebitsInput.addEventListener('input', renderDebits);
    debitsTableBody.addEventListener('click', handleTableClick);

    document.querySelector('[data-modal-target="debit-modal"]').addEventListener('click', () => {
        populateSelects();
    });

    renderDebits();
}

function populateSelects() {
    const collaborators = getAllCollaborators();
    collaboratorSelect.innerHTML = '<option value="">Selecione um Colaborador</option>';
    collaborators.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        collaboratorSelect.appendChild(option);
    });

    const items = getAllItems();
    itemSelect.innerHTML = '<option value="">Selecione um Item</option>';
    items.forEach(i => {
        const option = document.createElement('option');
        option.value = i.name;
        option.textContent = `${i.name} (R$ ${i.price})`;
        option.dataset.price = i.price;
        itemSelect.appendChild(option);
    });
}

function renderDebits() {
    const filterText = filterDebitsInput.value.toLowerCase();
    const allDebits = getAllDebits();
    debitsTableBody.innerHTML = '';

    const filteredDebits = allDebits.filter(d =>
        d.collaboratorName.toLowerCase().includes(filterText) ||
        d.itemName.toLowerCase().includes(filterText)
    );

    if (filteredDebits.length === 0) {
        debitsTableBody.innerHTML = '<tr><td colspan="6">Nenhum débito encontrado.</td></tr>';
        return;
    }

    filteredDebits.forEach(d => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${d.id}</td>
            <td>${d.collaboratorName || 'N/A'}</td>
            <td>${d.itemName || 'N/A'}</td>
            <td>${d.quantity || 0}</td>
            <td>R$ ${Number(d.totalValue || 0).toFixed(2)}</td>
            <td>
                <span class="status status-${d.status}">${d.status || 'N/A'}</span>
                <button class="edit-btn" data-id="${d.id}">Editar</button>
                <button class="delete-btn" data-id="${d.id}">Excluir</button>
            </td>
        `;
        debitsTableBody.appendChild(row);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = debitIdField.value;
    const formData = new FormData(debitForm);
    const debitData = Object.fromEntries(formData.entries());

    debitData.collaboratorId = parseInt(debitData.collaboratorId);
    debitData.quantity = parseInt(debitData.quantity);
    debitData.unitValue = parseFloat(itemSelect.options[itemSelect.selectedIndex].dataset.price);
    debitData.totalValue = debitData.quantity * debitData.unitValue;

    showToast('Salvando débito...', 'info');

    let success = false;
    if (id) {
        debitData.id = parseInt(id);
        success = await updateDebit(debitData);
    } else {
        success = await createDebit(debitData);
    }

    if (success) {
        renderDebits();
        closeModal(debitModal);
        debitForm.reset();
    }
}

async function handleTableClick(e) {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        const debit = getDebitById(id);
        if (debit) {
            populateSelects();
            populateForm(debit);
            openModal(debitModal);
        }
    }

    if (target.classList.contains('delete-btn')) {
        if (confirm(`Tem certeza que deseja excluir o débito com ID ${id}?`)) {
            const success = await deleteDebit(id);
            if (success) {
                renderDebits();
            }
        }
    }
}

function populateForm(debit) {
    debitForm.reset();
    document.getElementById('debit-id').value = debit.id;
    document.getElementById('debit-collaboratorId').value = debit.collaboratorId;
    document.getElementById('debit-itemName').value = debit.itemName;
    document.getElementById('debit-quantity').value = debit.quantity;
    document.getElementById('debit-reason').value = debit.reason;
    document.getElementById('debit-status').value = debit.status;
}
