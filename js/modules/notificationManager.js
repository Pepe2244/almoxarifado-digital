import { getAllAlerts } from './alertSystem.js';

function renderNotifications() {
    const alerts = getAllAlerts();
    const panel = document.getElementById('notification-panel');
    const badge = document.getElementById('notification-count-badge');

    if (!panel || !badge) return;

    panel.innerHTML = '';

    if (alerts.length > 0) {
        badge.textContent = alerts.length;
        badge.classList.remove('hidden');

        alerts.forEach(alert => {
            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item notification-${alert.type}`;
            notificationItem.innerHTML = `
                <div class="notification-content">
                    <strong>${alert.title}</strong>
                    <p>${alert.message}</p>
                </div>
            `;
            panel.appendChild(notificationItem);
        });
    } else {
        badge.classList.add('hidden');
        panel.innerHTML = '<div class="notification-item"><p>Nenhuma notificação nova.</p></div>';
    }
}

export { renderNotifications };
