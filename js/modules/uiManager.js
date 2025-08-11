
export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('Elemento #toast-container não encontrado no HTML.');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');

    container.appendChild(toast);

    // Adiciona a classe 'show' para iniciar a animação de entrada.
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Define um tempo para remover a notificação.
    setTimeout(() => {
        toast.classList.remove('show');
        // Remove o elemento do DOM após a animação de saída.
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

/**
 * Abre um elemento de diálogo modal (<dialog>).
 * @param {HTMLElement} modalElement - O elemento HTML do modal a ser aberto.
 */
export function openModal(modalElement) {
    if (modalElement && typeof modalElement.showModal === 'function') {
        modalElement.showModal();
    } else {
        console.error('Elemento de modal inválido ou não encontrado:', modalElement);
    }
}

/**
 * Fecha um elemento de diálogo modal (<dialog>).
 * @param {HTMLElement} modalElement - O elemento HTML do modal a ser fechado.
 */
export function closeModal(modalElement) {
    if (modalElement && typeof modalElement.close === 'function') {
        modalElement.close();
    }
}

/**
 * Inicializa os listeners de eventos globais da UI.
 * Principalmente, configura qualquer botão com o atributo 'data-modal-target' para abrir o modal correspondente.
 */
export function initializeUI() {
    document.addEventListener('click', (e) => {
        const modalTrigger = e.target.closest('[data-modal-target]');
        if (modalTrigger) {
            const modalId = modalTrigger.getAttribute('data-modal-target');
            const modal = document.getElementById(modalId);
            if (modal) {
                openModal(modal);
            } else {
                console.warn(`Modal com ID "${modalId}" não foi encontrado.`);
            }
        }
    });
}
