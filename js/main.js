import { initializeDB } from './modules/dataHandler.js';
import { getSettings, saveSettings, initializeSettings } from './modules/settings.js';
import { initializeItemManagement, renderItemsTable } from './components/itemManagement.js';
import { initializeKitManagement, renderKitsTable } from './components/kitManagement.js';
import { initializeCollaboratorManagement, renderCollaboratorsTable } from './components/collaboratorManagement.js';
import { initializeDebitManagement, renderDebitsTable } from './components/debitManagement.js';
import { initializeReporting } from './components/reporting.js';
import { initializeServiceOrderManagement, renderServiceOrdersTable } from './components/serviceOrderManagement.js';
import { openSettingsModal, closeModal, openConfirmationModal } from './modules/uiManager.js';
import { MODAL_IDS } from './constants.js';
import { createLog, getAllLogs } from './modules/logManager.js';
import { getAllItems } from './modules/itemManager.js';
import { getAllCollaborators } from './modules/collaboratorManager.js';
import { getAllDebits } from './modules/debitManager.js';
import { getAllServiceOrders } from './modules/serviceOrderManager.js';
import { renderAlerts } from './modules/alertSystem.js';
import { updateCharts } from './components/graphicDashboard.js';

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
            const errorContainer = document.createElement('div');
            errorContainer.className = 'critical-error';
            const title = document.createElement('h1');
            title.textContent = 'Ocorreu um erro crítico na inicialização.';
            const p1 = document.createElement('p');
            p1.textContent = 'Isto pode ter sido causado por dados corrompidos. Por favor, tente limpar os dados do site no seu navegador (cache e armazenamento local) e recarregue a página. Se o problema persistir, contacte o suporte.';
            const p2 = document.createElement('p');
            const strong = document.createElement('strong');
            p2.appendChild(strong);
            p2.append(` ${error.message}`);
            errorContainer.append(title, p1, p2);
            document.body.innerHTML = '';
            document.body.appendChild(errorContainer);
        }
    }

    function initializeHeaderFunctionality() {
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        const notificationBellBtn = document.getElementById('notification-bell-btn');
        const settingsBtn = document.getElementById('toggle-settings-btn');
        const notificationPanel = document.getElementById('notification-panel');
        let activePanel = null;

        const togglePanel = (panelToToggle) => {
            if (activePanel && activePanel !== panelToToggle) {
                activePanel.classList.add('hidden');
            }
            if (panelToToggle) {
                panelToToggle.classList.toggle('hidden');
            }
            activePanel = (panelToToggle && !panelToToggle.classList.contains('hidden')) ? panelToToggle : null;
        };

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const settings = getSettings();
                const newTheme = document.body.className === 'light' ? 'dark' : 'light';
                document.body.className = newTheme;
                const icon = themeToggleBtn.querySelector('i');
                if (icon) {
                    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                }
                settings.theme = newTheme;
                saveSettings(settings);
                createLog('THEME_CHANGE', `Tema alterado para ${newTheme}.`, 'Usuário');
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            });
        }

        if (notificationBellBtn) {
            notificationBellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePanel(notificationPanel);
            });
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                openSettingsModal();
            });
        }

        document.addEventListener('click', (e) => {
            const openDropdown = document.querySelector('.actions-dropdown-content.fixed-dropdown');
            if (openDropdown && !openDropdown.closest('.actions-dropdown-container').contains(e.target)) {
                closeAllFixedDropdowns();
            }

            if (activePanel && !activePanel.contains(e.target) && !e.target.closest('#notification-bell-container')) {
                togglePanel(activePanel);
            }
        });
    }

    function updateDashboard() {
        const allItems = getAllItems();
        const allCollaborators = getAllCollaborators();
        const allDebits = getAllDebits();
        const allLogs = getAllLogs();
        const allServiceOrders = getAllServiceOrders();

        const itemSearchInput = document.getElementById('search-input');
        const collaboratorSearchInput = document.getElementById('collaborator-search-input');
        const debitSearchInput = document.getElementById('debit-search-input');
        const logSearchInput = document.getElementById('log-search-input');
        const kitSearchInput = document.getElementById('kit-search-input');
        const osSearchInput = document.getElementById('os-search-input');

        const itemSearchTerm = itemSearchInput?.value.trim().toLowerCase() || '';
        const kitSearchTerm = kitSearchInput?.value.trim().toLowerCase() || '';
        const collaboratorSearchTerm = collaboratorSearchInput?.value.trim().toLowerCase() || '';
        const debitSearchTerm = debitSearchInput?.value.trim().toLowerCase() || '';
        const logSearchTerm = logSearchInput?.value.trim().toLowerCase() || '';
        const osSearchTerm = osSearchInput?.value.trim().toLowerCase() || '';

        const filteredItems = allItems.filter(item => {
            const isNotKit = item.type !== 'Kit';
            const matchesSearch = itemSearchTerm ?
                item.name.toLowerCase().includes(itemSearchTerm) ||
                item.type.toLowerCase().includes(itemSearchTerm) :
                true;
            return isNotKit && matchesSearch;
        });

        const filteredKits = allItems.filter(item => {
            const isKit = item.type === 'Kit';
            const matchesSearch = kitSearchTerm ?
                item.name.toLowerCase().includes(kitSearchTerm) :
                true;
            return isKit && matchesSearch;
        });

        const filteredCollaborators = allCollaborators.filter(c => {
            return collaboratorSearchTerm ?
                c.name.toLowerCase().includes(collaboratorSearchTerm) :
                true;
        });

        const filteredDebits = allDebits.filter(debit => {
            return debitSearchTerm ?
                (debit.collaboratorName || '').toLowerCase().includes(debitSearchTerm) ||
                debit.itemName.toLowerCase().includes(debitSearchTerm) :
                true;
        });

        const filteredServiceOrders = allServiceOrders.filter(os => {
            return osSearchTerm ?
                String(os.id).includes(osSearchTerm) ||
                os.customer.toLowerCase().includes(osSearchTerm) ||
                (os.technicianName || '').toLowerCase().includes(osSearchTerm) :
                true;
        });

        renderItemsTable(filteredItems);
        renderKitsTable(filteredKits);
        renderCollaboratorsTable(filteredCollaborators);
        renderDebitsTable(filteredDebits);
        renderServiceOrdersTable(filteredServiceOrders);
        renderAlerts();
        updateCharts(allItems);
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
        const debouncedUpdateDashboard = debounce(updateDashboard, 300);
        document.body.addEventListener('dataChanged', debouncedUpdateDashboard);
        document.body.addEventListener('input', (event) => {
            if (event.target.matches('.search-input')) {
                debouncedUpdateDashboard();
            }
        });
    }

    function closeAllFixedDropdowns() {
        const openDropdowns = document.querySelectorAll('.actions-dropdown-content.fixed-dropdown');
        openDropdowns.forEach(dropdownContent => {
            dropdownContent.classList.add('hidden');
            dropdownContent.classList.remove('fixed-dropdown');
        });
    }

    initializeApp();
});
