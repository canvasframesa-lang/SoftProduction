class DriveService {
    constructor() {
        this.apiKey = CONFIG.GOOGLE.API_KEY;
        this.folderId = CONFIG.GOOGLE.FOLDER_ID;
        this.baseUrl = 'https://www.googleapis.com/drive/v3';
    }

    async init() { return true; }

    async fetchAllFromDrive(folderId) {
        let allFiles = [];
        let pageToken = null;
        
        do {
            const query = `'${folderId}' in parents and trashed=false`;
            const fields = 'nextPageToken,files(id,name,mimeType,webViewLink,thumbnailLink)';
            let url = `${this.baseUrl}/files?q=${encodeURIComponent(query)}&fields=${fields}&key=${this.apiKey}&pageSize=1000`;
            
            if (pageToken) {
                url += `&pageToken=${pageToken}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('API Error');
            const data = await response.json();
            
            allFiles = allFiles.concat(data.files || []);
            pageToken = data.nextPageToken;
            
        } while (pageToken);
        
        return allFiles;
    }

    async getCategories() {
        const files = await this.fetchAllFromDrive(this.folderId);
        return files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    }

    async getOrientationFolders(categoryId) {
        const files = await this.fetchAllFromDrive(categoryId);
        return files.filter(f => f.mimeType === 'application/vnd.google-apps.folder' && ['V','H','S'].includes(f.name));
    }

    async getProductsFromFolder(folderId) {
        const files = await this.fetchAllFromDrive(folderId);
        return files.filter(f => f.mimeType.startsWith('image/'));
    }

    async getAllProductsWithStats() {
        const categories = await this.getCategories();
        const allProducts = [];
        const categoryStats = [];

        for (const category of categories) {
            let vCount = 0, hCount = 0, sCount = 0;
            const folders = await this.getOrientationFolders(category.id);
            
            for (const folder of folders) {
                const products = await this.getProductsFromFolder(folder.id);
                console.log(`${category.name}/${folder.name}: ${products.length} files`);
                
                products.forEach(file => {
                    allProducts.push({
                        id: file.id,
                        name: file.name,
                        code: this.extractProductCode(file.name),
                        imageNumber: this.extractImageNumber(file.name),
                        category: category.name,
                        orientation: folder.name,
                        thumbnail: `https://drive.google.com/thumbnail?id=${file.id}&sz=s400`,
                        webViewLink: file.webViewLink
                    });
                    if (folder.name === 'V') vCount++;
                    else if (folder.name === 'H') hCount++;
                    else sCount++;
                });
            }
            categoryStats.push({ id: category.id, name: category.name, vCount, hCount, sCount });
        }
        
        console.log(`Total: ${allProducts.length} products`);
        return { products: allProducts, categories: categoryStats };
    }

    extractProductCode(fileName) {
        const name = fileName.replace(/\.[^.]+$/, '');
        return name.slice(0, -1);
    }

    extractImageNumber(fileName) {
        const name = fileName.replace(/\.[^.]+$/, '');
        const lastChar = name.slice(-1);
        return parseInt(lastChar) || 1;
    }
}
