function initializeServiceOrderManagement() {
    renderServiceOrderManagementComponent();
    addServiceOrderTabEventListeners('service-order-management');
}

function renderServiceOrderManagementComponent() {
    const component = document.getElementById('service-order-management');
    if (!component) return;

    const settings = getSettings();
    if (settings.panelVisibility && settings.panelVisibility['service-order-management'] === false) {
        component.classList.add('hidden');
        return;
    }
    component.classList.remove('hidden');

    component.innerHTML = `
        <div class="card-header two-row-header">
            <div class="card-header-top">
                <h2><i class="fas fa-file-signature"></i> Ordens de Serviço</h2>
                <div class="header-top-actions">
                    <div class="search-container">
                        <input type="text" id="os-search-input" class="search-input" placeholder="Buscar O.S....">
                        <button id="os-search-btn-icon" class="btn btn-icon-only">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    <button class="btn btn-icon-only btn-sm hide-panel-btn" data-action="hide-panel" data-panel-id="service-order-management" title="Ocultar painel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="header-main-actions">
                <button class="btn btn-primary" data-action="${ACTIONS.ADD_SERVICE_ORDER}" title="Abrir Nova Ordem de Serviço"><i class="fas fa-plus"></i> Nova O.S.</button>
            </div>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="item-table">
                    <thead>
                        <tr>
                            <th>Número O.S.</th>
                            <th>Cliente</th>
                            <th>Técnico</th>
                            <th>Data Abertura</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="os-table-body">
                    </tbody>
                </table>
            </div>
            <div id="os-pagination-container" class="card-footer"></div>
        </div>
    `;
}

function addServiceOrderTabEventListeners(componentId) {
    const component = document.getElementById(componentId);
    if (!component) return;

    component.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        switch (action) {
            case ACTIONS.ADD_SERVICE_ORDER:
                openServiceOrderModal();
                break;
            case ACTIONS.EDIT_SERVICE_ORDER:
                const osToEdit = getServiceOrderById(id);
                if (osToEdit) {
                    openServiceOrderModal(osToEdit);
                }
                break;
            case ACTIONS.VIEW_SERVICE_ORDER:
                openServiceOrderDetailsModal(id);
                break;
            case ACTIONS.DELETE_SERVICE_ORDER:
                const osToDelete = getServiceOrderById(id);
                if (osToDelete) {
                    openConfirmationModal({
                        title: 'Excluir Ordem de Serviço',
                        message: `Tem certeza que deseja excluir a O.S. "${osToDelete.id}"?`,
                        onConfirm: () => {
                            if (deleteServiceOrder(id)) {
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