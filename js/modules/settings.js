// almoxarifado-digital/js/modules/settings.js
function getSettings() {
    let settings = loadDataFromLocal(DB_KEYS.SETTINGS);
    const defaultSettings = {
        _version: '1.1.0',
        warehouseName: 'Meu Almoxarifado',
        itemTypes: ['Eletrônico', 'Ferramenta', 'Material', 'Equipamento', 'Consumível', 'Kit'],
        returnableTypes: ['Ferramenta', 'Equipamento'],
        priceVariationPercentage: 10,
        predictiveAnalysisDays: 90,
        dashboardAnalysisDays: 30,
        alertForReturnables: true,
        paginationEnabled: true,
        itemsPerPage: 10,
        debitCalculation: 'depreciated',
        countFrequency: {
            'Eletrônico': 180,
            'Ferramenta': 90,
            'Material': 365,
            'Equipamento': 90,
            'Consumível': 30
        },
        priceCheckFrequency: 30,
        maintenanceFrequency: {
            'Eletrônico': 365,
            'Ferramenta': 180,
            'Equipamento': 365,
        },
        aisles: 'A,B,C',
        shelvesPerAisle: 5,
        boxesPerShelf: 5,
        stockLevels: {
            ok: 75,
            medium: 50,
            low: 25,
        },
        predictiveAlertLevels: {
            critical: 7,
            warning: 30
        },
        emailSettings: {
            publicKey: '',
            serviceId: '',
            templateId: '',
            recipientEmail: ''
        },
        theme: 'light',
        timezone: 'America/Sao_Paulo',
        backupReminder: {
            lastBackupDate: null,
            frequencyDays: 7
        },
        notificationBehaviors: {
            [ALERT_TYPES.LOW_STOCK]: 'action',
            [ALERT_TYPES.VALIDITY_EXPIRED]: 'action',
            [ALERT_TYPES.PENDING_COUNT]: 'action',
            [ALERT_TYPES.MAINTENANCE_NEEDED]: 'info',
            [ALERT_TYPES.PRICE_VARIATION]: 'info',
            [ALERT_TYPES.PREDICTIVE]: 'info',
            [ALERT_TYPES.VALIDITY_WARNING]: 'info',
            [ALERT_TYPES.PRICE_CHECK_REMINDER]: 'info',
            [ALERT_TYPES.BACKUP_REMINDER]: 'info'
        },
        panelVisibility: {
            'item-management': true,
            'kit-management': true,
            'collaborator-management': true,
            'debit-management': true,
            'reporting-section': true,
            'unified-dashboard': true,
            'service-order-management': true
        }
    };
    return {
        ...defaultSettings, ...settings
    };
}

function saveSettings(settings) {
    const oldSettings = getSettings();
    saveDataToLocal(DB_KEYS.SETTINGS, settings);

    const layoutChanged = oldSettings.aisles !== settings.aisles ||
        oldSettings.shelvesPerAisle !== settings.shelvesPerAisle ||
        oldSettings.boxesPerShelf !== settings.boxesPerShelf;

    if (layoutChanged) {
        const reallocatedCount = reallocateUnshelvedItems();
        if (reallocatedCount > 0) {
            showToast(`${reallocatedCount} item(ns) foram alocados nos novos espaços!`, 'success');
        }
    }
}


