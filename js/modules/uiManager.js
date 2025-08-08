import { MODAL_IDS } from '../constants.js';
import { getSettings } from './settings.js';
import { getItemById } from './itemManager.js';
import { getAllCollaborators } from './collaboratorManager.js';
import { ALERT_TYPES } from './alertSystem.js'; // Importar os tipos de alerta

export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        });
    }, duration);
}

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && typeof modal.showModal === 'function') {
        modal.showModal();
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && typeof modal.close === 'function') {
        modal.close();
    }
}

export function openConfirmationModal({ title, message, onConfirm, onCancel, confirmButtonText = 'Confirmar', cancelButtonText = 'Cancelar' }) {
    const modal = document.getElementById(MODAL_IDS.CONFIRMATION);
    const template = document.getElementById('confirmation-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;

    modal.querySelector('#confirmation-title').textContent = title;
    modal.querySelector('#confirmation-message').textContent = message;

    const confirmBtn = modal.querySelector('#confirm-action-btn');
    const cancelBtn = modal.querySelector('[data-action="cancel-confirmation"]');

    confirmBtn.textContent = confirmButtonText;
    cancelBtn.textContent = cancelButtonText;

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        if (onConfirm) onConfirm();
    });

    if (onCancel) {
        cancelBtn.addEventListener('click', onCancel);
    }

    openModal(MODAL_IDS.CONFIRMATION);
}

export function openSettingsModal() {
    const modal = document.getElementById(MODAL_IDS.SETTINGS);
    const template = document.getElementById('settings-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;
    const form = modal.querySelector('#settings-form');
    const settings = getSettings();

    form.elements['setting-warehouse-name'].value = settings.warehouseName || 'Almoxarifado Digital';
    form.elements['setting-pagination-enabled'].checked = settings.paginationEnabled !== false;
    form.elements['setting-items-per-page'].value = settings.itemsPerPage || 10;

    form.elements['setting-count-frequency'].value = settings.countFrequency || 90;
    form.elements['setting-price-check-frequency'].value = settings.priceCheckFrequency || 30;
    form.elements['setting-maintenance-frequency'].value = settings.maintenanceFrequency || 180;
    form.elements['setting-alert-critical'].value = settings.predictiveAlertCritical || 7;
    form.elements['setting-alert-warning'].value = settings.predictiveAlertWarning || 30;

    const panelVisibilityContainer = form.querySelector('#panel-visibility-container .checkbox-group');
    if (panelVisibilityContainer) {
        panelVisibilityContainer.innerHTML = '';
        Object.keys(settings.panelVisibility).forEach(panelId => {
            const panelElement = document.getElementById(panelId);
            const panelTitle = panelElement?.querySelector('.card-header h2')?.textContent.trim() || panelId;

            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'checkbox-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `vis-${panelId}`;
            checkbox.name = panelId;
            checkbox.checked = settings.panelVisibility[panelId] !== false;

            const label = document.createElement('label');
            label.htmlFor = `vis-${panelId}`;
            label.textContent = panelTitle;

            checkboxWrapper.append(checkbox, label);
            panelVisibilityContainer.appendChild(checkboxWrapper);
        });
    }

    // *** INÍCIO DA CORREÇÃO: LÓGICA DAS CONFIGURAÇÕES DE NOTIFICAÇÃO ***
    const notificationContainer = form.querySelector('#notification-behavior-container');
    if (notificationContainer) {
        notificationContainer.innerHTML = ''; // Limpa o container
        // Itera sobre os tipos de alerta definidos no alertSystem.js
        Object.values(ALERT_TYPES).forEach(alertType => {
            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'checkbox-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `notif-${alertType.id}`;
            checkbox.name = alertType.id;
            // Verifica a configuração salva para marcar o checkbox
            checkbox.checked = settings.notificationBehaviors[alertType.id] === true;

            const label = document.createElement('label');
            label.htmlFor = `notif-${alertType.id}`;
            label.textContent = alertType.title;

            checkboxWrapper.append(checkbox, label);
            notificationContainer.appendChild(checkboxWrapper);
        });
    }
    // *** FIM DA CORREÇÃO ***

    const tabs = modal.querySelectorAll('.settings-tab-btn');
    const tabContents = modal.querySelectorAll('.settings-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const activeContentId = tab.getAttribute('aria-controls');
            const activeContent = modal.querySelector(`#${activeContentId}`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });

    modal.showModal();
}


export function openMovementModal(itemId) {
    const modal = document.getElementById(MODAL_IDS.MOVEMENT);
    const template = document.getElementById('movement-modal-template');
    const item = getItemById(itemId);
    if (!modal || !template || !item) return;

    modal.innerHTML = template.innerHTML;
    modal.querySelector('#movement-item-id').value = itemId;
    modal.querySelector('#movement-item-name').textContent = item.name;

    const collaboratorSelect = modal.querySelector('#movement-collaborator');
    collaboratorSelect.innerHTML = '<option value="">Selecione um colaborador</option>';
    getAllCollaborators().forEach(c => {
        const option = new Option(c.name, c.id);
        collaboratorSelect.add(option);
    });

    modal.showModal();
}

export function openAdjustmentModal(itemId) {
    const modal = document.getElementById(MODAL_IDS.ADJUSTMENT);
    const template = document.getElementById('adjustment-modal-template');
    const item = getItemById(itemId);
    if (!modal || !template || !item) return;

    modal.innerHTML = template.innerHTML;
    modal.querySelector('#adjustment-item-id').value = itemId;
    modal.querySelector('#adjustment-item-name').textContent = item.name;
    modal.querySelector('#adjustment-system-stock').textContent = item.currentStock || 0;
    modal.querySelector('#physical-count').value = item.currentStock || 0;

    modal.showModal();
}

export function openDirectLossModal(itemId) {
    const modal = document.getElementById(MODAL_IDS.DIRECT_LOSS);
    const template = document.getElementById('direct-loss-modal-template');
    const item = getItemById(itemId);
    if (!modal || !template || !item) return;

    modal.innerHTML = template.innerHTML;
    modal.querySelector('#direct-loss-item-id').value = itemId;
    modal.querySelector('#direct-loss-item-name').textContent = item.name;
    modal.querySelector('#direct-loss-item-stock').textContent = item.currentStock || 0;

    const collaboratorSelect = modal.querySelector('#direct-loss-collaborator');
    collaboratorSelect.innerHTML = '<option value="">Nenhum (sem débito)</option>';
    getAllCollaborators().forEach(c => {
        const option = new Option(c.name, c.id);
        collaboratorSelect.add(option);
    });

    modal.showModal();
}