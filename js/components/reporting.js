// almoxarifado-digital/js/components/reporting.js
function renderReportingComponent() {
    const section = document.getElementById('reporting-section');
    if (!section) return;

    const settings = getSettings();
    if (settings.panelVisibility && settings.panelVisibility['reporting-section'] === false) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');

    section.innerHTML = `
        <div class="card-header">
            <h2><i class="fas fa-chart-pie"></i> Análise e Relatórios</h2>
            <div class="header-actions">
                <button class="btn btn-icon-only btn-sm hide-panel-btn" data-action="hide-panel" data-panel-id="reporting-section" title="Ocultar painel">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="card-body">
            <form id="report-filters" class="report-filters-form">
                <div class="report-form-layout">

                    <div class="report-form-left">
                        <div class="form-group report-type-group">
                            <label for="report-type">Tipo de Relatório:</label>
                            <select id="report-type">
                                <option value="movements">Movimentações</option>
                                <option value="usage">Análise de Uso</option>
                                <option value="stock_levels">Níveis de Estoque</option>
                                <option value="stock_value">Valor do Estoque</option>
                                <option value="purchase_suggestion">Sugestão de Compra</option>
                                <option value="batch_validity">Validade por Lote</option>
                                <option value="price_history">Histórico de Preços</option>
                            </select>
                        </div>
                        <div class="date-filter-group" style="display: flex;">
                            <div class="form-group">
                                <label for="start-date">Data Início:</label>
                                <input type="date" id="start-date">
                            </div>
                            <div class="form-group">
                                <label for="end-date">Data Fim:</label>
                                <input type="date" id="end-date">
                            </div>
                        </div>
                    </div>

                    <div class="report-form-right">
                         <button type="button" data-action="${ACTIONS.CLEAR_FILTERS}" class="btn btn-secondary" title="Limpar filtros e resultados">
                            <i class="fas fa-times"></i> Limpar
                        </button>
                        <div class="export-dropdown-container">
                            <button type="button" class="btn btn-primary" id="generate-report-btn">
                                <span class="btn-text">Gerar Relatório</span>
                                <i class="fas fa-chevron-down export-arrow" style="display: none;"></i>
                            </button>
                            <div id="export-dropdown-content" class="export-dropdown-content hidden">
                                <a href="#" data-action="export-pdf"><i class="fas fa-file-pdf"></i> Exportar como PDF</a>
                                <a href="#" data-action="export-csv"><i class="fas fa-file-csv"></i> Exportar como CSV</a>
                            </div>
                        </div>
                    </div>

                </div>
            </form>
            <hr id="report-separator" style="display: none; margin: 1.5rem 0;" />
            <div id="report-results" class="report-results-container"></div>
            <div id="report-pagination-container" class="card-footer"></div>
        </div>`;
}

