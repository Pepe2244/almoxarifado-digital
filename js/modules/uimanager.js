function closeAllFixedDropdowns() {
    document.querySelectorAll('.actions-dropdown-content:not(.hidden)').forEach(dropdown => {
        dropdown.classList.add('hidden');
    });
    document.querySelectorAll('.filters-dropdown-content:not(.hidden)').forEach(dropdown => {
        dropdown.classList.add('hidden');
    });
}

const paginationState = {
    item: {
        currentPage: 1
    },
    kit: {
        currentPage: 1
    },
    collaborator: {
        currentPage: 1
    },
    debit: {
        currentPage: 1
    },
    consumption: {
        currentPage: 1
    },
    lifecycle: {
        currentPage: 1
    },
    log: {
        currentPage: 1
    },
    report: {
        currentPage: 1
    },
    serviceOrder: {
        currentPage: 1
    }
};

const sortState = {
    item: {
        key: 'name',
        direction: 'asc'
    },
    kit: {
        key: 'name',
        direction: 'asc'
    },
    collaborator: {
        key: 'name',
        direction: 'asc'
    },
    debit: {
        key: 'date',
        direction: 'desc'
    },
    log: {
        key: 'timestamp',
        direction: 'desc'
    },
    serviceOrder: {
        key: 'openDate',
        direction: 'desc'
    }
};

let lastFocusedElement = null;
let itemTypeFilterState = 'all';
let almoxarifadoFilterState = 'todos';
let empresaFilterState = 'todas';
let onLoanFilterState = false;
let collaboratorEmpresaFilterState = 'todas';

let itemSearchTermState = '';
let kitSearchTermState = '';
let collaboratorSearchTermState = '';
let debitSearchTermState = '';
let logSearchTermState = '';
let osSearchTermState = '';

let priceHistoryChart = null;
let itemUsageChart = null;
let debitHistoryChart = null;


function dismissTemporaryAlert(alertId) {
    const dismissedAlerts = loadDataFromLocal(DB_KEYS.DISMISSED_TEMPORARY_ALERTS) || {};
    dismissedAlerts[alertId] = {
        dismissedAt: new Date().toISOString()
    };
    saveDataToLocal(DB_KEYS.DISMISSED_TEMPORARY_ALERTS, dismissedAlerts);
    document.body.dispatchEvent(new CustomEvent('dataChanged'));
}

document.body.addEventListener('changePage', (event) => {
    const {
        table,
        direction
    } = event.detail;
    if (!paginationState[table]) return;

    const totalItems = event.detail.totalItems;
    const itemsPerPage = getSettings().itemsPerPage;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (direction === 'next' && paginationState[table].currentPage < totalPages) {
        paginationState[table].currentPage++;
    } else if (direction === 'prev' && paginationState[table].currentPage > 1) {
        paginationState[table].currentPage--;
    }
    document.body.dispatchEvent(new CustomEvent('dataChanged'));
});

document.body.addEventListener('resetPage', (event) => {
    const {
        table
    } = event.detail;
    if (paginationState[table]) {
        paginationState[table].currentPage = 1;
    }
});

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function openModal(modalId, setupFunction) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const isFirstModal = !document.querySelector('dialog[open]');
    if (isFirstModal) {
        lastScrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
    }

    lastFocusedElement = document.activeElement;

    if (setupFunction && typeof setupFunction === 'function') {
        setupFunction(modal);
    }

    if (!modal.open) {
        modal.showModal();
    }

    const closeButtons = modal.querySelectorAll('[data-action^="cancel-"], [data-action^="close-"]');
    closeButtons.forEach(button => {
        if (button._closeModalHandler) {
            button.removeEventListener('click', button._closeModalHandler);
        }
        button._closeModalHandler = (event) => {
            event.preventDefault();
            closeModal(modalId);
        };
        button.addEventListener('click', button._closeModalHandler);
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && modal.open) {
        modal.close();

        queueMicrotask(() => {
            const anyModalOpen = document.querySelector('dialog[open]');
            if (!anyModalOpen) {
                document.body.style.overflow = '';
                window.scrollTo(0, lastScrollY);
            }
        });
    }
}

function renderMainLayout() {
    renderUnifiedDashboardComponent();
    const logViewer = document.getElementById('log-viewer');
    if (logViewer) {
        logViewer.innerHTML = `
            <div class="card-header">
                <h2><i class="fas fa-clipboard-list"></i> Logs de Atividade</h2>
                <div class="header-actions">
                    <div class="search-container">
                        <input type="text" id="log-search-input" class="search-input" placeholder="Buscar nos logs...">
                        <button id="log-search-btn-icon" class="btn btn-icon-only">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="item-table">
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>Ação</th>
                                <th>Detalhes</th>
                                <th>Usuário</th>
                            </tr>
                        </thead>
                        <tbody id="logs-table-body"></tbody>
                    </table>
                </div>
            </div>
            <div id="log-pagination-container" class="card-footer"></div>
        `;
    }
}

function renderUnifiedDashboardComponent() {
    const dashboard = document.getElementById('unified-dashboard');
    if (!dashboard) return;
    const settings = getSettings();

    if (settings.panelVisibility && settings.panelVisibility['unified-dashboard'] === false) {
        dashboard.classList.add('hidden');
        return;
    }
    dashboard.classList.remove('hidden');

    const isCollapsed = settings.dashboardsCollapsed?.unified === true;
    const activeTab = settings.dashboardsCollapsed?.activeTab || 'overview';
    const iconClass = isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up';
    dashboard.innerHTML = `
        <div class="card-header">
            <h2><i class="fas fa-tachometer-alt"></i> Dashboard de Análise</h2>
            <div class="header-actions">
                 <button class="btn btn-icon-only toggle-dashboard-btn" data-action="toggle-dashboard" data-target="unified-dashboard" title="Mostrar/Ocultar Painel">
                    <i class="fas ${iconClass}"></i>
                </button>
            </div>
        </div>
        <div class="card-body" style="padding-top: 0.5rem;">
            <div class="dashboard-tabs">
                <button class="btn dashboard-tab ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview" data-action="switch-tab">Visão Geral</button>
                <button class="btn dashboard-tab ${activeTab === 'consumption' ? 'active' : ''}" data-tab="consumption" data-action="switch-tab">Análise de Consumo</button>
                <button class="btn dashboard-tab ${activeTab === 'lifecycle' ? 'active' : ''}" data-tab="lifecycle" data-action="switch-tab">Ciclo de Vida</button>
            </div>
            <div id="dashboard-content-area" style="padding-top: 1rem;">
                <div id="overview-tab-content" class="dashboard-tab-content ${activeTab === 'overview' ? 'active' : ''}">
                    <div class="charts-grid">
                        <div class="chart-container">
                            <h4>Valor do Estoque por Tipo</h4>
                            <div class="chart-wrapper">
                                <canvas id="stockValueChart"></canvas>
                            </div>
                        </div>
                        <div class="chart-container">
                            <h4>Movimentações (Últimos ${getSettings().dashboardAnalysisDays || 30} dias)</h4>
                            <div class="chart-wrapper">
                                <canvas id="movementChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="consumption-tab-content" class="dashboard-tab-content ${activeTab === 'consumption' ? 'active' : ''}">
                    <div id="consumption-predictive-container" class="predictive-grid"></div>
                    <div id="consumption-pagination-container" class="card-footer"></div>
                </div>
                <div id="lifecycle-tab-content" class="dashboard-tab-content ${activeTab === 'lifecycle' ? 'active' : ''}">
                     <div id="lifecycle-predictive-container" class="predictive-grid"></div>
                     <div id="lifecycle-pagination-container" class="card-footer"></div>
                </div>
            </div>
        </div>
    `;
    if (isCollapsed) {
        dashboard.classList.add('collapsed');
    }
}

function renderAllModals() {
    const modalIds = Object.values(MODAL_IDS);
    modalIds.forEach(id => {
        const template = document.getElementById(`${id}-template`);
        const modal = document.getElementById(id);
        if (template && modal && modal.children.length === 0) {
            modal.appendChild(template.content.cloneNode(true));
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal(id);
                }
            });
            modal.addEventListener('close', () => {
                if (lastFocusedElement) {
                    lastFocusedElement.focus();
                }
            });
        }
    });
}

function updateSortIndicators(tableType) {
    const {
        key,
        direction
    } = sortState[tableType];
    const tableHeaders = document.querySelectorAll(`#${tableType}-management th[data-sort]`);

    tableHeaders.forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === key) {
            th.classList.add(`sort-${direction}`);
        }
    });
}

function renderPaginatedTable(config) {
    const {
        containerId,
        paginationContainerId,
        data,
        renderRowFunction,
        noDataMessage,
        tableType,
        renderGridFunction
    } = config;
    const targetContainer = document.getElementById(containerId);
    if (!targetContainer) return;

    if (sortState[tableType]) {
        updateSortIndicators(tableType);
    }

    const settings = getSettings();
    let dataToRender = data;
    if (settings.paginationEnabled) {
        const totalPages = Math.ceil(data.length / settings.itemsPerPage);
        if (paginationState[tableType].currentPage > totalPages) {
            paginationState[tableType].currentPage = totalPages || 1;
        }
        const startIndex = (paginationState[tableType].currentPage - 1) * settings.itemsPerPage;
        const endIndex = startIndex + settings.itemsPerPage;
        dataToRender = data.slice(startIndex, endIndex);
        renderPagination(paginationContainerId, data.length, settings.itemsPerPage, paginationState[tableType].currentPage, tableType);
    } else {
        const paginationContainer = document.getElementById(paginationContainerId);
        if (paginationContainer) paginationContainer.innerHTML = '';
    }
    if (dataToRender.length === 0) {
        if (renderGridFunction) {
            targetContainer.innerHTML = `<div class="initial-state-card" style="margin: 0; border-style: solid;"><i class="fas fa-info-circle"></i><h3>Nenhum dado encontrado</h3><p>${noDataMessage}</p></div>`;
        } else {
            const tableElement = targetContainer.closest('table');
            let colSpan = 1;
            if (tableElement) {
                const headerRow = tableElement.querySelector('thead tr');
                if (headerRow) {
                    colSpan = headerRow.children.length;
                }
            }
            targetContainer.innerHTML = `<tr><td colspan="${colSpan}" class="no-data-message">${noDataMessage}</td></tr>`;
        }
        return;
    }
    targetContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    if (renderGridFunction) {
        renderGridFunction(dataToRender, fragment);
    } else {
        dataToRender.forEach(item => {
            const newRow = renderRowFunction(item);
            if (newRow) {
                fragment.appendChild(newRow);
            }
        });
    }
    targetContainer.appendChild(fragment);
}

