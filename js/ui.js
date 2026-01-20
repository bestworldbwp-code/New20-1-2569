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
    const d = new Date(isoString);
    return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
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
// EMAIL SENDING (EmailJS)
// ============================================

let emailjsInitialized = false;

function initEmailJS() {
    if (!emailjsInitialized && typeof emailjs !== 'undefined') {
        emailjs.init(CONFIG.emailjs.publicKey);
        emailjsInitialized = true;
    }
}

async function sendEmail(toEmail, subject, htmlContent) {
    if (typeof emailjs === 'undefined') {
        console.warn('EmailJS not loaded');
        return false;
    }

    initEmailJS();

    try {
        await emailjs.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateId, {
            to_email: toEmail,
            subject: subject,
            html_content: htmlContent
        });
        return true;
    } catch (err) {
        console.error('Email failed:', err);
        return false;
    }
}

async function notifyHeadForPR(department, prNumber, requester) {
    try {
        const departments = await DB.getDepartments();
        const dept = departments.find(d => d.name === department);

        if (dept && dept.head_email) {
            const adminUrl = 'https://bwppr.vercel.app/admin.html';
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
    notifyPurchasingForApproval
};
