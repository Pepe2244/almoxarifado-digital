// almoxarifado-digital/js/modules/dataHandler.js
let db;

function initializeDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AlmoxarifadoDB', 1);

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains('images')) {
                dbInstance.createObjectStore('images', { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Erro ao inicializar o IndexedDB:', event.target.error);
            showToast("Erro crítico: Não foi possível iniciar o banco de dados de imagens.", "error");
            reject(event.target.error);
        };
    });
}

function saveDataToLocal(key, data) {
    try {
        const jsonString = JSON.stringify(data);
        localStorage.setItem(key, jsonString);
    } catch (error) {
        console.error(`Erro ao salvar dados para a chave "${key}":`, error);
        if (error.name === 'QuotaExceededError') {
            showToast("Erro Crítico: O armazenamento local está cheio. Não é possível salvar. Considere fazer um backup e limpar dados antigos.", "error");
        } else {
            showToast("Erro crítico ao salvar os dados. Verifique o console para mais detalhes.", "error");
        }
    }
}

function loadDataFromLocal(key) {
    const jsonData = localStorage.getItem(key);
    if (jsonData === null) {
        if (key === DB_KEYS.SETTINGS || key === DB_KEYS.DISMISSED_TEMPORARY_ALERTS) {
            return {};
        }
        return [];
    }

    try {
        return JSON.parse(jsonData);
    } catch (error) {
        console.error(`Erro ao carregar ou analisar dados da chave "${key}":`, error);

        const backupKey = `${key}_corrupted_backup_${new Date().toISOString()}`;
        localStorage.setItem(backupKey, jsonData);
        localStorage.removeItem(key);

        const friendlyKeyName = key.replace('almoxarifado_', '').replace(/s$/, '');
        openConfirmationModal({
            title: 'Erro de Dados Corrompidos',
            message: `Detectamos um problema ao carregar os dados de "${friendlyKeyName}". Para proteger seu sistema, os dados corrompidos foram removidos e um backup de recuperação foi salvo como "${backupKey}".\n\nO sistema continuará com os dados desta seção reiniciados.`,
            showConfirmButton: false
        });

        if (key === DB_KEYS.SETTINGS || key === DB_KEYS.DISMISSED_TEMPORARY_ALERTS) {
            return {};
        }
        return [];
    }
}

function saveImage(itemId, imageDataUrl) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('IndexedDB não inicializado.');
            return;
        }
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.put({ id: itemId, data: imageDataUrl });

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Erro ao salvar imagem no IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

function loadImage(itemId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('IndexedDB não inicializado.');
            return;
        }
        const transaction = db.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        const request = store.get(itemId);

        request.onsuccess = (event) => {
            if (event.target.result) {
                resolve(event.target.result.data);
            } else {
                resolve(null);
            }
        };

        request.onerror = (event) => {
            console.error('Erro ao carregar imagem do IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

function deleteImage(itemId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('IndexedDB não inicializado.');
            return;
        }
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.delete(itemId);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Erro ao deletar imagem do IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}