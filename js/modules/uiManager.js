import { MODAL_IDS } from '../constants.js';
import { getSettings } from './settings.js';

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

    const panelVisibilityContainer = form.querySelector('#panel-visibility-container .checkbox-group');
    if (panelVisibilityContainer) {
        panelVisibilityContainer.innerHTML = '';
        Object.keys(settings.panelVisibility).forEach(panelId => {
            const panelElement = document.getElementById(panelId);
            const panelTitle = panelElement?.querySelector('.card-header h2')?.textContent || panelId;

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

    modal.showModal();
}
