// almoxarifado-digital/js/modules/notificationManager.js
function initializeEmailJS() {
    const settings = getSettings();
    const publicKey = settings.emailSettings?.publicKey;

    if (publicKey && typeof publicKey === 'string' && publicKey.trim() !== '') {
        try {
            emailjs.init(publicKey);
            console.log("EmailJS inicializado com sucesso.");
        } catch (e) {
            console.error("Falha ao inicializar o EmailJS. Verifique a Public Key.", e);
        }
    } else {
        console.warn("EmailJS não foi inicializado: Chave Pública (Public Key) não encontrada ou inválida nas configurações.");
    }
}

function buildEmailBodyHTML(settings) {
    const lowStockItems = getLowStockItems();
    const expiredItems = getShelfLifeAlerts().filter(a => a.type === 'validity_expired');
    const debits = getAllDebits();

    const formatListToHtml = (title, items, formatter) => {
        if (!items || items.length === 0) return '';
        let listHtml = `<h3>${title}</h3><ul>`;
        items.forEach(item => {
            listHtml += `<li>${formatter(item)}</li>`;
        });
        listHtml += '</ul>';
        return listHtml;
    };

    const lowStockHtml = formatListToHtml('Itens com Estoque Baixo', lowStockItems, item => `${item.name} (Apenas ${item.currentStock} un.)`);
    const expiredHtml = formatListToHtml('Itens Vencidos que Precisam de Substituição', expiredItems, alert => alert.message);
    const debitsHtml = formatListToHtml('Débitos Pendentes', debits, debit => {
        const collaboratorName = getCollaboratorById(debit.collaboratorId)?.name || 'Desconhecido';
        return `${collaboratorName} - ${debit.itemName} - R$ ${debit.amount.toFixed(2)}`;
    });

    const warehouseName = settings.warehouseName || 'Almoxarifado Digital';
    const generationDate = new Date().toLocaleDateString('pt-BR');

    const emailBody = `
        <h2>${warehouseName} - Resumo Automático</h2>
        <p>Este é um resumo do estado atual do seu almoxarifado gerado em ${generationDate}.</p>
        <hr>
        ${lowStockHtml || '<p>Nenhum item com estoque baixo. Ótimo trabalho!</p>'}
        <hr>
        ${expiredHtml || '<p>Nenhum item vencido.</p>'}
        <hr>
        ${debitsHtml || '<p>Nenhum débito pendente.</p>'}
        <br>
        <p><em>E-mail gerado automaticamente pelo sistema Almoxarifado Digital.</em></p>
    `;

    return emailBody;
}


function sendSummaryEmail() {
    return new Promise((resolve, reject) => {
        const settings = getSettings();
        const emailConfig = settings.emailSettings;

        if (!emailConfig?.serviceId || !emailConfig?.templateId || !emailConfig?.recipientEmail) {
            showToast("Configurações de e-mail incompletas. Verifique a seção de configurações.", "error");
            createLog('EMAIL_FAIL', 'Tentativa de envio de e-mail falhou por falta de configuração.', 'Sistema');
            return reject(new Error("Configurações de e-mail incompletas."));
        }
        
        const emailBodyContent = buildEmailBodyHTML(settings);

        const templateParams = {
            warehouse_name: settings.warehouseName || 'Almoxarifado Digital',
            recipient_email: emailConfig.recipientEmail,
            email_body: emailBodyContent,
        };

        showToast("Enviando resumo por e-mail...", "info");

        emailjs.send(emailConfig.serviceId, emailConfig.templateId, templateParams)
            .then((response) => {
                showToast("Resumo enviado com sucesso!", "success");
                createLog('EMAIL_SUCCESS', 'Resumo por e-mail enviado com sucesso.', 'Sistema');
                console.log('E-mail enviado com sucesso!', response.status, response.text);
                resolve(response);
            }, (error) => {
                showToast("Falha ao enviar o e-mail. Verifique o console para detalhes.", "error");
                createLog('EMAIL_FAIL', `Falha no envio do e-mail. Erro: ${error.text || 'desconhecido'}.`, 'Sistema');
                console.error('Falha ao enviar e-mail:', error);
                reject(error);
            });
    });
}