function renderPagination(containerId, totalItems, itemsPerPage, currentPage, actionPrefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (totalItems <= itemsPerPage) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    container.innerHTML = `
        <div class="pagination-controls">
            <button class="btn btn-secondary pagination-btn" data-action="${actionPrefix}-prev" ${prevDisabled}>
                <i class="fas fa-chevron-left"></i> Anterior
            </button>
            <span class="pagination-info">Página ${currentPage} de ${totalPages}</span>
            <button class="btn btn-secondary pagination-btn" data-action="${actionPrefix}-next" ${nextDisabled}>
                Próxima <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function createItemRow(item, updatedItemId = null) {
    if (!item) return null;
    const row = document.createElement('tr');
    row.dataset.id = item.id;

    if (item.id === updatedItemId) {
        const handleAnimationEnd = () => {
            row.classList.remove('row-updated');
            row.removeEventListener('animationend', handleAnimationEnd);
        };
        row.addEventListener('animationend', handleAnimationEnd);
        row.classList.add('row-updated');
    }

    const settings = getSettings();
    const isReturnable = settings.returnableTypes.includes(item.type);
    const stockText = `<strong>Estoque: ${item.currentStock} ${item.unit || 'un'}</strong>`;
    const locationText = `<span><i class="fas fa-map-marker-alt"></i> ${item.location?.aisle || 'N/A'}-${item.location?.shelf || 'N/A'}-${item.location?.box || 'N/A'}</span>`;
    let loanButtonHTML = '';
    if (item.onLoanCount > 0) {
        loanButtonHTML = `<button class="btn btn-sm btn-info" data-action="${ACTIONS.MANAGE_ALLOCATIONS}" data-id="${item.id}" title="Gerenciar Itens Emprestados"><i class="fas fa-user-tag"></i> Emprestado: ${item.onLoanCount}</button>`;
    }

    let statusBadgeHTML = `<span class="status-badge">${item.type}</span>`;
    if (isReturnable) {
        let statusColorClass = '';
        if (item.status === 'Em Manutenção') statusColorClass = 'status-warning';
        else if (item.status === 'Aposentado') statusColorClass = 'status-danger';
        else if (item.status === 'Ativo') statusColorClass = 'status-success';
        statusBadgeHTML += `<span class="status-badge ${statusColorClass}">${item.status}</span>`;
    }

    const stockLevelsSettings = settings.stockLevels;
    let stockStatusRowClass = '';
    if (item.minStock > 0) {
        const percentage = item.currentStock > 0 && item.minStock > 0 ? (item.currentStock / item.minStock) * 100 : 0;
        if (item.currentStock === 0) stockStatusRowClass = 'stock-status-critical';
        else if (percentage < stockLevelsSettings.low) stockStatusRowClass = 'stock-status-low';
        else if (percentage < stockLevelsSettings.medium) stockStatusRowClass = 'stock-status-medium';
        else if (percentage < stockLevelsSettings.ok) stockStatusRowClass = 'stock-status-ok';
    }
    if (stockStatusRowClass) {
        row.classList.add(stockStatusRowClass);
    }

    let dropdownOptions = `
        <a href="#" data-action="${ACTIONS.ADJUST_STOCK}" data-id="${item.id}"><i class="fas fa-sync-alt"></i> Ajustar Estoque</a>
        <a href="#" data-action="${ACTIONS.VIEW_ITEM_HISTORY}" data-id="${item.id}"><i class="fas fa-history"></i> Histórico</a>
        <a href="#" data-action="${ACTIONS.GENERATE_LABEL}" data-id="${item.id}"><i class="fas fa-barcode"></i> Gerar Etiqueta</a>
    `;

    if (item.type === 'Kit') {
        dropdownOptions += `<a href="#" data-action="${ACTIONS.MANAGE_KIT}" data-id="${item.id}"><i class="fas fa-toolbox"></i> Gerenciar Kit</a>`;
    } else {
        dropdownOptions += `<a href="#" data-action="${ACTIONS.EDIT_ITEM_BATCHES}" data-id="${item.id}"><i class="fas fa-boxes"></i> Gerenciar Lotes</a>`;
        if (isReturnable) {
            dropdownOptions += `<a href="#" data-action="${ACTIONS.MANAGE_MAINTENANCE}" data-id="${item.id}"><i class="fas fa-tools"></i> Manutenção</a>`;
        }
    }

    dropdownOptions += `
        <div class="dropdown-divider"></div>
        <a href="#" data-action="${ACTIONS.DELETE_ITEM}" data-id="${item.id}" class="danger-action"><i class="fas fa-trash-alt"></i> Excluir Item</a>
    `;

    const nameParts = item.name.split(' ');
    const displayName = nameParts.length > 2 ? `${nameParts.slice(0, 2).join(' ')}...` : item.name;

    const session = getSession();
    let mainActionHTML = '';
    if (session.isActive && session.mode === 'checkout') {
        mainActionHTML = `<button class="btn btn-sm btn-success" data-action="${ACTIONS.ADD_TO_CART}" data-id="${item.id}" title="Adicionar ao Carrinho"><i class="fas fa-cart-plus"></i></button>`;
    } else {
        mainActionHTML = `<button class="btn btn-sm btn-warning" data-action="${ACTIONS.ITEM_EXIT}" data-id="${item.id}" title="Saída / Empréstimo"><i class="fas fa-sign-out-alt"></i></button>`;
    }


    row.innerHTML = `
        <td data-label="Item" class="item-col">
            <div class="item-name-cell-content">
                <img src="icons/placeholder.png" alt="${item.name}" class="item-thumbnail" data-item-id="${item.id}" onerror="this.onerror=null;this.src='icons/placeholder.png';">
                <div title="${item.name}">${displayName}</div>
            </div>
        </td>
        <td data-label="Tipo/Status" class="type-col">${statusBadgeHTML}</td>
        <td data-label="Detalhes do Estoque" class="stock-details-col">
            <div class="stock-details-content">
                ${stockText}
                ${locationText}
                ${loanButtonHTML}
            </div>
        </td>
        <td data-label="Ações" class="actions-cell">
            <div class="actions-container">
                ${mainActionHTML}
                <button class="btn btn-sm btn-primary" data-action="${ACTIONS.EDIT_ITEM}" data-id="${item.id}" title="Editar Item"><i class="fas fa-edit"></i></button>
                <div class="actions-dropdown-container">
                    <button class="btn btn-sm btn-secondary btn-icon-only" data-action="toggle-actions-dropdown" title="Mais Opções"><i class="fas fa-ellipsis-v"></i></button>
                    <div class="actions-dropdown-content hidden">${dropdownOptions}</div>
                </div>
            </div>
        </td>`;

    if (item.hasImage) {
        const imgElement = row.querySelector(`.item-thumbnail[data-item-id="${item.id}"]`);
        loadImage(item.id).then(imageUrl => {
            if (imageUrl) {
                imgElement.src = imageUrl;
            }
        });
    }

    row.querySelector('.actions-dropdown-content').addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (link) {
            closeAllFixedDropdowns();
        }
    });

    return row;
}

function renderItemsTable(filteredItems, updatedItemId = null) {
    const allItems = getAllItems();
    const itemManagementCard = document.getElementById('item-management');
    const cardBody = itemManagementCard.querySelector('.card-body');

    if (document.getElementById('item-management')) {
        renderItemManagementComponent();
    }
    if (document.getElementById('kit-management')) {
        renderKitManagementComponent();
    }

    if (allItems.filter(i => i.type !== 'Kit').length === 0) {
        cardBody.innerHTML = `
            <div class="initial-state-card">
                <i class="fas fa-box-open"></i>
                <h3>Nenhum item cadastrado!</h3>
                <p>Que tal começar adicionando seu primeiro item?</p>
                <button class="btn btn-primary" data-action="${ACTIONS.ADD_ITEM}"><i class="fas fa-plus"></i> Adicionar Primeiro Item</button>
            </div>
        `;
        return;
    }

    if (!cardBody.querySelector('.item-table')) {
        cardBody.innerHTML = `
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
        `;
    }

    const typeFilter = document.getElementById('item-type-filter');
    if (typeFilter) {
        let optionsHTML = '<option value="all">Todos os Tipos</option>';
        optionsHTML += getSettings().itemTypes.filter(t => t !== 'Kit').map(type => `<option value="${type}">${type}</option>`).join('');
        typeFilter.innerHTML = optionsHTML;
        typeFilter.value = itemTypeFilterState;
    }

    const empresaFilter = document.getElementById('empresa-filter');
    if (empresaFilter) {
        empresaFilter.value = empresaFilterState;
    }

    const almoxarifadoFilter = document.getElementById('almoxarifado-filter');
    if (almoxarifadoFilter) {
        almoxarifadoFilter.value = almoxarifadoFilterState;
    }

    const searchTerm = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
    renderPaginatedTable({
        containerId: 'items-table-body',
        paginationContainerId: 'item-pagination-container',
        data: filteredItems,
        renderRowFunction: (item) => createItemRow(item, updatedItemId),
        noDataMessage: searchTerm ? `Nenhum item encontrado para "${searchTerm}".` : 'Nenhum item para os filtros selecionados.',
        tableType: 'item'
    });
}

function createKitRow(kit) {
    if (!kit) return null;
    const row = document.createElement('tr');
    row.dataset.id = kit.id;

    const allItems = getAllItems();
    const kitItems = (kit.kitItems || []);
    const maxItemsToShow = 2;
    let componentNames = kitItems
        .slice(0, maxItemsToShow)
        .map(ci => {
            const item = allItems.find(i => i.id === ci.id);
            return item ? `${ci.quantity}x ${item.name}` : '';
        })
        .filter(name => name)
        .join(', ');

    if (kitItems.length > maxItemsToShow) {
        componentNames += ', ...';
    }


    let loanButtonHTML = '';
    if (kit.onLoanCount > 0) {
        loanButtonHTML = `<button class="btn btn-sm btn-info" data-action="${ACTIONS.MANAGE_ALLOCATIONS}" data-id="${kit.id}" title="Gerenciar Kits Emprestados"><i class="fas fa-user-tag"></i> ${kit.onLoanCount}</button>`;
    }

    const dropdownOptions = `
        <a href="#" data-action="${ACTIONS.MANAGE_KIT}" data-id="${kit.id}"><i class="fas fa-toolbox"></i> Gerenciar Componentes</a>
        <a href="#" data-action="${ACTIONS.VIEW_ITEM_HISTORY}" data-id="${kit.id}"><i class="fas fa-history"></i> Histórico do Kit</a>
        <a href="#" data-action="${ACTIONS.GENERATE_LABEL}" data-id="${kit.id}"><i class="fas fa-barcode"></i> Gerar Etiqueta</a>
        <div class="dropdown-divider"></div>
        <a href="#" data-action="${ACTIONS.DELETE_ITEM}" data-id="${kit.id}" class="danger-action"><i class="fas fa-trash-alt"></i> Excluir Kit</a>
    `;

    row.innerHTML = `
        <td>
            <div class="item-name-cell-content">
                <img src="icons/placeholder.png" alt="${kit.name}" class="item-thumbnail" data-item-id="${kit.id}" onerror="this.onerror=null;this.src='icons/placeholder.png';">
                <div>${kit.name}</div>
            </div>
        </td>
        <td><strong>${kit.currentStock}</strong> ${loanButtonHTML}</td>
        <td>${componentNames || 'Vazio'}</td>
        <td class="actions-cell">
            <button class="btn btn-sm btn-warning" data-action="${ACTIONS.ITEM_EXIT}" data-id="${kit.id}" title="Saída / Empréstimo de Kit"><i class="fas fa-sign-out-alt"></i></button>
            <button class="btn btn-sm btn-primary" data-action="${ACTIONS.EDIT_ITEM}" data-id="${kit.id}" title="Editar Kit"><i class="fas fa-edit"></i></button>
            <div class="actions-dropdown-container">
                <button class="btn btn-sm btn-secondary btn-icon-only" data-action="toggle-actions-dropdown" title="Mais Opções"><i class="fas fa-ellipsis-v"></i></button>
                <div class="actions-dropdown-content hidden">${dropdownOptions}</div>
            </div>
        </td>
    `;

    if (kit.hasImage) {
        const imgElement = row.querySelector(`.item-thumbnail[data-item-id="${kit.id}"]`);
        loadImage(kit.id).then(imageUrl => {
            if (imageUrl) imgElement.src = imageUrl;
        });
    }

    row.querySelector('.actions-dropdown-content').addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (link) {
            closeAllFixedDropdowns();
        }
    });

    return row;
}


function renderKitsTable(filteredKits) {
    const searchTerm = document.getElementById('kit-search-input')?.value.trim().toLowerCase() || '';
    renderPaginatedTable({
        containerId: 'kits-table-body',
        paginationContainerId: 'kit-pagination-container',
        data: filteredKits,
        renderRowFunction: createKitRow,
        noDataMessage: searchTerm ? `Nenhum kit encontrado para "${searchTerm}".` : 'Nenhum kit cadastrado. Crie um item do tipo "Kit" para começar.',
        tableType: 'kit'
    });
}


function createCollaboratorRow(collaborator) {
    const row = document.createElement('tr');
    row.dataset.id = collaborator.id;
    row.innerHTML = `
        <td>${collaborator.name}</td>
        <td>${collaborator.registration || 'N/A'}</td>
        <td><span class="status-badge">${collaborator.role || 'N/A'}</span></td>
        <td class="actions-cell">
            <button class="btn btn-sm btn-success" data-action="${ACTIONS.GENERATE_RECEIPT}" data-id="${collaborator.id}" title="Gerar Comprovante de Entrega"><i class="fas fa-receipt"></i></button>
            <button class="btn btn-sm btn-secondary" data-action="${ACTIONS.VIEW_SIGNED_RECEIPTS}" data-id="${collaborator.id}" title="Ver Comprovantes Assinados"><i class="fas fa-history"></i></button>
            <button class="btn btn-sm btn-info" data-action="${ACTIONS.VIEW_COLLABORATOR_DASHBOARD}" data-id="${collaborator.id}" title="Dashboard do Colaborador"><i class="fas fa-chart-bar"></i></button>
            <button class="btn btn-sm btn-primary" data-action="${ACTIONS.EDIT_COLLABORATOR}" data-id="${collaborator.id}" title="Editar Colaborador"><i class="fas fa-user-edit"></i></button>
            <button class="btn btn-sm btn-danger" data-action="${ACTIONS.DELETE_COLLABORATOR}" data-id="${collaborator.id}" title="Excluir Colaborador"><i class="fas fa-user-times"></i></button>
        </td>`;
    return row;
}

function renderCollaboratorsTable(collaborators) {
    const allCollaborators = getAllCollaborators();
    const collaboratorCard = document.getElementById('collaborator-management');
    const cardBody = collaboratorCard.querySelector('.card-body');

    if (document.getElementById('collaborator-management')) {
        renderCollaboratorManagementComponent();
    }

    if (allCollaborators.length === 0) {
        cardBody.innerHTML = `
            <div class="initial-state-card">
                <i class="fas fa-users"></i>
                <h3>Nenhum colaborador cadastrado.</h3>
                <p>Adicione colaboradores para gerenciar empréstimos e responsabilidades.</p>
                <button class="btn btn-primary" data-action="${ACTIONS.ADD_COLLABORATOR}"><i class="fas fa-user-plus"></i> Adicionar Colaborador</button>
            </div>
        `;
        return;
    }

    if (!cardBody.querySelector('.table-responsive')) {
        cardBody.innerHTML = `
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
        `;
    }

    const searchTerm = document.getElementById('collaborator-search-input')?.value.trim().toLowerCase() || '';
    renderPaginatedTable({
        containerId: 'collaborators-table-body',
        paginationContainerId: 'collaborator-pagination-container',
        data: collaborators,
        renderRowFunction: createCollaboratorRow,
        noDataMessage: searchTerm ? `Nenhum colaborador encontrado para "${searchTerm}".` : 'Nenhum colaborador cadastrado.',
        tableType: 'collaborator'
    });
}

function createDebitRow(debit) {
    const row = document.createElement('tr');
    row.dataset.id = debit.id;
    const collaboratorName = getCollaboratorById(debit.collaboratorId)?.name || 'Colaborador não encontrado';
    row.innerHTML = `
        <td>${new Date(debit.date).toLocaleDateString('pt-BR')}</td>
        <td>${collaboratorName}</td>
        <td>${debit.itemName} (Qtd: ${debit.quantity})</td>
        <td>${debit.reason}</td>
        <td>R$ ${debit.amount.toFixed(2)}</td>
        <td class="actions-cell">
            <button class="btn btn-sm btn-success" data-action="${ACTIONS.SETTLE_DEBIT}" data-id="${debit.id}" title="Quitar Débito"><i class="fas fa-check"></i></button>
        </td>`;
    return row;
}

function renderDebitsTable(allDebits, searchTerm = '') {
    const debits = allDebits.filter(d => !d.isSettled);
    renderPaginatedTable({
        containerId: 'debits-table-body',
        paginationContainerId: 'debit-pagination-container',
        data: debits,
        renderRowFunction: createDebitRow,
        noDataMessage: searchTerm ? `Nenhum débito encontrado para "${searchTerm}".` : 'Nenhum débito pendente registrado.',
        tableType: 'debit'
    });
}

function createServiceOrderRow(os) {
    const row = document.createElement('tr');
    row.dataset.id = os.id;
    const technicianName = getCollaboratorById(os.technicianId)?.name || 'Não definido';

    let statusClass = '';
    if (os.status === 'Aberta') statusClass = 'status-info';
    else if (os.status === 'Em Andamento') statusClass = 'status-warning';
    else if (os.status === 'Fechada') statusClass = 'status-success';

    row.innerHTML = `
        <td><strong>${os.id}</strong></td>
        <td>${os.customer}</td>
        <td>${technicianName}</td>
        <td>${new Date(os.openDate).toLocaleDateString('pt-BR')}</td>
        <td><span class="status-badge ${statusClass}">${os.status}</span></td>
        <td class="actions-cell">
            <button class="btn btn-sm btn-info" data-action="${ACTIONS.VIEW_SERVICE_ORDER}" data-id="${os.id}" title="Ver Detalhes da O.S."><i class="fas fa-eye"></i></button>
            <button class="btn btn-sm btn-primary" data-action="${ACTIONS.EDIT_SERVICE_ORDER}" data-id="${os.id}" title="Editar O.S."><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" data-action="${ACTIONS.DELETE_SERVICE_ORDER}" data-id="${os.id}" title="Excluir O.S."><i class="fas fa-trash-alt"></i></button>
        </td>`;
    return row;
}

function renderServiceOrdersTable(serviceOrders, searchTerm = '') {
    const osCard = document.getElementById('service-order-management');
    if (!osCard || osCard.classList.contains('hidden')) {
        return;
    }

    const allServiceOrders = getAllServiceOrders();
    const cardBody = osCard.querySelector('.card-body');

    if (!cardBody) {
        return;
    }

    if (allServiceOrders.length === 0) {
        cardBody.innerHTML = `
            <div class="initial-state-card">
                <i class="fas fa-file-signature"></i>
                <h3>Nenhuma Ordem de Serviço aberta.</h3>
                <p>Crie sua primeira O.S. para começar a associar itens e colaboradores a um serviço.</p>
                <button class="btn btn-primary" data-action="${ACTIONS.ADD_SERVICE_ORDER}"><i class="fas fa-plus"></i> Abrir Primeira O.S.</button>
            </div>
        `;
        return;
    }

    if (!cardBody.querySelector('.table-responsive')) {
        cardBody.innerHTML = `
            <div class="table-responsive">
                <table class="item-table">
                     <thead>
                        <tr>
                            <th data-sort="id">Número O.S.</th>
                            <th data-sort="customer">Cliente</th>
                            <th data-sort="technicianId">Técnico</th>
                            <th data-sort="openDate">Data Abertura</th>
                            <th data-sort="status">Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="os-table-body">
                    </tbody>
                </table>
            </div>
            <div id="os-pagination-container" class="card-footer"></div>
        `;
    }

    renderPaginatedTable({
        containerId: 'os-table-body',
        paginationContainerId: 'os-pagination-container',
        data: serviceOrders,
        renderRowFunction: createServiceOrderRow,
        noDataMessage: searchTerm ? `Nenhuma O.S. encontrada para "${searchTerm}".` : 'Nenhuma Ordem de Serviço cadastrada.',
        tableType: 'serviceOrder'
    });
}

function renderNotificationPanel(allAlerts) {
    const panel = document.getElementById('notification-panel');
    const badge = document.getElementById('notification-count-badge');
    if (!panel || !badge) return;

    const settings = getSettings();
    const behaviors = settings.notificationBehaviors || {};

    panel.innerHTML = `
        <div class="notification-panel-header">
            <span>Notificações</span>
            <button class="btn btn-icon-only btn-sm clear-notifications-btn" data-action="${ACTIONS.CLEAR_ALL_NOTIFICATIONS}" title="Limpar todas as notificações informativas">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>`;

    const activeAlerts = Array.isArray(allAlerts) ? allAlerts.filter(a => a) : [];

    if (activeAlerts.length > 0) {
        badge.textContent = activeAlerts.length > 9 ? '9+' : activeAlerts.length;
        badge.classList.remove('hidden');

        const fragment = document.createDocumentFragment();
        activeAlerts.forEach(alertData => {
            const item = document.createElement('div');
            item.className = `notification-item ${alertData.type.replace('_', '-')}`;
            item.dataset.alertId = alertData.id;
            item.dataset.alertData = JSON.stringify(alertData);

            const iconMap = {
                [ALERT_TYPES.LOW_STOCK]: 'fa-exclamation-triangle',
                [ALERT_TYPES.PRICE_VARIATION]: 'fa-dollar-sign',
                [ALERT_TYPES.PREDICTIVE]: 'fa-tachometer-alt',
                [ALERT_TYPES.PENDING_COUNT]: 'fa-calendar-check',
                [ALERT_TYPES.VALIDITY_EXPIRED]: 'fa-calendar-times',
                [ALERT_TYPES.VALIDITY_WARNING]: 'fa-hourglass-half',
                [ALERT_TYPES.PRICE_CHECK_REMINDER]: 'fa-tags',
                [ALERT_TYPES.MAINTENANCE_NEEDED]: 'fa-tools',
                [ALERT_TYPES.BACKUP_REMINDER]: 'fa-save',
                [ALERT_TYPES.UNSIGNED_RECEIPT]: 'fa-clock'
            };

            let buttonsHTML = '';
            switch (alertData.type) {
                case ALERT_TYPES.LOW_STOCK:
                    buttonsHTML = `<button class="btn btn-sm btn-success" data-action="${ACTIONS.QUICK_ADD_STOCK}" data-id="${alertData.itemId}">+ Entrada</button>`;
                    break;
                case ALERT_TYPES.PENDING_COUNT:
                    buttonsHTML = `<button class="btn btn-sm btn-secondary" data-action="${ACTIONS.DO_COUNT}" data-id="${alertData.itemId}">Contar</button>`;
                    break;
                case ALERT_TYPES.VALIDITY_EXPIRED:
                    buttonsHTML = `<button class="btn btn-sm btn-danger" data-action="${ACTIONS.REPLACE_ITEM}" data-id="${alertData.itemId}" data-quantity="${alertData.quantity}">Substituir</button>`;
                    break;
                case ALERT_TYPES.UNSIGNED_RECEIPT:
                    buttonsHTML = `<button class="btn btn-sm btn-info" data-action="${ACTIONS.DISMISS_MANUAL_ALERT}" data-id="${alertData.id}">Ok, Ciente</button>`;
                    break;
                case ALERT_TYPES.PRICE_CHECK_REMINDER:
                case ALERT_TYPES.PRICE_VARIATION:
                case ALERT_TYPES.VALIDITY_WARNING:
                case ALERT_TYPES.PREDICTIVE:
                case ALERT_TYPES.MAINTENANCE_NEEDED:
                case ALERT_TYPES.BACKUP_REMINDER:
                    if (behaviors[alertData.type] === 'info') {
                        buttonsHTML = `<button class="btn btn-sm btn-info" data-action="${ACTIONS.DISMISS_MANUAL_ALERT}" data-id="${alertData.id}">Ok, Ciente</button>`;
                    }
                    if (alertData.type === ALERT_TYPES.MAINTENANCE_NEEDED) {
                        buttonsHTML += `<button class="btn btn-sm btn-primary" data-action="${ACTIONS.MANAGE_MAINTENANCE}" data-id="${alertData.itemId}">Gerenciar</button>`;
                    }
                    if (alertData.type === ALERT_TYPES.BACKUP_REMINDER) {
                        buttonsHTML += `<button class="btn btn-sm btn-info" data-action="${ACTIONS.DO_BACKUP}">Fazer Backup Agora</button>`;
                    }
                    break;
            }

            const isInformational = behaviors[alertData.type] === 'info';

            item.innerHTML = `
                <div class="notification-item-content">
                    <div class="notification-message">
                        <i class="fas ${iconMap[alertData.type] || 'fa-gem'}"></i>
                        <span>${alertData.message}</span>
                    </div>
                    ${buttonsHTML ? `<div class="notification-actions">${buttonsHTML}</div>` : ''}
                </div>
                ${isInformational ? `
                <button class="btn btn-icon-only btn-sm notification-dismiss-btn" data-action="${ACTIONS.DISMISS_MANUAL_ALERT}" title="Dispensar notificação">
                    <i class="fas fa-times"></i>
                </button>` : ''}
            `;
            fragment.appendChild(item);
        });
        panel.appendChild(fragment);
    } else {
        badge.textContent = '';
        badge.classList.add('hidden');
        panel.innerHTML += '<div class="notification-item" style="cursor: default;"><div class="notification-message">Nenhuma notificação no momento.</div></div>';
    }
}

function renderAlerts(allAlerts) {
    const oldAlertsContainer = document.getElementById('dashboard-overview');
    if (oldAlertsContainer) {
        oldAlertsContainer.remove();
    }

    const dismissedTemporaryAlerts = loadDataFromLocal(DB_KEYS.DISMISSED_TEMPORARY_ALERTS) || {};

    const allActiveAlerts = allAlerts.filter(alert => {
        return !dismissedTemporaryAlerts[alert.id];
    }).sort((a, b) => (a.type > b.type) ? 1 : ((b.type > a.type) ? -1 : 0));

    renderNotificationPanel(allActiveAlerts);
}

function renderSettingsPage(settings) {
    document.getElementById('setting-warehouse-name').value = settings.warehouseName || '';
    document.getElementById('setting-price-variation').value = settings.priceVariationPercentage || 10;
    document.getElementById('setting-predictive-analysis-days').value = settings.predictiveAnalysisDays || 90;
    document.getElementById('setting-dashboard-analysis-days').value = settings.dashboardAnalysisDays || 30;
    document.getElementById('setting-alert-returnables').checked = settings.alertForReturnables === true;
    document.getElementById('setting-pagination-enabled').checked = settings.paginationEnabled === true;
    document.getElementById('setting-items-per-page').value = settings.itemsPerPage || 10;
    document.getElementById('setting-debit-calculation').value = settings.debitCalculation || 'depreciated';
    document.getElementById('setting-aisles').value = settings.aisles || '';
    document.getElementById('setting-shelves-per-aisle').value = settings.shelvesPerAisle || 0;
    document.getElementById('setting-boxes-per-shelf').value = settings.boxesPerShelf || 0;
    document.getElementById('level-ok').value = settings.stockLevels.ok;
    document.getElementById('level-medium').value = settings.stockLevels.medium;
    document.getElementById('level-low').value = settings.stockLevels.low;
    document.getElementById('setting-alert-critical').value = settings.predictiveAlertLevels.critical;
    document.getElementById('setting-alert-warning').value = settings.predictiveAlertLevels.warning;

    const panelVisibilityContainer = document.querySelector('#panel-visibility-container .checkbox-group');
    if (panelVisibilityContainer) {
        const panelVisibility = settings.panelVisibility || {};
        const panelLabels = {
            'item-management': 'Gestão de Itens',
            'kit-management': 'Gestão de Kits',
            'collaborator-management': 'Colaboradores',
            'debit-management': 'Débitos',
            'reporting-section': 'Relatórios',
            'unified-dashboard': 'Dashboard de Análise',
            'service-order-management': 'Ordens de Serviço'
        };
        panelVisibilityContainer.innerHTML = '';
        for (const panelId in panelLabels) {
            const isVisible = panelVisibility[panelId] !== false;
            const checkboxHTML = `
                <div class="checkbox-item">
                    <input type="checkbox" id="vis-${panelId}" name="${panelId}" ${isVisible ? 'checked' : ''}>
                    <label for="vis-${panelId}">${panelLabels[panelId]}</label>
                </div>
            `;
            panelVisibilityContainer.innerHTML += checkboxHTML;
        }
    }

    const countFreqContainer = document.getElementById('count-frequency-container');
    countFreqContainer.innerHTML = '';
    settings.itemTypes.forEach(type => {
        countFreqContainer.innerHTML += `<div class="form-group"><label for="setting-freq-${type}">Frequência ${type} (dias):</label><input type="number" id="setting-freq-${type}" data-type="${type}" value="${settings.countFrequency[type] || 180}" min="1"></div>`;
    });
    const priceCheckFreqContainer = document.getElementById('price-check-frequency-container');
    if (priceCheckFreqContainer) {
        priceCheckFreqContainer.innerHTML = `<div class="form-group"><label for="setting-price-check-frequency">Frequência de Verificação de Preço (dias):</label><input type="number" id="setting-price-check-frequency" name="setting-price-check-frequency" value="${settings.priceCheckFrequency || 0}" min="0" placeholder="0 para desabilitar"></div>`;
    }
    const maintenanceFreqContainer = document.getElementById('maintenance-frequency-container');
    maintenanceFreqContainer.innerHTML = '';
    settings.itemTypes.forEach(type => {
        if (settings.returnableTypes.includes(type)) {
            maintenanceFreqContainer.innerHTML += `<div class="form-group"><label for="setting-maint-freq-${type}">Manutenção ${type} (dias):</label><input type="number" id="setting-maint-freq-${type}" data-type="${type}" value="${settings.maintenanceFrequency[type] || 365}" min="0" placeholder="0 para desabilitar"></div>`;
        }
    });
    document.getElementById('setting-email-public-key').value = settings.emailSettings?.publicKey || '';
    document.getElementById('setting-email-service-id').value = settings.emailSettings?.serviceId || '';
    document.getElementById('setting-email-template-id').value = settings.emailSettings?.templateId || '';
    document.getElementById('setting-recipient-email').value = settings.emailSettings?.recipientEmail || '';
    document.getElementById('setting-backup-frequency').value = settings.backupReminder?.frequencyDays || 7;

    const notificationBehaviorContainer = document.getElementById('notification-behavior-container');
    notificationBehaviorContainer.innerHTML = '';
    const behaviors = settings.notificationBehaviors || {};
    const notificationLabels = {
        [ALERT_TYPES.LOW_STOCK]: 'Estoque Baixo',
        [ALERT_TYPES.VALIDITY_EXPIRED]: 'Validade Expirada',
        [ALERT_TYPES.PENDING_COUNT]: 'Contagem Pendente',
        [ALERT_TYPES.MAINTENANCE_NEEDED]: 'Manutenção Necessária',
        [ALERT_TYPES.PRICE_VARIATION]: 'Variação de Preço',
        [ALERT_TYPES.PREDICTIVE]: 'Análise Preditiva de Consumo',
        [ALERT_TYPES.VALIDITY_WARNING]: 'Aviso de Validade',
        [ALERT_TYPES.PRICE_CHECK_REMINDER]: 'Lembrete de Verificação de Preço',
        [ALERT_TYPES.BACKUP_REMINDER]: 'Lembrete de Backup'
    };

    for (const key in behaviors) {
        const label = notificationLabels[key] || key;
        const behavior = behaviors[key];
        const row = document.createElement('div');
        row.className = 'form-group form-row-spaced';
        row.innerHTML = `
            <label for="notification-behavior-${key}">${label}:</label>
            <select id="notification-behavior-${key}" data-type="${key}">
                <option value="action" ${behavior === 'action' ? 'selected' : ''}>Ação Obrigatória</option>
                <option value="info" ${behavior === 'info' ? 'selected' : ''}>Informativa (Dispensável)</option>
            </select>
        `;
        notificationBehaviorContainer.appendChild(row);
    }

    const warehouseTitle = document.querySelector('#warehouse-title');
    warehouseTitle.innerHTML = `<i class="fas fa-warehouse"></i> `;
    warehouseTitle.append(settings.warehouseName || 'Almoxarifado Digital');
    const returnableTypesContainer = document.getElementById('returnable-types-container');
    const existingTypesList = document.getElementById('existing-types-list');
    returnableTypesContainer.innerHTML = '';
    existingTypesList.innerHTML = '';
    settings.itemTypes.forEach(type => {
        returnableTypesContainer.innerHTML += `<div class="checkbox-item"><input type="checkbox" id="type-${type}" name="returnableTypes" value="${type}" ${settings.returnableTypes.includes(type) ? 'checked' : ''}><label for="type-${type}">${type}</label></div>`;
        existingTypesList.innerHTML += `<div class="existing-type-item"><span>${type}</span><button type="button" class="btn btn-sm btn-danger" data-action="${ACTIONS.DELETE_TYPE}" data-type-name="${type}" title="Excluir Tipo"><i class="fas fa-trash-alt"></i></button></div>`;
    });
}

function renderReport(containerId, content) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = content;
}

function createMovementReportRow(record) {
    const row = document.createElement('tr');
    const typeMap = {
        [ACTIONS.HISTORY_ENTRY]: 'Entrada',
        [ACTIONS.HISTORY_EXIT]: 'Saída',
        [ACTIONS.HISTORY_ADJUSTMENT]: 'Ajuste',
        [ACTIONS.HISTORY_LOAN]: 'Empréstimo',
        [ACTIONS.HISTORY_RETURN]: 'Devolução',
        [ACTIONS.HISTORY_LOSS]: 'Perda',
        [ACTIONS.HISTORY_DISCARD]: 'Descarte'
    };
    row.innerHTML = `
        <td>${new Date(record.timestamp).toLocaleString('pt-BR')}</td>
        <td>${record.itemName}</td>
        <td class="${record.type}">${typeMap[record.type] || record.type}</td>
        <td>${Math.abs(record.quantity)}</td>
        <td>${record.responsible || 'N/A'}</td>
    `;
    return row;
}

function renderMovementReport(reportData) {
    const container = document.getElementById('report-results');
    if (!container) return;
    if (!reportData || reportData.length === 0) {
        container.innerHTML = '<p>Nenhuma movimentação encontrada para o período.</p>';
        return;
    }
    container.innerHTML = `
        <div class="table-responsive">
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Item</th>
                        <th>Tipo</th>
                        <th>Quantidade</th>
                        <th>Responsável</th>
                    </tr>
                </thead>
                <tbody id="report-results-body"></tbody>
            </table>
        </div>
    `;
    renderPaginatedTable({
        containerId: 'report-results-body',
        paginationContainerId: 'report-pagination-container',
        data: reportData,
        renderRowFunction: createMovementReportRow,
        noDataMessage: 'Nenhuma movimentação encontrada para o período.',
        tableType: 'report'
    });
}

function createUsageReportRow(item) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.quantity}</td>
    `;
    return row;
}

