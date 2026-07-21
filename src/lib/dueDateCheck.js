import { getAllDocuments, updateDocument } from './db';

export function getDisplayStatus(doc) {
  if (doc.status === 'completed' || doc.status === 'request_data') return doc.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(doc.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate < today) return 'overdue';
  const diffMs = dueDate - today;
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours <= 24) return 'due-soon';
  return 'pending';
}

export function getStatus(doc) {
  // For Kanban columns, use the actual stored status; only auto-detect overdue for pending docs
  if (doc.status === 'completed' || doc.status === 'request_data') return doc.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(doc.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate < today) return 'overdue';
  return doc.status || 'pending';
}

export function formatDueDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function calculateDueDate(receiveDateStr) {
  const d = new Date(receiveDateStr);
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
}

export async function checkOverdue() {
  const docs = await getAllDocuments();
  let overdueCount = 0;
  for (const doc of docs) {
    if (doc.status === 'completed' || doc.status === 'request_data') continue;
    const displayStatus = getDisplayStatus(doc);
    if (displayStatus === 'overdue' && doc.status !== 'overdue') {
      await updateDocument(doc.id, { status: 'overdue' });
      overdueCount++;
    }
  }
  return overdueCount;
}
