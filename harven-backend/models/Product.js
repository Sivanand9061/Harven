// ============================================
// PRODUCT COLLECTION HELPER
// ============================================
// Firestore replaces Mongoose — no schema needed.
// Validation is handled by middleware/validation.js

const { db, admin } = require('../firebase');

const COLLECTION = 'products';

const Product = {
    collection: () => db.collection(COLLECTION),

    // Create a new product document
    async create(data) {
        const docRef = db.collection(COLLECTION).doc(); // auto-generated ID
        const payload = {
            ...data,
            inStock: data.inStock !== undefined ? data.inStock : true,
            image: data.image || 'https://images.unsplash.com/photo-1599599810694-2eea62f3c5?w=400',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await docRef.set(payload);
        return { _id: docRef.id, ...payload };
    },

    // Get all products, sorted by createdAt descending
    async findAll({ limit = 100, skip = 0 } = {}) {
        const snapshot = await db.collection(COLLECTION)
            .orderBy('createdAt', 'desc')
            .limit(limit + skip)
            .get();

        const all = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        return all.slice(skip);
    },

    // Count total products
    async count() {
        const snapshot = await db.collection(COLLECTION).count().get();
        return snapshot.data().count;
    },

    // Find a single product by Firestore doc ID
    async findById(id) {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return { _id: doc.id, ...doc.data() };
    },

    // Update a product by ID (partial update)
    async findByIdAndUpdate(id, data) {
        const ref = db.collection(COLLECTION).doc(id);
        const doc = await ref.get();
        if (!doc.exists) return null;
        const updateData = {
            ...data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await ref.update(updateData);
        const updated = await ref.get();
        return { _id: updated.id, ...updated.data() };
    },

    // Delete a product by ID
    async findByIdAndDelete(id) {
        const ref = db.collection(COLLECTION).doc(id);
        const doc = await ref.get();
        if (!doc.exists) return null;
        const data = { _id: doc.id, ...doc.data() };
        await ref.delete();
        return data;
    }
};

module.exports = Product;
