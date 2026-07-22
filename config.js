// ===== LZN ERP 설정 파일 =====

const CONFIG = {
    // Supabase 설정
    supabase: {
        url: 'https://snyvexlqpxpqjswizszz.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNueXZleGxxcHhwcWpzd2l6c3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzOTEwNzgsImV4cCI6MjAzNjk2NzA3OH0.sb_publishable_wEQsmWUREF_lKiYm27jF_g_MlAEiomd'
    },
    
    // 회사 정보 (LZN MEDICAL)
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
    
    // HS 코드별 기본 통관 단위 매핑
    hsUnits: {
        '8466.91-0000': 'KG',
        '8504.40-9100': 'EA',
        '8542.31-0000': 'EA',
        '9018.90-0000': 'SET'
    }
};

// ===== 전역 변수 =====
var supabase = null;
var currentUser = null;

// ===== Supabase 초기화 =====
function initSupabase() {
    if (supabase) return supabase;
    if (!CONFIG.supabase.url || CONFIG.supabase.url === '') {
        console.warn('⚠️ Supabase URL이 설정되지 않았습니다.');
        return null;
    }
    try {
        const { createClient } = window.supabase;
        supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
        console.log('✅ Supabase 초기화 완료');
        return supabase;
    } catch (e) {
        console.warn('⚠️ Supabase 초기화 실패:', e.message);
        return null;
    }
}

// ===== 테이블명 상수 =====
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

// ===== 유틸리티 함수 =====
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
    return new Intl.NumberFormat('ko-KR', { 
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

function getStatusBadge(status) {
    const map = {
        'offer': { label: '오퍼', class: 'badge-info' },
        'order': { label: '오더', class: 'badge-warning' },
        'received': { label: '입고완료', class: 'badge-success' },
        'completed': { label: '완료', class: 'badge-success' },
        'draft': { label: '임시', class: 'badge-gray' },
        'contract': { label: '계약', class: 'badge-info' },
        'shipped': { label: '선적', class: 'badge-warning' },
        'invoiced': { label: '인보이스발행', class: 'badge-success' },
        'pending': { label: '미수금', class: 'badge-danger' },
        'partial': { label: '부분수금', class: 'badge-warning' },
        'paid': { label: '수금완료', class: 'badge-success' }
    };
    const info = map[status] || { label: status, class: 'badge-gray' };
    return `<span class="badge ${info.class}">${info.label}</span>`;
}

// ===== Supabase CRUD 헬퍼 (실제 구현) =====
async function dbSelect(table, filters = {}) {
    if (!supabase) {
        console.warn('⚠️ Supabase가 초기화되지 않았습니다.');
        return { data: [], error: 'Supabase not initialized' };
    }
    
    try {
        console.log('📊 dbSelect:', table, filters);
        let query = supabase.from(table).select('*');
        
        // 필터 적용
        Object.keys(filters).forEach(key => {
            if (filters[key] !== null && filters[key] !== undefined) {
                query = query.eq(key, filters[key]);
            }
        });
        
        const { data, error } = await query;
        
        if (error) {
            console.error('❌ dbSelect 에러:', error);
            throw error;
        }
        
        console.log('✅ dbSelect 성공:', data?.length || 0, '개 항목');
        return { data: data || [], error: null };
    } catch (e) {
        console.error('❌ dbSelect 예외:', e.message);
        return { data: [], error: e.message };
    }
}

async function dbInsert(table, data) {
    if (!supabase) {
        console.warn('⚠️ Supabase가 초기화되지 않았습니다.');
        return { data: null, error: 'Supabase not initialized' };
    }
    
    try {
        console.log('📝 dbInsert:', table, data);
        const { data: result, error } = await supabase
            .from(table)
            .insert([data])
            .select();
        
        if (error) {
            console.error('❌ dbInsert 에러:', error);
            throw error;
        }
        
        console.log('✅ dbInsert 성공');
        return { data: result, error: null };
    } catch (e) {
        console.error('❌ dbInsert 예외:', e.message);
        return { data: null, error: e.message };
    }
}

async function dbUpdate(table, id, data) {
    if (!supabase) {
        console.warn('⚠️ Supabase가 초기화되지 않았습니다.');
        return { data: null, error: 'Supabase not initialized' };
    }
    
    try {
        console.log('🔄 dbUpdate:', table, id, data);
        const { data: result, error } = await supabase
            .from(table)
            .update(data)
            .eq('id', id)
            .select();
        
        if (error) {
            console.error('❌ dbUpdate 에러:', error);
            throw error;
        }
        
        console.log('✅ dbUpdate 성공');
        return { data: result, error: null };
    } catch (e) {
        console.error('❌ dbUpdate 예외:', e.message);
        return { data: null, error: e.message };
    }
}

async function dbDelete(table, id) {
    if (!supabase) {
        console.warn('⚠️ Supabase가 초기화되지 않았습니다.');
        return { error: 'Supabase not initialized' };
    }
    
    try {
        console.log('🗑️ dbDelete:', table, id);
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('❌ dbDelete 에러:', error);
            throw error;
        }
        
        console.log('✅ dbDelete 성공');
        return { error: null };
    } catch (e) {
        console.error('❌ dbDelete 예외:', e.message);
        return { error: e.message };
    }
}

async function uploadFile(bucket, path, file) {
    if (!supabase) {
        console.warn('⚠️ Supabase가 초기화되지 않았습니다.');
        return { url: null, error: 'Supabase not initialized' };
    }
    
    try {
        console.log('📤 uploadFile:', bucket, path);
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: true });
        
        if (error) {
            console.error('❌ uploadFile 에러:', error);
            throw error;
        }
        
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);
        
        console.log('✅ uploadFile 성공');
        return { url: urlData.publicUrl, error: null };
    } catch (e) {
        console.error('❌ uploadFile 예외:', e.message);
        return { url: null, error: e.message };
    }
}

// ===== 로컬 스토리지 헬퍼 =====
function saveLocal(key, data) {
    localStorage.setItem(`lzn_${key}`, JSON.stringify(data));
}

function loadLocal(key) {
    const data = localStorage.getItem(`lzn_${key}`);
    return data ? JSON.parse(data) : null;
}

// ===== 전역 노출 =====
window.CONFIG = CONFIG;
window.initSupabase = initSupabase;
window.TABLES = TABLES;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.generateId = generateId;
window.getStatusBadge = getStatusBadge;
window.dbSelect = dbSelect;
window.dbInsert = dbInsert;
window.dbUpdate = dbUpdate;
window.dbDelete = dbDelete;
window.uploadFile = uploadFile;
window.saveLocal = saveLocal;
window.loadLocal = loadLocal;