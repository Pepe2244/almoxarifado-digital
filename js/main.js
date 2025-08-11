// Importando os "buscadores" de dados de cada módulo.
import { fetchItems } from './modules/itemManager.js';
import { fetchCollaborators } from './modules/collaboratorManager.js';
import { fetchDebits } from './modules/debitManager.js';
import { fetchServiceOrders } from './modules/serviceOrderManager.js';
import { fetchKits } from './modules/kitManager.js';

// Importando os "inicializadores" de interface de cada componente.
import { initializeItemManagement } from './components/itemManagement.js';
import { initializeCollaboratorManagement } from './components/collaboratorManagement.js';
import { initializeDebitManagement } from './components/debitManagement.js';
import { initializeServiceOrderManagement } from './components/serviceOrderManagement.js';
import { initializeKitManagement } from './components/kitManagement.js';
import { initializeUI } from './modules/uiManager.js';
import { updateDashboard } from './components/graphicDashboard.js';
import { initializeReporting } from './components/reporting.js';

/**
 * Função principal e assíncrona que orquestra a inicialização da aplicação.
 * Ela garante que todos os dados do servidor sejam carregados antes de a interface ser montada.
 */
async function main() {
    // 1. Mostra uma mensagem de carregamento para o usuário saber que algo está acontecendo.
    console.log("Iniciando aplicação... Carregando dados essenciais do servidor.");
    document.body.innerHTML += '<div id="loading-overlay"><h1>Carregando Almoxarifado Digital...</h1></div>';

    try {
        // 2. Carrega todos os dados do backend em paralelo.
        // Promise.all executa todas as buscas ao mesmo tempo, o que é mais rápido.
        await Promise.all([
            fetchItems(),
            fetchCollaborators(),
            fetchDebits(),
            fetchServiceOrders(),
            fetchKits()
        ]);

        // 3. Com TODOS os dados carregados e em cache, inicializa todos os componentes da interface.
        console.log("Todos os dados carregados. Montando a interface do usuário...");
        initializeUI();
        initializeItemManagement();
        initializeCollaboratorManagement();
        initializeDebitManagement();
        initializeServiceOrderManagement();
        initializeKitManagement();
        initializeReporting();
        updateDashboard();


        // 4. Tudo pronto! Remove a tela de carregamento.
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.remove(), 500); // Remove após a transição
        }
        console.log("Almoxarifado Digital totalmente operacional!");

    } catch (error) {
        // 5. Se qualquer uma das etapas de carregamento falhar, exibe uma mensagem de erro crítica.
        console.error("Falha crítica durante a inicialização:", error);
        document.body.innerHTML = `<div class="critical-error"><h1>Erro ao Carregar a Aplicação</h1><p>Não foi possível conectar ao servidor. Por favor, tente recarregar a página.</p><p><small>${error.message}</small></p></div>`;
    }
}

// Adiciona o listener para disparar a função 'main' assim que a estrutura básica da página (DOM) estiver pronta.
document.addEventListener('DOMContentLoaded', main);
