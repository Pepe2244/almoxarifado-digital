// almoxarifado-digital/js/modules/itemManager.js
function initializeItems() {
    return loadDataFromLocal(DB_KEYS.ITEMS);
}

function generateItemId() {
    return crypto.randomUUID();
}

function recalculateStockFromBatches(item, allItemsList) {
    if (!item) {
        return null;
    }

    const itemsToConsider = allItemsList || getAllItems();

    if (item.type === 'Kit') {
        const componentItems = (item.kitItems || []).map(kitItem => {
            const fullItem = itemsToConsider.find(i => i.id === kitItem.id);
            return {
                ...fullItem,
                requiredQuantity: kitItem.quantity
            };
        });

        if (componentItems.length === 0 || componentItems.some(ci => !ci.id)) {
            item.totalStock = 0;
            item.currentStock = 0;
        } else {
            const possibleKits = componentItems.map(ci => {
                if (!ci.requiredQuantity || ci.requiredQuantity <= 0) return Infinity;
                return Math.floor((ci.currentStock || 0) / ci.requiredQuantity);
            });
            const potentialStock = Math.min(...possibleKits);

            item.totalStock = potentialStock + (item.onLoanCount || 0);
            item.currentStock = potentialStock;
        }
    } else {
        item.totalStock = (item.batches || []).reduce((sum, batch) => sum + (batch.quantity || 0), 0);
        item.currentStock = item.totalStock - (item.onLoanCount || 0);
    }

    if (item.currentStock < 0) {
        item.currentStock = 0;
    }

    return item;
}

function updateAffectedKits(componentId, allItemsList) {
    const kitsToUpdate = allItemsList.filter(item =>
        item.type === 'Kit' &&
        item.kitItems &&
        item.kitItems.some(kitItem => kitItem.id === componentId)
    );

    if (kitsToUpdate.length > 0) {
        kitsToUpdate.forEach(kit => {
            recalculateStockFromBatches(kit, allItemsList);
        });
    }
}


async function createItem(itemDetails) {
    const allItems = getAllItems();
    const existingItemByNameAndCompany = allItems.find(item =>
        item.name.toLowerCase() === itemDetails.name.toLowerCase() &&
        item.empresa === itemDetails.empresa
    );
    if (existingItemByNameAndCompany) {
        showToast(`Item com o nome "${itemDetails.name}" já existe para a empresa "${itemDetails.empresa}".`, "error");
        return null;
    }
    if (itemDetails.barcode && itemDetails.barcode.trim() !== '') {
        const existingItemByBarcode = allItems.find(item => item.barcode === itemDetails.barcode.trim());
        if (existingItemByBarcode) {
            showToast(`O código de barras "${itemDetails.barcode}" já está associado ao item "${existingItemByBarcode.name}".`, "error");
            return null;
        }
    }

    const settings = getSettings();
    const isReturnable = settings.returnableTypes.includes(itemDetails.type);
    const initialStock = parseInt(itemDetails.currentStock, 10) || 0;
    const newItemId = generateItemId();

    const newItem = {
        id: newItemId,
        name: itemDetails.name.trim(),
        barcode: (itemDetails.barcode || '').trim(),
        empresa: itemDetails.empresa,
        ca: (itemDetails.ca || '').trim(),
        type: itemDetails.type,
        almoxarifado: itemDetails.almoxarifado,
        unit: (itemDetails.unit || '').trim(),
        minStock: parseInt(itemDetails.minStock, 10) || 0,
        maxStock: parseInt(itemDetails.maxStock, 10) || 0,
        price: parseFloat(itemDetails.price) || 0,
        shelfLifeDays: parseInt(itemDetails.shelfLifeDays, 10) || 0,
        hasImage: !!itemDetails.imageUrl,
        location: {
            aisle: (itemDetails.location?.aisle || '').trim(),
            shelf: (itemDetails.location?.shelf || '').trim(),
            box: (itemDetails.location?.box || '').trim()
        },
        isReturnable: isReturnable,
        status: isReturnable ? (itemDetails.status || 'Ativo') : 'N/A',
        totalStock: 0,
        currentStock: 0,
        onLoanCount: 0,
        history: [],
        priceHistory: [{
            date: new Date().toISOString(),
            price: parseFloat(itemDetails.price) || 0
        }],
        batches: [],
        allocations: [],
        maintenanceHistory: [],
        kitItems: itemDetails.type === 'Kit' ? [] : undefined,
        createdAt: new Date().toISOString()
    };

    if (initialStock > 0 && newItem.type !== 'Kit') {
        newItem.batches.push({
            batchId: crypto.randomUUID(),
            quantity: initialStock,
            purchaseDate: new Date().toISOString().split('T')[0],
            manufacturingDate: null,
            shelfLifeDays: newItem.shelfLifeDays,
            isInitialStock: true
        });
        newItem.history.unshift({
            type: ACTIONS.HISTORY_ENTRY,
            quantity: initialStock,
            timestamp: new Date().toISOString(),
            responsible: 'Estoque Inicial',
            details: 'Registro de estoque inicial do item.'
        });
    }

    recalculateStockFromBatches(newItem, allItems);

    allItems.push(newItem);
    saveDataToLocal(DB_KEYS.ITEMS, allItems);

    if (itemDetails.imageUrl) {
        try {
            await saveImage(newItemId, itemDetails.imageUrl);
        } catch (error) {
            showToast("Item salvo, mas falha ao guardar a imagem.", "error");
        }
    }

    return newItem;
}

