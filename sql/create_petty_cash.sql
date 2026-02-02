-- ============================================
-- Petty Cash Requests Table
-- ============================================
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS petty_cash_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_no TEXT NOT NULL,              -- PC-YYYYMM-XXX
    department TEXT NOT NULL,
    requester TEXT NOT NULL,
    request_date DATE NOT NULL,
    items JSONB DEFAULT '[]',              -- [{no, detail, amount}]
    total_amount DECIMAL(10,2) NOT NULL,
    amount_text TEXT,                      -- จำนวนเงินตัวอักษร
    status TEXT DEFAULT 'pending_head',    -- pending_head, pending_manager, approved, rejected, cancelled
    head_approved_at TIMESTAMP WITH TIME ZONE,
    head_approved_by TEXT,
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_approved_by TEXT,
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE petty_cash_requests ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (สำหรับระบบนี้ที่ไม่มี auth)
CREATE POLICY "Allow all access" ON petty_cash_requests FOR ALL USING (true);

-- Create index for faster queries
CREATE INDEX idx_petty_cash_status ON petty_cash_requests(status);
CREATE INDEX idx_petty_cash_department ON petty_cash_requests(department);
