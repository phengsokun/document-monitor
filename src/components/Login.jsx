import { useState } from 'react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) {
        await register(email, password);
        setError('ស្នើសុំចុះឈ្មោះរួចរាល់។ សូមរង់ចាំអ្នកគ្រប់គ្រងអនុម័ត។');
      } else {
        await login(email, password);
      }
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('អ៊ីមែលនេះបានចុះឈ្មោះរួចហើយ');
      } else if (err.code === 'auth/weak-password') {
        setError('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោច 6 តួអក្សរ');
      } else if (err.code === 'auth/invalid-email') {
        setError('ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវ');
      } else {
        setError('មានបញ្ហាកើតឡើង៖ ' + err.message);
      }
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">តាមដានឯកសារ</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isRegister ? 'បង្កើតគណនីថ្មី' : 'ចូលគណនីដើម្បីបន្ត'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">អ៊ីមែល</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">ពាក្យសម្ងាត់</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="យ៉ាងហោច 6 តួអក្សរ"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {error && (
            <div className={`p-3 rounded-lg text-sm ${error.startsWith('ស្នើសុំ') ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'}`}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {busy ? 'កំពុងដំណើរការ...' : isRegister ? 'ចុះឈ្មោះ' : 'ចូលគណនី'}
          </button>
        </form>

        <div className="text-center">
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-sm text-blue-600 hover:text-blue-800">
            {isRegister ? 'មានគណនីរួចហើយ? ចូលគណនី' : 'មិនទាន់មានគណនី? ចុះឈ្មោះ'}
          </button>
        </div>
      </div>
    </div>
  );
}
