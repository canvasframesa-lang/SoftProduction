class TelegramService {
    constructor() {
        this.botToken = CONFIG.TELEGRAM.BOT_TOKEN;
        this.chatId = CONFIG.TELEGRAM.CHAT_ID;
        this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    }

    async sendNotification(productCode, note, category) {
        const message = `🎨 *ملاحظة جديدة*\n\n📦 *المنتج:* ${productCode}\n📁 *الفئة:* ${category}\n📝 *الملاحظة:* ${note}\n\n🕐 ${new Date().toLocaleString('ar-SA')}`;
        
        try {
            const response = await fetch(`${this.apiUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            return response.ok;
        } catch (error) {
            console.error('Telegram error:', error);
            return false;
        }
    }
}

const telegramService = new TelegramService();
