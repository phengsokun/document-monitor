import { useState, useRef, useMemo } from 'react';
import { updateDocument, deleteDocument } from '../lib/db';
import { formatDueDate, getStatus } from '../lib/dueDateCheck';

const TYPE_LABELS = {
  LandSplit: 'ស្នើសុំលេខបំបែក',
  FindBoundary: 'ស្នើរកព្រំ',
  PV_Check: 'ពិនិត្យក្បាលដីក្នុង GIS',
  Sporadic: 'ស្នើសុំដាច់ដោយដុំ ធ្វើប្លង់សុរិយោដី',
  RequestShp: 'ស្នើសុំទិន្នន័យ',
};

const COLUMNS = [
  { key: 'pending', label: 'កំពុងធ្វើ', color: 'border-blue-400', bg: 'bg-blue-50', badge: 'bg-blue-500', glow: 'shadow-blue-200' },
  { key: 'request_data', label: 'សុំទិន្នន័យពីស្រុក', color: 'border-orange-400', bg: 'bg-orange-50', badge: 'bg-orange-500', glow: 'shadow-orange-200' },
  { key: 'overdue', label: 'ផុតកំណត់', color: 'border-red-400', bg: 'bg-red-50', badge: 'bg-red-600', glow: 'shadow-red-200' },
  { key: 'completed', label: 'រួចរាល់', color: 'border-green-400', bg: 'bg-green-50', badge: 'bg-green-600', glow: 'shadow-green-200' },
];

