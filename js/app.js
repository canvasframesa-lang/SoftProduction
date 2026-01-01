class App {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.categories = [];
        this.currentImages = [];
        this.currentIndex = 0;
        this.ratings = JSON.parse(localStorage.getItem('productRatings')) || {};
        this.driveService = new DriveService();
    }

    async init() {
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('categoryFilter').addEventListener('change', (e) => this.filterByCategory(e.target.value));
        document.getElementById('orientationFilter').addEventListener('change', (e) => this.filterByOrientation(e.target.value));
        document.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) this.closeModals();
        });
        await this.loadData();
    }

    async loadData() {
        try {
            const data = await this.driveService.getAllProductsWithStats();
            let files = [];
            if (Array.isArray(data)) {
                files = data;
            } else if (data && typeof data === 'object') {
                files = Object.values(data).flat();
            }
            
            console.log('Files loaded:', files.length);
            
            this.products = this.groupProducts(files);
            this.filteredProducts = [...this.products];
            this.categories = [...new Set(this.products.map(p => p.category))];
            this.updateStats();
            this.renderCategories();
            this.populateFilters();
            this.renderProducts();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    groupProducts(files) {
        if (!files || !Array.isArray(files)) return [];
        
        const groups = {};
        files.forEach(file => {
            if (!file || !file.name) return;
            
            const code = file.name.substring(0, 7);
            if (!groups[code]) {
                groups[code] = {
                    code,
                    category: file.category || 'غير مصنف',
                    orientation: file.orientation || 'V',
                    images: []
                };
            }
            groups[code].images.push({
                id: file.id,
                name: file.name,
                number: parseInt(file.name.substring(7, 9)) || 1
            });
        });
        
        Object.values(groups).forEach(group => {
            group.images.sort((a, b) => a.number - b.number);
            group.thumbnail = `https://drive.google.com/thumbnail?id=${group.images[0].id}&sz=s400`;
            group.imageCount = group.images.length;
        });
        
        return Object.values(groups);
    }

    updateStats() {
        const vCount = this.products.filter(p => p.orientation === 'V').length;
        const hCount = this.products.filter(p => p.orientation === 'H').length;
        const sCount = this.products.filter(p => p.orientation === 'S').length;
        const totalImages = this.products.reduce((sum, p) => sum + p.imageCount, 0);
        
        document.getElementById('totalProducts').textContent = this.products.length;
        document.getElementById('totalCategories').textContent = this.categories.length;
        document.getElementById('verticalCount').textContent = vCount;
        document.getElementById('horizontalCount').textContent = hCount;
        document.getElementById('squareCount').textContent = sCount;
        document.getElementById('totalImages').textContent = totalImages;
    }

    renderCategories() {
        const grid = document.getElementById('categoriesGrid');
        const catStats = {};
        
        this.products.forEach(p => {
            if (!catStats[p.category]) catStats[p.category] = { total: 0, v: 0, h: 0, s: 0 };
            catStats[p.category].total++;
            if (p.orientation === 'V') catStats[p.category].v++;
            if (p.orientation === 'H') catStats[p.category].h++;
            if (p.orientation === 'S') catStats[p.category].s++;
        });

        grid.innerHTML = Object.entries(catStats).map(([cat, stats]) => `
            <div class="category-card" onclick="app.filterByCategory('${cat}')">
                <h3>${cat}</h3>
                <div class="cat-stats">
                    <span>V: ${stats.v}</span>
                    <span>H: ${stats.h}</span>
                    <span>S: ${stats.s}</span>
                </div>
                <div class="cat-total">${stats.total} لوحة</div>
            </div>
        `).join('');
    }

    populateFilters() {
        const catFilter = document.getElementById('categoryFilter');
        catFilter.innerHTML = '<option value="">جميع الفئات</option>' +
            this.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    showAll() {
        this.filteredProducts = [...this.products];
        document.getElementById('categoryFilter').value = '';
        document.getElementById('orientationFilter').value = '';
        this.renderProducts();
    }

    filterByOrientation(orientation) {
        document.getElementById('orientationFilter').value = orientation;
        this.applyFilters();
    }

    filterByCategory(category) {
        document.getElementById('categoryFilter').value = category;
        this.applyFilters();
    }

    applyFilters() {
        const cat = document.getElementById('categoryFilter').value;
        const orient = document.getElementById('orientationFilter').value;
        
        this.filteredProducts = this.products.filter(p => {
            if (cat && p.category !== cat) return false;
            if (orient && p.orientation !== orient) return false;
            return true;
        });
        this.renderProducts();
    }

    handleSearch(query) {
        if (!query) {
            this.applyFilters();
            return;
        }
        this.filteredProducts = this.products.filter(p => 
            p.code.toLowerCase().includes(query.toLowerCase())
        );
        this.renderProducts();
    }

    renderProducts() {
        const grid = document.getElementById('productsGrid');
        document.getElementById('productsCount').textContent = this.filteredProducts.length;
        
        grid.innerHTML = this.filteredProducts.map(p => {
            const rating = this.ratings[p.code] || 0;
            
            return `
                <div class="product-card" onclick="app.viewProduct('${p.code}')">
                    <div class="product-image">
                        <img src="${p.thumbnail}" alt="${p.code}" loading="lazy">
                        <span class="orientation-badge ${p.orientation}">${p.orientation}</span>
                        <span class="image-count">${p.imageCount} صور</span>
                        ${rating > 0 ? `<span class="rating-badge">${'★'.repeat(rating)}</span>` : ''}
                    </div>
                    <div class="product-info">
                        <span class="product-code">${p.code}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStars(rating, code) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            const filled = i <= rating ? 'filled' : '';
            stars += `<span class="star ${filled}" onclick="app.setRating('${code}', ${i})">★</span>`;
        }
        return stars;
    }

    setRating(code, rating) {
        this.ratings[code] = rating;
        localStorage.setItem('productRatings', JSON.stringify(this.ratings));
        
        // تحديث النجوم في المودال
        const modalRating = document.querySelector('.modal-rating');
        if (modalRating) {
            modalRating.innerHTML = this.renderStars(rating, code);
        }
        
        // تحديث البطاقات
        this.renderProducts();
    }

    viewProduct(code) {
        const product = this.products.find(p => p.code === code);
        if (!product) return;

        this.currentImages = product.images;
        this.currentIndex = 0;
        const rating = this.ratings[code] || 0;

        const modal = document.getElementById('productModal');
        const content = document.getElementById('productModalContent');
        
        content.innerHTML = `
            <div class="modal-header">
                <h2>${product.code}</h2>
                <span class="modal-category">${product.category}</span>
                <button class="close-btn" onclick="app.closeModals()">✕</button>
            </div>
            
            <div class="modal-rating">
                ${this.renderStars(rating, code)}
            </div>
            
            <div class="slider-container">
                <button class="slider-btn prev" onclick="app.prevImage()">❮</button>
                <div class="main-image">
                    <img id="mainImage" src="https://drive.google.com/thumbnail?id=${product.images[0].id}&sz=s800" alt="${product.code}">
                </div>
                <button class="slider-btn next" onclick="app.nextImage()">❯</button>
            </div>
            
            <div class="slider-counter">
                <span id="currentIndex">1</span> / <span>${product.images.length}</span>
            </div>
            
            <div class="thumbnails">
                ${product.images.map((img, idx) => `
                    <img src="https://drive.google.com/thumbnail?id=${img.id}&sz=s100" 
                         class="thumb ${idx === 0 ? 'active' : ''}" 
                         onclick="app.goToImage(${idx})">
                `).join('')}
            </div>
            
            <div class="modal-actions">
                <button class="note-btn" onclick="app.openNoteForm('${product.code}', '${product.category}')">
                    📝 إضافة ملاحظة
                </button>
            </div>
            
            <div id="noteForm" class="note-form hidden">
                <textarea id="noteText" placeholder="اكتب ملاحظتك هنا..."></textarea>
                <div class="note-actions">
                    <button onclick="app.sendNote('${product.code}', '${product.category}')">إرسال</button>
                    <button class="cancel" onclick="app.closeNoteForm()">إلغاء</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    prevImage() {
        this.currentIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.currentImages.length - 1;
        this.updateSlider();
    }

    nextImage() {
        this.currentIndex = this.currentIndex < this.currentImages.length - 1 ? this.currentIndex + 1 : 0;
        this.updateSlider();
    }

    goToImage(index) {
        this.currentIndex = index;
        this.updateSlider();
    }

    updateSlider() {
        const img = this.currentImages[this.currentIndex];
        document.getElementById('mainImage').src = `https://drive.google.com/thumbnail?id=${img.id}&sz=s800`;
        document.getElementById('currentIndex').textContent = this.currentIndex + 1;
        
        document.querySelectorAll('.thumb').forEach((thumb, idx) => {
            thumb.classList.toggle('active', idx === this.currentIndex);
        });
    }

    printReport() {
        const reportWindow = window.open('', '_blank');
        const totalImages = this.products.reduce((sum, p) => sum + p.imageCount, 0);
        const vCount = this.products.filter(p => p.orientation === 'V').length;
        const hCount = this.products.filter(p => p.orientation === 'H').length;
        const sCount = this.products.filter(p => p.orientation === 'S').length;

        const catStats = {};
        this.products.forEach(p => {
            if (!catStats[p.category]) catStats[p.category] = { total: 0, v: 0, h: 0, s: 0, images: 0 };
            catStats[p.category].total++;
            catStats[p.category].images += p.imageCount;
            if (p.orientation === 'V') catStats[p.category].v++;
            if (p.orientation === 'H') catStats[p.category].h++;
            if (p.orientation === 'S') catStats[p.category].s++;
        });

        const topRated = Object.entries(this.ratings)
            .filter(([code, rating]) => rating >= 4)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        reportWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>تقرير المخزون</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; padding: 20px; background: #fff; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #d4af37; padding-bottom: 20px; }
                    .header img { height: 60px; margin-bottom: 10px; }
                    .header h1 { color: #333; font-size: 24px; }
                    .header p { color: #666; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
                    th { background: #1a1a1a; color: #d4af37; font-weight: bold; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .section-title { background: #d4af37; color: #000; padding: 10px; margin: 30px 0 10px; font-weight: bold; }
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
                    .summary-box { border: 2px solid #d4af37; padding: 15px; text-align: center; }
                    .summary-box h3 { font-size: 28px; color: #d4af37; }
                    .summary-box p { color: #666; margin-top: 5px; }
                    .stars { color: #d4af37; }
                    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="assets/logo.png" alt="Logo">
                    <h1>تقرير مخزون اللوحات الفنية</h1>
                    <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
                </div>

                <div class="summary-grid">
                    <div class="summary-box"><h3>${this.products.length}</h3><p>إجمالي اللوحات</p></div>
                    <div class="summary-box"><h3>${totalImages}</h3><p>إجمالي الصور</p></div>
                    <div class="summary-box"><h3>${this.categories.length}</h3><p>عدد الفئات</p></div>
                    <div class="summary-box"><h3>${vCount}</h3><p>لوحات عمودية</p></div>
                    <div class="summary-box"><h3>${hCount}</h3><p>لوحات أفقية</p></div>
                    <div class="summary-box"><h3>${sCount}</h3><p>لوحات مربعة</p></div>
                </div>

                <div class="section-title">تفاصيل الفئات</div>
                <table>
                    <thead>
                        <tr><th>الفئة</th><th>عمودي V</th><th>أفقي H</th><th>مربع S</th><th>الإجمالي</th><th>عدد الصور</th></tr>
                    </thead>
                    <tbody>
                        ${Object.entries(catStats).map(([cat, s]) => `
                            <tr><td>${cat}</td><td>${s.v}</td><td>${s.h}</td><td>${s.s}</td><td>${s.total}</td><td>${s.images}</td></tr>
                        `).join('')}
                    </tbody>
                </table>

                ${topRated.length > 0 ? `
                    <div class="section-title">أعلى اللوحات تقييماً</div>
                    <table>
                        <thead><tr><th>رمز اللوحة</th><th>التقييم</th></tr></thead>
                        <tbody>
                            ${topRated.map(([code, rating]) => `
                                <tr><td>${code}</td><td class="stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</td></tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : ''}

                <script>window.onload = () => window.print();</script>
            </body>
            </html>
        `);
        reportWindow.document.close();
    }

    openNoteForm(code, category) {
        document.getElementById('noteForm').classList.remove('hidden');
    }

    closeNoteForm() {
        document.getElementById('noteForm').classList.add('hidden');
        document.getElementById('noteText').value = '';
    }

    async sendNote(code, category) {
        const note = document.getElementById('noteText').value.trim();
        if (!note) return alert('اكتب ملاحظة أولاً');
        
        try {
            await telegramService.sendNotification(code, note, category);
            alert('تم إرسال الملاحظة بنجاح!');
            this.closeNoteForm();
        } catch (error) {
            alert('فشل الإرسال: ' + error.message);
        }
    }

    closeModals() {
        document.getElementById('productModal').classList.remove('active');
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
