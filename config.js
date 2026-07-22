// ===== LZN ERP Configuration =====

const CONFIG = {
    // Supabase settings
    supabase: {
        url: 'https://snyvexlqpxpqjswizszz.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNueXZleGxxcHhwcWpzd2l6c3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzOTEwNzgsImV4cCI6MjAzNjk2NzA3OH0.sb_publishable_wEQsmWUREF_lKiYm27jF_g_MlAEiomd'
    },
    
    // Company info (LZN MEDICAL)
    company: {
        name: 'LZN MEDICAL CO., LTD.',
        name_cn: '上海流健医疗器械有限公司',
        tax_id: '91310000MADA78LU9J',
        address: '上海市闵行区虹井路120弄1号895室',
        address_en: 'Room 895, Building 1, Lane 120 Hongjing Road, Minhang District, Shanghai, China',
        phone: '+86-130-6261-9570',
        bank: '友利银行(中国)有限公司上海锦绣江南支行',
        bank_en: 'Woori Bank(China) Limited Shanghai JinXiuJiangNan Sub-Branch',
        bank_address: 'No.101-1,101-2b,102 MT BLDG, 3999 Hongxin Road, Minhang District, Shanghai',
        bank_account_cny: '100103205888',
        bank_account_krw: '100103214418',
        bank_account_usd: '100103205899',
        swift: 'HVBKCNBJ'
    },
    
    // Default customs unit mapping by HS code
    hsUnits: {
        '8466.91-0000': 'KG',
        '8504.40-9100': 'EA',
        '8542.31-0000': 'EA',
        '9018.90-0000': 'SET'
    }
};

// ===== Global Variables =====
var supabase = null;
var currentUser = null;

// ===== Local Data Store Init =====
function initLocalData() {
    const data = {
        items: [],
        partners: [],
        purchases: [],
        exports: [],
        payments: [],
        documents: []
    };
    
    Object.keys(data).forEach(key => {
        const stored = localStorage.getItem(`lzn_${key}`);
        if (stored) {
            try {
                data[key] = JSON.parse(stored);
            } catch (e) {
                data[key] = [];
            }
        }
    });
    
    return data;
}

var localData = initLocalData();

// ===== Supabase Init =====
function initSupabase() {
    if (supabase) return supabase;
    if (!CONFIG.supabase.url || CONFIG.supabase.url === '') {
        console.warn('⚠️ Supabase URL is not configured.');
        return null;
    }
    try {
        const { createClient } = window.supabase;
        supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
        console.log('✅ Supabase initialized');
        return supabase;
    } catch (e) {
        console.warn('⚠️ Supabase init failed:', e.message);
        return null;
    }
}

// ===== Table Name Constants =====
const TABLES = {
    ITEMS: 'items',
    PARTNERS: 'partners',
    PURCHASES: 'purchases',
    PURCHASE_ITEMS: 'purchase_items',
    EXPORTS: 'exports',
    EXPORT_ITEMS: 'export_items',
    PAYMENTS: 'payments',
    DOCUMENTS: 'documents'
};

// ===== Utility Functions =====
function formatDate(date) {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toISOString().slice(0, 10);
    } catch(e) {
        return '-';
    }
}

