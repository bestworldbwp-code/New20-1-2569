-- ============================================
-- FIX RLS POLICY
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Allow all access" ON petty_cash_requests;

-- Create new policy with WITH CHECK
CREATE POLICY "Allow all access" ON petty_cash_requests 
FOR ALL 
USING (true) 
WITH CHECK (true);
