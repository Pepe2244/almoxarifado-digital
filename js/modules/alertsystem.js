function getLowStockItems() {
    const allItems = getAllItems();
    const lowStockAlerts = [];
    allItems.forEach(item => {
        if (item.minStock > 0 && item.currentStock <= item.minStock) {
            lowStockAlerts.push({
                id: `low_stock_${item.id}`,
                type: ALERT_TYPES.LOW_STOCK,
                message: `Estoque de ${item.name} está baixo! Apenas ${item.currentStock} unidade(s) restante(s).`,
                itemId: item.id,
                severity: 'critical'
            });
        }
    });
    return lowStockAlerts;
}

function getPriceVariationAlerts() {
    const allItems = getAllItems();
    const settings = getSettings();
    const alerts = [];
    const priceThreshold = settings.priceVariationPercentage || 10;
    allItems.forEach(item => {
        if (item.priceHistory && item.priceHistory.length >= 2) {
            const latestPriceUpdate = item.priceHistory[item.priceHistory.length - 1];
            const previousPriceUpdate = item.priceHistory[item.priceHistory.length - 2];
            const latestPrice = latestPriceUpdate.price;
            const previousPrice = previousPriceUpdate.price;

            if (previousPrice > 0) {
                const percentageChange = ((latestPrice - previousPrice) / previousPrice) * 100;
                if (Math.abs(percentageChange) >= priceThreshold) {
                    alerts.push({
                        id: `price_var_${item.id}_${new Date(latestPriceUpdate.date).getTime()}`,
                        type: ALERT_TYPES.PRICE_VARIATION,
                        message: `Preço de ${item.name} variou ${percentageChange.toFixed(2)}% (de R$${previousPrice.toFixed(2)} para R$${latestPrice.toFixed(2)})`,
                        itemId: item.id,
                        severity: 'medium'
                    });
                }
            }
        }
    });
    return alerts;
}

function getPredictiveAlerts(predictiveData) {
    const dataToProcess = predictiveData || generateUnifiedPredictiveAnalysis();
    const alerts = [];
    const settings = getSettings();
    const {
        critical,
        warning
    } = settings.predictiveAlertLevels;

    dataToProcess.forEach(data => {
        if (data.predictionType === 'consumption') {
            if (data.daysOfStockLeft <= critical) {
                alerts.push({
                    id: `predict_cons_${data.itemId}`,
                    type: ALERT_TYPES.PREDICTIVE,
                    message: `Consumo: ${data.name} pode durar apenas mais ${data.daysOfStockLeft} dias.`,
                    itemId: data.itemId,
                    severity: 'critical',
                    relatedTo: 'consumption'
                });
            } else if (data.daysOfStockLeft <= warning) {
                alerts.push({
                    id: `predict_cons_${data.itemId}`,
                    type: ALERT_TYPES.PREDICTIVE,
                    message: `Consumo: ${data.name} pode durar cerca de ${data.daysOfStockLeft} dias.`,
                    itemId: data.itemId,
                    severity: 'low',
                    relatedTo: 'consumption'
                });
            }
        } else if (data.predictionType === 'lifecycle') {
            if (data.remainingDays <= 0) {
                alerts.push({
                    id: `predict_life_${data.batchId}`,
                    type: ALERT_TYPES.VALIDITY_EXPIRED,
                    message: `${data.name} (Lote) está vencido há ${-data.remainingDays} dia(s)!`,
                    itemId: data.itemId,
                    batchId: data.batchId,
                    severity: 'critical',
                    relatedTo: 'lifecycle',
                    quantity: getBatchQuantity(data.itemId, data.batchId)
                });
            } else if (data.remainingDays <= warning) {
                alerts.push({
                    id: `predict_life_${data.batchId}`,
                    type: ALERT_TYPES.VALIDITY_WARNING,
                    message: `${data.name} (Lote) vencerá em ${data.remainingDays} dias.`,
                    itemId: data.itemId,
                    batchId: data.batchId,
                    severity: 'medium',
                    relatedTo: 'lifecycle'
                });
            }
        } else if (data.predictionType === 'maintenance') {
            if (data.remainingDays <= 0) {
                alerts.push({
                    id: `predict_maint_${data.itemId}`,
                    type: ALERT_TYPES.MAINTENANCE_NEEDED,
                    message: `Manutenção de ${data.name} está vencida há ${-data.remainingDays} dia(s)!`,
                    itemId: data.itemId,
                    severity: 'critical',
                    relatedTo: 'maintenance'
                });
            } else if (data.remainingDays <= warning) {
                alerts.push({
                    id: `predict_maint_${data.itemId}`,
                    type: ALERT_TYPES.MAINTENANCE_NEEDED,
                    message: `Manutenção de ${data.name} será necessária em ${data.remainingDays} dias.`,
                    itemId: data.itemId,
                    severity: 'medium',
                    relatedTo: 'maintenance'
                });
            }
        }
    });
    return alerts;
}

