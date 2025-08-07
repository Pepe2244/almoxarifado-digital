// almoxarifado-digital/js/modules/analysisManager.js
function generateUnifiedPredictiveAnalysis() {
    const allItems = getAllItems();
    const settings = getSettings();
    const analysis = [];

    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const periodInDays = settings.predictiveAnalysisDays || 90;
    const startDate = new Date(todayUTC);
    startDate.setUTCDate(startDate.getUTCDate() - periodInDays);

    allItems.forEach(item => {
        const isReturnable = settings.returnableTypes.includes(item.type);

        if (item.batches && item.batches.length > 0) {
            item.batches.forEach(batch => {
                const shelfLifeDays = batch.shelfLifeDays || item.shelfLifeDays;
                if (!shelfLifeDays || shelfLifeDays <= 0) {
                    return;
                }

                const baseDateStr = batch.manufacturingDate || batch.purchaseDate;
                if (!baseDateStr) return;

                const [year, month, day] = baseDateStr.split('-').map(Number);
                const baseDateUTC = new Date(Date.UTC(year, month - 1, day));

                if (isNaN(baseDateUTC.getTime())) {
                    return;
                }

                const expiryDate = new Date(baseDateUTC);
                expiryDate.setUTCDate(expiryDate.getUTCDate() + shelfLifeDays);

                const remainingDays = Math.ceil((expiryDate.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24));

                analysis.push({
                    predictionType: 'lifecycle',
                    itemId: item.id,
                    batchId: batch.batchId,
                    name: `${item.name} (Lote)`,
                    expiryDate: expiryDate.toISOString(),
                    remainingDays: remainingDays,
                    shelfLifeDays: shelfLifeDays,
                    sortPriority: remainingDays
                });
            });
        }

        if (!isReturnable) {
            const movements = (item.history || [])
                .filter(record => {
                    const recordDate = new Date(record.timestamp);
                    return [ACTIONS.HISTORY_EXIT, ACTIONS.HISTORY_LOSS, ACTIONS.HISTORY_DISCARD].includes(record.type) &&
                        recordDate.getTime() >= startDate.getTime();
                });

            const totalConsumed = movements.reduce((sum, record) => sum + record.quantity, 0);
            const dailyConsumption = totalConsumed > 0 ? totalConsumed / periodInDays : 0;
            const daysOfStockLeft = dailyConsumption > 0 ? Math.floor(item.currentStock / dailyConsumption) : Infinity;

            analysis.push({
                predictionType: 'consumption',
                itemId: item.id,
                name: item.name,
                daysOfStockLeft: daysOfStockLeft,
                projectedMonthlyConsumption: parseFloat((dailyConsumption * 30).toFixed(2)),
                sortPriority: daysOfStockLeft
            });
        }

        if (isReturnable && item.status === 'Ativo') {
            const maintenanceFrequency = settings.maintenanceFrequency[item.type];
            if (maintenanceFrequency && maintenanceFrequency > 0) {
                const baseDateStr = item.lastMaintenanceDate || item.createdAt;
                if (!baseDateStr) return;

                const baseDate = new Date(baseDateStr);
                const baseDateUTC = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));

                const nextMaintenanceDue = new Date(baseDateUTC);
                nextMaintenanceDue.setUTCDate(nextMaintenanceDue.getUTCDate() + maintenanceFrequency);

                const remainingDays = Math.ceil((nextMaintenanceDue.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24));
                analysis.push({
                    predictionType: 'maintenance',
                    itemId: item.id,
                    name: item.name,
                    lastMaintenanceDate: item.lastMaintenanceDate,
                    nextMaintenanceDate: nextMaintenanceDue.toISOString(),
                    remainingDays: remainingDays,
                    maintenanceFrequency: maintenanceFrequency,
                    sortPriority: remainingDays
                });
            }
        }
    });

    return analysis.sort((a, b) => a.sortPriority - b.sortPriority);
}