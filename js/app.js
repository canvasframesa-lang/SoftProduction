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
                    <img src="${product.images[0]?.url?.replace('s400', 's1200') || product.thumbnail}" alt="${product.code}" id="mainProductImage">
                </div>
                <button class="slider-btn next" onclick="app.nextImage()">›</button>
            </div>
            <div class="slider-counter"><span id="currentIndex">1</span> / <span>${product.images.length}</span></div>
            <div class="slider-thumbs">
                ${product.images.map((img, i) => `<img src="${img.url}" alt="صورة ${i+1}" onclick="app.goToImage(${i})" class="thumb ${i === 0 ? 'active' : ''}">`).join('')}
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
        const date = new Date().toLocaleDateString('ar-SA');
        const time = new Date().toLocaleTimeString('ar-SA');

        const reportHTML = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تقرير كانفس فريم</title>
    <style>
        @page { size: A4; margin: 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
            background: #fff; 
            color: #1a1a1a;
            font-size: 12pt;
        }
        
        .report-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* Header */
        .report-header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: #fff;
            padding: 25px 30px;
            border-radius: 8px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .report-header h1 {
            font-size: 24pt;
            font-weight: 700;
            color: #d4af37;
        }
        
        .report-header .date-info {
            text-align: left;
            font-size: 10pt;
            color: #aaa;
        }
        
        /* Stats Grid - Excel Style */
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            border: 2px solid #1a1a1a;
        }
        
        .stats-table td {
            border: 1px solid #ccc;
            padding: 15px 10px;
            text-align: center;
            width: 16.66%;
        }
        
        .stats-table .stat-value {
            font-size: 28pt;
            font-weight: 700;
            color: #d4af37;
            display: block;
        }
        
        .stats-table .stat-label {
            font-size: 9pt;
            color: #666;
            margin-top: 5px;
            display: block;
        }
        
        /* Section Title */
        .section-title {
            background: #1a1a1a;
            color: #d4af37;
            padding: 12px 20px;
            font-size: 14pt;
            font-weight: 600;
            border-radius: 5px 5px 0 0;
            margin-top: 20px;
        }
        
        /* Data Table - Excel Style */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #1a1a1a;
            margin-bottom: 25px;
        }
        
        .data-table th {
            background: #f5f5f5;
            border: 1px solid #1a1a1a;
            padding: 12px 8px;
            font-weight: 600;
            font-size: 10pt;
            color: #1a1a1a;
        }
        
        .data-table td {
            border: 1px solid #ccc;
            padding: 10px 8px;
            text-align: center;
            font-size: 10pt;
        }
        
        .data-table tr:nth-child(even) {
            background: #fafafa;
        }
        
        .data-table tr:hover {
            background: #fff8e7;
        }
        
        .data-table .category-name {
            text-align: right;
            font-weight: 600;
            background: #f9f9f9;
        }
        
        .data-table .total-row {
            background: #1a1a1a !important;
            color: #fff;
            font-weight: 700;
        }
        
        .data-table .total-row td {
            border-color: #1a1a1a;
            padding: 14px 8px;
        }
        
        .data-table .gold {
            color: #d4af37;
        }
        
        /* Summary Box */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .summary-box {
            border: 2px solid #1a1a1a;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        
        .summary-box.highlight {
            background: #1a1a1a;
            color: #fff;
        }
        
        .summary-box .value {
            font-size: 32pt;
            font-weight: 700;
            color: #d4af37;
        }
        
        .summary-box .label {
            font-size: 10pt;
            color: #666;
            margin-top: 8px;
        }
        
        .summary-box.highlight .label {
            color: #aaa;
        }
        
        /* Footer */
        .report-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #1a1a1a;
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            color: #666;
        }
        
        /* Print */
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .report-container { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <div>
                <h1>📊 تقرير المخزون</h1>
                <p style="color:#888; margin-top:5px;">Canvas Frame - كانفس فريم</p>
            </div>
            <div class="date-info">
                <div>📅 ${date}</div>
                <div>🕐 ${time}</div>
            </div>
        </div>
        
        <table class="stats-table">
            <tr>
                <td>
                    <span class="stat-value">${this.products.length}</span>
                    <span class="stat-label">إجمالي اللوحات</span>
                </td>
                <td>
                    <span class="stat-value">${totalImages}</span>
                    <span class="stat-label">إجمالي الصور</span>
                </td>
                <td>
                    <span class="stat-value">${this.categories.length}</span>
                    <span class="stat-label">عدد الفئات</span>
                </td>
                <td>
                    <span class="stat-value">${vCount}</span>
                    <span class="stat-label">عمودي V</span>
                </td>
                <td>
                    <span class="stat-value">${hCount}</span>
                    <span class="stat-label">أفقي H</span>
                </td>
                <td>
                    <span class="stat-value">${sCount}</span>
                    <span class="stat-label">مربع S</span>
                </td>
            </tr>
        </table>
        
        <div class="section-title">📁 تفاصيل الفئات</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width:5%">#</th>
                    <th style="width:35%">اسم الفئة</th>
                    <th style="width:15%">عمودي (V)</th>
                    <th style="width:15%">أفقي (H)</th>
                    <th style="width:15%">مربع (S)</th>
                    <th style="width:15%">الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${this.categories.map((cat, index) => {
                    const total = (cat.vCount || 0) + (cat.hCount || 0) + (cat.sCount || 0);
                    return `
                    <tr>
                        <td>${index + 1}</td>
                        <td class="category-name">${cat.name}</td>
                        <td>${cat.vCount || 0}</td>
                        <td>${cat.hCount || 0}</td>
                        <td>${cat.sCount || 0}</td>
                        <td><strong>${total}</strong></td>
                    </tr>`;
                }).join('')}
                <tr class="total-row">
                    <td colspan="2">الإجمالي الكلي</td>
                    <td class="gold">${vCount}</td>
                    <td class="gold">${hCount}</td>
                    <td class="gold">${sCount}</td>
                    <td class="gold">${this.products.length}</td>
                </tr>
            </tbody>
        </table>
        
        <div class="section-title">📈 ملخص التوزيع</div>
        <div class="summary-grid">
            <div class="summary-box">
                <div class="value">${Math.round(vCount / this.products.length * 100)}%</div>
                <div class="label">نسبة اللوحات العمودية</div>
            </div>
            <div class="summary-box highlight">
                <div class="value">${Math.round(totalImages / this.products.length * 10) / 10}</div>
                <div class="label">متوسط الصور لكل لوحة</div>
            </div>
            <div class="summary-box">
                <div class="value">${Math.round(hCount / this.products.length * 100)}%</div>
                <div class="label">نسبة اللوحات الأفقية</div>
            </div>
        </div>
        
        <div class="report-footer">
            <div>Canvas Frame - نظام إدارة اللوحات الفنية</div>
            <div>تم إنشاء التقرير تلقائياً</div>
        </div>
    </div>
    
    <script>window.onload = () => window.print();</script>
</body>
</html>`;

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
