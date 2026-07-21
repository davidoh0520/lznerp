// ===== LZN ERP 설정 파일 =====

const CONFIG = {
    // Supabase 설정 (나중에 실제 값으로 변경)
    supabase: {
        url: 'https://snyvexlqpxpqjswizszz.supabase.co/rest/v1/',
        anonKey: 'sb_publishable_wEQsmWUREF_lKiYm27jF_g_MlAEiomd'
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
        console.warn('⚠️ Supabase URL이 설정되지 않았습니다. 샘플 데이터로 동작합니다.');
        return null;
    }
    try {
        const { createClient } = window.supabase;
        supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
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

// ===== Supabase CRUD 헬퍼 (샘플 데이터용) =====
async function dbInsert(table, data) {
    console.log('📝 dbInsert:', table, data);
    // 샘플 데이터면 그냥 반환
    return { data: [data], error: null };
}

async function dbSelect(table, query = {}) {
    console.log('📊 dbSelect:', table, query);
    // 샘플 데이터면 빈 배열 반환
    return { data: [], error: null };
}

async function dbUpdate(table, id, data) {
    console.log('🔄 dbUpdate:', table, id, data);
    return { data: [data], error: null };
}

async function dbDelete(table, id) {
    console.log('🗑️ dbDelete:', table, id);
    return { error: null };
}

async function uploadFile(bucket, path, file) {
    console.log('📤 uploadFile:', bucket, path, file);
    return { url: 'https://example.com/uploaded-file.jpg' };
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
window.dbInsert = dbInsert;
window.dbSelect = dbSelect;
window.dbUpdate = dbUpdate;
window.dbDelete = dbDelete;
window.uploadFile = uploadFile;
window.saveLocal = saveLocal;
window.loadLocal = loadLocal;