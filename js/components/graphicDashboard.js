// CÓDIGO CORRIGIDO - js/components/graphicDashboard.js

import { apiClient } from '../modules/apiClient.js';

let itemTypesChart = null;
let stockLevelsChart = null;

export async function updateDashboard() {
    try {
        const data = await apiClient.get('dashboard-data');
        renderStatsCards(data);
        renderCharts(data);
    } catch (error) {
        console.error("Failed to update dashboard:", error);
        const dashboardGrid = document.getElementById('dashboard-stats-grid');
        if (dashboardGrid) {
            dashboardGrid.innerHTML = `<p class="error-message">Não foi possível carregar os dados do dashboard.</p>`;
        }
    }
}

function renderStatsCards(data) {
    const container = document.getElementById('dashboard-stats-grid');
    if (!container) return;

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-card-icon"><i class="fas fa-boxes"></i></div>
            <div class="stat-card-info">
                <span class="stat-card-title">Itens Totais</span>
                <span class="stat-card-value">${data.totalItems}</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon"><i class="fas fa-dollar-sign"></i></div>
            <div class="stat-card-info">
                <span class="stat-card-title">Valor em Estoque</span>
                <span class="stat-card-value">R$ ${data.totalStockValue.toFixed(2)}</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon"><i class="fas fa-users"></i></div>
            <div class="stat-card-info">
                <span class="stat-card-title">Colaboradores Ativos</span>
                <span class="stat-card-value">${data.totalCollaborators}</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon"><i class="fas fa-clipboard-list"></i></div>
            <div class="stat-card-info">
                <span class="stat-card-title">O.S. Abertas</span>
                <span class="stat-card-value">${data.openServiceOrders}</span>
            </div>
        </div>
    `;
}

function renderCharts(data) {
    const itemTypesCtx = document.getElementById('item-types-chart')?.getContext('2d');
    if (itemTypesCtx) {
        if (itemTypesChart) {
            itemTypesChart.destroy();
        }
        itemTypesChart = new Chart(itemTypesCtx, {
            type: 'doughnut',
            data: {
                labels: data.itemTypesDistribution.map(item => item.type),
                datasets: [{
                    label: 'Distribuição por Tipo',
                    data: data.itemTypesDistribution.map(item => item.count),
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71',
                        '#34495e', '#1abc9c', '#d35400', '#c0392b', '#8e44ad'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Distribuição de Itens por Tipo'
                    }
                }
            }
        });
    }
}