import { getAllAlerts, clearDismissibleAlerts } from './alertSystem.js';
import { getSettings } from './settings.js';

function renderNotifications() {
    let currentAlerts = getAllAlerts();
    const panel = document.getElementById('notification-panel');
    const badge = document.getElementById('notification-count-badge');
    const settings = getSettings();

    if (!panel || !badge) return;

    // Limpa o conteúdo atual
    panel.innerHTML = '';

    // Adiciona o cabeçalho com o botão de limpar
    const header = document.createElement('div');
    header.className = 'notification-panel-header';
    header.innerHTML = `
        <span>Notificações</span>
        <button id="clear-notifications-btn" class="btn btn-icon-only btn-sm" title="Limpar notificações dispensáveis">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;
    panel.appendChild(header);

    const clearBtn = header.querySelector('#clear-notifications-btn');
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Usa a nova função para manter apenas os alertas importantes
        currentAlerts = clearDismissibleAlerts();
        // Re-renderiza o painel com a lista de alertas filtrada
        updatePanelContent(currentAlerts);
    });

    // Função interna para atualizar o conteúdo do painel
    function updatePanelContent(alerts) {
        // Remove o conteúdo antigo (exceto o cabeçalho)
        const items = panel.querySelectorAll('.notification-item, .no-notification-item');
        items.forEach(item => item.remove());

        if (alerts.length > 0) {
            badge.textContent = alerts.length;
            badge.classList.remove('hidden');

            alerts.forEach(alert => {
                const item = createNotificationItem(alert, settings);
                panel.appendChild(item);
            });
            // Verifica se há alertas dispensáveis para habilitar/desabilitar o botão
            const hasDismissible = alerts.some(alert => {
                const alertTypeId = alert.id.split('-')[0];
                return !settings.notificationBehaviors[alertTypeId];
            });
            clearBtn.disabled = !hasDismissible;

        } else {
            badge.classList.add('hidden');
            const noNotificationItem = document.createElement('div');
            noNotificationItem.className = 'no-notification-item';
            noNotificationItem.innerHTML = `<p>Nenhuma notificação nova.</p>`;
            panel.appendChild(noNotificationItem);
            clearBtn.disabled = true;
        }
    }

    // Renderiza o conteúdo inicial
    updatePanelContent(currentAlerts);
}

function createNotificationItem(alert, settings) {
    const item = document.createElement('div');
    item.className = `notification-item notification-${alert.type}`;
    item.dataset.id = alert.id;

    // Verifica se a notificação é acionável de acordo com as configurações
    const alertTypeId = alert.id.split('-')[0];
    const isActionable = settings.notificationBehaviors[alertTypeId] === true && alert.action;

    let actionButtonHTML = '';
    if (isActionable) {
        // Cria um botão de ação se necessário
        const buttonText = alert.action.replace(/-/g, ' ').replace('do ', '');
        actionButtonHTML = `
            <div class="notification-actions">
                <button class="btn btn-primary btn-sm" data-action="${alert.action}" data-item-id="${alert.itemId || ''}">
                    ${buttonText}
                </button>
            </div>
        `;
    }

    item.innerHTML = `
        <div class="notification-content">
            <strong>${alert.title}</strong>
            <p>${alert.message}</p>
            ${actionButtonHTML}
        </div>
    `;
    return item;
}

export { renderNotifications };