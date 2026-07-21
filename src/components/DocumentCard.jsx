import { useState } from 'react';
import { getStatus, formatDueDate } from '../lib/dueDateCheck';

const TYPE_LABELS = {
  LandSplit: 'ស្នើសុំលេខបំបែក',
  FindBoundary: 'ស្នើរកព្រំ',
  PV_Check: 'ពិនិត្យក្បាលដីក្នុង GIS',
  Sporadic: 'ស្នើសុំដាច់ដោយដុំ ធ្វើប្លង់សុរិយោដី',
  RequestShp: 'ស្នើសុំទិន្នន័យ',
};

const statusConfig = {
  overdue: { bg: 'bg-red-50 border-red-300', badge: 'bg-red-600 text-white', label: 'ផុតកំណត់' },
  'due-soon': { bg: 'bg-yellow-50 border-yellow-300', badge: 'bg-yellow-500 text-white', label: 'ជិតផុតកំណត់' },
  pending: { bg: 'bg-white border-gray-200', badge: 'bg-green-500 text-white', label: 'តាមកាលវិភាគ' },
  completed: { bg: 'bg-gray-50 border-gray-200', badge: 'bg-gray-400 text-white', label: 'រួចរាល់' },
};

export default function DocumentCard({ doc, onEdit, onComplete, onDelete }) {
  const status = getStatus(doc);
  const config = statusConfig[status] || statusConfig.pending;
  const [showPhoto, setShowPhoto] = useState(false);

  const docId = `DOC-${new Date(doc.createdAt).getFullYear()}-${String(doc.id).padStart(4, '0')}`;

  return (
    <>
      <div className={`border rounded-xl p-5 space-y-3 transition-shadow hover:shadow-md ${config.bg}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-gray-400 font-mono">{docId}</div>
            <div className="font-semibold text-gray-800 mt-0.5">
              {doc.trackingNumber || 'គ្មានលេខស្នើសុំ'}
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.badge}`}>
            {config.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">ឈ្មោះអ្នកស្នើសុំ</span>
            <div className="text-gray-700 font-medium">{doc.requestorName}</div>
          </div>
          <div>
            <span className="text-gray-400">ប្រភេទ</span>
            <div className="text-gray-700">{TYPE_LABELS[doc.documentType] || doc.documentType || '-'}</div>
          </div>
          <div>
            <span className="text-gray-400">ស្រុក</span>
            <div className="text-gray-700">{doc.district || '-'}</div>
          </div>
          <div>
            <span className="text-gray-400">ថ្ងៃទទួល</span>
            <div className="text-gray-700">{formatDueDate(doc.receiveDate)}</div>
          </div>
          <div>
            <span className="text-gray-400">ថ្ងៃផុតកំណត់</span>
            <div className={`font-medium ${status === 'overdue' ? 'text-red-600' : status === 'due-soon' ? 'text-yellow-600' : 'text-gray-700'}`}>
              {formatDueDate(doc.dueDate)}
            </div>
          </div>
        </div>

        {doc.photoBlob && (
          <div>
            <button onClick={() => setShowPhoto(true)}
              className="text-sm text-blue-600 hover:text-blue-800 underline">
              មើលរូប
            </button>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {status !== 'completed' && (
            <>
              <button onClick={() => onComplete(doc)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                រួចរាល់
              </button>
              <button onClick={() => onEdit(doc)}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
                កែប្រែ
              </button>
            </>
          )}
          <button onClick={() => onDelete(doc)}
            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm ml-auto">
            លុប
          </button>
        </div>
      </div>

      {showPhoto && doc.photoBlob && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowPhoto(false)}>
          <div className="max-w-2xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={typeof doc.photoBlob === 'string' ? doc.photoBlob : URL.createObjectURL(doc.photoBlob)}
              alt="Document"
              className="max-w-full max-h-[85vh] rounded-lg"
            />
            <button onClick={() => setShowPhoto(false)}
              className="absolute top-4 right-4 text-white text-3xl leading-none">&times;</button>
          </div>
        </div>
      )}
    </>
  );
}
