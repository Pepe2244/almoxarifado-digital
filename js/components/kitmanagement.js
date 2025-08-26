function initializeKitManagement() {
    renderKitManagementComponent();
    addKitTabEventListeners('kit-management');
}

function renderKitManagementComponent() {
    const component = document.getElementById('kit-management');
    if (!component) return;

    const settings = getSettings();
    if (settings.panelVisibility && settings.panelVisibility['kit-management'] === false) {
        component.classList.add('hidden');
        return;
    }
    component.classList.remove('hidden');

    component.innerHTML = `
        <div class="card-header two-row-header">
            <div class="card-header-top">
                <h2><i class="fas fa-toolbox"></i> Gestão de Kits</h2>
                <div class="header-top-actions">
                    <div class="search-container">
                        <input type="text" id="kit-search-input" class="search-input" placeholder="Buscar kits...">
                        <button id="kit-search-btn-icon" class="btn btn-icon-only">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    <button class="btn btn-icon-only btn-sm hide-panel-btn" data-action="hide-panel" data-panel-id="kit-management" title="Ocultar painel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="header-main-actions">
                <button class="btn btn-primary" data-action="${ACTIONS.ADD_KIT}" title="Adicionar Novo Kit"><i class="fas fa-plus"></i> Adicionar Kit</button>
                <button class="btn btn-info" data-action="${ACTIONS.OPEN_KIT_ASSEMBLY_BULK}" title="Adicionar componentes a um kit em lote">
                    <i class="fas fa-tools"></i> Montagem em Lote
                </button>
            </div>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="item-table">
                    <thead>
                        <tr>
                            <th>Kit</th>
                            <th>Estoque / Emprestado</th>
                            <th>Itens no Kit</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="kits-table-body">
                    </tbody>
                </table>
            </div>
            <div id="kit-pagination-container" class="card-footer"></div>
        </div>
    `;
}

function addKitTabEventListeners(componentId) {
    const component = document.getElementById(componentId);
    if (!component) return;

    component.addEventListener('click', (event) => {
        const clickableElement = event.target.closest('[data-action]');
        if (!clickableElement) return;

        const action = clickableElement.dataset.action;
        const id = clickableElement.dataset.id;

        switch (action) {
            case ACTIONS.OPEN_KIT_ASSEMBLY_BULK:
                openKitAssemblyBulkModal();
                break;
            case ACTIONS.ADD_KIT:
                openItemFormModal({ defaultValues: { type: 'Kit' } });
                break;
            case ACTIONS.MANAGE_KIT:
                openKitManagementModal(id);
                break;
            case ACTIONS.EDIT_ITEM:
                openItemFormModal({ itemId: id });
                break;
            case ACTIONS.ITEM_EXIT:
                openMovementModal(id);
                break;
            case ACTIONS.VIEW_ITEM_HISTORY:
                openItemHistoryModal(id);
                break;
            case ACTIONS.GENERATE_LABEL:
                openLabelPrintModal(id);
                break;
            case ACTIONS.MANAGE_ALLOCATIONS:
                const itemToManage = getItemById(id);
                if (itemToManage) {
                    openAllocationModal(itemToManage);
                }
                break;
            case ACTIONS.DELETE_ITEM:
                const kitToDelete = getItemById(id);
                if (kitToDelete) {
                    openConfirmationModal({
                        title: 'Excluir Kit',
                        message: `Tem certeza que deseja excluir o kit "${kitToDelete.name}"? Esta ação não pode ser desfeita.`,
                        onConfirm: () => {
                            if (deleteItem(id)) {
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