function addMultipleItems(itemsToAdd) {
    let allItems = getAllItems();
    let addedCount = 0;
    let ignoredCount = 0;
    let addedNames = [];
    let ignoredNames = [];
    let addedItems = [];
    const existingNames = new Set(allItems.map(item => item.name.toLowerCase()));
    const settings = getSettings();

    itemsToAdd.forEach(itemDetails => {
        const trimmedName = itemDetails.name.trim();
        if (!trimmedName || existingNames.has(trimmedName.toLowerCase())) {
            ignoredCount++;
            ignoredNames.push(trimmedName || 'NOME VAZIO');
            return;
        }
        const isReturnable = settings.returnableTypes.includes(itemDetails.type || 'Ferramenta');
        const newItem = {
            id: generateItemId(),
            name: trimmedName,
            barcode: '',
            empresa: 'Weldingpro',
            ca: '',
            type: itemDetails.type || 'Ferramenta',
            unit: 'un',
            currentStock: 0,
            minStock: 0,
            maxStock: 0,
            price: 0,
            shelfLifeDays: 0,
            hasImage: false,
            location: {
                aisle: '',
                shelf: '',
                box: ''
            },
            isReturnable: isReturnable,
            status: isReturnable ? 'Ativo' : 'N/A',
            totalStock: 0,
            onLoanCount: 0,
            history: [],
            priceHistory: [],
            batches: [],
            allocations: [],
            maintenanceHistory: [],
            kitItems: undefined,
            createdAt: new Date().toISOString()
        };
        allItems.push(newItem);
        existingNames.add(newItem.name.toLowerCase());
        addedCount++;
        addedNames.push(newItem.name);
        addedItems.push(newItem);
    });

    if (addedCount > 0) {
        saveDataToLocal(DB_KEYS.ITEMS, allItems);
    }
    return {
        added: addedCount,
        ignored: ignoredCount,
        addedNames: addedNames,
        ignoredNames: ignoredNames,
        addedItems: addedItems
    };
}


function getItemById(id) {
    const items = getAllItems();
    return items.find(item => item.id === id);
}

function getItemByBarcode(barcode) {
    if (!barcode || barcode.trim() === '') return null;
    const items = getAllItems();
    return items.find(item => item.barcode === barcode.trim());
}

function getAllItems() {
    return loadDataFromLocal(DB_KEYS.ITEMS) || [];
}

