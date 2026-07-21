import { db, storage } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const COLLECTION = 'documents';

async function uploadPhoto(docId, blob) {
  if (!blob) return null;
  const fileRef = ref(storage, `photos/${docId}/${Date.now()}`);
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
}

export async function addDocument(docData) {
  const { photoBlob, ...fields } = docData;
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...fields,
    photoUrl: null,
    status: 'pending',
    notifiedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  if (photoBlob && photoBlob instanceof Blob) {
    const url = await uploadPhoto(docRef.id, photoBlob);
    await updateDoc(docRef, { photoUrl: url });
  }

  return docRef.id;
}

export async function updateDocument(id, updates) {
  const { photoBlob, ...fields } = updates;
  const docRef = doc(db, COLLECTION, id);

  const updateData = {
    ...fields,
    updatedAt: new Date().toISOString(),
  };

  if (photoBlob && photoBlob instanceof Blob) {
    const url = await uploadPhoto(id, photoBlob);
    updateData.photoUrl = url;
  }

  await updateDoc(docRef, updateData);
  return getDocument(id);
}

export async function getDocument(id) {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data(), photoBlob: snap.data().photoUrl };
}

export async function getAllDocuments() {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), photoBlob: d.data().photoUrl }));
}

export async function getDocumentsByStatus(status) {
  const q = query(collection(db, COLLECTION), where('status', '==', status));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data(), photoBlob: d.data().photoUrl }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function searchDocuments(queryStr) {
  const docs = await getAllDocuments();
  const q = queryStr.toLowerCase();
  return docs.filter(
    (d) =>
      d.trackingNumber?.toLowerCase().includes(q) ||
      d.requestorName?.toLowerCase().includes(q) ||
      d.documentType?.toLowerCase().includes(q) ||
      String(d.id).includes(q)
  );
}

export async function deleteDocument(id) {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (snap.exists() && snap.data().photoUrl) {
    try {
      const url = snap.data().photoUrl;
      const photoRef = ref(storage, url);
      await deleteObject(photoRef);
    } catch (e) {
      // photo may already be deleted
    }
  }
  return deleteDoc(doc(db, COLLECTION, id));
}

export async function exportToJSON() {
  const docs = await getAllDocuments();
  const clean = docs.map(({ photoBlob, ...rest }) => rest);
  return JSON.stringify(clean, null, 2);
}

export async function importFromJSON(json) {
  const docs = JSON.parse(json);
  const now = new Date().toISOString();
  for (const datum of docs) {
    const { id, photoBlob, ...fields } = datum;
    await addDoc(collection(db, COLLECTION), {
      ...fields,
      photoUrl: fields.photoUrl || null,
      createdAt: fields.createdAt || now,
      updatedAt: now,
    });
  }
}

export async function getDistinctValues(field) {
  const docs = await getAllDocuments();
  const values = new Set(docs.map((d) => d[field]).filter(Boolean));
  return [...values].sort();
}

