// CÓDIGO CORRIGIDO - js/modules/dataHandler.js

import { apiClient } from './apiClient.js';
import { fetchItems } from './itemManager.js';
import { fetchCollaborators } from './collaboratorManager.js';
import { fetchDebits } from './debitManager.js';
import { fetchServiceOrders } from './serviceOrderManager.js';
import { fetchLogs } from './logManager.js';
import { saveSettings } from './settings.js';

async function initializeDB() {
    try {
        await Promise.all([
            fetchItems(),
            fetchCollaborators(),
            fetchDebits(),
            fetchServiceOrders(),
            fetchLogs()
        ]);
    } catch (error) {
        console.error("Failed to initialize data from backend:", error);
        throw new Error("Could not fetch initial data. Please check the connection.");
    }
}

async function restoreDatabase(data) {
    try {
        // Esta função precisaria de endpoints no backend para limpar e inserir dados em massa.
        // Como estamos a operar com um backend serverless simples, a lógica de restauro
        // torna-se complexa e perigosa (múltiplas chamadas de API).
        // A abordagem mais segura com a arquitetura atual é o restauro local.

        // Limpar dados locais (se estivéssemos a usar IndexedDB)
        // localStorage.clear(); // CUIDADO: Isto apaga tudo

        // Salvar as novas configurações
        saveSettings(data.settings);

        // A lógica para substituir os dados no backend precisaria de ser implementada
        // com endpoints específicos para evitar problemas de concorrência e timeouts.
        // Por agora, vamos focar no backup, que é a parte mais segura.
        // O restauro é uma operação avançada que requer mais infraestrutura de backend.

        console.log("Dados do backup carregados para as configurações.", data);
        alert("Funcionalidade de restauro ainda em desenvolvimento. As configurações foram carregadas, mas os dados principais não foram alterados para segurança.");


        return true;
    } catch (error) {
        console.error("Database restore failed:", error);
        return false;
    }
}


export { initializeDB, restoreDatabase };