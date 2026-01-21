-- ============================================
-- EmailJS Accounts Table for Multi-Account Support
-- ============================================
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS emailjs_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,                    -- ชื่อ Account เช่น "Gmail หลัก", "Gmail สำรอง"
    public_key TEXT NOT NULL,
    service_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,        -- เปิด/ปิดการใช้งาน
    usage_count INTEGER DEFAULT 0,         -- จำนวน Email ที่ส่งไปแล้วเดือนนี้
    usage_month TEXT,                      -- เดือนที่นับ (เช่น "2026-01")
    quota_limit INTEGER DEFAULT 200,       -- Quota สูงสุดต่อเดือน
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE emailjs_accounts ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (สำหรับระบบนี้ที่ไม่มี auth)
CREATE POLICY "Allow all access" ON emailjs_accounts FOR ALL USING (true);

-- Insert default account (Account เดิมที่ใช้อยู่)
INSERT INTO emailjs_accounts (name, public_key, service_id, template_id, is_active, usage_count, usage_month, quota_limit)
VALUES (
    'Gmail หลัก (BWP)',
    'rEly1Il6Xz0qZwaSc',
    'service_tolm3pu',
    'template_master',
    true,
    0,
    TO_CHAR(NOW(), 'YYYY-MM'),
    200
);
