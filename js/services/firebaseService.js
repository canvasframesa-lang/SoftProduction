// ==========================================
// خدمة Firebase
// ==========================================

class FirebaseService {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    init() {
        if (!firebase.apps.length) {
            firebase.initializeApp(CONFIG.FIREBASE);
        }
        this.db = firebase.firestore();
        this.isInitialized = true;
        console.log('Firebase initialized');
    }

    async addComment(productId, comment) {
        const data = {
            productId: productId,
            authorName: comment.authorName,
            text: comment.text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await this.db.collection('comments').add(data);
        return { id: docRef.id, ...data, createdAt: new Date() };
    }

    async getComments(productId) {
        const snapshot = await this.db
            .collection('comments')
            .where('productId', '==', productId)
            .orderBy('createdAt', 'desc')
            .get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
    }

    subscribeToComments(productId, callback) {
        return this.db
            .collection('comments')
            .where('productId', '==', productId)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const comments = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date()
                }));
                callback(comments);
            });
    }

    async getCommentsCount(productId) {
        const snapshot = await this.db
            .collection('comments')
            .where('productId', '==', productId)
            .get();
        return snapshot.size;
    }
}

const firebaseService = new FirebaseService();
