import { apiClient } from './apiClient.js';
import { showToast } from './uiManager.js';

let kits = [];
const endpoint = 'kits';

export async function fetchKits() {
    try {
        kits = await apiClient.get(endpoint);
        console.log('Kits carregados:', kits);
        return kits;
    } catch (error) {
        showToast(`Erro ao carregar Kits: ${error.message}`, 'error');
        kits = [];
        return [];
    }
}

export function getAllKits() {
    return kits;
}

export function getKitById(id) {
    const numericId = parseInt(id, 10);
    return kits.find(k => k.id === numericId);
}

export async function createKit(kitData) {
    try {
        const newKit = await apiClient.post(endpoint, kitData);
        await fetchKits(); // Recarrega para ter a lista completa
        showToast('Kit criado com sucesso!', 'success');
        return newKit;
    } catch (error) {
        showToast(`Erro ao criar Kit: ${error.message}`, 'error');
        return null;
    }
}

export async function updateKit(kitData) {
    try {
        const updatedKit = await apiClient.put(endpoint, kitData);
        await fetchKits(); // Recarrega para ter a lista completa
        showToast('Kit atualizado com sucesso!', 'success');
        return updatedKit;
    } catch (error) {
        showToast(`Erro ao atualizar Kit: ${error.message}`, 'error');
        return null;
    }
}

export async function deleteKit(id) {
    try {
        await apiClient.delete(endpoint, id);
        kits = kits.filter(k => k.id !== parseInt(id, 10));
        showToast('Kit excluído com sucesso!', 'success');
        return true;
    } catch (error) {
        showToast(`Erro ao excluir Kit: ${error.message}`, 'error');
        return false;
    }
}
