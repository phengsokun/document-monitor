import { useState, useEffect } from 'react';
import { getAllUsers, updateUserStatus, updateUserRole, removeUser } from '../lib/users';
import { useAuth } from '../lib/auth';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  active: 'សកម្ម',
  pending: 'រង់ចាំ',
  suspended: 'ផ្អាក',
};

const ROLE_LABELS = {
  admin: 'អ្នកគ្រប់គ្រង',
  user: 'អ្នកប្រើប្រាស់',
};

export default function AdminPanel({ onClose }) {
  const { user, ADMIN_EMAIL } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleStatus = async (uid, status) => {
    setActionMsg('');
    await updateUserStatus(uid, status);
    setActionMsg(`បានកំណត់ស្ថានភាពជា "${STATUS_LABELS[status]}"`);
    loadUsers();
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleRole = async (uid, role) => {
    setActionMsg('');
    await updateUserRole(uid, role);
    setActionMsg(`បានកំណត់តួនាទីជា "${ROLE_LABELS[role]}"`);
    loadUsers();
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleRemove = async (uid) => {
    if (!window.confirm('តើអ្នកចង់លុបអ្នកប្រើប្រាស់នេះមែនទេ?')) return;
    setActionMsg('');
    await removeUser(uid);
    setActionMsg('បានលុបអ្នកប្រើប្រាស់');
    loadUsers();
    setTimeout(() => setActionMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">គ្រប់គ្រងអ្នកប្រើប្រាស់</h2>
            <p className="text-sm text-gray-400">{users.length} នាក់</p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {actionMsg && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm animate-fade-in">
            {actionMsg}
          </div>
        )}

        <div className="overflow-auto flex-1 p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-400">កំពុងផ្ទុក...</div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.uid}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    u.status === 'suspended' ? 'border-red-200 bg-red-50/30' :
                    u.status === 'pending' ? 'border-yellow-200 bg-yellow-50/30' :
                    'border-gray-200'
                  }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800 truncate">{u.email}</span>
                      {u.uid === user?.uid && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">អ្នក</span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[u.status]}`}>
                        {STATUS_LABELS[u.status]}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      ចុះឈ្មោះ៖ {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {u.uid !== user?.uid && u.email !== ADMIN_EMAIL && (
                    <div className="flex gap-1 ml-3 flex-shrink-0">
                      {u.status === 'pending' && (
                        <button onClick={() => handleStatus(u.uid, 'active')}
                          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                          អនុម័ត
                        </button>
                      )}
                      {u.status === 'active' && (
                        <button onClick={() => handleStatus(u.uid, 'suspended')}
                          className="px-3 py-1.5 text-xs bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium">
                          ផ្អាក
                        </button>
                      )}
                      {u.status === 'suspended' && (
                        <button onClick={() => handleStatus(u.uid, 'active')}
                          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                          ដំណើរការ
                        </button>
                      )}
                      {u.role === 'user' ? (
                        <button onClick={() => handleRole(u.uid, 'admin')}
                          className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                          តម្លើងជាអ្នកគ្រប់គ្រង
                        </button>
                      ) : (
                        <button onClick={() => handleRole(u.uid, 'user')}
                          className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium">
                          ទម្លាក់ជាអ្នកប្រើ
                        </button>
                      )}
                      <button onClick={() => handleRemove(u.uid)}
                        className="px-3 py-1.5 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium">
                        លុប
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
