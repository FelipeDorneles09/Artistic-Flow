/**
 * scripts/migrateOrders.js
 * Usage: node scripts/migrateOrders.js
 * Requires: service-account.json at project root (already present in repo)
 * Installs: npm install firebase-admin
 *
 * This script moves documents from top-level `orders` collection into
 * `/users/{createdBy}/orders/{docId}` and then deletes the original.
 * Run once and verify results before deleting originals.
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (err) {
  console.error('Unable to load service-account.json. Make sure it exists at project root.');
  console.error(err);
  process.exit(1);
}

const db = admin.firestore();

async function migrate() {
  console.log('Starting migration: /orders -> /users/{uid}/orders');
  const ordersSnap = await db.collection('orders').get();
  console.log('Found', ordersSnap.size, 'orders');
  let moved = 0;

  for (const doc of ordersSnap.docs) {
    const data = doc.data();
    const uid = data.createdBy;
    if (!uid) {
      console.warn(`Skipping ${doc.id}: missing createdBy`);
      continue;
    }

    const targetRef = db.collection('users').doc(uid).collection('orders').doc(doc.id);
    await targetRef.set(data);
    await doc.ref.delete();
    moved += 1;
    console.log(`Moved ${doc.id} -> users/${uid}/orders/${doc.id}`);
  }

  console.log(`Migration complete. Moved ${moved} documents.`);
}

migrate().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
