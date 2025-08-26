function generateMovementReport(params) {
    const { startDate, endDate, allItems } = params;
    if (!allItems || !Array.isArray(allItems)) return [];

    let reportData = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    const validItems = allItems.filter(item => item && Array.isArray(item.history));

    validItems.forEach(item => {
        item.history.forEach(record => {
            if (!record || !record.timestamp) return;
            const recordDate = new Date(record.timestamp);
            if (dateFns.isWithinInterval(recordDate, { start, end })) {
                reportData.push({
                    timestamp: record.timestamp,
                    itemName: item.name,
                    type: record.type,
                    quantity: record.quantity,
                    responsible: record.responsible || 'N/A'
                });
            }
        });
    });

    return reportData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function generateUsageReport(params) {
    const { startDate, endDate, allItems } = params;
    if (!allItems || !Array.isArray(allItems)) return [];

    const movements = generateMovementReport({ startDate, endDate, allItems });
    const usageMap = new Map();

    movements
        .filter(record => record && [ACTIONS.HISTORY_EXIT, ACTIONS.HISTORY_LOAN].includes(record.type))
        .forEach(record => {
            const existing = usageMap.get(record.itemName) || { name: record.itemName, quantity: 0 };
            existing.quantity += Math.abs(record.quantity);
            usageMap.set(record.itemName, existing);
        });

    return Array.from(usageMap.values()).sort((a, b) => b.quantity - a.quantity);
}

function generateStockLevelReport(params) {
    const { allItems, settings } = params;
    if (!allItems || !Array.isArray(allItems) || !settings || !settings.stockLevels) return [];

    const { ok, medium } = settings.stockLevels;
    const validItems = allItems.filter(item => item && typeof item.currentStock === 'number' && typeof item.minStock === 'number');

    return validItems.map(item => {
        let status = 'CRÍTICO';
        if (item.minStock <= 0) {
            status = 'N/A';
        } else if (item.currentStock <= 0) {
            status = 'ZERADO';
        } else {
            const percentage = (item.currentStock / item.minStock) * 100;
            if (percentage >= ok) status = 'OK';
            else if (percentage >= medium) status = 'MÉDIO';
            else status = 'BAIXO';
        }
        return {
            name: item.name,
            currentStock: item.currentStock,
            minStock: item.minStock,
            status: status
        };
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

function generateStockValueReport(params) {
    const { allItems } = params;
    const fallback = { items: [], grandTotal: 0 };
    if (!allItems || !Array.isArray(allItems)) return fallback;

    let grandTotal = 0;
    const validItems = allItems.filter(item => item && typeof item.totalStock === 'number' && typeof item.price === 'number');

    const items = validItems
        .filter(item => item.totalStock > 0)
        .map(item => {
            const totalValue = item.totalStock * item.price;
            grandTotal += totalValue;
            return {
                name: item.name,
                totalStock: item.totalStock,
                price: item.price,
                totalValue: totalValue
            };
        });

    return { items, grandTotal };
}

function generatePurchaseSuggestionReport(params) {
    const { allItems } = params;
    const fallback = { items: [], grandTotal: 0 };
    if (!allItems || !Array.isArray(allItems)) return fallback;

    let grandTotal = 0;
    const validItems = allItems.filter(item => item && typeof item.currentStock === 'number' && typeof item.minStock === 'number');

    const items = validItems
        .filter(item => item.minStock > 0 && item.currentStock < item.minStock)
        .map(item => {
            const quantityToBuy = item.minStock - item.currentStock;
            const estimatedCost = quantityToBuy * (item.price || 0);
            grandTotal += estimatedCost;
            return {
                name: item.name,
                currentStock: item.currentStock,
                minStock: item.minStock,
                quantityToBuy: quantityToBuy,
                estimatedCost: estimatedCost
            };
        });

    return { items, grandTotal };
}

function generateBatchValidityReport(params) {
    const { allItems } = params;
    if (!allItems || !Array.isArray(allItems)) return [];

    const reportData = [];
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const validItems = allItems.filter(item => item && Array.isArray(item.batches));

    validItems.forEach(item => {
        item.batches.forEach(batch => {
            if (!batch) return;

            const shelfLifeDays = batch.shelfLifeDays || item.shelfLifeDays;
            if (!shelfLifeDays || shelfLifeDays <= 0) return;

            const baseDateStr = batch.manufacturingDate || batch.purchaseDate;
            if (!baseDateStr) return;

            const dateParts = baseDateStr.split('-').map(Number);
            if (dateParts.length !== 3 || dateParts.some(isNaN)) return;

            const [year, month, day] = dateParts;
            const baseDateUTC = new Date(Date.UTC(year, month - 1, day));

            if (isNaN(baseDateUTC.getTime())) return;

            const expiryDate = new Date(baseDateUTC);
            expiryDate.setUTCDate(expiryDate.getUTCDate() + shelfLifeDays);

            const daysRemaining = Math.ceil((expiryDate.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24));

            reportData.push({
                itemName: item.name,
                quantity: batch.quantity,
                purchaseDate: baseDateUTC,
                expiryDate: expiryDate,
                daysRemaining: daysRemaining,
                isExpired: todayUTC > expiryDate
            });
        });
    });

    return reportData.sort((a, b) => a.expiryDate - b.expiryDate);
}

function generatePriceHistoryReport(params) {
    const { startDate, endDate, allItems } = params;
    if (!allItems || !Array.isArray(allItems)) return [];

    let reportData = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    const validItems = allItems.filter(item => item && Array.isArray(item.priceHistory) && item.priceHistory.length > 0);

    validItems.forEach(item => {
        item.priceHistory.forEach((record, index) => {
            if (!record || !record.date) return;
            const recordDate = new Date(record.date);
            if (dateFns.isWithinInterval(recordDate, { start, end })) {
                const previousPrice = index > 0 ? item.priceHistory[index - 1].price : 0;
                const variation = previousPrice > 0 ? ((record.price - previousPrice) / previousPrice) * 100 : 0;
                reportData.push({
                    date: record.date,
                    itemName: item.name,
                    price: record.price,
                    variation: variation
                });
            }
        });
    });

    return reportData.sort((a, b) => new Date(b.date) - new Date(a.date));
}