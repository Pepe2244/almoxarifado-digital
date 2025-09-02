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

    const session = getSession();
    const isCheckoutMode = session.isActive && session.mode === 'checkout';

    const mainActionsHTML = isCheckoutMode ? `
        <button class="btn btn-danger" data-action="${ACTIONS.CANCEL_CHECKOUT_SESSION}">
            <i class="fas fa-times"></i> Cancelar Requisição
        </button>
        <div class="checkout-mode-indicator">
            <i class="fas fa-info-circle"></i>
            <span>Modo Requisição Ativo: Selecione os itens para adicionar ao carrinho.</span>
        </div>
    ` : `
        <div class="actions-dropdown-container">
            <button class="btn btn-primary" data-action="toggle-actions-dropdown" title="Adicionar Itens">
                <i class="fas fa-plus"></i> Adicionar <i class="fas fa-chevron-down" style="font-size: 0.8em; margin-left: 8px;"></i>
            </button>
            <div class="actions-dropdown-content hidden" style="min-width: 200px;">
                <a href="#" data-action="${ACTIONS.ADD_ITEM}"><i class="fas fa-tag"></i> Novo Item</a>
                <a href="#" data-action="${ACTIONS.MASS_ADD}"><i class="fas fa-plus-square"></i> Itens em Massa</a>
            </div>
        </div>
        <button class="btn btn-warning" data-action="${ACTIONS.START_CHECKOUT_SESSION}">
            <i class="fas fa-shopping-cart"></i> Iniciar Requisição
        </button>
        <button class="btn btn-info" data-action="print-count-sheet">
            <i class="fas fa-print"></i> Imprimir Lista
        </button>
        <div class="filters-dropdown-container">
            <button id="filters-btn" class="btn btn-secondary" data-action="toggle-filters-dropdown">
                <i class="fas fa-filter"></i> Filtros <span id="active-filters-count" class="badge-count hidden"></span>
            </button>
            <div id="filters-dropdown-content" class="filters-dropdown-content hidden">
                <div class="form-group">
                    <label for="empresa-filter">Empresa:</label>
                    <select id="empresa-filter" class="form-control">
                        <option value="todas">Todas</option>
                        <option value="WeldingPro">WeldingPro</option>
                        <option value="ALV">ALV</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="almoxarifado-filter">Almoxarifado:</label>
                    <select id="almoxarifado-filter" class="form-control">
                        <option value="todos">Todos</option>
                        <option value="equipamentos">Equipamentos</option>
                        <option value="insumos">Insumos</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="item-type-filter">Tipo de Item:</label>
                    <select id="item-type-filter" class="form-control"></select>
                </div>
                 <button class="btn btn-sm btn-danger" data-action="clear-item-filters" style="width: 100%;">Limpar Filtros</button>
            </div>
        </div>
        <button class="btn btn-icon-only" data-action="${ACTIONS.SCAN_BARCODE}" title="Escanear Código de Barras">
            <i class="fas fa-barcode"></i>
        </button>
    `;

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
                ${mainActionsHTML}
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
            case 'print-count-sheet':
                exportCountSheetToPdf();
                break;
            case ACTIONS.START_CHECKOUT_SESSION:
                if (startSession('checkout')) {
                    renderItemManagementComponent();
                    document.body.dispatchEvent(new CustomEvent('dataChanged'));
                }
                break;
            case ACTIONS.CANCEL_CHECKOUT_SESSION:
                endSession();
                renderItemManagementComponent();
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
                break;
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
            case ACTIONS.CONFIRM_LOSS:
                const itemId = document.getElementById('loss-item-id').value;
                const collaboratorId = document.getElementById('loss-collaborator-id').value;
                const quantity = parseInt(document.getElementById('loss-quantity-input').value, 10);
                const reason = document.getElementById('loss-reason-input').value;
                const item = getItemById(itemId);

                if (item && collaboratorId && quantity > 0 && reason) {
                    const debitAmount = (item.value || 0) * quantity;
                    if (addDebit(collaboratorId, itemId, item.name, quantity, debitAmount, reason)) {
                        closeModal('loss-confirmation-modal');
                        document.body.dispatchEvent(new CustomEvent('dataChanged'));
                    }
                } else {
                    showToast("Por favor, preencha todos os campos corretamente.", "error");
                }
                break;
        }
    });
}