// CÓDIGO CORRIGIDO - js/modules/settings.js
let settings = {};

const defaultSettings = {
    warehouseName: 'Almoxarifado Digital',
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
    itemTypes: ['Geral', 'Consumível', 'Ferramenta', 'Componente', 'Kit'], // Adicionado
    returnableTypes: ['Ferramenta', 'Kit'], // Adicionado
};

function initializeSettings() {
    const storedSettings = localStorage.getItem('almoxarifadoSettings');
    let loadedSettings = storedSettings ? JSON.parse(storedSettings) : {};

    // Merge profundo para garantir que todas as chaves padrão existam
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
        returnableTypes: loadedSettings.returnableTypes || [...defaultSettings.returnableTypes]
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