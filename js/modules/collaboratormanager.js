// almoxarifado-digital/js/modules/collaboratorManager.js
function initializeCollaborators() {
    return loadDataFromLocal(DB_KEYS.COLLABORATORS);
}

function generateCollaboratorId() {
    return crypto.randomUUID();
}

function addCollaborator(collaboratorDetails) {
    const validationErrors = validateCollaboratorDetails(collaboratorDetails);
    if (validationErrors.length > 0) {
        // A UI (quem chamou a função) será responsável por exibir os erros.
        return { success: false, errors: validationErrors };
    }

    let collaborators = getAllCollaborators();
    if (collaboratorDetails.registration && collaboratorDetails.registration.trim() !== '') {
        const existingCollaborator = collaborators.find(c => c.registration && c.registration.toLowerCase() === collaboratorDetails.registration.toLowerCase());
        if (existingCollaborator) {
            showToast(`Colaborador com a matrícula "${collaboratorDetails.registration}" já existe.`, "error");
            return { success: false };
        }
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
    return { success: true, collaborator: newCollaborator };
}


function addMultipleCollaborators(collaboratorsToAdd) {
    let collaborators = getAllCollaborators();
    let addedCount = 0;
    let ignoredCount = 0;
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
    return {
        added: addedCount,
        ignored: ignoredCount
    };
}

function getCollaboratorById(id) {
    const collaborators = getAllCollaborators();
    return collaborators.find(c => c.id === id);
}

function getAllCollaborators() {
    return loadDataFromLocal(DB_KEYS.COLLABORATORS) || [];
}

function updateCollaborator(id, updatedDetails) {
    const validationErrors = validateCollaboratorDetails(updatedDetails);
    if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors };
    }

    let collaborators = getAllCollaborators();
    const index = collaborators.findIndex(c => c.id === id);
    if (index === -1) {
        showToast("Colaborador não encontrado.", "error");
        return { success: false };
    }

    if (updatedDetails.registration && updatedDetails.registration.trim() !== '') {
        const existingCollaboratorWithRegistration = collaborators.find(c => c.id !== id && c.registration.toLowerCase() === updatedDetails.registration.toLowerCase());
        if (existingCollaboratorWithRegistration) {
            showToast(`Colaborador com a matrícula "${updatedDetails.registration}" já existe.`, "error");
            return { success: false };
        }
    }

    collaborators[index] = {
        ...collaborators[index],
        name: updatedDetails.name.trim(),
        role: (updatedDetails.role || '').trim(),
        registration: (updatedDetails.registration || '').trim(),
        updatedAt: new Date().toISOString()
    };
    saveDataToLocal(DB_KEYS.COLLABORATORS, collaborators);
    return { success: true };
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

function renderCollaboratorsTable(collaborators, searchTerm = '') {
    const tableBody = document.getElementById('collaborators-table-body');
    const settings = getSettings();
    const paginationEnabled = settings.paginationEnabled;
    const itemsPerPage = settings.itemsPerPage || 10;

    if (!tableBody) return;

    const page = paginationState.collaborator.currentPage;
    const start = paginationEnabled ? (page - 1) * itemsPerPage : 0;
    const end = paginationEnabled ? start + itemsPerPage : collaborators.length;
    const paginatedCollaborators = collaborators.slice(start, end);

    if (paginatedCollaborators.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Nenhum colaborador encontrado.</td></tr>`;
        renderPagination('collaborator-pagination-container', 'collaborator', collaborators.length);
        return;
    }

    tableBody.innerHTML = paginatedCollaborators.map(collaborator => {
        const {
            id,
            name,
            registration,
            role
        } = collaborator;
        const onLoanCount = getAllItems().reduce((acc, item) => {
            return acc + (item.allocations ? item.allocations.filter(a => a.collaboratorId === id).reduce((sum, a) => sum + a.quantity, 0) : 0);
        }, 0);
        const pendingDebitsCount = getAllDebits().filter(d => d.collaboratorId === id && !d.isSettled).length;
        const hasPendingDebits = pendingDebitsCount > 0;
        const hasItemsOnLoan = onLoanCount > 0;

        return `
            <tr>
                <td>
                    <div>${name}</div>
                    <div class="badges-container" style="margin-top: 5px; display: flex; gap: 5px;">
                        ${hasItemsOnLoan ? `<span class="status-badge status-info" title="${onLoanCount} item(ns) em posse">${onLoanCount} item(ns)</span>` : ''}
                        ${hasPendingDebits ? `<span class="status-badge status-danger" title="${pendingDebitsCount} débito(s) pendente(s)">Débitos</span>` : ''}
                    </div>
                </td>
                <td>${registration || 'N/A'}</td>
                <td>${role || 'N/A'}</td>
                <td class="actions-cell">
                    <div class="actions-container">
                        <button class="btn btn-success btn-sm" data-action="${ACTIONS.GENERATE_RECEIPT}" data-id="${id}" title="Gerar Comprovante de Entrega">
                            <i class="fas fa-file-signature"></i>
                        </button>
                        <div class="actions-dropdown-container">
                            <button class="btn btn-secondary btn-sm" data-action="toggle-actions-dropdown" title="Mais Opções">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="actions-dropdown-content hidden">
                                <a href="javascript:void(0);" data-action="${ACTIONS.VIEW_COLLABORATOR_DASHBOARD}" data-id="${id}">
                                    <i class="fas fa-tachometer-alt"></i> Dashboard do Colaborador
                                </a>
                                <a href="javascript:void(0);" data-action="${ACTIONS.VIEW_SIGNED_RECEIPTS}" data-id="${id}">
                                    <i class="fas fa-check-double"></i> Ver Comprovantes Assinados
                                </a>
                                <div class="dropdown-divider"></div>
                                <a href="javascript:void(0);" data-action="${ACTIONS.EDIT_COLLABORATOR}" data-id="${id}">
                                    <i class="fas fa-edit"></i> Editar Colaborador
                                </a>
                                <a href="javascript:void(0);" class="danger-action" data-action="${ACTIONS.DELETE_COLLABORATOR}" data-id="${id}">
                                    <i class="fas fa-trash-alt"></i> Excluir Colaborador
                                </a>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    renderPagination('collaborator-pagination-container', 'collaborator', collaborators.length);
}