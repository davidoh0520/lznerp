-- ===== LZN ERP Supabase 테이블 생성 스크립트 =====

-- 품목 테이블
CREATE TABLE IF NOT EXISTS items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    item_code TEXT UNIQUE NOT NULL,
    item_name TEXT NOT NULL,
    hs_code TEXT,
    unit TEXT DEFAULT 'EA',
    category TEXT,
    description TEXT,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 품목 도면 테이블
CREATE TABLE IF NOT EXISTS item_drawings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    storage_path TEXT,
    sequence INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 거래처 테이블
CREATE TABLE IF NOT EXISTS partners (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    partner_code TEXT UNIQUE NOT NULL,
    partner_name TEXT NOT NULL,
    country TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_registration_number TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 매입 테이블
CREATE TABLE IF NOT EXISTS purchases (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    po_number TEXT UNIQUE NOT NULL,
    partner_id BIGINT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'draft',
    po_date DATE,
    delivery_date DATE,
    total_amount NUMERIC(15, 2),
    currency TEXT DEFAULT 'CNY',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 매입 상세 테이블
CREATE TABLE IF NOT EXISTS purchase_items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    purchase_id BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2),
    unit_price NUMERIC(12, 2),
    line_total NUMERIC(15, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 수출 테이블
CREATE TABLE IF NOT EXISTS exports (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    export_code TEXT UNIQUE NOT NULL,
    partner_id BIGINT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'draft',
    export_date DATE,
    shipment_date DATE,
    total_amount NUMERIC(15, 2),
    currency TEXT DEFAULT 'CNY',
    incoterms TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 수출 상세 테이블
CREATE TABLE IF NOT EXISTS export_items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    export_id BIGINT NOT NULL REFERENCES exports(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2),
    unit_price NUMERIC(12, 2),
    line_total NUMERIC(15, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 수금 테이블
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    payment_code TEXT UNIQUE NOT NULL,
    export_id BIGINT NOT NULL REFERENCES exports(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2),
    currency TEXT DEFAULT 'CNY',
    status TEXT DEFAULT 'pending',
    payment_date DATE,
    payment_method TEXT,
    bank_reference TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 서류 테이블
CREATE TABLE IF NOT EXISTS documents (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    doc_number TEXT UNIQUE NOT NULL,
    doc_type TEXT,
    export_id BIGINT REFERENCES exports(id) ON DELETE SET NULL,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_items_code ON items(item_code);
CREATE INDEX IF NOT EXISTS idx_item_drawings_item ON item_drawings(item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_drawings_item_sequence ON item_drawings(item_id, sequence);
CREATE INDEX IF NOT EXISTS idx_partners_code ON partners(partner_code);
CREATE INDEX IF NOT EXISTS idx_purchases_partner ON purchases(partner_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_exports_partner ON exports(partner_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON exports(status);
CREATE INDEX IF NOT EXISTS idx_payments_export ON payments(export_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_documents_export ON documents(export_id);

-- RLS (Row Level Security) 정책 - 모두 허용 (테스트용)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 모두에게 SELECT 허용
CREATE POLICY "Allow select for all" ON items FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON item_drawings FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON partners FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON purchases FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON purchase_items FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON exports FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON export_items FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON documents FOR SELECT USING (true);

-- 모두에게 INSERT/UPDATE/DELETE 허용
CREATE POLICY "Allow insert for all" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON items FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all" ON items FOR DELETE USING (true);

CREATE POLICY "Allow insert for all" ON item_drawings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON item_drawings FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all" ON item_drawings FOR DELETE USING (true);

CREATE POLICY "Allow insert for all" ON partners FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON partners FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all" ON partners FOR DELETE USING (true);

CREATE POLICY "Allow insert for all" ON purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON purchases FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all" ON purchases FOR DELETE USING (true);

CREATE POLICY "Allow insert for all" ON purchase_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON purchase_items FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all" ON purchase_items FOR DELETE USING (true);

CREATE POLICY "Allow insert for all" ON exports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON exports FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all" ON exports FOR DELETE USING (true);

CREATE POLICY "Allow insert for all" ON export_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON export_items FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all" ON export_items FOR DELETE USING (true);

CREATE POLICY "Allow insert for all" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON payments FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all" ON payments FOR DELETE USING (true);

CREATE POLICY "Allow insert for all" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON documents FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all" ON documents FOR DELETE USING (true);

-- ===== Migration: China customer profile fields =====
-- Run this against an existing database to add new partner columns.
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
ALTER TABLE partners ADD COLUMN IF NOT EXISTS tax_registration_number TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

-- Index for tax registration number lookups
CREATE INDEX IF NOT EXISTS idx_partners_tax_reg ON partners(tax_registration_number);

-- ===== Migration: Product management fields =====
ALTER TABLE items ADD COLUMN IF NOT EXISTS remark TEXT;

-- Repeated here so this migration block can be run independently on older databases.
CREATE TABLE IF NOT EXISTS item_drawings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    storage_path TEXT,
    sequence INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE item_drawings ADD COLUMN IF NOT EXISTS storage_path TEXT;

CREATE INDEX IF NOT EXISTS idx_item_drawings_item ON item_drawings(item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_drawings_item_sequence ON item_drawings(item_id, sequence);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'item-drawings',
    'item-drawings',
    true,
    10485760,
    ARRAY[
        'application/pdf',
        'image/png',
        'image/jpeg',
        'application/dwg',
        'image/vnd.dwg',
        'image/x-dwg'
    ]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Allow item drawings read'
    ) THEN
        CREATE POLICY "Allow item drawings read"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'item-drawings');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Allow item drawings upload'
    ) THEN
        CREATE POLICY "Allow item drawings upload"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'item-drawings');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Allow item drawings delete'
    ) THEN
        CREATE POLICY "Allow item drawings delete"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'item-drawings');
    END IF;
END $$;