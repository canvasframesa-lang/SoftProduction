// ==========================================
// التطبيق الرئيسي
// ==========================================

class App {
    constructor() {
        this.products = [];
        this.groups = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.nextPageToken = null;
        this.filters = { status: 'all', group: 'all', search: '' };
    }

    async init() {
        this.setupEventListeners();
        this.loadTheme();
        
        try {
            await driveService.init();
            firebaseService.init();
            console.log('Services initialized');
        } catch (error) {
            console.error('Init error:', error);
        }
    }

    setupEventListeners() {
        // تسجيل الدخول
        document.getElementById('authBtn').addEventListener('click', () => this.handleAuth());
        
        // تبديل الثيم
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // البحث
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        
        // الفلاتر
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('groupFilter').addEventListener('change', (e) => {
            this.filters.group = e.target.value;
            this.applyFilters();
        });
        
        // التنقل
        document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
        
        // Modal التعليقات
        document.getElementById('closeModal').addEventListener('click', () => commentsManager.close());
        document.getElementById('commentForm').addEventListener('submit', (e) => commentsManager.submit(e));
        
        // Modal المنتج
        document.getElementById('closeProductModal').addEventListener('click', () => {
            document.getElementById('productModal').classList.remove('active');
        });
        
        // حالة تسجيل الدخول
        document.addEventListener('authStateChanged', (e) => this.onAuthStateChanged(e.detail.isSignedIn));
    }

    async handleAuth() {
        if (driveService.isSignedIn) {
            driveService.signOut();
        } else {
            await driveService.signIn();
        }
    }

    onAuthStateChanged(isSignedIn) {
        const btn = document.getElementById('authBtn');
        btn.textContent = isSignedIn ? 'تسجيل خروج' : 'تسجيل دخول';
        
        if (isSignedIn) {
            this.loadData();
        } else {
            this.clearData();
        }
    }

    async loadData() {
        this.showLoading();
        
        try {
            // تحميل المجموعات
            this.groups = await driveService.getGroups();
            this.populateGroupFilter();
            
            // تحميل المنتجات
            const result = await driveService.getProducts();
            this.products = result.products;
            this.nextPageToken = result.nextPageToken;
            
            this.applyFilters();
            this.updateStats();
            
        } catch (error) {
            console.error('Load error:', error);
            this.showError('حدث خطأ في تحميل البيانات');
        }
    }

    populateGroupFilter() {
        const select = document.getElementById('groupFilter');
        select.innerHTML = '<option value="all">جميع المجموعات</option>';
        
        this.groups.forEach(group => {
            select.innerHTML += `<option value="${group.id}">${group.name}</option>`;
        });
    }

    applyFilters() {
        let filtered = [...this.products];
        
        // فلتر الحالة
        if (this.filters.status !== 'all') {
            filtered = filtered.filter(p => {
                const match = p.name.match(/^\[(\w+(?:-\w+)?)\]/);
                const status = match ? match[1] : 'pending';
                return status === this.filters.status;
            });
        }
        
        // فلتر البحث
        if (this.filters.search) {
            const query = this.filters.search.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
        }
        
        this.filteredProducts = filtered;
        this.renderProducts();
    }

    handleSearch() {
        this.filters.search = document.getElementById('searchInput').value.trim();
        this.applyFilters();
    }

    renderProducts() {
        const grid = document.getElementById('productsGrid');
        
        if (this.filteredProducts.length === 0) {
            grid.innerHTML = '<div class="loading-placeholder"><p>لا توجد منتجات</p></div>';
            return;
        }
        
        grid.innerHTML = this.filteredProducts.map(product => {
            const card = new ProductCard(product);
            return card.render();
        }).join('');
        
        // تحديث عدادات التعليقات
        this.updateCommentsCounts();
        
        // إظهار التنقل
        document.getElementById('paginationSection').style.display = 'flex';
        this.updatePagination();
    }

