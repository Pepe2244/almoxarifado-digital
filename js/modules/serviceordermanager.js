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

    const settings = getSettings();
    const allItems = getAllItems();
    const nonReturnedItems = (osToDelete.items || []).filter(osItem => {
        const itemInfo = allItems.find(i => i.id === osItem.itemId);
        const isReturnable = itemInfo && (settings.returnableTypes.includes(itemInfo.type) || itemInfo.type === 'Kit');
        return isReturnable && !osItem.returned;
    });

    if (nonReturnedItems.length > 0) {
        const itemNames = nonReturnedItems.map(i => getItemById(i.itemId)?.name).join(', ');
        showToast(`Não é possível excluir a O.S. ${id} pois ela contém itens retornáveis pendentes: ${itemNames}.`, "error");
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

function returnItemFromGeneralAllocation(osId, allocationId) {
    let serviceOrders = getAllServiceOrders();
    const osIndex = serviceOrders.findIndex(os => os.id === osId);
    if (osIndex === -1) {
        console.error(`[serviceOrderManager] Tentativa de devolução para O.S. não encontrada: ${osId}`);
        return false;
    }

    const serviceOrder = serviceOrders[osIndex];
    const itemAllocationIndex = (serviceOrder.items || []).findIndex(item => item.allocationId === allocationId);

    if (itemAllocationIndex === -1) {
        console.error(`[serviceOrderManager] Tentativa de devolução para alocação não encontrada na O.S. ${osId}. AllocationId: ${allocationId}`);
        return true;
    }

    serviceOrder.items[itemAllocationIndex].returned = true;
    serviceOrder.items[itemAllocationIndex].returnDate = new Date().toISOString();

    saveDataToLocal(DB_KEYS.SERVICE_ORDERS, serviceOrders);
    const itemName = getItemById(serviceOrder.items[itemAllocationIndex].itemId)?.name || 'Item desconhecido';
    createLog('OS_ITEM_RETURNED', `Item ${itemName} marcado como devolvido na O.S. ${osId} (via devolução geral).`, 'Sistema');

    return true;
}

function returnItemToStockFromOS(osId, allocationId) {
    let serviceOrders = getAllServiceOrders();
    const os = serviceOrders.find(os => os.id === osId);
    if (!os) {
        showToast("Ordem de Serviço não encontrada.", "error");
        return false;
    }

    const itemAllocation = (os.items || []).find(item => item.allocationId === allocationId);
    if (!itemAllocation) {
        showToast("Item alocado não encontrado na O.S.", "error");
        return false;
    }

    if (itemAllocation.returned) {
        showToast("Este item já foi devolvido.", "info");
        return false;
    }

    const success = returnAllocation(itemAllocation.itemId, allocationId);

    if (success) {
        const itemName = getItemById(itemAllocation.itemId)?.name || 'Item desconhecido';
        showToast(`Item ${itemName} devolvido da O.S. para o estoque!`, "success");
        createLog('RETURN_ITEM_FROM_OS', `Item ${itemName} devolvido da O.S. ${osId}.`, 'Usuário');
    }

    return success;
}