import { useState } from 'react';
import { useAuth } from './lib/auth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';

function App() {
  const { user, loading, isActive, isPending, isSuspended, isAdmin, logout } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-lg">កំពុងផ្ទុក...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center space-y-6">
          <div className="text-5xl">🚫</div>
          <h1 className="text-2xl font-bold text-red-600">គណនីត្រូវបានផ្អាក</h1>
          <p className="text-gray-500">គណនីរបស់អ្នកត្រូវបានផ្អាកដោយអ្នកគ្រប់គ្រង។ សូមទាក់ទងអ្នកគ្រប់គ្រង។</p>
          <div className="text-sm text-gray-400 break-all">{user.email}</div>
          <button onClick={logout}
            className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
            ចាកចេញ
          </button>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center space-y-6">
          <div className="text-5xl">⏳</div>
          <h1 className="text-2xl font-bold text-yellow-600">រង់ចាំការអនុម័ត</h1>
          <p className="text-gray-500">គណនីរបស់អ្នកកំពុងរង់ចាំអ្នកគ្រប់គ្រងអនុម័ត។ សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។</p>
          <div className="text-sm text-gray-400 break-all">{user.email}</div>
          <button onClick={logout}
            className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
            ចាកចេញ
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAdmin && (
        <button
          onClick={() => setShowAdmin(true)}
          className="fixed bottom-4 right-4 z-40 px-4 py-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 text-sm font-medium"
        >
          គ្រប់គ្រងអ្នកប្រើ
        </button>
      )}

      <Dashboard />

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </>
  );
}

export default App;