function renderUsageReport(reportData) {
    const container = document.getElementById('report-results');
    if (!container) return;
    if (!reportData || reportData.length === 0) {
        container.innerHTML = '<p>Nenhuma movimentação de saída encontrada para o período.</p>';
        return;
    }
    container.innerHTML = `
        <div class="table-responsive">
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Total de Saídas/Empréstimos</th>
                    </tr>
                </thead>
                <tbody id="report-results-body"></tbody>
            </table>
        </div>
    `;
    renderPaginatedTable({
        containerId: 'report-results-body',
        paginationContainerId: 'report-pagination-container',
        data: reportData,
        renderRowFunction: createUsageReportRow,
        noDataMessage: 'Nenhuma movimentação de saída encontrada para o período.',
        tableType: 'report'
    });
}

function createStockValueReportRow(item) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.totalStock}</td>
        <td>${(item.price || 0).toFixed(2)}</td>
        <td>${item.totalValue.toFixed(2)}</td>
    `;
    return row;
}

function renderStockValueReport(reportData) {
    const container = document.getElementById('report-results');
    if (!container) return;
    if (!reportData || !reportData.items || reportData.items.length === 0) {
        container.innerHTML = '<p>Nenhum item para calcular valor.</p>';
        return;
    }
    container.innerHTML = `
        <div class="table-responsive">
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Estoque Total</th>
                        <th>Preço Unit. (R$)</th>
                        <th>Valor Total (R$)</th>
                    </tr>
                </thead>
                <tbody id="report-results-body"></tbody>
            </table>
        </div>
        <div class="report-total">Valor Total do Estoque: R$ ${reportData.grandTotal.toFixed(2)}</div>
    `;
    renderPaginatedTable({
        containerId: 'report-results-body',
        paginationContainerId: 'report-pagination-container',
        data: reportData.items,
        renderRowFunction: createStockValueReportRow,
        noDataMessage: 'Nenhum item para calcular valor.',
        tableType: 'report'
    });
}

function createPurchaseSuggestionReportRow(item) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.currentStock} / ${item.minStock}</td>
        <td>${item.quantityToBuy}</td>
        <td>${item.estimatedCost.toFixed(2)}</td>
    `;
    return row;
}

