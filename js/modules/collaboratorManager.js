import { apiClient } from './apiClient.js';
import { showToast } from './uiManager.js';

let collaborators = [];
const endpoint = 'collaborators';

export async function fetchCollaborators() {
    try {
        collaborators = await apiClient.get(endpoint);
        console.log('Colaboradores carregados do banco de dados:', collaborators);
        return collaborators;
    } catch (error) {
        showToast(`Erro ao carregar colaboradores: ${error.message}`, 'error');
        collaborators = [];
        return [];
    }
}

export function getAllCollaborators() {
    return collaborators;
}

export function getCollaboratorById(id) {
    const numericId = parseInt(id, 10);
    return collaborators.find(c => c.id === numericId);
}

export async function createCollaborator(collaboratorData) {
    try {
        const newCollaborator = await apiClient.post(endpoint, collaboratorData);
        collaborators.push(newCollaborator);
        showToast('Colaborador criado com sucesso!', 'success');
        return newCollaborator;
    } catch (error) {
        showToast(`Erro ao criar colaborador: ${error.message}`, 'error');
        return null;
    }
}

export async function updateCollaborator(collaboratorData) {
    try {
        const updatedCollaborator = await apiClient.put(endpoint, collaboratorData);
        const index = collaborators.findIndex(c => c.id === updatedCollaborator.id);
        if (index !== -1) {
            collaborators[index] = updatedCollaborator;
        }
        showToast('Colaborador atualizado com sucesso!', 'success');
        return updatedCollaborator;
    } catch (error) {
        showToast(`Erro ao atualizar colaborador: ${error.message}`, 'error');
        return null;
    }
}

export async function deleteCollaborator(id) {
    try {
        await apiClient.delete(endpoint, id);
        collaborators = collaborators.filter(c => c.id !== parseInt(id, 10));
        showToast('Colaborador excluído com sucesso!', 'success');
        return true;
    } catch (error) {
        showToast(`Erro ao excluir colaborador: ${error.message}`, 'error');
        return false;
    }
}