async function updateItem(id, updatedDetails) {
    let items = getAllItems();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) {
        showToast("Item não encontrado.", "error");
        return null;
    }

    const existingItemByName = items.find(item => item.id !== id && item.name.toLowerCase() === updatedDetails.name.toLowerCase());
    if (existingItemByName) {
        showToast(`Item com o nome "${updatedDetails.name}" já existe.`, "error");
        return null;
    }

    if (updatedDetails.barcode && updatedDetails.barcode.trim() !== '') {
        const existingItemByBarcode = items.find(item => item.id !== id && item.barcode === updatedDetails.barcode.trim());
        if (existingItemByBarcode) {
            showToast(`O código de barras "${updatedDetails.barcode}" já está associado ao item "${existingItemByBarcode.name}".`, "error");
            return null;
        }
    }

    const oldItem = {
        ...items[index]
    };
    const settings = getSettings();
    const isNowReturnable = settings.returnableTypes.includes(updatedDetails.type);
    const isNowKit = updatedDetails.type === 'Kit';

    if (oldItem.isReturnable && !isNowReturnable && oldItem.onLoanCount > 0) {
        showToast(`Não é possível alterar o tipo para não-retornável pois existem ${oldItem.onLoanCount} unidades emprestadas.`, "error");
        return null;
    }

    if (isNowKit && oldItem.type !== 'Kit' && oldItem.totalStock > 0) {
        showToast("Não é possível converter um item com estoque para Kit. Zere o estoque primeiro.", "error");
        return null;
    }

    const newPrice = parseFloat(updatedDetails.price);

    items[index] = {
        ...items[index],
        name: updatedDetails.name.trim(),
        barcode: (updatedDetails.barcode || '').trim(),
        empresa: updatedDetails.empresa,
        ca: (updatedDetails.ca || '').trim(),
        type: updatedDetails.type,
        almoxarifado: updatedDetails.almoxarifado,
        unit: (updatedDetails.unit || '').trim(),
        minStock: parseInt(updatedDetails.minStock, 10) || 0,
        maxStock: parseInt(updatedDetails.maxStock, 10) || 0,
        price: newPrice,
        shelfLifeDays: parseInt(updatedDetails.shelfLifeDays, 10) || 0,
        hasImage: !!updatedDetails.imageUrl,
        location: {
            aisle: (updatedDetails.location?.aisle || '').trim(),
            shelf: (updatedDetails.location?.shelf || '').trim(),
            box: (updatedDetails.location?.box || '').trim()
        },
        isReturnable: isNowReturnable,
        status: isNowReturnable ? (updatedDetails.status || 'Ativo') : 'N/A',
        updatedAt: new Date().toISOString()
    };

    if (isNowKit && !oldItem.kitItems) {
        items[index].kitItems = [];
        items[index].batches = undefined;
    } else if (!isNowKit) {
        items[index].kitItems = undefined;
    }

    if (oldItem.price !== newPrice) {
        if (!items[index].priceHistory) {
            items[index].priceHistory = [];
        }
        items[index].priceHistory.push({
            date: new Date().toISOString(),
            price: newPrice
        });
    }

    recalculateStockFromBatches(items[index], items);

    saveDataToLocal(DB_KEYS.ITEMS, items);

    if (updatedDetails.imageUrl) {
        try {
            await saveImage(id, updatedDetails.imageUrl);
        } catch (error) {
            showToast("Detalhes do item atualizados, mas falha ao guardar a nova imagem.", "error");
        }
    } else if (oldItem.hasImage) {
        await deleteImage(id);
        items[index].hasImage = false;
        saveDataToLocal(DB_KEYS.ITEMS, items);
    }

    return items[index];
}

async function deleteItem(id) {
    let items = getAllItems();
    const itemToDelete = items.find(item => item.id === id);
    if (!itemToDelete) {
        showToast("Item não encontrado.", "error");
        return false;
    }
    if (itemToDelete.totalStock > 0) {
        showToast("Não é possível excluir um item com estoque. Ajuste o estoque para 0 primeiro.", "error");
        return false;
    }
    if (itemToDelete.onLoanCount > 0) {
        showToast("Não é possível excluir um item que está emprestado. Registre a devolução ou perda primeiro.", "error");
        return false;
    }
    if (itemToDelete.type === 'Kit' && itemToDelete.kitItems && itemToDelete.kitItems.length > 0) {
        showToast("Não é possível excluir um kit que contém itens. Remova todos os componentes do kit primeiro.", "error");
        return false;
    }

    const isComponentOfKit = items.some(item =>
        item.type === 'Kit' &&
        item.kitItems &&
        item.kitItems.some(kitComponent => kitComponent.id === id)
    );

    if (isComponentOfKit) {
        showToast(`Não é possível excluir "${itemToDelete.name}" pois ele é componente de um ou mais kits.`, "error");
        return false;
    }

    items = items.filter(item => item.id !== id);
    saveDataToLocal(DB_KEYS.ITEMS, items);

    if (itemToDelete.hasImage) {
        await deleteImage(id);
    }

    createLog('DELETE_ITEM', `Item excluído: ${itemToDelete.name}.`, 'Usuário');
    showToast(`Item "${itemToDelete.name}" excluído com sucesso!`, "success");
    return true;
}

