// almoxarifado-digital/js/components/collaboratorManagement.js
function initializeCollaboratorManagement() {
    renderCollaboratorManagementComponent();
    addCollaboratorTabEventListeners('collaborator-management');
}

function renderCollaboratorManagementComponent() {
    const component = document.getElementById('collaborator-management');
    if (!component) return;

    const settings = getSettings();
    if (settings.panelVisibility && settings.panelVisibility['collaborator-management'] === false) {
        component.classList.add('hidden');
        return;
    }
    component.classList.remove('hidden');

    component.innerHTML = `
        <div class="card-header two-row-header">
            <div class="card-header-top">
                <h2><i class="fas fa-users"></i> Gestão de Colaboradores</h2>
                <div class="header-top-actions">
                    <div class="search-container">
                        <input type="text" id="collaborator-search-input" class="search-input" placeholder="Buscar colaborador...">
                        <button id="collaborator-search-btn-icon" class="btn btn-icon-only">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    <button class="btn btn-icon-only btn-sm hide-panel-btn" data-action="hide-panel" data-panel-id="collaborator-management" title="Ocultar painel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="header-main-actions">
                <button class="btn btn-primary" data-action="${ACTIONS.ADD_COLLABORATOR}" title="Adicionar Novo Colaborador"><i class="fas fa-user-plus"></i> Adicionar</button>
                <button class="btn btn-info" data-action="${ACTIONS.MASS_ADD_COLLABORATOR}" title="Adicionar Vários Colaboradores"><i class="fas fa-users"></i> Em Massa</button>
            </div>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="item-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Matrícula</th>
                            <th>Cargo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="collaborators-table-body">
                    </tbody>
                </table>
            </div>
            <div id="collaborator-pagination-container" class="card-footer"></div>
        </div>
    `;
}

function addCollaboratorTabEventListeners(componentId) {
    const component = document.getElementById(componentId);
    if (!component) return;

    component.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        switch (action) {
            case ACTIONS.ADD_COLLABORATOR:
                openCollaboratorModal();
                break;
            case ACTIONS.MASS_ADD_COLLABORATOR:
                openMassAddCollaboratorModal();
                break;
            case ACTIONS.EDIT_COLLABORATOR:
                const collaboratorToEdit = getCollaboratorById(id);
                if (collaboratorToEdit) {
                    openCollaboratorModal(collaboratorToEdit);
                }
                break;
            case ACTIONS.DELETE_COLLABORATOR:
                const collaboratorToDelete = getCollaboratorById(id);
                if (collaboratorToDelete) {
                    openConfirmationModal({
                        title: 'Excluir Colaborador',
                        message: `Tem certeza que deseja excluir o colaborador "${collaboratorToDelete.name}"? Isso é irreversível.`,
                        onConfirm: () => {
                            if (deleteCollaborator(id)) {
                                document.body.dispatchEvent(new CustomEvent('dataChanged'));
                                closeModal('confirmation-modal');
                            }
                        }
                    });
                }
                break;
        }
    });
}