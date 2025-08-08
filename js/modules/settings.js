// CÓDIGO CORRIGIDO - js/modules/settings.js
let settings = {};

const defaultSettings = {
    warehouseName: 'Almoxarifado Digital',
    theme: 'light',
    paginationEnabled: true,
    itemsPerPage: 10,
    notificationBehaviors: {
        low_stock: true,
        backup_reminder: true,
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
    itemTypes: ['Geral', 'Consumível', 'Ferramenta', 'Componente', 'Kit'],
    returnableTypes: ['Ferramenta', 'Kit'],
    aisles: 'A, B, C',
    shelvesPerAisle: 5,
    boxesPerShelf: 10,
    backupReminder: { // Adicionado
        lastBackup: null,
        frequencyDays: 7
    },
};

function initializeSettings() {
    const storedSettings = localStorage.getItem('almoxarifadoSettings');
    let loadedSettings = storedSettings ? JSON.parse(storedSettings) : {};

    settings = {
        ...defaultSettings,
        ...loadedSettings,
        notificationBehaviors: {
            ...defaultSettings.notificationBehaviors,
            ...(loadedSettings.notificationBehaviors || {})
        },
        panelVisibility: {
            ...defaultSettings.panelVisibility,
            ...(loadedSettings.panelVisibility || {})
        },
        itemTypes: loadedSettings.itemTypes || [...defaultSettings.itemTypes],
        returnableTypes: loadedSettings.returnableTypes || [...defaultSettings.returnableTypes],
        backupReminder: { // Adicionado
            ...defaultSettings.backupReminder,
            ...(loadedSettings.backupReminder || {})
        }
    };
}


function getSettings() {
    return settings;
}

function saveSettings(newSettings) {
    settings = newSettings;
    localStorage.setItem('almoxarifadoSettings', JSON.stringify(settings));
}

export { initializeSettings, getSettings, saveSettings };