// almoxarifado-digital/js/modules/exportManager.js
function exportReportToPdf(headers, body, title) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Erro: A biblioteca jsPDF não foi carregada.", "error");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const settings = getSettings();
    const warehouseName = settings.warehouseName || "Almoxarifado Digital";
    const generationDate = new Date().toLocaleString('pt-BR');

    doc.setFontSize(18);
    doc.text(warehouseName, 14, 22);
    doc.setFontSize(11);
    doc.text(title, 14, 30);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${generationDate}`, 14, 35);

    doc.autoTable({
        head: [headers],
        body: body,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
    });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`relatorio_${safeTitle}_${timestamp}.pdf`);

    showToast("Relatório PDF gerado com sucesso!", "success");
    createLog('EXPORT_PDF', `Relatório exportado para PDF: ${title}`, 'Usuário');
}

function exportReportToCsv(headers, body, title) {
    if (!window.Papa) {
        showToast("Erro: A biblioteca PapaParse não foi carregada.", "error");
        return;
    }

    const data = body.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        return obj;
    });

    const csv = Papa.unparse(data);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.setAttribute("download", `relatorio_${safeTitle}_${timestamp}.csv`);

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Relatório CSV gerado com sucesso!", "success");
    createLog('EXPORT_CSV', `Relatório exportado para CSV: ${title}`, 'Usuário');
}

function exportCountSheetToPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Erro: A biblioteca jsPDF não foi carregada.", "error");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const settings = getSettings();
    const warehouseName = settings.warehouseName || "Almoxarifado Digital";
    const generationDate = new Date().toLocaleDateString('pt-BR');

    doc.setFontSize(18);
    doc.text(warehouseName, 14, 22);
    doc.setFontSize(11);
    doc.text("Lista de Contagem de Estoque", 14, 30);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${generationDate}`, 14, 35);

    const allItems = getAllItems()
        .filter(item => item.type !== 'Kit')
        .sort((a, b) => a.name.localeCompare(b.name));

    const headers = ['Item', 'Localização', 'Estoque no Sistema', 'Contagem Física'];
    const body = allItems.map(item => {
        const location = (item.location?.aisle || 'N/A') + '-' + (item.location?.shelf || 'N/A') + '-' + (item.location?.box || 'N/A');
        return [
            item.name,
            location,
            item.currentStock,
            '' // Espaço em branco para preenchimento
        ];
    });

    doc.autoTable({
        head: [headers],
        body: body,
        startY: 40,
        theme: 'grid', // 'grid' é melhor para formulários
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        columnStyles: {
            3: { cellWidth: 40 } // Aumenta a largura da última coluna para facilitar a escrita
        },
        didDrawCell: (data) => {
            // Adiciona um retângulo na célula de contagem para indicar onde escrever
            if (data.column.index === 3 && data.cell.section === 'body') {
                doc.setDrawColor(200);
                doc.rect(data.cell.x + 2, data.cell.y + 2, data.cell.width - 4, data.cell.height - 4);
            }
        }
    });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    doc.save(`lista_contagem_${timestamp}.pdf`);

    showToast("Lista de contagem gerada com sucesso!", "success");
    createLog('PRINT_COUNT_SHEET', 'Lista de contagem de estoque gerada para PDF.', 'Usuário');
}