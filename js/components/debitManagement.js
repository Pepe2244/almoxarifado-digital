// almoxarifado-digital/js/components/debitManagement.js
function initializeDebitManagement() {
    renderDebitManagementComponent();
    addDebitTabEventListeners('debit-management');
}

function renderDebitManagementComponent() {
    const component = document.getElementById('debit-management');
    if (!component) return;

    const settings = getSettings();
    if (settings.panelVisibility && settings.panelVisibility['debit-management'] === false) {
        component.classList.add('hidden');
        return;
    }
    component.classList.remove('hidden');

    component.innerHTML = `
        <div class="card-header">
            <h2><i class="fas fa-hand-holding-usd"></i> Gestão de Débitos</h2>
            <div class="header-actions">
                <div class="search-container">
                    <input type="text" id="debit-search-input" class="search-input" placeholder="Buscar débitos...">
                    <button id="debit-search-btn-icon" class="btn btn-icon-only">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <button class="btn btn-icon-only btn-sm hide-panel-btn" data-action="hide-panel" data-panel-id="debit-management" title="Ocultar painel">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="item-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Colaborador</th>
                            <th>Item (Qtd.)</th>
                            <th>Motivo</th>
                            <th>Valor (R$)</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="debits-table-body">
                    </tbody>
                </table>
            </div>
            <div id="debit-pagination-container" class="card-footer"></div>
        </div>
    `;
}

function addDebitTabEventListeners(componentId) {
    const component = document.getElementById(componentId);
    if (!component) return;

    component.addEventListener('click', async(event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        switch (action) {
            case ACTIONS.SETTLE_DEBIT:
                const debitToSettle = getAllDebits().find(d => d.id === id);
                if (debitToSettle) {
                    const collaboratorName = getCollaboratorById(debitToSettle.collaboratorId)?.name || 'Desconhecido';
                    openConfirmationModal({
                        title: 'Quitar Débito',
                        message: `Tem certeza que deseja quitar o débito de R$ ${debitToSettle.amount.toFixed(2)} de "${debitToSettle.itemName}" para ${collaboratorName}?`,
                        onConfirm: () => {
                            if (settleDebit(id)) {
                                document.body.dispatchEvent(new CustomEvent('dataChanged'));
                                closeModal('confirmation-modal');
                            }
                        }
                    });
                }
                break;
        }
    });
}
