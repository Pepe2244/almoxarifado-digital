import { apiClient } from './apiClient.js';

async function getKitComponents(kitId) {
    try {
        const components = await apiClient.get(`kits/${kitId}/components`);
        return components || [];
    } catch (error) {
        console.error(`Failed to fetch components for kit ${kitId}:`, error);
        return [];
    }
}

async function addComponentToKit(kitId, componentId, quantity) {
    try {
        const result = await apiClient.post(`kits/${kitId}/components`, { componentId, quantity });
        return !!result;
    } catch (error) {
        console.error(`Failed to add component to kit ${kitId}:`, error);
        return false;
    }
}

async function removeComponentFromKit(kitId, componentId) {
    try {
        await apiClient.delete(`kits/${kitId}/components/${componentId}`);
        return true;
    } catch (error) {
        console.error(`Failed to remove component from kit ${kitId}:`, error);
        return false;
    }
}

export {
    getKitComponents,
    addComponentToKit,
    removeComponentFromKit
};
