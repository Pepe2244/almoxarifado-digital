function reallocateUnshelvedItems() {
    const allItems = getAllItems();
    let reallocatedCount = 0;

    const locationCounts = allItems.reduce((acc, item) => {
        if (item.location && item.location.aisle && item.location.shelf && item.location.box) {
            const locationKey = `${item.location.aisle}-${item.location.shelf}-${item.location.box}`;
            if (!acc[locationKey]) {
                acc[locationKey] = [];
            }
            acc[locationKey].push(item.id);
        }
        return acc;
    }, {});

    const itemsToRelocate = new Set();

    allItems.forEach(item => {
        if (!item.location || !item.location.aisle || item.location.aisle === 'N/A') {
            itemsToRelocate.add(item.id);
        }
    });

    for (const locationKey in locationCounts) {
        if (locationCounts[locationKey].length > 1) {
            const itemsInDuplicatedLocation = locationCounts[locationKey];
            itemsInDuplicatedLocation.slice(1).forEach(itemId => {
                itemsToRelocate.add(itemId);
            });
        }
    }

    if (itemsToRelocate.size === 0) {
        return 0;
    }

    const occupiedLocations = new Set(
        allItems
            .filter(item => !itemsToRelocate.has(item.id))
            .map(item => {
                if (item.location && item.location.aisle) {
                    return `${item.location.aisle}-${item.location.shelf}-${item.location.box}`;
                }
                return null;
            })
            .filter(Boolean)
    );

    const itemsToRelocateArray = allItems.filter(item => itemsToRelocate.has(item.id));

    itemsToRelocateArray.forEach(item => {
        const newLocation = suggestLocation(item.type, occupiedLocations);
        if (newLocation) {
            item.location = newLocation;
            reallocatedCount++;
            const newLocationKey = `${newLocation.aisle}-${newLocation.shelf}-${newLocation.box}`;
            occupiedLocations.add(newLocationKey);
        }
    });

    if (reallocatedCount > 0) {
        saveDataToLocal(DB_KEYS.ITEMS, allItems);
        createLog('AUTO_REALLOCATE', `${reallocatedCount} item(ns) foram realocados para corrigir duplicidades ou falta de espaço.`, 'Sistema');
    }

    return reallocatedCount;
}