function renderPurchaseSuggestionReport(reportData) {
    const container = document.getElementById('report-results');
    if (!container) return;
    if (!reportData || !reportData.items || reportData.items.length === 0) {
        container.innerHTML = '<p>Nenhum item precisa de reposição. Ótimo trabalho!</p>';
        return;
    }
    container.innerHTML = `
        <div class="table-responsive">
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Estoque Atual/Mínimo</th>
                        <th>Qtd. Sugerida</th>
                        <th>Custo Estimado (R$)</th>
                    </tr>
                </thead>
                <tbody id="report-results-body"></tbody>
            </table>
        </div>
        <div class="report-total">Custo Total Estimado da Compra: R$ ${reportData.grandTotal.toFixed(2)}</div>
    `;
    renderPaginatedTable({
        containerId: 'report-results-body',
        paginationContainerId: 'report-pagination-container',
        data: reportData.items,
        renderRowFunction: createPurchaseSuggestionReportRow,
        noDataMessage: 'Nenhum item precisa de reposição.',
        tableType: 'report'
    });
}

function createStockLevelReportRow(item) {
    const row = document.createElement('tr');
    if (item.status === 'BAIXO' || item.status === 'CRÍTICO' || item.status === 'ZERADO') {
        row.classList.add('stock-status-low');
    }
    row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.currentStock}</td>
        <td>${item.minStock}</td>
        <td>${item.status}</td>
    `;
    return row;
}

function renderStockLevelReport(reportData) {
    const container = document.getElementById('report-results');
    if (!container) return;
    if (!reportData || reportData.length === 0) {
        container.innerHTML = '<p>Nenhum item cadastrado para exibir.</p>';
        return;
    }
    container.innerHTML = `
        <div class="table-responsive">
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Estoque Atual</th>
                        <th>Estoque Mínimo</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="report-results-body"></tbody>
            </table>
        </div>
    `;
    renderPaginatedTable({
        containerId: 'report-results-body',
        paginationContainerId: 'report-pagination-container',
        data: reportData,
        renderRowFunction: createStockLevelReportRow,
        noDataMessage: 'Nenhum item cadastrado para exibir.',
        tableType: 'report'
    });
}

function createBatchValidityReportRow(batch) {
    const row = document.createElement('tr');
    const statusClass = batch.isExpired ? 'stock-status-critical' : (batch.daysRemaining <= 30 ? 'stock-status-low' : '');
    const daysText = batch.isExpired ? `Vencido há ${-batch.daysRemaining} dia(s)` : `${batch.daysRemaining} dia(s)`;
    row.className = statusClass;
    row.innerHTML = `
        <td>${batch.itemName}</td>
        <td>${batch.quantity}</td>
        <td>${new Date(batch.expiryDate).toLocaleDateString('pt-BR')}</td>
        <td>${daysText}</td>
    `;
    return row;
}

function renderBatchValidityReport(reportData) {
    const container = document.getElementById('report-results');
    if (!container) return;
    if (!reportData || reportData.length === 0) {
        container.innerHTML = '<p>Nenhum lote encontrado para análise de validade.</p>';
        return;
    }
    container.innerHTML = `
        <div class="table-responsive">
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantidade no Lote</th>
                        <th>Data de Validade</th>
                        <th>Status / Dias Restantes</th>
                    </tr>
                </thead>
                <tbody id="report-results-body"></tbody>
            </table>
        </div>
    `;
    renderPaginatedTable({
        containerId: 'report-results-body',
        paginationContainerId: 'report-pagination-container',
        data: reportData,
        renderRowFunction: createBatchValidityReportRow,
        noDataMessage: 'Nenhum lote para análise.',
        tableType: 'report'
    });
}


function openModal(modalId, setupFunction) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    lastFocusedElement = document.activeElement;
    if (setupFunction) setupFunction(modal);
    if (!modal.open) {
        modal.showModal();
    }
    const closeButtons = modal.querySelectorAll('[data-action^="cancel-"], [data-action^="close-"]');
    closeButtons.forEach(button => {
        button.removeEventListener('click', button._closeModalHandler);
        button._closeModalHandler = (event) => {
            event.preventDefault();
            closeModal(modalId);
        };
        button.addEventListener('click', button._closeModalHandler);
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && modal.open) {
        modal.close();
    }
}

function openItemFormModal(options = {}) {
    const {
        itemId = null, defaultValues = {}
    } = options;
    openModal(MODAL_IDS.ITEM_FORM, async (modal) => {
        const item = itemId ? getItemById(itemId) : null;
        const isEditing = !!item;
        const isKit = isEditing ? item.type === 'Kit' : false;

        const titleElement = modal.querySelector('#item-form-modal-title');
        titleElement.innerHTML = isEditing ?
            `<i class="fas fa-edit"></i> Editar ${item.name}` :
            `<i class="fas fa-plus"></i> Adicionar Novo Item`;

        const form = modal.querySelector('#item-form');
        form.reset();
        clearFormErrors(form);

        form.querySelector('[name="id"]').value = itemId || '';

        const settings = getSettings();
        const typeSelect = form.querySelector('#item-form-type');
        typeSelect.innerHTML = '<option value="" disabled selected>Selecione o tipo</option>' + settings.itemTypes.map(type => `<option value="${type}">${type}</option>`).join('');

        const stockInput = form.querySelector('#item-form-current-stock');
        const stockLabel = form.querySelector('#item-form-current-stock-label');
        const idDisplayGroup = form.querySelector('#item-form-id-display-group');
        const idDisplayInput = form.querySelector('#item-form-id-display');
        const imagePreview = form.querySelector('#item-form-image-preview');
        const imageUpload = form.querySelector('#item-form-image-upload');
        const shelfLifeGroup = form.querySelector('[data-group="item-form-shelfLife"]');

        imagePreview.src = 'icons/placeholder.png';
        if (isEditing && item.hasImage) {
            const imageUrl = await loadImage(item.id);
            if (imageUrl) imagePreview.src = imageUrl;
        }

        imagePreview.addEventListener('click', () => {
            imageUpload.click();
        });

        const updateLocationSuggestion = () => {
            const selectedType = typeSelect.value;
            if (selectedType) {
                const suggestedLocation = suggestLocation(selectedType);
                if (suggestedLocation) {
                    form.elements.aisle.value = suggestedLocation.aisle;
                    form.elements.shelf.value = suggestedLocation.shelf;
                    form.elements.box.value = suggestedLocation.box;
                }
            }
        };

        if (isEditing) {
            stockInput.disabled = true;
            stockLabel.textContent = isKit ? 'Estoque (calculado)' : 'Estoque Total (gerenciado em Lotes):';
            idDisplayGroup.style.display = 'block';
            idDisplayInput.value = item.id;
            form.elements.name.value = item.name;
            form.elements.barcode.value = item.barcode || '';
            form.elements.empresa.value = item.empresa || 'Weldingpro';
            form.elements.ca.value = item.ca || '';
            form.elements.almoxarifado.value = item.almoxarifado || 'equipamentos';
            form.elements.type.value = item.type;
            form.elements.unit.value = item.unit;
            stockInput.value = item.totalStock;
            form.elements.minStock.value = item.minStock;
            form.elements.maxStock.value = item.maxStock;
            form.elements.price.value = item.price;
            form.elements.shelfLifeDays.value = item.shelfLifeDays || 0;
            if (item.location) {
                form.elements.aisle.value = item.location.aisle;
                form.elements.shelf.value = item.location.shelf;
                form.elements.box.value = item.location.box;
            }
        } else {
            stockInput.disabled = false;
            stockLabel.textContent = 'Estoque Inicial:';
            idDisplayGroup.style.display = 'none';
            form.elements.barcode.value = '';
            const suggestedLocation = suggestLocation();
            if (suggestedLocation) {
                form.elements.aisle.value = suggestedLocation.aisle;
                form.elements.shelf.value = suggestedLocation.shelf;
                form.elements.box.value = suggestedLocation.box;
            }

            if (defaultValues.type) {
                typeSelect.value = defaultValues.type;
                typeSelect.dispatchEvent(new Event('change', {
                    bubbles: true
                }));
            }
        }

        const updateVisibilityAndLocation = () => {
            const selectedType = typeSelect.value;
            const isReturnable = settings.returnableTypes.includes(selectedType);
            const isKitType = selectedType === 'Kit';
            const statusGroup = form.querySelector('[data-group="item-form-status"]');

            stockInput.disabled = isEditing || isKitType;
            if (isKitType) {
                stockLabel.textContent = 'Estoque (calculado)';
                shelfLifeGroup.style.display = 'none';
                if (!isEditing) stockInput.value = 0;
            } else {
                stockLabel.textContent = isEditing ? 'Estoque Total (Lotes)' : 'Estoque Inicial:';
                shelfLifeGroup.style.display = 'block';
            }


            if (isReturnable) {
                statusGroup.style.display = 'block';
                form.elements.status.value = item ? item.status : 'Ativo';
            } else {
                statusGroup.style.display = 'none';
                form.elements.status.value = 'N/A';
            }
            if (!isEditing) {
                updateLocationSuggestion();
            }
        };

        typeSelect.removeEventListener('change', updateVisibilityAndLocation);
        typeSelect.addEventListener('change', updateVisibilityAndLocation);
        updateVisibilityAndLocation();

        imageUpload.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                if (file.size > 1024 * 1024) {
                    showToast("A imagem é muito grande! (Máx: 1MB)", "error");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        };

        const scanButton = form.querySelector('[data-action="scan-for-input"]');
        scanButton.removeEventListener('click', scanButton._scanHandler);
        scanButton._scanHandler = () => {
            openBarcodeActionModal('input', (scannedCode) => {
                const barcodeInput = document.getElementById('item-form-barcode');
                if (barcodeInput) {
                    barcodeInput.value = scannedCode;
                    showToast(`Código ${scannedCode} preenchido!`, 'success');
                }
            });
        };
        scanButton.addEventListener('click', scanButton._scanHandler);
    });
}

function renderKitItemsTable(kit, modal) {
    const tableBody = modal.querySelector('#kit-items-table-body');
    if (!tableBody) return;

    const allItems = getAllItems();
    const kitItems = kit.kitItems || [];

    if (kitItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nenhum item neste kit.</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    kitItems.forEach(kitItem => {
        const itemData = allItems.find(i => i.id === kitItem.id);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${itemData ? itemData.name : 'Item não encontrado'}</td>
            <td>${kitItem.quantity}</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-danger" data-action="remove-kit-item" data-kit-id="${kit.id}" data-component-id="${kitItem.id}" title="Remover Item do Kit">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        fragment.appendChild(row);
    });
    tableBody.appendChild(fragment);
}


function openKitManagementModal(kitId) {
    const kit = getItemById(kitId);
    if (!kit || kit.type !== 'Kit') {
        showToast("Item de kit inválido ou não encontrado.", "error");
        return;
    }

    openModal(MODAL_IDS.ITEM_KIT, (modal) => {
        modal.querySelector('#kit-modal-title').innerHTML = `<i class="fas fa-toolbox"></i> Gerenciar Kit: ${kit.name}`;
        modal.querySelector('#kit-item-id').value = kitId;

        const allItems = getAllItems().filter(item => item.id !== kitId && item.type !== 'Kit');
        const itemSelect = modal.querySelector('#kit-add-item-select');
        itemSelect.innerHTML = '<option value="">Selecione um item...</option>';
        allItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (Estoque: ${item.currentStock})`;
            itemSelect.appendChild(option);
        });

        renderKitItemsTable(kit, modal);
        modal.querySelector('#kit-item-add-form').reset();
    });
}



function openItemBatchesModal(itemId) {
    const item = getItemById(itemId);
    if (!item) {
        showToast("Item não encontrado.", "error");
        return;
    }
    if (!item.batches) {
        item.batches = [];
    }

    openModal(MODAL_IDS.ITEM_BATCHES, (modal) => {
        modal.querySelector('#item-batches-modal-title').innerHTML = `<i class="fas fa-boxes"></i> Lotes de ${item.name}`;
        modal.querySelector('#item-batches-item-id').value = itemId;
        renderBatchControlForm(item, modal);
    });
}

