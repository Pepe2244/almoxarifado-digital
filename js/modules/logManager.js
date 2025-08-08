import { apiClient } from './apiClient.js';

let logs = [];

async function fetchLogs() {
    try {
        const data = await apiClient.get('logs');
        logs = data;
        return logs;
    } catch (error) {
        console.error('Failed to fetch logs:', error);
        return [];
    }
}

function getAllLogs() {
    return logs;
}

async function createLog(action, details, user = 'Sistema') {
    const logEntry = {
        action,
        details,
        user
    };

    try {
        const newLog = await apiClient.post('logs', logEntry);
        if (newLog) {
            logs.unshift(newLog);
        }
    } catch (error) {
        console.error('Failed to create log:', error);
    }
}

export { fetchLogs, getAllLogs, createLog };
