import { apiClient } from './apiClient.js';

let debits = [];

async function fetchDebits() {
    try {
        const data = await apiClient.get('debits');
        debits = data;
        return debits;
    } catch (error) {
        console.error('Failed to fetch debits:', error);
        return [];
    }
}

function getAllDebits() {
    return debits;
}

async function updateDebitStatus(id, status) {
    try {
        const updatedDebit = await apiClient.put(`debits/${id}`, { status });
        if (updatedDebit) {
            const index = debits.findIndex(d => d.id === parseInt(id, 10));
            if (index !== -1) {
                debits[index] = updatedDebit;
            }
            return updatedDebit;
        }
        return null;
    } catch (error) {
        console.error('Failed to update debit status:', error);
        return null;
    }
}

async function deleteDebit(id) {
    try {
        await apiClient.delete(`debits/${id}`);
        debits = debits.filter(d => d.id !== parseInt(id, 10));
        return true;
    } catch (error) {
        console.error('Failed to delete debit:', error);
        return false;
    }
}

export {
    fetchDebits,
    getAllDebits,
    updateDebitStatus,
    deleteDebit
};
