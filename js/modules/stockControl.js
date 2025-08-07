// almoxarifado-digital/js/modules/stockControl.js
function registerMovement(itemId, quantity, collaboratorId, allocationLocation = '') {
    let allItems = getAllItems();
    const itemIndex = allItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado para registrar movimentação.", "error");
        return false;
    }

    const item = allItems[itemIndex];
    const movementQuantity = parseInt(quantity, 10);
    const collaborator = getCollaboratorById(collaboratorId);

    if (movementQuantity <= 0 || isNaN(movementQuantity)) {
        showToast("A quantidade da movimentação deve ser um número positivo.", "error");
        return false;
    }
    if (item.currentStock < movementQuantity) {
        showToast(`Estoque insuficiente para ${item.name}. Disponível: ${item.currentStock}.`, "error");
        return false;
    }
    if (!collaborator) {
        showToast("Colaborador não encontrado.", "error");
        return false;
    }

    const settings = getSettings();
    const isLoan = settings.returnableTypes.includes(item.type) || item.type === 'Kit';
    const historyTimestamp = new Date().toISOString();
    const historyDetails = `para ${collaborator.name} (${allocationLocation.trim() || 'N/A'}).`;

    if (isLoan) {
        item.onLoanCount = (item.onLoanCount || 0) + movementQuantity;
        if (!item.allocations) item.allocations = [];
        item.allocations.push({
            id: crypto.randomUUID(),
            quantity: movementQuantity,
            collaboratorId: collaboratorId,
            date: historyTimestamp,
            location: allocationLocation.trim()
        });
        item.history.unshift({
            type: ACTIONS.HISTORY_LOAN,
            quantity: movementQuantity,
            timestamp: historyTimestamp,
            responsible: collaborator.name,
            details: `Empréstimo de ${movementQuantity} unidade(s) ${historyDetails}`
        });

        if (item.type === 'Kit') {
            for (const kitComponent of item.kitItems) {
                const componentItem = allItems.find(i => i.id === kitComponent.id);
                if (componentItem) {
                    const quantityToDeduct = kitComponent.quantity * movementQuantity;
                    distributeStockFromBatches(componentItem, quantityToDeduct);
                    recalculateStockFromBatches(componentItem, allItems);
                    updateAffectedKits(componentItem.id, allItems);
                }
            }
        }
        showToast(`Empréstimo de ${movementQuantity} ${item.name} para ${collaborator.name} registrado!`, "success");

    } else {
        distributeStockFromBatches(item, movementQuantity);
        item.history.unshift({
            type: ACTIONS.HISTORY_EXIT,
            quantity: movementQuantity,
            timestamp: historyTimestamp,
            responsible: collaborator.name,
            details: `Saída de ${movementQuantity} unidade(s) ${historyDetails}`
        });
        updateAffectedKits(item.id, allItems);
        showToast(`Saída de ${movementQuantity} ${item.name} para ${collaborator.name} registrada!`, "success");
    }

    recalculateStockFromBatches(item, allItems);
    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    return true;
}

