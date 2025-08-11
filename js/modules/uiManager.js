// js/modules/uiManager.js

// Importamos as constantes que este módulo precisa.
import { MODAL_IDS } from '../constants.js';

// A PALAVRA MÁGICA 'export' AQUI
// Ela torna a função visível para outros arquivos que a importam.
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

    // Pequeno delay para a animação de entrada funcionar
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Remove o toast após a duração definida
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

// 'export' aqui também
export function openModal(modalElement) {
    if (modalElement && typeof modalElement.showModal === 'function') {
        modalElement.showModal();
    }
}

// 'export' aqui também
export function closeModal(modalElement) {
    if (modalElement && typeof modalElement.close === 'function') {
        modalElement.close();
    }
}

// E 'export' aqui
export function initializeUI() {
    // Este listener genérico abre qualquer modal que tenha um botão correspondente.
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