function openAdjustmentModal(itemId) {
    const item = getItemById(itemId);
    if (!item) {
        showToast("Item não encontrado para ajuste.", "error");
        return;
    }

    openModal(MODAL_IDS.ADJUSTMENT, (modal) => {
        const form = modal.querySelector('#adjustment-form');
        if (!form) return;

        form.reset();
        form.elements.itemId.value = itemId;

        const onLoanCount = item.onLoanCount || 0;
        const physicalStock = item.totalStock - onLoanCount;

        modal.querySelector('#adjustment-item-name').textContent = item.name;
        modal.querySelector('#adjustment-system-stock').textContent = `${physicalStock} (Total: ${item.totalStock} / Emprestado: ${onLoanCount})`;
        form.elements.physicalCount.value = physicalStock;

        const responsibleInput = form.querySelector('#adjustment-responsible');
        if (responsibleInput) {
            responsibleInput.value = "Almoxarifado";
        }

        const reasonGroup = modal.querySelector('#adjustment-reason-group');
        const reasonSelect = modal.querySelector('#adjustment-reason');
        const physicalCountInput = form.elements.physicalCount;

        let batchGroup = form.querySelector('#adjustment-batch-group');
        if (batchGroup) {
            batchGroup.innerHTML = '';
            batchGroup.style.display = 'none';
        } else {
            batchGroup = document.createElement('div');
            batchGroup.id = 'adjustment-batch-group';
            batchGroup.className = 'form-group';
            batchGroup.style.display = 'none';
            reasonGroup.parentNode.insertBefore(batchGroup, reasonGroup.nextSibling);
        }

        const updateFormOnCountChange = () => {
            const newCount = parseInt(physicalCountInput.value, 10);
            if (isNaN(newCount)) {
                reasonGroup.style.display = 'none';
                batchGroup.style.display = 'none';
                return;
            }

            const difference = newCount - physicalStock;

            if (difference !== 0) {
                reasonGroup.style.display = 'block';
                let options = '<option value="" disabled selected>Selecione o motivo...</option>';
                if (difference > 0) {
                    options += `
                        <option value="entry_no_reg">Entrada sem registro (item achado)</option>
                        <option value="return_no_reg">Devolução não registrada</option>
                        <option value="other_pos">Outro</option>
                    `;
                    batchGroup.innerHTML = `
                        <label for="adjustment-batch">Atribuir a qual lote?</label>
                        <select id="adjustment-batch" name="batchId" required></select>
                    `;
                    const batchSelect = batchGroup.querySelector('#adjustment-batch');
                    let batchOptions = '<option value="new">Criar novo lote para esta quantidade</option>';
                    (item.batches || []).forEach(batch => {
                        batchOptions += `<option value="${batch.batchId}">Lote de ${new Date(batch.purchaseDate).toLocaleDateString('pt-BR')} (Qtd: ${batch.quantity})</option>`;
                    });
                    batchSelect.innerHTML = batchOptions;
                    batchGroup.style.display = 'block';

                } else {
                    options += `
                        <option value="exit_no_reg">Saída sem registro (consumo)</option>
                        <option value="loss_damage">Perda ou dano no estoque</option>
                        <option value="other_neg">Outro</option>
                    `;
                    batchGroup.style.display = 'none';
                    batchGroup.innerHTML = '';
                }
                reasonSelect.innerHTML = options;
            } else {
                reasonGroup.style.display = 'none';
                batchGroup.style.display = 'none';
                batchGroup.innerHTML = '';
            }
        };

        physicalCountInput.removeEventListener('input', physicalCountInput._listener);
        physicalCountInput._listener = updateFormOnCountChange;
        physicalCountInput.addEventListener('input', physicalCountInput._listener);

        updateFormOnCountChange();
    });
}


function openItemHistoryModal(itemId) {
    const item = getItemById(itemId);
    if (!item) {
        showToast("Item não encontrado.", "error");
        return;
    }

    openModal(MODAL_IDS.ITEM_HISTORY, (modal) => {
        modal.querySelector('#item-history-modal-title').innerHTML = `<i class="fas fa-history"></i> Históricos de ${item.name}`;
        modal.querySelector('#item-history-item-id').value = itemId;

        renderHistoryContent(item?.history, modal);
        renderPriceHistoryContent(item?.priceHistory, modal);
        renderMaintenanceHistoryContent(item?.maintenanceHistory, modal);
    });
}

function openItemMaintenanceModal(itemId) {
    const item = getItemById(itemId);
    if (!item) {
        showToast("Item não encontrado para registrar manutenção.", "error");
        return;
    }

    openModal(MODAL_IDS.ITEM_MAINTENANCE, (modal) => {
        const titleElement = modal.querySelector('#item-maintenance-modal-title');
        if (!titleElement) {
            return;
        }
        titleElement.innerHTML = `<i class="fas fa-tools"></i> Manutenção de ${item.name}`;
        modal.querySelector('#item-maintenance-item-id').value = itemId;
        renderMaintenanceForm(item, modal);
    });
}

function renderHistoryContent(history, modal) {
    const container = modal.querySelector('#history-content');
    if (!container) {
        return;
    }

    if (!history || history.length === 0) {
        container.innerHTML = '<p>Nenhuma movimentação registrada.</p>';
    } else {
        const typeMap = {
            [ACTIONS.HISTORY_ENTRY]: 'Entrada',
            [ACTIONS.HISTORY_EXIT]: 'Saída',
            [ACTIONS.HISTORY_ADJUSTMENT]: 'Ajuste',
            [ACTIONS.HISTORY_LOAN]: 'Empréstimo',
            [ACTIONS.HISTORY_RETURN]: 'Devolução',
            [ACTIONS.HISTORY_LOSS]: 'Perda',
            [ACTIONS.HISTORY_DISCARD]: 'Descarte'
        };
        const rows = history.map(record => `<tr><td>${new Date(record.timestamp).toLocaleString('pt-BR')}</td><td>${typeMap[record.type] || record.type}</td><td>${record.quantity}</td><td>${record.responsible || 'N/A'}</td></tr>`).join('');
        container.innerHTML = `<div class="table-responsive"><table class="item-table"><thead><tr><th>Data</th><th>Tipo</th><th>Qtd.</th><th>Responsável</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
}

function renderPriceHistoryContent(priceHistory, modal) {
    const container = modal.querySelector('#price-history-content');
    if (!container) return;

    if (priceHistoryChart) {
        priceHistoryChart.destroy();
        priceHistoryChart = null;
    }

    if (!priceHistory || priceHistory.length < 2) {
        container.innerHTML = '<p>Não há dados de preço suficientes para exibir um gráfico.</p>';
        return;
    }

    const canvas = modal.querySelector('#price-history-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const sortedHistory = [...priceHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sortedHistory.map(record => new Date(record.date).toLocaleDateString('pt-BR'));
    const data = sortedHistory.map(record => record.price);

    const isDarkMode = document.body.classList.contains('dark');
    const textColor = isDarkMode ? '#c9d1d9' : '#212529';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const pointColor = isDarkMode ? '#0d6efd' : '#007bff';
    const lineColor = isDarkMode ? 'rgba(13, 110, 253, 0.5)' : 'rgba(0, 123, 255, 0.5)';

    priceHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Preço de Custo (R$)',
                data: data,
                fill: false,
                borderColor: pointColor,
                backgroundColor: lineColor,
                tension: 0.1,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: textColor,
                        callback: function (value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: 'transparent'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}


function renderMaintenanceHistoryContent(history, modal) {
    const container = modal.querySelector('#maintenance-history-content-view');
    if (!container) {
        return;
    }
    if (!history || history.length === 0) {
        container.innerHTML = '<p>Nenhum registro de manutenção.</p>';
        return;
    }
    const rows = history.sort((a, b) => new Date(b.date) - new Date(a.date)).map(record => `
        <tr>
            <td>${new Date(record.date).toLocaleDateString('pt-BR')}</td>
            <td>${record.description || 'N/A'}</td>
            <td>${record.responsible || 'N/A'}</td>
            <td>R$ ${record.cost.toFixed(2)}</td>
        </tr>
    `).join('');
    container.innerHTML = `<div class="table-responsive"><table class="item-table"><thead><tr><th>Data</th><th>Descrição</th><th>Responsável</th><th>Custo (R$)</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderMaintenanceForm(item, modal) {
    const form = modal.querySelector('#maintenance-form');
    if (!form) {
        return;
    }
    form.reset();
    form.elements.date.valueAsDate = new Date();
    form.elements.responsible.value = 'Almoxarifado';
    renderMaintenanceHistoryTable(item.maintenanceHistory, form);
}

function renderMaintenanceHistoryTable(history, form) {
    const tableBody = form.querySelector('#maintenance-history-table-body');
    if (!tableBody) {
        return;
    }
    if (!history || history.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum registro de manutenção.</td></tr>';
        return;
    }
    tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    history.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(record.date).toLocaleDateString('pt-BR')}</td>
            <td>${record.description || 'N/A'}</td>
            <td>${record.responsible || 'N/A'}</td>
            <td>R$ ${record.cost.toFixed(2)}</td>
        `;
        fragment.appendChild(row);
    });
    tableBody.appendChild(fragment);
}


function renderBatchControlForm(item, modal) {
    const form = modal.querySelector('#batch-form');
    if (!form) {
        return;
    }
    form.reset();
    form.elements.acquisitionDate.valueAsDate = new Date();
    form.elements.manufacturingDate.valueAsDate = new Date();
    form.elements.shelfLifeDays.value = item.shelfLifeDays || '';

    renderBatchesTable(item, form);
}

function renderBatchesTable(item, form) {
    const tableBody = form.querySelector('#batches-table-body');
    if (!tableBody) {
        return;
    }
    if (!item.batches || item.batches.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum lote registrado para este item.</td></tr>';
        return;
    }
    tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const now = new Date();
    item.batches.sort((a, b) => {
        const getExpiry = (batch) => {
            const baseDate = batch.manufacturingDate ? new Date(batch.manufacturingDate) : new Date(batch.purchaseDate);
            const shelfLife = batch.shelfLifeDays || item.shelfLifeDays || 0;
            if (isNaN(baseDate.getTime()) || shelfLife <= 0) return new Date('2999-12-31');
            const expiryDate = new Date(baseDate);
            expiryDate.setDate(expiryDate.getDate() + shelfLife);
            return expiryDate;
        };
        return getExpiry(a) - getExpiry(b);
    }).forEach(batch => {
        const row = document.createElement('tr');
        const batchShelfLife = batch.shelfLifeDays ?? item.shelfLifeDays ?? 0;

        const baseDateForExpiry = batch.manufacturingDate ? new Date(batch.manufacturingDate) : new Date(batch.purchaseDate);

        let expiryDateText = 'N/A';
        let daysRemainingText = 'N/A';
        let statusClass = '';
        if (baseDateForExpiry && !isNaN(baseDateForExpiry.getTime()) && batchShelfLife > 0) {
            const calculatedExpiryDate = new Date(baseDateForExpiry);
            calculatedExpiryDate.setDate(calculatedExpiryDate.getDate() + batchShelfLife);
            expiryDateText = calculatedExpiryDate.toLocaleDateString('pt-BR');
            const daysDiff = Math.ceil((calculatedExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 0) {
                daysRemainingText = `Vencido há ${-daysDiff} dia(s)`;
                statusClass = 'status-critical';
            } else if (daysDiff <= 30) {
                daysRemainingText = `${daysDiff} dia(s)`;
                statusClass = 'status-warning';
            } else {
                daysRemainingText = `${daysDiff} dia(s)`;
            }
        }
        row.className = statusClass;
        row.innerHTML = `
            <td>${batch.batchId.substring(batch.batchId.length - 8)}</td>
            <td>${batch.quantity}</td>
            <td>${new Date(batch.purchaseDate).toLocaleDateString('pt-BR')}</td>
            <td>${batch.manufacturingDate ? new Date(batch.manufacturingDate).toLocaleDateString('pt-BR') : 'N/A'}</td>
            <td>${expiryDateText}</td>
            <td>${daysRemainingText}</td>
            <td class="actions-cell">
                <button type="button" class="btn btn-sm btn-danger" data-action="delete-batch" data-item-id="${item.id}" data-batch-id="${batch.batchId}" title="Excluir Lote"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        fragment.appendChild(row);
    });
    tableBody.appendChild(fragment);
}