function returnAllocation(itemId, allocationId, lossDetails = null) {
    let allItems = getAllItems();
    const itemIndex = allItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado para devolução.", "error");
        return false;
    }

    const item = allItems[itemIndex];
    const allocationIndex = item.allocations?.findIndex(alloc => alloc.id === allocationId);
    if (allocationIndex === -1) {
        showToast("Registro de empréstimo não encontrado.", "error");
        return false;
    }

    const allocation = item.allocations[allocationIndex];
    const collaboratorName = getCollaboratorById(allocation.collaboratorId)?.name || 'Desconhecido';
    const historyTimestamp = new Date().toISOString();

    if (item.type === 'Kit') {
        const returnedWithLoss = lossDetails && Object.values(lossDetails.quantities).some(qty => qty > 0);

        if (returnedWithLoss) {
            let debitLogDetails = [];
            for (const componentId in lossDetails.quantities) {
                const lossQty = lossDetails.quantities[componentId];
                if (lossQty > 0) {
                    const componentItem = allItems.find(i => i.id === componentId);
                    if (componentItem) {
                        const debitAmount = lossQty * (componentItem.price || 0);
                        if (debitAmount > 0) {
                            addDebit(allocation.collaboratorId, componentItem.id, componentItem.name, lossQty, debitAmount, `Perda de componente do kit ${item.name}.`);
                        }
                        distributeStockFromBatches(componentItem, lossQty);
                        debitLogDetails.push(`${lossQty}x ${componentItem.name}`);
                        componentItem.history.unshift({
                            type: ACTIONS.HISTORY_LOSS,
                            quantity: lossQty,
                            timestamp: historyTimestamp,
                            responsible: collaboratorName,
                            details: `Perda de ${lossQty}x ${componentItem.name} do kit ${item.name}.`
                        });
                    } else {
                        createLog('KIT_RETURN_FAIL', `Componente com ID ${componentId} não encontrado durante devolução com perdas do kit ${item.name}.`, 'Sistema');
                    }
                }
            }

            item.history.unshift({
                type: ACTIONS.HISTORY_RETURN,
                quantity: allocation.quantity,
                timestamp: historyTimestamp,
                responsible: collaboratorName,
                details: `Devolução de ${allocation.quantity} kit(s) com perdas: ${debitLogDetails.join(', ')}.`
            });

            item.kitItems.forEach(kitComponent => {
                const componentItem = allItems.find(i => i.id === kitComponent.id);
                if (componentItem) {
                    const lossQty = lossDetails.quantities[kitComponent.id] || 0;
                    const expectedQty = kitComponent.quantity * allocation.quantity;
                    const returnedQty = expectedQty - lossQty;
                    if (returnedQty > 0) {
                        componentItem.batches.push({
                            batchId: crypto.randomUUID(),
                            quantity: returnedQty,
                            purchaseDate: new Date().toISOString().split('T')[0],
                            isReturn: true
                        });
                    }
                    recalculateStockFromBatches(componentItem, allItems);
                    updateAffectedKits(componentItem.id, allItems);
                } else {
                    createLog('KIT_RETURN_FAIL', `Componente com ID ${kitComponent.id} não foi encontrado no sistema durante a devolução do kit ${item.name}. O estoque deste item não foi reposto.`, 'Sistema');
                }
            });

        } else {
            item.kitItems.forEach(kitComponent => {
                const componentItem = allItems.find(i => i.id === kitComponent.id);
                if (componentItem) {
                    const returnedQty = kitComponent.quantity * allocation.quantity;
                    componentItem.batches.push({
                        batchId: crypto.randomUUID(),
                        quantity: returnedQty,
                        purchaseDate: new Date().toISOString().split('T')[0],
                        isReturn: true
                    });
                    recalculateStockFromBatches(componentItem, allItems);
                    updateAffectedKits(componentItem.id, allItems);
                } else {
                    createLog('KIT_RETURN_FAIL', `Componente com ID ${kitComponent.id} não foi encontrado no sistema durante a devolução do kit ${item.name}. O estoque deste item não foi reposto.`, 'Sistema');
                }
            });
            item.history.unshift({
                type: ACTIONS.HISTORY_RETURN,
                quantity: allocation.quantity,
                timestamp: historyTimestamp,
                responsible: collaboratorName,
                details: `Devolução completa de ${allocation.quantity} unidade(s).`
            });
        }
    } else {
        item.history.unshift({
            type: ACTIONS.HISTORY_RETURN,
            quantity: allocation.quantity,
            timestamp: historyTimestamp,
            responsible: collaboratorName,
            details: `Devolução de ${allocation.quantity} unidade(s) de empréstimo.`
        });
        updateAffectedKits(item.id, allItems);
    }

    item.onLoanCount = Math.max(0, item.onLoanCount - allocation.quantity);
    item.allocations.splice(allocationIndex, 1);

    recalculateStockFromBatches(item, allItems);
    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    return true;
}

