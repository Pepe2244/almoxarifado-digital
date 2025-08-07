import { initializeDB } from './modules/dataHandler.js';
import { getSettings, saveSettings, initializeSettings } from './modules/settings.js';
import { initializeItemManagement, renderItemsTable } from './components/itemManagement.js';
import { initializeKitManagement, renderKitsTable } from './components/kitManagement.js';
import { initializeCollaboratorManagement, renderCollaboratorsTable } from './components/collaboratorManagement.js';
import { initializeDebitManagement, renderDebitsTable } from './components/debitManagement.js';
import { initializeReporting } from './components/reporting.js';
import { initializeServiceOrderManagement, renderServiceOrdersTable } from './components/serviceOrderManagement.js';
import { openSettingsModal } from './modules/uiManager.js';
import { createLog, getAllLogs } from './modules/logManager.js';
import { getAllItems } from './modules/itemManager.js';
import { getAllCollaborators } from './modules/collaboratorManager.js';
import { getAllDebits } from './modules/debitManager.js';
import { getAllServiceOrders } from './modules/serviceOrderManager.js';
import { renderNotifications } from './modules/notificationManager.js';
import { updateDashboard } from './components/graphicDashboard.js';

document.addEventListener('DOMContentLoaded', () => {
    async function initializeApp() {
        try {
            await initializeDB();
            initializeSettings();
            const settings = getSettings();

            const warehouseTitle = document.querySelector('#warehouse-title');
            if (warehouseTitle) {
                warehouseTitle.innerHTML = `<i class="fas fa-warehouse"></i> `;
                warehouseTitle.append(settings.warehouseName || 'Almoxarifado Digital');
            }

            document.body.className = settings.theme || 'light';
            const themeIcon = document.querySelector('#theme-toggle-btn i');
            if (themeIcon) {
                themeIcon.className = (settings.theme || 'light') === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }

            initializeItemManagement();
            initializeKitManagement();
            initializeCollaboratorManagement();
            initializeDebitManagement();
            initializeReporting();
            initializeServiceOrderManagement();
            addEventListeners();
            initializeHeaderFunctionality();
            document.body.dispatchEvent(new CustomEvent('dataChanged'));
            createLog('SESSION_START', 'Sistema iniciado.', 'Sistema');
        } catch (error) {
            console.error("ERRO CRÍTICO NA INICIALIZAÇÃO:", error);
        }
    }

    function initializeHeaderFunctionality() {
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        const notificationBellBtn = document.getElementById('notification-bell-btn');
        const settingsBtn = document.getElementById('toggle-settings-btn');
        const notificationPanel = document.getElementById('notification-panel');

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const settings = getSettings();
                const newTheme = document.body.className === 'light' ? 'dark' : 'light';
                document.body.className = newTheme;
                const icon = themeToggleBtn.querySelector('i');
                if (icon) icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                settings.theme = newTheme;
                saveSettings(settings);
            });
        }

        if (notificationBellBtn) {
            notificationBellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationPanel.classList.toggle('hidden');
            });
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                openSettingsModal();
            });
        }

        document.addEventListener('click', (e) => {
            if (notificationPanel && !notificationPanel.classList.contains('hidden') && !e.target.closest('#notification-bell-container')) {
                notificationPanel.classList.add('hidden');
            }
        });
    }

    function updateAllUI() {
        const allItems = getAllItems();
        const allCollaborators = getAllCollaborators();
        const allDebits = getAllDebits();
        const allServiceOrders = getAllServiceOrders();

        renderItemsTable(allItems.filter(item => item.type !== 'Kit'));
        renderKitsTable(allItems.filter(item => item.type === 'Kit'));
        renderCollaboratorsTable(allCollaborators);
        renderDebitsTable(allDebits);
        renderServiceOrdersTable(allServiceOrders);
        renderNotifications();
        updateDashboard();
    }

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function addEventListeners() {
        const debouncedUpdate = debounce(updateAllUI, 50);
        document.body.addEventListener('dataChanged', debouncedUpdate);
    }

    initializeApp();
});
