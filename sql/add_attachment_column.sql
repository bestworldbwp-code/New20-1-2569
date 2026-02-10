-- ============================================
-- Add Attachment Column to Petty Cash
-- ============================================
-- เพิ่มคอลัมน์สำหรับเก็บ URL ไฟล์แนบในตาราง petty_cash_requests

ALTER TABLE petty_cash_requests 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- คำสั่งนี้ปลอดภัย สามารถรันซ้ำได้โดยไม่เกิดข้อผิดพลาด (IF NOT EXISTS)
