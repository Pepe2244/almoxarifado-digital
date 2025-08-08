import { initializeDB } from './modules/dataHandler.js';
import { getSettings, saveSettings, initializeSettings } from './modules/settings.js';
import { initializeItemManagement, renderItemsTable } from './components/itemManagement.js';
import { initializeKitManagement, renderKitsTable } from './components/kitManagement.js';
import { initializeCollaboratorManagement, renderCollaboratorsTable } from './components/collaboratorManagement.js';
import { initializeDebitManagement, renderDebitsTable } from './components/debitManagement.js';
import { initializeReporting } from './components/reporting.js';
import { initializeServiceOrderManagement, renderServiceOrdersTable } from './components/serviceOrderManagement.js';
import { openSettingsModal, closeModal } from './modules/uiManager.js';
import { createLog } from './modules/logManager.js';
import { getAllItems, createItem, updateItem } from './modules/itemManager.js';
import { getAllCollaborators, addCollaborator, updateCollaborator } from './modules/collaboratorManager.js';
import { getAllDebits } from './modules/debitManager.js';
import { getAllServiceOrders, addServiceOrder, updateServiceOrder } from './modules/serviceOrderManager.js';
import { renderNotifications } from './modules/notificationManager.js';
import { updateDashboard } from './components/graphicDashboard.js';
import { registerLoan, adjustStock, registerDirectLoss } from './modules/stockControl.js';

document.addEventListener('DOMContentLoaded', () => {
    async function initializeApp() {
        try {
            await initializeDB();
            initializeSettings();

            initializeItemManagement();
            initializeKitManagement();
            initializeCollaboratorManagement();
            initializeDebitManagement();
            initializeReporting();
            initializeServiceOrderManagement();
            addEventListeners();
            initializeHeaderFunctionality();

            document.body.dispatchEvent(new CustomEvent('dataChanged'));
        } catch (error) {
            console.error("ERRO CRÍTICO NA INICIALIZAÇÃO:", error);
            document.body.innerHTML = `<div class="critical-error"><h1>Erro Crítico</h1><p>Não foi possível iniciar a aplicação. Verifique a consola para mais detalhes.</p></div>`;
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
            settingsBtn.addEventListener('click', openSettingsModal);
        }

        document.addEventListener('click', (e) => {
            if (notificationPanel && !notificationPanel.classList.contains('hidden') && !e.target.closest('#notification-bell-container')) {
                notificationPanel.classList.add('hidden');
            }
        });
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const modal = form.closest('dialog');
        let success = false;

        try {
            switch (form.id) {
                case 'item-form': {
                    const itemId = form.elements.id.value;
                    const itemData = {
                        name: form.elements.name.value,
                        barcode: form.elements.barcode.value,
                        type: form.elements.type.value,
                        unit: form.elements.unit.value,
                        minStock: parseInt(form.elements.minStock.value, 10),
                        maxStock: parseInt(form.elements.maxStock.value, 10),
                        price: parseFloat(form.elements.price.value),
                        shelfLifeDays: parseInt(form.elements.shelfLifeDays.value, 10),
                        status: form.elements.status.value,
                        location: form.elements.location.value,
                        currentStock: parseInt(form.elements.currentStock.value, 10)
                    };
                    success = itemId ? await updateItem(itemId, itemData) : await createItem(itemData);
                    break;
                }
                case 'collaborator-form': {
                    const collabId = form.elements['collaborator-id'].value;
                    const collabData = {
                        name: form.elements['collaborator-name'].value,
                        role: form.elements['collaborator-role'].value,
                        accessKey: form.elements['collaborator-registration'].value
                    };
                    success = collabId ? await updateCollaborator(collabId, collabData) : await addCollaborator(collabData);
                    break;
                }
                case 'service-order-form': {
                    const osId = form.elements['os-id'].value;
                    const osData = {
                        customer: form.elements.customer.value,
                        technicianId: form.elements.technicianId.value,
                        status: form.elements.status.value,
                        description: form.elements.description.value
                    };
                    success = osId ? await updateServiceOrder(osId, osData) : await addServiceOrder(osData);
                    break;
                }
                case 'movement-form':
                    success = await registerLoan(form.elements['movement-item-id'].value, form.elements['movement-collaborator'].value, form.elements['movement-quantity'].value, form.elements['allocation-location'].value);
                    break;
                case 'adjustment-form':
                    success = await adjustStock(form.elements['adjustment-item-id'].value, form.elements['physical-count'].value, form.elements['adjustment-responsible'].value);
                    break;
                case 'direct-loss-form':
                    success = await registerDirectLoss(form.elements['direct-loss-item-id'].value, form.elements['direct-loss-quantity'].value, form.elements['direct-loss-reason'].value, form.elements['direct-loss-responsible'].value, form.elements['direct-loss-collaborator'].value);
                    break;
            }

            if (success && modal) {
                closeModal(modal.id);
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            }
        } catch (error) {
            console.error("Form submission error:", error);
        }
    }

    function updateAllUI() {
        const settings = getSettings();
        document.body.className = settings.theme || 'light';
        const warehouseTitle = document.querySelector('#warehouse-title');
        if (warehouseTitle) {
            warehouseTitle.innerHTML = `<i class="fas fa-warehouse"></i> `;
            warehouseTitle.append(settings.warehouseName || 'Almoxarifado Digital');
        }

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
        const debouncedUpdate = debounce(updateAllUI, 100);
        document.body.addEventListener('dataChanged', debouncedUpdate);
        document.body.addEventListener('submit', handleFormSubmit);
    }

    initializeApp();
});
