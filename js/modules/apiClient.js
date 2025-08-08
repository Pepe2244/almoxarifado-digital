const BASE_URL = '/.netlify/functions';

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}/${endpoint}`;
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        if (response.status === 204) {
            return null;
        }
        return response.json();
    } catch (error) {
        console.error(`API request failed: ${options.method || 'GET'} ${url}`, error);
        throw error;
    }
}

export const apiClient = {
    get: (endpoint) => request(endpoint),
    post: (endpoint, body) => request(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }),
    put: (endpoint, body) => request(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }),
    delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
