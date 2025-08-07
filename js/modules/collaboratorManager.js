// almoxarifado-digital/js/modules/collaboratorManager.js
function initializeCollaborators() {
    return loadDataFromLocal(DB_KEYS.COLLABORATORS);
}

function generateCollaboratorId() {
    return crypto.randomUUID();
}

function addCollaborator(collaboratorDetails) {
    clearFormErrors(document.getElementById('collaborator-form'));
    const validationErrors = validateCollaboratorDetails(collaboratorDetails);
    if (validationErrors.length > 0) {
        showFormErrors(document.getElementById('collaborator-form'), validationErrors);
        return false;
    }
    let collaborators = getAllCollaborators();
    // Modificado para verificar unicidade por matrícula
    const existingCollaborator = collaborators.find(c => c.registration.toLowerCase() === collaboratorDetails.registration.toLowerCase());
    if (existingCollaborator) {
        showToast(`Colaborador com a matrícula "${collaboratorDetails.registration}" já existe.`, "error");
        return false;
    }
    const newCollaborator = {
        id: generateCollaboratorId(),
        name: collaboratorDetails.name.trim(),
        role: (collaboratorDetails.role || '').trim(),
        registration: (collaboratorDetails.registration || '').trim(),
        createdAt: new Date().toISOString()
    };
    collaborators.push(newCollaborator);
    saveDataToLocal(DB_KEYS.COLLABORATORS, collaborators);
    return newCollaborator;
}

function addMultipleCollaborators(collaboratorsToAdd) {
    let collaborators = getAllCollaborators();
    let addedCount = 0;
    let ignoredCount = 0;
    // Modificado para verificar unicidade por matrícula para adição em massa
    const existingRegistrations = new Set(collaborators.map(c => c.registration.toLowerCase()));

    collaboratorsToAdd.forEach(collaboratorDetails => {
        if (!collaboratorDetails.name || collaboratorDetails.name.trim() === '' || !collaboratorDetails.registration || collaboratorDetails.registration.trim() === '' || existingRegistrations.has(collaboratorDetails.registration.toLowerCase())) {
            ignoredCount++;
            return;
        }
        const newCollaborator = {
            id: generateCollaboratorId(),
            name: collaboratorDetails.name.trim(),
            role: (collaboratorDetails.role || '').trim(),
            registration: (collaboratorDetails.registration || '').trim(),
            createdAt: new Date().toISOString()
        };
        collaborators.push(newCollaborator);
        existingRegistrations.add(newCollaborator.registration.toLowerCase());
        addedCount++;
    });

    if (addedCount > 0) {
        saveDataToLocal(DB_KEYS.COLLABORATORS, collaborators);
    }
    return { added: addedCount, ignored: ignoredCount };
}

function getCollaboratorById(id) {
    const collaborators = getAllCollaborators();
    return collaborators.find(c => c.id === id);
}

function getAllCollaborators() {
    return loadDataFromLocal(DB_KEYS.COLLABORATORS) || [];
}

function updateCollaborator(id, updatedDetails) {
    clearFormErrors(document.getElementById('collaborator-form'));
    const validationErrors = validateCollaboratorDetails(updatedDetails);
    if (validationErrors.length > 0) {
        showFormErrors(document.getElementById('collaborator-form'), validationErrors);
        return false;
    }
    let collaborators = getAllCollaborators();
    const index = collaborators.findIndex(c => c.id === id);
    if (index === -1) {
        showToast("Colaborador não encontrado.", "error");
        return false;
    }
    // Modificado para verificar unicidade por matrícula na atualização
    const existingCollaboratorWithRegistration = collaborators.find(c => c.id !== id && c.registration.toLowerCase() === updatedDetails.registration.toLowerCase());
    if (existingCollaboratorWithRegistration) {
        showToast(`Colaborador com a matrícula "${updatedDetails.registration}" já existe.`, "error");
        return false;
    }
    collaborators[index] = { ...collaborators[index],
        name: updatedDetails.name.trim(),
        role: (updatedDetails.role || '').trim(),
        registration: (updatedDetails.registration || '').trim(),
        updatedAt: new Date().toISOString()
    };
    saveDataToLocal(DB_KEYS.COLLABORATORS, collaborators);
    return true;
}

function deleteCollaborator(id) {
    let collaborators = getAllCollaborators();
    const collaborator = collaborators.find(c => c.id === id);
    if (!collaborator) {
        showToast("Colaborador não encontrado.", "error");
        return false;
    }
    const itemsOnLoan = getAllItems().filter(item =>
        item.allocations && item.allocations.some(alloc => alloc.collaboratorId === id)
    );
    if (itemsOnLoan.length > 0) {
        const itemNames = itemsOnLoan.map(i => i.name).join(', ');
        showToast(`Não é possível excluir ${collaborator.name} pois ele(a) possui itens emprestados: ${itemNames}.`, "error");
        return false;
    }
    const pendingDebits = getAllDebits().filter(debit => debit.collaboratorId === id && !debit.isSettled);
    if (pendingDebits.length > 0) {
        const debitDetails = pendingDebits.map(d => `${d.itemName} (R$ ${d.amount.toFixed(2)})`).join(', ');
        showToast(`Não é possível excluir ${collaborator.name} pois ele(a) possui débitos pendentes: ${debitDetails}.`, "error");
        return false;
    }
    collaborators = collaborators.filter(c => c.id !== id);
    saveDataToLocal(DB_KEYS.COLLABORATORS, collaborators);
    createLog('DELETE_COLLABORATOR', `Colaborador excluído: ${collaborator.name}.`, 'Usuário');
    showToast(`Colaborador "${collaborator.name}" excluído com sucesso!`, "success");
    return true;
}