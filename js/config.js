// ============================================
// PR SYSTEM v2 - CONFIGURATION
// ============================================

const CONFIG = {
    // Supabase
    supabaseUrl: 'https://ullrtepvkwqdstebikbk.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsbHJ0ZXB2a3dxZHN0ZWJpa2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjM1OTYsImV4cCI6MjA4NDQzOTU5Nn0.3a_ftdM_ieXFHB8t46VKoEB-9NzBCuoKurRH6wSaqcE',

    // EmailJS
    emailjs: {
        publicKey: 'rEly1Il6Xz0qZwaSc',
        serviceId: 'service_tolm3pu',
        templateId: 'template_master'
    },

    // Default Emails
    defaultEmails: {
        manager: 'bestworld.bwp328@gmail.com',
        purchasing: 'hr.bpp.2564@gmail.com'
    },

    // Company Info
    company: {
        name: 'บริษัท เบสท์เวิลด์ อินเตอร์พลาส จำกัด',
        address: '328 ม.6 ต.คลองนิยมยาตรา อ.บางบ่อ จ.สมุทรปราการ 10560'
    }
};

// Make CONFIG globally available
window.CONFIG = CONFIG;
