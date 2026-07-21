import { useState, useEffect } from 'react';
import { getAllDocuments, listenToDocuments, updateDocument, deleteDocument, exportToJSON, importFromJSON } from '../lib/db';
import { checkOverdue, getStatus } from '../lib/dueDateCheck';
import { configureEmail, getEmailConfig, sendOverdueAlerts } from '../lib/emailAlert';
import { useAuth } from '../lib/auth';
import DocumentForm from './DocumentForm';
import KanbanBoard from './KanbanBoard';
import Reports from './Reports';

export default function Dashboard() {
  const { logout, user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [view, setView] = useState('board');
  const [editDoc, setEditDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [emailSettings, setEmailSettings] = useState(getEmailConfig() || { enabled: false, endpoint: '', to: '' });
  const [notification, setNotification] = useState(null);
  const [search, setSearch] = useState('');
  const [showReports, setShowReports] = useState(false);

  useEffect(() => {
    const unsub = listenToDocuments((docs) => {
      setDocuments(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    checkOverdue().then((count) => {
      if (count > 0) {
        setNotification({ type: 'warning', text: `${count} ឯកសារផុតកំណត់!` });
      }
    });

    const interval = setInterval(() => {
      checkOverdue().then((count) => {
        if (count > 0) {
          getAllDocuments().then((docs) => {
            const overdue = docs.filter((d) => getStatus(d) === 'overdue');
            if (overdue.length > 0) sendOverdueAlerts(overdue);
          });
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleEdit = (doc) => {
    setEditDoc(doc);
    setView('form');
  };

  const handleSaved = () => {
    setEditDoc(null);
    setView('board');
  };

  const handleExport = async () => {
    const json = await exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-monitor-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      await importFromJSON(text);
      setNotification({ type: 'success', text: 'នាំចូលរួចរាល់!' });
    };
    input.click();
  };

  const handleSaveEmail = () => {
    configureEmail(emailSettings);
    setShowEmailSettings(false);
    setNotification({ type: 'success', text: 'រក្សាទុកការកំណត់អ៊ីមែល។' });
  };

  const overdueCount = documents.filter((d) => getStatus(d) === 'overdue').length;

  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  const boardDocs = documents.filter((d) => {
    if (d.status !== 'completed') return true;
    if (!d.completedAt) return true;
    return new Date(d.completedAt) >= fifteenDaysAgo;
  });

  const filteredDocs = search.trim()
    ? boardDocs.filter((d) => {
        const q = search.toLowerCase();
        return (
          d.trackingNumber?.toLowerCase().includes(q) ||
          d.requestorName?.toLowerCase().includes(q) ||
          d.documentType?.toLowerCase().includes(q) ||
          d.district?.toLowerCase().includes(q) ||
          String(d.id).includes(q)
        );
      })
    : boardDocs;

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-bounce ${
          notification.type === 'warning' ? 'bg-red-500' : notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
        }`}>
          {notification.text}
          <button onClick={() => setNotification(null)} className="ml-3 opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">តាមដានឯកសារ</h1>
            <p className="text-sm text-gray-400">តាមដានឯកសារចូល និងថ្ងៃផុតកំណត់</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {overdueCount > 0 && (
              <span className="px-3 py-1.5 bg-red-600 text-white rounded-full text-sm font-bold animate-pulse">
                {overdueCount} ផុតកំណត់
              </span>
            )}
            <button onClick={() => { setEditDoc(null); setView('form'); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              + ឯកសារថ្មី
            </button>
            <button onClick={handleExport}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
              នាំចេញ
            </button>
            <button onClick={handleImport}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
              នាំចូល
            </button>
            <button onClick={() => setShowReports(true)}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
              របាយការណ៍
            </button>
            <button onClick={() => setShowEmailSettings(true)}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
              អ៊ីមែល
            </button>
            <button onClick={logout}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm">
              ចាកចេញ
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400">កំពុងផ្ទុក...</div>
        ) : view === 'form' ? (
          <div className="max-w-full mx-auto flex justify-center">
            <button onClick={() => { setEditDoc(null); setView('board'); }}
              className="mb-3 text-sm text-blue-600 hover:text-blue-800">
              &larr; ត្រឡប់
            </button>
            <DocumentForm editDoc={editDoc} onSaved={handleSaved} onCancel={() => { setEditDoc(null); setView('board'); }} />
          </div>
        ) : (
          <KanbanBoard
            documents={filteredDocs}
            onRefresh={() => {}}
            onEdit={handleEdit}
            search={search}
            onSearchChange={setSearch}
          />
        )}
      </main>

      {showReports && (
        <Reports documents={documents} onClose={() => setShowReports(false)} />
      )}

      {showEmailSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">ការកំណត់អ៊ីមែល</h3>
              <button onClick={() => setShowEmailSettings(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <p className="text-sm text-gray-500">
              ប្រើ Google Apps Script ដើម្បីផ្ញើអ៊ីមែលតាម Gmail។ សូមមើលឯកសារ <code className="text-xs bg-gray-100 px-1 rounded">server/google-apps-script.gs</code>
            </p>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={emailSettings.enabled}
                onChange={(e) => setEmailSettings({ ...emailSettings, enabled: e.target.checked })} />
              <span className="text-sm">បើកការជូនដំណឹងតាម Gmail</span>
            </label>
            {emailSettings.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Google Apps Script URL</label>
                  <input type="url" value={emailSettings.endpoint}
                    onChange={(e) => setEmailSettings({ ...emailSettings, endpoint: e.target.value })}
                    placeholder="https://script.google.com/macros/s/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">អ៊ីមែលអ្នកទទួល (Gmail)</label>
                  <input type="email" value={emailSettings.to}
                    onChange={(e) => setEmailSettings({ ...emailSettings, to: e.target.value })}
                    placeholder="yourname@gmail.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button onClick={handleSaveEmail} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">រក្សាទុក</button>
              <button onClick={() => setShowEmailSettings(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">បោះបង់</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
