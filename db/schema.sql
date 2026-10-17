-- Exiom Virtual Office Agent — Database Schema
-- Versi: 1.0 | 2026-10-17
-- Jalankan: psql -U exiom -d exiom_office -f schema.sql

-- ============================================================
-- Write-owner per tabel (sesuai handbook):
--   leads           → Ale (Client Relations)
--   projects        → Kenzie (IT Manager)
--   invoices        → Hugo (Finance)
--   content_calendar→ Mia (Marketing Manager)
--   decisions_log   → semua agent bisa INSERT (audit trail)
-- ============================================================

-- Ekstensi
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUM types
-- ============================================================

CREATE TYPE lead_status AS ENUM (
    'new',          -- baru masuk, belum dikontak
    'contacted',    -- sudah dikontak pertama kali
    'qualified',    -- sudah BANT qualify (Ale)
    'proposal_sent',-- proposal Joce sudah dikirim
    'negotiation',  -- negosiasi harga/scope
    'won',          -- deal closed
    'lost',         -- tidak jadi
    'on_hold'       -- ditunda
);

CREATE TYPE lead_type AS ENUM (
    'inbound',      -- masuk sendiri ke Exiom
    'outbound',     -- Joce yang proaktif approach
    'referral'
);

CREATE TYPE lead_priority AS ENUM (
    'hot',          -- hot lead → langsung ke Owner (skip QA Nela)
    'warm',
    'cold'
);

CREATE TYPE project_status AS ENUM (
    'scoping',      -- brief diterima, Kenzie breakdown task
    'in_progress',  -- Adi sedang coding
    'qa_review',    -- Kenzie QA
    'awaiting_approval', -- approval Owner
    'approved',
    'deployed',
    'done',
    'on_hold',
    'cancelled'
);

CREATE TYPE invoice_status AS ENUM (
    'draft',
    'sent',
    'overdue',
    'paid',
    'cancelled'
);

CREATE TYPE content_status AS ENUM (
    'idea',         -- ide awal Mia/Gagah
    'brief_sent',   -- brief ke Deril/Gagah
    'in_production',-- sedang dibuat
    'qa_review',    -- QA Mia
    'awaiting_approval', -- approval Owner
    'approved',
    'scheduled',    -- jadwal publish sudah ditentukan
    'published',
    'cancelled'
);

CREATE TYPE platform AS ENUM (
    'instagram',
    'facebook',
    'tiktok',
    'youtube',
    'threads',
    'x',
    'web_blog',
    'whatsapp',
    'email'
);

CREATE TYPE approval_priority AS ENUM (
    'hot_lead',         -- tertinggi: hot lead dari Ale
    'crisis',           -- krisis/komplain serius
    'budget_change',    -- perubahan budget ads
    'proposal',         -- proposal/pitchdeck ke klien
    'invoice_overdue',  -- invoice overdue
    'routine'           -- laporan rutin, konten reguler
);

CREATE TYPE decision_action AS ENUM (
    'approved',
    'rejected',
    'escalated',
    'revised',
    'noted'
);

-- ============================================================
-- LEADS — write-owner: Ale
-- ============================================================

CREATE TABLE leads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Info prospek
    company_name    TEXT NOT NULL,
    contact_name    TEXT,
    contact_email   TEXT,
    contact_phone   TEXT,
    contact_wa      TEXT,
    website         TEXT,
    industry        TEXT,
    company_size    TEXT,          -- 'solo', 'micro', 'small', 'medium', 'enterprise'

    -- Klasifikasi
    type            lead_type NOT NULL DEFAULT 'inbound',
    priority        lead_priority NOT NULL DEFAULT 'cold',
    status          lead_status NOT NULL DEFAULT 'new',

    -- BANT qualify (diisi Ale saat qualify)
    budget_estimate TEXT,          -- estimasi budget klien
    authority       TEXT,          -- siapa decision maker?
    need_summary    TEXT,          -- kebutuhan utama
    timeline        TEXT,          -- kapan butuh?

    -- Source
    source_channel  platform,      -- dari mana masuknya
    source_detail   TEXT,          -- URL / nama campaign / dll

    -- Relasi ke proposal Joce
    proposal_id     UUID,          -- FK ke projects kalau sudah ada

    -- Agent tracking
    agent_owner     TEXT NOT NULL DEFAULT 'ale',    -- write-owner
    agent_created   TEXT NOT NULL DEFAULT 'ale',
    agent_updated   TEXT,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_contacted  TIMESTAMPTZ,

    -- Notes
    notes           TEXT
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_company_name ON leads USING gin(company_name gin_trgm_ops);

