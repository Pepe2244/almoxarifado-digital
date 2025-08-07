import { apiClient } from './apiClient.js';
import { showToast } from './uiManager.js';

async function registerLoan(itemId, collaboratorId, quantity, location) {
    try {
        await apiClient.post('stock-movements', { type: 'LOAN', payload: { itemId, collaboratorId, quantity, location } });
        showToast('Saída registrada com sucesso!', 'success');
        return true;
    } catch (error) {
        showToast(`Erro ao registrar saída: ${error.message}`, 'error');
        return false;
    }
}

async function registerReturn(itemId, quantity, responsible) {
    try {
        await apiClient.post('stock-movements', { type: 'RETURN', payload: { itemId, quantity, responsible } });
        showToast('Devolução registrada com sucesso!', 'success');
        return true;
    } catch (error) {
        showToast(`Erro ao registrar devolução: ${error.message}`, 'error');
        return false;
    }
}

async function adjustStock(itemId, newCount, responsible) {
    try {
        await apiClient.post('stock-movements', { type: 'ADJUSTMENT', payload: { itemId, newCount, responsible } });
        showToast('Estoque ajustado com sucesso!', 'success');
        return true;
    } catch (error) {
        showToast(`Erro ao ajustar estoque: ${error.message}`, 'error');
        return false;
    }
}

async function registerDirectLoss(itemId, quantity, reason, responsible, collaboratorId) {
    try {
        await apiClient.post('stock-movements', { type: 'DIRECT_LOSS', payload: { itemId, quantity, reason, responsible, collaboratorId } });
        showToast('Perda registrada com sucesso!', 'success');
        return true;
    } catch (error) {
        showToast(`Erro ao registrar perda: ${error.message}`, 'error');
        return false;
    }
}

export { registerLoan, registerReturn, adjustStock, registerDirectLoss };
