-- ============================================
-- FIX: เวลาอนุมัติเพี้ยนไป +7 ชั่วโมง (บวกเวลาไทยซ้ำสองรอบ)
-- ============================================
-- สาเหตุ:
--   ฟังก์ชัน getThailandTime() ใน js/db.js เดิมบวก 7 ชม. ก่อนบันทึกลง DB
--   แต่คอลัมน์ *_approved_at เป็น TIMESTAMPTZ (Postgres เก็บเป็น UTC)
--   และฝั่งแสดงผล UI.formatDateTime() ก็บวก +7 อีกรอบ
--   => เวลาที่โชว์บนเอกสารจึงเกินเวลาจริง 7 ชั่วโมง
--
-- โค้ดถูกแก้แล้ว (บันทึกเป็น UTC ตรง ๆ) ไฟล์นี้ใช้แก้ "ข้อมูลเก่า" ที่บันทึกไปแล้ว
--
-- วิธีใช้: เปิด Supabase > SQL Editor > วางทั้งไฟล์ > Run
-- สคริปต์นี้รันซ้ำได้ ถ้าเคยรันแล้วจะข้ามให้อัตโนมัติ (กันแก้ซ้ำจนเวลาเพี้ยนอีก)
-- หมายเหตุ: created_at ไม่ต้องแก้ เพราะใช้ NOW() ของ Postgres ซึ่งถูกต้องอยู่แล้ว
-- ============================================

-- ตารางบันทึกว่า migration ไหนรันไปแล้วบ้าง
CREATE TABLE IF NOT EXISTS system_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE system_migrations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    target_tables TEXT[] := ARRAY[
        'purchase_requests',
        'memos',
        'petty_cash_requests',
        'asset_removal_requests'
    ];
    t TEXT;
    n INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM system_migrations WHERE name = 'fix_timezone_double_shift_v1') THEN
        RAISE NOTICE 'ข้าม: migration นี้เคยรันไปแล้ว (ไม่แก้ซ้ำ)';
        RETURN;
    END IF;

    FOREACH t IN ARRAY target_tables LOOP
        IF to_regclass('public.' || t) IS NULL THEN
            RAISE NOTICE 'ข้ามตาราง % (ไม่พบในฐานข้อมูล)', t;
            CONTINUE;
        END IF;

        EXECUTE format(
            'UPDATE public.%I SET head_approved_at = head_approved_at - INTERVAL ''7 hours''
             WHERE head_approved_at IS NOT NULL', t);
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE '% : head_approved_at แก้ไข % แถว', t, n;

        EXECUTE format(
            'UPDATE public.%I SET manager_approved_at = manager_approved_at - INTERVAL ''7 hours''
             WHERE manager_approved_at IS NOT NULL', t);
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE '% : manager_approved_at แก้ไข % แถว', t, n;
    END LOOP;

    INSERT INTO system_migrations (name) VALUES ('fix_timezone_double_shift_v1');
    RAISE NOTICE 'เสร็จสิ้น: เวลาอนุมัติย้อนหลังถูกปรับกลับมาตรงเวลาไทยแล้ว';
END $$;
