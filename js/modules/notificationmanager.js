let notifications = [];

function initializeNotificationManager() {
    notifications = loadDataFromLocal(DB_KEYS.PERSISTENT_ALERTS) || [];
    renderNotifications();
    updateBadge();
}

function addNotification(type, message, relatedId, isActionable = false) {
    const settings = getSettings();
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
    saveDataToLocal(DB_KEYS.PERSISTENT_ALERTS, notifications);
    renderNotifications();
    updateBadge();
}

function removeNotification(notificationId) {
    notifications = notifications.filter(n => n.id !== notificationId);
    saveDataToLocal(DB_KEYS.PERSISTENT_ALERTS, notifications);
    renderNotifications();
    updateBadge();
}

function clearAllNotifications() {
    notifications = notifications.filter(n => n.isActionable);
    saveDataToLocal(DB_KEYS.PERSISTENT_ALERTS, notifications);
    renderNotifications();
    updateBadge();
}

function updateBadge() {
    const badge = document.getElementById('notification-count-badge');
    if (!badge) return;

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
        panel.innerHTML = '<div class="notification-item empty" style="text-align: center; padding: 1rem;">Nenhuma notificação.</div>';
        return;
    }

    let html = notifications.map(notification => {
        let icon = '',
            title = '',
            actionHtml = '',
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
                icon = 'fa-gem';
                title = 'Comprovante Assinado';
                action = ACTIONS.PRINT_SIGNED_RECEIPT;
                break;
            default:
                icon = 'fa-gem';
                title = 'Aviso';
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
                        <span class="notification-time">${new Date(notification.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
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
        `<div class="notification-footer" style="padding: 0.5rem; text-align: center; border-top: 1px solid var(--border-color);">
            <button class="btn btn-link" data-action="${ACTIONS.CLEAR_ALL_NOTIFICATIONS}" style="font-size: 0.8em;">Limpar dispensáveis</button>
         </div>` :
        '';

    panel.innerHTML = `
        <div class="notification-panel-header">
            <h3>Notificações</h3>
        </div>
        <div class="notification-list" style="max-height: 300px; overflow-y: auto;">
            ${html}
        </div>
        ${clearButton}
    `;
}