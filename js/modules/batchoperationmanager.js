// almoxarifado-digital/js/modules/batchOperationManager.js

let currentSession = {
    isActive: false,
    mode: null,
    items: new Map()
};

function startSession(mode) {
    if (currentSession.isActive) {
        showToast(`Já existe uma operação (${currentSession.mode}) em andamento. Finalize-a ou cancele-a primeiro.`, "error");
        return false;
    }
    currentSession.isActive = true;
    currentSession.mode = mode;
    currentSession.items.clear();
    document.body.classList.add(`batch-mode-${mode}`);

    document.body.dispatchEvent(new CustomEvent('batchSessionChanged'));
    console.log(`Sessão de lote iniciada: ${mode}`);
    return true;
}

function endSession() {
    const currentMode = currentSession.mode;
    currentSession.isActive = false;
    currentSession.mode = null;
    currentSession.items.clear();

    if (currentMode) {
        document.body.classList.remove(`batch-mode-${currentMode}`);
    }

    document.body.dispatchEvent(new CustomEvent('batchSessionChanged'));
    console.log("Sessão de lote finalizada.");
}

function addItemToSession(itemId, quantity = 1) {
    if (!currentSession.isActive) return;
    const itemData = getItemById(itemId);
    if (!itemData) return;

    if (currentSession.items.has(itemId)) {
        const existing = currentSession.items.get(itemId);
        existing.quantity += quantity;
    } else {
        currentSession.items.set(itemId, {
            id: itemId,
            name: itemData.name,
            quantity: quantity,
            maxStock: itemData.currentStock
        });
    }
    document.body.dispatchEvent(new CustomEvent('batchSessionChanged'));
}

function removeItemFromSession(itemId) {
    if (currentSession.items.has(itemId)) {
        currentSession.items.delete(itemId);
        document.body.dispatchEvent(new CustomEvent('batchSessionChanged'));
    }
}

function updateItemQuantityInSession(itemId, newQuantity) {
    if (currentSession.items.has(itemId)) {
        const item = currentSession.items.get(itemId);
        if (newQuantity > 0) {
            item.quantity = newQuantity;
        } else {
            removeItemFromSession(itemId);
        }
        document.body.dispatchEvent(new CustomEvent('batchSessionChanged'));
    }
}

function getSession() {
    return {
        isActive: currentSession.isActive,
        mode: currentSession.mode,
        items: Array.from(currentSession.items.values())
    };
}