import { apiClient } from './apiClient.js';
import { showToast } from './uiManager.js';

let serviceOrders = [];
const endpoint = 'service-orders';

export async function fetchServiceOrders() {
    try {
        serviceOrders = await apiClient.get(endpoint);
        console.log('Ordens de Serviço carregadas:', serviceOrders);
        return serviceOrders;
    } catch (error) {
        showToast(`Erro ao carregar Ordens de Serviço: ${error.message}`, 'error');
        serviceOrders = [];
        return [];
    }
}

export function getAllServiceOrders() {
    return serviceOrders;
}

export function getServiceOrderById(id) {
    const numericId = parseInt(id, 10);
    return serviceOrders.find(os => os.id === numericId);
}

export async function createServiceOrder(osData) {
    try {
        const newOS = await apiClient.post(endpoint, osData);
        // Para ter os dados completos, o ideal é recarregar a lista
        await fetchServiceOrders();
        showToast('Ordem de Serviço criada com sucesso!', 'success');
        return newOS;
    } catch (error) {
        showToast(`Erro ao criar Ordem de Serviço: ${error.message}`, 'error');
        return null;
    }
}

export async function updateServiceOrder(osData) {
    try {
        const updatedOS = await apiClient.put(endpoint, osData);
        await fetchServiceOrders();
        showToast('Ordem de Serviço atualizada com sucesso!', 'success');
        return updatedOS;
    } catch (error) {
        showToast(`Erro ao atualizar Ordem de Serviço: ${error.message}`, 'error');
        return null;
    }
}

export async function deleteServiceOrder(id) {
    try {
        await apiClient.delete(endpoint, id);
        serviceOrders = serviceOrders.filter(os => os.id !== parseInt(id, 10));
        showToast('Ordem de Serviço excluída com sucesso!', 'success');
        return true;
    } catch (error) {
        showToast(`Erro ao excluir Ordem de Serviço: ${error.message}`, 'error');
        return false;
    }
}
