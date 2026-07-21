import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

export async function getAllUsers() {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() };
}

export async function updateUserStatus(uid, status) {
  await updateDoc(doc(db, 'users', uid), { status });
}

export async function updateUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

export async function removeUser(uid) {
  await deleteDoc(doc(db, 'users', uid));
}
