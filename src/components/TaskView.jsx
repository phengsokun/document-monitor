import { useState, useMemo } from 'react';
import { updateDocument, deleteDocument } from '../lib/db';
import { getStatus, formatDueDate } from '../lib/dueDateCheck';

const TYPE_LABELS = {
  LandSplit: 'ស្នើសុំលេខបំបែក',
  FindBoundary: 'ស្នើរកព្រំ',
  PV_Check: 'ពិនិត្យក្បាលដីក្នុង GIS',
  Sporadic: 'ស្នើសុំដាច់ដោយដុំ ធ្វើប្លង់សុរិយោដី',
  RequestShp: 'ស្នើសុំទិន្នន័យ',
};

const STATUS_LABELS = {
  pending: 'កំពុងធ្វើ',
  request_data: 'សុំទិន្នន័យ',
  overdue: 'ផុតកំណត់',
  completed: 'រួចរាល់',
};

const STATUS_BADGE = {
  pending: 'bg-blue-100 text-blue-700',
  request_data: 'bg-orange-100 text-orange-700',
  overdue: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
};

const NEXT_STATUS = {
  pending: { key: 'request_data', label: 'សុំទិន្នន័យ' },
  request_data: { key: 'completed', label: 'រួចរាល់' },
};

const COLUMNS = [
  { key: 'trackingNumber', label: 'លេខស្នើសុំ' },
  { key: 'requestorName', label: 'ឈ្មោះអ្នកស្នើសុំ' },
  { key: 'documentType', label: 'ប្រភេទ' },
  { key: 'district', label: 'ស្រុក' },
  { key: 'receiveDate', label: 'ថ្ងៃទទួល' },
  { key: 'dueDate', label: 'ថ្ងៃផុតកំណត់' },
  { key: 'status', label: 'ស្ថានភាព' },
];

export default function TaskView({ documents, onEdit, onRefresh, search, onSearchChange }) {
  const [sortCol, setSortCol] = useState('dueDate');
  const [sortDir, setSortDir] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [movingId, setMovingId] = useState(null);

  const filteredDocs = useMemo(() => {
    let result = documents;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) =>
        d.trackingNumber?.toLowerCase().includes(q) ||
        d.requestorName?.toLowerCase().includes(q) ||
        d.documentType?.toLowerCase().includes(q) ||
        d.district?.toLowerCase().includes(q) ||
        String(d.id).includes(q)
      );
    }

    if (statusFilter) {
      result = result.filter((d) => getStatus(d) === statusFilter);
    }

    if (typeFilter) {
      result = result.filter((d) => d.documentType === typeFilter);
    }

    return result;
  }, [documents, search, statusFilter, typeFilter]);

  const sortedDocs = useMemo(() => {
    const sorted = [...filteredDocs];
    sorted.sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];

      if (sortCol === 'status') {
        va = getStatus(a);
        vb = getStatus(b);
      }

      if (sortCol === 'documentType') {
        va = (TYPE_LABELS[va] || va || '');
        vb = (TYPE_LABELS[vb] || vb || '');
      }

      if (va == null) va = '';
      if (vb == null) vb = '';

      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredDocs, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleMove = async (doc) => {
    const next = NEXT_STATUS[getStatus(doc)];
    if (!next) return;
    setMovingId(doc.id);
    const updates = { status: next.key };
    const now = new Date().toISOString();
    if (next.key === 'request_data') updates.requestedAt = now;
    if (next.key === 'completed') updates.completedAt = now;
    await updateDocument(doc.id, updates);
    setMovingId(null);
    onRefresh();
  };

  const handleDelete = async (doc) => {
    if (!window.confirm('លុបឯកសារនេះ?')) return;
    await deleteDocument(doc.id);
    onRefresh();
  };

  const sortIcon = (col) => {
    if (sortCol !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return sortDir === 'asc'
      ? <span className="text-blue-600 ml-1">↑</span>
      : <span className="text-blue-600 ml-1">↓</span>;
  };

  const docTypes = useMemo(() => {
    const types = new Set(documents.map((d) => d.documentType).filter(Boolean));
    return [...types].sort();
  }, [documents]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ស្វែងរក..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="">ស្ថានភាពទាំងអស់</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="">ប្រភេទទាំងអស់</option>
          {docTypes.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
          ))}
        </select>
        {(statusFilter || typeFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setTypeFilter(''); }}
            className="px-2 py-2 text-red-500 hover:text-red-700 text-sm"
          >
            ✕ សម្អាតតម្រង
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {sortedDocs.length} ឯកសារ
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    {col.label}
                    {sortIcon(col.key)}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                  សកម្មភាព
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDocs.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="text-center py-12 text-gray-400">
                    គ្មានឯកសារ
                  </td>
                </tr>
              ) : (
                sortedDocs.map((doc) => {
                  const status = getStatus(doc);
                  const docId = `DOC-${new Date(doc.createdAt).getFullYear()}-${String(doc.id).padStart(4, '0')}`;
                  const next = NEXT_STATUS[status];
                  const isMoving = movingId === doc.id;

                  return (
                    <tr
                      key={doc.id}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                        isMoving ? 'opacity-40' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-gray-400 font-mono">{docId}</span>
                        <div className="font-medium text-gray-800">{doc.trackingNumber || '-'}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{doc.requestorName}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 text-xs">
                        {doc.documentType ? (TYPE_LABELS[doc.documentType] || doc.documentType) : '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 text-xs">{doc.district || '-'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 text-xs">{formatDueDate(doc.receiveDate)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-xs font-medium ${status === 'overdue' ? 'text-red-600' : 'text-gray-600'}`}>
                          {formatDueDate(doc.dueDate)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[status] || status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex gap-1">
                          <button
                            onClick={() => onEdit(doc)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                          >
                            កែប្រែ
                          </button>
                          {next && (
                            <button
                              onClick={() => handleMove(doc)}
                              disabled={isMoving}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                            >
                              {next.label}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(doc)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            លុប
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
