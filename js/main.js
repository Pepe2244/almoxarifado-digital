document.addEventListener('DOMContentLoaded', () => {
    async function initializeApp() {
        try {
            await initializeDB();
            initializeSettings();
            const settings = getSettings();

            // CORREÇÃO APLICADA: Carrega o nome do almoxarifado no título
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

        itemSearchInput?.closest('.search-container')?.classList.toggle('filtering', itemSearchTerm !== '');
        kitSearchInput?.closest('.search-container')?.classList.toggle('filtering', kitSearchTerm !== '');
        collaboratorSearchInput?.closest('.search-container')?.classList.toggle('filtering', collaboratorSearchTerm !== '');
        debitSearchInput?.closest('.search-container')?.classList.toggle('filtering', debitSearchTerm !== '');
        logSearchInput?.closest('.search-container')?.classList.toggle('filtering', logSearchTerm !== '');
        osSearchInput?.closest('.search-container')?.classList.toggle('filtering', osSearchTerm !== '');

        const itemTypeFilter = document.getElementById('item-type-filter')?.value || itemTypeFilterState || 'all';

        let filteredItems = allItems.filter(item => {
            const isNotKit = item.type !== 'Kit';
            const matchesSearch = itemSearchTerm ?
                item.name.toLowerCase().includes(itemSearchTerm) ||
                item.type.toLowerCase().includes(itemSearchTerm) ||
                (item.location?.aisle || '').toLowerCase().includes(itemSearchTerm) :
                true;
            const matchesType = itemTypeFilter === 'all' || !itemTypeFilter ? true : item.type === itemTypeFilter;
            return isNotKit && matchesSearch && matchesType;
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
            return collaboratorSearchTerm ?
                c.name.toLowerCase().includes(collaboratorSearchTerm) ||
                (c.registration || '').toLowerCase().includes(collaboratorSearchTerm) :
                true;
        });

        const filteredDebits = allDebits.filter(debit => {
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

        renderItemsTable(filteredItems);
        renderKitsTable(filteredKits);
        renderCollaboratorsTable(filteredCollaborators);
        renderDebitsTable(debitsToDisplay, debitSearchTerm);
        renderServiceOrdersTable(filteredServiceOrders, osSearchTerm);
        renderAlerts(getAllAlerts());
        renderPredictiveCards('consumption-predictive-container', consumptionData);
        renderPredictiveCards('lifecycle-predictive-container', [...lifecycleData, ...maintenanceData]);
        renderLogsTable(filteredLogs, logSearchTerm);
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
        'os-add-item-form': handleOsItemAddForm
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
                    if (modalId && modalId !== MODAL_IDS.SETTINGS && modalId !== MODAL_IDS.ITEM_KIT && modalId !== MODAL_IDS.SERVICE_ORDER_DETAILS) {
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
        const imagePreview = document.getElementById('item-form-image-preview');
        const imageUrl = imagePreview.src.startsWith('data:') ? imagePreview.src : null;

        const itemDetails = {
            name: formData.get('name'),
            barcode: formData.get('barcode'),
            type: formData.get('type'),
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
            }
        }

        if (result) {
            setTimeout(() => {
                const row = document.querySelector(`tr[data-id="${result.id}"]`);
                if (row) {
                    // CORREÇÃO: Usa o evento 'animationend' para remover a classe.
                    const handleAnimationEnd = () => {
                        row.classList.remove('row-updated');
                        row.removeEventListener('animationend', handleAnimationEnd);
                    };
                    row.addEventListener('animationend', handleAnimationEnd);
                    row.classList.add('row-updated');
                }
            }, 100);
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
        const success = adjustStockCount(itemId, physicalCount, responsible);
        if (success) {
            createLog('ADJUST_STOCK', `Estoque de ${itemNameForLog} ajustado para ${physicalCount}.`, 'Usuário');
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

    function handleMassAddItemsForm(form) {
        const itemsRaw = form.elements['mass-add-data'].value.trim();
        const kitId = form.elements['kitId']?.value;
        if (!itemsRaw) {
            showToast('Nenhum item inserido.', 'info');
            return false;
        }

        const itemsToAdd = itemsRaw.split('\n')
            .map(name => ({
                name: name.trim(),
                type: 'Ferramenta'
            }))
            .filter(item => item.name);

        if (itemsToAdd.length > 0) {
            const result = addMultipleItems(itemsToAdd);

            if (kitId && result.addedItems && result.addedItems.length > 0) {
                let itemsAddedToKitCount = 0;
                result.addedItems.forEach(newItem => {
                    if (addItemToKit(kitId, newItem.id, 1)) {
                        itemsAddedToKitCount++;
                    }
                });

                if (itemsAddedToKitCount > 0) {
                    setTimeout(() => openKitManagementModal(kitId), 100);
                }
            }

            createLog('MASS_ADD_ITEMS', `${result.added} itens adicionados, ${result.ignored} ignorados.`, 'Usuário');

            let message = 'Operação concluída!';
            if (kitId && result.added > 0) {
                message += `\n${result.added} item(ns) foram criados e adicionados ao kit.`;
            }

            openConfirmationModal({
                title: 'Resultado do Cadastro em Massa',
                message: message,
                details: {
                    addedCount: result.added,
                    addedNames: result.addedNames,
                    ignoredCount: result.ignored,
                    ignoredNames: result.ignoredNames,
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
                name: name.trim()
            }))
            .filter(c => c.name);

        if (collaboratorsToAdd.length > 0) {
            const result = addMultipleCollaborators(collaboratorsToAdd);
            createLog('MASS_ADD_COLLABORATORS', `${result.added} colaboradores adicionados, ${result.ignored} ignorados.`, 'Usuário');

            openConfirmationModal({
                title: 'Resultado do Cadastro em Massa',
                message: `Operação concluída!`,
                details: {
                    addedCount: result.added,
                    addedNames: result.addedNames,
                    ignoredCount: result.ignored,
                    ignoredNames: result.ignoredNames,
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
            registration: form.elements['collaborator-registration'].value
        };
        const nameForLog = collaboratorDetails.name;

        let success = false;
        if (collaboratorId) {
            success = updateCollaborator(collaboratorId, collaboratorDetails);
            if (success) {
                createLog('UPDATE_COLLABORATOR', `Colaborador atualizado: ${nameForLog}`, 'Usuário');
                showToast('Colaborador atualizado!', 'success');
            }
        } else {
            const result = addCollaborator(collaboratorDetails);
            if (result) {
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
        const itemNameForLog = getItemById(itemId)?.name;
        const success = registerLoss(
            itemId,
            form.elements['loss-allocation-id'].value,
            form.elements['loss-reason'].value
        );
        if (success) {
            createLog('REGISTER_LOSS', `Perda registrada para o item ${itemNameForLog}.`, 'Usuário');
            showToast('Perda registrada e débito gerado!', 'success');
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
                    if (await handleItemForm(form)) {
                        closeModal(MODAL_IDS.ITEM_FORM);
                        document.body.dispatchEvent(new CustomEvent('dataChanged'));
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

            const getFilteredDataLength = (tableType) => {
                const allItems = getAllItems();
                const allCollaborators = getAllCollaborators();
                const allDebits = getAllDebits();
                const allLogs = getAllLogs();
                const allServiceOrders = getAllServiceOrders();

                switch (tableType) {
                    case 'item':
                        const itemSearchTerm = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
                        const itemTypeFilter = document.getElementById('item-type-filter')?.value || itemTypeFilterState || 'all';
                        return allItems.filter(item => {
                            const isNotKit = item.type !== 'Kit';
                            const matchesSearch = itemSearchTerm ?
                                item.name.toLowerCase().includes(itemSearchTerm) ||
                                item.type.toLowerCase().includes(itemSearchTerm) ||
                                (item.location?.aisle || '').toLowerCase().includes(itemSearchTerm) :
                                true;
                            const matchesType = itemTypeFilter === 'all' || !itemTypeFilter ? true : item.type === itemTypeFilter;
                            return isNotKit && matchesSearch && matchesType;
                        }).length;
                    case 'kit':
                        const kitSearchTerm = document.getElementById('kit-search-input')?.value.trim().toLowerCase() || '';
                        return allItems.filter(item => {
                            const isKit = item.type === 'Kit';
                            const matchesSearch = kitSearchTerm ? item.name.toLowerCase().includes(kitSearchTerm) : true;
                            return isKit && matchesSearch;
                        }).length;
                    case 'collaborator':
                        const collaboratorSearchTerm = document.getElementById('collaborator-search-input')?.value.trim().toLowerCase() || '';
                        return allCollaborators.filter(c => collaboratorSearchTerm ? c.name.toLowerCase().includes(collaboratorSearchTerm) || (c.registration || '').toLowerCase().includes(collaboratorSearchTerm) : true).length;
                    case 'debit':
                        const debitSearchTerm = document.getElementById('debit-search-input')?.value.trim().toLowerCase() || '';
                        return allDebits.filter(debit => {
                            const collaboratorName = getCollaboratorById(debit.collaboratorId)?.name || '';
                            return debitSearchTerm ? collaboratorName.toLowerCase().includes(debitSearchTerm) || debit.itemName.toLowerCase().includes(debitSearchTerm) || debit.reason.toLowerCase().includes(debitSearchTerm) : true;
                        }).length;
                    case 'serviceOrder':
                        const osSearchTerm = document.getElementById('os-search-input')?.value.trim().toLowerCase() || '';
                        return allServiceOrders.filter(os => {
                            const technicianName = getCollaboratorById(os.technicianId)?.name || '';
                            return osSearchTerm ?
                                os.id.toLowerCase().includes(osSearchTerm) ||
                                os.customer.toLowerCase().includes(osSearchTerm) ||
                                technicianName.toLowerCase().includes(osSearchTerm) :
                                true;
                        }).length;
                    case 'log':
                        const logSearchTerm = document.getElementById('log-search-input')?.value.trim().toLowerCase() || '';
                        return allLogs.filter(log => logSearchTerm ? log.action.toLowerCase().includes(logSearchTerm) || log.details.toLowerCase().includes(logSearchTerm) || log.user.toLowerCase().includes(logSearchTerm) : true).length;
                    case 'consumption':
                        {
                            const allPredictiveData = generateUnifiedPredictiveAnalysis();
                            return allPredictiveData.filter(d => d.predictionType === 'consumption').length;
                        }
                    case 'lifecycle':
                        {
                            const allPredictiveData = generateUnifiedPredictiveAnalysis();
                            const lifecycleData = allPredictiveData.filter(d => d.predictionType === 'lifecycle');
                            const maintenanceData = allPredictiveData.filter(d => d.predictionType === 'maintenance');
                            return lifecycleData.length + maintenanceData.length;
                        }
                    default:
                        return 0;
                }
            };

            document.body.dispatchEvent(new CustomEvent('changePage', {
                detail: {
                    table,
                    direction,
                    totalItems: getFilteredDataLength(table)
                }
            }));
            return;
        }

        if (action === 'toggle-actions-dropdown') {
            const container = button.closest('.actions-dropdown-container');
            if (container) {
                const dropdownContent = container.querySelector('.actions-dropdown-content');
                const isHidden = dropdownContent.classList.contains('hidden');

                const currentlyOpen = document.querySelector('.actions-dropdown-content.fixed-dropdown');
                if (currentlyOpen && currentlyOpen !== dropdownContent) {
                    closeAllFixedDropdowns();
                }

                if (isHidden) {
                    dropdownContent.classList.remove('hidden');
                    dropdownContent.classList.add('fixed-dropdown');
                    const rect = button.getBoundingClientRect();

                    let calculatedLeft = rect.left;
                    const dropdownWidth = dropdownContent.offsetWidth;
                    const dropdownHeight = dropdownContent.offsetHeight;

                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    const topOffset = 5;

                    if (calculatedLeft + dropdownWidth > viewportWidth - 10) {
                        calculatedLeft = viewportWidth - dropdownWidth - 10;
                    }
                    if (calculatedLeft < 10) {
                        calculatedLeft = 10;
                    }

                    let calculatedTop = rect.bottom + topOffset;
                    if (calculatedTop + dropdownHeight > viewportHeight - 10) {
                        calculatedTop = rect.top - dropdownHeight - topOffset;
                        if (calculatedTop < 10) {
                            calculatedTop = 10;
                            dropdownContent.style.maxHeight = `${viewportHeight - 20}px`;
                        }
                    }

                    dropdownContent.style.top = `${calculatedTop}px`;
                    dropdownContent.style.left = `${calculatedLeft}px`;

                } else {
                    dropdownContent.classList.add('hidden');
                    dropdownContent.classList.remove('fixed-dropdown');
                    dropdownContent.style.top = '';
                    dropdownContent.style.left = '';
                    dropdownContent.style.maxHeight = '';
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
            [ACTIONS.CANCEL_QUICK_ENTRY]: MODAL_IDS.QUICK_ENTRY,
            [ACTIONS.CANCEL_CONFIRMATION]: MODAL_IDS.CONFIRMATION,
            [ACTIONS.CLOSE_ALLOCATION]: MODAL_IDS.ALLOCATION,
            [ACTIONS.CANCEL_BARCODE_ACTION]: MODAL_IDS.BARCODE_ACTION,
            [ACTIONS.CANCEL_KIT_MANAGEMENT]: MODAL_IDS.ITEM_KIT,
            [ACTIONS.CANCEL_KIT_RETURN]: MODAL_IDS.KIT_RETURN,
            [ACTIONS.CANCEL_SERVICE_ORDER]: MODAL_IDS.SERVICE_ORDER,
            [ACTIONS.CANCEL_SERVICE_ORDER_DETAILS]: MODAL_IDS.SERVICE_ORDER_DETAILS
        };
        if (modalActions[action]) {
            closeModal(modalActions[action]);
            return;
        }
        const id = button.dataset.id;
        const allocId = button.dataset.allocId;
        switch (action) {
            case ACTIONS.REMOVE_ITEM_FROM_OS:
                {
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
            case ACTIONS.MASS_ADD_FROM_KIT:
                {
                    const kitModal = document.getElementById(MODAL_IDS.ITEM_KIT);
                    const kitId = kitModal?.querySelector('#kit-item-id')?.value;
                    openMassAddModal({ kitId: kitId });
                    break;
                }
            case 'remove-kit-item':
                {
                    const kitId = button.dataset.kitId;
                    const componentId = button.dataset.componentId;
                    if (removeItemFromKit(kitId, componentId)) {
                        showToast("Item removido do kit.", "success");
                        openKitManagementModal(kitId);
                        document.body.dispatchEvent(new CustomEvent('dataChanged'));
                    }
                    break;
                }
            case 'hide-panel':
                {
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
            case ACTIONS.MANAGE_ALLOCATIONS:
                {
                    const item = getItemById(id);
                    if (item) {
                        openAllocationModal(item);
                    }
                    break;
                }
            case ACTIONS.DISMISS_MANUAL_ALERT:
                {
                    const notificationItemToDismiss = button.closest('.notification-item');
                    if (notificationItemToDismiss && notificationItemToDismiss.dataset.alertData) {
                        const alertData = JSON.parse(notificationItemToDismiss.dataset.alertData);
                        dismissNotificationById(alertData.id);
                    }
                    break;
                }
            case ACTIONS.CLEAR_ALL_NOTIFICATIONS:
                {
                    dismissAllNotifications();
                    break;
                }
            case ACTIONS.TOGGLE_DASHBOARD:
                {
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
            case ACTIONS.ADD_NEW_TYPE:
                {
                    const input = document.getElementById('new-item-type');
                    if (input && addType(input.value)) {
                        input.value = '';
                        renderSettingsPage(getSettings());
                    }
                    break;
                }
            case ACTIONS.DELETE_TYPE:
                {
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

    function closeAllFixedDropdowns() {
        const openDropdowns = document.querySelectorAll('.actions-dropdown-content.fixed-dropdown');
        openDropdowns.forEach(dropdownContent => {
            dropdownContent.classList.add('hidden');
            dropdownContent.classList.remove('fixed-dropdown');
            dropdownContent.style.top = '';
            dropdownContent.style.left = '';
            dropdownContent.style.maxHeight = '';
        });
    }

    function addEventListeners() {
        const debouncedUpdateDashboard = debounce(updateDashboard, 50);
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

        document.body.addEventListener('change', (event) => {
            if (event.target.matches('#item-type-filter')) {
                itemTypeFilterState = event.target.value;
                document.body.dispatchEvent(new CustomEvent('resetPage', {
                    detail: {
                        table: 'item'
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
        });

        const debouncedSearch = debounce(() => {
            document.body.dispatchEvent(new CustomEvent('resetPage', {
                detail: {
                    table: 'item'
                }
            }));
            document.body.dispatchEvent(new CustomEvent('resetPage', {
                detail: {
                    table: 'kit'
                }
            }));
            document.body.dispatchEvent(new CustomEvent('resetPage', {
                detail: {
                    table: 'collaborator'
                }
            }));
            document.body.dispatchEvent(new CustomEvent('resetPage', {
                detail: {
                    table: 'debit'
                }
            }));
            document.body.dispatchEvent(new CustomEvent('resetPage', {
                detail: {
                    table: 'log'
                }
            }));
            document.body.dispatchEvent(new CustomEvent('resetPage', {
                detail: {
                    table: 'serviceOrder'
                }
            }));
            debouncedUpdateDashboard();
        }, 300);

        document.body.addEventListener('input', (event) => {
            if (event.target.matches('#search-input, #collaborator-search-input, #debit-search-input, #log-search-input, #kit-search-input, #os-search-input')) {
                debouncedSearch();
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
    }

    initializeApp();
});