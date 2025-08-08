import { getAllItems } from './itemManager.js';
import { getAllCollaborators } from './collaboratorManager.js';
import { getAllDebits } from './debitManager.js';
import { getAllServiceOrders } from './serviceOrderManager.js';
import { getSettings, saveSettings } from './settings.js';
import { restoreDatabase } from './dataHandler.js';
import { showToast, openConfirmationModal, closeModal } from './uiManager.js';
import { MODAL_IDS } from '../constants.js';

const BACKUP_VERSION = "1.0.0";

function backupData() {
    const backupObject = {
        version: BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        settings: getSettings(),
        items: getAllItems(),
        collaborators: getAllCollaborators(),
        debits: getAllDebits(),
        serviceOrders: getAllServiceOrders(),
    };

    const jsonString = JSON.stringify(backupObject, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `almoxarifado_backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const settings = getSettings();
    if (!settings.backupReminder) settings.backupReminder = {};
    settings.backupReminder.lastBackup = new Date().toISOString();
    saveSettings(settings);

    showToast('Backup realizado com sucesso!', 'success');
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.version || !data.items || !data.collaborators) {
                throw new Error('Ficheiro de backup inválido ou corrompido.');
            }

            openConfirmationModal({
                title: 'Confirmar Restauro',
                message: 'Tem a certeza? Esta ação irá substituir TODOS os dados atuais pelos dados do ficheiro de backup. Esta operação não pode ser desfeita.',
                onConfirm: async () => {
                    closeModal(MODAL_IDS.CONFIRMATION);
                    showToast('A restaurar dados... A página será recarregada.', 'info');

                    const success = await restoreDatabase(data);
                    if (success) {
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        showToast('Ocorreu um erro durante o restauro.', 'error');
                    }
                }
            });

        } catch (error) {
            showToast(`Erro ao ler o ficheiro de backup: ${error.message}`, 'error');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

export { backupData, restoreData };