function addBatchToItem(itemId, quantity, acquisitionDate, manufacturingDate, shelfLifeDaysOverride) {
    let items = getAllItems();
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado.", "error");
        return false;
    }
    const item = items[itemIndex];
    const newQuantity = parseInt(quantity, 10);
    const effectiveShelfLifeDays = parseInt(shelfLifeDaysOverride, 10) || item.shelfLifeDays || 0;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (newQuantity <= 0 || isNaN(newQuantity)) {
        showToast("A quantidade do lote deve ser maior que zero.", "error");
        return false;
    }
    if (!acquisitionDate) {
        showToast("A data de aquisição é obrigatória.", "error");
        return false;
    }
    if (new Date(acquisitionDate) > today) {
        showToast("A data de aquisição não pode ser futura.", "error");
        return false;
    }
    if (manufacturingDate && new Date(manufacturingDate) > today) {
        showToast("A data de fabricação não pode ser futura.", "error");
        return false;
    }
    if (manufacturingDate && new Date(manufacturingDate) > new Date(acquisitionDate)) {
        showToast("A data de fabricação não pode ser posterior à data de aquisição.", "error");
        return false;
    }

    if (!item.batches) {
        item.batches = [];
    }

    item.batches.push({
        batchId: crypto.randomUUID(),
        quantity: newQuantity,
        purchaseDate: acquisitionDate,
        manufacturingDate: manufacturingDate || null,
        shelfLifeDays: effectiveShelfLifeDays
    });

    item.history.unshift({
        type: ACTIONS.HISTORY_ENTRY,
        quantity: newQuantity,
        timestamp: new Date().toISOString(),
        responsible: 'Sistema (Lote)',
        details: `Adição de ${newQuantity} unidade(s) via novo lote.`
    });

    recalculateStockFromBatches(item, items);
    updateAffectedKits(item.id, items);

    saveDataToLocal(DB_KEYS.ITEMS, items);
    return true;
}

function deleteBatchFromItem(itemId, batchId) {
    let items = getAllItems();
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado.", "error");
        return false;
    }
    const item = items[itemIndex];
    const batchIndex = item.batches.findIndex(batch => batch.batchId === batchId);
    if (batchIndex === -1) {
        showToast("Lote não encontrado.", "error");
        return false;
    }

    const batch = item.batches[batchIndex];
    const batchQuantity = batch.quantity;

    item.batches.splice(batchIndex, 1);

    item.history.unshift({
        type: ACTIONS.HISTORY_ADJUSTMENT,
        quantity: -batchQuantity,
        timestamp: new Date().toISOString(),
        responsible: 'Usuário (Exclusão de Lote)',
        details: `Lote ${batch.batchId.substring(0, 8)} com ${batchQuantity} unidade(s) foi excluído.`
    });

    recalculateStockFromBatches(item, items);
    updateAffectedKits(item.id, items);

    saveDataToLocal(DB_KEYS.ITEMS, items);
    createLog('DELETE_BATCH', `Lote ${batchId.substring(0, 8)} do item ${item.name} foi excluído. Estoque ajustado em -${batchQuantity}.`, 'Usuário');
    showToast('Lote excluído e estoque ajustado!', 'success');
    return true;
}


