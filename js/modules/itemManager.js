import { apiClient } from './apiClient.js';

let items = [];

async function fetchItems() {
    try {
        const data = await apiClient.get('items');
        items = data;
        return items;
    } catch (error) {
        console.error('Failed to fetch items:', error);
        return [];
    }
}

function getAllItems() {
    return items;
}

function getItemById(id) {
    const numericId = parseInt(id, 10);
    return items.find(item => item.id === numericId);
}

async function createItem(itemDetails) {
    try {
        const newItem = await apiClient.post('items', itemDetails);
        if (newItem) {
            items.push(newItem);
            return newItem;
        }
        return null;
    } catch (error) {
        console.error('Failed to create item:', error);
        return null;
    }
}

async function updateItem(id, updatedDetails) {
    try {
        const updatedItem = await apiClient.put(`items/${id}`, updatedDetails);
        if (updatedItem) {
            const index = items.findIndex(item => item.id === parseInt(id, 10));
            if (index !== -1) {
                items[index] = updatedItem;
            }
            return updatedItem;
        }
        return null;
    } catch (error) {
        console.error('Failed to update item:', error);
        return null;
    }
}

async function deleteItem(id) {
    try {
        await apiClient.delete(`items/${id}`);
        items = items.filter(item => item.id !== parseInt(id, 10));
        return true;
    } catch (error) {
        console.error('Failed to delete item:', error);
        return false;
    }
}

export {
    fetchItems,
    getAllItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem
};
