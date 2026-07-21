import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { formatDueDate } from '../lib/dueDateCheck';

const TYPE_LABELS = {
  LandSplit: 'ស្នើសុំលេខបំបែក',
  FindBoundary: 'ស្នើរកព្រំ',
  PV_Check: 'ពិនិត្យក្បាលដីក្នុង GIS',
  Sporadic: 'ស្នើសុំដាច់ដោយដុំ ធ្វើប្លង់សុរិយោដី',
  RequestShp: 'ស្នើសុំទិន្នន័យ',
};

function getStartOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const STATUS_LABELS = {
  pending: 'កំពុងធ្វើ',
  request_data: 'សុំទិន្នន័យពីស្រុក',
  overdue: 'ផុតកំណត់',
  completed: 'រួចរាល់',
};

function downloadXLSX(sheets, filename) {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, filename);
}

function flattenDoc(doc, year) {
  return {
    'លេខឯកសារ': `DOC-${year}-${String(doc.id).padStart(4, '0')}`,
    'លេខស្នើសុំ': doc.trackingNumber || '',
    'ឈ្មោះអ្នកស្នើសុំ': doc.requestorName || '',
    'ប្រភេទ': TYPE_LABELS[doc.documentType] || doc.documentType || '',
    'ស្រុក': doc.district || '',
    'ថ្ងៃទទួល': doc.receiveDate || '',
    'ថ្ងៃផុតកំណត់': doc.dueDate || '',
    'ស្ថានភាព': STATUS_LABELS[doc.status] || doc.status,
    'ថ្ងៃសុំទិន្នន័យ': doc.requestedAt ? formatDueDate(doc.requestedAt) : '',
    'ថ្ងៃរួចរាល់': doc.completedAt ? formatDueDate(doc.completedAt) : '',
    'ថ្ងៃបញ្ចូល': doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-SG') : '',
  };
}

