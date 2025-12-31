// ==========================================
// مكون التعليقات
// ==========================================

class CommentsManager {
    constructor() {
        this.currentProductId = null;
        this.unsubscribe = null;
    }

    open(productId) {
        this.currentProductId = productId;
        const modal = document.getElementById('commentsModal');
        modal.classList.add('active');
        
        const savedName = localStorage.getItem('commentAuthor');
        if (savedName) {
            document.getElementById('commentAuthor').value = savedName;
        }
        
        this.loadComments();
    }

    close() {
        const modal = document.getElementById('commentsModal');
        modal.classList.remove('active');
        
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.currentProductId = null;
    }

    loadComments() {
        const listEl = document.getElementById('commentsList');
        listEl.innerHTML = '<div class="loading-placeholder"><div class="loading-spinner"></div></div>';
        
        this.unsubscribe = firebaseService.subscribeToComments(
            this.currentProductId,
            (comments) => this.renderComments(comments)
        );
    }

    renderComments(comments) {
        const listEl = document.getElementById('commentsList');
        
        if (comments.length === 0) {
            listEl.innerHTML = '<div class="no-comments"><p>لا توجد تعليقات بعد</p><p>كن أول من يعلق!</p></div>';
            return;
        }
        
        listEl.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${this.escapeHtml(c.authorName)}</span>
                    <span class="comment-date">${this.formatDate(c.createdAt)}</span>
                </div>
                <p class="comment-text">${this.escapeHtml(c.text)}</p>
            </div>
        `).join('');
    }

    async submit(event) {
        event.preventDefault();
        
        const authorInput = document.getElementById('commentAuthor');
        const textInput = document.getElementById('commentText');
        const btn = event.target.querySelector('button');
        
        const authorName = authorInput.value.trim();
        const text = textInput.value.trim();
        
        if (!authorName || !text) return;
        
        btn.disabled = true;
        btn.textContent = 'جاري الإرسال...';
        
        try {
            await firebaseService.addComment(this.currentProductId, { authorName, text });
            textInput.value = '';
            localStorage.setItem('commentAuthor', authorName);
            
            // تحديث العداد
            this.updateCount(this.currentProductId);
        } catch (error) {
            alert('حدث خطأ في إرسال التعليق');
        } finally {
            btn.disabled = false;
            btn.textContent = 'إرسال';
        }
    }

    async updateCount(productId) {
        const count = await firebaseService.getCommentsCount(productId);
        const el = document.getElementById(`count-${productId}`);
        if (el) el.textContent = count;
    }

    formatDate(date) {
        if (!date) return '';
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'الآن';
        if (diff < 3600000) return `منذ ${Math.floor(diff/60000)} دقيقة`;
        if (diff < 86400000) return `منذ ${Math.floor(diff/3600000)} ساعة`;
        
        return date.toLocaleDateString('ar-EG');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const commentsManager = new CommentsManager();
