import { getAllKits, createKit, updateKit, deleteKit, getKitById } from '../modules/kitManager.js';
import { getAllItems } from '../modules/itemManager.js';
import { showToast, openModal, closeModal } from '../modules/uiManager.js';

let kitForm, kitModal, kitsTableBody, filterKitInput, kitIdField, itemsContainer;

export function initializeKitManagement() {
    kitForm = document.getElementById('kit-form');
    kitModal = document.getElementById('kit-modal');
    kitsTableBody = document.getElementById('kits-table-body');
    filterKitInput = document.getElementById('filter-kits');
    kitIdField = document.getElementById('kit-id');
    itemsContainer = document.getElementById('kit-items-container');

    kitForm.addEventListener('submit', handleFormSubmit);
    filterKitInput.addEventListener('input', renderKits);
    kitsTableBody.addEventListener('click', handleTableClick);

    document.querySelector('[data-modal-target="kit-modal"]').addEventListener('click', () => {
        resetKitForm();
        addKitItemRow(); // Adiciona a primeira linha de item ao abrir
    });

    document.getElementById('add-kit-item-btn').addEventListener('click', addKitItemRow);

    renderKits();
}

function renderKits() {
    const filterText = filterKitInput.value.toLowerCase();
    const allKits = getAllKits();
    kitsTableBody.innerHTML = '';

    const filteredKits = allKits.filter(k => k.name.toLowerCase().includes(filterText));

    if (filteredKits.length === 0) {
        kitsTableBody.innerHTML = '<tr><td colspan="3">Nenhum kit encontrado.</td></tr>';
        return;
    }

    filteredKits.forEach(k => {
        const row = document.createElement('tr');
        const itemsList = (k.items || []).map(i => `${i.quantity}x ${i.itemName}`).join(', ') || 'Vazio';
        row.innerHTML = `
            <td>${k.name}</td>
            <td>${itemsList}</td>
            <td>
                <button class="edit-btn" data-id="${k.id}">Editar</button>
                <button class="delete-btn" data-id="${k.id}">Excluir</button>
            </td>
        `;
        kitsTableBody.appendChild(row);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = kitIdField.value;
    const formData = new FormData(kitForm);

    const kitData = {
        name: formData.get('name'),
        description: formData.get('description'),
        items: []
    };

    const itemRows = itemsContainer.querySelectorAll('.kit-item-row');
    itemRows.forEach(row => {
        const itemId = row.querySelector('.kit-item-select').value;
        const quantity = row.querySelector('.kit-item-quantity').value;
        if (itemId && quantity > 0) {
            kitData.items.push({
                itemId: parseInt(itemId),
                quantity: parseInt(quantity)
            });
        }
    });

    showToast('Salvando Kit...', 'info');

    let success = false;
    if (id) {
        kitData.id = parseInt(id);
        success = await updateKit(kitData);
    } else {
        success = await createKit(kitData);
    }

    if (success) {
        renderKits();
        closeModal(kitModal);
    }
}

async function handleTableClick(e) {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return;

    if (target.classList.contains('edit-btn')) {
        const kit = getKitById(id);
        if (kit) {
            populateForm(kit);
            openModal(kitModal);
        }
    }

    if (target.classList.contains('delete-btn')) {
        if (confirm(`Tem certeza que deseja excluir o kit "${getKitById(id).name}"?`)) {
            const success = await deleteKit(id);
            if (success) {
                renderKits();
            }
        }
    }
}

function resetKitForm() {
    kitForm.reset();
    kitIdField.value = '';
    itemsContainer.innerHTML = '';
}

function populateForm(kit) {
    resetKitForm();
    kitIdField.value = kit.id;
    kitForm.querySelector('#kit-name').value = kit.name;
    kitForm.querySelector('#kit-description').value = kit.description;

    if (kit.items && kit.items.length > 0) {
        kit.items.forEach(item => addKitItemRow(item));
    } else {
        addKitItemRow();
    }
}

function addKitItemRow(item = null) {
    const allItems = getAllItems();
    const row = document.createElement('div');
    row.className = 'kit-item-row';

    const select = document.createElement('select');
    select.className = 'kit-item-select';
    select.innerHTML = '<option value="">Selecione um item</option>';
    allItems.forEach(i => {
        const option = document.createElement('option');
        option.value = i.id;
        option.textContent = i.name;
        if (item && i.id === item.itemId) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.className = 'kit-item-quantity';
    quantityInput.value = item ? item.quantity : 1;
    quantityInput.min = 1;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remover';
    removeBtn.onclick = () => row.remove();

    row.appendChild(select);
    row.appendChild(quantityInput);
    row.appendChild(removeBtn);
    itemsContainer.appendChild(row);
}
