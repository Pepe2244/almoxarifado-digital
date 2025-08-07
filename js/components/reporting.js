import { getAllItems } from '../modules/itemManager.js';
import { getAllDebits } from '../modules/debitManager.js';

function initializeReporting() {
    document.body.addEventListener('click', (event) => {
        const action = event.target.dataset.action || event.target.closest('button')?.dataset.action;
        if (!action) return;

        switch (action) {
            case 'export-inventory-pdf':
                exportInventoryToPDF();
                break;
            case 'export-debits-pdf':
                exportDebitsToPDF();
                break;
            case 'export-inventory-csv':
                exportInventoryToCSV();
                break;
        }
    });
}

function exportInventoryToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const items = getAllItems();

    doc.text("Relatório de Inventário", 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

    const tableColumn = ["ID", "Nome", "Tipo", "Estoque", "Preço Unit."];
    const tableRows = [];

    items.forEach(item => {
        const itemData = [
            item.id,
            item.name,
            item.type,
            item.currentStock || 0,
            `R$ ${Number(item.price || 0).toFixed(2)}`
        ];
        tableRows.push(itemData);
    });

    doc.autoTable(tableColumn, tableRows, { startY: 30 });
    doc.save('relatorio_inventario.pdf');
}

function exportDebitsToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const debits = getAllDebits();

    doc.text("Relatório de Débitos", 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

    const tableColumn = ["ID", "Colaborador", "Item", "Valor Total", "Data", "Status"];
    const tableRows = [];

    debits.forEach(debit => {
        const debitData = [
            debit.id,
            debit.collaboratorName || 'N/A',
            debit.itemName,
            `R$ ${Number(debit.totalValue).toFixed(2)}`,
            new Date(debit.createdAt).toLocaleDateString('pt-BR'),
            debit.status
        ];
        tableRows.push(debitData);
    });

    doc.autoTable(tableColumn, tableRows, { startY: 30 });
    doc.save('relatorio_debitos.pdf');
}

function exportInventoryToCSV() {
    const items = getAllItems();
    const csvData = items.map(item => ({
        ID: item.id,
        Nome: item.name,
        Tipo: item.type,
        Estoque: item.currentStock || 0,
        Preco: Number(item.price || 0).toFixed(2),
        Status: item.status || 'disponível'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "inventario.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export { initializeReporting };
