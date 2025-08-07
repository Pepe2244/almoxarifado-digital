function initializeServiceOrders() {
    return loadDataFromLocal(DB_KEYS.SERVICE_ORDERS);
}

function generateServiceOrderId() {
    return `OS-${Date.now()}`;
}

function getAllServiceOrders() {
    return loadDataFromLocal(DB_KEYS.SERVICE_ORDERS) || [];
}

function getServiceOrderById(id) {
    const serviceOrders = getAllServiceOrders();
    return serviceOrders.find(os => os.id === id);
}

function addServiceOrder(osDetails) {
    let serviceOrders = getAllServiceOrders();
    const newServiceOrder = {
        id: generateServiceOrderId(),
        customer: (osDetails.customer || '').trim(),
        status: 'Aberta',
        openDate: new Date().toISOString(),
        closeDate: null,
        technicianId: osDetails.technicianId,
        description: (osDetails.description || '').trim(),
        items: [],
        createdAt: new Date().toISOString()
    };
    serviceOrders.unshift(newServiceOrder);
    saveDataToLocal(DB_KEYS.SERVICE_ORDERS, serviceOrders);
    createLog('CREATE_SERVICE_ORDER', `Nova O.S. criada: ${newServiceOrder.id} para ${newServiceOrder.customer}.`, 'Usuário');
    return newServiceOrder;
}

function updateServiceOrder(id, updatedDetails) {
    let serviceOrders = getAllServiceOrders();
    const index = serviceOrders.findIndex(os => os.id === id);
    if (index === -1) {
        showToast("Ordem de Serviço não encontrada.", "error");
        return null;
    }

    const oldStatus = serviceOrders[index].status;

    serviceOrders[index] = {
        ...serviceOrders[index],
        customer: (updatedDetails.customer || '').trim(),
        status: updatedDetails.status,
        technicianId: updatedDetails.technicianId,
        description: (updatedDetails.description || '').trim(),
        updatedAt: new Date().toISOString()
    };

    if (oldStatus !== 'Fechada' && updatedDetails.status === 'Fechada') {
        serviceOrders[index].closeDate = new Date().toISOString();
    }

    saveDataToLocal(DB_KEYS.SERVICE_ORDERS, serviceOrders);
    createLog('UPDATE_SERVICE_ORDER', `O.S. ${id} atualizada. Status: ${updatedDetails.status}.`, 'Usuário');
    return serviceOrders[index];
}

function deleteServiceOrder(id) {
    let serviceOrders = getAllServiceOrders();
    const osToDelete = serviceOrders.find(os => os.id === id);

    if (!osToDelete) {
        showToast("Ordem de Serviço não encontrada.", "error");
        return false;
    }

    if (osToDelete.items && osToDelete.items.length > 0) {
        showToast(`Não é possível excluir a O.S. ${id} pois ela contém itens alocados.`, "error");
        return false;
    }

    serviceOrders = serviceOrders.filter(os => os.id !== id);
    saveDataToLocal(DB_KEYS.SERVICE_ORDERS, serviceOrders);
    createLog('DELETE_SERVICE_ORDER', `Ordem de Serviço ${id} foi excluída.`, 'Usuário');
    showToast(`O.S. "${id}" excluída com sucesso!`, "success");
    return true;
}

function addItemToServiceOrder(osId, itemId, quantity) {
    let serviceOrders = getAllServiceOrders();
    const osIndex = serviceOrders.findIndex(os => os.id === osId);
    if (osIndex === -1) {
        showToast("Ordem de Serviço não encontrada.", "error");
        return false;
    }
    const serviceOrder = serviceOrders[osIndex];

    const itemData = getItemById(itemId);
    if (!itemData) {
        showToast("Item não encontrado.", "error");
        return false;
    }

    const allocationId = crypto.randomUUID();

    const success = allocateItemToServiceOrder(osId, itemId, quantity, allocationId);
    if (!success) {
        return false;
    }

    if (!serviceOrder.items) {
        serviceOrder.items = [];
    }

    serviceOrder.items.push({
        itemId: itemId,
        quantity: quantity,
        allocationDate: new Date().toISOString(),
        allocationId: allocationId,
        returned: false
    });

    saveDataToLocal(DB_KEYS.SERVICE_ORDERS, serviceOrders);
    createLog('ADD_ITEM_TO_OS', `${quantity}x ${itemData.name} alocado(s) para a O.S. ${osId}.`, 'Usuário');
    showToast("Item alocado para a O.S. com sucesso!", "success");
    return true;
}

function removeItemFromServiceOrder(osId, allocationId) {
    let serviceOrders = getAllServiceOrders();
    const osIndex = serviceOrders.findIndex(os => os.id === osId);
    if (osIndex === -1) {
        showToast("Ordem de Serviço não encontrada.", "error");
        return false;
    }

    const serviceOrder = serviceOrders[osIndex];
    const itemAllocation = serviceOrder.items.find(item => item.allocationId === allocationId);

    if (!itemAllocation) {
        showToast("Item alocado não encontrado na O.S.", "error");
        return false;
    }

    const item = getItemById(itemAllocation.itemId);
    const settings = getSettings();
    const isReturnable = item && (settings.returnableTypes.includes(item.type) || item.type === 'Kit');

    let success = false;
    if (isReturnable) {
        success = deallocateItemFromServiceOrder(itemAllocation.itemId, allocationId);
    } else {
        success = true;
    }

    if (!success) {
        return false;
    }

    serviceOrder.items = serviceOrder.items.filter(item => item.allocationId !== allocationId);

    saveDataToLocal(DB_KEYS.SERVICE_ORDERS, serviceOrders);
    const itemName = item?.name || 'Item desconhecido';
    const logMessage = isReturnable ? `Item ${itemName} removido da O.S. ${osId} e devolvido ao estoque.` : `Item de consumo ${itemName} removido da O.S. ${osId}.`;
    createLog('REMOVE_ITEM_FROM_OS', logMessage, 'Usuário');
    const toastMessage = isReturnable ? "Item removido e estoque devolvido!" : "Item de consumo removido da O.S.!";
    showToast(toastMessage, "success");
    return true;
}