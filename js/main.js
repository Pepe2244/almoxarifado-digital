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

/**
 * Função principal e assíncrona que orquestra a inicialização da aplicação.
 * Ela garante que todos os dados do servidor sejam carregados antes de a interface ser montada.
 */
async function main() {
    // 1. Mostra uma mensagem de carregamento para o usuário saber que algo está acontecendo.
    console.log("Iniciando aplicação... Carregando dados essenciais do servidor.");
    // (Opcional) Você pode exibir um spinner de loading na tela aqui.
    // document.getElementById('loading-spinner').style.display = 'block';

    try {
        // 2. Carrega os dados primários em paralelo para ganhar tempo.
        // Itens e Colaboradores não dependem de ninguém, então podem ser buscados ao mesmo tempo.
        await Promise.all([
            fetchItems(),
            fetchCollaborators()
        ]);

        // 3. Carrega os dados secundários que dependem dos primários.
        // Débitos, O.S. e Kits precisam que Itens e Colaboradores já existam no cache
        // para popular os 'selects' e exibir os nomes corretamente.
        console.log("Carregando dados secundários...");
        await Promise.all([
            fetchDebits(),
            fetchServiceOrders(),
            fetchKits()
        ]);

        // 4. Com TODOS os dados carregados e em cache, inicializa todos os componentes da interface.
        console.log("Todos os dados carregados. Montando a interface do usuário...");
        initializeUI(); // Inicializa modais, menus, etc.
        initializeItemManagement();
        initializeCollaboratorManagement();
        initializeDebitManagement();
        initializeServiceOrderManagement();
        initializeKitManagement();
        // ... inicialize outros componentes como relatórios, dashboard, etc.

        // 5. Tudo pronto!
        console.log("Almoxarifado Digital totalmente operacional!");
        // (Opcional) Esconde o spinner de loading.
        // document.getElementById('loading-spinner').style.display = 'none';

    } catch (error) {
        // Se qualquer uma das etapas de carregamento falhar, exibe uma mensagem de erro crítica.
        console.error("Falha crítica durante a inicialização:", error);
        document.body.innerHTML = `<div class="error-screen"><h1>Erro ao carregar a aplicação</h1><p>Não foi possível conectar ao servidor. Por favor, tente recarregar a página.</p><p><small>${error.message}</small></p></div>`;
    }
}

// Adiciona o listener para disparar a função 'main' assim que a estrutura básica da página (DOM) estiver pronta.
document.addEventListener('DOMContentLoaded', main);