    async updateCommentsCounts() {
        for (const product of this.filteredProducts) {
            const count = await firebaseService.getCommentsCount(product.id);
            const el = document.getElementById(`count-${product.id}`);
            if (el) el.textContent = count;
        }
    }

    updateStats() {
        let completed = 0, inProgress = 0;
        
        this.products.forEach(p => {
            const match = p.name.match(/^\[(\w+(?:-\w+)?)\]/);
            const status = match ? match[1] : 'pending';
            if (status === 'completed') completed++;
            if (status === 'in-progress') inProgress++;
        });
        
        const total = this.products.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        document.getElementById('totalProducts').textContent = total;
        document.getElementById('completedProducts').textContent = completed;
        document.getElementById('inProgressProducts').textContent = inProgress;
        document.getElementById('completionRate').textContent = rate + '%';
        document.getElementById('progressFill').style.width = rate + '%';
    }

    updatePagination() {
        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = !this.nextPageToken;
        document.getElementById('pageInfo').textContent = `صفحة ${this.currentPage}`;
    }

    async nextPage() {
        if (!this.nextPageToken) return;
        
        this.showLoading();
        const result = await driveService.getProducts(null, this.nextPageToken);
        this.products = result.products;
        this.nextPageToken = result.nextPageToken;
        this.currentPage++;
        this.applyFilters();
    }

    prevPage() {
        // يحتاج تخزين الـ tokens السابقة - للتبسيط نعيد التحميل
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadData();
        }
    }

    openComments(productId) {
        commentsManager.open(productId);
    }

    async viewProduct(productId) {
        const modal = document.getElementById('productModal');
        const details = document.getElementById('productDetails');
        
        details.innerHTML = '<div class="loading-spinner"></div>';
        modal.classList.add('active');
        
        try {
            const product = await driveService.getProductDetails(productId);
            const thumbnailUrl = driveService.getThumbnailUrl(product);
            
            document.getElementById('productTitle').textContent = product.name;
            details.innerHTML = `
                <div style="text-align:center;">
                    <img src="${thumbnailUrl.replace(/=s\d+/, '=s600')}" 
                         style="max-width:100%; border-radius:8px;" 
                         alt="${product.name}">
                </div>
                <div style="margin-top:1rem;">
                    <p><strong>تاريخ الإنشاء:</strong> ${new Date(product.createdTime).toLocaleDateString('ar-EG')}</p>
                    <p><strong>آخر تعديل:</strong> ${new Date(product.modifiedTime).toLocaleDateString('ar-EG')}</p>
                    <p><strong>الحجم:</strong> ${product.size ? (product.size / 1024).toFixed(2) + ' KB' : 'غير محدد'}</p>
                    <a href="${product.webViewLink}" target="_blank" class="btn btn-primary" style="margin-top:1rem;">
                        فتح في Google Drive
                    </a>
                </div>
            `;
        } catch (error) {
            details.innerHTML = '<p>حدث خطأ في تحميل التفاصيل</p>';
        }
    }

    showLoading() {
        document.getElementById('productsGrid').innerHTML = `
            <div class="loading-placeholder">
                <div class="loading-spinner"></div>
                <p>جاري التحميل...</p>
            </div>
        `;
    }

    showError(message) {
        document.getElementById('productsGrid').innerHTML = `
            <div class="loading-placeholder">
                <p>❌ ${message}</p>
            </div>
        `;
    }

    clearData() {
        this.products = [];
        this.groups = [];
        document.getElementById('productsGrid').innerHTML = `
            <div class="loading-placeholder">
                <p>قم بتسجيل الدخول لعرض المنتجات</p>
            </div>
        `;
        document.getElementById('paginationSection').style.display = 'none';
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
    }

    loadTheme() {
        const saved = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        document.getElementById('themeToggle').textContent = saved === 'dark' ? '☀️' : '🌙';
    }
}

// تشغيل التطبيق
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