function registerLoss(itemId, allocationId, reason) {
    let allItems = getAllItems();
    const itemIndex = allItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado.", "error");
        return false;
    }
    const item = allItems[itemIndex];
    const allocationIndex = item.allocations?.findIndex(alloc => alloc.id === allocationId);
    if (allocationIndex === -1) {
        showToast("Alocação não encontrada.", "error");
        return false;
    }

    const allocation = item.allocations[allocationIndex];
    const collaborator = getCollaboratorById(allocation.collaboratorId);
    const historyTimestamp = new Date().toISOString();
    let debitAmount = 0;

    item.onLoanCount = Math.max(0, item.onLoanCount - allocation.quantity);

    if (item.type === 'Kit') {
        debitAmount = (item.kitItems || []).reduce((total, kitComponent) => {
            const componentItem = allItems.find(i => i.id === kitComponent.id);
            if (componentItem) {
                const componentPrice = componentItem.price || 0;
                const quantityToDeduct = kitComponent.quantity * allocation.quantity;

                distributeStockFromBatches(componentItem, quantityToDeduct);
                componentItem.history.unshift({
                    type: ACTIONS.HISTORY_LOSS,
                    quantity: quantityToDeduct,
                    timestamp: historyTimestamp,
                    responsible: collaborator?.name || 'Desconhecido',
                    details: `Perda de ${quantityToDeduct}x ${componentItem.name} como parte do kit perdido ${item.name}.`
                });
                recalculateStockFromBatches(componentItem, allItems);
                updateAffectedKits(componentItem.id, allItems);

                return total + (componentPrice * quantityToDeduct);
            }
            return total;
        }, 0);
    } else {
        debitAmount = calculateDebitValue(item, allocation);
        distributeStockFromBatches(item, allocation.quantity);
        updateAffectedKits(item.id, allItems);
    }

    item.history.unshift({
        type: ACTIONS.HISTORY_LOSS,
        quantity: allocation.quantity,
        timestamp: historyTimestamp,
        responsible: collaborator?.name || 'Desconhecido',
        details: `Perda de ${allocation.quantity} unidade(s). Motivo: ${reason}. Débito gerado.`
    });
    item.allocations.splice(allocationIndex, 1);

    if (debitAmount > 0 && collaborator) {
        addDebit(collaborator.id, item.id, item.name, allocation.quantity, debitAmount, reason);
    }

    recalculateStockFromBatches(item, allItems);
    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    createLog('REGISTER_LOSS_COMPLETE', `Perda de ${allocation.quantity} ${item.name} registrada para ${collaborator?.name || 'Desconhecido'}. Débito: R$ ${debitAmount.toFixed(2)}. Motivo: ${reason}`, 'Usuário');
    return true;
}

function registerDirectLoss(itemId, quantity, reason, responsible, collaboratorId = null) {
    let allItems = getAllItems();
    const itemIndex = allItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado para registrar perda direta.", "error");
        return false;
    }

    const item = allItems[itemIndex];
    const lossQuantity = parseInt(quantity, 10);

    if (lossQuantity <= 0 || isNaN(lossQuantity)) {
        showToast("A quantidade da perda deve ser um número positivo.", "error");
        return false;
    }
    if (item.totalStock < lossQuantity) {
        showToast(`Estoque insuficiente para registrar a perda. Disponível: ${item.totalStock}.`, "error");
        return false;
    }

    const debitAmount = lossQuantity * (item.price || 0);
    const collaboratorName = collaboratorId ? (getCollaboratorById(collaboratorId)?.name || 'Desconhecido') : 'N/A';

    item.history.unshift({
        type: ACTIONS.HISTORY_DISCARD,
        quantity: lossQuantity,
        timestamp: new Date().toISOString(),
        responsible: responsible,
        details: `Descarte de ${lossQuantity} unidade(s). Motivo: ${reason}.`
    });

    if (debitAmount > 0 && collaboratorId) {
        addDebit(collaboratorId, item.id, item.name, lossQuantity, debitAmount, `Perda/Descarte Direto: ${reason}`);
    }

    distributeStockFromBatches(item, lossQuantity);
    recalculateStockFromBatches(item, allItems);
    updateAffectedKits(item.id, allItems);

    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    createLog('REGISTER_DIRECT_LOSS_COMPLETE', `Perda direta de ${lossQuantity} ${item.name} registrada. Motivo: ${reason}.` + (collaboratorId ? ` Débito de R$ ${debitAmount.toFixed(2)} para ${collaboratorName}.` : ''), 'Usuário');
    showToast(`Perda direta de ${lossQuantity} ${item.name} registrada!`, "success");
    return true;
}

