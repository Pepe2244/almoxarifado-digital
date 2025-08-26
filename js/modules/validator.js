function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

function validateItemDetails(item, isUpdate = false) {
    const errors = [];

    const nameField = 'name';
    const typeField = 'type';
    const minStockField = 'minStock';
    const maxStockField = 'maxStock';
    const priceField = 'price';
    const currentStockField = 'currentStock';
    const shelfLifeDaysField = 'shelfLifeDays';
    const caField = 'ca';

    if (!item.name || item.name.trim() === '') {
        errors.push({ field: nameField, message: 'O nome do item é obrigatório.' });
    }
    if (!item.type || item.type.trim() === '') {
        errors.push({ field: typeField, message: 'O tipo do item é obrigatório.' });
    }
    if (item.ca && isNaN(Number(item.ca))) {
        errors.push({ field: caField, message: 'O CA deve ser um número.' });
    }
    if (item.minStock < 0) {
        errors.push({ field: minStockField, message: 'Estoque mínimo não pode ser negativo.' });
    }
    if (item.maxStock < 0) {
        errors.push({ field: maxStockField, message: 'Estoque máximo não pode ser negativo.' });
    }
    if (parseInt(item.minStock, 10) > parseInt(item.maxStock, 10)) {
        errors.push({ field: maxStockField, message: 'Estoque mínimo não pode ser maior que o estoque máximo.' });
    }
    if (item.price < 0) {
        errors.push({ field: priceField, message: 'Preço não pode ser negativo.' });
    }

    if (!isUpdate && item.type !== 'Kit') {
        const initialStock = parseInt(item.currentStock, 10);
        if (isNaN(initialStock) || initialStock < 0) {
            errors.push({ field: currentStockField, message: 'Estoque inicial deve ser um número não negativo.' });
        }
    }

    if (item.shelfLifeDays < 0) {
        errors.push({ field: shelfLifeDaysField, message: 'Vida útil não pode ser negativa.' });
    }
    return errors;
}

function validateCollaboratorDetails(collaborator) {
    const errors = [];
    if (!collaborator.name || collaborator.name.trim() === '') {
        errors.push({ field: 'name', message: 'O nome do colaborador é obrigatório.' });
    }
    return errors;
}