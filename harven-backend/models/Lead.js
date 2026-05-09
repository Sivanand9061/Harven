// ============================================
// LEAD COLLECTION HELPER
// ============================================
// Firestore replaces Mongoose — no schema needed.
// Validation is handled by middleware/validation.js
// This file just exports the collection reference and helpers.

const { db, admin } = require('../firebase');

const COLLECTION = 'leads';

const Lead = {
    collection: () => db.collection(COLLECTION),

    // Create a new lead document
    async create(data) {
        const docRef = db.collection(COLLECTION).doc(); // auto-generated ID
        const payload = {
            ...data,
            status: 'new',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await docRef.set(payload);
        return { _id: docRef.id, ...payload };
    },

    // Get all leads, sorted by createdAt descending
    async findAll({ limit = 100, skip = 0 } = {}) {
        const snapshot = await db.collection(COLLECTION)
            .orderBy('createdAt', 'desc')
            .limit(limit + skip)
            .get();

        const all = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        return all.slice(skip);
    },

    // Count total leads
    async count() {
        const snapshot = await db.collection(COLLECTION).count().get();
        return snapshot.data().count;
    },

    // Find a single lead by Firestore doc ID
    async findById(id) {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return { _id: doc.id, ...doc.data() };
    },

    // Update a lead by ID (partial update)
    async findByIdAndUpdate(id, data) {
        const ref = db.collection(COLLECTION).doc(id);
        const doc = await ref.get();
        if (!doc.exists) return null;
        await ref.update(data);
        const updated = await ref.get();
        return { _id: updated.id, ...updated.data() };
    },

    // Delete a lead by ID
    async findByIdAndDelete(id) {
        const ref = db.collection(COLLECTION).doc(id);
        const doc = await ref.get();
        if (!doc.exists) return null;
        const data = { _id: doc.id, ...doc.data() };
        await ref.delete();
        return data;
    }
};

module.exports = Lead;