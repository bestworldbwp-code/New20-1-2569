// ============================================
// PR SYSTEM v2 - DATABASE FUNCTIONS
// ============================================

// Initialize Supabase Client
const db = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// ============================================
// THAILAND TIMEZONE UTILITY
// ============================================

// Timestamp ปัจจุบันสำหรับบันทึกลง DB
// คอลัมน์ *_approved_at เป็น TIMESTAMP WITH TIME ZONE ซึ่ง Postgres เก็บค่าเป็น UTC เสมอ
// ห้ามบวก +7 ชม. ที่นี่ เพราะฝั่งแสดงผล (UI.formatDateTime) แปลง UTC -> เวลาไทย (+7) ให้อยู่แล้ว
// ถ้าบวกซ้ำ เวลาที่แสดงบนเอกสารจะเกินเวลาจริง 7 ชั่วโมง
function getThailandTime() {
    return new Date().toISOString();
}

// เดือนปัจจุบันตามปฏิทินไทย (YYYY-MM) - ใช้นับโควตา EmailJS รายเดือน
// ที่นี่ +7 ถูกต้องแล้ว เพราะต้องการ "เดือนตามเวลาไทย" ไม่ใช่ timestamp ที่เก็บลง DB
function getThailandMonth() {
    const now = new Date();
    const thTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return thTime.toISOString().slice(0, 7);
}

// ============================================
// DEPARTMENTS
// ============================================

async function getDepartments() {
    const { data, error } = await db
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return data || [];
}