function addReportingEventListeners() {
    const section = document.getElementById('reporting-section');
    if (!section) return;

    const reportForm = document.getElementById('report-filters');
    const reportTypeSelect = document.getElementById('report-type');
    const separator = document.getElementById('report-separator');
    const resultsContainer = document.getElementById('report-results');
    const generateReportBtn = document.getElementById('generate-report-btn');
    const exportDropdown = document.getElementById('export-dropdown-content');
    const btnText = generateReportBtn.querySelector('.btn-text');
    const btnArrow = generateReportBtn.querySelector('.export-arrow');

    let currentReportData = null;
    let currentReportRawData = null;
    let isDropdownOpen = false;

    const reportGenerators = {
        movements: generateMovementReport,
        usage: generateUsageReport,
        stock_levels: generateStockLevelReport,
        stock_value: generateStockValueReport,
        purchase_suggestion: generatePurchaseSuggestionReport,
        batch_validity: generateBatchValidityReport,
        price_history: generatePriceHistoryReport
    };

    const exportFormatters = {
        movements: (data) => {
            const headers = ['Data', 'Item', 'Tipo', 'Quantidade', 'Responsável'];
            const typeMap = {
                [ACTIONS.HISTORY_ENTRY]: 'Entrada',
                [ACTIONS.HISTORY_EXIT]: 'Saída',
                [ACTIONS.HISTORY_ADJUSTMENT]: 'Ajuste',
                [ACTIONS.HISTORY_LOAN]: 'Empréstimo',
                [ACTIONS.HISTORY_RETURN]: 'Devolução',
                [ACTIONS.HISTORY_LOSS]: 'Perda',
                [ACTIONS.HISTORY_DISCARD]: 'Descarte'
            };
            const body = data.map(record => [
                new Date(record.timestamp).toLocaleString('pt-BR'),
                record.itemName,
                typeMap[record.type] || record.type,
                Math.abs(record.quantity),
                record.responsible
            ]);
            return {
                headers,
                body
            };
        },
        usage: (data) => {
            const headers = ['Item', 'Total de Saídas/Empréstimos'];
            const body = data.map(item => [item.name, item.quantity]);
            return {
                headers,
                body
            };
        },
        stock_levels: (data) => {
            const headers = ['Item', 'Stock Atual', 'Stock Mínimo', 'Status'];
            const body = data.map(item => [item.name, item.currentStock, item.minStock, item.status]);
            return {
                headers,
                body
            };
        },
        stock_value: (data) => {
            const headers = ['Item', 'Stock Total', 'Preço Unit. (R$)', 'Valor Total (R$)'];
            const body = data.items.map(item => [item.name, item.totalStock, item.price.toFixed(2), item.totalValue.toFixed(2)]);
            body.push(['', '', 'TOTAL GERAL:', data.grandTotal.toFixed(2)]);
            return {
                headers,
                body
            };
        },
        purchase_suggestion: (data) => {
            const headers = ['Item', 'Stock Atual/Mínimo', 'Qtd. Sugerida', 'Custo Estimado (R$)'];
            const body = data.items.map(item => [item.name, `${item.currentStock} / ${item.minStock}`, item.quantityToBuy, item.estimatedCost.toFixed(2)]);
            body.push(['', '', 'CUSTO TOTAL ESTIMADO:', data.grandTotal.toFixed(2)]);
            return {
                headers,
                body
            };
        },
        batch_validity: (data) => {
            const headers = ['Item', 'Qtd. no Lote', 'Data de Validade', 'Status / Dias Restantes'];
            const body = data.map(batch => {
                const daysText = batch.isExpired ? `Vencido há ${-batch.daysRemaining} dia(s)` : `${batch.daysRemaining} dia(s)`;
                return [batch.itemName, batch.quantity, new Date(batch.expiryDate).toLocaleDateString('pt-BR'), daysText];
            });
            return {
                headers,
                body
            };
        },
        price_history: (data) => {
            const headers = ['Data', 'Item', 'Preço (R$)', 'Variação (%)'];
            const body = data.map(record => [
                new Date(record.date).toLocaleDateString('pt-BR'),
                record.itemName,
                record.price.toFixed(2),
                record.variation.toFixed(2) + '%'
            ]);
            return { headers, body };
        }
    };

    const setExportButtonsState = (enabled) => {
        if (enabled) {
            btnText.textContent = 'Exportar';
            btnArrow.style.display = 'inline-block';
            generateReportBtn.title = 'Opções de Exportação';
        } else {
            btnText.textContent = 'Gerar Relatório';
            btnArrow.style.display = 'none';
            generateReportBtn.title = '';
            exportDropdown.classList.add('hidden');
            isDropdownOpen = false;
        }
    };

    const handleReportGeneration = () => {
        btnText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Gerando...`;
        generateReportBtn.disabled = true;
        currentReportData = null;
        currentReportRawData = null;
        setExportButtonsState(false);
        resultsContainer.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><span>Processando dados...</span></div>`;

        setTimeout(() => {
            const reportType = reportTypeSelect.value;
            const startDateInput = document.getElementById('start-date').value;
            const endDateInput = document.getElementById('end-date').value;
            const needsDateFilter = ['movements', 'usage', 'price_history'].includes(reportType);

            let startDate, endDate;

            if (needsDateFilter) {
                if (!startDateInput || !endDateInput) {
                    showToast('Por favor, selecione as datas de início e fim para este tipo de relatório.', 'error');
                    clearReportResults();
                    return;
                }
                const start = new Date(startDateInput + 'T00:00:00.000Z');
                const end = new Date(endDateInput + 'T23:59:59.999Z');

                if (start > end) {
                    showToast('A data de início não pode ser posterior à data de fim.', 'error');
                    clearReportResults();
                    return;
                }
                startDate = start.toISOString();
                endDate = end.toISOString();
            }

            const allItems = getAllItems();
            const settings = getSettings();

            try {
                clearReportResults(false);

                const generator = reportGenerators[reportType];
                const formatter = exportFormatters[reportType];

                if (!generator || !formatter) throw new Error(`Tipo de relatório desconhecido: ${reportType}`);

                const params = {
                    startDate,
                    endDate,
                    allItems,
                    settings
                };
                currentReportRawData = generator(params);

                const hasData = Array.isArray(currentReportRawData) ?
                    currentReportRawData.length > 0 :
                    (currentReportRawData && currentReportRawData.items && currentReportRawData.items.length > 0);

                separator.style.display = 'block';

                if (hasData) {
                    const exportData = formatter(currentReportRawData);
                    const renderers = {
                        movements: renderMovementReport,
                        usage: renderUsageReport,
                        stock_levels: renderStockLevelReport,
                        stock_value: renderStockValueReport,
                        purchase_suggestion: renderPurchaseSuggestionReport,
                        batch_validity: renderBatchValidityReport,
                        price_history: renderPriceHistoryReport,
                    };

                    renderers[reportType]?.(currentReportRawData);
                    currentReportData = {
                        ...exportData,
                        title: reportTypeSelect.options[reportTypeSelect.selectedIndex].text
                    };
                    setExportButtonsState(true);
                } else {
                    resultsContainer.innerHTML = `<div class="initial-state-card" style="margin: 0; border-style: solid;"><i class="fas fa-info-circle"></i><h3>Nenhum dado encontrado</h3><p>Não há informações para o relatório e filtros selecionados.</p></div>`;
                    setExportButtonsState(false);
                }

                createLog('GENERATE_REPORT', `Relatório gerado: ${reportType}`, 'Usuário');
            } catch (e) {
                console.error(`Erro ao gerar o relatório '${reportType}':`, e);
                showToast(`Erro ao gerar o relatório: ${e.message}`, "error");
                clearReportResults();
            } finally {
                generateReportBtn.disabled = false;
            }
        }, 500);
    };

    const handleClearFilters = () => {
        reportForm.reset();
        clearReportResults();
        handleReportTypeChange();
        showToast('Filtros e resultados foram limpos.', 'info');
    };

    const clearReportResults = (resetButton = true) => {
        resultsContainer.innerHTML = '';
        separator.style.display = 'none';
        currentReportData = null;
        currentReportRawData = null;
        isDropdownOpen = false;
        if (resetButton) {
            generateReportBtn.disabled = false;
            setExportButtonsState(false);
        }
        const paginationContainer = document.getElementById('report-pagination-container');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
            paginationContainer.style.display = 'none';
        }
        document.body.dispatchEvent(new CustomEvent('resetPage', { detail: { table: 'report' } }));
    };

    section.addEventListener('click', (event) => {
        const target = event.target.closest('button, a');
        if (!target) return;

        if (target.id === 'generate-report-btn') {
            if (currentReportData) {
                isDropdownOpen = !isDropdownOpen;
                exportDropdown.classList.toggle('hidden', !isDropdownOpen);
            } else {
                handleReportGeneration();
            }
            return;
        }

        const action = target.dataset.action;
        switch (action) {
            case ACTIONS.CLEAR_FILTERS:
                handleClearFilters();
                break;
            case 'export-pdf':
                event.preventDefault();
                if (currentReportData) exportReportToPdf(currentReportData.headers, currentReportData.body, currentReportData.title);
                exportDropdown.classList.add('hidden');
                isDropdownOpen = false;
                break;
            case 'export-csv':
                event.preventDefault();
                if (currentReportData) exportReportToCsv(currentReportData.headers, currentReportData.body, currentReportData.title);
                exportDropdown.classList.add('hidden');
                isDropdownOpen = false;
                break;
        }
    });

    document.addEventListener('click', (event) => {
        if (!generateReportBtn.contains(event.target) && !exportDropdown.contains(event.target) && isDropdownOpen) {
            exportDropdown.classList.add('hidden');
            isDropdownOpen = false;
        }
    });

    const handleReportTypeChange = () => {
        const needsDateFilter = ['movements', 'usage', 'price_history'].includes(reportTypeSelect.value);
        toggleDateFilters(needsDateFilter);
        clearReportResults();
    };

    reportTypeSelect.addEventListener('change', handleReportTypeChange);
    reportForm.addEventListener('submit', (event) => event.preventDefault());

    const paginationContainer = document.getElementById('report-pagination-container');
    paginationContainer.addEventListener('click', (event) => {
        event.stopPropagation();
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        if (!action.startsWith('report-')) return;
        if (!currentReportRawData) return;

        const direction = action.endsWith('-next') ? 'next' : 'prev';
        const pageState = paginationState.report;

        const totalItems = Array.isArray(currentReportRawData) ?
            currentReportRawData.length :
            (currentReportRawData.items ? currentReportRawData.items.length : 0);
        if (totalItems === 0) return;

        const itemsPerPage = getSettings().itemsPerPage;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        let pageChanged = false;
        if (direction === 'next' && pageState.currentPage < totalPages) {
            pageState.currentPage++;
            pageChanged = true;
        } else if (direction === 'prev' && pageState.currentPage > 1) {
            pageState.currentPage--;
            pageChanged = true;
        }

        if (pageChanged) {
            const reportType = reportTypeSelect.value;
            const renderers = {
                movements: renderMovementReport,
                usage: renderUsageReport,
                stock_levels: renderStockLevelReport,
                stock_value: renderStockValueReport,
                purchase_suggestion: renderPurchaseSuggestionReport,
                batch_validity: renderBatchValidityReport,
                price_history: renderPriceHistoryReport,
            };
            const renderer = renderers[reportType];
            if (renderer) {
                renderer(currentReportRawData);
            }
        }
    });

    setExportButtonsState(false);
    handleReportTypeChange();
}

function toggleDateFilters(show) {
    const dateGroup = document.querySelector('.date-filter-group');
    if (dateGroup) {
        dateGroup.style.display = show ? 'flex' : 'none';
    }
}

function initializeReporting() {
    renderReportingComponent();
    addReportingEventListeners();
}