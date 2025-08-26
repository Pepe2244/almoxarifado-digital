function generateLocation(aisle, shelf, box) {
    return {
        aisle: aisle.trim().toUpperCase(),
        shelf: shelf.toString().trim(),
        box: box.toString().trim()
    };
}

function suggestLocation(itemType = null, occupiedLocationsSet = null) {
    const allItems = getAllItems();
    const settings = getSettings();
    const aisles = (settings.aisles || '').split(',').map(a => a.trim().toUpperCase()).filter(a => a);
    const shelvesPerAisle = settings.shelvesPerAisle || 0;
    const boxesPerShelf = settings.boxesPerShelf || 0;

    if (aisles.length === 0 || shelvesPerAisle === 0 || boxesPerShelf === 0) {
        return null;
    }

    const occupiedLocations = occupiedLocationsSet || new Set(
        allItems.map(item => {
            if (item.location && item.location.aisle && item.location.shelf && item.location.box) {
                return `${item.location.aisle}-${item.location.shelf}-${item.location.box}`;
            }
            return null;
        }).filter(Boolean)
    );

    if (itemType) {
        const itemsOfTheSameType = allItems.filter(item => item.type === itemType && item.location && item.location.aisle);
        if (itemsOfTheSameType.length > 0) {
            const aisleScores = itemsOfTheSameType.reduce((acc, item) => {
                acc[item.location.aisle] = (acc[item.location.aisle] || 0) + 1;
                return acc;
            }, {});

            const sortedAisles = Object.keys(aisleScores).sort((a, b) => aisleScores[b] - aisleScores[a]);

            for (const aisle of sortedAisles) {
                for (let shelf = 1; shelf <= shelvesPerAisle; shelf++) {
                    for (let box = 1; box <= boxesPerShelf; box++) {
                        const locationKey = `${aisle}-${shelf}-${box}`;
                        if (!occupiedLocations.has(locationKey)) {
                            return { aisle: aisle, shelf: shelf.toString(), box: box.toString() };
                        }
                    }
                }
            }
        }
    }

    for (const aisle of aisles) {
        for (let shelf = 1; shelf <= shelvesPerAisle; shelf++) {
            for (let box = 1; box <= boxesPerShelf; box++) {
                const locationKey = `${aisle}-${shelf}-${box}`;
                if (!occupiedLocations.has(locationKey)) {
                    return { aisle: aisle, shelf: shelf.toString(), box: box.toString() };
                }
            }
        }
    }

    return null;
}