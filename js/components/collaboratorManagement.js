function initializeCollaboratorManagement() {
    document.body.addEventListener('click', (event) => {
        const action = event.target.dataset.action || event.target.closest('button')?.dataset.action;
        if (!action) return;

        const collaboratorId = event.target.dataset.id || event.target.closest('tr')?.dataset.id;

        switch (action) {
            case 'open-collaborator-modal':
                openCollaboratorModal();
                break;
            case 'open-mass-add-collaborator-modal':
                openMassAddCollaboratorModal();
                break;

            case 'edit-collaborator':
                if (collaboratorId) {
                    openCollaboratorModal(collaboratorId);
                }
                break;
            case 'delete-collaborator':
                if (collaboratorId) {
                    handleDeleteCollaborator(collaboratorId);
                }
                break;
        }
    });
}

function renderCollaboratorsTable(collaborators) {
    const tableBody = document.getElementById('collaborators-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (collaborators.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Nenhum colaborador encontrado.</td></tr>`;
        return;
    }

    collaborators.forEach(collaborator => {
        const row = document.createElement('tr');
        row.dataset.id = collaborator.id;
        row.innerHTML = `
            <td data-label="Nome">${collaborator.name}</td>
            <td data-label="Cargo">${collaborator.role || 'N/A'}</td>
            <td data-label="Status"><span class="status-badge status-${collaborator.status || 'ativo'}">${collaborator.status || 'ativo'}</span></td>
            <td data-label="Ações">
                <div class="actions-dropdown-container">
                    <button class="btn btn-secondary btn-sm btn-icon-only" data-action="toggle-actions-dropdown" aria-label="Mais ações">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="actions-dropdown-content hidden">
                        <button class="btn btn-sm" data-action="edit-collaborator" data-id="${collaborator.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" data-action="delete-collaborator" data-id="${collaborator.id}">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}


function openCollaboratorModal(collaboratorId = null) {
    const modal = document.getElementById('collaborator-modal');
    const template = document.getElementById('collaborator-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;
    const form = modal.querySelector('#collaborator-form');
    const title = form.querySelector('h2');

    if (collaboratorId) {
        const collaborator = getCollaboratorById(collaboratorId);
        if (collaborator) {
            title.textContent = 'Editar Colaborador';
            form.elements['collaborator-id'].value = collaborator.id;
            form.elements['collaborator-name'].value = collaborator.name;
            form.elements['collaborator-role'].value = collaborator.role || '';
        }
    } else {
        title.textContent = 'Adicionar Colaborador';
    }

    modal.showModal();
}

function openMassAddCollaboratorModal() {
    const modal = document.getElementById('mass-add-collaborator-modal');
    const template = document.getElementById('mass-add-collaborator-modal-template');
    if (!modal || !template) return;
    modal.innerHTML = template.innerHTML;
    modal.showModal();
}

function handleDeleteCollaborator(collaboratorId) {
    const collaborator = getCollaboratorById(collaboratorId);
    if (!collaborator) return;

    openConfirmationModal({
        title: 'Confirmar Exclusão',
        message: `Tem a certeza de que deseja excluir o colaborador "${collaborator.name}"? Esta ação não pode ser desfeita.`,
        onConfirm: async () => {
            const success = await deleteCollaborator(collaboratorId);
            if (success) {
                showToast('Colaborador excluído com sucesso!', 'success');
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            } else {
                showToast('Falha ao excluir o colaborador.', 'error');
            }
            closeModal('confirmation-modal');
        }
    });
}
