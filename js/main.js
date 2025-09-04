document.addEventListener('DOMContentLoaded', () => {

    function getAllSignedReceipts() {
        return loadDataFromLocal(DB_KEYS.SIGNED_RECEIPTS) || [];
    }

    function initializeEmailJS() {
        const settings = getSettings();
        if (settings.emailSettings && settings.emailSettings.publicKey) {
            try {
                emailjs.init(settings.emailSettings.publicKey);
                console.log("EmailJS inicializado com sucesso.");
            } catch (e) {
                console.error("Falha ao inicializar o EmailJS. Verifique sua Public Key.", e);
                showToast("EmailJS: Verifique sua Public Key.", "error");
            }
        } else {
            console.warn("EmailJS Public Key não encontrada nas configurações. Funcionalidades de e-mail estarão desabilitadas.");
        }
    }

    function sendSummaryEmail() {
        const settings = getSettings();
        if (!settings.emailSettings || !settings.emailSettings.serviceId || !settings.emailSettings.templateId || !settings.emailSettings.recipientEmail) {
            showToast("Configurações de e-mail incompletas. Verifique as configurações.", "error");
            return Promise.reject("Email settings incomplete.");
        }

        const allItems = getAllItems();
        const lowStockItems = getLowStockItems();
        const pendingDebits = getAllDebits().filter(d => !d.isSettled);

        let emailBody = `<h2>Resumo do Almoxarifado Digital - ${new Date().toLocaleDateString('pt-BR')}</h2>`;

        emailBody += `<h3><i class="fas fa-boxes"></i> Status Geral do Estoque</h3>
                      <p>Total de Itens Cadastrados: ${allItems.length}</p>`;

        if (lowStockItems.length > 0) {
            emailBody += `<h3><i class="fas fa-exclamation-triangle"></i> Itens com Estoque Baixo (${lowStockItems.length})</h3><ul>`;
            lowStockItems.forEach(alert => {
                emailBody += `<li>${alert.message}</li>`;
            });
            emailBody += `</ul>`;
        } else {
            emailBody += `<p>Nenhum item com estoque baixo. Excelente!</p>`;
        }

        if (pendingDebits.length > 0) {
            const totalDebitValue = pendingDebits.reduce((sum, debit) => sum + debit.amount, 0);
            emailBody += `<h3><i class="fas fa-hand-holding-usd"></i> Débitos Pendentes (${pendingDebits.length})</h3>
                          <p>Valor Total Pendente: <strong>R$ ${totalDebitValue.toFixed(2)}</strong></p><ul>`;
            pendingDebits.forEach(debit => {
                const collaboratorName = getCollaboratorById(debit.collaboratorId)?.name || 'Desconhecido';
                emailBody += `<li>${collaboratorName}: R$ ${debit.amount.toFixed(2)} - ${debit.itemName}</li>`;
            });
            emailBody += `</ul>`;
        } else {
            emailBody += `<p>Nenhum débito pendente.</p>`;
        }
        emailBody += `<br><p><em>Este é um e-mail automático gerado pelo sistema Almoxarifado Digital.</em></p>`;


        const templateParams = {
            to_email: settings.emailSettings.recipientEmail,
            warehouse_name: settings.warehouseName || 'Almoxarifado Digital',
            email_body: emailBody,
        };

        return emailjs.send(settings.emailSettings.serviceId, settings.emailSettings.templateId, templateParams)
            .then(() => {
                showToast("E-mail de resumo enviado com sucesso!", "success");
                createLog('SEND_SUMMARY_EMAIL_SUCCESS', 'E-mail de resumo enviado com sucesso.', 'Usuário');
            }, (error) => {
                console.error("Falha ao enviar e-mail:", error);
                showToast(`Falha ao enviar e-mail: ${error.text}`, "error");
                createLog('SEND_SUMMARY_EMAIL_FAILURE', `Falha ao enviar e-mail: ${error.text}`, 'Sistema');
            });
    }


    async function initializeApp() {
        try {
            await initializeDB();
            initializeSettings();
            const settings = getSettings();

            initializeEmailJS();
            initializeNotificationManager();

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
            initializeItems();
            initializeServiceOrders();
            renderMainLayout();
            renderAllModals();
            initializeItemManagement();
            initializeKitManagement();
            initializeCollaboratorManagement();
            initializeDebitManagement();
            initializeReporting();
            initializeServiceOrderManagement();
            addEventListeners();
            initializeHeaderFunctionality();

            const socket = io('https://almoxarifado-api.onrender.com');

            socket.on('connect', () => {
                console.log('Conectado ao servidor de notificações via WebSocket.');
                createLog('WEBSOCKET_CONNECT', 'Conectado ao servidor de notificações.', 'Sistema');
            });

            socket.on('new_receipt_signed', (receiptData) => {
                const message = `Comprovante assinado por ${receiptData.collaborator_name}.`;
                showToast(message, 'info');
                addNotification(ALERT_TYPES.SIGNED_RECEIPT, message, receiptData.id, true);
                createLog('RECEIPT_SIGNED_NOTIFICATION', `Notificação recebida: ${message}`, 'Sistema');
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            });

            socket.on('disconnect', () => {
                console.log('Desconectado do servidor de notificações.');
                createLog('WEBSOCKET_DISCONNECT', 'Desconectado do servidor de notificações.', 'Sistema');
            });

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
            const openDropdown = document.querySelector('.actions-dropdown-content:not(.hidden), .filters-dropdown-content:not(.hidden)');
            if (openDropdown) {
                const isToggleButton = e.target.closest('[data-action="toggle-actions-dropdown"], [data-action="toggle-filters-dropdown"]');
                if (isToggleButton) {
                    return;
                }

                if (!openDropdown.contains(e.target)) {
                    closeAllFixedDropdowns();
                }
            }

            if (activePanel && !activePanel.contains(e.target) && !e.target.closest('#notification-bell-container')) {
                togglePanel(activePanel);
            }
        });
    }

    function toggleButtonLoading(button, isLoading) {
        if (!button) return;
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalHtml = button.innerHTML;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
        } else {
            button.disabled = false;
            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;
            }
        }
    }

    function updateDashboard(event) {
        const updatedItemId = event?.detail?.updatedItemId;
        const allItems = getAllItems();
        const allCollaborators = getAllCollaborators();
        const allDebits = getAllDebits();
        const allLogs = getAllLogs();
        const allServiceOrders = getAllServiceOrders();

        const itemSearchInput = document.getElementById('search-input');
        if (itemSearchInput) itemSearchInput.value = itemSearchTermState;

        const kitSearchInput = document.getElementById('kit-search-input');
        if (kitSearchInput) kitSearchInput.value = kitSearchTermState;

        const collaboratorSearchInput = document.getElementById('collaborator-search-input');
        if (collaboratorSearchInput) collaboratorSearchInput.value = collaboratorSearchTermState;

        const debitSearchInput = document.getElementById('debit-search-input');
        if (debitSearchInput) debitSearchInput.value = debitSearchTermState;

        const logSearchInput = document.getElementById('log-search-input');
        if (logSearchInput) logSearchInput.value = logSearchTermState;

        const osSearchInput = document.getElementById('os-search-input');
        if (osSearchInput) osSearchInput.value = osSearchTermState;

        const itemSearchTerm = itemSearchTermState.trim().toLowerCase();
        const kitSearchTerm = kitSearchTermState.trim().toLowerCase();
        const collaboratorSearchTerm = collaboratorSearchTermState.trim().toLowerCase();
        const debitSearchTerm = debitSearchTermState.trim().toLowerCase();
        const logSearchTerm = logSearchTermState.trim().toLowerCase();
        const osSearchTerm = osSearchTermState.trim().toLowerCase();

        itemSearchInput?.closest('.search-container')?.classList.toggle('filtering', itemSearchTerm !== '');
        kitSearchInput?.closest('.search-container')?.classList.toggle('filtering', kitSearchTerm !== '');
        collaboratorSearchInput?.closest('.search-container')?.classList.toggle('filtering', collaboratorSearchTerm !== '');
        debitSearchInput?.closest('.search-container')?.classList.toggle('filtering', debitSearchTerm !== '');
        logSearchInput?.closest('.search-container')?.classList.toggle('filtering', logSearchTerm !== '');
        osSearchInput?.closest('.search-container')?.classList.toggle('filtering', osSearchTerm !== '');

        let activeFiltersCount = 0;
        if (empresaFilterState !== 'todas') activeFiltersCount++;
        if (almoxarifadoFilterState !== 'todos') activeFiltersCount++;
        if (itemTypeFilterState !== 'all') activeFiltersCount++;

        const activeFiltersBadge = document.getElementById('active-filters-count');
        if (activeFiltersBadge) {
            if (activeFiltersCount > 0) {
                activeFiltersBadge.textContent = activeFiltersCount;
                activeFiltersBadge.classList.remove('hidden');
            } else {
                activeFiltersBadge.classList.add('hidden');
            }
        }

        let filteredItems = allItems.filter(item => {
            const isNotKit = item.type !== 'Kit';
            const matchesEmpresa = empresaFilterState === 'todas' ? true : item.empresa === empresaFilterState;
            const matchesAlmoxarifado = almoxarifadoFilterState === 'todos' ? true : item.almoxarifado === almoxarifadoFilterState;
            const matchesSearch = itemSearchTerm ?
                item.name.toLowerCase().includes(itemSearchTerm) ||
                (item.ca || '').toLowerCase().includes(itemSearchTerm) ||
                item.type.toLowerCase().includes(itemSearchTerm) ||
                (item.location?.aisle || '').toLowerCase().includes(itemSearchTerm) :
                true;
            const matchesType = itemTypeFilterState === 'all' ? true : item.type === itemTypeFilterState;
            return isNotKit && matchesEmpresa && matchesAlmoxarifado && matchesSearch && matchesType;
        });

        const sortItemsBy = sortState.item.key;
        const sortItemsDir = sortState.item.direction === 'asc' ? 1 : -1;
        filteredItems.sort((a, b) => {
            const valA = a[sortItemsBy];
            const valB = b[sortItemsBy];
            if (typeof valA === 'string') {
                return valA.localeCompare(valB) * sortItemsDir;
            }
            return (valA - valB) * sortItemsDir;
        });

        const filteredKits = allItems.filter(item => {
            const isKit = item.type === 'Kit';
            const matchesSearch = kitSearchTerm ?
                item.name.toLowerCase().includes(kitSearchTerm) :
                true;
            return isKit && matchesSearch;
        });

        const filteredCollaborators = allCollaborators.filter(c => {
            const matchesEmpresa = collaboratorEmpresaFilterState === 'todas' ? true : c.empresa === collaboratorEmpresaFilterState;
            const matchesSearch = collaboratorSearchTerm ?
                c.name.toLowerCase().includes(collaboratorSearchTerm) ||
                (c.registration || '').toLowerCase().includes(collaboratorSearchTerm) :
                true;
            return matchesEmpresa && matchesSearch;
        });

        const filteredDebits = getAllDebits().filter(debit => {
            const collaboratorName = getCollaboratorById(debit.collaboratorId)?.name || '';
            return debitSearchTerm ?
                collaboratorName.toLowerCase().includes(debitSearchTerm) ||
                debit.itemName.toLowerCase().includes(debitSearchTerm) ||
                debit.reason.toLowerCase().includes(debitSearchTerm) :
                true;
        });

        const filteredServiceOrders = allServiceOrders.filter(os => {
            const technicianName = getCollaboratorById(os.technicianId)?.name || '';
            return osSearchTerm ?
                os.id.toLowerCase().includes(osSearchTerm) ||
                os.customer.toLowerCase().includes(osSearchTerm) ||
                technicianName.toLowerCase().includes(osSearchTerm) :
                true;
        });

        const filteredLogs = allLogs.filter(log => {
            return logSearchTerm ?
                log.action.toLowerCase().includes(logSearchTerm) ||
                log.details.toLowerCase().includes(logSearchTerm) ||
                log.user.toLowerCase().includes(logSearchTerm) :
                true;
        });

        const debitsToDisplay = filteredDebits;
        const allPredictiveData = generateUnifiedPredictiveAnalysis();
        const consumptionData = allPredictiveData.filter(d => d.predictionType === 'consumption');
        const lifecycleData = allPredictiveData.filter(d => d.predictionType === 'lifecycle');
        const maintenanceData = allPredictiveData.filter(d => d.predictionType === 'maintenance');

        renderItemsTable(filteredItems, updatedItemId);
        renderKitsTable(filteredKits);
        renderCollaboratorsTable(filteredCollaborators);
        renderDebitsTable(debitsToDisplay, debitSearchTerm);
        renderServiceOrdersTable(filteredServiceOrders, osSearchTerm);
        renderAlerts(getAllAlerts());
        renderPredictiveCards('consumption-predictive-container', consumptionData);
        renderPredictiveCards('lifecycle-predictive-container', [...lifecycleData, ...maintenanceData]);
        renderLogsTable(filteredLogs, logSearchTerm);
        updateCharts(allItems);
        renderFloatingActionButton();
    }

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function handleOsItemAddForm(form) {
        const osId = form.closest('dialog').querySelector('#os-details-id').value;
        const itemId = form.elements.itemId.value;
        const quantity = parseInt(form.elements.quantity.value, 10);

        if (!itemId || isNaN(quantity) || quantity <= 0) {
            showToast("Por favor, selecione um item e informe uma quantidade válida.", "error");
            return false;
        }

        const success = addItemToServiceOrder(osId, itemId, quantity);
        if (success) {
            openServiceOrderDetailsModal(osId);
        }
        return success;
    }

    function handleExchangeForm(form) {
        const returnedItemId = form.elements['exchange-returned-item-id'].value;
        const allocationId = form.elements['exchange-allocation-id'].value;
        const newItemId = form.elements['newItemId'].value;
        const quantity = parseInt(form.elements.quantity.value, 10);
        const collaboratorId = form.elements['exchange-collaborator-id'].value;

        if (!newItemId) {
            showToast("Selecione o novo item para a troca.", "error");
            return false;
        }

        const success = registerExchange(returnedItemId, allocationId, newItemId, quantity, collaboratorId);
        if (success) {
            closeModal(MODAL_IDS.ALLOCATION);
        }
        return success;
    }

    const formHandlers = {
        'settings-form': handleSettingsForm,
        'batch-form': handleBatchForm,
        'maintenance-form': handleMaintenanceForm,
        'adjustment-form': handleAdjustmentForm,
        'movement-form': handleMovementForm,
        'mass-add-form': handleMassAddItemsForm,
        'mass-add-collaborator-form': handleMassAddCollaboratorsForm,
        'collaborator-form': handleCollaboratorForm,
        'loss-registration-form': handleLossRegistrationForm,
        'direct-loss-form': handleDirectLossForm,
        'quick-entry-form': handleQuickEntryForm,
        'kit-item-add-form': handleKitItemAddForm,
        'kit-return-form': handleKitReturnForm,
        'service-order-form': handleServiceOrderForm,
        'os-add-item-form': handleOsItemAddForm,
        'cart-checkout-form': handleCartCheckoutForm,
        'return-cart-form': handleReturnCartForm,
        'kit-assembly-bulk-form': handleKitAssemblyBulkForm,
        'receipt-generator-form': handleReceiptGeneratorForm,
        'exchange-form': handleExchangeForm,
    };

    async function handleFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const handler = formHandlers[form.id];

        if (handler) {
            const submitButton = form.querySelector('button[type="submit"], .form-action-button');
            toggleButtonLoading(submitButton, true);

            try {
                const wasSuccessful = await handler(form);
                if (wasSuccessful) {
                    const modalId = form.closest('dialog')?.id;
                    if (modalId && modalId !== MODAL_IDS.SETTINGS && modalId !== MODAL_IDS.ITEM_KIT && modalId !== MODAL_IDS.SERVICE_ORDER_DETAILS && modalId !== MODAL_IDS.RECEIPT_GENERATOR) {
                        closeModal(modalId);
                    }
                    document.body.dispatchEvent(new CustomEvent('dataChanged'));
                }
            } finally {
                toggleButtonLoading(submitButton, false);
            }
        }
    }

    async function handleItemForm(form) {
        clearFormErrors(form);
        const formData = new FormData(form);
        const itemId = formData.get('id');
        const isUpdate = !!itemId;
        const isKit = form.elements.type.value === 'Kit';
        const imagePreview = document.getElementById('item-form-image-preview');
        const imageUrl = imagePreview.src.startsWith('data:') ? imagePreview.src : null;

        const itemDetails = {
            name: formData.get('name'),
            barcode: formData.get('barcode'),
            empresa: formData.get('empresa'),
            ca: formData.get('ca'),
            type: formData.get('type'),
            almoxarifado: formData.get('almoxarifado'),
            unit: formData.get('unit'),
            minStock: formData.get('minStock'),
            maxStock: formData.get('maxStock'),
            price: formData.get('price'),
            shelfLifeDays: formData.get('shelfLifeDays'),
            imageUrl: imageUrl,
            location: {
                aisle: formData.get('aisle'),
                shelf: formData.get('shelf'),
                box: formData.get('box')
            },
            status: formData.get('status')
        };

        if (!isUpdate) {
            itemDetails.currentStock = formData.get('currentStock');
        }

        const validationErrors = validateItemDetails(itemDetails, isUpdate);
        if (validationErrors.length > 0) {
            showFormErrors(form, validationErrors);
            return false;
        }

        let result = null;
        if (isUpdate) {
            result = await updateItem(itemId, itemDetails);
            if (result) {
                createLog('UPDATE_ITEM', `Item atualizado: ${result.name}`, 'Usuário');
                showToast('Item atualizado com sucesso!', 'success');
            }
        } else {
            result = await createItem(itemDetails);
            if (result) {
                createLog('CREATE_ITEM', `Novo item criado: ${result.name}`, 'Usuário');
                showToast('Item criado com sucesso!', 'success');
                if (result.type === 'Kit') {
                    setTimeout(() => {
                        openKitManagementModal(result.id);
                    }, 250);
                }
            }
        }

        if (result) {
            document.body.dispatchEvent(new CustomEvent('dataChanged', {
                detail: {
                    updatedItemId: result.id
                }
            }));
        }

        return !!result;
    }


    function handleSettingsForm(form) {
        const oldSettings = getSettings();
        const selectedReturnableTypes = Array.from(form.querySelectorAll('#returnable-types-container input:checked')).map(cb => cb.value);
        const itemsInUse = getAllItems().filter(item => (item.onLoanCount || 0) > 0);
        const removedReturnableTypes = (oldSettings.returnableTypes || []).filter(type => !selectedReturnableTypes.includes(type));
        const typeInUse = removedReturnableTypes.find(type => itemsInUse.some(item => item.type === type));

        if (typeInUse) {
            showToast(`Não é possível remover "${typeInUse}" como retornável. Existem itens desse tipo em empréstimo.`, "error");
            return false;
        }

        const newCountFrequency = {};
        form.querySelectorAll('#count-frequency-container input[data-type]').forEach(input => {
            newCountFrequency[input.dataset.type] = parseInt(input.value, 10) || 180;
        });
        const newMaintenanceFrequency = {};
        form.querySelectorAll('#maintenance-frequency-container input[data-type]').forEach(input => {
            newMaintenanceFrequency[input.dataset.type] = parseInt(input.value, 10) || 365;
        });

        const newNotificationBehaviors = {};
        form.querySelectorAll('#notification-behavior-container select').forEach(select => {
            newNotificationBehaviors[select.dataset.type] = select.value;
        });

        const newPanelVisibility = {};
        form.querySelectorAll('#panel-visibility-container input[type="checkbox"]').forEach(checkbox => {
            newPanelVisibility[checkbox.name] = checkbox.checked;
        });


        const newSettings = {
            ...oldSettings,
            warehouseName: form.elements['setting-warehouse-name'].value.trim(),
            priceVariationPercentage: parseFloat(form.elements['setting-price-variation'].value),
            predictiveAnalysisDays: parseInt(form.elements['setting-predictive-analysis-days'].value, 10) || 90,
            dashboardAnalysisDays: parseInt(form.elements['setting-dashboard-analysis-days'].value, 10) || 30,
            alertForReturnables: form.elements['setting-alert-returnables'].checked,
            paginationEnabled: form.elements['setting-pagination-enabled'].checked,
            itemsPerPage: parseInt(form.elements['setting-items-per-page'].value, 10) || 10,
            debitCalculation: form.elements['setting-debit-calculation'].value,
            returnableTypes: selectedReturnableTypes,
            countFrequency: newCountFrequency,
            priceCheckFrequency: parseInt(form.elements['setting-price-check-frequency'].value, 10) || 0,
            maintenanceFrequency: newMaintenanceFrequency,
            aisles: form.elements['setting-aisles'].value,
            shelvesPerAisle: parseInt(form.elements['setting-shelves-per-aisle'].value, 10) || 0,
            boxesPerShelf: parseInt(form.elements['setting-boxes-per-shelf'].value, 10) || 0,
            stockLevels: {
                ok: parseFloat(form.elements['level-ok'].value),
                medium: parseFloat(form.elements['level-medium'].value),
                low: parseFloat(form.elements['level-low'].value),
            },
            predictiveAlertLevels: {
                critical: parseInt(form.elements['setting-alert-critical'].value, 10) || 7,
                warning: parseInt(form.elements['setting-alert-warning'].value, 10) || 30,
            },
            emailSettings: {
                publicKey: form.elements['setting-email-public-key'].value.trim(),
                serviceId: form.elements['setting-email-service-id'].value.trim(),
                templateId: form.elements['setting-email-template-id'].value.trim(),
                recipientEmail: form.elements['setting-recipient-email'].value.trim()
            },
            backupReminder: {
                ...oldSettings.backupReminder,
                frequencyDays: parseInt(form.elements['setting-backup-frequency'].value, 10) || 7,
            },
            notificationBehaviors: newNotificationBehaviors,
            panelVisibility: newPanelVisibility
        };
        saveSettings(newSettings);

        const warehouseTitle = document.querySelector('#warehouse-title');
        if (warehouseTitle) {
            warehouseTitle.innerHTML = `<i class="fas fa-warehouse"></i> `;
            warehouseTitle.append(newSettings.warehouseName || 'Almoxarifado Digital');
        }

        showToast('Configurações salvas! A página será recarregada para aplicar as mudanças.', 'success');
        createLog('UPDATE_SETTINGS', 'Configurações do sistema atualizadas.', 'Usuário');

        setTimeout(() => {
            window.location.reload();
        }, 1500);

        return true;
    }

    function handleBatchForm(form) {
        const itemId = form.closest('dialog').querySelector('#item-batches-item-id').value;
        const quantity = form.elements.quantity.value;
        const acquisitionDate = form.elements.acquisitionDate.value;
        const manufacturingDate = form.elements.manufacturingDate.value;
        const shelfLifeDays = form.elements.shelfLifeDays.value;

        const success = addBatchToItem(itemId, quantity, acquisitionDate, manufacturingDate, shelfLifeDays);

        if (success) {
            const item = getItemById(itemId);
            createLog('ADD_BATCH', `Novo lote de ${quantity} unidade(s) adicionado para: ${item.name}.`, 'Usuário');
            showToast('Lote adicionado com sucesso!', 'success');
            openItemBatchesModal(itemId);
        }
        return success;
    }

    function handleMaintenanceForm(form) {
        const itemId = document.getElementById('item-maintenance-item-id').value;
        const item = getItemById(itemId);
        if (!item) {
            return false;
        }

        const maintenanceDetails = {
            date: form.elements.date.value,
            description: form.elements.description.value,
            responsible: form.elements.responsible.value,
            cost: parseFloat(form.elements.cost.value) || 0
        };
        const success = addMaintenanceRecord(itemId, maintenanceDetails);
        if (success) {
            createLog('ADD_MAINTENANCE', `Manutenção registrada para: ${item.name}`, 'Usuário');
            showToast('Manutenção registrada com sucesso!', 'success');
            openItemMaintenanceModal(itemId);
        } else {
            showToast('Falha ao registrar manutenção.', 'error');
        }
        return success;
    }

    function handleAdjustmentForm(form) {
        const itemId = form.elements.itemId.value;
        const itemNameForLog = getItemById(itemId)?.name;
        const physicalCount = form.elements.physicalCount.value;
        const responsible = form.elements.responsible.value;
        const reason = form.elements.reason.value;
        const batchId = form.elements.batchId ? form.elements.batchId.value : null;

        const success = adjustStockCount(itemId, physicalCount, responsible, reason, batchId);
        if (success) {
            createLog('ADJUST_STOCK', `Estoque de ${itemNameForLog} ajustado para ${physicalCount}. Motivo: ${reason}.`, 'Usuário');
            showToast('Estoque ajustado com sucesso!', 'success');
        }
        return success;
    }

    function handleMovementForm(form) {
        const itemId = form.elements['movement-item-id'].value;
        const itemNameForLog = getItemById(itemId)?.name;
        const success = registerMovement(
            itemId,
            form.elements['movement-quantity'].value,
            form.elements['movement-collaborator'].value,
            form.elements['allocation-location'].value
        );
        if (success) {
            createLog('REGISTER_MOVEMENT', `Saída/Empréstimo de ${itemNameForLog} registrada.`, 'Usuário');
        }
        return success;
    }

    async function handleMassAddItemsForm(form) {
        const itemsRaw = form.elements['mass-add-data'].value.trim();
        const kitId = form.elements['kitId']?.value;
        if (!itemsRaw) {
            showToast('Nenhum item inserido.', 'info');
            return false;
        }

        const itemsToAdd = itemsRaw.split('\n')
            .map(name => ({
                name: name.trim()
            }))
            .filter(item => item.name);

        if (itemsToAdd.length > 0) {
            const allItems = getAllItems();
            const existingNames = new Set(allItems.map(i => i.name.toLowerCase()));

            let addedCount = 0;
            let ignoredCount = 0;
            let addedNames = [];
            let ignoredNames = [];
            let addedItemsForKit = [];

            for (const itemDetails of itemsToAdd) {
                if (existingNames.has(itemDetails.name.toLowerCase())) {
                    ignoredCount++;
                    ignoredNames.push(itemDetails.name);
                } else {
                    const newItem = await createItem({
                        ...itemDetails,
                        type: 'Ferramenta'
                    });
                    if (newItem) {
                        addedCount++;
                        addedNames.push(newItem.name);
                        addedItemsForKit.push(newItem);
                    } else {
                        ignoredCount++;
                        ignoredNames.push(`${itemDetails.name} (falha ao adicionar)`);
                    }
                }
            }

            if (kitId && addedItemsForKit.length > 0) {
                let itemsAddedToKitCount = 0;
                addedItemsForKit.forEach(newItem => {
                    if (addItemToKit(kitId, newItem.id, 1)) {
                        itemsAddedToKitCount++;
                    }
                });

                if (itemsAddedToKitCount > 0) {
                    setTimeout(() => openKitManagementModal(kitId), 100);
                }
            }

            createLog('MASS_ADD_ITEMS', `${addedCount} itens adicionados, ${ignoredCount} ignorados.`, 'Usuário');

            let message = 'Operação concluída!';
            if (kitId && addedCount > 0) {
                message += `\n${addedCount} item(ns) foram criados e adicionados ao kit.`;
            }

            openConfirmationModal({
                title: 'Resultado do Cadastro em Massa',
                message: message,
                details: {
                    addedCount: addedCount,
                    addedNames: addedNames,
                    ignoredCount: ignoredCount,
                    ignoredNames: ignoredNames,
                },
                showConfirmButton: false,
                cancelButtonText: 'Fechar'
            });
            return true;
        } else {
            showToast('Nenhum item válido para adicionar.', 'info');
            return false;
        }
    }

    function handleMassAddCollaboratorsForm(form) {
        const collaboratorsRaw = form.elements['mass-add-collaborator-data'].value.trim();
        if (!collaboratorsRaw) {
            showToast('Nenhum colaborador inserido.', 'info');
            return false;
        }

        const collaboratorsToAdd = collaboratorsRaw.split('\n')
            .map(name => ({
                name: name.trim(),
                registration: '',
                role: ''
            }))
            .filter(c => c.name);

        if (collaboratorsToAdd.length > 0) {
            const allCollaborators = getAllCollaborators();
            const existingNames = new Set(allCollaborators.map(c => c.name.toLowerCase()));

            let addedCount = 0;
            let ignoredCount = 0;
            let addedNames = [];
            let ignoredNames = [];

            for (const collaborator of collaboratorsToAdd) {
                if (existingNames.has(collaborator.name.toLowerCase())) {
                    ignoredCount++;
                    ignoredNames.push(collaborator.name);
                } else {
                    const result = addCollaborator(collaborator);
                    if (result.success) {
                        addedCount++;
                        addedNames.push(result.collaborator.name);
                    } else {
                        ignoredCount++;
                        ignoredNames.push(`${collaborator.name} (falha ao adicionar)`);
                    }
                }
            }

            createLog('MASS_ADD_COLLABORATORS', `${addedCount} colaboradores adicionados, ${ignoredCount} ignorados.`, 'Usuário');

            openConfirmationModal({
                title: 'Resultado do Cadastro em Massa',
                message: `Operação concluída!`,
                details: {
                    addedCount: addedCount,
                    addedNames: addedNames,
                    ignoredCount: ignoredCount,
                    ignoredNames: ignoredNames,
                },
                showConfirmButton: false,
                cancelButtonText: 'Fechar'
            });

            return true;
        } else {
            showToast('Nenhum colaborador válido para adicionar.', 'info');
            return false;
        }
    }


    function handleCollaboratorForm(form) {
        const collaboratorId = form.elements['collaborator-id'].value;
        const collaboratorDetails = {
            name: form.elements['collaborator-name'].value,
            role: form.elements['collaborator-role'].value,
            registration: form.elements['collaborator-registration'].value,
            empresa: form.elements['collaborator-empresa'].value
        };
        const nameForLog = collaboratorDetails.name;

        let success = false;
        if (collaboratorId) {
            const result = updateCollaborator(collaboratorId, collaboratorDetails);
            if (result.success) {
                createLog('UPDATE_COLLABORATOR', `Colaborador atualizado: ${nameForLog}`, 'Usuário');
                showToast('Colaborador atualizado!', 'success');
                success = true;
            }
        } else {
            const result = addCollaborator(collaboratorDetails);
            if (result.success) {
                createLog('CREATE_COLLABORATOR', `Novo colaborador: ${nameForLog}`, 'Usuário');
                openConfirmationModal({
                    title: 'Sucesso!',
                    message: `O colaborador "${nameForLog}" foi adicionado.`,
                    showConfirmButton: false,
                    cancelButtonText: 'Fechar'
                });
                success = true;
            }
        }
        return success;
    }


    function handleServiceOrderForm(form) {
        const osId = form.elements['os-id'].value;
        const osDetails = {
            customer: form.elements['customer'].value,
            technicianId: form.elements['technicianId'].value,
            status: form.elements['status'].value,
            description: form.elements['description'].value,
        };

        let success = false;
        if (osId) {
            success = !!updateServiceOrder(osId, osDetails);
            if (success) {
                showToast(`O.S. ${osId} atualizada!`, 'success');
            }
        } else {
            success = !!addServiceOrder(osDetails);
            if (success) {
                showToast('Nova Ordem de Serviço aberta com sucesso!', 'success');
            }
        }
        return success;
    }

    function handleLossRegistrationForm(form) {
        const itemId = form.elements['loss-item-id'].value;
        const allocationId = form.elements['loss-allocation-id'].value;
        const itemNameForLog = getItemById(itemId)?.name;
        const success = registerLoss(
            itemId,
            allocationId,
            form.elements['loss-reason'].value
        );
        if (success) {
            createLog('REGISTER_LOSS', `Perda registrada para o item ${itemNameForLog}.`, 'Usuário');
            showToast('Perda registrada e débito gerado!', 'success');

            const allocationModal = document.getElementById('allocation-modal');
            if (allocationModal && allocationModal.open) {
                const updatedItem = getItemById(itemId);
                if (updatedItem && updatedItem.allocations && updatedItem.allocations.length > 0) {
                    openAllocationModal(updatedItem);
                } else {
                    closeModal('allocation-modal');
                }
            }
        }
        return success;
    }

    function handleDirectLossForm(form) {
        const itemId = form.elements['direct-loss-item-id'].value;
        const quantity = form.elements['direct-loss-quantity'].value;
        const reason = form.elements['direct-loss-reason'].value;
        const responsible = form.elements['direct-loss-responsible'].value;
        const collaboratorId = form.elements['direct-loss-collaborator'].value;
        const itemNameForLog = getItemById(itemId)?.name;

        const success = registerDirectLoss(itemId, quantity, reason, responsible, collaboratorId);

        if (success) {
            createLog('REGISTER_DIRECT_LOSS', `Perda direta de ${quantity} unidade(s) de ${itemNameForLog} registrada.`, 'Usuário');
            showToast('Perda direta registrada e débito gerado!', 'success');
        }
        return success;
    }

    function handleQuickEntryForm(form) {
        const itemId = form.elements['item-id'].value;
        const action = form.elements['action-type'].value;
        const quantity = Number(form.elements.quantity.value);
        const item = getItemById(itemId);

        if (!item || isNaN(quantity) || quantity <= 0) {
            showToast("Dados inválidos.", "error");
            return false;
        }

        let success = false;
        if (action === ACTIONS.QUICK_ADD_STOCK) {
            success = addStockEntry(itemId, quantity, form.elements.responsible.value);
            if (success) {
                createLog('QUICK_STOCK_ADD', `${quantity} unidade(s) de ${item.name} adicionada(s).`, 'Usuário');
                showToast("Estoque atualizado!", "success");
            }
        } else if (action === ACTIONS.REPLACE_ITEM) {
            success = replaceExpiredItems(itemId, quantity);
            if (success) {
                createLog('REPLACE_ITEM', `${quantity} unidade(s) de ${item.name} substituída(s).`, 'Usuário');
                showToast('Item substituído com sucesso!', 'success');
            }
        }
        return success;
    }

    function handleKitItemAddForm(form) {
        const kitId = form.closest('dialog').querySelector('#kit-item-id').value;
        const componentId = form.elements.itemId.value;
        const quantity = parseInt(form.elements.quantity.value, 10);

        if (!componentId || isNaN(quantity) || quantity <= 0) {
            showToast("Por favor, selecione um item e informe uma quantidade válida.", "error");
            return false;
        }

        const success = addItemToKit(kitId, componentId, quantity);
        if (success) {
            const kitName = getItemById(kitId)?.name;
            const componentName = getItemById(componentId)?.name;
            createLog('ADD_TO_KIT', `${quantity}x ${componentName} adicionado(s) ao kit ${kitName}.`, 'Usuário');
            showToast("Item adicionado ao kit!", "success");
            openKitManagementModal(kitId);
        }
        return success;
    }

    function handleKitReturnForm(form) {
        const kitId = form.elements['kit-return-kit-id'].value;
        const allocationId = form.elements['kit-return-allocation-id'].value;
        const lossDetails = {
            quantities: {}
        };

        const inputs = form.querySelectorAll('input[name="loss_quantity"]');
        for (const input of inputs) {
            const componentId = input.dataset.componentId;
            const lossQty = parseInt(input.value, 10);
            const maxQty = parseInt(input.max, 10);
            if (isNaN(lossQty) || lossQty < 0 || lossQty > maxQty) {
                showToast(`Quantidade inválida para um dos itens. Deve ser entre 0 e ${maxQty}.`, "error");
                return false;
            }
            lossDetails.quantities[componentId] = lossQty;
        }

        const success = returnAllocation(kitId, allocationId, lossDetails);
        if (success) {
            showToast("Devolução do kit processada com sucesso!", "success");
            closeModal(MODAL_IDS.ALLOCATION);
            closeModal(MODAL_IDS.KIT_RETURN);
            document.body.dispatchEvent(new CustomEvent('dataChanged'));
        } else {
            showToast("Falha ao processar a devolução.", "error");
        }
        return success;
    }

    function handleCartCheckoutForm(form) {
        const collaboratorId = form.elements.collaborator.value;
        const location = form.elements.location.value;
        const session = getSession();

        if (!collaboratorId) {
            showToast("Por favor, selecione um colaborador responsável.", "error");
            return false;
        }
        if (session.items.length === 0) {
            showToast("O carrinho está vazio.", "error");
            return false;
        }

        const success = registerMultipleMovements(session.items, collaboratorId, location);

        if (success) {
            endSession();
            return true;
        }
        return false;
    }

    function handleReturnCartForm(form) {
        const selectedCheckboxes = form.querySelectorAll('input[name="allocationsToReturn"]:checked');
        if (selectedCheckboxes.length === 0) {
            showToast("Nenhum item selecionado para devolução.", "error");
            return false;
        }

        const allocationIds = Array.from(selectedCheckboxes).map(cb => cb.value);

        const success = returnMultipleAllocations(allocationIds);

        if (success) {
            showToast(`${allocationIds.length} devoluções processadas com sucesso!`, 'success');
        }
        return success;
    }

    function handleKitAssemblyBulkForm(form) {
        const kitId = form.elements.kitId.value;
        if (!kitId) {
            showToast("Por favor, selecione um kit para salvar.", "error");
            return false;
        }

        const selectedCheckboxes = form.querySelectorAll('input[name="componentIds"]:checked');
        if (selectedCheckboxes.length === 0) {
            openConfirmationModal({
                title: 'Confirmar Kit Vazio',
                message: 'Você não selecionou nenhum componente. Deseja salvar o kit como vazio?',
                onConfirm: () => {
                    if (updateKitComposition(kitId, [])) {
                        showToast("Composição do kit salva como vazia.", "success");
                        closeModal(MODAL_IDS.KIT_ASSEMBLY_BULK);
                        document.body.dispatchEvent(new CustomEvent('dataChanged'));
                    }
                    closeModal(MODAL_IDS.CONFIRMATION);
                }
            });
            return false;
        }

        const components = Array.from(selectedCheckboxes).map(checkbox => {
            const itemId = checkbox.value;
            const quantityInput = form.querySelector(`.component-quantity-input[data-id="${itemId}"]`);
            const quantity = parseInt(quantityInput.value, 10) || 1;
            return {
                id: itemId,
                quantity: quantity
            };
        });

        if (updateKitComposition(kitId, components)) {
            showToast("Composição do kit salva com sucesso!", "success");
        }
        return true;
    }

    async function handleReceiptGeneratorForm(form) {
        const collaboratorId = form.elements.collaboratorId.value;
        const collaborator = getCollaboratorById(collaboratorId);
        const selectedCheckboxes = form.querySelectorAll('input[name="selectedAllocations"]:checked');
        const observations = form.elements.observations.value;
        if (!collaborator) {
            showToast('Erro: Colaborador não encontrado.', 'error');
            return false;
        }

        if (selectedCheckboxes.length === 0) {
            showToast('Selecione pelo menos um item para gerar o comprovante.', 'error');
            return false;
        }

        const allItems = getAllItems();
        let deliveryLocation = '';
        let service_order_id = null;

        const itemsForReceipt = Array.from(selectedCheckboxes).map(cb => {
            const allocationId = cb.value;
            const item = allItems.find(i => i.allocations?.some(a => a.id === allocationId));
            const allocation = item?.allocations.find(a => a.id === allocationId);

            if (allocation && allocation.location && !deliveryLocation) {
                deliveryLocation = allocation.location;
            }

            if (allocation && allocation.serviceOrderId) {
                service_order_id = allocation.serviceOrderId;
            }

            return {
                name: item.name,
                quantity: allocation.quantity,
                ca: item.ca || ''
            };
        });

        const requestBody = {
            collaboratorId: collaborator.id,
            collaboratorName: collaborator.name,
            collaboratorRole: collaborator.role || 'Não especificado',
            collaboratorRegistration: collaborator.registration || '',
            deliveryLocation: deliveryLocation,
            items: itemsForReceipt,
            service_order_id: service_order_id,
            observations: observations
        };

        const API_BASE_URL = 'https://almoxarifado-api.onrender.com/api';
        try {
            const response = await fetch(`${API_BASE_URL}/generate-receipt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Falha ao gerar o link do comprovante.');
            }

            const linkContainer = form.querySelector('#receipt-link-container');
            const linkInput = form.querySelector('#receipt-link');
            const receiptUrl = `${window.location.origin}/receipt.html?token=${data.token}`;
            linkInput.value = receiptUrl;

            linkContainer.style.display = 'block';
            form.querySelector('#generate-receipt-link-btn').style.display = 'none';

            createLog('GENERATE_RECEIPT_LINK', `Link de comprovante gerado para ${collaborator.name}.`, 'Usuário');
            showToast('Link gerado com sucesso!', 'success');
            return false;
        } catch (error) {
            showToast(error.message, 'error');
            return false;
        }
    }

    function getFilteredDataLength(tableType) {
        const allItems = getAllItems();
        const allCollaborators = getAllCollaborators();
        const allDebits = getAllDebits();
        const allLogs = getAllLogs();
        const allServiceOrders = getAllServiceOrders();

        switch (tableType) {
            case 'item':
                return allItems.filter(item => {
                    const isNotKit = item.type !== 'Kit';
                    const matchesEmpresa = empresaFilterState === 'todas' ? true : item.empresa === empresaFilterState;
                    const matchesAlmoxarifado = almoxarifadoFilterState === 'todos' ? true : item.almoxarifado === almoxarifadoFilterState;
                    const matchesSearch = itemSearchTermState ?
                        item.name.toLowerCase().includes(itemSearchTermState) ||
                        (item.ca || '').toLowerCase().includes(itemSearchTermState) ||
                        item.type.toLowerCase().includes(itemSearchTermState) ||
                        (item.location?.aisle || '').toLowerCase().includes(itemSearchTermState) :
                        true;
                    const matchesType = itemTypeFilterState === 'all' || !itemTypeFilterState ? true : item.type === itemTypeFilterState;
                    return isNotKit && matchesEmpresa && matchesAlmoxarifado && matchesSearch && matchesType;
                }).length;
            case 'kit':
                return allItems.filter(item => {
                    const isKit = item.type === 'Kit';
                    const matchesSearch = kitSearchTermState ? item.name.toLowerCase().includes(kitSearchTermState) : true;
                    return isKit && matchesSearch;
                }).length;
            case 'collaborator':
                return allCollaborators.filter(c => {
                    const matchesEmpresa = collaboratorEmpresaFilterState === 'todas' ? true : c.empresa === collaboratorEmpresaFilterState;
                    const matchesSearch = collaboratorSearchTermState ?
                        c.name.toLowerCase().includes(collaboratorSearchTermState) ||
                        (c.registration || '').toLowerCase().includes(collaboratorSearchTermState) :
                        true;
                    return matchesEmpresa && matchesSearch;
                }).length;
            case 'debit':
                return allDebits.filter(debit => {
                    const collaboratorName = getCollaboratorById(debit.collaboratorId)?.name || '';
                    return debitSearchTermState ? collaboratorName.toLowerCase().includes(debitSearchTermState) || debit.itemName.toLowerCase().includes(debitSearchTermState) || debit.reason.toLowerCase().includes(debitSearchTermState) : true;
                }).length;
            case 'serviceOrder':
                return allServiceOrders.filter(os => {
                    const technicianName = getCollaboratorById(os.technicianId)?.name || '';
                    return osSearchTermState ?
                        os.id.toLowerCase().includes(osSearchTermState) ||
                        os.customer.toLowerCase().includes(osSearchTermState) ||
                        technicianName.toLowerCase().includes(osSearchTermState) :
                        true;
                }).length;
            case 'log':
                return allLogs.filter(log => logSearchTermState ? log.action.toLowerCase().includes(logSearchTermState) || log.details.toLowerCase().includes(logSearchTermState) || log.user.toLowerCase().includes(logSearchTermState) : true).length;
            case 'consumption': {
                const allPredictiveData = generateUnifiedPredictiveAnalysis();
                return allPredictiveData.filter(d => d.predictionType === 'consumption').length;
            }
            case 'lifecycle': {
                const allPredictiveData = generateUnifiedPredictiveAnalysis();
                const lifecycleData = allPredictiveData.filter(d => d.predictionType === 'lifecycle');
                const maintenanceData = allPredictiveData.filter(d => d.predictionType === 'maintenance');
                return lifecycleData.length + maintenanceData.length;
            }
            default:
                return 0;
        }
    }

    async function handleBodyClick(event) {
        const target = event.target;

        const sortableHeader = target.closest('th[data-sort]');
        if (sortableHeader) {
            const tableType = sortableHeader.closest('.item-table').parentElement.parentElement.parentElement.id.replace('-management', '');
            const sortKey = sortableHeader.dataset.sort;

            if (sortState[tableType].key === sortKey) {
                sortState[tableType].direction = sortState[tableType].direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState[tableType].key = sortKey;
                sortState[tableType].direction = 'asc';
            }
            document.body.dispatchEvent(new CustomEvent('dataChanged'));
            return;
        }

        const settingsTab = target.closest('.settings-tab-btn');
        if (settingsTab) {
            const contentId = settingsTab.getAttribute('aria-controls');
            const modal = settingsTab.closest(`#${MODAL_IDS.SETTINGS}`);
            if (modal && contentId) {
                modal.querySelectorAll('.settings-tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                modal.querySelectorAll('.settings-tab-content').forEach(content => content.classList.remove('active'));

                settingsTab.classList.add('active');
                settingsTab.setAttribute('aria-selected', 'true');

                const activeContent = modal.querySelector(`#${contentId}`);
                if (activeContent) {
                    activeContent.classList.add('active');
                }
            }
            return;
        }

        if (target.closest('#floating-cart-button')) {
            const session = getSession();
            if (session.mode === 'checkout') {
                openCartCheckoutModal();
            }
            return;
        }

        if (target.id === 'copy-receipt-link-btn') {
            const linkInput = document.getElementById('receipt-link');
            navigator.clipboard.writeText(linkInput.value).then(() => {
                showToast('Link copiado para a área de transferência!', 'success');
            });
            return;
        }

        const button = target.closest('button, a[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        if (!action) return;

        if (action === 'save-item') {
            const form = document.getElementById('item-form');
            if (form) {
                const submitButton = button;
                toggleButtonLoading(submitButton, true);
                try {
                    const itemId = form.elements.id.value;
                    const isUpdate = !!itemId;
                    const isKit = form.elements.type.value === 'Kit';

                    if (await handleItemForm(form)) {
                        if (isUpdate || !isKit) {
                            closeModal(MODAL_IDS.ITEM_FORM);
                        }
                    }
                } finally {
                    toggleButtonLoading(submitButton, false);
                }
            }
            return;
        }

        if (action === 'switch-tab') {
            const tabName = button.dataset.tab;
            const dashboardCard = document.getElementById('unified-dashboard');
            if (dashboardCard) {
                dashboardCard.querySelectorAll('.dashboard-tab').forEach(tab => tab.classList.remove('active'));
                dashboardCard.querySelectorAll('.dashboard-tab-content').forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                const activeContent = dashboardCard.querySelector(`#${tabName}-tab-content`);
                if (activeContent) {
                    activeContent.classList.add('active');
                }
                const settings = getSettings();
                if (!settings.dashboardsCollapsed) settings.dashboardsCollapsed = {};
                settings.dashboardsCollapsed.activeTab = tabName;
                saveSettings(settings);

                if (tabName === 'overview') {
                    setTimeout(() => {
                        if (typeof resizeCharts === 'function') {
                            resizeCharts();
                        }
                    }, 50);
                }
            }
            return;
        }
        if (action.includes('-prev') || action.includes('-next')) {
            const [table, direction] = action.split('-');
            const pageState = paginationState[table];

            if (!pageState) return;

            const itemsPerPage = getSettings().itemsPerPage;
            const totalItems = getFilteredDataLength(table);
            const totalPages = Math.ceil(totalItems / itemsPerPage);

            let newPage = pageState.currentPage;
            if (direction === 'next' && newPage < totalPages) {
                newPage++;
            } else if (direction === 'prev' && newPage > 1) {
                newPage--;
            }

            if (newPage !== pageState.currentPage) {
                pageState.currentPage = newPage;
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            }

            return;
        }

        if (action === 'toggle-actions-dropdown') {
            const container = button.closest('.actions-dropdown-container');
            if (container) {
                const dropdownContent = container.querySelector('.actions-dropdown-content');
                if (dropdownContent) {
                    const isThisDropdownOpen = !dropdownContent.classList.contains('hidden');

                    closeAllFixedDropdowns();

                    if (!isThisDropdownOpen) {
                        dropdownContent.classList.remove('hidden');
                    }
                }
            }
            return;
        }
        if (action === 'toggle-filters-dropdown') {
            const container = button.closest('.filters-dropdown-container');
            if (container) {
                const dropdownContent = container.querySelector('.filters-dropdown-content');
                if (dropdownContent) {
                    const isThisDropdownOpen = !dropdownContent.classList.contains('hidden');
                    closeAllFixedDropdowns();
                    if (!isThisDropdownOpen) {
                        dropdownContent.classList.remove('hidden');
                    }
                }
            }
            return;
        }

        const modalActions = {
            [ACTIONS.CANCEL_SETTINGS]: MODAL_IDS.SETTINGS,
            [ACTIONS.CANCEL_ITEM_FORM]: MODAL_IDS.ITEM_FORM,
            [ACTIONS.CANCEL_ITEM_BATCHES]: MODAL_IDS.ITEM_BATCHES,
            [ACTIONS.CANCEL_ITEM_HISTORY]: MODAL_IDS.ITEM_HISTORY,
            [ACTIONS.CANCEL_ITEM_MAINTENANCE]: MODAL_IDS.ITEM_MAINTENANCE,
            [ACTIONS.CANCEL_ADJUSTMENT]: MODAL_IDS.ADJUSTMENT,
            [ACTIONS.CANCEL_MOVEMENT]: MODAL_IDS.MOVEMENT,
            [ACTIONS.CANCEL_MASS_ADD]: MODAL_IDS.MASS_ADD,
            [ACTIONS.CANCEL_MASS_ADD_COLLABORATOR]: MODAL_IDS.MASS_ADD_COLLABORATOR,
            [ACTIONS.CANCEL_LOSS]: MODAL_IDS.LOSS_REGISTRATION,
            [ACTIONS.CANCEL_DIRECT_LOSS]: MODAL_IDS.DIRECT_LOSS,
            [ACTIONS.CANCEL_COLLABORATOR]: MODAL_IDS.COLLABORATOR,
            [ACTIONS.CANCEL_COLLABORATOR_DASHBOARD]: MODAL_IDS.COLLABORATOR_DASHBOARD,
            'cancel-receipt-generator': MODAL_IDS.RECEIPT_GENERATOR,
            [ACTIONS.CANCEL_SIGNED_RECEIPTS]: MODAL_IDS.SIGNED_RECEIPTS,
            [ACTIONS.CANCEL_QUICK_ENTRY]: MODAL_IDS.QUICK_ENTRY,
            [ACTIONS.CANCEL_CONFIRMATION]: MODAL_IDS.CONFIRMATION,
            [ACTIONS.CLOSE_ALLOCATION]: MODAL_IDS.ALLOCATION,
            [ACTIONS.CANCEL_BARCODE_ACTION]: MODAL_IDS.BARCODE_ACTION,
            [ACTIONS.CANCEL_KIT_MANAGEMENT]: MODAL_IDS.ITEM_KIT,
            [ACTIONS.CANCEL_KIT_RETURN]: MODAL_IDS.KIT_RETURN,
            [ACTIONS.CANCEL_SERVICE_ORDER]: MODAL_IDS.SERVICE_ORDER,
            [ACTIONS.CANCEL_SERVICE_ORDER_DETAILS]: MODAL_IDS.SERVICE_ORDER_DETAILS,
            'cancel-checkout': MODAL_IDS.CART_CHECKOUT,
            [ACTIONS.CANCEL_RETURN_SESSION]: MODAL_IDS.RETURN_CART,
            [ACTIONS.CANCEL_KIT_ASSEMBLY_BULK]: MODAL_IDS.KIT_ASSEMBLY_BULK,
            [ACTIONS.CANCEL_EXCHANGE]: MODAL_IDS.EXCHANGE
        };

        if (typeof modalActions[action] === 'function') {
            modalActions[action]();
            return;
        }
        if (modalActions[action]) {
            closeModal(modalActions[action]);
            return;
        }

        const id = button.dataset.id;
        const allocId = button.dataset.allocId;
        switch (action) {
            case 'exchange-item':
                openExchangeModal(id, allocId);
                break;
            case ACTIONS.PRINT_RECEIPT: {
                const receiptId = button.dataset.id;
                if (!receiptId) {
                    showToast('ID do comprovante não encontrado no botão.', 'error');
                    break;
                }

                const API_BASE_URL = 'https://almoxarifado-api.onrender.com/api';
                try {
                    const response = await fetch(`${API_BASE_URL}/receipts`);
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({
                            error: 'Falha ao buscar comprovantes do servidor.'
                        }));
                        throw new Error(errorData.error);
                    }
                    const allSignedReceipts = await response.json();
                    const receipt = allSignedReceipts.find(r => r.id == receiptId);

                    if (!receipt) {
                        showToast(`Comprovante com ID ${receiptId} não foi encontrado.`, 'error');
                        return;
                    }

                    const printWindow = window.open('', '_blank');
                    printWindow.document.write('<html><head><title>Comprovante de Recebimento</title>');
                    printWindow.document.write('<style>body{font-family:sans-serif;margin:2rem;}h1,h2{color:#333;}ul{list-style:none;padding:0;}li{padding:.5rem;border-bottom:1px solid #eee;} .proof-image { max-width: 200px; margin-top: 1.5rem; border: 1px solid #ccc; padding: 5px; border-radius: 4px; } .signature-section { margin-top: 3rem; text-align: center; } .observations-section { margin-top: 1.5rem; padding: 1rem; border: 1px solid #eee; border-radius: 4px; background-color: #f9f9f9; }</style>');
                    printWindow.document.write('</head><body>');
                    printWindow.document.write(`<h1>Comprovante de Recebimento</h1>`);
                    printWindow.document.write(`<p><strong>Colaborador:</strong> ${receipt.collaborator_name}</p>`);
                    printWindow.document.write(`<p><strong>Data:</strong> ${new Date(receipt.created_at).toLocaleString('pt-BR')}</p>`);
                    printWindow.document.write('<h2>Itens Recebidos:</h2>');

                    let itemsHtml = '<ul>';
                    let itemsToPrint = receipt.items;
                    if (typeof itemsToPrint === 'string') {
                        try {
                            itemsToPrint = JSON.parse(itemsToPrint);
                        } catch (e) {
                            console.error("Falha ao analisar o JSON de itens do comprovante", e);
                            itemsToPrint = [];
                        }
                    }

                    (itemsToPrint || []).forEach(item => {
                        itemsHtml += `<li>${item.quantity}x ${item.name} ${item.ca ? `(CA: ${item.ca})` : ''}</li>`;
                    });
                    itemsHtml += '</ul>';
                    printWindow.document.write(itemsHtml);

                    if (receipt.observations) {
                        printWindow.document.write('<div class="observations-section">');
                        printWindow.document.write('<h2>Observações:</h2>');
                        printWindow.document.write(`<p>${receipt.observations}</p>`);
                        printWindow.document.write('</div>');
                    }

                    printWindow.document.write('<div class="signature-section">');
                    printWindow.document.write('<p><strong>Prova de Recebimento:</strong></p>');
                    printWindow.document.write(`<img src="${receipt.proof_image}" alt="Foto de Comprovação" class="proof-image">`);
                    printWindow.document.write(`<p>${receipt.collaborator_name}</p>`);
                    printWindow.document.write('</div>');

                    printWindow.document.write('</body></html>');
                    printWindow.document.close();

                    printWindow.onload = function () {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                    };
                } catch (error) {
                    showToast(`Erro ao buscar comprovante para impressão: ${error.message}`, 'error');
                }
                break;
            }
            case ACTIONS.ADD_TO_CART: {
                const item = getItemById(id);
                if (!item || item.currentStock <= 0) {
                    showToast(`Estoque de ${item.name} indisponível.`, 'error');
                    break;
                }
                const quantity = prompt(`Quantidade de ${item.name} para adicionar ao carrinho (Disponível: ${item.currentStock}):`, 1);
                if (quantity) {
                    const qty = parseInt(quantity, 10);
                    if (!isNaN(qty) && qty > 0 && qty <= item.currentStock) {
                        addItemToSession(id, qty);
                    } else {
                        showToast('Quantidade inválida ou maior que o estoque disponível.', 'error');
                    }
                }
                break;
            }
            case 'remove-from-cart': {
                removeItemFromSession(id);
                openCartCheckoutModal();
                break;
            }
            case 'clear-item-filters':
                empresaFilterState = 'todas';
                almoxarifadoFilterState = 'todos';
                itemTypeFilterState = 'all';
                itemSearchTermState = '';
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
                break;
            case 'clear-collaborator-filters':
                collaboratorEmpresaFilterState = 'todas';
                collaboratorSearchTermState = '';
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
                break;
            case ACTIONS.REMOVE_ITEM_FROM_OS: {
                const osId = button.dataset.osId;
                const allocId = button.dataset.allocId;
                const os = getServiceOrderById(osId);
                if (!os) break;
                const itemAllocation = os.items.find(item => item.allocationId === allocId);
                if (!itemAllocation) break;
                const itemName = getItemById(itemAllocation.itemId)?.name || 'Item desconhecido';

                openConfirmationModal({
                    title: 'Remover Item da O.S.',
                    message: `Tem certeza que deseja remover o item "${itemName}" da O.S. ${osId}? O estoque será devolvido.`,
                    onConfirm: () => {
                        if (removeItemFromServiceOrder(osId, allocId)) {
                            document.body.dispatchEvent(new CustomEvent('dataChanged'));
                            closeModal('confirmation-modal');
                            openServiceOrderDetailsModal(osId);
                        } else {
                            closeModal('confirmation-modal');
                        }
                    }
                });
                break;
            }
            case ACTIONS.MASS_ADD_FROM_KIT: {
                const kitModal = document.getElementById(MODAL_IDS.ITEM_KIT);
                const kitId = kitModal?.querySelector('#kit-item-id')?.value;
                openMassAddModal({
                    kitId: kitId
                });
                break;
            }
            case 'remove-kit-item': {
                const kitId = button.dataset.kitId;
                const componentId = button.dataset.componentId;
                if (removeItemFromKit(kitId, componentId)) {
                    showToast("Item removido do kit.", "success");
                    openKitManagementModal(kitId);
                    document.body.dispatchEvent(new CustomEvent('dataChanged'));
                }
                break;
            }
            case 'hide-panel': {
                const panelId = button.dataset.panelId;
                if (panelId) {
                    const settings = getSettings();
                    if (!settings.panelVisibility) settings.panelVisibility = {};
                    settings.panelVisibility[panelId] = false;
                    saveSettings(settings);
                    document.getElementById(panelId)?.classList.add('hidden');
                    showToast('Painel ocultado. Você pode reexibi-lo nas configurações.', 'info');
                }
                break;
            }
            case ACTIONS.DO_BACKUP:
                backupData();
                const notificationItem = button.closest('.notification-item');
                if (notificationItem) {
                    const alertData = JSON.parse(notificationItem.dataset.alertData);
                    dismissNotificationById(alertData.id);
                }
                break;
            case 'view-logs':
                const logViewer = document.getElementById('log-viewer');
                if (logViewer) {
                    logViewer.classList.toggle('hidden');
                }
                closeModal(MODAL_IDS.SETTINGS);
                break;
            case ACTIONS.MANAGE_ALLOCATIONS: {
                const item = getItemById(id);
                if (item) {
                    openAllocationModal(item);
                }
                break;
            }
            case ACTIONS.DISMISS_MANUAL_ALERT: {
                const notificationItemToDismiss = button.closest('.notification-item');
                if (notificationItemToDismiss && notificationItemToDismiss.dataset.alertData) {
                    const alertData = JSON.parse(notificationItemToDismiss.dataset.alertData);
                    dismissNotificationById(alertData.id);
                }
                break;
            }
            case ACTIONS.CLEAR_ALL_NOTIFICATIONS: {
                dismissAllNotifications();
                break;
            }
            case ACTIONS.TOGGLE_DASHBOARD: {
                const targetId = button.dataset.target;
                const dashboardEl = document.getElementById(targetId);
                if (dashboardEl) {
                    dashboardEl.classList.toggle('collapsed');
                    const isCollapsed = dashboardEl.classList.contains('collapsed');
                    const settings = getSettings();
                    const dashboardKey = targetId.replace('-dashboard', '');
                    if (!settings.dashboardsCollapsed) settings.dashboardsCollapsed = {};
                    settings.dashboardsCollapsed[dashboardKey] = isCollapsed;
                    saveSettings(settings);
                    const icon = button.querySelector('i');
                    if (icon) icon.className = isCollapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
                }
                break;
            }
            case ACTIONS.ADD_NEW_TYPE: {
                const input = document.getElementById('new-item-type');
                if (input && addType(input.value)) {
                    input.value = '';
                    renderSettingsPage(getSettings());
                }
                break;
            }
            case ACTIONS.DELETE_TYPE: {
                const typeName = button.dataset.typeName;
                openConfirmationModal({
                    title: 'Excluir Tipo de Item',
                    message: `Tem certeza que deseja excluir o tipo "${typeName}"?`,
                    onConfirm: () => {
                        if (deleteType(typeName)) {
                            renderSettingsPage(getSettings());
                            closeModal(MODAL_IDS.CONFIRMATION);
                        }
                    }
                });
                break;
            }
            case ACTIONS.DO_COUNT:
                openAdjustmentModal(id);
                break;
            case ACTIONS.QUICK_ADD_STOCK:
                openQuickEntryModal(ACTIONS.QUICK_ADD_STOCK, id);
                break;
            case ACTIONS.REPLACE_ITEM:
                openQuickEntryModal(ACTIONS.REPLACE_ITEM, id, button.dataset.quantity);
                break;
            case ACTIONS.MANAGE_MAINTENANCE:
                openItemMaintenanceModal(id);
                const maintenanceNotification = button.closest('.notification-item');
                if (maintenanceNotification) {
                    const alertData = JSON.parse(maintenanceNotification.dataset.alertData);
                    dismissNotificationById(alertData.id);
                }
                break;
            case ACTIONS.ADJUST_STOCK:
                openAdjustmentModal(id);
                break;
            case ACTIONS.REGISTER_LOSS:
                const itemToRegisterLoss = getItemById(id);
                if (itemToRegisterLoss && itemToRegisterLoss.type === 'Kit') {
                    openKitReturnModal(id, allocId);
                } else {
                    openLossRegistrationModal(id, allocId);
                }
                break;
            case ACTIONS.RETURN_ALLOCATION:
                const itemToReturn = getItemById(id);
                if (itemToReturn.type === 'Kit') {
                    openKitReturnModal(id, allocId);
                } else {
                    toggleButtonLoading(button, true);
                    setTimeout(() => {
                        if (returnAllocation(id, allocId)) {
                            createLog('RETURN_ALLOCATION', `Item ${itemToReturn?.name} devolvido.`, 'Usuário');
                            showToast('Item devolvido com sucesso!', 'success');
                            const allocationModal = document.getElementById(MODAL_IDS.ALLOCATION);
                            const updatedItem = getItemById(id);
                            if (allocationModal.open && updatedItem && updatedItem.allocations.length > 0) {
                                openAllocationModal(updatedItem);
                            } else {
                                closeModal(MODAL_IDS.ALLOCATION);
                            }
                            document.body.dispatchEvent(new CustomEvent('dataChanged'));
                        }
                        toggleButtonLoading(button, false);
                    }, 250);
                }
                break;
            case 'delete-batch':
                const itemId = button.dataset.itemId;
                const batchId = button.dataset.batchId;
                if (deleteBatchFromItem(itemId, batchId)) {
                    openItemBatchesModal(itemId);
                    document.body.dispatchEvent(new CustomEvent('dataChanged'));
                }
                break;
            case ACTIONS.SEND_SUMMARY_EMAIL:
                const sendEmailBtn = button;
                toggleButtonLoading(sendEmailBtn, true);
                sendSummaryEmail()
                    .finally(() => toggleButtonLoading(sendEmailBtn, false));
                break;
        }
    }

    function addEventListeners() {
        const debouncedUpdateDashboard = debounce((event) => updateDashboard(event), 250);
        document.body.addEventListener('dataChanged', debouncedUpdateDashboard);
        document.body.addEventListener('submit', handleFormSubmit);
        document.body.addEventListener('click', handleBodyClick);
        document.getElementById('backup-btn')?.addEventListener('click', backupData);
        document.getElementById('restore-btn')?.addEventListener('click', () => document.getElementById('restore-input').click());
        document.getElementById('restore-input')?.addEventListener('change', restoreData);

        window.addEventListener('scroll', closeAllFixedDropdowns);
        document.querySelectorAll('.modal-body').forEach(modalBody => {
            modalBody.addEventListener('scroll', closeAllFixedDropdowns);
        });

        document.body.addEventListener('filterFromChart', (event) => {
            const {
                filterType,
                filterValue
            } = event.detail;
            if (filterType === 'itemType') {
                const typeFilterSelect = document.getElementById('item-type-filter');
                if (typeFilterSelect) {
                    typeFilterSelect.value = filterValue;
                    itemTypeFilterState = filterValue;
                    document.body.dispatchEvent(new CustomEvent('dataChanged'));
                    showToast(`Filtro aplicado para o tipo: ${filterValue}`, 'info');
                }
            }
        });

        document.body.addEventListener('change', (event) => {
            if (event.target.matches('#item-type-filter, #almoxarifado-filter, #empresa-filter')) {
                itemTypeFilterState = document.getElementById('item-type-filter').value;
                almoxarifadoFilterState = document.getElementById('almoxarifado-filter').value;
                empresaFilterState = document.getElementById('empresa-filter').value;
                document.body.dispatchEvent(new CustomEvent('resetPage', {
                    detail: {
                        table: 'item'
                    }
                }));
                debouncedUpdateDashboard();
            }
            if (event.target.id === 'collaborator-empresa-filter') {
                collaboratorEmpresaFilterState = event.target.value;
                document.body.dispatchEvent(new CustomEvent('resetPage', {
                    detail: {
                        table: 'collaborator'
                    }
                }));
                debouncedUpdateDashboard();
            }
            if (event.target.id === 'item-form-type') {
                const itemType = event.target.value;
                const form = event.target.closest('form');
                const statusGroup = form.querySelector('[data-group="item-form-status"]');
                const shelfLifeGroup = form.querySelector('[data-group="item-form-shelfLife"]');
                const settings = getSettings();

                if (settings.returnableTypes.includes(itemType)) {
                    if (statusGroup) statusGroup.style.display = 'block';
                    if (form.elements.status.value === 'N/A') {
                        form.elements.status.value = 'Ativo';
                    }
                    if (shelfLifeGroup) shelfLifeGroup.style.display = 'none';
                } else {
                    if (statusGroup) statusGroup.style.display = 'none';
                    form.elements.status.value = 'N/A';
                    if (shelfLifeGroup) shelfLifeGroup.style.display = 'block';
                }
            }
            if (event.target.matches('.cart-quantity-input')) {
                const itemId = event.target.dataset.id;
                const newQuantity = parseInt(event.target.value, 10);
                updateItemQuantityInSession(itemId, newQuantity);
            }
        });

        const performSearch = () => {
            itemSearchTermState = document.getElementById('search-input')?.value || '';
            kitSearchTermState = document.getElementById('kit-search-input')?.value || '';
            collaboratorSearchTermState = document.getElementById('collaborator-search-input')?.value || '';
            debitSearchTermState = document.getElementById('debit-search-input')?.value || '';
            logSearchTermState = document.getElementById('log-search-input')?.value || '';
            osSearchTermState = document.getElementById('os-search-input')?.value || '';
            Object.keys(paginationState).forEach(table => {
                document.body.dispatchEvent(new CustomEvent('resetPage', { detail: { table } }));
            });
            updateDashboard();
        };


        document.body.addEventListener('keydown', (event) => {
            if (event.target.matches('.search-input') && event.key === 'Enter') {
                event.preventDefault();
                performSearch();
            }
        });


        document.body.addEventListener('click', (event) => {
            const searchButton = event.target.closest('#search-btn-icon, #collaborator-search-btn-icon, #kit-search-btn-icon, #debit-search-btn-icon, #os-search-btn-icon, #log-search-btn-icon');
            if (searchButton) {
                performSearch();
            }
        });



        document.body.addEventListener('mouseover', (event) => {
            const searchContainer = event.target.closest('.search-container');
            if (searchContainer) {
                searchContainer.classList.add('active');
            }
        });

        document.body.addEventListener('mouseout', (event) => {
            const searchContainer = event.target.closest('.search-container');
            if (searchContainer) {
                const input = searchContainer.querySelector('input');
                if (document.activeElement !== input) {
                    searchContainer.classList.remove('active');
                }
            }
        });

        document.body.addEventListener('focusout', (event) => {
            if (event.target.matches('.search-input')) {
                event.target.closest('.search-container').classList.remove('active');
            }
        });


        window.addEventListener('scroll', () => {
            const header = document.querySelector('.main-header');
            if (header) header.classList.toggle('scrolled', window.scrollY > 10);
        });

        document.body.addEventListener('batchSessionChanged', () => {
            renderFloatingActionButton();
            const cartModal = document.getElementById(MODAL_IDS.CART_CHECKOUT);
            if (cartModal && cartModal.open) {
                openCartCheckoutModal();
            }
        });
    }

    initializeApp();
});