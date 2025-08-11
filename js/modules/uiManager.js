// js/modules/uiManager.js

// A linha 'import { MODAL_IDS }...' foi removida, pois não era usada neste arquivo.

export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('Container de Toast não encontrado!');
        return;
    }

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
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

export function openModal(modalElement) {
    if (modalElement && typeof modalElement.showModal === 'function') {
        modalElement.showModal();
    }
}

export function closeModal(modalElement) {
    if (modalElement && typeof modalElement.close === 'function') {
        modalElement.close();
    }
}

export function initializeUI() {
    document.addEventListener('click', (e) => {
        const modalTarget = e.target.closest('[data-modal-target]');
        if (modalTarget) {
            const modalId = modalTarget.getAttribute('data-modal-target');
            const modal = document.getElementById(modalId);
            if (modal) {
                openModal(modal);
            }
        }
    });
}
