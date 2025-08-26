// almoxarifado-digital/js/modules/logManager.js
function createLog(action, details, user) {
    const logs = loadDataFromLocal(DB_KEYS.LOGS) || [];
    const newLog = {
        timestamp: new Date().toISOString(),
        action: action,
        details: details,
        user: user
    };
    logs.unshift(newLog);
    if (logs.length > LOGS_LIMIT) {
        logs.length = LOGS_LIMIT;
    }
    saveDataToLocal(DB_KEYS.LOGS, logs);
}

function getAllLogs() {
    return loadDataFromLocal(DB_KEYS.LOGS) || [];
}