function getBackupReminderAlerts() {
    const alerts = [];
    const settings = getSettings();
    if (!settings.backupReminder) return alerts;

    const {
        lastBackupDate,
        frequencyDays
    } = settings.backupReminder;
    if (!frequencyDays || frequencyDays <= 0) return alerts;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let message = '';

    if (!lastBackupDate) {
        message = 'Backup inicial recomendado! Garanta a segurança dos seus dados.';
    } else {
        const lastBackup = new Date(lastBackupDate);
        const lastBackupDay = new Date(lastBackup.getFullYear(), lastBackup.getMonth(), lastBackup.getDate());

        const daysSinceLastBackup = Math.floor((today.getTime() - lastBackupDay.getTime()) / (1000 * 3600 * 24));

        if (daysSinceLastBackup >= frequencyDays) {
            message = `Seu último backup foi há ${daysSinceLastBackup} dia(s). Faça um novo backup!`;
        }
    }

    if (message) {
        alerts.push({
            id: `backup_reminder_${today.toISOString().split('T')[0]}`,
            type: ALERT_TYPES.BACKUP_REMINDER,
            message: message,
            severity: 'high'
        });
    }

    return alerts;
}


function getBatchQuantity(itemId, batchId) {
    const item = getItemById(itemId);
    const batch = item?.batches?.find(b => b.batchId === batchId);
    return batch?.quantity || 0;
}

function getPendingCountAlerts() {
    const allItems = getAllItems();
    const alerts = [];
    const settings = getSettings();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    allItems.forEach(item => {
        const typeFrequency = settings.countFrequency[item.type];
        if (typeFrequency && typeFrequency > 0) {
            const lastCountRecord = item.history
                .filter(h => h.type === ACTIONS.HISTORY_ADJUSTMENT)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

            if (!lastCountRecord) {
                alerts.push({
                    id: `initial_count_${item.id}`,
                    type: ALERT_TYPES.PENDING_COUNT,
                    message: `Contagem Inicial: ${item.name} precisa de verificação.`,
                    itemId: item.id,
                    severity: 'medium'
                });
            } else {
                const lastCountDate = new Date(lastCountRecord.timestamp);
                const lastCountDay = new Date(lastCountDate.getFullYear(), lastCountDate.getMonth(), lastCountDate.getDate());

                const daysSinceLastCount = Math.floor((today.getTime() - lastCountDay.getTime()) / (1000 * 3600 * 24));

                if (daysSinceLastCount >= typeFrequency) {
                    alerts.push({
                        id: `pending_count_${item.id}`,
                        type: ALERT_TYPES.PENDING_COUNT,
                        message: `Contagem Cíclica: ${item.name} precisa de verificação (última há ${daysSinceLastCount} dias).`,
                        itemId: item.id,
                        severity: 'low'
                    });
                }
            }
        }
    });
    return alerts;
}