function adjustStockCount(itemId, newPhysicalCount, responsible) {
    let allItems = getAllItems();
    const itemIndex = allItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado para ajuste de estoque.", "error");
        return false;
    }
    const item = allItems[itemIndex];
    const count = parseInt(newPhysicalCount, 10);

    if (isNaN(count) || count < 0) {
        showToast("A contagem física deve ser um número não negativo.", "error");
        return false;
    }

    const onLoan = item.onLoanCount || 0;
    const currentPhysicalStock = item.totalStock - onLoan;
    const difference = count - currentPhysicalStock;

    item.history.unshift({
        type: ACTIONS.HISTORY_ADJUSTMENT,
        quantity: difference,
        timestamp: new Date().toISOString(),
        responsible: responsible,
        details: `Ajuste de estoque físico de ${currentPhysicalStock} para ${count}. Diferença: ${difference > 0 ? '+' : ''}${difference}.`
    });

    if (difference === 0) {
        saveDataToLocal(DB_KEYS.ITEMS, allItems);
        showToast("Contagem registrada. Nenhuma alteração no estoque.", "info");
        return true;
    }

    if (difference > 0) {
        if (!item.batches) item.batches = [];
        item.batches.push({
            batchId: crypto.randomUUID(),
            quantity: difference,
            purchaseDate: new Date().toISOString().split('T')[0],
            isAdjustment: true
        });
    } else {
        distributeStockFromBatches(item, Math.abs(difference));
    }

    recalculateStockFromBatches(item, allItems);
    updateAffectedKits(item.id, allItems);

    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    createLog('ADJUST_STOCK_COUNT', `Estoque de ${item.name} ajustado para ${count}. Diferença: ${difference > 0 ? '+' : ''}${difference}.`, 'Usuário');
    showToast(`Estoque de ${item.name} ajustado para ${count} unidades!`, "success");
    return true;
}

function addStockEntry(itemId, quantity, responsible) {
    let allItems = getAllItems();
    const itemIndex = allItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado para entrada de estoque.", "error");
        return false;
    }
    const item = allItems[itemIndex];
    const entryQuantity = parseInt(quantity, 10);

    if (entryQuantity <= 0 || isNaN(entryQuantity)) {
        showToast("A quantidade de entrada deve ser um número positivo.", "error");
        return false;
    }

    item.history.unshift({
        type: ACTIONS.HISTORY_ENTRY,
        quantity: entryQuantity,
        timestamp: new Date().toISOString(),
        responsible: responsible,
        details: `Entrada de ${entryQuantity} unidade(s).`
    });

    if (!item.batches) item.batches = [];

    item.batches.push({
        batchId: crypto.randomUUID(),
        quantity: entryQuantity,
        purchaseDate: new Date().toISOString().split('T')[0],
        shelfLifeDays: item.shelfLifeDays || 0
    });

    recalculateStockFromBatches(item, allItems);
    updateAffectedKits(item.id, allItems);

    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    return true;
}

function replaceExpiredItems(itemId, quantity) {
    let allItems = getAllItems();
    const itemIndex = allItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado.", "error");
        return false;
    }
    const item = allItems[itemIndex];
    const replaceQuantity = parseInt(quantity, 10);

    if (isNaN(replaceQuantity) || replaceQuantity <= 0) {
        showToast("Quantidade para substituição inválida.", "error");
        return false;
    }
    if (item.totalStock < replaceQuantity) {
        showToast(`Estoque insuficiente para substituir ${replaceQuantity} unidades de ${item.name}. Disponível: ${item.totalStock}.`, "error");
        return false;
    }

    const historyTimestamp = new Date().toISOString();

    item.history.unshift({
        type: ACTIONS.HISTORY_DISCARD,
        quantity: replaceQuantity,
        timestamp: historyTimestamp,
        responsible: 'Sistema (Substituição de Vencidos)',
        details: `Descarte de ${replaceQuantity} unidade(s) vencida(s).`
    });

    distributeStockFromBatches(item, replaceQuantity);

    const newBatch = {
        batchId: crypto.randomUUID(),
        quantity: replaceQuantity,
        purchaseDate: new Date().toISOString().split('T')[0],
        shelfLifeDays: item.shelfLifeDays
    };
    if (!item.batches) item.batches = [];
    item.batches.push(newBatch);

    item.history.unshift({
        type: ACTIONS.HISTORY_ENTRY,
        quantity: replaceQuantity,
        timestamp: historyTimestamp,
        responsible: 'Sistema (Substituição de Vencidos)',
        details: `Entrada de ${replaceQuantity} unidade(s) (substituição de vencidos).`
    });

    recalculateStockFromBatches(item, allItems);
    updateAffectedKits(item.id, allItems);

    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    createLog('REPLACE_EXPIRED', `${replaceQuantity} unidades de ${item.name} foram substituídas.`, 'Usuário');
    return true;
}

