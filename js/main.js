import { initializeDB } from './modules/dataHandler.js';
import { getSettings, saveSettings, initializeSettings } from './modules/settings.js';
import { initializeItemManagement, renderItemsTable } from './components/itemManagement.js';
import { initializeKitManagement, renderKitsTable } from './components/kitManagement.js';
import { initializeCollaboratorManagement, renderCollaboratorsTable } from './components/collaboratorManagement.js';
import { initializeDebitManagement, renderDebitsTable } from './components/debitManagement.js';
import { initializeReporting } from './components/reporting.js';
import { initializeServiceOrderManagement, renderServiceOrdersTable } from './components/serviceOrderManagement.js';
import { openSettingsModal, closeModal, showToast } from './modules/uiManager.js';
import { createLog, getAllLogs } from './modules/logManager.js';
import { getAllItems, createItem, updateItem } from './modules/itemManager.js';
import { getAllCollaborators, addCollaborator, updateCollaborator } from './modules/collaboratorManager.js';
import { getAllDebits } from './modules/debitManager.js';
import { getAllServiceOrders, addServiceOrder, updateServiceOrder } from './modules/serviceOrderManager.js';
import { renderNotifications } from './modules/notificationManager.js';
import { updateDashboard } from './components/graphicDashboard.js';
import { registerLoan, adjustStock, registerDirectLoss } from './modules/stockControl.js';
import { MODAL_IDS } from './constants.js';

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
            createLog('SESSION_START', 'Sistema iniciado.', 'Sistema');
        } catch (error) {
            console.error("ERRO CRÍTICO NA INICIALIZAÇÃO:", error);
            showToast("Erro crítico ao iniciar. Verifique o console.", "error");
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

    async function handleFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        let success = false;
        let needsDataChangedEvent = true;

        try {
            switch (form.id) {
                case 'item-form':
                    {
                        const itemId = form.elements.id.value;
                        const itemData = {
                            name: form.elements.name.value,
                            barcode: form.elements.barcode.value,
                            type: form.elements.type.value,
                            unit: form.elements.unit.value,
                            minStock: parseInt(form.elements.minStock.value, 10) || 0,
                            maxStock: parseInt(form.elements.maxStock.value, 10) || 0,
                            price: parseFloat(form.elements.price.value) || 0,
                            shelfLifeDays: parseInt(form.elements.shelfLifeDays.value, 10) || 0,
                            status: form.elements.status.value,
                            location: {
                                aisle: form.elements.aisle.value,
                                shelf: form.elements.shelf.value,
                                box: form.elements.box.value,
                            },
                        };
                        if (!itemId) {
                            itemData.currentStock = parseInt(form.elements.currentStock.value, 10) || 0;
                        }
                        success = itemId ? await updateItem(itemId, itemData) : await createItem(itemData);
                        break;
                    }

                case 'collaborator-form':
                    {
                        const collabId = form.elements['collaborator-id'].value;
                        const collabData = {
                            name: form.elements['collaborator-name'].value,
                            role: form.elements['collaborator-role'].value,
                            registration: form.elements['collaborator-registration'].value,
                            status: 'ativo'
                        };
                        success = collabId ? await updateCollaborator(collabId, collabData) : await addCollaborator(collabData);
                        break;
                    }

                case 'mass-add-collaborator-form':
                    {
                        const names = form.elements['mass-add-collaborator-data'].value.split('\n').filter(name => name.trim() !== '');
                        if (names.length > 0) {
                            const promises = names.map(name => addCollaborator({ name, role: 'N/A', status: 'ativo' }));
                            const results = await Promise.all(promises);
                            const successfulAdds = results.filter(r => r).length;
                            showToast(`${successfulAdds} de ${names.length} colaboradores adicionados.`, 'success');
                            success = successfulAdds > 0;
                        }
                        break;
                    }

                case 'service-order-form':
                    {
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

                case 'mass-add-form':
                    {
                        const itemNames = form.elements['mass-add-data'].value.split('\n').filter(name => name.trim() !== '');
                        if (itemNames.length > 0) {
                            const promises = itemNames.map(name => createItem({ name, type: 'Geral' }));
                            const results = await Promise.all(promises);
                            const successfulAdds = results.filter(r => r).length;
                            showToast(`${successfulAdds} de ${itemNames.length} itens adicionados.`, 'success');
                            success = successfulAdds > 0;
                        }
                        break;
                    }

                case 'settings-form':
                    {
                        const settings = getSettings();
                        settings.warehouseName = form.elements['setting-warehouse-name'].value;
                        settings.paginationEnabled = form.elements['setting-pagination-enabled'].checked;
                        settings.itemsPerPage = parseInt(form.elements['setting-items-per-page'].value, 10);

                        const panelVisibility = {};
                        const visibilityCheckboxes = form.querySelectorAll('#panel-visibility-container input[type="checkbox"]');
                        visibilityCheckboxes.forEach(cb => {
                            panelVisibility[cb.name] = cb.checked;
                        });
                        settings.panelVisibility = panelVisibility;

                        saveSettings(settings);
                        showToast('Configurações salvas com sucesso!', 'success');
                        success = true;
                        // Recarrega a página para aplicar a visibilidade dos painéis
                        setTimeout(() => window.location.reload(), 1000);
                        break;
                    }

                case 'movement-form':
                    success = await registerLoan(form.elements['movement-item-id'].value, form.elements['movement-collaborator'].value, form.elements['movement-quantity'].value, form.elements['allocation-location'].value);
                    break;
                case 'adjustment-form':
                    success = await adjustStock(form.elements.itemId.value, form.elements.physicalCount.value, form.elements.responsible.value);
                    break;
                case 'direct-loss-form':
                    success = await registerDirectLoss(form.elements['direct-loss-item-id'].value, form.elements['direct-loss-quantity'].value, form.elements['direct-loss-reason'].value, form.elements['direct-loss-responsible'].value, form.elements['direct-loss-collaborator'].value);
                    break;
            }
        } catch (error) {
            console.error("Erro ao submeter o formulário:", error);
            showToast(`Erro: ${error.message}`, 'error');
            success = false;
        }


        if (success) {
            const modal = form.closest('dialog');
            if (modal) {
                closeModal(modal.id);
            }
            if (needsDataChangedEvent) {
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            }
        }
    }

    function updateAllUI() {
        const settings = getSettings();
        document.body.className = settings.theme || 'light';
        const warehouseTitle = document.querySelector('#warehouse-title');
        if (warehouseTitle) {
            warehouseTitle.innerHTML = `<i class="fas fa-warehouse"></i> `;
            warehouseTitle.append(document.createTextNode(settings.warehouseName || 'Almoxarifado Digital'));
        }

        Object.keys(settings.panelVisibility || {}).forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.style.display = settings.panelVisibility[panelId] ? '' : 'none';
            }
        });

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

        // Listener genérico para botões de cancelar/fechar modais
        document.body.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const action = button.dataset.action;
            if (action && (action.startsWith('cancel-') || action.startsWith('close-'))) {
                const modal = button.closest('dialog');
                if (modal) {
                    closeModal(modal.id);
                }
            }
        });
    }

    initializeApp();
});