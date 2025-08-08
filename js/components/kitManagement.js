import { getKitComponents, addComponentToKit, removeComponentFromKit } from '../modules/kitManager.js';
import { getItemById, getAllItems } from '../modules/itemManager.js';
import { showToast } from '../modules/uiManager.js';
import { MODAL_IDS } from '../constants.js';

export function initializeKitManagement() {
    document.body.addEventListener('click', async (event) => {
        const action = event.target.dataset.action || event.target.closest('button')?.dataset.action;
        if (!action) return;

        const button = event.target.closest('button');
        const kitId = button?.dataset.id;

        switch (action) {
            case 'manage-kit-components':
                if (kitId) {
                    openKitManagementModal(kitId);
                }
                break;
            case 'remove-kit-component':
                {
                    const componentId = button.dataset.componentId;
                    const kitModal = document.getElementById(MODAL_IDS.ITEM_KIT);
                    const currentKitId = kitModal.querySelector('#kit-item-id').value;
                    if (currentKitId && componentId) {
                        const success = await removeComponentFromKit(currentKitId, componentId);
                        if (success) {
                            showToast('Componente removido do kit.', 'success');
                            openKitManagementModal(currentKitId);
                        } else {
                            showToast('Falha ao remover componente.', 'error');
                        }
                    }
                    break;
                }
        }
    });

    document.body.addEventListener('submit', async (event) => {
        if (event.target.id === 'kit-item-add-form') {
            event.preventDefault();
            const form = event.target;
            const kitId = form.closest('dialog').querySelector('#kit-item-id').value;
            const componentId = form.elements.itemId.value;
            const quantity = parseInt(form.elements.quantity.value, 10);

            if (kitId && componentId && quantity > 0) {
                const success = await addComponentToKit(kitId, componentId, quantity);
                if (success) {
                    showToast('Componente adicionado ao kit.', 'success');
                    openKitManagementModal(kitId);
                } else {
                    showToast('Falha ao adicionar componente.', 'error');
                }
            }
        }
    });
}

export function renderKitsTable(kits) {
    const tableBody = document.getElementById('kits-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (kits.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center">Nenhum kit encontrado. Crie um item do tipo "Kit".</td></tr>`;
        return;
    }

    kits.forEach(kit => {
        const row = document.createElement('tr');
        row.dataset.id = kit.id;
        row.innerHTML = `
            <td data-label="Nome do Kit">${kit.name}</td>
            <td data-label="Componentes">${kit.components?.length || 0}</td>
            <td data-label="Ações">
                <button class="btn btn-primary btn-sm" data-action="manage-kit-components" data-id="${kit.id}">
                    <i class="fas fa-edit"></i> Gerir Componentes
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function openKitManagementModal(kitId) {
    const modal = document.getElementById(MODAL_IDS.ITEM_KIT);
    const template = document.getElementById('item-kit-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;
    const kit = getItemById(kitId);
    if (!kit) return;

    modal.querySelector('#kit-modal-title').textContent = `Gerir Componentes do Kit: ${kit.name}`;
    modal.querySelector('#kit-item-id').value = kitId;

    const components = await getKitComponents(kitId);
    const componentsTableBody = modal.querySelector('#kit-items-table-body');
    componentsTableBody.innerHTML = '';

    if (components.length > 0) {
        components.forEach(comp => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${comp.componentName}</td>
                <td>${comp.quantity}</td>
                <td>
                    <button class="btn btn-danger btn-sm" data-action="remove-kit-component" data-component-id="${comp.componentId}">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </td>
            `;
            componentsTableBody.appendChild(row);
        });
    } else {
        componentsTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum componente neste kit.</td></tr>';
    }

    const itemSelect = modal.querySelector('#kit-add-item-select');
    const allItems = getAllItems().filter(item => item.type !== 'Kit' && item.id !== parseInt(kitId, 10));
    itemSelect.innerHTML = '<option value="">Selecione um item...</option>';
    allItems.forEach(item => {
        const option = new Option(`${item.name} (Estoque: ${item.currentStock})`, item.id);
        itemSelect.add(option);
    });

    modal.showModal();
}
