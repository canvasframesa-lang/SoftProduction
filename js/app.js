class App {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.categories = [];
        this.driveService = new DriveService();
        this.currentImageIndex = 0;
        this.currentProduct = null;
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
    }

    setupEventListeners() {
        document.getElementById('searchInput')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('orientationFilter')?.addEventListener('change', () => this.applyFilters());
        
        document.addEventListener('keydown', (e) => {
            if (this.currentProduct) {
                if (e.key === 'ArrowLeft') this.nextImage();
                if (e.key === 'ArrowRight') this.prevImage();
                if (e.key === 'Escape') this.closeModals();
            }
        });
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
                grouped[p.code] = { code: p.code, category: p.category, orientation: p.orientation, images: [] };
            }
            grouped[p.code].images.push({ id: p.id, url: p.thumbnail, fullUrl: p.webViewLink, num: p.imageNumber });
        });
        return Object.values(grouped).map(p => {
            p.images.sort((a, b) => a.num - b.num);
            p.thumbnail = p.images[0]?.url;
            return p;
        });
    }

    updateStats() {
        const vCount = this.products.filter(p => p.orientation === 'V').length;
        const hCount = this.products.filter(p => p.orientation === 'H').length;
        const sCount = this.products.filter(p => p.orientation === 'S').length;
        document.getElementById('totalProducts').textContent = this.products.length;
        document.getElementById('totalCategories').textContent = this.categories.length;
        document.getElementById('verticalCount').textContent = vCount;
        document.getElementById('horizontalCount').textContent = hCount;
        const squareEl = document.getElementById('squareCount');
        if (squareEl) squareEl.textContent = sCount;
    }

    renderCategories() {
        const grid = document.getElementById('categoriesGrid');
        if (!grid) return;
        grid.innerHTML = this.categories.map((cat) => {
            const total = (cat.vCount || 0) + (cat.hCount || 0) + (cat.sCount || 0);
            return `<div class="category-card" onclick="app.filterByCategory('${cat.name}')">
                <h3>${cat.name}</h3>
                <div class="category-total">${total} لوحة</div>
            </div>`;
        }).join('');
    }

    populateFilters() {
        const catFilter = document.getElementById('categoryFilter');
        if (catFilter) {
            catFilter.innerHTML = '<option value="">جميع الفئات</option>' + this.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
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
        this.filteredProducts = query ? this.products.filter(p => p.code.toUpperCase().includes(query)) : [...this.products];
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
                    <img src="${p.thumbnail}" alt="${p.code}" onerror="this.src='assets/placeholder.svg'">
                    ${p.images.length > 1 ? `<span class="image-count">${p.images.length}</span>` : ''}
                    <span class="orientation-badge ${p.orientation}">${p.orientation}</span>
                </div>
                <div class="product-info"><span class="product-code">${p.code}</span></div>
            </div>
        `).join('');
    }

    viewProduct(code) {
        const product = this.products.find(p => p.code === code);
        if (!product) return;
        
        this.currentProduct = product;
        this.currentImageIndex = 0;
        
        const modal = document.getElementById('productModal');
        const content = document.getElementById('productModalContent');
        
        content.innerHTML = `
            <span class="close-modal" onclick="app.closeModals()">&times;</span>
            
            <div class="slider-container">
                <button class="slider-btn prev" onclick="app.prevImage()">‹</button>
                <div class="slider-main">
                    <img src="${product.images[0]?.url?.replace('s400', 's1200') || product.thumbnail}" 
                         alt="${product.code}" id="mainProductImage">
                </div>
                <button class="slider-btn next" onclick="app.nextImage()">›</button>
            </div>
            
            <div class="slider-counter">
                <span id="currentIndex">1</span> / <span>${product.images.length}</span>
            </div>
            
            <div class="slider-thumbs">
                ${product.images.map((img, i) => `
                    <img src="${img.url}" alt="صورة ${i+1}" 
                         onclick="app.goToImage(${i})"
                         class="thumb ${i === 0 ? 'active' : ''}">
                `).join('')}
            </div>
            
            <div class="product-meta">
                <h2>${product.code}</h2>
                <div class="meta-tags">
                    <span class="meta-tag">${product.category}</span>
                    <span class="meta-tag">${product.orientation === 'V' ? 'عمودي' : product.orientation === 'H' ? 'أفقي' : 'مربع'}</span>
                    <span class="meta-tag">${product.images.length} صور</span>
                </div>
                <button class="note-btn" onclick="app.openNoteForm('${product.code}', '${product.category}')">📝 إضافة ملاحظة</button>
            </div>
            
            <div class="note-form" id="noteForm" style="display:none;">
                <textarea id="noteText" placeholder="اكتب ملاحظتك هنا..." rows="3"></textarea>
                <div class="note-actions">
                    <button onclick="app.sendNote('${product.code}', '${product.category}')">إرسال</button>
                    <button onclick="app.closeNoteForm()" class="cancel-btn">إلغاء</button>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    prevImage() {
        if (!this.currentProduct) return;
        this.currentImageIndex = (this.currentImageIndex - 1 + this.currentProduct.images.length) % this.currentProduct.images.length;
        this.updateSlider();
    }

    nextImage() {
        if (!this.currentProduct) return;
        this.currentImageIndex = (this.currentImageIndex + 1) % this.currentProduct.images.length;
        this.updateSlider();
    }

    goToImage(index) {
        this.currentImageIndex = index;
        this.updateSlider();
    }

    updateSlider() {
        const img = this.currentProduct.images[this.currentImageIndex];
        document.getElementById('mainProductImage').src = img.url?.replace('s400', 's1200') || img.url;
        document.getElementById('currentIndex').textContent = this.currentImageIndex + 1;
        
        document.querySelectorAll('.slider-thumbs .thumb').forEach((t, i) => {
            t.classList.toggle('active', i === this.currentImageIndex);
        });
    }

    printReport() {
        const vCount = this.products.filter(p => p.orientation === 'V').length;
        const hCount = this.products.filter(p => p.orientation === 'H').length;
        const sCount = this.products.filter(p => p.orientation === 'S').length;
        const totalImages = this.products.reduce((sum, p) => sum + p.images.length, 0);
        
        const reportHTML = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>تقرير كانفس فريم</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 40px; background: #fff; color: #333; }
                    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #d4af37; padding-bottom: 20px; }
                    .header h1 { color: #d4af37; font-size: 2.5rem; margin-bottom: 10px; }
                    .header p { color: #666; }
                    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
                    .stat-box { background: #f9f9f9; border: 2px solid #d4af37; border-radius: 10px; padding: 25px; text-align: center; }
                    .stat-box .number { font-size: 2.5rem; color: #d4af37; font-weight: bold; }
                    .stat-box .label { color: #666; margin-top: 5px; }
                    .section { margin-bottom: 30px; }
                    .section h2 { color: #d4af37; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
                    .category-table { width: 100%; border-collapse: collapse; }
                    .category-table th, .category-table td { padding: 12px 15px; text-align: right; border-bottom: 1px solid #eee; }
                    .category-table th { background: #f5f5f5; color: #333; font-weight: 600; }
                    .category-table tr:hover { background: #fafafa; }
                    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 تقرير كانفس فريم</h1>
                    <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="number">${this.products.length}</div>
                        <div class="label">إجمالي اللوحات</div>
                    </div>
                    <div class="stat-box">
                        <div class="number">${totalImages}</div>
                        <div class="label">إجمالي الصور</div>
                    </div>
                    <div class="stat-box">
                        <div class="number">${this.categories.length}</div>
                        <div class="label">عدد الفئات</div>
                    </div>
                    <div class="stat-box">
                        <div class="number">${vCount}</div>
                        <div class="label">لوحات عمودية</div>
                    </div>
                    <div class="stat-box">
                        <div class="number">${hCount}</div>
                        <div class="label">لوحات أفقية</div>
                    </div>
                    <div class="stat-box">
                        <div class="number">${sCount}</div>
                        <div class="label">لوحات مربعة</div>
                    </div>
                </div>
                
                <div class="section">
                    <h2>📁 تفاصيل الفئات</h2>
                    <table class="category-table">
                        <thead>
                            <tr>
                                <th>الفئة</th>
                                <th>عمودي (V)</th>
                                <th>أفقي (H)</th>
                                <th>مربع (S)</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.categories.map(cat => `
                                <tr>
                                    <td><strong>${cat.name}</strong></td>
                                    <td>${cat.vCount || 0}</td>
                                    <td>${cat.hCount || 0}</td>
                                    <td>${cat.sCount || 0}</td>
                                    <td><strong>${(cat.vCount || 0) + (cat.hCount || 0) + (cat.sCount || 0)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="footer">
                    <p>Canvas Frame - نظام إدارة اللوحات الفنية</p>
                </div>
                
                <script>window.onload = () => window.print();</script>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(reportHTML);
        printWindow.document.close();
    }

    openNoteForm(code, category) {
        document.getElementById('noteForm').style.display = 'block';
    }

    closeNoteForm() {
        document.getElementById('noteForm').style.display = 'none';
        document.getElementById('noteText').value = '';
    }

    async sendNote(code, category) {
        const noteText = document.getElementById('noteText').value.trim();
        if (!noteText) { alert('اكتب ملاحظة أولاً'); return; }
        
        const sent = await telegramService.sendNotification(code, noteText, category);
        if (sent) {
            alert('تم إرسال الملاحظة بنجاح! ✅');
            this.closeNoteForm();
        } else {
            alert('فشل الإرسال، حاول مرة أخرى');
        }
    }

    closeModals() {
        document.getElementById('productModal').style.display = 'none';
        this.currentProduct = null;
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
