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
        // Esta é uma operação complexa que precisaria de endpoints de backend dedicados.
        // Por segurança, na nossa arquitetura atual, vamos restaurar apenas as configurações.
        saveSettings(data.settings);

        // A lógica completa de restauro de dados (itens, colaboradores, etc.)
        // seria implementada aqui com chamadas de API para apagar e recriar os dados.

        console.log("Configurações do backup foram restauradas.", data.settings);
        alert("Funcionalidade de restauro está em modo de segurança. Apenas as configurações foram restauradas. A página será recarregada.");

        return true;
    } catch (error) {
        console.error("Database restore failed:", error);
        return false;
    }
}

export { initializeDB, restoreDatabase };
