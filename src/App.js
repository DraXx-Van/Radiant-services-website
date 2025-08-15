import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

// Environment variables are injected by the build process (e.g., Vercel)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_KEY = process.env.REACT_APP_API_KEY;

// Define variables outside the component to avoid re-initialization
let auth;
let db;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    try {
      const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
      const app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);

      // Set up the auth state change listener to manage user state
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setIsAuthReady(true);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Firebase initialization failed:", err);
      setAuthError("Failed to initialize Firebase. Please check your configuration.");
      setIsAuthReady(true);
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Loading...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="bg-red-500 p-6 rounded-md text-white max-w-sm text-center">
          <p>{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100 font-inter">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginPage />
      )}
    </div>
  );
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-sm p-8 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-3xl font-bold text-center text-white mb-6">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="********"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Log In
          </button>
        </form>
        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState({});
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    const fetchLicenses = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/licenses`);
        if (!response.ok) {
          throw new Error('Failed to fetch licenses');
        }
        const data = await response.json();
        setLicenses(data.licenses);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLicenses();
  }, [refresh]);

  const handleAction = async (action, key, data = {}) => {
    setError(null);
    let url = '';
    let method = 'POST';

    switch (action) {
      case 'create':
        url = `${BACKEND_URL}/create`;
        break;
      case 'delete':
        url = `${BACKEND_URL}/delete/${key}`;
        break;
      case 'reset-hwid':
        url = `${BACKEND_URL}/reset-hwid/${key}`;
        break;
      case 'toggle-status':
        url = `${BACKEND_URL}/toggle-status/${key}`;
        break;
      default:
        return;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
        },
        body: Object.keys(data).length > 0 ? JSON.stringify(data) : null,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to perform action: ${action}`);
      }
      setRefresh(prev => !prev);
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const openModal = (type, data = {}) => {
    setModalType(type);
    setModalData(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType(null);
    setModalData({});
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
        // Handle Firestore timestamp objects
        if (timestamp.toDate) {
            return new Date(timestamp.toDate()).toLocaleString();
        }
        // Handle ISO strings from the backend
        return new Date(timestamp).toLocaleString();
    } catch (e) {
        console.error("Failed to format date:", e);
        return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Loading licenses...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => openModal('create')}
            className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-md transition duration-200"
          >
            Create Key
          </button>
          <button
            onClick={onLogout}
            className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow-md transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500 p-4 mb-4 rounded-md text-white">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">HWID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Expire Time</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {licenses.map((license) => (
                <tr key={license.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{license.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${license.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {license.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{license.hwid || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{formatDate(license.expire_time)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2 justify-center">
                      <button
                        onClick={() => handleAction('toggle-status', license.id)}
                        className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition duration-200"
                      >
                        {license.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleAction('reset-hwid', license.id)}
                        className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition duration-200"
                      >
                        Reset HWID
                      </button>
                      <button
                        onClick={() => openModal('delete', { key: license.id })}
                        className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white rounded-md transition duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {showModal && (
        <Modal closeModal={closeModal}>
          {modalType === 'create' && (
            <CreateKeyModal onCreate={(days) => handleAction('create', null, { days })} />
          )}
          {modalType === 'delete' && (
            <ConfirmDeleteModal keyToDelete={modalData.key} onConfirm={() => handleAction('delete', modalData.key)} />
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, closeModal }) {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-xl shadow-xl w-full max-w-md border border-gray-700 relative">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-100 transition duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

function CreateKeyModal({ onCreate }) {
  const [days, setDays] = useState(30);

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(days);
  };

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-4">Create New License Key</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Days Valid</label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-md transition duration-200"
        >
          Generate Key
        </button>
      </form>
    </div>
  );
}

function ConfirmDeleteModal({ keyToDelete, onConfirm }) {
  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-4">Confirm Deletion</h3>
      <p className="text-gray-300 mb-6">Are you sure you want to delete the key: <span className="font-mono text-white">{keyToDelete}</span>?</p>
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => onConfirm()}
          className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow-md transition duration-200"
        >
          Confirm Delete
        </button>
      </div>
    </div>
  );
}

export default App;
