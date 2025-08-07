import {
    apiClient
} from './apiClient.js';

let collaborators = [];

async function fetchCollaborators() {
    try {
        const data = await apiClient.get('collaborators');
        collaborators = data;
        return collaborators;
    } catch (error) {
        console.error('Failed to fetch collaborators:', error);
        return [];
    }
}

function getAllCollaborators() {
    return collaborators;
}

function getCollaboratorById(id) {
    const numericId = parseInt(id, 10);
    return collaborators.find(c => c.id === numericId);
}

async function addCollaborator(collaboratorDetails) {
    try {
        const newCollaborator = await apiClient.post('collaborators', collaboratorDetails);
        if (newCollaborator) {
            collaborators.push(newCollaborator);
            return newCollaborator;
        }
        return null;
    } catch (error) {
        console.error('Failed to add collaborator:', error);
        return null;
    }
}

async function updateCollaborator(id, updatedDetails) {
    try {
        const updatedCollaborator = await apiClient.put(`collaborators/${id}`, updatedDetails);
        if (updatedCollaborator) {
            const index = collaborators.findIndex(c => c.id === parseInt(id, 10));
            if (index !== -1) {
                collaborators[index] = updatedCollaborator;
            }
            return updatedCollaborator;
        }
        return null;
    } catch (error) {
        console.error('Failed to update collaborator:', error);
        return null;
    }
}

async function deleteCollaborator(id) {
    try {
        await apiClient.delete(`collaborators/${id}`);
        collaborators = collaborators.filter(c => c.id !== parseInt(id, 10));
        return true;
    } catch (error) {
        console.error('Failed to delete collaborator:', error);
        return false;
    }
}

export {
    fetchCollaborators,
    getAllCollaborators,
    getCollaboratorById,
    addCollaborator,
    updateCollaborator,
    deleteCollaborator
};