-- ============================================================
-- PROJECTS — write-owner: Kenzie
-- ============================================================

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Info project
    name            TEXT NOT NULL,
    client_name     TEXT,
    lead_id         UUID REFERENCES leads(id),

    -- Scope & tech
    service_type    TEXT,          -- 'web_dev', 'mobile_app', 'custom_software', 'ui_ux', 'digital_marketing', 'seo'
    tech_stack      TEXT[],        -- array: ['Next.js', 'Supabase', ...]
    requirements    TEXT,          -- brief dari klien
    scope_notes     TEXT,          -- breakdown Kenzie

    -- Status & progress
    status          project_status NOT NULL DEFAULT 'scoping',
    milestone_current TEXT,
    milestone_notes TEXT,

    -- Harga (koordinasi Hugo dulu sebelum final)
    price_agreed    NUMERIC(15,2),
    currency        TEXT DEFAULT 'IDR',

    -- Tanggal
    start_date      DATE,
    deadline        DATE,
    delivered_at    TIMESTAMPTZ,

    -- Agent tracking
    agent_owner     TEXT NOT NULL DEFAULT 'kenzie',
    agent_dev       TEXT DEFAULT 'adi',
    agent_created   TEXT NOT NULL DEFAULT 'kenzie',
    agent_updated   TEXT,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    notes           TEXT
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_client ON projects USING gin(client_name gin_trgm_ops);

-- ============================================================
-- INVOICES — write-owner: Hugo
-- ============================================================

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number  TEXT UNIQUE NOT NULL,  -- format: INV-YYYYMM-XXXX

    -- Relasi
    project_id      UUID REFERENCES projects(id),
    lead_id         UUID REFERENCES leads(id),

    -- Info klien (denormalized untuk invoice standalone)
    client_name     TEXT NOT NULL,
    client_email    TEXT,
    client_address  TEXT,

    -- Nilai
    subtotal        NUMERIC(15,2) NOT NULL,
    tax_percent     NUMERIC(5,2) DEFAULT 0,
    tax_amount      NUMERIC(15,2) GENERATED ALWAYS AS (subtotal * tax_percent / 100) STORED,
    total           NUMERIC(15,2) GENERATED ALWAYS AS (subtotal + subtotal * tax_percent / 100) STORED,
    currency        TEXT DEFAULT 'IDR',

    -- Status
    status          invoice_status NOT NULL DEFAULT 'draft',

    -- Line items (JSON)
    line_items      JSONB NOT NULL DEFAULT '[]',
    -- format: [{"description": "...", "qty": 1, "unit_price": 5000000, "amount": 5000000}]

    -- Tanggal
    issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE NOT NULL,
    paid_at         TIMESTAMPTZ,

    -- Laporan Hugo: dipisah mana P&L bisnis vs infra
    report_category TEXT NOT NULL DEFAULT 'business',  -- 'business' | 'infrastructure'

    -- Agent tracking
    agent_owner     TEXT NOT NULL DEFAULT 'hugo',
    agent_created   TEXT NOT NULL DEFAULT 'hugo',
    agent_updated   TEXT,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    notes           TEXT
);

CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- ============================================================
-- CONTENT_CALENDAR — write-owner: Mia
-- ============================================================

CREATE TABLE content_calendar (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Info konten
    title           TEXT NOT NULL,
    content_type    TEXT NOT NULL,  -- 'video', 'graphic', 'carousel', 'article', 'caption', 'shorts'
    topic           TEXT,
    keyword         TEXT,           -- keyword SEO utama (Gagah)

    -- Produksi
    status          content_status NOT NULL DEFAULT 'idea',
    brief           TEXT,           -- brief dari Mia ke Deril/Gagah
    draft_url       TEXT,           -- link ke draft/file
    final_url       TEXT,           -- link ke file final

    -- Platform & jadwal
    target_platforms platform[],
    scheduled_at    TIMESTAMPTZ,

    -- Post results (setelah publish)
    post_ids        JSONB DEFAULT '{}',
    -- format: {"instagram": "post_id", "tiktok": "video_id", ...}

    -- Campaign / series
    campaign_name   TEXT,
    series_name     TEXT,

    -- Agent tracking
    agent_owner     TEXT NOT NULL DEFAULT 'mia',
    agent_creator   TEXT,           -- 'deril' untuk video/graphic, 'gagah' untuk artikel
    agent_created   TEXT NOT NULL DEFAULT 'mia',
    agent_updated   TEXT,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ,

    notes           TEXT
);

