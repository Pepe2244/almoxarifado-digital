let settings = {};

const defaultSettings = {
    warehouseName: 'Almofarixado Digital',
    theme: 'light',
    paginationEnabled: true,
    itemsPerPage: 10,
    notificationBehaviors: {
        low_stock: true, // Por padrão, estoque baixo é uma notificação importante
        backup_reminder: true, // E lembrete de backup também
    },
    panelVisibility: {
        'service-order-management': true,
        'item-management': true,
        'kit-management': true,
        'collaborator-management': true,
        'debit-management': true,
        'reporting-section': true,
        'unified-dashboard': true,
    },
    countFrequency: 90,
    priceCheckFrequency: 30,
    maintenanceFrequency: 180,
    predictiveAlertCritical: 7,
    predictiveAlertWarning: 30,
};

function initializeSettings() {
    const storedSettings = localStorage.getItem('almoxarifadoSettings');
    settings = storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : { ...defaultSettings };

    // Garante que as sub-propriedades existam para evitar erros
    if (!settings.panelVisibility) {
        settings.panelVisibility = { ...defaultSettings.panelVisibility };
    }
    if (!settings.notificationBehaviors) {
        settings.notificationBehaviors = { ...defaultSettings.notificationBehaviors };
    }
}

function getSettings() {
    return settings;
}

function saveSettings(newSettings) {
    settings = newSettings;
    localStorage.setItem('almoxarifadoSettings', JSON.stringify(settings));
}

export { initializeSettings, getSettings, saveSettings };