// ==========================================
// إعدادات المشروع
// ==========================================

const CONFIG = {
    // Google Drive API - استبدل هذه القيم
    GOOGLE: {
        CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
        API_KEY: 'YOUR_API_KEY',
        FOLDER_ID: 'YOUR_FOLDER_ID',
        SCOPES: 'https://www.googleapis.com/auth/drive.readonly'
    },
    
    // Firebase - استبدل هذه القيم
    FIREBASE: {
        apiKey: "YOUR_FIREBASE_API_KEY",
        authDomain: "your-project.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abcdef"
    },
    
    // إعدادات العرض
    DISPLAY: {
        PRODUCTS_PER_PAGE: 24,
        THUMBNAIL_SIZE: 200
    },
    
    // حالات المنتجات
    STATUSES: {
        'pending': { label: 'قيد الانتظار', color: '#f59e0b', icon: '⏳' },
        'in-progress': { label: 'جاري العمل', color: '#3b82f6', icon: '🔄' },
        'review': { label: 'مراجعة', color: '#8b5cf6', icon: '👁' },
        'completed': { label: 'مكتمل', color: '#22c55e', icon: '✅' },
        'rejected': { label: 'مرفوض', color: '#ef4444', icon: '❌' }
    }
};

Object.freeze(CONFIG);
