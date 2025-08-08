import { getAllItems } from './itemManager.js';
import { getSettings } from './settings.js';

function generateLowStockAlerts() {
    const items = getAllItems();
    const alerts = [];
    items.forEach(item => {
        if (item.minStock > 0 && item.currentStock < item.minStock) {
            alerts.push({
                id: `lowstock-${item.id}`,
                type: 'warning',
                title: 'Stock Baixo',
                message: `O item "${item.name}" está com stock baixo (${item.currentStock}/${item.minStock}).`,
                itemId: item.id
            });
        }
    });
    return alerts;
}

function generateExpiryAlerts() {
    const items = getAllItems();
    const settings = getSettings();
    const criticalThreshold = settings.predictiveAlertLevels?.critical || 7;
    const warningThreshold = settings.predictiveAlertLevels?.warning || 30;
    const alerts = [];

    items.forEach(item => {
        if (item.batches && item.batches.length > 0) {
            item.batches.forEach(batch => {
                if (batch.expiryDate) {
                    const daysRemaining = (new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
                    if (daysRemaining <= warningThreshold) {
                        alerts.push({
                            id: `expiry-${item.id}-${batch.id}`,
                            type: daysRemaining <= criticalThreshold ? 'error' : 'warning',
                            title: 'Item a Expirar',
                            message: `Lote do item "${item.name}" expira em ${Math.ceil(daysRemaining)} dias.`,
                            itemId: item.id,
                            batchId: batch.id
                        });
                    }
                }
            });
        }
    });
    return alerts;
}

function generateBackupReminderAlert() {
    const settings = getSettings();
    const lastBackup = settings.backupReminder?.lastBackup;
    const frequencyDays = settings.backupReminder?.frequencyDays || 7;

    if (lastBackup) {
        const daysSinceBackup = (new Date() - new Date(lastBackup)) / (1000 * 60 * 60 * 24);
        if (daysSinceBackup > frequencyDays) {
            return [{
                id: 'backup-reminder',
                type: 'info',
                title: 'Lembrete de Backup',
                message: `Já passaram mais de ${frequencyDays} dias desde o seu último backup.`
            }];
        }
    } else {
        return [{
            id: 'backup-reminder',
            type: 'info',
            title: 'Lembrete de Backup',
            message: `Considere fazer o seu primeiro backup para segurança dos dados.`
        }];
    }
    return [];
}


function getAllAlerts() {
    const lowStockAlerts = generateLowStockAlerts();
    const expiryAlerts = generateExpiryAlerts();
    const backupAlert = generateBackupReminderAlert();
    return [...lowStockAlerts, ...expiryAlerts, ...backupAlert];
}

export { getAllAlerts };