function openMovementModal(itemId) {
    const item = getItemById(itemId);
    if (!item) return;
    openModal(MODAL_IDS.MOVEMENT, (modal) => {
        const form = modal.querySelector('form');
        if (!form) {
            return;
        }
        form.reset();
        modal.querySelector('#movement-item-id').value = itemId;
        modal.querySelector('#movement-item-name').textContent = `${item.name} (Disponível: ${item.currentStock})`;
        modal.querySelector('#movement-quantity').max = item.currentStock;

        const settings = getSettings();
        const isReturnable = settings.returnableTypes.includes(item.type);
        modal.querySelector('#movement-modal-title').textContent = isReturnable ? 'Registrar Empréstimo' : 'Registrar Saída de Consumo';

        const collaboratorSelect = modal.querySelector('#movement-collaborator');
        if (collaboratorSelect) {
            collaboratorSelect.innerHTML = '<option value="" disabled selected>Selecione o colaborador...</option>' + getAllCollaborators().map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    });
}

function renderAllocationModalContent(item, modal) {
    const content = modal.querySelector('#allocations-content');
    if (!content) {
        return;
    }
    content.innerHTML = '';
    const currentItem = getItemById(item.id);
    if (!currentItem.allocations || currentItem.allocations.length === 0) {
        content.innerHTML = '<p>Nenhum item com colaborador no momento.</p>';
        return;
    }
    const rows = currentItem.allocations.map(alloc => {
        const collaboratorName = getCollaboratorById(alloc.collaboratorId)?.name || 'Colaborador desconhecido';
        return `
            <tr>
                <td>${alloc.quantity}</td>
                <td>${collaboratorName}</td>
                <td>${alloc.location}</td>
                <td>${new Date(alloc.date).toLocaleDateString('pt-BR')}</td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-success" data-action="${ACTIONS.RETURN_ALLOCATION}" data-id="${currentItem.id}" data-alloc-id="${alloc.id}" title="Devolver Item"><i class="fas fa-undo"></i></button>
                    <button class="btn btn-sm btn-danger" data-action="${ACTIONS.REGISTER_LOSS}" data-id="${currentItem.id}" data-alloc-id="${alloc.id}" title="Registrar Perda"><i class="fas fa-exclamation-triangle"></i></button>
                </td>
            </tr>`;
    }).join('');
    content.innerHTML = `<table class="item-table"><thead><tr><th>Qtd</th><th>Colaborador</th><th>Local/Obra</th><th>Data</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function openAllocationModal(item) {
    openModal(MODAL_IDS.ALLOCATION, (modal) => {
        modal.querySelector('h2').textContent = `Gerenciar Itens com Colaboradores: ${item.name}`;
        renderAllocationModalContent(item, modal);
    });
}

function openCollaboratorModal(collaborator = null) {
    openModal(MODAL_IDS.COLLABORATOR, (modal) => {
        const form = modal.querySelector('form');
        if (!form) {
            return;
        }
        form.reset();
        const collabIdInput = document.getElementById('collaborator-id');
        if (collabIdInput) collabIdInput.value = '';

        if (collaborator) {
            form.elements['collaborator-id'].value = collaborator.id;
            form.elements['collaborator-name'].value = collaborator.name;
            form.elements['collaborator-role'].value = collaborator.role;
            form.elements['collaborator-registration'].value = collaborator.registration;
        }
    });
}

function openReceiptGeneratorModal(collaboratorId) {
    const collaborator = getCollaboratorById(collaboratorId);
    if (!collaborator) {
        showToast("Colaborador não encontrado.", "error");
        return;
    }

    openModal(MODAL_IDS.RECEIPT_GENERATOR, (modal) => {
        modal.querySelector('#receipt-collaborator-id').value = collaboratorId;
        modal.querySelector('#receipt-collaborator-name').textContent = collaborator.name;

        const allItems = getAllItems();
        const allocatedItems = allItems.flatMap(item =>
            (item.allocations || [])
                .filter(alloc => alloc.collaboratorId === collaboratorId)
                .map(alloc => ({
                    ...item,
                    allocationDetails: alloc
                }))
        );

        const itemsListContainer = modal.querySelector('#receipt-items-list');
        if (allocatedItems.length > 0) {
            let itemsHtml = '<table class="item-table"><thead><tr><th><input type="checkbox" id="select-all-receipt-items"></th><th>Item</th><th>Qtd.</th><th>Data Alocação</th></tr></thead><tbody>';
            allocatedItems.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td><input type="checkbox" class="receipt-item-checkbox" name="selectedAllocations" value="${item.allocationDetails.id}"></td>
                        <td>${item.name} ${item.ca ? `(CA: ${item.ca})` : ''}</td>
                        <td>${item.allocationDetails.quantity}</td>
                        <td>${new Date(item.allocationDetails.date).toLocaleDateString('pt-BR')}</td>
                    </tr>
                `;
            });
            itemsHtml += '</tbody></table>';
            itemsListContainer.innerHTML = itemsHtml;

            const selectAllCheckbox = itemsListContainer.querySelector('#select-all-receipt-items');
            const itemCheckboxes = itemsListContainer.querySelectorAll('.receipt-item-checkbox');
            selectAllCheckbox.onchange = () => {
                itemCheckboxes.forEach(checkbox => {
                    checkbox.checked = selectAllCheckbox.checked;
                });
            };

        } else {
            itemsListContainer.innerHTML = '<p>Nenhum item alocado para este colaborador.</p>';
        }

        modal.querySelector('#receipt-link-container').style.display = 'none';
        modal.querySelector('#generate-receipt-link-btn').style.display = 'inline-flex';
    });
}

