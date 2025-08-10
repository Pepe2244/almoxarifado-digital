// js/modules/apiClient.js

// A URL base para todas as nossas funções do Netlify.
// O Netlify expõe todas as funções sob este caminho padrão.
const API_BASE_URL = '/.netlify/functions';

/**
 * Função genérica para fazer requisições à nossa API.
 * @param {string} endpoint - O nome da função que queremos chamar (ex: 'items').
 * @param {object} options - As opções da requisição (método, corpo, cabeçalhos, etc.).
 * @returns {Promise<any>} - Uma promessa que resolve com os dados da resposta em JSON.
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}/${endpoint}`;

    // Adiciona cabeçalhos padrão para todas as requisições.
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // Combina os cabeçalhos padrão com quaisquer cabeçalhos específicos passados nas opções.
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        // Se a resposta não for 'ok' (status fora da faixa 200-299),
        // tentamos ler o erro do corpo da resposta e lançamos uma exceção.
        if (!response.ok) {
            // Tenta extrair a mensagem de erro do corpo da resposta JSON.
            // Se falhar, usa o texto de status padrão.
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.error || `Erro na requisição: ${response.status}`);
        }

        // Se a resposta for 204 (No Content), como no nosso DELETE,
        // não há corpo para ser lido, então retornamos nulo.
        if (response.status === 204) {
            return null;
        }

        // Se tudo deu certo, retorna o corpo da resposta convertido de JSON para um objeto JavaScript.
        return response.json();
    } catch (error) {
        // Em caso de falha na rede ou qualquer outro erro, logamos para depuração
        // e relançamos o erro para que a função que chamou possa tratá-lo.
        console.error(`Falha na API: ${config.method || 'GET'} ${url}`, error);
        throw error;
    }
}

// Exportamos um objeto 'apiClient' com métodos simplificados para cada tipo de requisição (GET, POST, PUT, DELETE).
// Isso torna o uso no resto do código muito mais limpo e legível.
export const apiClient = {
    get: (endpoint) => request(endpoint, { method: 'GET' }),

    post: (endpoint, body) => request(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    }),

    put: (endpoint, body) => request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
    }),

    // Para o delete, passamos o ID como um parâmetro de query na URL.
    delete: (endpoint, id) => request(`${endpoint}?id=${id}`, { method: 'DELETE' }),
};
