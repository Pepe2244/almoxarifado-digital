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
    if (logs.length > 500) {
        logs.pop();
    }
    saveDataToLocal(DB_KEYS.LOGS, logs);
}

function getAllLogs() {
    return loadDataFromLocal(DB_KEYS.LOGS) || [];
}