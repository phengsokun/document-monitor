import { useState } from 'react';
import DocumentCard from './DocumentCard';

export default function DocumentList({ documents, onEdit, onComplete, onDelete }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('id');

  let filtered = documents;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.trackingNumber?.toLowerCase().includes(q) ||
        d.requestorName?.toLowerCase().includes(q) ||
        d.documentType?.toLowerCase().includes(q) ||
        d.district?.toLowerCase().includes(q) ||
        String(d.id).includes(q)
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter((d) => d.status === statusFilter);
  }

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate':
        return new Date(a.dueDate) - new Date(b.dueDate);
      case 'requestor':
        return (a.requestorName || '').localeCompare(b.requestorName || '');
      case 'type':
        return (a.documentType || '').localeCompare(b.documentType || '');
      case 'tracking':
        return (a.trackingNumber || '').localeCompare(b.trackingNumber || '');
      default:
        return b.id - a.id;
    }
  });

  const counts = {
    all: documents.length,
    pending: documents.filter((d) => d.status === 'pending').length,
    overdue: documents.filter((d) => d.status === 'overdue').length,
    completed: documents.filter((d) => d.status === 'completed').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ស្វែងរក..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">ទាំងអស់ ({counts.all})</option>
          <option value="pending">កំពុងធ្វើ ({counts.pending})</option>
          <option value="overdue">ផុតកំណត់ ({counts.overdue})</option>
          <option value="completed">រួចរាល់ ({counts.completed})</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="id">តម្រៀប: ថ្មីបំផុត</option>
          <option value="dueDate">តម្រៀប: ថ្ងៃផុតកំណត់</option>
          <option value="requestor">តម្រៀប: ឈ្មោះ</option>
          <option value="type">តម្រៀប: ប្រភេទ</option>
          <option value="tracking">តម្រៀប: លេខស្នើសុំ</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📄</div>
          <p className="text-lg">រកមិនឃើញឯកសារ</p>
          {search && <p className="text-sm mt-1">សាកល្បងពាក្យស្វែងរកផ្សេង</p>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onEdit={onEdit}
              onComplete={onComplete}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
