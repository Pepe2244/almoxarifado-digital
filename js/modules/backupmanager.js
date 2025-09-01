// almoxarifado-digital/js/modules/backupManager.js
async function backupData() {
    try {
        const allItems = getAllItems();
        const itemsWithImagesPromises = allItems.map(async item => {
            if (item.hasImage) {
                try {
                    const imageData = await loadImage(item.id);
                    return {
                        ...item,
                        imageDataUrl: imageData // Adiciona a imagem em Base64 ao objeto
                    };
                } catch (error) {
                    console.error(`Falha ao carregar imagem para o item ${item.id}:`, error);
                    return { ...item,
                        imageDataUrl: null
                    };
                }
            }
            return item;
        });

        const itemsWithImages = await Promise.all(itemsWithImagesPromises);

        const data = {
            _version: '1.1.1',
            items: itemsWithImages,
            collaborators: loadDataFromLocal(DB_KEYS.COLLABORATORS),
            debits: loadDataFromLocal(DB_KEYS.DEBITS),
            logs: loadDataFromLocal(DB_KEYS.LOGS),
            settings: loadDataFromLocal(DB_KEYS.SETTINGS),
            persistentAlerts: loadDataFromLocal(DB_KEYS.PERSISTENT_ALERTS),
            dismissedTemporaryAlerts: loadDataFromLocal(DB_KEYS.DISMISSED_TEMPORARY_ALERTS),
            serviceOrders: loadDataFromLocal(DB_KEYS.SERVICE_ORDERS)
        };

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `almoxarifado_backup_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const settings = getSettings();
        if (!settings.backupReminder) {
            settings.backupReminder = {};
        }
        settings.backupReminder.lastBackupDate = new Date().toISOString();
        saveSettings(settings);

        showToast("Backup criado com sucesso!", "success");
        createLog('BACKUP_DATA', 'Backup completo dos dados realizado.', 'Usuário');
        document.body.dispatchEvent(new CustomEvent('dataChanged'));
    } catch (error) {
        console.error("Erro ao criar backup:", error);
        showToast("Falha ao criar backup. Verifique o console.", "error");
        createLog('BACKUP_FAILURE', `Falha ao criar backup: ${error.message}`, 'Sistema');
    }
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.items && data.collaborators && data.debits && data.settings) {
                openConfirmationModal({
                    title: 'Restaurar Backup',
                    message: `Tem certeza que deseja restaurar este backup? Isso substituirá TODOS os seus dados atuais.`,
                    onConfirm: async () => {
                        const itemsToSave = data.items.map(item => {
                            if (item.imageDataUrl) {
                                saveImage(item.id, item.imageDataUrl).catch(err => {
                                    console.error(`Falha ao restaurar imagem para o item ${item.id}`, err);
                                    showToast(`Aviso: Falha ao restaurar imagem do item ${item.name}.`, 'warning');
                                });
                                delete item.imageDataUrl; // Remove a URL Base64 para não sobrecarregar o localStorage
                            }
                            return item;
                        });

                        saveDataToLocal(DB_KEYS.ITEMS, itemsToSave);
                        saveDataToLocal(DB_KEYS.COLLABORATORS, data.collaborators);
                        saveDataToLocal(DB_KEYS.DEBITS, data.debits);
                        saveDataToLocal(DB_KEYS.LOGS, data.logs || []);
                        saveDataToLocal(DB_KEYS.SETTINGS, data.settings);
                        saveDataToLocal(DB_KEYS.PERSISTENT_ALERTS, data.persistentAlerts || []);
                        saveDataToLocal(DB_KEYS.DISMISSED_TEMPORARY_ALERTS, data.dismissedTemporaryAlerts || {});
                        saveDataToLocal(DB_KEYS.SERVICE_ORDERS, data.serviceOrders || []);

                        showToast("Dados restaurados com sucesso! Recarregando a página...", "success");
                        createLog('RESTORE_DATA', 'Dados restaurados a partir de um backup.', 'Usuário');
                        setTimeout(() => window.location.reload(), 1500);
                    }
                });
            } else {
                showToast("Arquivo de backup inválido. Estrutura de dados incorreta.", "error");
                createLog('RESTORE_FAILURE', 'Tentativa de restauração com arquivo de backup inválido (estrutura).', 'Usuário');
            }
        } catch (error) {
            console.error("Erro ao ler ou analisar arquivo de backup:", error);
            showToast("Erro ao ler arquivo de backup. Certifique-se de que é um JSON válido.", "error");
            createLog('RESTORE_FAILURE', `Falha ao restaurar backup: ${error.message}`, 'Usuário');
        }
    };
    reader.readAsText(file);
}