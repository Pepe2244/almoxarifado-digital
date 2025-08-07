// almoxarifado-digital/js/components/itemManagement.js
function initializeItemManagement() {
    renderItemManagementComponent();
    addTabEventListeners('item-management');
}

function renderItemManagementComponent() {
    const component = document.getElementById('item-management');
    if (!component) return;

    const settings = getSettings();
    if (settings.panelVisibility && settings.panelVisibility['item-management'] === false) {
        component.classList.add('hidden');
        return;
    }
    component.classList.remove('hidden');

    component.innerHTML = `
        <div class="card-header two-row-header">
            <div class="card-header-top">
                <h2><i class="fas fa-boxes"></i> Gestão de Itens</h2>
                <div class="header-top-actions">
                    <div class="search-container">
                        <input type="text" id="search-input" class="search-input" placeholder="Buscar itens...">
                        <button id="search-btn-icon" class="btn btn-icon-only">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    <button class="btn btn-icon-only btn-sm hide-panel-btn" data-action="hide-panel" data-panel-id="item-management" title="Ocultar painel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="header-main-actions">
                <div class="actions-dropdown-container">
                    <button class="btn btn-primary" data-action="toggle-actions-dropdown" title="Adicionar Itens">
                        <i class="fas fa-plus"></i> Adicionar <i class="fas fa-chevron-down" style="font-size: 0.8em; margin-left: 8px;"></i>
                    </button>
                    <div class="actions-dropdown-content hidden" style="min-width: 200px;">
                        <a href="#" data-action="${ACTIONS.ADD_ITEM}"><i class="fas fa-tag"></i> Novo Item</a>
                        <a href="#" data-action="${ACTIONS.MASS_ADD}"><i class="fas fa-plus-square"></i> Itens em Massa</a>
                    </div>
                </div>
                <select id="item-type-filter" class="form-control" aria-label="Filtrar por tipo"></select>
                <button class="btn btn-icon-only" data-action="${ACTIONS.SCAN_BARCODE}" title="Escanear Código de Barras">
                    <i class="fas fa-barcode"></i>
                </button>
            </div>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="item-table">
                    <thead>
                        <tr>
                            <th class="item-col" data-sort="name">Item</th>
                            <th class="type-col" data-sort="type">Tipo/Status</th>
                            <th class="stock-details-col" data-sort="currentStock">Detalhes do Estoque</th>
                            <th class="actions-col">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="items-table-body">
                    </tbody>
                </table>
            </div>
            <div id="item-pagination-container" class="card-footer"></div>
        </div>
    `;
}

function addTabEventListeners(componentId) {
    const component = document.getElementById(componentId);
    if (!component) return;

    component.addEventListener('click', async (event) => {
        const clickableElement = event.target.closest('[data-action]');
        if (!clickableElement) return;

        const action = clickableElement.dataset.action;
        const id = clickableElement.dataset.id;

        switch (action) {
            case ACTIONS.ADD_ITEM:
                openItemFormModal();
                break;
            case ACTIONS.EDIT_ITEM:
                openItemFormModal({ itemId: id });
                break;
            case ACTIONS.MASS_ADD:
                openMassAddModal();
                break;
            case ACTIONS.EDIT_ITEM_BATCHES:
                openItemBatchesModal(id);
                break;
            case ACTIONS.MANAGE_KIT:
                openKitManagementModal(id);
                break;
            case ACTIONS.ADJUST_STOCK:
                openAdjustmentModal(id);
                break;
            case ACTIONS.VIEW_ITEM_HISTORY:
                openItemHistoryModal(id);
                break;
            case ACTIONS.MANAGE_MAINTENANCE:
                openItemMaintenanceModal(id);
                break;
            case ACTIONS.MANAGE_ALLOCATIONS:
                const itemToManage = getItemById(id);
                if (itemToManage) {
                    openAllocationModal(itemToManage);
                }
                break;
            case ACTIONS.DELETE_ITEM:
                const itemToDelete = getItemById(id);
                if (itemToDelete) {
                    openConfirmationModal({
                        title: 'Excluir Item',
                        message: `Tem certeza que deseja excluir o item "${itemToDelete.name}"? Isso é irreversível.`,
                        onConfirm: () => {
                            if (deleteItem(id)) {
                                document.body.dispatchEvent(new CustomEvent('dataChanged'));
                                closeModal('confirmation-modal');
                            }
                        }
                    });
                }
                break;
            case ACTIONS.ITEM_EXIT:
                openMovementModal(id);
                break;
            case ACTIONS.SCAN_BARCODE:
                openBarcodeActionModal();
                break;
            case ACTIONS.GENERATE_LABEL:
                openLabelPrintModal(id);
                break;
        }
    });
}