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
