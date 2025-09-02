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
                    <div class="filters-dropdown-container">
                        <button id="collaborator-filters-btn" class="btn btn-secondary" data-action="toggle-filters-dropdown">
                            <i class="fas fa-filter"></i> Empresa
                        </button>
                        <div id="collaborator-filters-dropdown" class="filters-dropdown-content hidden">
                            <div class="form-group">
                                <label for="collaborator-empresa-filter">Empresa:</label>
                                <select id="collaborator-empresa-filter" class="form-control">
                                    <option value="todas">Todas</option>
                                    <option value="WeldingPro">WeldingPro</option>
                                    <option value="ALV">ALV</option>
                                </select>
                            </div>
                            <button class="btn btn-sm btn-danger" data-action="clear-collaborator-filters" style="width: 100%;">Limpar Filtros</button>
                        </div>
                    </div>
                    <button class="btn btn-icon-only btn-sm hide-panel-btn" data-action="hide-panel" data-panel-id="collaborator-management" title="Ocultar painel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="header-main-actions">
                <div class="actions-dropdown-container">
                    <button class="btn btn-primary" data-action="toggle-actions-dropdown">
                        <i class="fas fa-plus"></i> Adicionar <i class="fas fa-caret-down" style="margin-left: 5px;"></i>
                    </button>
                    <div class="actions-dropdown-content hidden">
                        <a href="javascript:void(0);" data-action="${ACTIONS.ADD_COLLABORATOR}">
                            <i class="fas fa-user-plus"></i> Novo Colaborador
                        </a>
                        <a href="javascript:void(0);" data-action="${ACTIONS.MASS_ADD_COLLABORATOR}">
                            <i class="fas fa-users"></i> Adicionar em Massa
                        </a>
                    </div>
                </div>
                <button class="btn btn-info" data-action="${ACTIONS.START_RETURN_SESSION}">
                    <i class="fas fa-undo-alt"></i> Registrar Devolução
                </button>
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
                            <th>Empresa</th>
                            <th class="actions-cell">Ações</th>
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
        const clickableElement = event.target.closest('[data-action]');
        if (!clickableElement) return;

        if (clickableElement.tagName === 'A') {
            event.preventDefault();
        }

        const action = clickableElement.dataset.action;
        const id = clickableElement.dataset.id;

        switch (action) {
            case 'clear-collaborator-filters':
                document.getElementById('collaborator-empresa-filter').value = 'todas';
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
                break;
            case ACTIONS.START_RETURN_SESSION:
                openReturnCartModal();
                break;
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
            case ACTIONS.VIEW_COLLABORATOR_DASHBOARD:
                openCollaboratorDashboardModal(id);
                break;
            case ACTIONS.GENERATE_RECEIPT:
                openReceiptGeneratorModal(id);
                break;
            case ACTIONS.VIEW_SIGNED_RECEIPTS:
                openSignedReceiptsModal(id);
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