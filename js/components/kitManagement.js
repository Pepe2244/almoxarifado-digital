function initializeItemManagement() {
    document.body.addEventListener('click', (event) => {
        const action = event.target.dataset.action || event.target.closest('button')?.dataset.action;
        if (!action) return;

        const itemId = event.target.dataset.id || event.target.closest('tr')?.dataset.id;

        switch (action) {
            case 'open-item-form-modal':
                openItemFormModal();
                break;
            case 'open-mass-add-modal':
                openMassAddModal();
                break;
            case 'edit-item':
                if (itemId) {
                    openItemFormModal(itemId);
                }
                break;
            case 'delete-item':
                if (itemId) {
                    handleDeleteItem(itemId);
                }
                break;
        }
    });
}

function renderItemsTable(items) {
    const tableBody = document.getElementById('items-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum item encontrado.</td></tr>';
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        row.dataset.id = item.id;
        row.innerHTML = `
            <td data-label="Item">${item.name}</td>
            <td data-label="Tipo">${item.type}</td>
            <td data-label="Estoque">${item.currentStock || 0}</td>
            <td data-label="Preço (R$)">${Number(item.price || 0).toFixed(2)}</td>
            <td data-label="Status"><span class="status-badge status-${item.status || 'disponível'}">${item.status || 'disponível'}</span></td>
            <td data-label="Ações">
                <div class="actions-dropdown-container">
                    <button class="btn btn-secondary btn-sm btn-icon-only" data-action="toggle-actions-dropdown" aria-label="Mais ações">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="actions-dropdown-content hidden">
                        <button class="btn btn-sm" data-action="edit-item" data-id="${item.id}"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-sm" data-action="manage-batches" data-id="${item.id}"><i class="fas fa-boxes"></i> Lotes</button>
                        <button class="btn btn-sm" data-action="view-history" data-id="${item.id}"><i class="fas fa-history"></i> Histórico</button>
                        <button class="btn btn-sm btn-danger" data-action="delete-item" data-id="${item.id}"><i class="fas fa-trash"></i> Excluir</button>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function openItemFormModal(itemId = null) {
    const modal = document.getElementById('item-form-modal');
    const template = document.getElementById('item-form-modal-template');
    if (!modal || !template) return;

    modal.innerHTML = template.innerHTML;
    const form = modal.querySelector('#item-form');
    const title = modal.querySelector('#item-form-modal-title');

    if (itemId) {
        const item = getItemById(itemId);
        if (item) {
            title.textContent = `Editar Item: ${item.name}`;
            form.elements.id.value = item.id;
            form.elements.name.value = item.name;
            form.elements.barcode.value = item.barcode || '';
            form.elements.type.value = item.type;
            form.elements.unit.value = item.unit || '';
            form.elements.minStock.value = item.minStock || 0;
            form.elements.maxStock.value = item.maxStock || 0;
            form.elements.price.value = item.price || 0;
            form.elements.shelfLifeDays.value = item.shelfLifeDays || 0;
            form.elements.status.value = item.status || 'disponível';

            const stockLabel = form.querySelector('#item-form-current-stock-label');
            const stockInput = form.querySelector('#item-form-current-stock');
            if (stockLabel) stockLabel.style.display = 'none';
            if (stockInput) stockInput.style.display = 'none';
        }
    } else {
        title.textContent = 'Adicionar Novo Item';
    }

    modal.showModal();
}

function openMassAddModal() {
    const modal = document.getElementById('mass-add-modal');
    const template = document.getElementById('mass-add-modal-template');
    if (!modal || !template) return;
    modal.innerHTML = template.innerHTML;
    modal.showModal();
}

function handleDeleteItem(itemId) {
    const item = getItemById(itemId);
    if (!item) return;

    openConfirmationModal({
        title: 'Confirmar Exclusão',
        message: `Tem a certeza de que deseja excluir o item "${item.name}"? Esta ação não pode ser desfeita.`,
        onConfirm: async () => {
            const success = await deleteItem(itemId);
            if (success) {
                showToast('Item excluído com sucesso!', 'success');
                document.body.dispatchEvent(new CustomEvent('dataChanged'));
            } else {
                showToast('Falha ao excluir o item.', 'error');
            }
            closeModal('confirmation-modal');
        }
    });
}