function distributeStockFromBatches(item, quantityToDeduct) {
    if (!item.batches || item.batches.length === 0) return;

    let remainingToDeduct = quantityToDeduct;

    item.batches.sort((a, b) => {
        const getExpiry = (batch) => {
            const baseDate = batch.manufacturingDate ? new Date(batch.manufacturingDate) : new Date(batch.purchaseDate);
            const shelfLife = batch.shelfLifeDays || item.shelfLifeDays || 0;
            if (isNaN(baseDate.getTime()) || shelfLife <= 0) return new Date('2999-12-31');
            const expiryDate = new Date(baseDate);
            expiryDate.setDate(expiryDate.getDate() + shelfLife);
            return expiryDate;
        };
        return getExpiry(a) - getExpiry(b);
    });

    for (let i = 0; i < item.batches.length && remainingToDeduct > 0; i++) {
        let batch = item.batches[i];
        if (batch.quantity > remainingToDeduct) {
            batch.quantity -= remainingToDeduct;
            remainingToDeduct = 0;
        } else {
            remainingToDeduct -= batch.quantity;
            batch.quantity = 0;
        }
    }
    item.batches = item.batches.filter(batch => batch.quantity > 0);
}

function allocateItemToServiceOrder(osId, itemId, quantity, allocationId) {
    let allItems = getAllItems();
    const itemIndex = allItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast("Item não encontrado.", "error");
        return false;
    }

    const item = allItems[itemIndex];
    const movementQuantity = parseInt(quantity, 10);
    const serviceOrder = getServiceOrderById(osId);
    const technicianName = getCollaboratorById(serviceOrder.technicianId)?.name || 'Técnico desconhecido';

    if (movementQuantity <= 0 || isNaN(movementQuantity)) {
        showToast("A quantidade deve ser um número positivo.", "error");
        return false;
    }
    if (item.currentStock < movementQuantity) {
        showToast(`Estoque insuficiente para ${item.name}. Disponível: ${item.currentStock}.`, "error");
        return false;
    }

    const settings = getSettings();
    const isLoan = settings.returnableTypes.includes(item.type) || item.type === 'Kit';
    const historyTimestamp = new Date().toISOString();

    if (isLoan) {
        item.onLoanCount = (item.onLoanCount || 0) + movementQuantity;
        if (!item.allocations) item.allocations = [];
        item.allocations.push({
            id: allocationId,
            quantity: movementQuantity,
            collaboratorId: serviceOrder.technicianId,
            date: historyTimestamp,
            location: `O.S. ${osId}`,
            serviceOrderId: osId
        });
        item.history.unshift({
            type: ACTIONS.HISTORY_LOAN,
            quantity: movementQuantity,
            timestamp: historyTimestamp,
            responsible: technicianName,
            details: `Empréstimo de ${movementQuantity} unidade(s) para O.S. ${osId}.`
        });
    } else {
        distributeStockFromBatches(item, movementQuantity);
        item.history.unshift({
            type: ACTIONS.HISTORY_EXIT,
            quantity: movementQuantity,
            timestamp: historyTimestamp,
            responsible: technicianName,
            details: `Saída de ${movementQuantity} unidade(s) para O.S. ${osId}.`
        });
        updateAffectedKits(item.id, allItems);
    }

    recalculateStockFromBatches(item, allItems);
    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    return true;
}

function deallocateItemFromServiceOrder(itemId, allocationId) {
    let allItems = getAllItems();
    const itemIndex = allItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        return false;
    }

    const item = allItems[itemIndex];
    const allocationIndex = item.allocations?.findIndex(alloc => alloc.id === allocationId);

    if (allocationIndex === -1) {
        return false;
    }

    const allocation = item.allocations[allocationIndex];
    const serviceOrder = getServiceOrderById(allocation.serviceOrderId);
    const technicianName = getCollaboratorById(serviceOrder.technicianId)?.name || 'Técnico desconhecido';

    const settings = getSettings();
    const isReturnable = settings.returnableTypes.includes(item.type) || item.type === 'Kit';

    if (isReturnable) {
        item.batches.push({
            batchId: crypto.randomUUID(),
            quantity: allocation.quantity,
            purchaseDate: new Date().toISOString().split('T')[0],
            isReturn: true
        });
        item.history.unshift({
            type: ACTIONS.HISTORY_RETURN,
            quantity: allocation.quantity,
            timestamp: new Date().toISOString(),
            responsible: technicianName,
            details: `Devolução de ${allocation.quantity} unidade(s) da O.S. ${serviceOrder.id}.`
        });
        item.onLoanCount = Math.max(0, item.onLoanCount - allocation.quantity);
        item.allocations.splice(allocationIndex, 1);
    } else {
        showToast("Não é possível devolver um item de consumo de uma O.S.", "error");
        return false;
    }

    recalculateStockFromBatches(item, allItems);
    updateAffectedKits(item.id, allItems);
    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    return true;
}