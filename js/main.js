// CÓDIGO CORRIGIDO - js/main.js
import { initializeDB } from './modules/dataHandler.js';
import { getSettings, saveSettings, initializeSettings } from './modules/settings.js';
import { initializeItemManagement, renderItemsTable } from './components/itemManagement.js';
import { initializeKitManagement, renderKitsTable } from './components/kitManagement.js';
import { initializeCollaboratorManagement, renderCollaboratorsTable } from './components/collaboratorManagement.js';
import { initializeDebitManagement, renderDebitsTable } from './components/debitManagement.js';
import { initializeReporting } from './components/reporting.js';
import { initializeServiceOrderManagement, renderServiceOrdersTable } from './components/serviceOrderManagement.js';
import { openSettingsModal, closeModal, showToast } from './modules/uiManager.js';
import { createLog } from './modules/logManager.js';
import { getAllItems, createItem, updateItem } from './modules/itemManager.js';
import { getAllCollaborators, addCollaborator, updateCollaborator } from './modules/collaboratorManager.js';
import { getAllDebits } from './modules/debitManager.js';
import { getAllServiceOrders, addServiceOrder, updateServiceOrder } from './modules/serviceOrderManager.js';
import { renderNotifications } from './modules/notificationManager.js';
import { updateDashboard } from './components/graphicDashboard.js';
import { registerLoan, adjustStock, registerDirectLoss } from './modules/stockControl.js';
import { MODAL_IDS } from './constants.js';
import { backupData, restoreData } from './modules/backupManager.js';
import { apiClient } from './modules/apiClient.js'; // Importar apiClient

