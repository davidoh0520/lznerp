// ===== Items Page =====

const ITEM_REMARK_MAX_LENGTH = 1000;
const ITEM_DRAWING_LIMIT = 3;
const ITEM_DRAWING_MAX_SIZE = 10 * 1024 * 1024;
const ITEM_DRAWINGS_BUCKET = 'item-drawings';
const ITEM_DRAWING_ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'dwg']);
const ITEM_DRAWING_ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/pjpeg',
    'image/jpg',
    'image/vnd.dwg',
    'image/x-dwg',
    'application/acad',
    'application/dwg',
    'application/x-acad'
]);

let itemModalState = createDefaultItemModalState();

function createDefaultItemModalState() {
    return {
        itemId: null,
        category: '',
        existingDrawings: [],
        pendingDrawings: [],
        loadingDrawings: false,
        drawingError: ''
    };
}

function resetItemModalState() {
    itemModalState.pendingDrawings.forEach(drawing => {
        if (drawing.previewUrl && drawing.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(drawing.previewUrl);
        }
    });
    itemModalState = createDefaultItemModalState();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeFileName(name) {
    return String(name || 'drawing')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');
}

function getFileExtension(name) {
    const parts = String(name || '').toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
}

function isPartCategory(category) {
    const normalized = String(category || '').trim().toLowerCase();
    return ['part', 'parts', 'component', 'components', 'spare part', 'spare parts', '零件', '部件', '配件'].includes(normalized);
}

function formatFileSize(size) {
    const bytes = Number(size || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDrawingCountText(count) {
    return t('items.drawings.counter')
        .replace('{count}', String(count))
        .replace('{max}', String(ITEM_DRAWING_LIMIT));
}

function getDrawingCountForItem(itemId, drawingCountMap) {
    return drawingCountMap[String(itemId)] || 0;
}

function getDrawingCountMap(drawings) {
    return (drawings || []).reduce((acc, drawing) => {
        const key = String(drawing.item_id);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function isPreviewableImage(mimeType, fileName) {
    return String(mimeType || '').startsWith('image/') || ['png', 'jpg', 'jpeg'].includes(getFileExtension(fileName));
}

function isPdfFile(mimeType, fileName) {
    return String(mimeType || '') === 'application/pdf' || getFileExtension(fileName) === 'pdf';
}

async function renderItems(container) {
    try {
        const [{ data: items }, { data: drawings }] = await Promise.all([
            dbSelect('items'),
            dbSelect('item_drawings')
        ]);

        const drawingCountMap = getDrawingCountMap(drawings || []);

        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openItemModal()" class="btn-primary">${t('items.add')}</button>
                <input type="text" id="itemSearch" placeholder="${t('items.search')}" 
                    style="flex: 1; max-width: 300px;"
                    onkeyup="filterItemsTable()">
            </div>
            
            <div id="itemsTableContainer">
                ${renderItemsTable(items || [], drawingCountMap)}
            </div>
        `;

        container.innerHTML = html;

    } catch (e) {
        console.error('Items render error:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">${t('error.load_failed')}${e.message}</p>`;
    }
}

function renderItemsTable(items, drawingCountMap = {}) {
    if (!items || items.length === 0) {
        return `<p class="text-center" style="padding: 40px; color: var(--gray-500);">${t('items.no_data')}</p>`;
    }

    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>${t('items.col.code')}</th>
                        <th>${t('items.col.name')}</th>
                        <th>${t('items.col.unit')}</th>
                        <th>${t('items.col.category')}</th>
                        <th>${t('items.col.remark')}</th>
                        <th>${t('items.col.drawings')}</th>
                        <th>${t('col.manage')}</th>
                    </tr>
                </thead>
                <tbody>
    `;

    items.forEach(item => {
        const drawingCount = getDrawingCountForItem(item.id, drawingCountMap);
        html += `
            <tr>
                <td><strong>${escapeHtml(item.item_code)}</strong></td>
                <td>
                    <div><strong>${escapeHtml(item.item_name)}</strong></div>
                    ${item.description ? `<div class="item-secondary-text">${escapeHtml(item.description)}</div>` : ''}
                </td>
                <td>${escapeHtml(item.unit || '-')}</td>
                <td>${escapeHtml(item.category || '-')}</td>
                <td>${item.remark ? `<div class="item-remark-cell">${escapeHtml(item.remark)}</div>` : '-'}</td>
                <td><span class="item-drawing-count-badge">${getDrawingCountText(drawingCount)}</span></td>
                <td>
                    <button onclick='editItem(${JSON.stringify(item).replace(/'/g, '&apos;')})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">${t('btn.edit')}</button>
                    <button onclick="deleteItem(${item.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">${t('btn.delete')}</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        </div>
    `;

    return html;
}

function filterItemsTable() {
    const searchValue = document.getElementById('itemSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#itemsTableContainer table tbody tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}

function openItemModal(item = null) {
    resetItemModalState();
    itemModalState.itemId = item?.id || null;
    itemModalState.category = item?.category || '';

    const isEdit = item !== null;
    const remarkValue = item?.remark || '';

    const html = `
        <h2>${isEdit ? t('items.modal.edit') : t('items.modal.add')}</h2>
        
        <div class="form-group">
            <label>${t('items.field.code')}</label>
            <input type="text" id="itemCode" value="${escapeHtml(item?.item_code || '')}" 
                ${isEdit ? 'disabled' : ''} placeholder="${t('items.placeholder.code')}">
        </div>
        
        <div class="form-group">
            <label>${t('items.field.name')}</label>
            <input type="text" id="itemName" value="${escapeHtml(item?.item_name || '')}" placeholder="${t('items.placeholder.name')}">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('items.field.unit')}</label>
                <select id="unit">
                    <option value="EA" ${item?.unit === 'EA' ? 'selected' : ''}>${t('items.unit.ea')}</option>
                    <option value="KG" ${item?.unit === 'KG' ? 'selected' : ''}>${t('items.unit.kg')}</option>
                    <option value="SET" ${item?.unit === 'SET' ? 'selected' : ''}>${t('items.unit.set')}</option>
                    <option value="BOX" ${item?.unit === 'BOX' ? 'selected' : ''}>${t('items.unit.box')}</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>${t('items.field.category')}</label>
                <input type="text" id="category" value="${escapeHtml(item?.category || '')}" placeholder="${t('items.placeholder.category')}" oninput="handleItemCategoryChange(this.value)">
                <div class="form-hint">${t('items.field.category_hint')}</div>
            </div>
        </div>
        
        <div class="form-group">
            <label>${t('items.field.description')}</label>
            <textarea id="description" placeholder="${t('items.placeholder.description')}">${escapeHtml(item?.description || '')}</textarea>
        </div>

        <div class="form-group">
            <div class="field-header">
                <label for="remark">${t('items.field.remark')}</label>
                <span class="field-counter" id="remarkCounter">0/${ITEM_REMARK_MAX_LENGTH}</span>
            </div>
            <textarea id="remark" maxlength="${ITEM_REMARK_MAX_LENGTH}" placeholder="${t('items.placeholder.remark')}" oninput="updateRemarkCounter()">${escapeHtml(remarkValue)}</textarea>
            <span id="itemRemarkError" class="field-error"></span>
        </div>

        <div class="form-group item-drawings-panel">
            <div class="field-header">
                <label>${t('items.drawings.title')}</label>
                <span class="field-counter" id="itemDrawingCount">${getDrawingCountText(0)}</span>
            </div>
            <div class="form-hint" id="itemDrawingHint"></div>
            <div id="itemDrawingsSection"></div>
            <span id="itemDrawingError" class="field-error"></span>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="saveItem(${item?.id || 'null'})" class="btn-primary" style="flex: 1;">${t('btn.save')}</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">${t('btn.cancel')}</button>
        </div>
    `;

    openModal(html);
    initializeItemModal(item);
}

async function initializeItemModal(item) {
    updateRemarkCounter();
    renderItemDrawingsSection();

    if (!item?.id) return;

    itemModalState.loadingDrawings = true;
    renderItemDrawingsSection();

    try {
        const { data: drawings } = await dbSelect('item_drawings', { item_id: item.id });
        itemModalState.existingDrawings = (drawings || [])
            .slice()
            .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    } catch (e) {
        console.error('Load item drawings error:', e);
        setItemDrawingError(`${t('error.load_failed')}${e.message}`);
    } finally {
        itemModalState.loadingDrawings = false;
        renderItemDrawingsSection();
    }
}

function updateRemarkCounter() {
    const remarkInput = document.getElementById('remark');
    const counter = document.getElementById('remarkCounter');
    const error = document.getElementById('itemRemarkError');
    if (!remarkInput || !counter || !error) return;

    const length = remarkInput.value.length;
    counter.textContent = `${length}/${ITEM_REMARK_MAX_LENGTH}`;
    error.textContent = length > ITEM_REMARK_MAX_LENGTH ? t('items.remark.too_long') : '';
}

function handleItemCategoryChange(value) {
    itemModalState.category = value;
    if (isPartCategory(value)) {
        setItemDrawingError('');
    }
    renderItemDrawingsSection();
}

function getCurrentDrawingCount() {
    return itemModalState.existingDrawings.length + itemModalState.pendingDrawings.length;
}

function setItemDrawingError(message) {
    itemModalState.drawingError = message || '';
    const errorEl = document.getElementById('itemDrawingError');
    if (errorEl) errorEl.textContent = itemModalState.drawingError;
}

function renderItemDrawingsSection() {
    const section = document.getElementById('itemDrawingsSection');
    const countEl = document.getElementById('itemDrawingCount');
    const hintEl = document.getElementById('itemDrawingHint');
    if (!section || !countEl || !hintEl) return;

    const totalCount = getCurrentDrawingCount();
    const partCategory = isPartCategory(itemModalState.category);
    countEl.textContent = getDrawingCountText(totalCount);
    hintEl.textContent = partCategory ? t('items.drawings.supported') : t('items.drawings.part_only_hint');

    const drawingsHtml = [
        ...itemModalState.existingDrawings.map(drawing => renderDrawingCard(drawing, true)),
        ...itemModalState.pendingDrawings.map(drawing => renderDrawingCard(drawing, false))
    ].join('');

    section.innerHTML = `
        ${partCategory ? `
            <div class="item-drawing-upload-row">
                <input
                    type="file"
                    id="itemDrawingInput"
                    accept=".pdf,.png,.jpg,.jpeg,.dwg,application/pdf,image/png,image/jpeg"
                    multiple
                    ${totalCount >= ITEM_DRAWING_LIMIT ? 'disabled' : ''}
                    onchange="handleItemDrawingSelection(event)">
            </div>
        ` : ''}
        ${itemModalState.loadingDrawings ? `<div class="item-drawing-empty">${t('loading')}</div>` : ''}
        <div class="item-drawing-list">
            ${drawingsHtml || `<div class="item-drawing-empty">${t('items.drawings.empty')}</div>`}
        </div>
    `;

    setItemDrawingError(itemModalState.drawingError);
}

function renderDrawingCard(drawing, persisted) {
    const previewUrl = escapeHtml(drawing.file_url || drawing.previewUrl || '#');
    const name = escapeHtml(drawing.file_name || drawing.name || 'drawing');
    const sizeText = formatFileSize(drawing.file_size || drawing.size || 0);
    const extension = getFileExtension(drawing.file_name || drawing.name || '').toUpperCase() || 'FILE';
    const canPreviewImage = isPreviewableImage(drawing.mime_type || drawing.mimeType, drawing.file_name || drawing.name);
    const canPreviewPdf = isPdfFile(drawing.mime_type || drawing.mimeType, drawing.file_name || drawing.name);
    const deleteHandler = persisted
        ? `removeSavedDrawing(${drawing.id})`
        : `removePendingDrawing('${drawing.tempId}')`;

    return `
        <div class="item-drawing-card">
            <div class="item-drawing-thumb">
                ${canPreviewImage
                    ? `<img src="${previewUrl}" alt="${name}">`
                    : `<span>${canPreviewPdf ? 'PDF' : extension}</span>`}
            </div>
            <div class="item-drawing-meta">
                <strong>${name}</strong>
                <div class="item-secondary-text">${sizeText}</div>
            </div>
            <div class="item-drawing-actions">
                <a href="${previewUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary item-inline-action">${t('items.drawings.preview')}</a>
                <a href="${previewUrl}" download="${name}" class="btn-secondary item-inline-action">${t('documents.btn.download')}</a>
                <button type="button" onclick="${deleteHandler}" class="btn-danger item-inline-action">${t('btn.delete')}</button>
            </div>
        </div>
    `;
}

function validateDrawingFile(file) {
    const extension = getFileExtension(file.name);
    const isAllowedType = ITEM_DRAWING_ALLOWED_MIME_TYPES.has(file.type) || ITEM_DRAWING_ALLOWED_EXTENSIONS.has(extension);

    if (!isAllowedType) {
        return `${file.name}: ${t('items.drawings.invalid_type')}`;
    }

    if (file.size > ITEM_DRAWING_MAX_SIZE) {
        return `${file.name}: ${t('items.drawings.too_large').replace('{size}', '10MB')}`;
    }

    return '';
}

function handleItemDrawingSelection(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (!isPartCategory(itemModalState.category)) {
        setItemDrawingError(t('items.drawings.part_only_error'));
        return;
    }

    const remainingSlots = ITEM_DRAWING_LIMIT - getCurrentDrawingCount();
    if (files.length > remainingSlots) {
        setItemDrawingError(t('items.drawings.max_reached'));
        return;
    }

    const validationErrors = files
        .map(validateDrawingFile)
        .filter(Boolean);

    if (validationErrors.length > 0) {
        setItemDrawingError(validationErrors.join(' '));
        return;
    }

    files.forEach(file => {
        itemModalState.pendingDrawings.push({
            tempId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            file,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            previewUrl: URL.createObjectURL(file)
        });
    });

    setItemDrawingError('');
    renderItemDrawingsSection();
}

function removePendingDrawing(tempId) {
    const target = itemModalState.pendingDrawings.find(drawing => drawing.tempId === tempId);
    if (target?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
    }
    itemModalState.pendingDrawings = itemModalState.pendingDrawings.filter(drawing => drawing.tempId !== tempId);
    setItemDrawingError('');
    renderItemDrawingsSection();
}

async function removeSavedDrawing(drawingId) {
    const drawing = itemModalState.existingDrawings.find(item => item.id === drawingId);
    if (!drawing) return;
    if (!confirm(t('items.drawings.delete_confirm'))) return;

    try {
        const result = await dbDelete('item_drawings', drawingId);
        if (result.error) throw new Error(result.error);

        if (drawing.storage_path && typeof deleteStorageFile === 'function' && supabase) {
            const storageDelete = await deleteStorageFile(ITEM_DRAWINGS_BUCKET, drawing.storage_path);
            if (storageDelete.error) {
                console.warn('Item drawing storage delete warning:', storageDelete.error);
            }
        }

        itemModalState.existingDrawings = itemModalState.existingDrawings.filter(item => item.id !== drawingId);
        renderItemDrawingsSection();
        alert(t('items.drawings.deleted'));
    } catch (e) {
        console.error('Item drawing delete error:', e);
        alert(`${t('error.delete_failed')}${e.message}`);
    }
}

async function readFileAsDataUrl(file) {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

async function uploadItemDrawingFile(itemId, file) {
    if (supabase) {
        const timestamp = Date.now();
        const safeName = sanitizeFileName(file.name);
        const storagePath = `${itemId}/${timestamp}-${safeName}`;
        const { url, error } = await uploadFile(ITEM_DRAWINGS_BUCKET, storagePath, file);
        if (error) throw new Error(error);
        return {
            file_url: url,
            storage_path: storagePath
        };
    }

    const dataUrl = await readFileAsDataUrl(file);
    return {
        file_url: dataUrl,
        storage_path: null
    };
}

async function persistPendingItemDrawings(itemId) {
    if (itemModalState.pendingDrawings.length === 0) return;

    const existingCount = itemModalState.existingDrawings.length;
    const pendingDrawings = [...itemModalState.pendingDrawings];

    for (let index = 0; index < pendingDrawings.length; index++) {
        const drawing = pendingDrawings[index];
        const uploadResult = await uploadItemDrawingFile(itemId, drawing.file);
        const payload = {
            item_id: itemId,
            file_name: drawing.name,
            file_url: uploadResult.file_url,
            file_size: drawing.size,
            mime_type: drawing.mimeType || null,
            storage_path: uploadResult.storage_path,
            sequence: existingCount + index + 1
        };

        const result = await dbInsert('item_drawings', payload);
        if (result.error) throw new Error(result.error);
    }

    resetItemModalState();
}

async function saveItem(id) {
    const isEdit = Boolean(id);
    const code = document.getElementById('itemCode').value.trim();
    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('unit').value;
    const category = document.getElementById('category').value.trim();
    const description = document.getElementById('description').value.trim();
    const remark = document.getElementById('remark').value.trim();

    if (!code || !name) {
        alert(t('items.required'));
        return;
    }

    if (remark.length > ITEM_REMARK_MAX_LENGTH) {
        document.getElementById('itemRemarkError').textContent = t('items.remark.too_long');
        return;
    }

    if (itemModalState.pendingDrawings.length > 0 && !isPartCategory(category)) {
        setItemDrawingError(t('items.drawings.part_only_error'));
        return;
    }

    const data = {
        item_code: code,
        item_name: name,
        unit,
        category,
        description,
        remark
    };

    try {
        let result;
        if (isEdit) {
            result = await dbUpdate('items', id, data);
            if (result.error) throw new Error(result.error);
        } else {
            result = await dbInsert('items', data);
            if (result.error) throw new Error(result.error);
            id = result.data?.[0]?.id || id;
        }

        if (itemModalState.pendingDrawings.length > 0) {
            const itemId = result.data?.[0]?.id || id;
            await persistPendingItemDrawings(itemId);
        } else {
            resetItemModalState();
        }

        alert(t(isEdit ? 'items.updated' : 'items.saved'));
        closeModal();
        navigateTo('items');

    } catch (e) {
        console.error('Item save error:', e);
        alert(`${t('error.save_failed')}${e.message}`);
    }
}

async function editItem(item) {
    openItemModal(item);
}

async function deleteItem(id) {
    if (!confirm(t('confirm.delete'))) return;

    try {
        const { data: drawings } = await dbSelect('item_drawings', { item_id: id });
        for (const drawing of drawings || []) {
            if (drawing.storage_path && typeof deleteStorageFile === 'function' && supabase) {
                const storageDelete = await deleteStorageFile(ITEM_DRAWINGS_BUCKET, drawing.storage_path);
                if (storageDelete.error) {
                    console.warn('Item drawing storage delete warning:', storageDelete.error);
                }
            }
            const deleteResult = await dbDelete('item_drawings', drawing.id);
            if (deleteResult.error) throw new Error(deleteResult.error);
        }

        const result = await dbDelete('items', id);
        if (result.error) throw new Error(result.error);

        alert(t('items.deleted'));
        navigateTo('items');

    } catch (e) {
        console.error('Item delete error:', e);
        alert(`${t('error.delete_failed')}${e.message}`);
    }
}

const baseCloseModal = window.closeModal;
window.closeModal = function() {
    resetItemModalState();
    baseCloseModal();
};