CREATE INDEX idx_content_status ON content_calendar(status);
CREATE INDEX idx_content_scheduled ON content_calendar(scheduled_at);
CREATE INDEX idx_content_platforms ON content_calendar USING gin(target_platforms);

-- ============================================================
-- DECISIONS_LOG — audit trail, semua agent bisa INSERT
-- ============================================================

CREATE TABLE decisions_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Referensi task
    task_id         TEXT,           -- Hermes task ID
    entity_type     TEXT,           -- 'lead', 'project', 'invoice', 'content', 'budget_request', 'other'
    entity_id       UUID,           -- ID dari tabel terkait

    -- Siapa memutuskan apa
    agent           TEXT NOT NULL,  -- nama agent: 'kenzie', 'adi', 'mia', dll, atau 'owner'
    action          decision_action NOT NULL,
    reason          TEXT,           -- alasan keputusan

    -- Approval chain
    approval_priority approval_priority DEFAULT 'routine',
    reviewed_by     TEXT,           -- manager yang QA (misal 'nela' review proposal Joce)
    approved_by     TEXT,           -- 'owner' kalau sudah approval final

    -- Evidence (untuk verifikasi "terbukti" di hermes-virtual-office)
    evidence_urls   TEXT[],         -- link ke file/commit/screenshot
    summary         TEXT,           -- ringkasan hasil kerja

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata tambahan
    metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_decisions_agent ON decisions_log(agent);
CREATE INDEX idx_decisions_entity ON decisions_log(entity_type, entity_id);
CREATE INDEX idx_decisions_task ON decisions_log(task_id);
CREATE INDEX idx_decisions_created_at ON decisions_log(created_at DESC);

-- ============================================================
-- APPROVAL_QUEUE — bridge antara agent dan Owner
-- ============================================================

CREATE TABLE approval_queue (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Dari mana
    agent           TEXT NOT NULL,
    task_id         TEXT,
    entity_type     TEXT,
    entity_id       UUID,

    -- Priority (sesuai SOP)
    priority        approval_priority NOT NULL DEFAULT 'routine',

    -- Isi request
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    action_requested TEXT NOT NULL,  -- apa yang diminta Owner untuk approve

    -- Status
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'expired'
    owner_response  TEXT,
    owner_note      TEXT,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_at     TIMESTAMPTZ,    -- kapan WA notification dikirim
    responded_at    TIMESTAMPTZ,

    -- Link ke attachment
    attachment_urls TEXT[],
    metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_approval_status ON approval_queue(status);
CREATE INDEX idx_approval_priority ON approval_queue(priority, created_at DESC);
CREATE INDEX idx_approval_agent ON approval_queue(agent);

-- ============================================================
-- Row-level write protection (enforce write-owner per tabel)
-- Pakai app-level check di agent layer, bukan PG RLS
-- (RLS butuh multiple PG roles — disederhanakan ke app-level untuk MVP)
-- ============================================================

-- Tabel write_permissions: referensi untuk app layer
CREATE TABLE write_permissions (
    table_name      TEXT NOT NULL,
    allowed_agents  TEXT[] NOT NULL,
    PRIMARY KEY (table_name)
);

INSERT INTO write_permissions VALUES
    ('leads',            ARRAY['ale']),
    ('projects',         ARRAY['kenzie']),
    ('invoices',         ARRAY['hugo']),
    ('content_calendar', ARRAY['mia']),
    ('decisions_log',    ARRAY['kenzie','mia','nela','hugo','adi','deril','gagah','ale','joce','owner']),
    ('approval_queue',   ARRAY['kenzie','mia','nela','hugo','adi','deril','gagah','ale','joce']),
    ('write_permissions',ARRAY['owner']);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_content_updated_at
    BEFORE UPDATE ON content_calendar
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Seed: verifikasi schema berjalan
-- ============================================================

INSERT INTO decisions_log (agent, action, reason, entity_type, summary)
VALUES ('owner', 'approved', 'Schema Fase 0 selesai dibuat', 'other', 'Initial schema setup Exiom Virtual Office Agent 2026-10-17');
