class App {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.categories = [];
        this.currentImages = [];
        this.currentIndex = 0;
        this.ratings = JSON.parse(localStorage.getItem('productRatings') || '{}');
        this.driveService = new DriveService();
    }

    async init() {
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('categoryFilter').addEventListener('change', (e) => this.filterByCategory(e.target.value));
        document.getElementById('orientationFilter').addEventListener('change', (e) => this.filterByOrientation(e.target.value));
        
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) this.closeModals();
            });
        }
        
        await this.loadData();
    }

    async loadData() {
        try {
            const data = await this.driveService.getAllProductsWithStats();
            
            let files = [];
            if (data && data.products) {
                files = data.products;
            } else if (Array.isArray(data)) {
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
            
            const code = file.code || file.name.substring(0, 7);
            if (!groups[code]) {
                groups[code] = {
                    code: code,
                    category: file.category || 'غير مصنف',
                    orientation: file.orientation || 'V',
                    images: []
                };
            }
            groups[code].images.push({
                id: file.id,
                name: file.name,
                number: file.imageNumber || parseInt(file.name.substring(7, 9)) || 1
            });
        });
        
        Object.values(groups).forEach(group => {
            group.images.sort((a, b) => a.number - b.number);
            group.thumbnail = 'https://drive.google.com/thumbnail?id=' + group.images[0].id + '&sz=s400';
            group.imageCount = group.images.length;
        });
        
        return Object.values(groups);
    }

    updateStats() {
        const vCount = this.products.filter(p => p.orientation === 'V').length;
        const hCount = this.products.filter(p => p.orientation === 'H').length;
        const sCount = this.products.filter(p => p.orientation === 'S').length;
        const totalImages = this.products.reduce((sum, p) => sum + p.imageCount, 0);
        
        const el = (id) => document.getElementById(id);
        if (el('totalProducts')) el('totalProducts').textContent = this.products.length;
        if (el('totalCategories')) el('totalCategories').textContent = this.categories.length;
        if (el('verticalCount')) el('verticalCount').textContent = vCount;
        if (el('horizontalCount')) el('horizontalCount').textContent = hCount;
        if (el('squareCount')) el('squareCount').textContent = sCount;
        if (el('totalImages')) el('totalImages').textContent = totalImages;
    }

    renderCategories() {
        const grid = document.getElementById('categoriesGrid');
        if (!grid) return;
        
        const catStats = {};
        this.products.forEach(p => {
            if (!catStats[p.category]) catStats[p.category] = { total: 0, v: 0, h: 0, s: 0 };
            catStats[p.category].total++;
            if (p.orientation === 'V') catStats[p.category].v++;
            if (p.orientation === 'H') catStats[p.category].h++;
            if (p.orientation === 'S') catStats[p.category].s++;
        });

        let html = '';
        for (const [cat, stats] of Object.entries(catStats)) {
            html += '<div class="category-card" onclick="app.filterByCategory(\'' + cat + '\')">';
            html += '<h3>' + cat + '</h3>';
            html += '<div class="cat-stats"><span>V: ' + stats.v + '</span><span>H: ' + stats.h + '</span><span>S: ' + stats.s + '</span></div>';
            html += '<div class="cat-total">' + stats.total + ' لوحة</div>';
            html += '</div>';
        }
        grid.innerHTML = html;
    }

    populateFilters() {
        const catFilter = document.getElementById('categoryFilter');
        if (!catFilter) return;
        
        let html = '<option value="">جميع الفئات</option>';
        this.categories.forEach(c => {
            html += '<option value="' + c + '">' + c + '</option>';
        });
        catFilter.innerHTML = html;
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
        const countEl = document.getElementById('productsCount');
        if (!grid) return;
        if (countEl) countEl.textContent = this.filteredProducts.length;
        
        let html = '';
        this.filteredProducts.forEach(p => {
            const rating = this.ratings[p.code] || 0;
            const ratingBadge = rating > 0 ? '<span class="rating-badge">' + '★'.repeat(rating) + '</span>' : '';
            
            html += '<div class="product-card" onclick="app.viewProduct(\'' + p.code + '\')">';
            html += '<div class="product-image">';
            html += '<img src="' + p.thumbnail + '" alt="' + p.code + '" loading="lazy">';
            html += '<span class="orientation-badge ' + p.orientation + '">' + p.orientation + '</span>';
            html += '<span class="image-count">' + p.imageCount + ' صور</span>';
            html += ratingBadge;
            html += '</div>';
            html += '<div class="product-info"><span class="product-code">' + p.code + '</span></div>';
            html += '</div>';
        });
        grid.innerHTML = html;
    }

    renderStars(rating, code) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            const filled = i <= rating ? 'filled' : '';
            stars += '<span class="star ' + filled + '" onclick="app.setRating(\'' + code + '\', ' + i + ')">★</span>';
        }
        return stars;
    }

    async setRating(code, rating) {
        const oldRating = this.ratings[code] || 0;
        this.ratings[code] = rating;
        localStorage.setItem('productRatings', JSON.stringify(this.ratings));
        
        const modalRating = document.querySelector('.modal-rating');
        if (modalRating) {
            modalRating.innerHTML = this.renderStars(rating, code);
        }
        this.renderProducts();
        
        // إرسال إشعار Telegram
        const product = this.products.find(p => p.code === code);
        const category = product ? product.category : '';
        const userName = localStorage.getItem('userName') || 'زائر';
        const msg = '⭐ تقييم جديد\n\n' +
                    '👤 المستخدم: ' + userName + '\n' +
                    '🖼 اللوحة: ' + code + '\n' +
                    '📁 الفئة: ' + category + '\n' +
                    '⭐ التقييم: ' + '★'.repeat(rating) + '☆'.repeat(5-rating) + ' (' + rating + '/5)\n' +
                    '📅 الوقت: ' + new Date().toLocaleString('ar-SA');
        
        await this.sendTelegram(msg);
    }

    async sendTelegram(message) {
        try {
            const token = CONFIG.TELEGRAM.BOT_TOKEN;
            const chatId = CONFIG.TELEGRAM.CHAT_ID;
            const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
            
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
        } catch (error) {
            console.error('Telegram error:', error);
        }
    }

    viewProduct(code) {
        const product = this.products.find(p => p.code === code);
        if (!product) return;

        this.currentImages = product.images;
        this.currentIndex = 0;
        const rating = this.ratings[code] || 0;

        const modal = document.getElementById('productModal');
        const content = document.getElementById('productModalContent');
        if (!modal || !content) return;
        
        const firstImg = product.images[0];
        let thumbsHtml = '';
        product.images.forEach((img, idx) => {
            const activeClass = idx === 0 ? 'active' : '';
            thumbsHtml += '<img src="https://drive.google.com/thumbnail?id=' + img.id + '&sz=s100" class="thumb ' + activeClass + '" onclick="app.goToImage(' + idx + ')">';
        });
        
        let html = '<div class="modal-header">';
        html += '<h2>' + product.code + '</h2>';
        html += '<span class="modal-category">' + product.category + '</span>';
        html += '<button class="close-btn" onclick="app.closeModals()">✕</button>';
        html += '</div>';
        
        html += '<div class="modal-rating">' + this.renderStars(rating, code) + '</div>';
        
        html += '<div class="slider-container">';
        html += '<button class="slider-btn prev" onclick="app.prevImage()">❮</button>';
        html += '<div class="main-image"><img id="mainImage" src="https://drive.google.com/thumbnail?id=' + firstImg.id + '&sz=s800" alt="' + product.code + '"></div>';
        html += '<button class="slider-btn next" onclick="app.nextImage()">❯</button>';
        html += '</div>';
        
        html += '<div class="slider-counter"><span id="currentIndex">1</span> / <span>' + product.images.length + '</span></div>';
        html += '<div class="thumbnails">' + thumbsHtml + '</div>';
        
        html += '<div class="modal-actions">';
        html += '<button class="note-btn" onclick="app.openNoteForm(\'' + product.code + '\', \'' + product.category + '\')">📝 إضافة ملاحظة</button>';
        html += '</div>';
        
        html += '<div id="noteForm" class="note-form hidden">';
        html += '<textarea id="noteText" placeholder="اكتب ملاحظتك هنا..."></textarea>';
        html += '<div class="note-actions">';
        html += '<button onclick="app.sendNote(\'' + product.code + '\', \'' + product.category + '\')">إرسال</button>';
        html += '<button class="cancel" onclick="app.closeNoteForm()">إلغاء</button>';
        html += '</div></div>';
        
        content.innerHTML = html;
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
        const mainImg = document.getElementById('mainImage');
        const indexEl = document.getElementById('currentIndex');
        
        if (mainImg) mainImg.src = 'https://drive.google.com/thumbnail?id=' + img.id + '&sz=s800';
        if (indexEl) indexEl.textContent = this.currentIndex + 1;
        
        document.querySelectorAll('.thumb').forEach((thumb, idx) => {
            thumb.classList.toggle('active', idx === this.currentIndex);
        });
    }

    async printReport() {
        // إرسال إشعار طباعة
        const userName = localStorage.getItem('userName') || 'زائر';
        const msg = '📄 طباعة تقرير\n\n' +
                    '👤 المستخدم: ' + userName + '\n' +
                    '📊 عدد اللوحات: ' + this.products.length + '\n' +
                    '📅 الوقت: ' + new Date().toLocaleString('ar-SA');
        
        await this.sendTelegram(msg);
        
        // فتح التقرير
        const rw = window.open('', '_blank');
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

        let catRows = '';
        for (const [cat, s] of Object.entries(catStats)) {
            catRows += '<tr><td>' + cat + '</td><td>' + s.v + '</td><td>' + s.h + '</td><td>' + s.s + '</td><td>' + s.total + '</td><td>' + s.images + '</td></tr>';
        }

        const topRated = Object.entries(this.ratings).filter(([c, r]) => r >= 4).sort((a, b) => b[1] - a[1]).slice(0, 10);
        let ratedRows = '';
        topRated.forEach(([code, rating]) => {
            ratedRows += '<tr><td>' + code + '</td><td class="stars">' + '★'.repeat(rating) + '☆'.repeat(5-rating) + '</td></tr>';
        });

        rw.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير المخزون</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:20px;background:#fff}.header{text-align:center;margin-bottom:30px;border-bottom:3px solid #d4af37;padding-bottom:20px}.header img{height:80px;margin-bottom:10px;background:#fff;padding:10px;border-radius:8px}.header h1{color:#333;font-size:24px}.header p{color:#666;margin-top:5px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:12px;text-align:center}th{background:#1a1a1a;color:#d4af37}.section-title{background:#d4af37;color:#000;padding:10px;margin:30px 0 10px;font-weight:bold}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:20px 0}.summary-box{border:2px solid #d4af37;padding:15px;text-align:center}.summary-box h3{font-size:28px;color:#d4af37}.summary-box p{color:#666;margin-top:5px}.stars{color:#d4af37}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><div class="header"><img src="https://canvasframesa-lang.github.io/SoftProduction/assets/logo.png" alt="Logo"><h1>تقرير مخزون اللوحات الفنية</h1><p>تاريخ التقرير: ' + new Date().toLocaleDateString('ar-SA') + '</p></div><div class="summary-grid"><div class="summary-box"><h3>' + this.products.length + '</h3><p>إجمالي اللوحات</p></div><div class="summary-box"><h3>' + totalImages + '</h3><p>إجمالي الصور</p></div><div class="summary-box"><h3>' + this.categories.length + '</h3><p>عدد الفئات</p></div><div class="summary-box"><h3>' + vCount + '</h3><p>لوحات عمودية</p></div><div class="summary-box"><h3>' + hCount + '</h3><p>لوحات أفقية</p></div><div class="summary-box"><h3>' + sCount + '</h3><p>لوحات مربعة</p></div></div><div class="section-title">تفاصيل الفئات</div><table><thead><tr><th>الفئة</th><th>عمودي V</th><th>أفقي H</th><th>مربع S</th><th>الإجمالي</th><th>عدد الصور</th></tr></thead><tbody>' + catRows + '</tbody></table>' + (topRated.length > 0 ? '<div class="section-title">أعلى اللوحات تقييماً</div><table><thead><tr><th>رمز اللوحة</th><th>التقييم</th></tr></thead><tbody>' + ratedRows + '</tbody></table>' : '') + '<script>window.onload=function(){window.print()}<\/script></body></html>');
        rw.document.close();
    }

    openNoteForm() {
        const form = document.getElementById('noteForm');
        if (form) form.classList.remove('hidden');
    }

    closeNoteForm() {
        const form = document.getElementById('noteForm');
        const text = document.getElementById('noteText');
        if (form) form.classList.add('hidden');
        if (text) text.value = '';
    }

    async sendNote(code, category) {
        const noteEl = document.getElementById('noteText');
        if (!noteEl) return;
        
        const note = noteEl.value.trim();
        if (!note) {
            alert('اكتب ملاحظة أولاً');
            return;
        }
        
        const userName = localStorage.getItem('userName') || 'زائر';
        const msg = '📝 ملاحظة جديدة\n\n' +
                    '👤 المستخدم: ' + userName + '\n' +
                    '🖼 اللوحة: ' + code + '\n' +
                    '📁 الفئة: ' + category + '\n' +
                    '💬 الملاحظة: ' + note + '\n' +
                    '📅 الوقت: ' + new Date().toLocaleString('ar-SA');
        
        try {
            await this.sendTelegram(msg);
            alert('تم إرسال الملاحظة بنجاح!');
            this.closeNoteForm();
        } catch (error) {
            alert('فشل الإرسال: ' + error.message);
        }
    }

    closeModals() {
        const modal = document.getElementById('productModal');
        if (modal) modal.classList.remove('active');
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', function() { app.init(); });