function KanbanCard({ doc, onRefresh, onEdit, isDragging, onDragStart, onDragEnd }) {
  const [showPhoto, setShowPhoto] = useState(false);
  const [animating, setAnimating] = useState(false);
  const docId = `DOC-${new Date(doc.createdAt).getFullYear()}-${String(doc.id).padStart(4, '0')}`;
  const isOverdue = getStatus(doc) === 'overdue';

  const moveTo = async (newStatus) => {
    setAnimating(true);
    const updates = { status: newStatus };
    const now = new Date().toISOString();
    if (newStatus === 'request_data') updates.requestedAt = now;
    if (newStatus === 'completed') updates.completedAt = now;
    await updateDocument(doc.id, updates);
    setTimeout(() => { onRefresh(); setAnimating(false); }, 150);
  };

  return (
    <>
      <div
        className={`bg-white rounded-lg border border-gray-200 p-3 text-sm space-y-2
          transition-all duration-200 ease-out
          hover:shadow-md hover:-translate-y-0.5
          ${isDragging ? 'opacity-40 scale-95 rotate-1' : ''}
          ${animating ? 'animate-ping-once scale-95 opacity-50' : 'animate-fade-in'}
        `}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', String(doc.id));
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(doc.id);
        }}
        onDragEnd={onDragEnd}
      >
        <div className="flex items-start justify-between">
          <div className="text-xs text-gray-400 font-mono">{docId}</div>
        </div>
        <div className="font-semibold text-gray-800">
          {doc.trackingNumber || 'គ្មានលេខស្នើសុំ'}
        </div>
        <div className="text-gray-700 text-xs">
          <span className="text-gray-400">ឈ្មោះអ្នកស្នើសុំ៖</span> {doc.requestorName}
        </div>
        <div className="flex gap-2 flex-wrap text-xs text-gray-500">
          {doc.documentType && <span className="bg-gray-100 px-1.5 py-0.5 rounded">{TYPE_LABELS[doc.documentType] || doc.documentType}</span>}
          {doc.district && <span className="bg-gray-100 px-1.5 py-0.5 rounded">{doc.district}</span>}
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">ផុតកំណត់៖ <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>{formatDueDate(doc.dueDate)}</span></span>
        </div>
        {doc.status === 'request_data' && doc.requestedAt && (
          <div className="text-xs text-orange-600 animate-fade-in">
            សុំទិន្នន័យថ្ងៃ៖ {formatDueDate(doc.requestedAt)}
          </div>
        )}
        {doc.status === 'completed' && doc.completedAt && (
          <div className="text-xs text-green-600 animate-fade-in">
            រួចរាល់ថ្ងៃ៖ {formatDueDate(doc.completedAt)}
          </div>
        )}
        {doc.photoBlob && (
          <button onClick={() => setShowPhoto(true)} className="text-xs text-blue-600 hover:underline">មើលរូប</button>
        )}
        <div className="flex gap-1 flex-wrap pt-1 border-t border-gray-100">
          {COLUMNS.filter((c) => c.key !== doc.status).map((col) => (
            <button key={col.key} onClick={() => moveTo(col.key)}
              className={`text-xs px-2 py-0.5 rounded-full ${col.bg} hover:opacity-80 hover:scale-105 active:scale-95 transition-all duration-150`}>
              &rarr; {col.label}
            </button>
          ))}
          <button onClick={() => onEdit(doc)}
            className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all duration-150">
            កែប្រែ
          </button>
          <button onClick={async () => { if (window.confirm('លុបឯកសារនេះ?')) { await deleteDocument(doc.id); onRefresh(); }}}
            className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:scale-105 active:scale-95 transition-all duration-150 ml-auto">
            លុប
          </button>
        </div>
      </div>

      {showPhoto && doc.photoBlob && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPhoto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="animate-scale-in">
            <img
              src={typeof doc.photoBlob === 'string' ? doc.photoBlob : URL.createObjectURL(doc.photoBlob)}
              alt="Document"
              className="max-w-full max-h-[85vh] rounded-lg"
            />
            <button onClick={() => setShowPhoto(false)} className="absolute top-4 right-4 text-white text-3xl leading-none">&times;</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function KanbanBoard({ documents, onRefresh, onEdit, search, onSearchChange }) {
  const [draggedDocId, setDraggedDocId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const prevCounts = useRef({});

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
    if (dateFrom) {
      result = result.filter((d) => d.receiveDate >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((d) => d.receiveDate <= dateTo);
    }
    return result;
  }, [documents, search, dateFrom, dateTo]);

  const grouped = {};
  for (const col of COLUMNS) {
    grouped[col.key] = filteredDocs.filter((d) => getStatus(d) === col.key);
  }

  const handleDrop = async (colKey, e) => {
    e.preventDefault();
    setDragOverCol(null);
    setDraggedDocId(null);
    const docId = Number(e.dataTransfer.getData('text/plain'));
    if (!docId) return;
    const updates = { status: colKey };
    const now = new Date().toISOString();
    if (colKey === 'request_data') updates.requestedAt = now;
    if (colKey === 'completed') updates.completedAt = now;
    await updateDocument(docId, updates);
    onRefresh();
  };

  const handleDragStart = (id) => setDraggedDocId(id);
  const handleDragEnd = () => { setDraggedDocId(null); setDragOverCol(null); };

  const getCountChanged = (colKey) => {
    const prev = prevCounts.current[colKey] || 0;
    const curr = grouped[colKey].length;
    return curr !== prev;
  };

  // Update prev counts after render
  setTimeout(() => {
    for (const col of COLUMNS) {
      prevCounts.current[col.key] = grouped[col.key].length;
    }
  }, 0);

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pingOnce {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.95); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0.8); }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
          50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.15); }
        }
        .animate-fade-in { animation: fadeIn 0.25s ease-out; }
        .animate-scale-in { animation: scaleIn 0.2s ease-out; }
        .animate-ping-once { animation: pingOnce 0.3s ease-out; }
        .animate-pop-in { animation: popIn 0.35s ease-out; }
        .animate-glow { animation: glowPulse 1.5s ease-in-out infinite; }
      `}</style>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ស្វែងរក..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
        />
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>ពី</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
          <span>ដល់</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-2 py-2 text-red-500 hover:text-red-700 text-sm">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key}
            className={`border-t-4 ${col.color} rounded-xl ${col.bg} p-3 min-h-[200px]
              transition-all duration-300 ease-out
              ${dragOverCol === col.key ? `scale-[1.02] shadow-lg ${col.glow} ring-2 ring-${col.color.split('-')[1]}-300` : ''}
            `}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => handleDrop(col.key, e)}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 text-sm">{col.label}</h3>
              <span className={`text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${col.badge}
                ${getCountChanged(col.key) ? 'animate-pop-in' : ''}
                transition-all duration-200`}>
                {grouped[col.key].length}
              </span>
            </div>
            <div className="space-y-2">
              {grouped[col.key].map((doc) => (
                <KanbanCard
                  key={doc.id}
                  doc={doc}
                  onRefresh={onRefresh}
                  onEdit={onEdit}
                  isDragging={draggedDocId === doc.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
              {grouped[col.key].length === 0 && (
                <div className={`text-center text-gray-300 text-xs py-8 transition-colors duration-300
                  ${dragOverCol === col.key ? 'text-gray-400' : ''}`}>
                  {dragOverCol === col.key ? 'ទម្លាក់នៅទីនេះ' : 'ទទេ'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
