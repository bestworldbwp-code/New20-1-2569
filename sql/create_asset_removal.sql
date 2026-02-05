-- ============================================
-- Asset Removal Requests Table
-- ใบขออนุญาตนำทรัพสินออกนอกบริษัท
-- ============================================
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS asset_removal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_no TEXT NOT NULL,              -- AR-YYYYMM-XXX
    department TEXT NOT NULL,
    requester TEXT NOT NULL,
    request_date DATE NOT NULL,
    items JSONB DEFAULT '[]',              -- [{no, asset_name, quantity, purpose, return_date}]
    total_items INTEGER NOT NULL,
    status TEXT DEFAULT 'pending_head',    -- pending_head, pending_manager, approved, rejected, cancelled
    head_approved_at TIMESTAMP WITH TIME ZONE,
    head_approved_by TEXT,
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_approved_by TEXT,
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE asset_removal_requests ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (สำหรับระบบนี้ที่ไม่มี auth)
CREATE POLICY "Allow all access" ON asset_removal_requests FOR ALL USING (true);

-- Create index for faster queries
CREATE INDEX idx_asset_removal_status ON asset_removal_requests(status);
CREATE INDEX idx_asset_removal_department ON asset_removal_requests(department);
