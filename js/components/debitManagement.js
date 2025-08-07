// CÓDIGO CORRIGIDO - js/components/debitManagement.js

import { getAllDebits, updateDebitStatus, deleteDebit } from '../modules/debitManager.js';
import { openConfirmationModal, closeModal, showToast } from '../modules/uiManager.js';
import { MODAL_IDS } from '../constants.js';

export function initializeDebitManagement() {
    document.body.addEventListener('click', (event) => {
        const action = event.target.dataset.action || event.target.closest('button')?.dataset.action;
        if (!action) return;

        const debitId = event.target.dataset.id || event.target.closest('tr')?.dataset.id;

        switch (action) {
            case 'toggle-debit-status':
                if (debitId) handleToggleDebitStatus(debitId);
                break;
            case 'delete-debit':
                if (debitId) handleDeleteDebit(debitId);
                break;
        }
    });
}

export function renderDebitsTable(debits) {
    const tableBody = document.getElementById('debits-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (debits.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Nenhum débito encontrado.</td></tr>`;
        return;
    }

    debits.forEach(debit => {
        const row = document.createElement('tr');
        row.dataset.id = debit.id;
        const createdAt = new Date(debit.createdAt).toLocaleDateString('pt-BR');
        const isPending = debit.status === 'pendente';

        row.innerHTML = `
            <td data-label="Colaborador">${debit.collaboratorName || 'N/A'}</td>
            <td data-label="Item">${debit.itemName}</td>
            <td data-label="Valor Total">R$ ${Number(debit.totalValue).toFixed(2)}</td>
            <td data-label="Data">${createdAt}</td>
            <td data-label="Status"><span class="status-badge status-${debit.status}">${debit.status}</span></td>
            <td data-label="Ações">
                <div class="actions-dropdown-container">
                    <button class="btn btn-secondary btn-sm btn-icon-only" data-action="toggle-actions-dropdown" aria-label="Mais ações">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="actions-dropdown-content hidden">
                        <button class="btn btn-sm ${isPending ? 'btn-success' : 'btn-warning'}" data-action="toggle-debit-status" data-id="${debit.id}">
                            <i class="fas ${isPending ? 'fa-check' : 'fa-undo'}"></i> ${isPending ? 'Marcar como Pago' : 'Marcar como Pendente'}
                        </button>
                        <button class="btn btn-sm btn-danger" data-action="delete-debit" data-id="${debit.id}">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function handleToggleDebitStatus(debitId) {
    const debit = getAllDebits().find(d => d.id === parseInt(debitId, 10));
    if (!debit) return;

    const newStatus = debit.status === 'pendente' ? 'pago' : 'pendente';
    const updatedDebit = await updateDebitStatus(debitId, newStatus);

    if (updatedDebit) {
        showToast(`Status do débito alterado para ${newStatus}.`, 'success');
        document.body.dispatchEvent(new CustomEvent('dataChanged'));
    } else {
        showToast('Falha ao atualizar o status do débito.', 'error');
    }
}

function handleDeleteDebit(debitId) {
    openConfirmationModal({
        title: 'Confirmar Exclusão',
        message: 'Tem a certeza de que deseja excluir este registro de débito? Esta ação é permanente.',
        onConfirm: async () => {
            const success = await deleteDebit(debitId);
            if (success) {
                showToast('Débito excluído com sucesso!', 'success');
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            } else {
                showToast('Falha ao excluir o débito.', 'error');
            }
            closeModal(MODAL_IDS.CONFIRMATION);
        }
    });
}