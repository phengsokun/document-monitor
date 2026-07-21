import Dexie from 'dexie';

const db = new Dexie('DocumentMonitor');

db.version(1).stores({
  documents: '++id, trackingNumber, requestorName, documentType, receiveDate, dueDate, status',
});

export async function addDocument(doc) {
  const now = new Date().toISOString();
  return db.documents.add({
    ...doc,
    status: 'pending',
    notifiedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateDocument(id, updates) {
  updates.updatedAt = new Date().toISOString();
  await db.documents.update(id, updates);
  return getDocument(id);
}

export async function getDocument(id) {
  return db.documents.get(id);
}

export async function getAllDocuments() {
  return db.documents.orderBy('id').reverse().toArray();
}

export async function getDocumentsByStatus(status) {
  return db.documents.where('status').equals(status).reverse().sortBy('id');
}

export async function searchDocuments(query) {
  const q = query.toLowerCase();
  return db.documents
    .filter(
      (d) =>
        d.trackingNumber?.toLowerCase().includes(q) ||
        d.requestorName?.toLowerCase().includes(q) ||
        d.documentType?.toLowerCase().includes(q) ||
        String(d.id).includes(q)
    )
    .toArray();
}

export async function deleteDocument(id) {
  return db.documents.delete(id);
}

export async function exportToJSON() {
  const docs = await getAllDocuments();
  return JSON.stringify(docs, null, 2);
}

export async function importFromJSON(json) {
  const docs = JSON.parse(json);
  const now = new Date().toISOString();
  for (const doc of docs) {
    delete doc.id;
    doc.createdAt = doc.createdAt || now;
    doc.updatedAt = now;
    await db.documents.add(doc);
  }
}

export async function getDistinctValues(field) {
  const docs = await getAllDocuments();
  const values = new Set(docs.map((d) => d[field]).filter(Boolean));
  return [...values].sort();
}

export default db;