document.addEventListener('DOMContentLoaded', () => {
    const searchFilters = {
        items: '',
        kits: '',
        collaborators: '',
        debits: '',
        serviceOrders: ''
    };

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
        let modalToClose = form.closest('dialog');

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
                // CORREÇÃO: Adicionado case para o formulário de lote
                case 'batch-form':
                    {
                        const itemId = form.closest('dialog').querySelector('#item-batches-item-id').value;
                        const batchData = {
                            quantity: parseInt(form.elements.quantity.value, 10),
                            acquisitionDate: form.elements.acquisitionDate.value,
                            manufacturingDate: form.elements.manufacturingDate.value || null,
                            shelfLifeDays: parseInt(form.elements.shelfLifeDays.value, 10) || null
                        };

                        if (itemId && batchData.quantity > 0 && batchData.acquisitionDate) {
                            await apiClient.post(`item-details/${itemId}/batches`, batchData);
                            success = true;
                            showToast('Lote adicionado com sucesso!', 'success');
                            // Não fecha o modal, apenas atualiza a lista (requer modificação em openItemBatchesModal)
                            modalToClose = null;
                            needsDataChangedEvent = true; // Recarrega os dados gerais
                        } else {
                            showToast('Por favor, preencha a quantidade e a data de aquisição.', 'error');
                        }
                        break;
                    }

                case 'collaborator-form':
                    {
                        const collabId = form.elements['collaborator-id'].value;
                        const collabData = {
                            name: form.elements['collaborator-name'].value,
                            role: form.elements['collaborator-role'].value,
                            accessKey: form.elements['collaborator-registration'].value,
                            status: 'ativo'
                        };
                        success = collabId ? await updateCollaborator(collabId, collabData) : await addCollaborator(collabData);
                        break;
                    }

                case 'mass-add-collaborator-form':
                    {
                        const names = form.elements['mass-add-collaborator-data'].value.split('\n').filter(name => name.trim() !== '');
                        if (names.length > 0) {
                            const promises = names.map(name => addCollaborator({ name, role: 'N/A', status: 'ativo', accessKey: null }));
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
                            const promises = itemNames.map(name => createItem({ name, type: 'Geral', currentStock: 0, minStock: 0, price: 0 }));
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

                        settings.aisles = form.elements['setting-aisles'].value;
                        settings.shelvesPerAisle = parseInt(form.elements['setting-shelves-per-aisle'].value, 10);
                        settings.boxesPerShelf = parseInt(form.elements['setting-boxes-per-shelf'].value, 10);

                        if (!settings.backupReminder) settings.backupReminder = {};
                        settings.backupReminder.frequencyDays = parseInt(form.elements['setting-backup-frequency'].value, 10) || 7;


                        settings.countFrequency = parseInt(form.elements['setting-count-frequency'].value, 10) || 0;
                        settings.priceCheckFrequency = parseInt(form.elements['setting-price-check-frequency'].value, 10) || 0;
                        settings.maintenanceFrequency = parseInt(form.elements['setting-maintenance-frequency'].value, 10) || 0;
                        settings.predictiveAlertCritical = parseInt(form.elements['setting-alert-critical'].value, 10) || 0;
                        settings.predictiveAlertWarning = parseInt(form.elements['setting-alert-warning'].value, 10) || 0;

                        const panelVisibility = {};
                        const visibilityCheckboxes = form.querySelectorAll('#panel-visibility-container input[type="checkbox"]');
                        visibilityCheckboxes.forEach(cb => {
                            panelVisibility[cb.name] = cb.checked;
                        });
                        settings.panelVisibility = panelVisibility;

                        const notificationBehaviors = {};
                        const notificationCheckboxes = form.querySelectorAll('#notification-behavior-container input[type="checkbox"]');
                        notificationCheckboxes.forEach(cb => {
                            notificationBehaviors[cb.name] = cb.checked;
                        });
                        settings.notificationBehaviors = notificationBehaviors;

                        const returnableTypes = [];
                        const returnableCheckboxes = form.querySelectorAll('input[name="returnableType"]:checked');
                        returnableCheckboxes.forEach(cb => {
                            returnableTypes.push(cb.value);
                        });
                        settings.returnableTypes = returnableTypes;


                        saveSettings(settings);
                        showToast('Configurações salvas com sucesso!', 'success');
                        success = true;
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
            if (modalToClose) {
                closeModal(modalToClose.id);
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

        const filteredItems = getAllItems().filter(item => item.name.toLowerCase().includes(searchFilters.items));
        const filteredKits = getAllItems().filter(item => item.type === 'Kit' && item.name.toLowerCase().includes(searchFilters.kits));
        const filteredCollaborators = getAllCollaborators().filter(c => c.name.toLowerCase().includes(searchFilters.collaborators) || (c.accessKey && c.accessKey.toLowerCase().includes(searchFilters.collaborators)));
        const filteredDebits = getAllDebits().filter(d => d.collaboratorName?.toLowerCase().includes(searchFilters.debits) || d.itemName?.toLowerCase().includes(searchFilters.debits));
        const filteredServiceOrders = getAllServiceOrders().filter(os => os.customer.toLowerCase().includes(searchFilters.serviceOrders) || os.technicianName?.toLowerCase().includes(searchFilters.serviceOrders) || os.id.toString().includes(searchFilters.serviceOrders));

        renderItemsTable(filteredItems.filter(item => item.type !== 'Kit'));
        renderKitsTable(filteredKits);
        renderCollaboratorsTable(filteredCollaborators);
        renderDebitsTable(filteredDebits);
        renderServiceOrdersTable(filteredServiceOrders);
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
        const debouncedUpdate = debounce(updateAllUI, 300);
        document.body.addEventListener('dataChanged', debouncedUpdate);
        document.body.addEventListener('submit', handleFormSubmit);

        document.body.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const action = button.dataset.action;
            const modal = button.closest('dialog');

            if (action && (action.startsWith('cancel-') || action.startsWith('close-'))) {
                if (modal) {
                    closeModal(modal.id);
                }
            }

            if (modal && modal.id === MODAL_IDS.SETTINGS) {
                const settings = getSettings();
                if (action === 'add-new-type') {
                    const input = modal.querySelector('#new-item-type');
                    const newType = input.value.trim();
                    if (newType && !settings.itemTypes.includes(newType)) {
                        settings.itemTypes.push(newType);
                        saveSettings(settings);
                        openSettingsModal();
                        showToast(`Tipo "${newType}" adicionado.`, 'success');
                    } else if (!newType) {
                        showToast('O nome do tipo não pode ser vazio.', 'error');
                    } else {
                        showToast(`O tipo "${newType}" já existe.`, 'warning');
                    }
                }

                if (action === 'delete-type') {
                    const typeName = button.dataset.typeName;
                    if (typeName) {
                        settings.itemTypes = settings.itemTypes.filter(t => t !== typeName);
                        settings.returnableTypes = settings.returnableTypes.filter(t => t !== typeName);
                        saveSettings(settings);
                        openSettingsModal();
                        showToast(`Tipo "${typeName}" removido.`, 'success');
                    }
                }

                if (button.id === 'backup-btn') {
                    backupData();
                }
                if (button.id === 'restore-btn') {
                    document.getElementById('restore-input').click();
                }
            }

        });

        const restoreInput = document.getElementById('restore-input');
        if (restoreInput) {
            restoreInput.addEventListener('change', restoreData);
        }

        document.getElementById('search-input')?.addEventListener('input', (e) => {
            searchFilters.items = e.target.value.toLowerCase();
            debouncedUpdate();
        });
        document.getElementById('kit-search-input')?.addEventListener('input', (e) => {
            searchFilters.kits = e.target.value.toLowerCase();
            debouncedUpdate();
        });
        document.getElementById('collaborator-search-input')?.addEventListener('input', (e) => {
            searchFilters.collaborators = e.target.value.toLowerCase();
            debouncedUpdate();
        });
        document.getElementById('debit-search-input')?.addEventListener('input', (e) => {
            searchFilters.debits = e.target.value.toLowerCase();
            debouncedUpdate();
        });
        document.getElementById('os-search-input')?.addEventListener('input', (e) => {
            searchFilters.serviceOrders = e.target.value.toLowerCase();
            debouncedUpdate();
        });
    }

    initializeApp();
});