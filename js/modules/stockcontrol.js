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
        // Não mostra toast individual aqui para não poluir a tela no modo carrinho
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
        // Não mostra toast individual aqui
    }

    if (item.history.length > ITEM_HISTORY_LIMIT) {
        item.history.length = ITEM_HISTORY_LIMIT;
    }

    recalculateStockFromBatches(item, allItems);
    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    return true;
}

function registerMultipleMovements(itemsToMove, collaboratorId, location) {
    let allItems = getAllItems(); // Carrega todos os itens uma vez para performance
    const collaborator = getCollaboratorById(collaboratorId);
    if (!collaborator) {
        showToast("Colaborador não encontrado.", "error");
        return false;
    }

    // Validação prévia: verifica se há estoque para todos os itens antes de começar
    for (const cartItem of itemsToMove) {
        const item = allItems.find(i => i.id === cartItem.id);
        if (!item || item.currentStock < cartItem.quantity) {
            showToast(`Estoque insuficiente para ${item.name}. Operação cancelada.`, "error");
            return false;
        }
    }

    let successCount = 0;
    const historyTimestamp = new Date().toISOString();

    // Processamento: agora que sabemos que há estoque, processamos cada item
    for (const cartItem of itemsToMove) {
        const itemIndex = allItems.findIndex(i => i.id === cartItem.id);
        if (itemIndex === -1) continue; // Item não encontrado, pula

        const item = allItems[itemIndex];
        const movementQuantity = cartItem.quantity;
        const historyDetails = `para ${collaborator.name} (${location.trim() || 'N/A'}).`;
        const settings = getSettings();
        const isLoan = settings.returnableTypes.includes(item.type) || item.type === 'Kit';

        if (isLoan) {
            item.onLoanCount = (item.onLoanCount || 0) + movementQuantity;
            if (!item.allocations) item.allocations = [];
            item.allocations.push({
                id: crypto.randomUUID(),
                quantity: movementQuantity,
                collaboratorId: collaboratorId,
                date: historyTimestamp,
                location: location.trim()
            });
            item.history.unshift({
                type: ACTIONS.HISTORY_LOAN,
                quantity: movementQuantity,
                timestamp: historyTimestamp,
                responsible: collaborator.name,
                details: `Empréstimo de ${movementQuantity} unidade(s) ${historyDetails}`
            });

            if (item.type === 'Kit') {
                (item.kitItems || []).forEach(kitComponent => {
                    const componentItem = allItems.find(i => i.id === kitComponent.id);
                    if (componentItem) {
                        distributeStockFromBatches(componentItem, kitComponent.quantity * movementQuantity);
                    }
                });
            }
        } else {
            distributeStockFromBatches(item, movementQuantity);
            item.history.unshift({
                type: ACTIONS.HISTORY_EXIT,
                quantity: movementQuantity,
                timestamp: historyTimestamp,
                responsible: collaborator.name,
                details: `Saída de ${movementQuantity} unidade(s) ${historyDetails}`
            });
        }
        successCount++;
    }

    // Recalcula o estoque de todos os itens afetados e seus kits dependentes DEPOIS de todos os débitos.
    const affectedItemIds = new Set(itemsToMove.map(i => i.id));
    allItems.forEach(item => {
        if (affectedItemIds.has(item.id) || item.type === 'Kit') {
            recalculateStockFromBatches(item, allItems);
        }
    });

    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    createLog('BATCH_CHECKOUT', `${successCount} itens tiveram saída registrada para ${collaborator.name}.`, 'Usuário');
    showToast(`${successCount} itens processados com sucesso!`, 'success');
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

    if (allocation.serviceOrderId) {
        const osSuccess = returnItemFromGeneralAllocation(allocation.serviceOrderId, allocationId);
        if (!osSuccess) {
            return false;
        }
    }

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
                        if (componentItem.history.length > ITEM_HISTORY_LIMIT) {
                            componentItem.history.length = ITEM_HISTORY_LIMIT;
                        }
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
                        const oldestBatch = componentItem.history
                            .filter(h => h.type === 'entry')
                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];

                        const purchaseDateForReturn = oldestBatch ? new Date(oldestBatch.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                        componentItem.batches.push({
                            batchId: crypto.randomUUID(),
                            quantity: returnedQty,
                            purchaseDate: purchaseDateForReturn,
                            manufacturingDate: null,
                            shelfLifeDays: componentItem.shelfLifeDays,
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

                    const oldestBatch = componentItem.history
                        .filter(h => h.type === 'entry')
                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];

                    const purchaseDateForReturn = oldestBatch ? new Date(oldestBatch.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                    componentItem.batches.push({
                        batchId: crypto.randomUUID(),
                        quantity: returnedQty,
                        purchaseDate: purchaseDateForReturn,
                        manufacturingDate: null,
                        shelfLifeDays: componentItem.shelfLifeDays,
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

    if (item.history.length > ITEM_HISTORY_LIMIT) {
        item.history.length = ITEM_HISTORY_LIMIT;
    }

    item.onLoanCount = Math.max(0, item.onLoanCount - allocation.quantity);
    item.allocations.splice(allocationIndex, 1);

    recalculateStockFromBatches(item, allItems);
    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    return true;
}

function returnMultipleAllocations(allocationIds) {
    let allItems = getAllItems();
    let successCount = 0;

    for (const allocId of allocationIds) {
        const item = allItems.find(i => i.allocations && i.allocations.some(a => a.id === allocId));
        if (item) {
            // Reutiliza a lógica da função `returnAllocation` para cada item
            // Passamos `allItems` para evitar recarregamentos múltiplos do localStorage
            if (returnAllocation(item.id, allocId)) {
                successCount++;
            }
        }
    }

    if (successCount > 0) {
        // A função `returnAllocation` já salva os dados, então não precisamos salvar aqui de novo.
        createLog('BATCH_RETURN', `${successCount} itens devolvidos em lote.`, 'Usuário');
    }

    return successCount > 0;
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
                if (componentItem.history.length > ITEM_HISTORY_LIMIT) {
                    componentItem.history.length = ITEM_HISTORY_LIMIT;
                }
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
    if (item.history.length > ITEM_HISTORY_LIMIT) {
        item.history.length = ITEM_HISTORY_LIMIT;
    }
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
    if (item.history.length > ITEM_HISTORY_LIMIT) {
        item.history.length = ITEM_HISTORY_LIMIT;
    }

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

function adjustStockCount(itemId, newPhysicalCount, responsible, reason, batchId = null) {
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

    let historyType = ACTIONS.HISTORY_ADJUSTMENT;
    let details = `Ajuste de ${currentPhysicalStock} para ${count}.`;

    switch (reason) {
        case 'entry_no_reg':
            historyType = ACTIONS.HISTORY_ENTRY;
            details = `Entrada de ${difference} unidade(s) sem registro (achado em contagem).`;
            break;
        case 'return_no_reg':
            historyType = ACTIONS.HISTORY_RETURN;
            details = `Devolução de ${difference} unidade(s) não registrada anteriormente.`;
            break;
        case 'exit_no_reg':
            historyType = ACTIONS.HISTORY_EXIT;
            details = `Saída de ${Math.abs(difference)} unidade(s) por consumo sem registro.`;
            break;
        case 'loss_damage':
            historyType = ACTIONS.HISTORY_LOSS;
            details = `Perda/Dano de ${Math.abs(difference)} unidade(s) identificado na contagem.`;
            break;
    }

    item.history.unshift({
        type: historyType,
        quantity: difference,
        timestamp: new Date().toISOString(),
        responsible: responsible,
        details: details
    });

    if (item.history.length > ITEM_HISTORY_LIMIT) {
        item.history.length = ITEM_HISTORY_LIMIT;
    }

    if (difference === 0) {
        saveDataToLocal(DB_KEYS.ITEMS, allItems);
        showToast("Contagem registrada. Nenhuma alteração no estoque.", "info");
        return true;
    }

    if (difference > 0) {
        if (!item.batches) item.batches = [];

        if (batchId && batchId !== 'new') {
            const existingBatch = item.batches.find(b => b.batchId === batchId);
            if (existingBatch) {
                existingBatch.quantity += difference;
            } else {
                batchId = 'new'; // Lote não encontrado, criar um novo
            }
        }

        if (!batchId || batchId === 'new') {
            item.batches.push({
                batchId: crypto.randomUUID(),
                quantity: difference,
                purchaseDate: new Date().toISOString().split('T')[0],
                details: `Lote criado a partir de ajuste de contagem (${reason})`,
                isAdjustment: true
            });
        }
    } else {
        distributeStockFromBatches(item, Math.abs(difference));
    }

    recalculateStockFromBatches(item, allItems);
    updateAffectedKits(item.id, allItems);

    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    createLog('ADJUST_STOCK_COUNT', `Estoque de ${item.name} ajustado para ${count}. Diferença: ${difference > 0 ? '+' : ''}${difference}. Motivo: ${reason}`, 'Usuário');
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
    if (item.history.length > ITEM_HISTORY_LIMIT) {
        item.history.length = ITEM_HISTORY_LIMIT;
    }

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

    if (item.history.length > ITEM_HISTORY_LIMIT) {
        item.history.length = ITEM_HISTORY_LIMIT;
    }

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

    if (item.history.length > ITEM_HISTORY_LIMIT) {
        item.history.length = ITEM_HISTORY_LIMIT;
    }

    recalculateStockFromBatches(item, allItems);
    saveDataToLocal(DB_KEYS.ITEMS, allItems);
    return true;
}
