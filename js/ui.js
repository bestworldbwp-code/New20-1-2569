// ============================================
// PR SYSTEM v2 - UI UTILITIES
// ============================================

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${getToastIcon(type)}</span>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// ============================================
// LOADING OVERLAY
// ============================================

function showLoading(message = 'กำลังโหลด...') {
    let overlay = document.getElementById('loadingOverlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <p id="loadingMessage">${message}</p>
        `;
        document.body.appendChild(overlay);
    } else {
        document.getElementById('loadingMessage').textContent = message;
    }

    setTimeout(() => overlay.classList.add('show'), 10);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// ============================================
// MODAL
// ============================================

function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function hideAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.classList.remove('show');
    });
    document.body.style.overflow = '';
}

// ============================================
// FORM VALIDATION
// ============================================

function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    let isValid = true;
    const inputs = form.querySelectorAll('[required]');

    inputs.forEach(input => {
        clearError(input);

        if (!input.value.trim()) {
            showError(input, 'กรุณากรอกข้อมูล');
            isValid = false;
        } else if (input.type === 'email' && !isValidEmail(input.value)) {
            showError(input, 'รูปแบบอีเมลไม่ถูกต้อง');
            isValid = false;
        }
    });

    return isValid;
}

function showError(input, message) {
    input.classList.add('error');

    let errorEl = input.parentElement.querySelector('.error-message');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        input.parentElement.appendChild(errorEl);
    }

    errorEl.textContent = message;
    errorEl.classList.add('show');
}

function clearError(input) {
    input.classList.remove('error');
    const errorEl = input.parentElement.querySelector('.error-message');
    if (errorEl) {
        errorEl.classList.remove('show');
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// DATE FORMATTING
// ============================================

function formatDate(isoString) {
    if (!isoString) return '-';
    // Normalize: If no timezone info, assume it's UTC and append Z
    let normalizedStr = isoString;
    if (typeof isoString === 'string' && !isoString.endsWith('Z') && !isoString.includes('+')) {
        normalizedStr = isoString + 'Z';
    }
    const date = new Date(normalizedStr);
    if (isNaN(date.getTime())) return '-';
    // Shift to Thai time (UTC+7)
    const thDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    const d = thDate.getUTCDate();
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const m = months[thDate.getUTCMonth()];
    let y = thDate.getUTCFullYear();
    // Check if year is already in BE format (> 2100 means it's already BE)
    if (y > 2100) {
        // Year is already in BE, don't add 543
        // Do nothing, use y as is
    } else {
        // Year is in AD, convert to BE
        y = y + 543;
    }
    return `${d} ${m} ${y}`;
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    // Normalize: If no timezone info, assume it's UTC and append Z
    let normalizedStr = isoString;
    if (typeof isoString === 'string' && !isoString.endsWith('Z') && !isoString.includes('+')) {
        normalizedStr = isoString + 'Z';
    }
    const date = new Date(normalizedStr);
    if (isNaN(date.getTime())) return '-';
    // Shift to Thai time (UTC+7)
    const thDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    const d = String(thDate.getUTCDate()).padStart(2, '0');
    const m = String(thDate.getUTCMonth() + 1).padStart(2, '0');
    let y = thDate.getUTCFullYear();
    // Check if year is already in BE format (> 2100 means it's already BE)
    if (y > 2100) {
        // Year is already in BE, don't add 543
        // Do nothing, use y as is
    } else {
        // Year is in AD, convert to BE
        y = y + 543;
    }
    const hh = String(thDate.getUTCHours()).padStart(2, '0');
    const mm = String(thDate.getUTCMinutes()).padStart(2, '0');
    const ss = String(thDate.getUTCSeconds()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}

function getTodayDate() {
    const date = new Date();
    const thDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    const y = thDate.getUTCFullYear();
    const m = String(thDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(thDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ============================================
// STATUS HELPERS
// ============================================

function getStatusBadge(status) {
    const statuses = {
        'pending_head': { label: 'รอผู้จัดการแผนก', class: 'badge-warning' },
        'pending_manager': { label: 'รอผู้บริหาร', class: 'badge-info' },
        'processed': { label: 'อนุมัติแล้ว', class: 'badge-success' },
        'rejected': { label: 'ไม่อนุมัติ', class: 'badge-danger' },
        'cancelled': { label: 'ยกเลิก', class: 'badge-secondary' }
    };

    const s = statuses[status] || { label: status, class: 'badge-secondary' };
    return `<span class="badge ${s.class}">${s.label}</span>`;
}

function getActionLabel(action) {
    const actions = {
        'CREATE_PR': 'สร้าง PR',
        'UPDATE_PR': 'แก้ไข PR',
        'APPROVE_PR_HEAD': 'ผจก.อนุมัติ PR',
        'APPROVE_PR_MANAGER': 'ผู้บริหารอนุมัติ PR',
        'REJECT_PR': 'ตีกลับ PR',
        'CANCEL_PR': 'ยกเลิก PR',
        'CREATE_MEMO': 'สร้าง Memo',
        'UPDATE_MEMO': 'แก้ไข Memo',
        'APPROVE_MEMO_HEAD': 'ผจก.อนุมัติ Memo',
        'APPROVE_MEMO_MANAGER': 'ผู้บริหารอนุมัติ Memo',
        'REJECT_MEMO': 'ตีกลับ Memo'
    };
    return actions[action] || action;
}

// ============================================
// DOWNLOAD HELPER
// ============================================

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================
// DEPARTMENT DROPDOWN
// ============================================

async function populateDepartmentSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const departments = await DB.getDepartments();

        select.innerHTML = '<option value="" disabled selected>-- กรุณาเลือก --</option>';

        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.name;
            option.textContent = dept.name;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to load departments:', err);
    }
}

// ============================================
// SESSION STORAGE HELPERS
// ============================================

function setSession(key, value) {
    sessionStorage.setItem(key, value);
}

function getSession(key) {
    return sessionStorage.getItem(key);
}

function clearSession() {
    sessionStorage.clear();
}

function isLoggedIn() {
    return getSession('isAdmin') === 'true';
}

function getUserRole() {
    return getSession('userRole') || '';
}

function getUserDept() {
    return getSession('userDept') || '';
}

// ============================================
// EMAIL SENDING (EmailJS Multi-Account)
// ============================================

let emailjsInitialized = {};
let lastUsedAccountName = null;

function initEmailJSAccount(publicKey) {
    if (!emailjsInitialized[publicKey] && typeof emailjs !== 'undefined') {
        emailjs.init(publicKey);
        emailjsInitialized[publicKey] = true;
    }
}

// Legacy init for backward compatibility
function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(CONFIG.emailjs.publicKey);
    }
}

// เลือก Account ที่เหมาะสมที่สุด (ใช้น้อยสุด + ยังไม่เต็ม quota)
async function selectBestEmailAccount() {
    try {
        const accounts = await DB.getActiveEmailJSAccounts();

        if (accounts.length === 0) {
            // ถ้าไม่มีใน DB ใช้ config เดิม
            console.log('No EmailJS accounts in DB, using config default');
            return {
                id: null,
                name: 'Default (Config)',
                public_key: CONFIG.emailjs.publicKey,
                service_id: CONFIG.emailjs.serviceId,
                template_id: CONFIG.emailjs.templateId,
                usage_count: 0,
                quota_limit: 200
            };
        }

        // เลือก account ที่ยังไม่เต็ม quota และใช้น้อยสุด
        for (const account of accounts) {
            const quota = account.quota_limit || 200;
            if (account.usage_count < quota) {
                return account;
            }
        }

        // ถ้าเต็มทั้งหมด ใช้ตัวแรก (จะ error แต่อย่างน้อยพยายามส่ง)
        console.warn('All EmailJS accounts are at quota limit!');
        return accounts[0];

    } catch (err) {
        console.error('Error selecting EmailJS account:', err);
        // Fallback to config
        return {
            id: null,
            name: 'Default (Config)',
            public_key: CONFIG.emailjs.publicKey,
            service_id: CONFIG.emailjs.serviceId,
            template_id: CONFIG.emailjs.templateId
        };
    }
}

async function sendEmail(toEmail, subject, htmlContent) {
    if (typeof emailjs === 'undefined') {
        console.warn('EmailJS not loaded');
        return false;
    }

    try {
        // เลือก account ที่เหมาะสม
        const account = await selectBestEmailAccount();
        lastUsedAccountName = account.name;

        console.log(`📧 Sending email via: ${account.name} (${account.usage_count || 0}/${account.quota_limit || 200})`);

        // Init EmailJS with selected account's public key
        initEmailJSAccount(account.public_key);

        // Send email
        await emailjs.send(account.service_id, account.template_id, {
            to_email: toEmail,
            subject: subject,
            html_content: htmlContent
        });

        // Increment usage counter
        if (account.id) {
            await DB.incrementEmailUsage(account.id);
        }

        console.log(`✅ Email sent successfully via: ${account.name}`);
        return true;

    } catch (err) {
        console.error('Email failed:', err);

        // ถ้า error ลอง fallback ไปใช้ account อื่น
        const errorMessage = err.text || err.message || '';
        if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
            console.log('Quota exceeded, trying next account...');
            return await sendEmailFallback(toEmail, subject, htmlContent);
        }

        return false;
    }
}

// Fallback: ลองส่งด้วย account อื่นถ้า account แรก error
async function sendEmailFallback(toEmail, subject, htmlContent) {
    try {
        const accounts = await DB.getActiveEmailJSAccounts();

        for (const account of accounts) {
            // Skip account ที่เพิ่งใช้
            if (account.name === lastUsedAccountName) continue;

            try {
                console.log(`🔄 Fallback: Trying ${account.name}...`);

                initEmailJSAccount(account.public_key);

                await emailjs.send(account.service_id, account.template_id, {
                    to_email: toEmail,
                    subject: subject,
                    html_content: htmlContent
                });

                if (account.id) {
                    await DB.incrementEmailUsage(account.id);
                }

                console.log(`✅ Fallback successful via: ${account.name}`);
                return true;

            } catch (e) {
                console.warn(`❌ Fallback failed for ${account.name}:`, e);
                continue;
            }
        }

        return false;

    } catch (err) {
        console.error('Fallback failed:', err);
        return false;
    }
}

// Get last used account name (for display)
function getLastUsedAccountName() {
    return lastUsedAccountName;
}

async function notifyHeadForPR(department, prNumber, requester) {
    try {
        const departments = await DB.getDepartments();
        const dept = departments.find(d => d.name === department);

        if (dept && dept.head_email) {
            const adminUrl = window.location.origin + '/admin.html';
            await sendEmail(
                dept.head_email,
                `[New PR] แผนก${department} ขอตรวจสอบ PR: ${prNumber}`,
                `<h3>เรียน ผู้จัดการแผนก (${department})</h3>
                <p>มีรายการขอซื้อใหม่จาก <b>${requester}</b></p>
                <p>เลขที่ PR: <b>${prNumber}</b></p>
                <br>
                <p><a href="${adminUrl}">👉 คลิกที่นี่เพื่อเข้าสู่ระบบอนุมัติ</a></p>`
            );
        }
    } catch (err) {
        console.warn('Notify head failed:', err);
    }
}

async function notifyManagerForPR(prNumber, department) {
    try {
        const managerEmail = await DB.getSetting('manager_email') || CONFIG.defaultEmails.manager;
        const link = window.location.origin + '/admin.html';

        await sendEmail(
            managerEmail,
            `[อนุมัติขั้นที่ 1] PR ${prNumber} ผ่านการตรวจสอบแล้ว`,
            `<h3>เรียน ผู้บริหารระดับสูง</h3>
            <p>PR เลขที่ ${prNumber} จากแผนก ${department} ผ่านการตรวจสอบจากผู้จัดการแผนกแล้ว</p>
            <p><a href="${link}">คลิกเพื่อเข้าสู่ระบบอนุมัติ</a></p>`
        );
    } catch (err) {
        console.warn('Notify manager failed:', err);
    }
}

async function notifyPurchasingForApproval(prNumber, prId) {
    try {
        const purchaseEmail = await DB.getSetting('purchasing_email') || CONFIG.defaultEmails.purchasing;
        const linkApproved = window.location.origin + `/view-pr.html?id=${prId}&mode=approved`;
        const linkOriginal = window.location.origin + `/view-pr.html?id=${prId}&mode=original`;

        await sendEmail(
            purchaseEmail,
            `[Approved] คำสั่งซื้อ PR ${prNumber} อนุมัติแล้ว`,
            `<h3>เรียน ฝ่ายจัดซื้อ</h3>
            <p>PR เลขที่ <b>${prNumber}</b> อนุมัติเรียบร้อยแล้ว</p>
            <hr>
            <p>1. <a href="${linkApproved}">📂 ไฟล์ PR (รายการที่อนุมัติ)</a></p>
            <p>2. <a href="${linkOriginal}">📄 ไฟล์ Log ต้นฉบับ</a></p>`
        );
    } catch (err) {
        console.warn('Notify purchasing failed:', err);
    }
}

async function notifyHeadForApproval(department, prNumber, prId) {
    try {
        const departments = await DB.getDepartments();
        const dept = departments.find(d => d.name === department);

        if (dept && dept.head_email) {
            const linkApproved = window.location.origin + `/view-pr.html?id=${prId}&mode=approved`;
            const linkOriginal = window.location.origin + `/view-pr.html?id=${prId}&mode=original`;

            await sendEmail(
                dept.head_email,
                `[Approved] PR ${prNumber} อนุมัติเรียบร้อยแล้ว`,
                `<h3>เรียน ผู้จัดการแผนก (${department})</h3>
                <p>PR เลขที่ <b>${prNumber}</b> ได้รับการอนุมัติจากผู้บริหารเรียบร้อยแล้ว ✅</p>
                <hr>
                <p>📂 <a href="${linkApproved}">ดูรายการที่อนุมัติ</a></p>
                <p>📄 <a href="${linkOriginal}">ดูเอกสารต้นฉบับ</a></p>
                <br>
                <p style="color: #666;">ขอบคุณที่ใช้บริการระบบ PR System</p>`
            );
        }
    } catch (err) {
        console.warn('Notify head for approval failed:', err);
    }
}

async function notifyHeadForMemo(department, memoNo, subject) {
    try {
        const departments = await DB.getDepartments();
        const dept = departments.find(d => d.name === department);

        if (dept && dept.head_email) {
            const adminUrl = window.location.origin + '/admin.html';
            await sendEmail(
                dept.head_email,
                `[New Memo] แผนก${department} ขอตรวจสอบ Memo: ${memoNo}`,
                `<h3>เรียน ผู้จัดการแผนก (${department})</h3>
                <p>มีบันทึกข้อความใหม่</p>
                <p><b>เรื่อง:</b> ${subject}</p>
                <p><b>เลขที่:</b> ${memoNo}</p>
                <br>
                <p><a href="${adminUrl}">👉 คลิกที่นี่เพื่อเข้าสู่ระบบอนุมัติ</a></p>`
            );
        }
    } catch (err) {
        console.warn('Notify head for memo failed:', err);
    }
}

async function notifyManagerForMemo(memoNo, department, subject) {
    try {
        const managerEmail = await DB.getSetting('manager_email') || CONFIG.defaultEmails.manager;
        const link = window.location.origin + '/admin.html';

        await sendEmail(
            managerEmail,
            `[อนุมัติขั้นที่ 1] Memo ${memoNo} ผ่านการตรวจสอบแล้ว`,
            `<h3>เรียน ผู้บริหารระดับสูง</h3>
            <p>Memo เลขที่ <b>${memoNo}</b> จากแผนก ${department}</p>
            <p><b>เรื่อง:</b> ${subject}</p>
            <p>ผ่านการตรวจสอบจากผู้จัดการแผนกแล้ว</p>
            <br>
            <p><a href="${link}">👉 คลิกเพื่อเข้าสู่ระบบอนุมัติ</a></p>`
        );
    } catch (err) {
        console.warn('Notify manager for memo failed:', err);
    }
}

async function notifyOwnerForMemoApproval(department, memoNo, memoId, subject) {
    try {
        const departments = await DB.getDepartments();
        const dept = departments.find(d => d.name === department);

        if (dept && dept.head_email) {
            const linkView = window.location.origin + `/view-memo.html?id=${memoId}`;

            await sendEmail(
                dept.head_email,
                `[Approved] Memo ${memoNo} อนุมัติเรียบร้อยแล้ว`,
                `<h3>เรียน ผู้จัดการแผนก (${department})</h3>
                <p>Memo เลขที่ <b>${memoNo}</b></p>
                <p><b>เรื่อง:</b> ${subject}</p>
                <p>ได้รับการอนุมัติจากผู้บริหารเรียบร้อยแล้ว ✅</p>
                <hr>
                <p>📄 <a href="${linkView}">ดูเอกสาร</a></p>`
            );
        }
    } catch (err) {
        console.warn('Notify owner for memo failed:', err);
    }
}

async function notifyManagerForPR(prNumber, department, requester) {
    try {
        const managerEmail = await DB.getSetting('manager_email') || CONFIG.defaultEmails.manager;
        const adminUrl = window.location.origin + '/admin.html';

        await sendEmail(
            managerEmail,
            `[New PR] แผนก${department} ขออนุมัติ (Fast Track): ${prNumber}`,
            `<h3>เรียน ผู้บริหารระดับสูง</h3>
            <p>มีรายการขอซื้อ (Fast Track) จากแผนก <b>${department}</b></p>
            <p>ผู้ขอซื้อ: ${requester}</p>
            <p>เลขที่ PR: <b>${prNumber}</b></p>
            <br>
            <p><a href="${adminUrl}">👉 คลิกที่นี่เพื่อเข้าสู่ระบบอนุมัติ</a></p>`
        );
    } catch (err) {
        console.warn('Notify manager for PR failed:', err);
    }
}

async function notifyHeadForPRReturn(prNumber, department) {
    try {
        const departments = await DB.getDepartments();
        const dept = departments.find(d => d.name === department);

        if (dept && dept.head_email) {
            const adminUrl = window.location.origin + '/admin.html';
            await sendEmail(
                dept.head_email,
                `🔄 PR ${prNumber} ถูกส่งกลับจากผู้บริหาร`,
                `<h3>เรียน ผู้จัดการแผนก (${department})</h3>
                <p>PR เลขที่ <b>${prNumber}</b> ถูกผู้บริหารส่งกลับ</p>
                <p><b>เหตุผล:</b> ผู้บริหารไม่อนุมัติรายการที่เหลือทั้งหมด</p>
                <p>กรุณาเข้าสู่ระบบเพื่อตรวจสอบและพิจารณาใหม่</p>
                <br>
                <p><a href="${adminUrl}">👉 คลิกที่นี่เพื่อเข้าสู่ระบบ</a></p>`
            );
        }
    } catch (err) {
        console.warn('Notify head for PR return failed:', err);
    }
}

// ============================================
// PETTY CASH EMAIL NOTIFICATIONS
// ============================================

async function notifyHeadForPettyCash(department, requestNo, requester, amount) {
    try {
        const departments = await DB.getDepartments();
        const dept = departments.find(d => d.name === department);

        if (dept && dept.head_email) {
            const adminUrl = window.location.origin + '/admin.html';
            await sendEmail(
                dept.head_email,
                `[เบิกเงินสดย่อย] แผนก${department} ขอเบิกเงิน: ${requestNo}`,
                `<h3>เรียน ผู้จัดการแผนก (${department})</h3>
                <p>มีรายการขอเบิกเงินสดย่อยใหม่</p>
                <p><b>เลขที่:</b> ${requestNo}</p>
                <p><b>ผู้ขอเบิก:</b> ${requester}</p>
                <p><b>จำนวนเงิน:</b> ${Number(amount).toLocaleString()} บาท</p>
                <br>
                <p><a href="${adminUrl}">👉 คลิกที่นี่เพื่อเข้าสู่ระบบตรวจสอบ</a></p>`
            );
        }
    } catch (err) {
        console.warn('Notify head for petty cash failed:', err);
    }
}

async function notifyManagerForPettyCash(requestNo, department, amount) {
    try {
        const managerEmail = await DB.getSetting('manager_email') || CONFIG.defaultEmails.manager;
        const adminUrl = window.location.origin + '/admin.html';

        await sendEmail(
            managerEmail,
            `[เบิกเงินสดย่อย] ${requestNo} รอการอนุมัติ`,
            `<h3>เรียน ผู้บริหารระดับสูง</h3>
            <p>รายการเบิกเงินสดย่อย <b>${requestNo}</b> จากแผนก ${department}</p>
            <p>ผ่านการตรวจสอบจากผู้จัดการแผนกแล้ว</p>
            <p><b>จำนวนเงิน:</b> ${Number(amount).toLocaleString()} บาท</p>
            <br>
            <p><a href="${adminUrl}">👉 คลิกเพื่อเข้าสู่ระบบอนุมัติ</a></p>`
        );
    } catch (err) {
        console.warn('Notify manager for petty cash failed:', err);
    }
}

async function notifyRequesterForPettyCashApproval(department, requestNo, requestId, amount) {
    try {
        const departments = await DB.getDepartments();
        const dept = departments.find(d => d.name === department);

        if (dept && dept.head_email) {
            const viewUrl = window.location.origin + `/view-petty-cash.html?id=${requestId}`;

            await sendEmail(
                dept.head_email,
                `[อนุมัติแล้ว] เบิกเงินสดย่อย ${requestNo}`,
                `<h3>เรียน ผู้จัดการแผนก (${department})</h3>
                <p>รายการเบิกเงินสดย่อย <b>${requestNo}</b></p>
                <p><b>จำนวนเงิน:</b> ${Number(amount).toLocaleString()} บาท</p>
                <p>ได้รับการอนุมัติจากผู้บริหารเรียบร้อยแล้ว ✅</p>
                <hr>
                <p>📄 <a href="${viewUrl}">คลิกเพื่อดูเอกสารและพิมพ์ไปเบิกเงินที่ฝ่ายบัญชี</a></p>`
            );
        }
    } catch (err) {
        console.warn('Notify requester for petty cash approval failed:', err);
    }
}

async function notifyAccountingForPettyCashApproval(requestNo, department, amount, requestId) {
    try {
        const accountingEmail = await DB.getSetting('accounting_email');
        if (!accountingEmail) {
            console.warn('No accounting email configured');
            return;
        }

        const viewUrl = window.location.origin + `/view-petty-cash.html?id=${requestId}`;

        await sendEmail(
            accountingEmail,
            `[อนุมัติแล้ว] เบิกเงินสดย่อย ${requestNo} (${department})`,
            `<h3>เรียน ฝ่ายบัญชี</h3>
            <p>รายการเบิกเงินสดย่อย <b>${requestNo}</b> ของแผนก ${department}</p>
            <p><b>จำนวนเงิน:</b> ${Number(amount).toLocaleString()} บาท</p>
            <p>ได้รับการอนุมัติเรียบร้อยแล้ว เตรียมจ่ายเงินได้</p>
            <hr>
            <p>📄 <a href="${viewUrl}">คลิกเพื่อดูเอกสาร</a></p>`
        );
    } catch (err) {
        console.warn('Notify accounting failed:', err);
    }
}

// Make UI functions globally available
window.UI = {
    showToast,
    showLoading,
    hideLoading,
    showModal,
    hideModal,
    hideAllModals,
    validateForm,
    showError,
    clearError,
    formatDate,
    formatDateTime,
    getTodayDate,
    getStatusBadge,
    getActionLabel,
    downloadCSV,
    populateDepartmentSelect,
    setSession,
    getSession,
    clearSession,
    isLoggedIn,
    getUserRole,
    getUserDept,
    initEmailJS,
    sendEmail,
    notifyHeadForPR,
    notifyManagerForPR,
    notifyHeadForPRReturn,
    notifyPurchasingForApproval,
    notifyHeadForApproval,
    notifyHeadForMemo,
    notifyManagerForMemo,
    notifyOwnerForMemoApproval,
    // Petty Cash
    notifyHeadForPettyCash,
    notifyManagerForPettyCash,
    notifyRequesterForPettyCashApproval,
    notifyAccountingForPettyCashApproval
};