function initializeSettings() {
    let settings = loadDataFromLocal(DB_KEYS.SETTINGS);
    const defaultSettings = {
        _version: '1.1.0',
        warehouseName: 'Meu Almoxarifado',
        itemTypes: ['Eletrônico', 'Ferramenta', 'Material', 'Equipamento', 'Consumível', 'Kit'],
        returnableTypes: ['Ferramenta', 'Equipamento'],
        priceVariationPercentage: 10,
        predictiveAnalysisDays: 90,
        dashboardAnalysisDays: 30,
        alertForReturnables: true,
        paginationEnabled: true,
        itemsPerPage: 10,
        debitCalculation: 'depreciated',
        countFrequency: {
            'Eletrônico': 180,
            'Ferramenta': 90,
            'Material': 365,
            'Equipamento': 90,
            'Consumível': 30
        },
        priceCheckFrequency: 30,
        maintenanceFrequency: {
            'Eletrônico': 365,
            'Ferramenta': 180,
            'Equipamento': 365,
        },
        aisles: 'A,B,C',
        shelvesPerAisle: 5,
        boxesPerShelf: 5,
        stockLevels: {
            ok: 75,
            medium: 50,
            low: 25,
        },
        predictiveAlertLevels: {
            critical: 7,
            warning: 30
        },
        emailSettings: {
            publicKey: '',
            serviceId: '',
            templateId: '',
            recipientEmail: ''
        },
        theme: 'light',
        timezone: 'America/Sao_Paulo',
        backupReminder: {
            lastBackupDate: null,
            frequencyDays: 7
        },
        notificationBehaviors: {
            [ALERT_TYPES.LOW_STOCK]: 'action',
            [ALERT_TYPES.VALIDITY_EXPIRED]: 'action',
            [ALERT_TYPES.PENDING_COUNT]: 'action',
            [ALERT_TYPES.MAINTENANCE_NEEDED]: 'info',
            [ALERT_TYPES.PRICE_VARIATION]: 'info',
            [ALERT_TYPES.PREDICTIVE]: 'info',
            [ALERT_TYPES.VALIDITY_WARNING]: 'info',
            [ALERT_TYPES.PRICE_CHECK_REMINDER]: 'info',
            [ALERT_TYPES.BACKUP_REMINDER]: 'info'
        },
        panelVisibility: {
            'item-management': true,
            'kit-management': true,
            'collaborator-management': true,
            'debit-management': true,
            'reporting-section': true,
            'unified-dashboard': true,
            'service-order-management': true
        }
    };

    let needsUpdate = false;
    if (!settings._version || settings._version !== defaultSettings._version) {
        needsUpdate = true;
    }

    for (const key in defaultSettings) {
        if (!settings.hasOwnProperty(key)) {
            settings[key] = defaultSettings[key];
            needsUpdate = true;
        } else if (typeof defaultSettings[key] === 'object' && defaultSettings[key] !== null && !Array.isArray(defaultSettings[key])) {
            for (const subKey in defaultSettings[key]) {
                if (settings[key] && !settings[key].hasOwnProperty(subKey)) {
                    settings[key][subKey] = defaultSettings[key][subKey];
                    needsUpdate = true;
                } else if (!settings[key]) {
                    settings[key] = defaultSettings[key];
                    needsUpdate = true;
                }
            }
        }
    }
    if (needsUpdate) {
        settings._version = defaultSettings._version;
        saveSettings(settings);
    }
}

function addType(newType) {
    let settings = getSettings();
    newType = newType.trim();
    if (!newType) {
        showToast("O nome do tipo não pode ser vazio.", "error");
        return false;
    }
    if (settings.itemTypes.map(t => t.toLowerCase()).includes(newType.toLowerCase())) {
        showToast(`O tipo "${newType}" já existe.`, "error");
        return false;
    }
    settings.itemTypes.push(newType);
    if (!settings.countFrequency[newType]) {
        settings.countFrequency[newType] = 180;
    }
    if (!settings.maintenanceFrequency[newType]) {
        settings.maintenanceFrequency[newType] = 365;
    }
    saveSettings(settings);
    createLog('ADD_TYPE', `Novo tipo de item adicionado: ${newType}.`, 'Usuário');
    showToast(`Tipo "${newType}" adicionado com sucesso!`, "success");
    return true;
}

function deleteType(typeToDelete) {
    let settings = getSettings();
    const allItems = getAllItems();

    const itemsOfType = allItems.filter(item => item.type === typeToDelete);

    if (itemsOfType.length > 0) {
        const itemNames = itemsOfType.map(i => i.name).join(', ');
        showToast(`Não é possível excluir o tipo "${typeToDelete}" pois os seguintes itens o utilizam: ${itemNames}.`, "error");
        return false;
    }

    settings.itemTypes = settings.itemTypes.filter(type => type !== typeToDelete);
    settings.returnableTypes = settings.returnableTypes.filter(type => type !== typeToDelete);
    delete settings.countFrequency[typeToDelete];
    delete settings.maintenanceFrequency[typeToDelete];
    saveSettings(settings);
    createLog('DELETE_TYPE', `Tipo de item excluído: ${typeToDelete}.`, 'Usuário');
    showToast(`Tipo "${typeToDelete}" excluído com sucesso!`, "success");
    return true;
}