// ==================================================================
// == FUNÇÃO CORRIGIDA PARA BUSCAR E EXIBIR COMPROVANTES ==
// ==================================================================
async function openSignedReceiptsModal(collaboratorId) {
    const collaborator = getCollaboratorById(collaboratorId);
    if (!collaborator) {
        showToast("Colaborador não encontrado.", "error");
        return;
    }

    openModal(MODAL_IDS.SIGNED_RECEIPTS, async (modal) => {
        modal.querySelector('#signed-receipts-title').textContent = `Comprovantes de ${collaborator.name}`;
        const listContainer = modal.querySelector('#signed-receipts-list');
        listContainer.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><span>Buscando comprovantes...</span></div>`;

        // A constante API_BASE_URL deve ser definida globalmente ou importada
        const API_BASE_URL = 'http://localhost:3000/api';
        try {
            // 1. Busca TODOS os comprovantes da API
            const response = await fetch(`${API_BASE_URL}/receipts`);
            const allReceipts = await response.json();

            if (!response.ok) {
                throw new Error(allReceipts.error || 'Falha ao buscar comprovantes.');
            }

            // 2. Filtra os comprovantes no frontend para o colaborador específico
            const receipts = allReceipts.filter(receipt => receipt.collaborator_id === collaboratorId);

            if (receipts.length === 0) {
                listContainer.innerHTML = '<p>Nenhum comprovante assinado encontrado para este colaborador.</p>';
                return;
            }

            let tableHTML = `<table class="item-table"><thead><tr><th>Data Assinatura</th><th>Itens</th><th>Ações</th></tr></thead><tbody>`;
            receipts.forEach(receipt => {
                const itemsList = receipt.items.map(item => `<li>${item.quantity}x ${item.name} ${item.ca ? `(CA: ${item.ca})` : ''}</li>`).join('');
                tableHTML += `
                    <tr data-receipt-id="${receipt.id}">
                        <td>${new Date(receipt.created_at).toLocaleString('pt-BR')}</td>
                        <td><ul>${itemsList}</ul></td>
                        <td class="actions-cell">
                            <button class="btn btn-sm btn-info" data-action="${ACTIONS.PRINT_RECEIPT}" data-id="${receipt.id}" title="Imprimir Comprovante"><i class="fas fa-print"></i></button>
                        </td>
                    </tr>
                `;
            });
            tableHTML += `</tbody></table>`;
            listContainer.innerHTML = tableHTML;

        } catch (error) {
            listContainer.innerHTML = `<p class="error-message">Erro ao buscar comprovantes: ${error.message}</p>`;
        }
    });
}


function openServiceOrderModal(os = null) {
    openModal(MODAL_IDS.SERVICE_ORDER, (modal) => {
        const form = modal.querySelector('form');
        const title = modal.querySelector('#os-form-modal-title');
        form.reset();
        clearFormErrors(form);

        const isEditing = !!os;
        title.innerHTML = isEditing ? `<i class="fas fa-edit"></i> Editar O.S. ${os.id}` : `<i class="fas fa-plus"></i> Abrir Nova O.S.`;

        form.elements['os-id'].value = os ? os.id : '';

        const technicianSelect = form.elements['os-technician'];
        technicianSelect.innerHTML = '<option value="">Selecione um técnico...</option>' +
            getAllCollaborators().map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        if (isEditing) {
            form.elements.customer.value = os.customer;
            form.elements.technicianId.value = os.technicianId;
            form.elements.description.value = os.description;
            form.elements.status.value = os.status;
        }
    });
}

function renderServiceOrderItemsTable(os, modal) {
    const tableBody = modal.querySelector('#os-items-table-body');
    if (!tableBody) return;

    const allItems = getAllItems();
    const osItems = os.items || [];

    if (osItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum item alocado para esta O.S.</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    osItems.forEach(osItem => {
        const itemData = allItems.find(i => i.id === osItem.itemId);
        const row = document.createElement('tr');
        const isReturnable = itemData && (getSettings().returnableTypes.includes(itemData.type) || itemData.type === 'Kit');

        let actionsHTML = '';
        if (isReturnable && !osItem.returned) {
            actionsHTML = `<button class="btn btn-sm btn-success" data-action="${ACTIONS.RETURN_ITEM_FROM_OS}" data-os-id="${os.id}" data-alloc-id="${osItem.allocationId}" title="Devolver ao Estoque"><i class="fas fa-undo"></i></button>`;
        } else {
            actionsHTML = ``;
        }

        row.innerHTML = `
            <td>${itemData ? itemData.name : 'Item não encontrado'}</td>
            <td><span class="status-badge">${itemData ? itemData.type : 'N/A'}</span></td>
            <td>${osItem.quantity}</td>
            <td>${osItem.returned ? '<span class="status-badge status-success">Devolvido</span>' : '<span class="status-badge status-warning">Pendente</span>'}</td>
            <td class="actions-cell">${actionsHTML}</td>
        `;
        fragment.appendChild(row);
    });
    tableBody.appendChild(fragment);
}


function openServiceOrderDetailsModal(osId) {
    const os = getServiceOrderById(osId);
    if (!os) {
        showToast("Ordem de Serviço não encontrada.", "error");
        return;
    }

    openModal(MODAL_IDS.SERVICE_ORDER_DETAILS, (modal) => {
        modal.querySelector('#os-details-modal-title').innerHTML = `<i class="fas fa-file-signature"></i> Detalhes da O.S. ${os.id}`;
        modal.querySelector('#os-details-id').value = osId;

        const technicianName = getCollaboratorById(os.technicianId)?.name || 'Não definido';
        const infoCard = modal.querySelector('#os-details-info-card');
        infoCard.innerHTML = `
            <p><strong>Cliente:</strong> ${os.customer}</p>
            <p><strong>Técnico:</strong> ${technicianName}</p>
            <p><strong>Abertura:</strong> ${new Date(os.openDate).toLocaleString('pt-BR')}</p>
            <p><strong>Status:</strong> ${os.status}</p>
        `;

        const allItems = getAllItems();
        const costCard = modal.querySelector('#os-details-cost-card');
        const totalCost = (os.items || [])
            .filter(osItem => !osItem.returned)
            .reduce((sum, osItem) => {
                const itemData = allItems.find(i => i.id === osItem.itemId);
                return sum + (itemData ? (itemData.price || 0) * osItem.quantity : 0);
            }, 0);
        costCard.innerHTML = `<p><strong>Custo Total de Materiais:</strong></p><h2>R$ ${totalCost.toFixed(2)}</h2>`;

        const itemSelect = modal.querySelector('#os-item-select');
        const availableItems = allItems.filter(item => item.currentStock > 0);
        itemSelect.innerHTML = '<option value="">Selecione um item...</option>' +
            availableItems.map(item => `<option value="${item.id}">${item.name} (Estoque: ${item.currentStock})</option>`).join('');

        renderServiceOrderItemsTable(os, modal);
        modal.querySelector('#os-add-item-form').reset();

        const tableBody = modal.querySelector('#os-items-table-body');
        tableBody.removeEventListener('click', tableBody._osItemClickHandler);
        tableBody._osItemClickHandler = (event) => {
            const button = event.target.closest('button');
            if (button && button.dataset.action === ACTIONS.RETURN_ITEM_FROM_OS) {
                const osId = button.dataset.osId;
                const allocId = button.dataset.allocId;
                if (returnItemToStockFromOS(osId, allocId)) {
                    document.body.dispatchEvent(new CustomEvent('dataChanged'));
                    openServiceOrderDetailsModal(osId);
                }
            }
        };
        tableBody.addEventListener('click', tableBody._osItemClickHandler);
    });
}

function openLossRegistrationModal(itemId, allocationId) {
    const item = getItemById(itemId);
    const allocation = item?.allocations.find(a => a.id === allocationId);
    if (!item || !allocation) {
        showToast('Erro ao encontrar item ou registro de empréstimo.', 'error');
        return;
    }
    openModal(MODAL_IDS.LOSS_REGISTRATION, (modal) => {
        const form = modal.querySelector('form');
        if (!form) {
            return;
        }
        form.reset();
        const collaboratorName = getCollaboratorById(allocation.collaboratorId)?.name || 'Desconhecido';
        const debitValue = calculateDebitValue(item, allocation);
        modal.querySelector('#loss-item-id').value = itemId;
        modal.querySelector('#loss-allocation-id').value = allocationId;
        const infoBox = modal.querySelector('#loss-info-box');
        if (infoBox) {
            infoBox.innerHTML = `
                <p><strong>Item:</strong> ${item.name}</p>
                <p><strong>Colaborador:</strong> ${collaboratorName}</p>
                <p><strong>Quantidade perdida:</strong> ${allocation.quantity}</p>
                <p><strong>Valor do Débito a ser gerado:</strong> R$ ${debitValue.toFixed(2)}</p>
            `;
        }
    });
}

function openDirectLossModal(itemId) {
    const item = getItemById(itemId);
    if (!item) {
        showToast("Item não encontrado para registrar perda direta.", "error");
        return;
    }
    openModal(MODAL_IDS.DIRECT_LOSS, (modal) => {
        const form = modal.querySelector('form');
        if (!form) {
            return;
        }
        form.reset();
        modal.querySelector('#direct-loss-item-id').value = item.id;
        modal.querySelector('#direct-loss-item-name').textContent = item.name;
        modal.querySelector('#direct-loss-item-stock').textContent = item.totalStock !== undefined ? item.totalStock : '0';
        modal.querySelector('#direct-loss-quantity').max = item.totalStock;
        modal.querySelector('#direct-loss-responsible').value = 'Almoxarifado';
        const collaboratorSelect = modal.querySelector('#direct-loss-collaborator');
        if (collaboratorSelect) {
            collaboratorSelect.innerHTML = '<option value="">Nenhum (Perda geral/Sem débito específico)</option>' + getAllCollaborators().map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    });
}

function openConfirmationModal(options) {
    const {
        title,
        message,
        onConfirm,
        showConfirmButton = true,
        confirmButtonText = 'Confirmar',
        cancelButtonText = 'Cancelar',
        details
    } = options;

    openModal(MODAL_IDS.CONFIRMATION, (modal) => {
        modal.querySelector('#confirmation-title').textContent = title;
        let messageHtml = message.replace(/\n/g, '<br>');

        if (details) {
            if (details.customHTML) {
                messageHtml += details.customHTML;
            }
            if (details.addedCount > 0) {
                messageHtml += `<h6>Adicionados (${details.addedCount}):</h6><ul class="feedback-list">`;
                details.addedNames.forEach(name => {
                    messageHtml += `<li><i class="fas fa-check-circle success"></i> ${name}</li>`;
                });
                messageHtml += '</ul>';
            }
            if (details.ignoredCount > 0) {
                messageHtml += `<h6>Ignorados (${details.ignoredCount}):</h6><ul class="feedback-list">`;
                details.ignoredNames.forEach(name => {
                    messageHtml += `<li><i class="fas fa-times-circle danger"></i> ${name}</li>`;
                });
                messageHtml += '</ul>';
            }
        }

        modal.querySelector('#confirmation-message').innerHTML = messageHtml;

        const confirmBtn = modal.querySelector('#confirm-action-btn');
        const cancelBtn = modal.querySelector('[data-action="cancel-confirmation"]');

        confirmBtn.textContent = confirmButtonText;
        cancelBtn.textContent = cancelButtonText;

        if (confirmBtn) {
            confirmBtn.style.display = showConfirmButton ? 'inline-flex' : 'none';
            if (onConfirm) {
                const newConfirmBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                newConfirmBtn.addEventListener('click', onConfirm, {
                    once: true
                });
            }
        }
    });
}


function openQuickEntryModal(actionType, itemId, quantity = null) {
    const item = getItemById(itemId);
    if (!item) return;
    openModal(MODAL_IDS.QUICK_ENTRY, (modal) => {
        const form = modal.querySelector('form');
        if (!form) {
            return;
        }
        form.reset();
        const title = modal.querySelector('#quick-entry-modal-title');
        const quantityLabel = modal.querySelector('#quick-entry-quantity-label');
        const responsibleContainer = modal.querySelector('#quick-entry-responsible-container');
        const submitBtn = modal.querySelector('#quick-entry-submit-btn');
        const itemNameEl = modal.querySelector('#quick-entry-item-name');

        if (title) title.textContent = 'Entrada Rápida';
        if (itemNameEl) itemNameEl.textContent = item.name;

        form.elements['item-id'].value = itemId;
        form.elements['action-type'].value = actionType;

        if (action === ACTIONS.QUICK_ADD_STOCK) {
            if (title) title.textContent = 'Entrada Rápida de Estoque';
            if (quantityLabel) quantityLabel.textContent = 'Quantidade que chegou:';
            if (responsibleContainer) responsibleContainer.style.display = 'block';
            if (submitBtn) {
                submitBtn.textContent = 'Adicionar Estoque';
                submitBtn.className = 'btn btn-success';
            }
        } else if (action === ACTIONS.REPLACE_ITEM) {
            if (title) title.textContent = 'Substituir Item Vencido';
            if (quantityLabel) quantityLabel.textContent = `Quantidade a ser substituída (vencido: ${quantity}):`;
            if (form.elements['quantity']) form.elements['quantity'].value = quantity;
            if (responsibleContainer) responsibleContainer.style.display = 'none';
            if (submitBtn) {
                submitBtn.textContent = 'Confirmar Substituição';
                submitBtn.className = 'btn btn-danger';
            }
        }
    });
}

function openMassAddModal(options = {}) {
    const { kitId = null } = options;
    openModal(MODAL_IDS.MASS_ADD, (modal) => {
        modal.querySelector('#mass-add-data').value = '';
        let kitIdInput = modal.querySelector('#mass-add-kit-id');
        if (!kitIdInput) {
            kitIdInput = document.createElement('input');
            kitIdInput.type = 'hidden';
            kitIdInput.id = 'mass-add-kit-id';
            kitIdInput.name = 'kitId';
            modal.querySelector('form').appendChild(kitIdInput);
        }
        kitIdInput.value = kitId || '';
    });
}


function openMassAddCollaboratorModal() {
    openModal(MODAL_IDS.MASS_ADD_COLLABORATOR, (modal) => {
        modal.querySelector('#mass-add-collaborator-data').value = '';
    });
}


function openBarcodeActionModal(mode = 'action', onScanComplete = null) {
    openModal(MODAL_IDS.BARCODE_ACTION, (modal) => {
        const title = modal.querySelector('#barcode-action-title');
        const initialView = modal.querySelector('#barcode-initial-view');
        const cameraView = modal.querySelector('#barcode-camera-view');
        const loadingView = modal.querySelector('#barcode-loading-view');
        const actionSection = modal.querySelector('#barcode-action-section');
        const feedback = modal.querySelector('#barcode-scan-feedback');

        const input = modal.querySelector('#barcode-input');
        const video = modal.querySelector('#camera-video');
        const cameraSelect = modal.querySelector('#camera-select');
        const itemNameEl = modal.querySelector('#barcode-item-name');

        let codeReader = new ZXing.BrowserMultiFormatReader();
        let currentItem = null;
        let selectedDeviceId;

        const resetScanner = () => {
            codeReader.reset();
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
        };

        const showView = (viewToShow) => {
            [initialView, cameraView, loadingView, actionSection, feedback].forEach(v => v.style.display = 'none');
            viewToShow.style.display = 'block';
            if (viewToShow === feedback) {
                setTimeout(() => {
                    if (cameraView.style.display === 'none' && actionSection.style.display === 'none') {
                        initialView.style.display = 'block';
                        feedback.style.display = 'none';
                    }
                }, 2500);
            }
        };

        const resetModalState = () => {
            resetScanner();
            showView(initialView);
            input.value = '';
            currentItem = null;
            setTimeout(() => input.focus(), 150);
        };

        modal.addEventListener('close', resetScanner, {
            once: true
        });

        const processBarcode = (barcode) => {
            if (!barcode) return;

            if (mode === 'input') {
                if (onScanComplete) {
                    onScanComplete(barcode);
                }
                closeModal(MODAL_IDS.BARCODE_ACTION);
                return;
            }

            showView(loadingView);

            setTimeout(() => {
                const item = getItemByBarcode(barcode);
                currentItem = item;
                resetScanner();

                if (item) {
                    itemNameEl.textContent = item.name;
                    showView(actionSection);
                    createLog('BARCODE_SCAN_SUCCESS', `Código de barras ${barcode} processado. Item: ${item.name}`, 'Usuário');
                } else {
                    feedback.textContent = `Nenhum item encontrado para o código de barras "${barcode}".`;
                    showView(feedback);
                    input.select();
                    currentItem = null;
                    createLog('BARCODE_SCAN_FAIL', `Código de barras ${barcode} processado, mas nenhum item foi encontrado.`, 'Usuário');
                }
            }, 500);
        };

        const startCameraScan = async () => {
            showView(cameraView);
            try {
                const videoInputDevices = await codeReader.listVideoInputDevices();
                if (videoInputDevices.length > 0) {
                    cameraSelect.innerHTML = videoInputDevices.map(device => `<option value="${device.deviceId}">${device.label}</option>`).join('');
                    selectedDeviceId = videoInputDevices[0].deviceId;
                    cameraSelect.onchange = () => {
                        selectedDeviceId = cameraSelect.value;
                        startScanning();
                    };
                    startScanning();
                } else {
                    feedback.textContent = 'Nenhuma câmera encontrada.';
                    showView(feedback);
                }
            } catch (err) {
                feedback.textContent = 'Erro ao acessar dispositivos de câmera.';
                showView(feedback);
            }
        };

        const startScanning = () => {
            resetScanner();
            codeReader.decodeFromVideoDevice(selectedDeviceId, video, (result, err) => {
                if (result) {
                    processBarcode(result.text);
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error(err);
                    feedback.textContent = `Erro ao escanear: ${err}`;
                    showView(feedback);
                }
            }).catch(err => {
                feedback.textContent = 'Não foi possível acessar a câmera. Verifique as permissões.';
                showView(feedback);
            });
        };

        const modalClickHandler = (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const action = button.dataset.action;
            switch (action) {
                case 'process-barcode-manual':
                    processBarcode(input.value.trim());
                    break;
                case 'scan-with-camera':
                    startCameraScan();
                    break;
                case 'stop-camera-scan':
                    resetModalState();
                    break;
                case 'exit':
                case 'adjust-stock':
                case 'edit-item-batches':
                case 'view-item-history':
                    if (currentItem) {
                        closeModal(MODAL_IDS.BARCODE_ACTION);
                        setTimeout(() => {
                            const actionMap = {
                                'exit': () => openMovementModal(currentItem.id),
                                'adjust-stock': () => openAdjustmentModal(currentItem.id),
                                'edit-item-batches': () => openItemBatchesModal(currentItem.id),
                                'view-item-history': () => openItemHistoryModal(currentItem.id)
                            };
                            actionMap[action]();
                        }, 150);
                    }
                    break;
            }
        };

        input.onkeydown = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                processBarcode(input.value.trim());
            }
        };

        modal.removeEventListener('click', modal._clickHandler);
        modal._clickHandler = modalClickHandler;
        modal.addEventListener('click', modal._clickHandler);

        if (mode === 'input') {
            title.innerHTML = `<i class="fas fa-barcode"></i> Escanear Código para Cadastro`;
            modal.querySelector('[data-action="process-barcode-manual"]').style.display = 'none';
        } else {
            title.innerHTML = `<i class="fas fa-search"></i> Buscar Item por Código`;
            modal.querySelector('[data-action="process-barcode-manual"]').style.display = 'inline-flex';
        }

        resetModalState();
    });
}

function openLabelPrintModal(itemId) {
    const item = getItemById(itemId);
    if (!item) {
        showToast("Item não encontrado.", "error");
        return;
    }
    if (!item.barcode || item.barcode.trim() === '') {
        showToast(`O item "${item.name}" não possui um código de barras cadastrado.`, "error");
        return;
    }

    openModal(MODAL_IDS.LABEL_PRINT, (modal) => {
        const contentArea = modal.querySelector('#label-content-area');
        contentArea.innerHTML = `
            <div id="label-to-print" style="padding: 10px; border: 1px solid #ccc; background: white; color: black; text-align: center; width: 250px;">
                <p style="font-weight: bold; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase;">${item.name}</p>
                <svg id="barcode-svg"></svg>
            </div>
        `;
        JsBarcode("#barcode-svg", item.barcode, {
            format: "CODE128",
            lineColor: "#000",
            width: 2,
            height: 40,
            displayValue: true
        });

        modal.querySelector('[data-action="print-label"]').onclick = () => {
            const labelContent = document.getElementById('label-to-print');
            const printWindow = window.open('', '_blank');
            printWindow.document.write('<html><head><title>Imprimir Etiqueta</title>');
            printWindow.document.write('<style>body { margin: 0; padding: 0; } @page { size: auto; margin: 5mm; }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(labelContent.outerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
            createLog('PRINT_LABEL', `Impressão da etiqueta para o item ${item.name} iniciada.`, 'Usuário');
        };
    });
}

function renderPredictiveCards(containerId, predictiveData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const settings = getSettings();
    const {
        critical,
        warning
    } = settings.predictiveAlertLevels;

    const renderCardGrid = (data, fragment) => {
        data.forEach(item => {
            let statusClass = 'status-ok';
            let cardContent = '';

            if (item.predictionType === 'consumption') {
                if (item.daysOfStockLeft <= critical) statusClass = 'status-critical';
                else if (item.daysOfStockLeft <= warning) statusClass = 'status-warning';
                const daysText = item.daysOfStockLeft === Infinity ? '∞' : item.daysOfStockLeft;
                cardContent = `
                    <h4>${item.name}</h4>
                    <div class="predictive-data ${statusClass}">
                        <i class="fas fa-hourglass-half"></i>
                        <span>Estoque para <strong>${daysText}</strong> dias</span>
                    </div>
                    <div class="predictive-data">
                        <i class="fas fa-chart-bar"></i>
                        <span>Consumo mensal: <strong>${item.projectedMonthlyConsumption}</strong> un.</span>
                    </div>`;
            } else if (item.predictionType === 'lifecycle') {
                if (item.remainingDays <= critical) statusClass = 'status-critical';
                else if (item.remainingDays <= warning) statusClass = 'status-warning';
                let daysText = `Substituir em <strong>${item.remainingDays}</strong> dias`;
                if (item.remainingDays <= 0) {
                    daysText = `<strong>Vencido!</strong> Substituição necessária.`;
                }
                cardContent = `
                    <h4>${item.name}</h4>
                    <div class="predictive-data ${statusClass}">
                        <i class="fas fa-recycle"></i>
                        <span>${daysText}</span>
                    </div>
                    <div class="predictive-data">
                        <i class="fas fa-calendar-check"></i>
                        <span>Data final: <strong>${new Date(item.expiryDate).toLocaleDateString('pt-BR')}</strong></span>
                    </div>`;
            } else if (item.predictionType === 'maintenance') {
                if (item.remainingDays <= critical) statusClass = 'status-critical';
                else if (item.remainingDays <= warning) statusClass = 'status-warning';
                let daysText = `Próxima em <strong>${item.remainingDays}</strong> dias`;
                if (item.remainingDays <= 0) {
                    daysText = `<strong>Manutenção Vencida!</strong>`;
                }
                cardContent = `
                    <h4>${item.name}</h4>
                    <div class="predictive-data ${statusClass}">
                        <i class="fas fa-tools"></i>
                        <span>${daysText}</span>
                    </div>
                    <div class="predictive-data">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Última: <strong>${item.lastMaintenanceDate ? new Date(item.lastMaintenanceDate).toLocaleDateString('pt-BR') : 'N/A'}</strong></span>
                    </div>`;
            }

            const card = document.createElement('div');
            card.className = `predictive-card ${statusClass}`;
            card.innerHTML = cardContent;
            fragment.appendChild(card);
        });
    };

    renderPaginatedTable({
        containerId: containerId,
        paginationContainerId: `${containerId.replace('-predictive-container', '')}-pagination-container`,
        data: predictiveData,
        renderGridFunction: renderCardGrid,
        noDataMessage: 'Nenhuma análise preditiva para esta visão.',
        tableType: containerId.replace('-predictive-container', '')
    });
}


function createLogRow(log) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${new Date(log.timestamp).toLocaleString('pt-BR')}</td>
        <td>${log.action}</td>
        <td>${log.details}</td>
        <td>${log.user}</td>
    `;
    return row;
}

function renderLogsTable(logs, searchTerm = '') {
    renderPaginatedTable({
        containerId: 'logs-table-body',
        paginationContainerId: 'log-pagination-container',
        data: logs,
        renderRowFunction: createLogRow,
        noDataMessage: searchTerm ? `Nenhum log encontrado para "${searchTerm}".` : 'Nenhum log de atividade registrado.',
        tableType: 'log'
    });
}


function openSettingsModal() {
    openModal(MODAL_IDS.SETTINGS, () => {
        renderSettingsPage(getSettings());
    });
}

function openCollaboratorDashboardModal(collaboratorId) {
    const collaborator = getCollaboratorById(collaboratorId);
    if (!collaborator) {
        showToast("Colaborador não encontrado.", "error");
        return;
    }

    openModal(MODAL_IDS.COLLABORATOR_DASHBOARD, (modal) => {
        modal.querySelector('#collaborator-dashboard-title').innerHTML = `<i class="fas fa-user"></i> Dashboard de ${collaborator.name}`;

        const summaryContainer = modal.querySelector('#collaborator-dashboard-summary');
        const itemsContainer = modal.querySelector('#collaborator-dashboard-items');
        const debitsContainer = modal.querySelector('#collaborator-dashboard-debits');

        const allItems = getAllItems();
        const allocatedItems = allItems.flatMap(item =>
            (item.allocations || [])
                .filter(alloc => alloc.collaboratorId === collaboratorId)
                .map(alloc => ({
                    ...item,
                    allocationDetails: alloc
                }))
        );

        const allDebits = getAllDebits();
        const pendingDebits = allDebits.filter(debit => debit.collaboratorId === collaboratorId && !debit.isSettled);
        const totalDebitValue = pendingDebits.reduce((sum, debit) => sum + debit.amount, 0);

        summaryContainer.innerHTML = `
            <div class="info-card">
                <p><strong>Itens Alocados:</strong></p>
                <h2>${allocatedItems.length}</h2>
            </div>
            <div class="info-card">
                <p><strong>Débitos Pendentes:</strong></p>
                <h2 class="${totalDebitValue > 0 ? 'danger-text' : ''}">R$ ${totalDebitValue.toFixed(2)}</h2>
            </div>
        `;

        if (allocatedItems.length > 0) {
            let itemsHtml = '<table class="item-table"><thead><tr><th>Item</th><th>Qtd.</th><th>Data Alocação</th><th>Local/Obra</th></tr></thead><tbody>';
            allocatedItems.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.allocationDetails.quantity}</td>
                        <td>${new Date(item.allocationDetails.date).toLocaleDateString('pt-BR')}</td>
                        <td>${item.allocationDetails.location || 'N/A'}</td>
                    </tr>
                `;
            });
            itemsHtml += '</tbody></table>';
            itemsContainer.innerHTML = itemsHtml;
        } else {
            itemsContainer.innerHTML = '<p>Nenhum item alocado para este colaborador.</p>';
        }

        if (pendingDebits.length > 0) {
            let debitsHtml = '<table class="item-table"><thead><tr><th>Item</th><th>Valor (R$)</th><th>Data</th><th>Motivo</th></tr></thead><tbody>';
            pendingDebits.forEach(debit => {
                debitsHtml += `
                    <tr>
                        <td>${debit.itemName}</td>
                        <td>R$ ${debit.amount.toFixed(2)}</td>
                        <td>${new Date(debit.date).toLocaleDateString('pt-BR')}</td>
                        <td>${debit.reason}</td>
                    </tr>
                `;
            });
            debitsHtml += '</tbody></table>';
            debitsContainer.innerHTML = debitsHtml;
        } else {
            debitsContainer.innerHTML = '<p>Nenhum débito pendente para este colaborador.</p>';
        }
    });
}

function showFormErrors(form, errors) {
    clearFormErrors(form);
    errors.forEach(error => {
        const field = form.querySelector(`[name="${error.field}"]`);
        if (field) {
            field.classList.add('is-invalid');
            let errorElement = field.nextElementSibling;
            if (errorElement && errorElement.classList.contains('form-error-message')) {
                errorElement.textContent = error.message;
            } else {
                errorElement = document.createElement('div');
                errorElement.className = 'form-error-message';
                errorElement.textContent = error.message;
                field.parentNode.insertBefore(errorElement, field.nextSibling);
            }
        }
    });
    if (errors.length > 0) {
        showToast(errors[0].message, 'error');
    }
}

function clearFormErrors(form) {
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.form-error-message').forEach(el => el.remove());
}

function checkBackupReminder() {
    const settings = getSettings();
    if (!settings.backupReminder) return;

    const {
        lastBackupDate,
        frequencyDays
    } = settings.backupReminder;

    if (!lastBackupDate) {
        openConfirmationModal({
            title: 'Lembrete de Backup',
            message: 'Você ainda não fez nenhum backup. É altamente recomendável fazer um agora para garantir a segurança dos seus dados.',
            onConfirm: () => {
                backupData();
                closeModal(MODAL_IDS.CONFIRMATION);
            }
        });
        return;
    }

    const lastBackup = new Date(lastBackupDate);
    const today = new Date();
    const daysSinceLastBackup = Math.floor((today.getTime() - lastBackup.getTime()) / (1000 * 3600 * 24));

    if (daysSinceLastBackup >= frequencyDays) {
        openConfirmationModal({
            title: 'Lembrete de Backup',
            message: `Já se passaram ${daysSinceLastBackup} dia(s) desde o seu último backup. Que tal fazer um agora?`,
            onConfirm: () => {
                backupData();
                closeModal(MODAL_IDS.CONFIRMATION);
            }
        });
    }
}

function openKitReturnModal(kitId, allocationId) {
    const kit = getItemById(kitId);
    const allocation = kit?.allocations.find(a => a.id === allocationId);

    if (!kit || !allocation) {
        showToast('Erro ao encontrar kit ou alocação para devolução.', 'error');
        return;
    }

    openModal(MODAL_IDS.KIT_RETURN, (modal) => {
        const form = modal.querySelector('#kit-return-form');
        form.reset();

        modal.querySelector('#kit-return-kit-id').value = kitId;
        modal.querySelector('#kit-return-allocation-id').value = allocationId;

        const initialView = modal.querySelector('#kit-return-initial-view');
        const detailsView = modal.querySelector('#kit-return-details-view');
        const submitBtn = modal.querySelector('#kit-return-submit-btn');

        initialView.style.display = 'block';
        detailsView.style.display = 'none';
        submitBtn.style.display = 'none';

        const collaboratorName = getCollaboratorById(allocation.collaboratorId)?.name || 'Desconhecido';
        modal.querySelector('#kit-return-info').innerHTML = `
            <p><strong>Kit:</strong> ${kit.name}</p>
            <p><strong>Colaborador:</strong> ${collaboratorName}</p>
            <p><strong>Quantidade Emprestada:</strong> ${allocation.quantity}</p>
        `;

        const allItems = getAllItems();
        let totalDebit = 0;

        const updateTotalDebit = () => {
            totalDebit = 0;
            const inputs = detailsView.querySelectorAll('input[name="loss_quantity"]');
            inputs.forEach(input => {
                const componentId = input.dataset.componentId;
                const lossQty = parseInt(input.value, 10) || 0;
                const componentItem = allItems.find(i => i.id === componentId);
                if (componentItem && lossQty > 0) {
                    totalDebit += lossQty * (componentItem.price || 0);
                }
            });
            modal.querySelector('#kit-return-total-debit').textContent = `Débito Total a ser Gerado: R$ ${totalDebit.toFixed(2)}`;
        };

        const itemsListContainer = modal.querySelector('#kit-return-items-list');
        let itemsHtml = '<table class="item-table"><thead><tr><th>Componente</th><th>Qtd. Esperada</th><th>Qtd. Faltante</th><th>Subtotal Débito</th></tr></thead><tbody>';

        kit.kitItems.forEach(component => {
            const componentItem = allItems.find(i => i.id === component.id);
            const expectedQuantity = component.quantity * allocation.quantity;
            itemsHtml += `
                <tr>
                    <td>${componentItem ? componentItem.name : 'Item não encontrado'}</td>
                    <td>${expectedQuantity}</td>
                    <td>
                        <div class="form-group" style="margin-bottom: 0;">
                            <input type="number" class="form-control" name="loss_quantity" data-component-id="${component.id}" value="0" min="0" max="${expectedQuantity}" required>
                        </div>
                    </td>
                    <td id="debit-subtotal-${component.id}">R$ 0,00</td>
                </tr>
            `;
        });
        itemsHtml += '</tbody></table>';
        itemsListContainer.innerHTML = itemsHtml;

        detailsView.addEventListener('input', (event) => {
            if (event.target.name === 'loss_quantity') {
                const componentId = event.target.dataset.componentId;
                const lossQty = parseInt(event.target.value, 10) || 0;
                const componentItem = allItems.find(i => i.id === componentId);
                const subtotal = lossQty * (componentItem?.price || 0);
                document.getElementById(`debit-subtotal-${component.id}`).textContent = `R$ ${subtotal.toFixed(2)}`;
                updateTotalDebit();
            }
        });

        modal.querySelector('[data-action="kit-return-complete"]').onclick = () => {
            if (returnAllocation(kitId, allocationId, null)) {
                showToast("Devolução completa do kit processada com sucesso!", "success");
                closeModal(MODAL_IDS.ALLOCATION);
                closeModal(MODAL_IDS.KIT_RETURN);
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            }
        };

        modal.querySelector('[data-action="kit-return-with-loss"]').onclick = () => {
            initialView.style.display = 'none';
            detailsView.style.display = 'block';
            submitBtn.style.display = 'inline-flex';
            updateTotalDebit();
        };
    });
}
function createPriceHistoryReportRow(record) {
    const row = document.createElement('tr');
    const variation = record.variation || 0;
    const variationClass = variation > 0 ? 'positive-variation' : (variation < 0 ? 'negative-variation' : '');
    const variationText = variation.toFixed(2);
    const variationSign = variation > 0 ? '+' : '';

    row.innerHTML = `
        <td>${new Date(record.date).toLocaleDateString('pt-BR')}</td>
        <td>${record.itemName}</td>
        <td>R$ ${record.price.toFixed(2)}</td>
        <td class="${variationClass}">${variationSign}${variationText}%</td>
    `;
    return row;
}

function renderPriceHistoryReport(reportData) {
    const container = document.getElementById('report-results');
    if (!container) return;
    if (!reportData || reportData.length === 0) {
        container.innerHTML = '<p>Nenhum histórico de preços encontrado para o período.</p>';
        return;
    }
    container.innerHTML = `
        <div class="table-responsive">
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Item</th>
                        <th>Preço (R$)</th>
                        <th>Variação (%)</th>
                    </tr>
                </thead>
                <tbody id="report-results-body"></tbody>
            </table>
        </div>
    `;
    renderPaginatedTable({
        containerId: 'report-results-body',
        paginationContainerId: 'report-pagination-container',
        data: reportData,
        renderRowFunction: createPriceHistoryReportRow,
        noDataMessage: 'Nenhum histórico de preços para o período.',
        tableType: 'report'
    });
}

function renderFloatingActionButton() {
    const fab = document.getElementById('floating-cart-button');
    const countBadge = document.getElementById('floating-cart-count');
    const icon = fab.querySelector('i');
    const session = getSession();

    if (session.isActive && session.items.length > 0) {
        countBadge.textContent = session.items.length;
        fab.classList.remove('hidden');

        if (session.mode === 'checkout') {
            icon.className = 'fas fa-shopping-cart';
            fab.onclick = () => openCartCheckoutModal();
        }

    } else {
        fab.classList.add('hidden');
    }
}

function openCartCheckoutModal() {
    const session = getSession();
    if (!session.isActive || session.mode !== 'checkout') return;

    openModal(MODAL_IDS.CART_CHECKOUT, (modal) => {
        const container = modal.querySelector('#cart-items-container');
        const collaboratorSelect = modal.querySelector('#cart-checkout-collaborator');

        collaboratorSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>' +
            getAllCollaborators().map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        if (session.items.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Seu carrinho de requisição está vazio.</p>';
            return;
        }

        let tableHTML = `
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantidade</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        session.items.forEach(item => {
            tableHTML += `
                <tr data-id="${item.id}">
                    <td>${item.name}</td>
                    <td>
                        <input type="number" class="form-control cart-quantity-input" value="${item.quantity}" min="1" max="${item.maxStock}" data-id="${item.id}">
                    </td>
                    <td class="actions-cell">
                        <button type="button" class="btn btn-sm btn-danger" data-action="remove-from-cart" data-id="${item.id}" title="Remover do Carrinho">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
    });
}

function openReturnCartModal() {
    openModal(MODAL_IDS.RETURN_CART, (modal) => {
        const collaboratorSelect = modal.querySelector('#return-cart-collaborator');
        const itemsContainer = modal.querySelector('#return-cart-items-container');

        collaboratorSelect.innerHTML = '<option value="" disabled selected>Selecione um colaborador...</option>' +
            getAllCollaborators().map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        itemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Selecione um colaborador para ver os itens a devolver.</p>';

        collaboratorSelect.onchange = () => {
            const collaboratorId = collaboratorSelect.value;
            renderReturnableItemsForCollaborator(collaboratorId, modal);
        };
    });
}

function renderReturnableItemsForCollaborator(collaboratorId, modal) {
    const itemsContainer = modal.querySelector('#return-cart-items-container');
    const allItems = getAllItems();

    const itemsOnLoan = allItems.flatMap(item =>
        (item.allocations || [])
            .filter(alloc => alloc.collaboratorId === collaboratorId)
            .map(alloc => ({
                itemId: item.id,
                itemName: item.name,
                allocationId: alloc.id,
                quantity: alloc.quantity,
                date: alloc.date
            }))
    );

    if (itemsOnLoan.length === 0) {
        itemsContainer.innerHTML = '<p style="text-align: center;">Este colaborador não possui itens para devolução.</p>';
        return;
    }

    let tableHTML = `
        <table class="item-table">
            <thead>
                <tr>
                    <th><input type="checkbox" id="select-all-returns" title="Selecionar Todos"></th>
                    <th>Item</th>
                    <th>Qtd. Emprestada</th>
                    <th>Data do Empréstimo</th>
                </tr>
            </thead>
            <tbody>
    `;

    itemsOnLoan.forEach(loan => {
        tableHTML += `
            <tr>
                <td><input type="checkbox" class="return-item-checkbox" name="allocationsToReturn" value="${loan.allocationId}"></td>
                <td>${loan.itemName}</td>
                <td>${loan.quantity}</td>
                <td>${new Date(loan.date).toLocaleDateString('pt-BR')}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    itemsContainer.innerHTML = tableHTML;

    const selectAllCheckbox = itemsContainer.querySelector('#select-all-returns');
    const itemCheckboxes = itemsContainer.querySelectorAll('.return-item-checkbox');
    selectAllCheckbox.onchange = () => {
        itemCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
    };
}

function openKitAssemblyBulkModal() {
    openModal(MODAL_IDS.KIT_ASSEMBLY_BULK, (modal) => {
        const kitSelect = modal.querySelector('#kit-assembly-bulk-select');
        const itemsContainer = modal.querySelector('#kit-assembly-bulk-items-container');

        const allKits = getAllItems().filter(i => i.type === 'Kit');
        kitSelect.innerHTML = '<option value="" disabled selected>Selecione um kit...</option>' +
            allKits.map(k => `<option value="${k.id}">${k.name}</option>`).join('');

        itemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Selecione um kit para ver os componentes.</p>';

        kitSelect.onchange = () => {
            const kitId = kitSelect.value;
            renderAvailableItemsForKitAssembly(kitId, modal);
        };
    });
}

function renderAvailableItemsForKitAssembly(kitId, modal) {
    const itemsContainer = modal.querySelector('#kit-assembly-bulk-items-container');
    const allItems = getAllItems();
    const kit = allItems.find(k => k.id === kitId);

    if (!kit) {
        itemsContainer.innerHTML = '<p style="text-align: center;">Kit não encontrado.</p>';
        return;
    }

    const availableComponents = allItems.filter(item => item.type !== 'Kit');
    const currentComponentIds = new Set((kit.kitItems || []).map(ci => ci.id));
    const currentComponentMap = new Map((kit.kitItems || []).map(ci => [ci.id, ci.quantity]));

    if (availableComponents.length === 0) {
        itemsContainer.innerHTML = '<p style="text-align: center;">Não há itens cadastrados para adicionar como componentes.</p>';
        return;
    }

    let tableHTML = `
        <table class="item-table">
            <thead>
                <tr>
                    <th><input type="checkbox" id="select-all-components" title="Selecionar Todos"></th>
                    <th>Componente</th>
                    <th>Quantidade por Kit</th>
                </tr>
            </thead>
            <tbody>
    `;

    availableComponents.forEach(item => {
        const isChecked = currentComponentIds.has(item.id);
        const quantity = currentComponentMap.get(item.id) || 1;
        tableHTML += `
            <tr>
                <td><input type="checkbox" class="component-item-checkbox" name="componentIds" value="${item.id}" ${isChecked ? 'checked' : ''}></td>
                <td>${item.name}</td>
                <td>
                    <input type="number" class="form-control component-quantity-input" value="${quantity}" min="1" data-id="${item.id}" style="max-width: 100px;">
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    itemsContainer.innerHTML = tableHTML;

    const selectAllCheckbox = itemsContainer.querySelector('#select-all-components');
    const itemCheckboxes = itemsContainer.querySelectorAll('.component-item-checkbox');
    selectAllCheckbox.onchange = () => {
        itemCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
    };
}

