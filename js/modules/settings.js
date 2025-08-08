let settings = {};

const defaultSettings = {
    warehouseName: 'Almoxarifado Digital',
    theme: 'light',
    paginationEnabled: true,
    itemsPerPage: 10,
    notificationBehaviors: {},
    panelVisibility: {
        'service-order-management': true,
        'item-management': true,
        'kit-management': true,
        'collaborator-management': true,
        'debit-management': true,
        'reporting-section': true,
        'unified-dashboard': true,
    }
};

function initializeSettings() {
    const storedSettings = localStorage.getItem('almoxarifadoSettings');
    settings = storedSettings ? JSON.parse(storedSettings) : { ...defaultSettings };

    if (!settings.panelVisibility) {
        settings.panelVisibility = { ...defaultSettings.panelVisibility };
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
