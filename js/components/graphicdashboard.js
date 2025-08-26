// almoxarifado-digital/js/components/graphicDashboard.js

let stockValueChart = null;
let movementChart = null;
let chartUpdateTimeout = null;
let isChartUpdating = false;

function handleChartClick(event, elements, chart) {
    if (elements.length > 0) {
        const elementIndex = elements[0].index;
        const label = chart.data.labels[elementIndex];

        document.body.dispatchEvent(new CustomEvent('filterFromChart', {
            detail: {
                filterType: 'itemType',
                filterValue: label
            }
        }));
    }
}

function resizeCharts() {
    if (stockValueChart) {
        stockValueChart.resize();
    }
    if (movementChart) {
        movementChart.resize();
    }
}

function updateCharts(allItems) {
    if (isChartUpdating) {
        return;
    }
    isChartUpdating = true;

    clearTimeout(chartUpdateTimeout);
    chartUpdateTimeout = setTimeout(() => {
        try {
            const isDarkMode = document.body.classList.contains('dark');
            const textColor = isDarkMode ? '#c9d1d9' : '#212529';
            const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const settings = getSettings();
            const analysisDays = settings.dashboardAnalysisDays || 30;

            const valuePerType = allItems.reduce((acc, item) => {
                const value = (item.totalStock || 0) * (item.price || 0);
                if (!acc[item.type]) {
                    acc[item.type] = 0;
                }
                acc[item.type] += value;
                return acc;
            }, {});

            const stockLabels = Object.keys(valuePerType);
            const stockData = Object.values(valuePerType);
            const stockValueCtx = document.getElementById('stockValueChart')?.getContext('2d');

            if (stockValueCtx) {
                if (stockValueChart) {
                    stockValueChart.data.labels = stockLabels;
                    stockValueChart.data.datasets[0].data = stockData;
                    stockValueChart.options.plugins.legend.labels.color = textColor;
                    stockValueChart.data.datasets[0].borderColor = isDarkMode ? '#161b22' : '#ffffff';
                    stockValueChart.update();
                } else {
                    stockValueChart = new Chart(stockValueCtx, {
                        type: 'doughnut',
                        data: {
                            labels: stockLabels,
                            datasets: [{
                                label: 'Valor do Estoque',
                                data: stockData,
                                backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)'],
                                borderColor: isDarkMode ? '#161b22' : '#ffffff',
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'top', labels: { color: textColor } }
                            },
                            onClick: (event, elements) => handleChartClick(event, elements, stockValueChart)
                        }
                    });
                }
            }

            const movementCtx = document.getElementById('movementChart')?.getContext('2d');
            if (movementCtx) {
                const movementTitleElement = movementCtx.canvas.parentElement.querySelector('h4');
                if (movementTitleElement) {
                    movementTitleElement.textContent = `Movimentações (Últimos ${analysisDays} dias)`;
                }

                const dateLabels = new Map();
                const today = new Date();
                for (let i = analysisDays - 1; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - i);
                    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    dateLabels.set(key, { entries: 0, exits: 0 });
                }

                const startDate = new Date();
                startDate.setDate(startDate.getDate() - analysisDays);
                startDate.setHours(0, 0, 0, 0);

                allItems.forEach(item => {
                    (item.history || []).forEach(record => {
                        const recordDate = new Date(record.timestamp);
                        if (recordDate >= startDate) {
                            const key = recordDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                            if (dateLabels.has(key)) {
                                const data = dateLabels.get(key);
                                const quantity = Math.abs(record.quantity);
                                if ([ACTIONS.HISTORY_ENTRY, ACTIONS.HISTORY_RETURN].includes(record.type)) {
                                    data.entries += quantity;
                                } else if ([ACTIONS.HISTORY_EXIT, ACTIONS.HISTORY_LOAN, ACTIONS.HISTORY_LOSS, ACTIONS.HISTORY_DISCARD].includes(record.type)) {
                                    data.exits += quantity;
                                }
                            }
                        }
                    });
                });

                const movementLabels = Array.from(dateLabels.keys());
                const entryData = Array.from(dateLabels.values()).map(d => d.entries);
                const exitData = Array.from(dateLabels.values()).map(d => d.exits);

                if (movementChart) {
                    movementChart.data.labels = movementLabels;
                    movementChart.data.datasets[0].data = entryData;
                    movementChart.data.datasets[1].data = exitData;
                    movementChart.options.plugins.legend.labels.color = textColor;
                    movementChart.options.scales.y.ticks.color = textColor;
                    movementChart.options.scales.x.ticks.color = textColor;
                    movementChart.options.scales.y.grid.color = gridColor;
                    movementChart.update();
                } else {
                    movementChart = new Chart(movementCtx, {
                        type: 'bar',
                        data: {
                            labels: movementLabels,
                            datasets: [
                                { label: 'Entradas', data: entryData, backgroundColor: 'rgba(75, 192, 192, 0.7)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1 },
                                { label: 'Saídas', data: exitData, backgroundColor: 'rgba(255, 99, 132, 0.7)', borderColor: 'rgba(255, 99, 132, 1)', borderWidth: 1 }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                                x: { ticks: { color: textColor }, grid: { color: 'transparent' } }
                            },
                            plugins: {
                                legend: { position: 'top', labels: { color: textColor } }
                            }
                        }
                    });
                }
            }
        } finally {
            isChartUpdating = false;
        }
    }, 50);
}