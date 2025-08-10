import { apiClient } from './apiClient.js';
import { showToast } from './uiManager.js';

let debits = [];
const endpoint = 'debits';

export async function fetchDebits() {
    try {
        debits = await apiClient.get(endpoint);
        console.log('Débitos carregados do banco de dados:', debits);
        return debits;
    } catch (error) {
        showToast(`Erro ao carregar débitos: ${error.message}`, 'error');
        debits = [];
        return [];
    }
}

export function getAllDebits() {
    return debits;
}

export function getDebitById(id) {
    const numericId = parseInt(id, 10);
    return debits.find(d => d.id === numericId);
}

export async function createDebit(debitData) {
    try {
        const newDebit = await apiClient.post(endpoint, debitData);
        debits.unshift(newDebit);
        showToast('Débito criado com sucesso!', 'success');
        return newDebit;
    } catch (error) {
        showToast(`Erro ao criar débito: ${error.message}`, 'error');
        return null;
    }
}

export async function updateDebit(debitData) {
    try {
        const updatedDebit = await apiClient.put(endpoint, debitData);
        const index = debits.findIndex(d => d.id === updatedDebit.id);
        if (index !== -1) {
            debits[index] = updatedDebit;
        }
        showToast('Débito atualizado com sucesso!', 'success');
        return updatedDebit;
    } catch (error) {
        showToast(`Erro ao atualizar débito: ${error.message}`, 'error');
        return null;
    }
}

export async function deleteDebit(id) {
    try {
        await apiClient.delete(endpoint, id);
        debits = debits.filter(d => d.id !== parseInt(id, 10));
        showToast('Débito excluído com sucesso!', 'success');
        return true;
    } catch (error) {
        showToast(`Erro ao excluir débito: ${error.message}`, 'error');
        return false;
    }
}