function formatCurrency(amount, currency = 'CNY') {
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function generateId(prefix) {
    const date = new Date();
    const y = String(date.getFullYear()).slice(2);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `${prefix}${y}${m}${d}-${seq}`;
}

async function generatePartnerCode() {
    const date = new Date();
    const y = String(date.getFullYear()).slice(2);
    const m = String(date.getMonth() + 1).padStart(2, '0');

    let existingCodes = new Set();
    try {
        const { data } = await dbSelect('partners');
        if (data) data.forEach(p => existingCodes.add(p.partner_code));
    } catch (e) { /* ignore, collision is extremely unlikely */ }

    let code;
    let attempts = 0;
    do {
        const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        code = `CUST-${y}${m}-${seq}`;
        attempts++;
    } while (existingCodes.has(code) && attempts < 100);

    return code;
}

function getStatusBadge(status) {
    const map = {
        'offer':     { key: 'status.offer',     cls: 'badge-info' },
        'order':     { key: 'status.order',     cls: 'badge-warning' },
        'received':  { key: 'status.received',  cls: 'badge-success' },
        'completed': { key: 'status.completed', cls: 'badge-success' },
        'draft':     { key: 'status.draft',     cls: 'badge-gray' },
        'contract':  { key: 'status.contract',  cls: 'badge-info' },
        'shipped':   { key: 'status.shipped',   cls: 'badge-warning' },
        'invoiced':  { key: 'status.invoiced',  cls: 'badge-success' },
        'pending':   { key: 'status.pending',   cls: 'badge-danger' },
        'partial':   { key: 'status.partial',   cls: 'badge-warning' },
        'paid':      { key: 'status.paid',      cls: 'badge-success' }
    };
    const info = map[status];
    const label = info ? t(info.key) : status;
    const cls   = info ? info.cls    : 'badge-gray';
    return `<span class="badge ${cls}">${label}</span>`;
}

// ===== Local Storage Helpers =====
function saveLocal(key, data) {
    localStorage.setItem(`lzn_${key}`, JSON.stringify(data));
}

function loadLocal(key) {
    const data = localStorage.getItem(`lzn_${key}`);
    return data ? JSON.parse(data) : null;
}

// ===== Supabase CRUD Helpers (with local fallback) =====
async function dbSelect(table, filters = {}) {
    try {
        console.log('📊 dbSelect:', table, filters);
        
        // Try Supabase
        if (supabase && table) {
            try {
                let query = supabase.from(table).select('*');
                
                Object.keys(filters).forEach(key => {
                    if (filters[key] !== null && filters[key] !== undefined) {
                        query = query.eq(key, filters[key]);
                    }
                });
                
                const { data, error } = await query;
                
                if (!error && data) {
                    console.log('✅ Supabase select:', data?.length || 0, 'rows');
                    return { data: data || [], error: null };
                }
            } catch (e) {
                console.warn('⚠️ Supabase select failed:', e.message);
            }
        }
        
        // Use local data
        console.log('📱 Using local data');
        let data = localData[table] || [];
        
        if (Object.keys(filters).length > 0) {
            data = data.filter(item => {
                return Object.keys(filters).every(key => item[key] === filters[key]);
            });
        }
        
        console.log('✅ Local select:', data?.length || 0, 'rows');
        return { data: data || [], error: null };
    } catch (e) {
        console.error('dbSelect error:', e);
        return { data: [], error: e.message };
    }
}

async function dbInsert(table, data) {
    try {
        console.log('📝 dbInsert:', table, data);
        
        // Try Supabase
        if (supabase && table) {
            try {
                const { data: result, error } = await supabase
                    .from(table)
                    .insert([data])
                    .select();
                
                if (!error && result) {
                    console.log('✅ Supabase insert OK');
                    return { data: result, error: null };
                }
            } catch (e) {
                console.warn('⚠️ Supabase insert failed:', e.message);
            }
        }
        
        // Use local data
        console.log('📱 Saving local data');
        const newItem = { id: Date.now(), ...data };
        if (!localData[table]) localData[table] = [];
        localData[table].push(newItem);
        saveLocal(table, localData[table]);
        
        console.log('✅ Local insert OK:', newItem.id);
        return { data: [newItem], error: null };
    } catch (e) {
        console.error('dbInsert error:', e);
        return { data: null, error: e.message };
    }
}

async function dbUpdate(table, id, data) {
    try {
        console.log('🔄 dbUpdate:', table, id, data);
        
        // Try Supabase
        if (supabase && table && id) {
            try {
                const { data: result, error } = await supabase
                    .from(table)
                    .update(data)
                    .eq('id', id)
                    .select();
                
                if (!error && result) {
                    console.log('✅ Supabase update OK');
                    return { data: result, error: null };
                }
            } catch (e) {
                console.warn('⚠️ Supabase update failed:', e.message);
            }
        }
        
        // Use local data
        console.log('📱 Updating local data');
        if (localData[table]) {
            const index = localData[table].findIndex(item => item.id === id);
            if (index !== -1) {
                localData[table][index] = { ...localData[table][index], ...data };
                saveLocal(table, localData[table]);
                console.log('✅ Local update OK');
                return { data: [localData[table][index]], error: null };
            }
        }
        
        return { data: null, error: t('error.not_found') };
    } catch (e) {
        console.error('dbUpdate error:', e);
        return { data: null, error: e.message };
    }
}

async function dbDelete(table, id) {
    try {
        console.log('🗑️ dbDelete:', table, id);
        
        // Try Supabase
        if (supabase && table && id) {
            try {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq('id', id);
                
                if (!error) {
                    console.log('✅ Supabase delete OK');
                    return { error: null };
                }
            } catch (e) {
                console.warn('⚠️ Supabase delete failed:', e.message);
            }
        }
        
        // Use local data
        console.log('📱 Deleting local data');
        if (localData[table]) {
            localData[table] = localData[table].filter(item => item.id !== id);
            saveLocal(table, localData[table]);
            console.log('✅ Local delete OK');
            return { error: null };
        }
        
        return { error: t('error.not_found') };
    } catch (e) {
        console.error('dbDelete error:', e);
        return { error: e.message };
    }
}

async function uploadFile(bucket, path, file) {
    if (!supabase) {
        return { url: null, error: 'Supabase not initialized' };
    }
    
    try {
        console.log('📤 uploadFile:', bucket, path);
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: true });
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        console.log('✅ uploadFile OK');
        return { url: urlData.publicUrl, error: null };
    } catch (e) {
        console.error('uploadFile error:', e);
        return { url: null, error: e.message };
    }
}

// ===== Global Exports =====
window.CONFIG = CONFIG;
window.initSupabase = initSupabase;
window.TABLES = TABLES;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.generateId = generateId;
window.generatePartnerCode = generatePartnerCode;
window.getStatusBadge = getStatusBadge;
window.dbSelect = dbSelect;
window.dbInsert = dbInsert;
window.dbUpdate = dbUpdate;
window.dbDelete = dbDelete;
window.uploadFile = uploadFile;
window.saveLocal = saveLocal;
window.loadLocal = loadLocal;
