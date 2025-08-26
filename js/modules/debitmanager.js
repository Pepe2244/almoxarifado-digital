function initializeDebits() {
    return loadDataFromLocal(DB_KEYS.DEBITS);
}

function generateDebitId() {
    return crypto.randomUUID();
}

function addDebit(collaboratorId, itemId, itemName, quantity, amount, reason) {
    const finalAmount = Math.round(amount * 100) / 100;

    if (typeof finalAmount !== 'number' || finalAmount <= 0) {
        showToast("O valor do débito deve ser um número positivo maior que zero.", "error");
        return null;
    }

    let debits = getAllDebits();
    const newDebit = {
        id: generateDebitId(),
        collaboratorId: collaboratorId,
        itemId: itemId,
        itemName: itemName,
        quantity: quantity,
        amount: finalAmount,
        reason: reason,
        date: new Date().toISOString(),
        isSettled: false,
        settledDate: null
    };
    debits.unshift(newDebit);
    saveDataToLocal(DB_KEYS.DEBITS, debits);
    const collaboratorName = getCollaboratorById(collaboratorId)?.name || 'Desconhecido';
    createLog('ADD_DEBIT', `Débito de R$ ${finalAmount.toFixed(2)} gerado para ${collaboratorName} (Item: ${itemName}). Motivo: ${reason}.`, 'Sistema');
    
    // Dispara o evento para notificar a UI sobre a mudança nos dados
    document.body.dispatchEvent(new CustomEvent('dataChanged'));

    return newDebit;
}

function settleDebit(debitId) {
    let debits = getAllDebits();
    const index = debits.findIndex(d => d.id === debitId);
    if (index === -1) {
        showToast("Débito não encontrado.", "error");
        return false;
    }
    const debit = debits[index];
    if (debit.isSettled) {
        showToast("Este débito já está quitado.", "info");
        return false;
    }
    debit.isSettled = true;
    debit.settledDate = new Date().toISOString();
    saveDataToLocal(DB_KEYS.DEBITS, debits);
    const collaboratorName = getCollaboratorById(debit.collaboratorId)?.name || 'Desconhecido';
    createLog('SETTLE_DEBIT', `Débito de R$ ${debit.amount.toFixed(2)} (Item: ${debit.itemName}) de ${collaboratorName} foi quitado.`, 'Usuário');
    showToast(`Débito de R$ ${debit.amount.toFixed(2)} quitado com sucesso!`, "success");
    return true;
}

function getAllDebits() {
    return loadDataFromLocal(DB_KEYS.DEBITS) || [];
}