import {
    DB_KEYS,
    ACTIONS,
    ALERT_TYPES
} from '../constants.js';
import {
    getData,
    saveData
} from './dataHandler.js';
import {
    settings
} from './settings.js';
import {
    getItemById
} from './itemManager.js';
import {
    formatCurrency
} from './utils.js';

let notifications = [];

function initializeNotificationManager() {
    notifications = getData(DB_KEYS.PERSISTENT_ALERTS) || [];
    renderNotifications();
    updateBadge();
}

function add(type, message, relatedId, isActionable = false) {
    const newNotification = {
        id: `notif_${new Date().getTime()}_${Math.random()}`,
        type,
        message,
        relatedId,
        timestamp: new Date().toISOString(),
        isRead: false,
        isActionable: isActionable || (settings.notificationBehaviors && !settings.notificationBehaviors[type]?.dismissible)
    };

    notifications.unshift(newNotification);
    saveData(DB_KEYS.PERSISTENT_ALERTS, notifications);
    renderNotifications();
    updateBadge();
}

function remove(notificationId) {
    notifications = notifications.filter(n => n.id !== notificationId);
    saveData(DB_KEYS.PERSISTENT_ALERTS, notifications);
    renderNotifications();
    updateBadge();
}

function clearAll() {
    notifications = notifications.filter(n => n.isActionable);
    saveData(DB_KEYS.PERSISTENT_ALERTS, notifications);
    renderNotifications();
    updateBadge();
}

function updateBadge() {
    const badge = document.getElementById('notification-count-badge');
    const unreadCount = notifications.filter(n => !n.isRead).length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderNotifications() {
    const panel = document.getElementById('notification-panel');
    if (!panel) return;

    if (notifications.length === 0) {
        panel.innerHTML = '<div class="notification-item empty">Nenhuma notificação.</div>';
        return;
    }

    let html = notifications.map(notification => {
        let icon, title, actionHtml = '',
            action = null;

        switch (notification.type) {
            case ALERT_TYPES.LOW_STOCK:
                icon = 'fa-box-open';
                title = 'Estoque Baixo';
                action = ACTIONS.QUICK_ADD_STOCK;
                break;
            case ALERT_TYPES.PENDING_COUNT:
                icon = 'fa-tasks';
                title = 'Contagem Pendente';
                action = ACTIONS.DO_COUNT;
                break;
            case ALERT_TYPES.BACKUP_REMINDER:
                icon = 'fa-save';
                title = 'Lembrete de Backup';
                action = ACTIONS.DO_BACKUP;
                break;
            case ALERT_TYPES.SIGNED_RECEIPT:
                icon = 'fa-signature';
                title = 'Comprovante Assinado';
                action = ACTIONS.PRINT_SIGNED_RECEIPT;
                notification.isActionable = true;
                break;
        }

        if (notification.isActionable && action) {
            actionHtml = `<button class="btn btn-primary btn-sm notification-action" data-action="${action}" data-related-id="${notification.relatedId}" data-notification-id="${notification.id}">Verificar</button>`;
        }

        return `
            <div class="notification-item ${notification.isRead ? 'read' : ''}" data-id="${notification.id}">
                <div class="notification-icon"><i class="fas ${icon}"></i></div>
                <div class="notification-content">
                    <div class="notification-header">
                        <strong>${title}</strong>
                        <span class="notification-time">${new Date(notification.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    <p class="notification-message">${notification.message}</p>
                    <div class="notification-actions">
                        ${actionHtml}
                        ${!notification.isActionable ? `<button class="btn btn-secondary btn-sm" data-action="${ACTIONS.DISMISS_MANUAL_ALERT}" data-notification-id="${notification.id}">Dispensar</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const clearButton = notifications.some(n => !n.isActionable) ?
        `<div class="notification-footer"><button class="btn btn-link" data-action="${ACTIONS.CLEAR_ALL_NOTIFICATIONS}">Limpar não acionáveis</button></div>` :
        '';

    panel.innerHTML = `
        <div class="notification-panel-header">
            <h3>Notificações</h3>
        </div>
        <div class="notification-list">
            ${html}
        </div>
        ${clearButton}
    `;
}

export {
    initializeNotificationManager,
    add as addNotification,
    remove as removeNotification,
    clearAll as clearAllNotifications
};