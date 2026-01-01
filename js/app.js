class App {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.categories = [];
        this.driveService = new DriveService();
        this.categoryColors = [
            { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '#667eea' },
            { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: '#f093fb' },
            { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', border: '#4facfe' },
            { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', border: '#43e97b' },
            { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', border: '#fa709a' },
            { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', border: '#a8edea' },
            { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', border: '#ff9a9e' },
            { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', border: '#ffecd2' }
        ];
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
    }

    setupEventListeners() {
        document.getElementById('searchInput')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => this.applyFilters());
        document.getElementById('orientationFilter')?.addEventListener('change', (e) => this.applyFilters());
    }

    async loadData() {
        try {
            const data = await this.driveService.getAllProductsWithStats();
            this.categories = data.categories;
            this.products = this.groupProducts(data.products);
            this.filteredProducts = [...this.products];
            this.updateStats();
            this.renderCategories();
            this.populateFilters();
            this.renderProducts();
        } catch (error) {
            console.error('Load error:', error);
        }
    }

    groupProducts(products) {
        const grouped = {};
        products.forEach(p => {
            if (!grouped[p.code]) {
                grouped[p.code] = {
                    code: p.code,
                    category: p.category,
                    orientation: p.orientation,
                    images: []
                };
            }
            grouped[p.code].images.push({
                id: p.id,
                url: p.thumbnail,
                fullUrl: p.webViewLink,
                num: p.imageNumber
            });
        });
        
        return Object.values(grouped).map(p => {
            p.images.sort((a, b) => a.num - b.num);
            p.thumbnail = p.images[0]?.url;
            return p;
        });
    }

    updateStats() {
        const total = this.products.length;
        const vCount = this.products.filter(p => p.orientation === 'V').length;
        const hCount = this.products.filter(p => p.orientation === 'H').length;
        const sCount = this.products.filter(p => p.orientation === 'S').length;
        
        document.getElementById('totalProducts').textContent = total;
        document.getElementById('totalCategories').textContent = this.categories.length;
        document.getElementById('verticalCount').textContent = vCount;
        document.getElementById('horizontalCount').textContent = hCount;
        
        // إضافة عداد المربعة إن وجد
        const squareEl = document.getElementById('squareCount');
        if (squareEl) squareEl.textContent = sCount;
    }

    renderCategories() {
        const grid = document.getElementById('categoriesGrid');
        if (!grid) return;
        
        grid.innerHTML = this.categories.map((cat, i) => {
            const color = this.categoryColors[i % this.categoryColors.length];
            const total = (cat.vCount || 0) + (cat.hCount || 0) + (cat.sCount || 0);
            return `
                <div class="category-card" onclick="app.filterByCategory('${cat.name}')" 
                     style="background: ${color.bg}; border-color: ${color.border}">
                    <h3>${cat.name}</h3>
                    <div class="category-stats">
                        <span>V: ${cat.vCount || 0}</span>
                        <span>H: ${cat.hCount || 0}</span>
                        <span>S: ${cat.sCount || 0}</span>
                    </div>
                    <div class="category-total">${total} لوحة</div>
                </div>
            `;
        }).join('');
    }

    populateFilters() {
        const catFilter = document.getElementById('categoryFilter');
        if (catFilter) {
            catFilter.innerHTML = '<option value="">جميع الفئات</option>' +
                this.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }
    }

    showAll() {
        this.filteredProducts = [...this.products];
        document.getElementById('categoryFilter').value = '';
        document.getElementById('orientationFilter').value = '';
        this.renderProducts();
    }

    filterByOrientation(orientation) {
        this.filteredProducts = this.products.filter(p => p.orientation === orientation);
        document.getElementById('orientationFilter').value = orientation;
        this.renderProducts();
        document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' });
    }

    filterByCategory(category) {
        this.filteredProducts = this.products.filter(p => p.category === category);
        document.getElementById('categoryFilter').value = category;
        this.renderProducts();
        document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' });
    }

    applyFilters() {
        const category = document.getElementById('categoryFilter')?.value;
        const orientation = document.getElementById('orientationFilter')?.value;
        
        this.filteredProducts = this.products.filter(p => {
            const catMatch = !category || p.category === category;
            const oriMatch = !orientation || p.orientation === orientation;
            return catMatch && oriMatch;
        });
        
        this.renderProducts();
    }

    handleSearch(query) {
        query = query.trim().toUpperCase();
        if (!query) {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(p => 
                p.code.toUpperCase().includes(query)
            );
        }
        this.renderProducts();
    }

    renderProducts() {
        const grid = document.getElementById('productsGrid');
        const countEl = document.getElementById('productsCount');
        if (!grid) return;
        
        if (countEl) countEl.textContent = this.filteredProducts.length;
        
        grid.innerHTML = this.filteredProducts.map(p => `
            <div class="product-card" onclick="app.viewProduct('${p.code}')">
                <div class="product-image">
                    <img src="${p.thumbnail}" alt="${p.code}" 
                         onerror="this.src='assets/placeholder.svg'">
                    ${p.images.length > 1 ? `<span class="image-count">${p.images.length}</span>` : ''}
                    <span class="orientation-badge ${p.orientation}">${p.orientation}</span>
                </div>
                <div class="product-info">
                    <span class="product-code">${p.code}</span>
                </div>
            </div>
        `).join('');
    }

    viewProduct(code) {
        const product = this.products.find(p => p.code === code);
        if (!product) return;
        
        const modal = document.getElementById('productModal');
        const content = document.getElementById('productModalContent');
        
        content.innerHTML = `
            <span class="close-modal" onclick="app.closeModals()">&times;</span>
            <div class="product-detail">
                <div class="main-image">
                    <img src="${product.images[0]?.url?.replace('s400', 's800') || product.thumbnail}" 
                         alt="${product.code}" id="mainProductImage">
                </div>
                <div class="product-info-panel">
                    <h2>${product.code}</h2>
                    <p><strong>الفئة:</strong> ${product.category}</p>
                    <p><strong>الاتجاه:</strong> ${product.orientation === 'V' ? 'عمودي' : product.orientation === 'H' ? 'أفقي' : 'مربع'}</p>
                    <p><strong>عدد الصور:</strong> ${product.images.length}</p>
                    
                    <div class="thumbnails-row">
                        ${product.images.map((img, i) => `
                            <img src="${img.url}" alt="صورة ${i+1}" 
                                 onclick="app.changeImage('${img.url?.replace('s400', 's800')}')"
                                 class="thumb ${i === 0 ? 'active' : ''}">
                        `).join('')}
                    </div>
                    
                    <a href="${product.images[0]?.fullUrl}" target="_blank" class="drive-btn">
                        فتح في Drive
                    </a>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    changeImage(url) {
        const mainImg = document.getElementById('mainProductImage');
        if (mainImg) mainImg.src = url;
        
        document.querySelectorAll('.thumbnails-row .thumb').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
    }

    closeModals() {
        document.getElementById('productModal').style.display = 'none';
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
