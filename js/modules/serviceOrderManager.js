import { apiClient } from './apiClient.js';

let serviceOrders = [];

async function fetchServiceOrders() {
    try {
        const data = await apiClient.get('service-orders');
        serviceOrders = data;
        return serviceOrders;
    } catch (error) {
        console.error('Failed to fetch service orders:', error);
        return [];
    }
}

function getAllServiceOrders() {
    return serviceOrders;
}

function getServiceOrderById(id) {
    const numericId = parseInt(id, 10);
    return serviceOrders.find(os => os.id === numericId);
}

async function addServiceOrder(details) {
    try {
        const newOrder = await apiClient.post('service-orders', details);
        if (newOrder) {
            serviceOrders.unshift(newOrder);
            return newOrder;
        }
        return null;
    } catch (error) {
        console.error('Failed to add service order:', error);
        return null;
    }
}

async function updateServiceOrder(id, details) {
    try {
        const updatedOrder = await apiClient.put(`service-orders/${id}`, details);
        if (updatedOrder) {
            const index = serviceOrders.findIndex(os => os.id === parseInt(id, 10));
            if (index !== -1) {
                serviceOrders[index] = { ...serviceOrders[index], ...updatedOrder };
            }
            return updatedOrder;
        }
        return null;
    } catch (error) {
        console.error('Failed to update service order:', error);
        return null;
    }
}

async function deleteServiceOrder(id) {
    try {
        await apiClient.delete(`service-orders/${id}`);
        serviceOrders = serviceOrders.filter(os => os.id !== parseInt(id, 10));
        return true;
    } catch (error) {
        console.error('Failed to delete service order:', error);
        return false;
    }
}

async function addItemToServiceOrder(orderId, itemId, quantity) {
    try {
        const addedItem = await apiClient.post(`service-orders/${orderId}/items`, { itemId, quantity });
        return !!addedItem;
    } catch (error) {
        console.error('Failed to add item to service order:', error);
        return false;
    }
}

async function removeItemFromServiceOrder(orderId, itemId) {
    try {
        await apiClient.delete(`service-orders/${orderId}/items/${itemId}`);
        return true;
    } catch (error) {
        console.error('Failed to remove item from service order:', error);
        return false;
    }
}

export {
    fetchServiceOrders,
    getAllServiceOrders,
    getServiceOrderById,
    addServiceOrder,
    updateServiceOrder,
    deleteServiceOrder,
    addItemToServiceOrder,
    removeItemFromServiceOrder
};
