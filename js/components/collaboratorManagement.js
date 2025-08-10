import { getAllCollaborators, createCollaborator, updateCollaborator, deleteCollaborator, getCollaboratorById } from '../modules/collaboratorManager.js';
import { showToast, openModal, closeModal } from '../modules/uiManager.js';

let collaboratorForm, collaboratorModal, collaboratorsTableBody, filterCollaboratorsInput, collaboratorIdField;

export function initializeCollaboratorManagement() {
    collaboratorForm = document.getElementById('collaborator-form');
    collaboratorModal = document.getElementById('collaborator-modal');
    collaboratorsTableBody = document.getElementById('collaborators-table-body');
    filterCollaboratorsInput = document.getElementById('filter-collaborators');
    collaboratorIdField = document.getElementById('collaborator-id');

    collaboratorForm.addEventListener('submit', handleFormSubmit);
    filterCollaboratorsInput.addEventListener('input', renderCollaborators);
    collaboratorsTableBody.addEventListener('click', handleTableClick);

    renderCollaborators();
}

function renderCollaborators() {
    const filterText = filterCollaboratorsInput.value.toLowerCase();
    const allCollaborators = getAllCollaborators();

    collaboratorsTableBody.innerHTML = '';

    const filteredCollaborators = allCollaborators.filter(c =>
        c.name.toLowerCase().includes(filterText) ||
        (c.role && c.role.toLowerCase().includes(filterText))
    );

    if (filteredCollaborators.length === 0) {
        collaboratorsTableBody.innerHTML = '<tr><td colspan="5">Nenhum colaborador encontrado.</td></tr>';
        return;
    }

    filteredCollaborators.forEach(c => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${c.id}</td>
            <td>${c.name || 'N/A'}</td>
            <td>${c.role || 'N/A'}</td>
            <td>${c.status || 'N/A'}</td>
            <td>
                <button class="edit-btn" data-id="${c.id}">Editar</button>
                <button class="delete-btn" data-id="${c.id}">Excluir</button>
            </td>
        `;
        collaboratorsTableBody.appendChild(row);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = collaboratorIdField.value;
    const formData = new FormData(collaboratorForm);
    const collaboratorData = Object.fromEntries(formData.entries());

    showToast('Salvando colaborador...', 'info');

    let success = false;
    if (id) {
        collaboratorData.id = parseInt(id);
        success = await updateCollaborator(collaboratorData);
    } else {
        success = await createCollaborator(collaboratorData);
    }

    if (success) {
        renderCollaborators();
        closeModal(collaboratorModal);
        collaboratorForm.reset();
    }
}

async function handleTableClick(e) {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        const collaborator = getCollaboratorById(id);
        if (collaborator) {
            populateForm(collaborator);
            openModal(collaboratorModal);
        }
    }

    if (target.classList.contains('delete-btn')) {
        if (confirm(`Tem certeza que deseja excluir o colaborador com ID ${id}?`)) {
            const success = await deleteCollaborator(id);
            if (success) {
                renderCollaborators();
            }
        }
    }
}

function populateForm(collaborator) {
    collaboratorForm.reset();
    document.getElementById('collaborator-id').value = collaborator.id;
    document.getElementById('collaborator-name').value = collaborator.name || '';
    document.getElementById('collaborator-role').value = collaborator.role || '';
    document.getElementById('collaborator-accessKey').value = collaborator.accessKey || '';
    document.getElementById('collaborator-status').value = collaborator.status || 'ativo';
}
