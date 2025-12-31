// ==========================================
// خدمة Google Drive
// ==========================================

class DriveService {
    constructor() {
        this.isInitialized = false;
        this.isSignedIn = false;
    }

    async init() {
        return new Promise((resolve, reject) => {
            gapi.load('client:auth2', async () => {
                try {
                    await gapi.client.init({
                        apiKey: CONFIG.GOOGLE.API_KEY,
                        clientId: CONFIG.GOOGLE.CLIENT_ID,
                        scope: CONFIG.GOOGLE.SCOPES,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                    });
                    
                    this.isInitialized = true;
                    gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSignInStatus.bind(this));
                    this.updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    updateSignInStatus(isSignedIn) {
        this.isSignedIn = isSignedIn;
        document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { isSignedIn } }));
    }

    async signIn() {
        await gapi.auth2.getAuthInstance().signIn();
    }

    signOut() {
        gapi.auth2.getAuthInstance().signOut();
    }

    async getGroups() {
        const response = await gapi.client.drive.files.list({
            q: `'${CONFIG.GOOGLE.FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            orderBy: 'name'
        });
        return response.result.files || [];
    }

    async getProducts(folderId, pageToken = null) {
        const query = folderId 
            ? `'${folderId}' in parents and trashed=false`
            : `'${CONFIG.GOOGLE.FOLDER_ID}' in parents and trashed=false`;
            
        const response = await gapi.client.drive.files.list({
            q: query,
            fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, createdTime, modifiedTime, parents)',
            pageSize: CONFIG.DISPLAY.PRODUCTS_PER_PAGE,
            pageToken: pageToken,
            orderBy: 'name'
        });
        
        const files = response.result.files || [];
        const products = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
        
        return {
            products,
            nextPageToken: response.result.nextPageToken
        };
    }

    async searchProducts(query) {
        const response = await gapi.client.drive.files.list({
            q: `'${CONFIG.GOOGLE.FOLDER_ID}' in parents and name contains '${query}' and trashed=false`,
            fields: 'files(id, name, mimeType, thumbnailLink, webViewLink)',
            pageSize: 50
        });
        return response.result.files || [];
    }

    async getProductDetails(fileId) {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            fields: 'id, name, mimeType, thumbnailLink, webViewLink, webContentLink, createdTime, modifiedTime, size'
        });
        return response.result;
    }

    getThumbnailUrl(file) {
        if (file.thumbnailLink) {
            return file.thumbnailLink.replace(/=s\d+/, `=s${CONFIG.DISPLAY.THUMBNAIL_SIZE}`);
        }
        return 'assets/placeholder.png';
    }
}

const driveService = new DriveService();