function addMaintenanceRecord(itemId, record) {
    let items = getAllItems();
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado.", "error");
        return false;
    }
    const item = items[itemIndex];
    if (!item.maintenanceHistory) {
        item.maintenanceHistory = [];
    }
    const newRecord = {
        id: crypto.randomUUID(),
        date: record.date,
        description: record.description.trim(),
        responsible: record.responsible.trim(),
        cost: record.cost,
        timestamp: new Date().toISOString()
    };
    item.maintenanceHistory.unshift(newRecord);
    item.lastMaintenanceDate = newRecord.date;
    saveDataToLocal(DB_KEYS.ITEMS, items);
    return true;
}

function calculateDebitValue(item, allocation) {
    const settings = getSettings();
    let debitValue = 0;

    if (item.type === 'Kit') {
        const allItems = getAllItems();
        debitValue = (item.kitItems || []).reduce((total, kitComponent) => {
            const componentItem = allItems.find(i => i.id === kitComponent.id);
            if (componentItem) {
                const componentPrice = componentItem.price || 0;
                return total + (componentPrice * kitComponent.quantity);
            }
            return total;
        }, 0);
        debitValue *= allocation.quantity;
    } else if (settings.debitCalculation === 'replacement' || !item.isReturnable) {
        debitValue = allocation.quantity * (item.price || 0);
    } else if (settings.debitCalculation === 'depreciated' && item.shelfLifeDays > 0) {
        const itemLifeSpanDays = item.shelfLifeDays;
        const daysUsed = Math.max(0, Math.ceil((new Date().getTime() - new Date(allocation.date).getTime()) / (1000 * 60 * 60 * 24)));
        const depreciationFactor = Math.min(daysUsed / itemLifeSpanDays, 1);
        const depreciatedPrice = (item.price || 0) * (1 - depreciationFactor);
        debitValue = allocation.quantity * depreciatedPrice;
    } else {
        debitValue = allocation.quantity * (item.price || 0);
    }

    return Math.max(0, debitValue);
}

function addItemToKit(kitId, componentId, quantity) {
    let items = getAllItems();
    const kitIndex = items.findIndex(item => item.id === kitId);
    if (kitIndex === -1) {
        showToast("Kit não encontrado.", "error");
        return false;
    }
    const kit = items[kitIndex];
    if (!kit.kitItems) {
        kit.kitItems = [];
    }

    const componentToAdd = items.find(item => item.id === componentId);
    if (!componentToAdd) {
        showToast("Item componente não encontrado.", "error");
        return false;
    }
    if (componentToAdd.type === 'Kit') {
        showToast("Não é possível adicionar um kit como componente de outro kit.", "error");
        return false;
    }

    const existingComponent = kit.kitItems.find(item => item.id === componentId);
    if (existingComponent) {
        showToast("Este item já faz parte do kit.", "info");
        return false;
    }

    kit.kitItems.push({
        id: componentId,
        quantity: quantity
    });
    recalculateStockFromBatches(kit, items);
    saveDataToLocal(DB_KEYS.ITEMS, items);
    return true;
}

function removeItemFromKit(kitId, componentId) {
    let items = getAllItems();
    const kitIndex = items.findIndex(item => item.id === kitId);
    if (kitIndex === -1) {
        showToast("Kit não encontrado.", "error");
        return false;
    }
    const kit = items[kitIndex];
    kit.kitItems = (kit.kitItems || []).filter(item => item.id !== componentId);

    recalculateStockFromBatches(kit, items);
    saveDataToLocal(DB_KEYS.ITEMS, items);
    return true;
}

function updateKitComposition(kitId, components) {
    let items = getAllItems();
    const kitIndex = items.findIndex(item => item.id === kitId);
    if (kitIndex === -1) {
        showToast("Kit não encontrado para atualizar.", "error");
        return false;
    }
    const kit = items[kitIndex];

    for (const component of components) {
        const componentItem = items.find(i => i.id === component.id);
        if (!componentItem) {
            showToast(`Componente com ID ${component.id} não encontrado.`, "error");
            return false;
        }
        if (componentItem.type === 'Kit') {
            showToast(`Não é possível adicionar um kit (${componentItem.name}) como componente.`, "error");
            return false;
        }
    }

    kit.kitItems = components;
    recalculateStockFromBatches(kit, items);
    saveDataToLocal(DB_KEYS.ITEMS, items);
    createLog('UPDATE_KIT', `Composição do kit ${kit.name} atualizada.`, 'Usuário');
    return true;
}