async function getAllDepartments() {
    const { data, error } = await db
        .from('departments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

async function addDepartment(name, password, headEmail) {
    const { data, error } = await db
        .from('departments')
        .insert([{ name, password, head_email: headEmail }])
        .select();

    if (error) throw error;
    return data[0];
}

async function updateDepartment(id, updates) {
    const { data, error } = await db
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
}

async function deleteDepartment(id) {
    const { error } = await db
        .from('departments')
        .update({ is_active: false })
        .eq('id', id);

    if (error) throw error;
}

async function validateDepartmentPassword(password) {
    const { data, error } = await db
        .from('departments')
        .select('*')
        .eq('password', password)
        .eq('is_active', true)
        .single();

    if (error || !data) return null;
    return data;
}

// ============================================
// SETTINGS
// ============================================

async function getSetting(key) {
    const { data, error } = await db
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) return null;
    return data?.value;
}

async function setSetting(key, value) {
    const { error } = await db
        .from('settings')
        .upsert({ key, value });

    if (error) throw error;
}

async function validateManagerPassword(password) {
    const storedPassword = await getSetting('manager_password');
    return storedPassword === password;
}

async function validateSuperAdminPassword(password) {
    const storedPassword = await getSetting('super_admin_password');
    return storedPassword === password;
}

// ============================================
// MEMO BYPASS LOGIC
// ============================================

async function checkMemoBypass(department) {
    const setting = await getSetting('bypass_head_depts');
    if (!setting) return false;

    try {
        const bypassDepts = JSON.parse(setting);
        return Array.isArray(bypassDepts) && bypassDepts.includes(department);
    } catch (e) {
        console.warn('Invalid bypass setting:', e);
        return false;
    }
}

// ============================================
// PURCHASE REQUESTS
// ============================================

async function createPR(prData) {
    const { data, error } = await db
        .from('purchase_requests')
        .insert([prData])
        .select();

    if (error) throw error;

    // Log audit
    await logAudit('CREATE_PR', 'pr', data[0].id, data[0].pr_number, { requester: prData.requester });

    return data[0];
}

async function getPRById(id) {
    const { data, error } = await db
        .from('purchase_requests')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}


async function getPRByNumber(prNumber) {
    const { data, error } = await db
        .from('purchase_requests')
        .select('*')
        .eq('pr_number', prNumber.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function getPRsByStatus(status, department = null) {
    let query = db
        .from('purchase_requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (department) {
        query = query.eq('department', department);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function getPRHistory(department = null) {
    let query = db
        .from('purchase_requests')
        .select('*')
        .in('status', ['pending_manager', 'processed', 'rejected', 'cancelled'])
        .order('created_at', { ascending: false });

    if (department) {
        query = query.eq('department', department);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function updatePR(id, updates, action = 'UPDATE_PR') {
    const { data, error } = await db
        .from('purchase_requests')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;

    // Log audit
    await logAudit(action, 'pr', id, data[0].pr_number, updates);

    return data[0];
}

async function approvePRByHead(id, items, approverDept) {
    // เช็คว่ามีรายการที่อนุมัติหรือไม่
    const approvedItems = items.filter(item => item.status === 'approved');

    // ถ้าไม่มีรายการที่อนุมัติเลย = reject ทั้งหมด → จบ
    const finalStatus = approvedItems.length > 0 ? 'pending_manager' : 'rejected';

    const updates = {
        status: finalStatus,
        items: items,
        head_approved_at: getThailandTime(),
        head_approved_by: approverDept
    };

    return await updatePR(id, updates, 'APPROVE_PR_HEAD');
}

async function approvePRByManager(id, items) {
    // เช็คว่ามีรายการที่ผู้บริหารอนุมัติหรือไม่
    const approvedItems = items.filter(item => item.status === 'approved');

    // ถ้าไม่มีรายการที่อนุมัติเลย = ส่งกลับหัวหน้า
    const finalStatus = approvedItems.length > 0 ? 'processed' : 'pending_head';

    const updates = {
        status: finalStatus,
        items: items,
        manager_approved_at: getThailandTime(),
        manager_approved_by: 'ผู้บริหาร'
    };

    return await updatePR(id, updates, 'APPROVE_PR_MANAGER');
}

async function rejectPR(id, reason, role) {
    const updates = {
        status: 'rejected',
        cancel_reason: `ตีกลับโดย ${role}: ${reason}`
    };

    return await updatePR(id, updates, 'REJECT_PR');
}

async function cancelPR(id, reason) {
    const updates = {
        status: 'cancelled',
        cancelled_at: getThailandTime(),
        cancel_reason: reason
    };

    return await updatePR(id, updates, 'CANCEL_PR');
}

async function countPendingPR(status, department = null) {
    let query = db
        .from('purchase_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);

    if (department) {
        query = query.eq('department', department);
    }

    const { count } = await query;
    return count || 0;
}

// ============================================
// MEMOS
// ============================================

async function createMemo(memoData) {
    const { data, error } = await db
        .from('memos')
        .insert([memoData])
        .select();

    if (error) throw error;

    // Log audit
    await logAudit('CREATE_MEMO', 'memo', data[0].id, data[0].memo_no, { from_dept: memoData.from_dept });

    return data[0];
}

async function getMemoById(id) {
    const { data, error } = await db
        .from('memos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

async function getMemoByNumber(memoNumber) {
    const { data, error } = await db
        .from('memos')
        .select('*')
        .eq('memo_no', memoNumber.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function getMemosByStatus(status, department = null) {
    let query = db
        .from('memos')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (department) {
        query = query.eq('from_dept', department);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function getMemoHistory(department = null) {
    let query = db
        .from('memos')
        .select('*')
        .in('status', ['pending_manager', 'processed', 'rejected', 'cancelled'])
        .order('created_at', { ascending: false });

    if (department) {
        query = query.eq('from_dept', department);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function updateMemo(id, updates, action = 'UPDATE_MEMO') {
    const { data, error } = await db
        .from('memos')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;

    // Log audit
    await logAudit(action, 'memo', id, data[0].memo_no, updates);

    return data[0];
}

async function approveMemoByHead(id, approverDept) {
    const updates = {
        status: 'pending_manager',
        head_approved_at: getThailandTime()
    };

    return await updateMemo(id, updates, 'APPROVE_MEMO_HEAD');
}

async function approveMemoByManager(id) {
    const updates = {
        status: 'processed',
        manager_approved_at: getThailandTime()
    };

    return await updateMemo(id, updates, 'APPROVE_MEMO_MANAGER');
}

async function rejectMemo(id, reason, role) {
    const updates = {
        status: 'rejected',
        cancel_reason: `ตีกลับโดย ${role}: ${reason}`
    };

    return await updateMemo(id, updates, 'REJECT_MEMO');
}

async function countPendingMemo(status, department = null) {
    let query = db
        .from('memos')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);

    if (department) {
        query = query.eq('from_dept', department);
    }

    const { count } = await query;
    return count || 0;
}

// ============================================
// FILE UPLOAD
// ============================================

async function uploadFile(file, prefix = 'file') {
    const ext = file.name.split('.').pop();
    const fileName = `${prefix}_${Date.now()}.${ext}`;

    const { error } = await db.storage
        .from('pr-files')
        .upload(fileName, file);

    if (error) throw error;

    const { data } = db.storage
        .from('pr-files')
        .getPublicUrl(fileName);

    return data.publicUrl;
}

// ============================================
// AUDIT LOG
// ============================================

async function logAudit(action, docType, docId, docNumber, details = {}) {
    const userRole = sessionStorage.getItem('userRole') || 'guest';
    const userDept = sessionStorage.getItem('userDept') || '';

    try {
        await db.from('audit_logs').insert([{
            action,
            doc_type: docType,
            doc_id: docId,
            doc_number: docNumber,
            user_role: userRole,
            user_dept: userDept,
            details
        }]);
    } catch (e) {
        console.warn('Audit log failed:', e);
    }
}

async function getAuditLogs(limit = 100) {
    const { data, error } = await db
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// ============================================
// EXPORT CSV
// ============================================

async function exportPRToCSV() {
    const { data, error } = await db
        .from('purchase_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data.length) return null;

    let csv = '\uFEFF'; // BOM for Thai
    csv += 'วันที่ขอ,เลขที่ PR,ผู้ขอซื้อ,แผนก,สถานะ,อนุมัติโดยแผนก,อนุมัติโดยผู้บริหาร,รายการสินค้า\n';

    data.forEach(row => {
        const formatD = (iso) => {
            if (!iso) return '-';
            const date = new Date(iso);
            const th = new Date(date.getTime() + (7 * 3600000));
            return `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543}`;
        };
        const formatDT = (iso) => {
            if (!iso) return '-';
            const date = new Date(iso);
            const th = new Date(date.getTime() + (7 * 3600000));
            return `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543} ${String(th.getUTCHours()).padStart(2, '0')}:${String(th.getUTCMinutes()).padStart(2, '0')}`;
        };

        const getItemsText = (items) => {
            if (!items || !Array.isArray(items)) return '-';
            return items.map(it => `${it.description || ''} (${it.quantity || ''} ${it.unit || ''})`).join(' | ');
        };

        const createdAt = formatD(row.created_at);
        const headApproved = formatDT(row.head_approved_at);
        const managerApproved = formatDT(row.manager_approved_at);
        const itemsDetail = getItemsText(row.items).replace(/"/g, "'");

        csv += `${createdAt},"${row.pr_number}","${row.requester}","${row.department}","${row.status}","${headApproved}","${managerApproved}","${itemsDetail}"\n`;
    });

    return csv;
}

async function exportMemoToCSV() {
    const { data, error } = await db
        .from('memos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data.length) return null;

    let csv = '\uFEFF';
    csv += 'วันที่,เลขที่ Memo,จาก,ถึง,เรื่อง,สถานะ,วันที่อนุมัติ (ผจก.),วันที่อนุมัติ (ผู้บริหาร)\n';

    const formatDT = (iso) => {
        if (!iso) return '-';
        const date = new Date(iso);
        const th = new Date(date.getTime() + (7 * 3600000));
        return `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543} ${String(th.getUTCHours()).padStart(2, '0')}:${String(th.getUTCMinutes()).padStart(2, '0')}`;
    };

    data.forEach(row => {
        const dateObj = row.date ? new Date(row.date) : null;
        let dateStr = '-';
        if (dateObj && !isNaN(dateObj.getTime())) {
            const th = new Date(dateObj.getTime() + (7 * 3600000));
            dateStr = `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543}`;
        }
        
        const headApprove = formatDT(row.head_approved_at);
        const managerApprove = formatDT(row.manager_approved_at);

        csv += `${dateStr},"${row.memo_no}","${row.from_dept}","${row.to_dept || '-'}","${row.subject}","${row.status}","${headApprove}","${managerApprove}"\n`;
    });

    return csv;
}

// ============================================
// EMAILJS ACCOUNTS (Multi-Account Support)
// ============================================

async function getEmailJSAccounts() {
    const { data, error } = await db
        .from('emailjs_accounts')
        .select('*')
        .order('created_at');

    if (error) throw error;
    return data || [];
}

async function getActiveEmailJSAccounts() {
    const currentMonth = getThailandMonth(); // "2026-01"

    const { data, error } = await db
        .from('emailjs_accounts')
        .select('*')
        .eq('is_active', true)
        .order('usage_count'); // เรียงตาม usage น้อยไปมาก

    if (error) throw error;

    // Reset counter ถ้าเดือนใหม่
    const accounts = data || [];
    for (const acc of accounts) {
        if (acc.usage_month !== currentMonth) {
            await resetAccountUsage(acc.id);
            acc.usage_count = 0;
            acc.usage_month = currentMonth;
        }
    }

    return accounts;
}

async function addEmailJSAccount(accountData) {
    const currentMonth = getThailandMonth();

    const { data, error } = await db
        .from('emailjs_accounts')
        .insert([{
            ...accountData,
            usage_count: 0,
            usage_month: currentMonth
        }])
        .select();

    if (error) throw error;
    return data[0];
}

async function updateEmailJSAccount(id, updates) {
    const { data, error } = await db
        .from('emailjs_accounts')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
}

async function deleteEmailJSAccount(id) {
    const { error } = await db
        .from('emailjs_accounts')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

async function incrementEmailUsage(accountId) {
    const currentMonth = getThailandMonth();

    // Get current account
    const { data: account } = await db
        .from('emailjs_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

    if (!account) return;

    // Reset if new month
    if (account.usage_month !== currentMonth) {
        await db
            .from('emailjs_accounts')
            .update({ usage_count: 1, usage_month: currentMonth })
            .eq('id', accountId);
    } else {
        // Increment counter
        await db
            .from('emailjs_accounts')
            .update({ usage_count: (account.usage_count || 0) + 1 })
            .eq('id', accountId);
    }
}

async function resetAccountUsage(accountId) {
    const currentMonth = getThailandMonth();

    await db
        .from('emailjs_accounts')
        .update({ usage_count: 0, usage_month: currentMonth })
        .eq('id', accountId);
}

async function resetAllAccountUsage() {
    const currentMonth = getThailandMonth();

    await db
        .from('emailjs_accounts')
        .update({ usage_count: 0, usage_month: currentMonth });
}

// ============================================
// PETTY CASH REQUESTS
// ============================================

async function generatePettyCashNumber() {
    const now = new Date();
    const th = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const yearMonth = `${th.getUTCFullYear()}${String(th.getUTCMonth() + 1).padStart(2, '0')}`;

    // Count existing requests this month
    const { count } = await db
        .from('petty_cash_requests')
        .select('id', { count: 'exact', head: true })
        .like('request_no', `PC-${yearMonth}-%`);

    const seq = String((count || 0) + 1).padStart(3, '0');
    return `PC-${yearMonth}-${seq}`;
}

async function createPettyCash(data) {
    const requestNo = await generatePettyCashNumber();

    const { data: result, error } = await db
        .from('petty_cash_requests')
        .insert([{
            ...data,
            request_no: requestNo
        }])
        .select();

    if (error) throw error;

    // Log audit
    await logAudit('CREATE_PETTY_CASH', 'petty_cash', result[0].id, requestNo, { requester: data.requester });

    return result[0];
}

async function getPettyCashById(id) {
    console.log('[DB] Getting Petty Cash ID:', id); // Debug
    const { data, error } = await db
        .from('petty_cash_requests')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('[DB] Error getting petty cash:', error);
        throw error;
    }
    console.log('[DB] Found data:', data);
    return data;
}

async function getPettyCashByNumber(requestNo) {
    const { data, error } = await db
        .from('petty_cash_requests')
        .select('*')
        .eq('request_no', requestNo.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function getPettyCashByStatus(status, department = null) {
    let query = db
        .from('petty_cash_requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (department) {
        query = query.eq('department', department);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function getPettyCashHistory(department = null) {
    let query = db
        .from('petty_cash_requests')
        .select('*')
        .in('status', ['pending_manager', 'approved', 'rejected', 'cancelled'])
        .order('created_at', { ascending: false });

    if (department) {
        query = query.eq('department', department);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function updatePettyCash(id, updates, action = 'UPDATE_PETTY_CASH') {
    const { data, error } = await db
        .from('petty_cash_requests')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;

    // Log audit
    await logAudit(action, 'petty_cash', id, data[0].request_no, updates);

    return data[0];
}

async function approvePettyCashByHead(id, approverDept) {
    const updates = {
        status: 'pending_manager',
        head_approved_at: getThailandTime(),
        head_approved_by: approverDept
    };

    return await updatePettyCash(id, updates, 'APPROVE_PETTY_CASH_HEAD');
}

async function approvePettyCashByManager(id) {
    const updates = {
        status: 'approved',
        manager_approved_at: getThailandTime(),
        manager_approved_by: 'ผู้บริหาร'
    };

    return await updatePettyCash(id, updates, 'APPROVE_PETTY_CASH_MANAGER');
}

async function rejectPettyCash(id, reason, role) {
    const updates = {
        status: 'rejected',
        cancel_reason: `ตีกลับโดย ${role}: ${reason}`
    };

    return await updatePettyCash(id, updates, 'REJECT_PETTY_CASH');
}

async function cancelPettyCash(id, reason) {
    const updates = {
        status: 'cancelled',
        cancel_reason: reason
    };

    return await updatePettyCash(id, updates, 'CANCEL_PETTY_CASH');
}

async function countPendingPettyCash(status, department = null) {
    let query = db
        .from('petty_cash_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);

    if (department) {
        query = query.eq('department', department);
    }

    const { count } = await query;
    return count || 0;
}

async function exportPettyCashToCSV() {
    const { data, error } = await db
        .from('petty_cash_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data.length) return null;

    let csv = '\uFEFF'; // BOM for Thai
    csv += 'วันที่ขอ,เลขที่,ผู้ขอเบิก,แผนก,จำนวนเงิน,สถานะ,อนุมัติโดยแผนก,อนุมัติโดยผู้บริหาร,รายการเบิก\n';

    data.forEach(row => {
        const formatD = (iso) => {
            if (!iso) return '-';
            const date = new Date(iso);
            const th = new Date(date.getTime() + (7 * 3600000));
            return `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543}`;
        };
        const formatDT = (iso) => {
            if (!iso) return '-';
            const date = new Date(iso);
            const th = new Date(date.getTime() + (7 * 3600000));
            return `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543} ${String(th.getUTCHours()).padStart(2, '0')}:${String(th.getUTCMinutes()).padStart(2, '0')}`;
        };

        const getItemsText = (items) => {
            if (!items || !Array.isArray(items)) return '-';
            return items.map(it => `${it.detail || ''} (${Number(it.amount).toLocaleString()} บาท)`).join(' | ');
        };

        const itemsDetail = getItemsText(row.items).replace(/"/g, "'");

        csv += `${formatD(row.request_date)},"${row.request_no}","${row.requester}","${row.department}","${row.total_amount}","${row.status}","${formatDT(row.head_approved_at)}","${formatDT(row.manager_approved_at)}","${itemsDetail}"\n`;
    });

    return csv;
}

// ============================================
// ASSET REMOVAL REQUESTS
// ============================================

async function generateAssetRemovalNumber() {
    const now = new Date();
    const th = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const yearMonth = `${th.getUTCFullYear()}${String(th.getUTCMonth() + 1).padStart(2, '0')}`;

    // Count existing requests this month
    const { count } = await db
        .from('asset_removal_requests')
        .select('id', { count: 'exact', head: true })
        .like('request_no', `AR-${yearMonth}-%`);

    const seq = String((count || 0) + 1).padStart(3, '0');
    return `AR-${yearMonth}-${seq}`;
}

async function createAssetRemoval(data) {
    const requestNo = await generateAssetRemovalNumber();

    const { data: result, error } = await db
        .from('asset_removal_requests')
        .insert([{
            ...data,
            request_no: requestNo
        }])
        .select();

    if (error) throw error;

    // Log audit
    await logAudit('CREATE_ASSET_REMOVAL', 'asset_removal', result[0].id, requestNo, { requester: data.requester });

    return result[0];
}

async function getAssetRemovalById(id) {
    const { data, error } = await db
        .from('asset_removal_requests')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

async function getAssetRemovalByNumber(requestNo) {
    const { data, error } = await db
        .from('asset_removal_requests')
        .select('*')
        .eq('request_no', requestNo.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function getAssetRemovalByStatus(status, department = null) {
    let query = db
        .from('asset_removal_requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (department) {
        query = query.eq('department', department);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function getAssetRemovalHistory(department = null) {
    let query = db
        .from('asset_removal_requests')
        .select('*')
        .in('status', ['pending_manager', 'approved', 'rejected', 'cancelled'])
        .order('created_at', { ascending: false });

    if (department) {
        query = query.eq('department', department);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function updateAssetRemoval(id, updates, action = 'UPDATE_ASSET_REMOVAL') {
    const { data, error } = await db
        .from('asset_removal_requests')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;

    // Log audit
    await logAudit(action, 'asset_removal', id, data[0].request_no, updates);

    return data[0];
}

async function approveAssetRemovalByHead(id, approverDept) {
    const updates = {
        status: 'pending_manager',
        head_approved_at: getThailandTime(),
        head_approved_by: approverDept
    };

    return await updateAssetRemoval(id, updates, 'APPROVE_ASSET_REMOVAL_HEAD');
}

async function approveAssetRemovalByManager(id) {
    const updates = {
        status: 'approved',
        manager_approved_at: getThailandTime(),
        manager_approved_by: 'ผู้บริหาร'
    };

    return await updateAssetRemoval(id, updates, 'APPROVE_ASSET_REMOVAL_MANAGER');
}

async function rejectAssetRemoval(id, reason, role) {
    const updates = {
        status: 'rejected',
        cancel_reason: `ตีกลับโดย ${role}: ${reason}`
    };

    return await updateAssetRemoval(id, updates, 'REJECT_ASSET_REMOVAL');
}

async function cancelAssetRemoval(id, reason) {
    const updates = {
        status: 'cancelled',
        cancel_reason: reason
    };

    return await updateAssetRemoval(id, updates, 'CANCEL_ASSET_REMOVAL');
}

async function countPendingAssetRemoval(status, department = null) {
    let query = db
        .from('asset_removal_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);

    if (department) {
        query = query.eq('department', department);
    }

    const { count } = await query;
    return count || 0;
}

async function exportAssetRemovalToCSV() {
    const { data, error } = await db
        .from('asset_removal_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data.length) return null;

    let csv = '\uFEFF'; // BOM for Thai
    csv += 'วันที่ขอ,เลขที่,ผู้ขอ,แผนก,จำนวนรายการ,สถานะ,อนุมัติโดยแผนก,อนุมัติโดยผู้บริหาร,รายการทรัพย์สิน\n';

    data.forEach(row => {
        const formatD = (iso) => {
            if (!iso) return '-';
            const date = new Date(iso);
            const th = new Date(date.getTime() + (7 * 3600000));
            return `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543}`;
        };
        const formatDT = (iso) => {
            if (!iso) return '-';
            const date = new Date(iso);
            const th = new Date(date.getTime() + (7 * 3600000));
            return `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543} ${String(th.getUTCHours()).padStart(2, '0')}:${String(th.getUTCMinutes()).padStart(2, '0')}`;
        };

        const getItemsText = (items) => {
            const list = items?.list || items;
            if (!list || !Array.isArray(list)) return '-';
            return list.map(it => `${it.asset_name || ''} (${it.quantity || ''} ${it.unit || ''})`).join(' | ');
        };

        const itemsDetail = getItemsText(row.items).replace(/"/g, "'");

        csv += `${formatD(row.request_date)},"${row.request_no}","${row.requester}","${row.department}","${row.total_items}","${row.status}","${formatDT(row.head_approved_at)}","${formatDT(row.manager_approved_at)}","${itemsDetail}"\n`;
    });

    return csv;
}

// ============================================
// ALL DOCUMENTS (Unified View)
// ============================================

async function getAllDocuments(filters = {}) {
    const {
        type = 'all', // 'all', 'pr', 'memo', 'petty_cash', 'asset_removal'
        status = 'all',
        department = null,
        searchTerm = '',
        startDate = null,
        endDate = null,
        limit = 100
    } = filters;

    let allDocs = [];

    try {
        // Fetch PRs
        if (type === 'all' || type === 'pr') {
            let prQuery = db.from('purchase_requests').select('*');

            if (status !== 'all') prQuery = prQuery.eq('status', status);
            if (department) prQuery = prQuery.eq('department', department);
            if (searchTerm) {
                prQuery = prQuery.or(`pr_number.ilike.%${searchTerm}%,requester.ilike.%${searchTerm}%`);
            }
            if (startDate) prQuery = prQuery.gte('created_at', startDate);
            if (endDate) prQuery = prQuery.lte('created_at', endDate);

            const { data: prs } = await prQuery.order('created_at', { ascending: false }).limit(limit);
            if (prs) {
                allDocs.push(...prs.map(doc => ({ ...doc, doc_type: 'pr' })));
            }
        }

        // Fetch Memos
        if (type === 'all' || type === 'memo') {
            let memoQuery = db.from('memos').select('*');

            if (status !== 'all') memoQuery = memoQuery.eq('status', status);
            if (department) memoQuery = memoQuery.eq('from_dept', department);
            if (searchTerm) {
                memoQuery = memoQuery.or(`memo_no.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,from_dept.ilike.%${searchTerm}%`);
            }
            if (startDate) memoQuery = memoQuery.gte('created_at', startDate);
            if (endDate) memoQuery = memoQuery.lte('created_at', endDate);

            const { data: memos } = await memoQuery.order('created_at', { ascending: false }).limit(limit);
            if (memos) {
                allDocs.push(...memos.map(doc => ({ ...doc, doc_type: 'memo' })));
            }
        }

        // Fetch Petty Cash
        if (type === 'all' || type === 'petty_cash') {
            let pcQuery = db.from('petty_cash_requests').select('*');

            if (status !== 'all') pcQuery = pcQuery.eq('status', status);
            if (department) pcQuery = pcQuery.eq('department', department);
            if (searchTerm) {
                pcQuery = pcQuery.or(`request_no.ilike.%${searchTerm}%,requester.ilike.%${searchTerm}%`);
            }
            if (startDate) pcQuery = pcQuery.gte('created_at', startDate);
            if (endDate) pcQuery = pcQuery.lte('created_at', endDate);

            const { data: pcs } = await pcQuery.order('created_at', { ascending: false }).limit(limit);
            if (pcs) {
                allDocs.push(...pcs.map(doc => ({ ...doc, doc_type: 'petty_cash' })));
            }
        }

        // Fetch Asset Removals
        if (type === 'all' || type === 'asset_removal') {
            let arQuery = db.from('asset_removal_requests').select('*');

            if (status !== 'all') arQuery = arQuery.eq('status', status);
            if (department) arQuery = arQuery.eq('department', department);
            if (searchTerm) {
                arQuery = arQuery.or(`request_no.ilike.%${searchTerm}%,requester.ilike.%${searchTerm}%`);
            }
            if (startDate) arQuery = arQuery.gte('created_at', startDate);
            if (endDate) arQuery = arQuery.lte('created_at', endDate);

            const { data: ars } = await arQuery.order('created_at', { ascending: false }).limit(limit);
            if (ars) {
                allDocs.push(...ars.map(doc => ({ ...doc, doc_type: 'asset_removal' })));
            }
        }

        // Sort all documents by created_at descending
        allDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return allDocs;

    } catch (error) {
        console.error('Error fetching all documents:', error);
        throw error;
    }
}

async function getDocumentsStatistics(filters = {}) {
    const { startDate = null, endDate = null, department = null } = filters;

    const stats = {
        total: 0,
        byType: { pr: 0, memo: 0, petty_cash: 0, asset_removal: 0 },
        byStatus: {
            pending_head: 0,
            pending_manager: 0,
            processed: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0
        },
        byDepartment: {}
    };

    try {
        // PR Stats
        let prQuery = db.from('purchase_requests').select('status, department', { count: 'exact' });
        if (department) prQuery = prQuery.eq('department', department);
        if (startDate) prQuery = prQuery.gte('created_at', startDate);
        if (endDate) prQuery = prQuery.lte('created_at', endDate);
        const { data: prs, count: prCount } = await prQuery;
        stats.byType.pr = prCount || 0;
        stats.total += prCount || 0;
        if (prs) {
            prs.forEach(doc => {
                stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
                stats.byDepartment[doc.department] = (stats.byDepartment[doc.department] || 0) + 1;
            });
        }

        // Memo Stats
        let memoQuery = db.from('memos').select('status, from_dept', { count: 'exact' });
        if (department) memoQuery = memoQuery.eq('from_dept', department);
        if (startDate) memoQuery = memoQuery.gte('created_at', startDate);
        if (endDate) memoQuery = memoQuery.lte('created_at', endDate);
        const { data: memos, count: memoCount } = await memoQuery;
        stats.byType.memo = memoCount || 0;
        stats.total += memoCount || 0;
        if (memos) {
            memos.forEach(doc => {
                stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
                stats.byDepartment[doc.from_dept] = (stats.byDepartment[doc.from_dept] || 0) + 1;
            });
        }

        // Petty Cash Stats
        let pcQuery = db.from('petty_cash_requests').select('status, department', { count: 'exact' });
        if (department) pcQuery = pcQuery.eq('department', department);
        if (startDate) pcQuery = pcQuery.gte('created_at', startDate);
        if (endDate) pcQuery = pcQuery.lte('created_at', endDate);
        const { data: pcs, count: pcCount } = await pcQuery;
        stats.byType.petty_cash = pcCount || 0;
        stats.total += pcCount || 0;
        if (pcs) {
            pcs.forEach(doc => {
                stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
                stats.byDepartment[doc.department] = (stats.byDepartment[doc.department] || 0) + 1;
            });
        }

        // Asset Removal Stats
        let arQuery = db.from('asset_removal_requests').select('status, department', { count: 'exact' });
        if (department) arQuery = arQuery.eq('department', department);
        if (startDate) arQuery = arQuery.gte('created_at', startDate);
        if (endDate) arQuery = arQuery.lte('created_at', endDate);
        const { data: ars, count: arCount } = await arQuery;
        stats.byType.asset_removal = arCount || 0;
        stats.total += arCount || 0;
        if (ars) {
            ars.forEach(doc => {
                stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
                stats.byDepartment[doc.department] = (stats.byDepartment[doc.department] || 0) + 1;
            });
        }

        return stats;

    } catch (error) {
        console.error('Error getting document statistics:', error);
        throw error;
    }
}

async function getDocumentsByDateRange(startDate, endDate, filters = {}) {
    return await getAllDocuments({ ...filters, startDate, endDate });
}

async function exportAllDocumentsToCSV(filters = {}) {
    const docs = await getAllDocuments({ ...filters, limit: 10000 });

    if (!docs.length) return null;

    let csv = '\uFEFF'; // BOM for Thai
    csv += 'ประเภท,เลขที่เอกสาร,วันที่สร้าง,ผู้ขอ/จาก,แผนก,สถานะ,วันที่อนุมัติ (ผจก.),วันที่อนุมัติ (ผู้บริหาร),รายการสินค้า/รายละเอียด\n';

    const formatD = (iso) => {
        if (!iso) return '-';
        const date = new Date(iso);
        const th = new Date(date.getTime() + (7 * 3600000));
        return `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543}`;
    };

    const formatDT = (iso) => {
        if (!iso) return '-';
        const date = new Date(iso);
        const th = new Date(date.getTime() + (7 * 3600000));
        const d = `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543}`;
        const t = `${String(th.getUTCHours()).padStart(2, '0')}:${String(th.getUTCMinutes()).padStart(2, '0')}`;
        return `${d} ${t}`;
    };

    const getItemsText = (items) => {
        if (!items || !Array.isArray(items)) return '-';
        return items.map(it => {
            const name = it.description || it.detail || it.asset_name || '';
            const qty = it.quantity || it.amount || '';
            const unit = it.unit || (it.amount ? 'บาท' : '');
            return `${name}${qty ? ' (' + qty + ' ' + unit + ')' : ''}`;
        }).join(' | ');
    };

    docs.forEach(doc => {
        let type, docNo, requester, dept, detail;
        let headApprove = formatDT(doc.head_approved_at);
        let managerApprove = formatDT(doc.manager_approved_at);

        if (doc.doc_type === 'pr') {
            type = 'PR';
            docNo = doc.pr_number;
            requester = doc.requester;
            dept = doc.department;
            detail = getItemsText(doc.items);
        } else if (doc.doc_type === 'memo') {
            type = 'Memo';
            docNo = doc.memo_no;
            requester = doc.from_dept;
            dept = doc.to_dept || '-';
            detail = doc.subject;
        } else if (doc.doc_type === 'petty_cash') {
            type = 'Petty Cash';
            docNo = doc.request_no;
            requester = doc.requester;
            dept = doc.department;
            detail = `[รวม ${Number(doc.total_amount).toLocaleString()} บาท] | ` + getItemsText(doc.items);
        } else if (doc.doc_type === 'asset_removal') {
            type = 'Asset Removal';
            docNo = doc.request_no;
            requester = doc.requester;
            dept = doc.department;
            
            // Asset Removal might have nested items in 'list' property based on my previous analysis
            const arItems = doc.items?.list || doc.items; 
            detail = getItemsText(arItems);
        }

        const date = formatD(doc.created_at);
        // Replace double quotes with single quotes to avoid CSV breaking
        const cleanDetail = detail ? detail.replace(/"/g, "'") : '-';
        
        csv += `"${type}","${docNo}","${date}","${requester}","${dept}","${doc.status}","${headApprove}","${managerApprove}","${cleanDetail}"\n`;
    });

    return csv;
}


// Make functions globally available
window.DB = {
    getDepartments,
    getAllDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    validateDepartmentPassword,
    getSetting,
    setSetting,
    validateManagerPassword,
    validateSuperAdminPassword,
    checkMemoBypass,
    createPR,
    getPRById,
    getPRsByStatus,
    getPRHistory,
    updatePR,
    approvePRByHead,
    approvePRByManager,
    rejectPR,
    cancelPR,
    countPendingPR,
    getPRByNumber, // Added
    createMemo,
    getMemoById,
    getMemosByStatus,
    getMemoHistory,
    updateMemo,
    approveMemoByHead,
    approveMemoByManager,
    rejectMemo,
    countPendingMemo,
    getMemoByNumber, // Added
    uploadFile,
    logAudit,
    getAuditLogs,
    exportPRToCSV,
    exportMemoToCSV,
    // EmailJS Accounts
    getEmailJSAccounts,
    getActiveEmailJSAccounts,
    addEmailJSAccount,
    updateEmailJSAccount,
    deleteEmailJSAccount,
    incrementEmailUsage,
    resetAccountUsage,
    resetAllAccountUsage,
    // Petty Cash
    createPettyCash,
    getPettyCashById,
    getPettyCashByStatus,
    getPettyCashHistory,
    updatePettyCash,
    approvePettyCashByHead,
    approvePettyCashByManager,
    rejectPettyCash,
    cancelPettyCash,
    countPendingPettyCash,
    exportPettyCashToCSV,
    // Asset Removal
    createAssetRemoval,
    getAssetRemovalById,
    getAssetRemovalByNumber,
    getAssetRemovalByStatus,
    getAssetRemovalHistory,
    updateAssetRemoval,
    approveAssetRemovalByHead,
    approveAssetRemovalByManager,
    rejectAssetRemoval,
    cancelAssetRemoval,
    countPendingAssetRemoval,
    exportAssetRemovalToCSV,
    // All Documents (New Functions)
    getAllDocuments,
    getDocumentsStatistics,
    getDocumentsByDateRange,
    exportAllDocumentsToCSV,
    getPettyCashByNumber
};

