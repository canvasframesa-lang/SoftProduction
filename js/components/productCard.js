// ==========================================
// مكون بطاقة المنتج
// ==========================================

class ProductCard {
    constructor(product, groupName = '') {
        this.product = product;
        this.groupName = groupName;
        this.status = this.extractStatus(product.name);
    }

    extractStatus(fileName) {
        const match = fileName.match(/^\[(\w+(?:-\w+)?)\]/);
        if (match && CONFIG.STATUSES[match[1]]) {
            return match[1];
        }
        return 'pending';
    }

    extractProductNumber(fileName) {
        const match = fileName.match(/(\d+)/);
        return match ? match[1] : '000';
    }

    getCleanName() {
        return this.product.name
            .replace(/^\[\w+(?:-\w+)?\]\s*/, '')
            .replace(/\.\w+$/, '');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    render() {
        const statusInfo = CONFIG.STATUSES[this.status];
        const thumbnailUrl = driveService.getThumbnailUrl(this.product);
        const productNumber = this.extractProductNumber(this.product.name);
        const cleanName = this.getCleanName();
        
        return `
            <div class="product-card" data-id="${this.product.id}" data-status="${this.status}">
                <div class="card-image-wrapper">
                    <img class="card-image" 
                         src="${thumbnailUrl}"
                         alt="${cleanName}"
                         loading="lazy"
                         onerror="this.src='assets/placeholder.png'">
                    <span class="status-badge ${this.status}">${statusInfo.icon} ${statusInfo.label}</span>
                    <span class="product-number">#${productNumber}</span>
                </div>
                <div class="card-content">
                    <h3 class="card-title" title="${cleanName}">${cleanName}</h3>
                    <div class="card-meta">
                        ${this.groupName ? `<span class="group-tag">${this.groupName}</span>` : '<span></span>'}
                        <span class="date">${this.formatDate(this.product.modifiedTime)}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="app.viewProduct('${this.product.id}')" title="عرض">👁</button>
                        <button class="btn-icon" onclick="app.openComments('${this.product.id}')" title="التعليقات" style="position:relative;">
                            💬<span class="comments-count" id="count-${this.product.id}">0</span>
                        </button>
                        <a href="${this.product.webViewLink}" target="_blank" class="btn-icon" title="فتح في Drive">🔗</a>
                    </div>
                </div>
            </div>
        `;
    }
}
