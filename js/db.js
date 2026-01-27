// ============================================
// PR SYSTEM v2 - DATABASE FUNCTIONS
// ============================================

// Initialize Supabase Client
const db = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

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
        .in('status', ['processed', 'rejected', 'cancelled'])
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
    const updates = {
        status: 'pending_manager',
        items: items,
        head_approved_at: new Date().toISOString(),
        head_approved_by: approverDept
    };

    return await updatePR(id, updates, 'APPROVE_PR_HEAD');
}

async function approvePRByManager(id, items) {
    const updates = {
        status: 'processed',
        items: items,
        manager_approved_at: new Date().toISOString(),
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
        cancelled_at: new Date().toISOString(),
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
        .in('status', ['processed', 'rejected', 'cancelled'])
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
        head_approved_at: new Date().toISOString()
    };

    return await updateMemo(id, updates, 'APPROVE_MEMO_HEAD');
}

async function approveMemoByManager(id) {
    const updates = {
        status: 'processed',
        manager_approved_at: new Date().toISOString()
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
    csv += 'วันที่ขอ,เลขที่ PR,ผู้ขอซื้อ,แผนก,สถานะ,อนุมัติโดยแผนก,อนุมัติโดยผู้บริหาร\n';

    data.forEach(row => {
        // Use UI helpers for consistency if available, otherwise manual offset
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
            return `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543} ${String(th.getUTCHours()).padStart(2, '0')}:${String(th.getUTCMinutes()).padStart(2, '0')}:${String(th.getUTCSeconds()).padStart(2, '0')}`;
        };

        const createdAt = formatD(row.created_at);
        const headApproved = formatDT(row.head_approved_at);
        const managerApproved = formatDT(row.manager_approved_at);

        csv += `${createdAt},"${row.pr_number}","${row.requester}","${row.department}","${row.status}","${headApproved}","${managerApproved}"\n`;
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
    csv += 'วันที่,เลขที่ Memo,จาก,ถึง,เรื่อง,สถานะ\n';

    data.forEach(row => {
        const dateObj = row.date ? new Date(row.date) : null;
        let dateStr = '-';
        if (dateObj && !isNaN(dateObj.getTime())) {
            const th = new Date(dateObj.getTime() + (7 * 3600000));
            dateStr = `${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')}/${th.getUTCFullYear() + 543}`;
        }
        csv += `${dateStr},"${row.memo_no}","${row.from_dept}","${row.to_dept || '-'}","${row.subject}","${row.status}"\n`;
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
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"

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
    const currentMonth = new Date().toISOString().slice(0, 7);

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
    const currentMonth = new Date().toISOString().slice(0, 7);

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
    const currentMonth = new Date().toISOString().slice(0, 7);

    await db
        .from('emailjs_accounts')
        .update({ usage_count: 0, usage_month: currentMonth })
        .eq('id', accountId);
}

async function resetAllAccountUsage() {
    const currentMonth = new Date().toISOString().slice(0, 7);

    await db
        .from('emailjs_accounts')
        .update({ usage_count: 0, usage_month: currentMonth });
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
    createMemo,
    getMemoById,
    getMemosByStatus,
    getMemoHistory,
    updateMemo,
    approveMemoByHead,
    approveMemoByManager,
    rejectMemo,
    countPendingMemo,
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
    resetAllAccountUsage
};

