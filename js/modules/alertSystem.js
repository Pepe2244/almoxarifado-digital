import { getAllItems } from './itemManager.js';
import { getSettings } from './settings.js';

// Define os tipos de alerta para que possamos nos referir a eles de forma consistente
export const ALERT_TYPES = {
    LOW_STOCK: { id: 'low_stock', title: 'Estoque Baixo' },
    EXPIRY_WARNING: { id: 'expiry_warning', title: 'Item Próximo ao Vencimento' },
    ITEM_EXPIRED: { id: 'item_expired', title: 'Item Vencido' },
    BACKUP_REMINDER: { id: 'backup_reminder', title: 'Lembrete de Backup' },
    MAINTENANCE_DUE: { id: 'maintenance_due', title: 'Manutenção Necessária' },
    PRICE_CHECK_DUE: { id: 'price_check_due', title: 'Verificação de Preço Necessária' },
    STOCK_COUNT_DUE: { id: 'stock_count_due', title: 'Contagem de Estoque Necessária' },
};


function generateLowStockAlerts() {
    const items = getAllItems();
    const alerts = [];
    items.forEach(item => {
        if (item.min_stock > 0 && item.current_stock < item.min_stock) {
            alerts.push({
                id: `${ALERT_TYPES.LOW_STOCK.id}-${item.id}`,
                type: 'warning',
                title: ALERT_TYPES.LOW_STOCK.title,
                message: `O item "${item.name}" está com estoque baixo (${item.current_stock}/${item.min_stock}).`,
                itemId: item.id,
                action: 'quick-add-stock' // Ação para abrir um modal de entrada rápida
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
                id: ALERT_TYPES.BACKUP_REMINDER.id,
                type: 'info',
                title: ALERT_TYPES.BACKUP_REMINDER.title,
                message: `Já passaram mais de ${frequencyDays} dias desde o seu último backup.`,
                action: 'do-backup' // Ação para iniciar o backup
            }];
        }
    } else {
        return [{
            id: ALERT_TYPES.BACKUP_REMINDER.id,
            type: 'info',
            title: ALERT_TYPES.BACKUP_REMINDER.title,
            message: `Considere fazer o seu primeiro backup para segurança dos dados.`,
            action: 'do-backup'
        }];
    }
    return [];
}


function getAllAlerts() {
    // No futuro, outras funções de alerta (vencimento, contagem) serão adicionadas aqui
    const lowStockAlerts = generateLowStockAlerts();
    const backupAlert = generateBackupReminderAlert();
    return [...lowStockAlerts, ...backupAlert];
}


// Função para remover alertas que não são importantes
function clearDismissibleAlerts() {
    const settings = getSettings();
    const allAlerts = getAllAlerts();

    // Filtra, mantendo apenas os alertas marcados como "ação necessária" nas configurações
    const importantAlerts = allAlerts.filter(alert => {
        const alertTypeId = alert.id.split('-')[0]; // Pega o tipo base, ex: 'low_stock'
        return settings.notificationBehaviors[alertTypeId] === true;
    });

    return importantAlerts;
}

export { getAllAlerts, clearDismissibleAlerts };