function getShelfLifeAlerts(predictiveData) {
    return getPredictiveAlerts(predictiveData).filter(alert =>
        alert.type === ALERT_TYPES.VALIDITY_EXPIRED || alert.type === ALERT_TYPES.VALIDITY_WARNING
    );
}

function getPriceCheckReminders() {
    const allItems = getAllItems();
    const alerts = [];
    const settings = getSettings();
    const priceCheckFrequency = settings.priceCheckFrequency;

    if (!priceCheckFrequency || priceCheckFrequency <= 0) {
        return alerts;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    allItems.forEach(item => {
        const lastUpdateRecord = item.priceHistory && item.priceHistory.length > 0 ?
            item.priceHistory[item.priceHistory.length - 1] :
            {
                date: item.createdAt
            };

        const lastUpdate = new Date(lastUpdateRecord.date);
        const lastUpdateDay = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());

        const daysSinceLastPriceCheck = Math.floor((today.getTime() - lastUpdateDay.getTime()) / (1000 * 3600 * 24));

        if (daysSinceLastPriceCheck >= priceCheckFrequency) {
            alerts.push({
                id: `price_check_${item.id}`,
                type: ALERT_TYPES.PRICE_CHECK_REMINDER,
                message: `Verificar preço de ${item.name}. Última verificação há ${daysSinceLastPriceCheck} dias.`,
                itemId: item.id,
                severity: 'low'
            });
        }
    });
    return alerts;
}

function getMaintenanceAlerts(predictiveData) {
    return getPredictiveAlerts(predictiveData).filter(alert =>
        alert.type === ALERT_TYPES.MAINTENANCE_NEEDED
    );
}

function getAllAlerts() {
    const predictiveData = generateUnifiedPredictiveAnalysis();
    const persistentNotifications = loadDataFromLocal(DB_KEYS.PERSISTENT_ALERTS) || [];

    return [
        ...persistentNotifications,
        ...getLowStockItems(),
        ...getPriceVariationAlerts(),
        ...getPredictiveAlerts(predictiveData),
        ...getPendingCountAlerts(),
        ...getPriceCheckReminders(),
        ...getBackupReminderAlerts()
    ];
}

function dismissNotificationById(alertId) {
    const dismissedAlerts = loadDataFromLocal(DB_KEYS.DISMISSED_TEMPORARY_ALERTS) || {};
    if (!dismissedAlerts[alertId]) {
        dismissedAlerts[alertId] = {
            dismissedAt: new Date().toISOString()
        };
        saveDataToLocal(DB_KEYS.DISMISSED_TEMPORARY_ALERTS, dismissedAlerts);
        createLog('DISMISS_NOTIFICATION', `Notificação dispensada: ${alertId}`, 'Usuário');
        document.body.dispatchEvent(new CustomEvent('dataChanged'));
    }
}

function dismissAllNotifications() {
    const dismissedAlerts = loadDataFromLocal(DB_KEYS.DISMISSED_TEMPORARY_ALERTS) || {};
    const settings = getSettings();
    const behaviors = settings.notificationBehaviors || {};

    const allCurrentAlerts = getAllAlerts();

    let dismissedCount = 0;
    allCurrentAlerts.forEach(alert => {
        if (behaviors[alert.type] === 'info' && !dismissedAlerts[alert.id]) {
            dismissedAlerts[alert.id] = {
                dismissedAt: new Date().toISOString()
            };
            dismissedCount++;
        }
    });

    if (dismissedCount > 0) {
        saveDataToLocal(DB_KEYS.DISMISSED_TEMPORARY_ALERTS, dismissedAlerts);
        showToast(`${dismissedCount} notificaç${dismissedCount > 1 ? 'ões' : 'ão'} informativas limpas.`, 'success');
        createLog('CLEAR_NOTIFICATIONS', `${dismissedCount} notificações informativas foram limpas.`, 'Usuário');
    } else {
        showToast('Nenhuma notificação informativa para limpar.', 'info');
    }
    document.body.dispatchEvent(new CustomEvent('dataChanged'));
}