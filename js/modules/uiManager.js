import { MODAL_IDS } from '../constants.js';

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
    openModal(MODAL_IDS.SETTINGS);
}