export default function Reports({ documents, onClose }) {
  const [tab, setTab] = useState('summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const now = new Date();
  const year = now.getFullYear();
  const startOfDay = getStartOfDay();
  const startOfWeek = getStartOfWeek();
  const startOfMonth = getStartOfMonth();

  const filteredDocs = useMemo(() => {
    let result = documents;
    if (dateFrom) result = result.filter((d) => d.receiveDate >= dateFrom);
    if (dateTo) result = result.filter((d) => d.receiveDate <= dateTo);
    return result;
  }, [documents, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const receivedToday = [];
    const receivedThisWeek = [];
    const receivedThisMonth = [];
    const completedToday = [];
    const completedThisWeek = [];
    const completedThisMonth = [];

    for (const doc of filteredDocs) {
      const created = new Date(doc.createdAt);
      const updated = new Date(doc.updatedAt);

      if (created >= startOfDay) receivedToday.push(doc);
      if (created >= startOfWeek) receivedThisWeek.push(doc);
      if (created >= startOfMonth) receivedThisMonth.push(doc);

      if (doc.status === 'completed' && updated >= startOfDay) completedToday.push(doc);
      if (doc.status === 'completed' && updated >= startOfWeek) completedThisWeek.push(doc);
      if (doc.status === 'completed' && updated >= startOfMonth) completedThisMonth.push(doc);
    }

    return {
      receivedToday, receivedThisWeek, receivedThisMonth,
      completedToday, completedThisWeek, completedThisMonth,
    };
  }, [filteredDocs]);

  const rows = [
    { key: 'today', label: 'ថ្ងៃនេះ', label2: `(${formatDueDate(startOfDay.toISOString())})`, received: stats.receivedToday, completed: stats.completedToday },
    { key: 'week', label: 'សប្តាហ៍នេះ', label2: `(${formatDueDate(startOfWeek.toISOString())} — ${formatDueDate(now.toISOString())})`, received: stats.receivedThisWeek, completed: stats.completedThisWeek },
    { key: 'month', label: 'ខែនេះ', label2: `(${formatDueDate(startOfMonth.toISOString())} — ${formatDueDate(now.toISOString())})`, received: stats.receivedThisMonth, completed: stats.completedThisMonth },
  ];

  const handleDownloadXLSX = () => {
    const flatAll = filteredDocs.map((d) => flattenDoc(d, year));

    const sheets = {
      'ទិន្នន័យទាំងអស់': flatAll,
      'កំពុងធ្វើ': filteredDocs.filter((d) => d.status === 'pending').map((d) => flattenDoc(d, year)),
      'សុំទិន្នន័យ': filteredDocs.filter((d) => d.status === 'request_data').map((d) => flattenDoc(d, year)),
      'ផុតកំណត់': filteredDocs.filter((d) => d.status === 'overdue').map((d) => flattenDoc(d, year)),
      'រួចរាល់': filteredDocs.filter((d) => d.status === 'completed').map((d) => flattenDoc(d, year)),
    };

    // Add period-specific sheets
    for (const row of rows) {
      if (row.received.length > 0) {
        sheets[`ទទួល_${row.key}`] = row.received.map((d) => flattenDoc(d, year));
      }
      if (row.completed.length > 0) {
        sheets[`រួចរាល់_${row.key}`] = row.completed.map((d) => flattenDoc(d, year));
      }
    }

    const filename = `របាយការណ៍-${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadXLSX(sheets, filename);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">របាយការណ៍</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              <span>ដល់</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-red-500 hover:text-red-700">✕</button>
              )}
            </div>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setTab('summary')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === 'summary' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                សង្ខេប
              </button>
              <button
                onClick={() => setTab('detail')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === 'detail' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                លម្អិត
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        {/* Summary cards — always visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-blue-700">{stats.receivedToday.length}</div>
            <div className="text-xs text-blue-600 mt-0.5">ទទួលថ្ងៃនេះ</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-green-700">{stats.completedToday.length}</div>
            <div className="text-xs text-green-600 mt-0.5">រួចរាល់ថ្ងៃនេះ</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-orange-700">{filteredDocs.filter((d) => d.status === 'request_data').length}</div>
            <div className="text-xs text-orange-600 mt-0.5">សុំទិន្នន័យ</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-red-700">{filteredDocs.filter((d) => d.status === 'overdue').length}</div>
            <div className="text-xs text-red-600 mt-0.5">ផុតកំណត់</div>
          </div>
        </div>

        {tab === 'summary' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 px-3 text-gray-500 font-medium">រយៈពេល</th>
                  <th className="py-2 px-3 text-blue-600 font-medium">ទទួលចូល</th>
                  <th className="py-2 px-3 text-green-600 font-medium">រួចរាល់</th>
                  <th className="py-2 px-3 text-gray-500 font-medium">សរុប</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="font-medium text-gray-800">{row.label}</div>
                      <div className="text-xs text-gray-400">{row.label2}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.received.length} ឯកសារ</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.completed.length} ឯកសារ</span>
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-700">{row.received.length + row.completed.length}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td className="py-3 px-3 text-gray-700">សរុបទាំងអស់</td>
                  <td className="py-3 px-3 text-gray-700">{filteredDocs.length} ឯកសារ</td>
                  <td className="py-3 px-3 text-gray-700">{filteredDocs.filter((d) => d.status === 'completed').length} ឯកសារ</td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-6">
            {rows.map((row) => (
              <div key={row.key} className="space-y-3">
                <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">{row.label}</span>
                  <span className="text-gray-400 text-xs font-normal">{row.label2}</span>
                </h4>

                {row.received.length > 0 && (
                  <div>
                    <div className="text-xs text-blue-600 font-medium mb-2">ទទួលចូល ({row.received.length})</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">លេខឯកសារ</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">លេខស្នើសុំ</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">ឈ្មោះ</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">ប្រភេទ</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">ស្រុក</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">ថ្ងៃផុតកំណត់</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">សុំទិន្នន័យថ្ងៃ</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">ស្ថានភាព</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.received.map((doc) => (
                            <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-1.5 px-2 text-gray-600 font-mono">DOC-{year}-{String(doc.id).padStart(4, '0')}</td>
                              <td className="py-1.5 px-2 font-medium">{doc.trackingNumber || '-'}</td>
                              <td className="py-1.5 px-2">{doc.requestorName}</td>
                              <td className="py-1.5 px-2">{TYPE_LABELS[doc.documentType] || doc.documentType || '-'}</td>
                              <td className="py-1.5 px-2">{doc.district || '-'}</td>
                              <td className="py-1.5 px-2">{formatDueDate(doc.dueDate)}</td>
                              <td className="py-1.5 px-2">{doc.requestedAt ? formatDueDate(doc.requestedAt) : '-'}</td>
                              <td className="py-1.5 px-2">
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                  doc.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  doc.status === 'overdue' ? 'bg-red-100 text-red-600' :
                                  doc.status === 'request_data' ? 'bg-orange-100 text-orange-600' :
                                  'bg-blue-100 text-blue-600'
                                }`}>{STATUS_LABELS[doc.status] || doc.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {row.completed.length > 0 && (
                  <div>
                    <div className="text-xs text-green-600 font-medium mb-2">រួចរាល់ ({row.completed.length})</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">លេខឯកសារ</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">លេខស្នើសុំ</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">ឈ្មោះ</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">ប្រភេទ</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">ស្រុក</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">ថ្ងៃផុតកំណត់</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">សុំទិន្នន័យថ្ងៃ</th>
                            <th className="py-1.5 px-2 border-b font-medium text-gray-500">ស្ថានភាព</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.completed.map((doc) => (
                            <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-1.5 px-2 text-gray-600 font-mono">DOC-{year}-{String(doc.id).padStart(4, '0')}</td>
                              <td className="py-1.5 px-2 font-medium">{doc.trackingNumber || '-'}</td>
                              <td className="py-1.5 px-2">{doc.requestorName}</td>
                              <td className="py-1.5 px-2">{TYPE_LABELS[doc.documentType] || doc.documentType || '-'}</td>
                              <td className="py-1.5 px-2">{doc.district || '-'}</td>
                              <td className="py-1.5 px-2">{formatDueDate(doc.dueDate)}</td>
                              <td className="py-1.5 px-2">{doc.requestedAt ? formatDueDate(doc.requestedAt) : '-'}</td>
                              <td className="py-1.5 px-2">
                                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-xs font-medium">រួចរាល់</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {row.received.length === 0 && row.completed.length === 0 && (
                  <div className="text-center text-gray-300 text-xs py-4">គ្មានទិន្នន័យ</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end border-t pt-4">
          <button onClick={handleDownloadXLSX}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            ទាញយក .xlsx
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
            បិទ
          </button>
        </div>
      </div>
    </div>
  );
}
