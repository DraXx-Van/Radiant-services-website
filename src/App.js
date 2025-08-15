import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

// Define global variables for Canvas environment fallback
let __firebase_config = typeof window.__firebase_config !== 'undefined' ? window.__firebase_config : null;
let __app_id = typeof window.__app_id !== 'undefined' ? window.__app_id : null;

// Environment variables are injected by the build process (e.g., Vercel)
const REACT_APP_FIREBASE_API_KEY = process.env.REACT_APP_FIREBASE_API_KEY;
const REACT_APP_FIREBASE_AUTH_DOMAIN = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;
const REACT_APP_FIREBASE_PROJECT_ID = process.env.REACT_APP_FIREBASE_PROJECT_ID;
const REACT_APP_FIREBASE_STORAGE_BUCKET = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET;
const REACT_APP_FIREBASE_MESSAGING_SENDER_ID = process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID;
const REACT_APP_FIREBASE_APP_ID = process.env.REACT_APP_FIREBASE_APP_ID;
const REACT_APP_FIREBASE_MEASUREMENT_ID = process.env.REACT_APP_FIREBASE_MEASUREMENT_ID;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://test-backend-a0u4.onrender.com';
const API_KEY = process.env.REACT_APP_API_KEY || 'admin';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);

  useEffect(() => {
    let firebaseConfig;

    if (REACT_APP_FIREBASE_PROJECT_ID) {
      // Use individual environment variables for production
      firebaseConfig = {
        apiKey: REACT_APP_FIREBASE_API_KEY,
        authDomain: REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: REACT_APP_FIREBASE_APP_ID,
        measurementId: REACT_APP_FIREBASE_MEASUREMENT_ID
      };
    } else if (__firebase_config) {
      // Fallback to Canvas global variable for local testing
      firebaseConfig = JSON.parse(__firebase_config);
    } else {
      setAuthError("Firebase configuration is missing. Please check your environment variables.");
      setIsAuthReady(true);
      setLoading(false);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestoreDb);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
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
        <Dashboard user={user} onLogout={handleLogout} auth={auth} db={db} />
      ) : (
        <LoginPage auth={auth} />
      )}
    </div>
  );
}

function LoginPage({ auth }) {
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
      <div className="w-full max-w-sm p-8 bg-gray-800 rounded-2xl shadow-xl border border-gray-700 transition-transform duration-300 transform hover:scale-105">
        <h2 className="text-3xl font-bold text-center text-white mb-6">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
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
              className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              placeholder="********"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Log In
          </button>
        </form>
        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout, auth, db }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState({});
  const [refresh, setRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
  }, [refresh, BACKEND_URL]);

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

  const getDuration = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let expireTime = new Date(timestamp);
      if (timestamp.toDate) {
        expireTime = timestamp.toDate();
      }
      const now = new Date();
      const diffTime = expireTime.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays > 0 ? diffDays : 0} days`;
    } catch (e) {
      return 'N/A';
    }
  };

  const filteredLicenses = licenses.filter(license =>
    license.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (license.hwid && license.hwid.toLowerCase().includes(searchTerm.toLowerCase())) ||
    license.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Loading licenses...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6 flex-col sm:flex-row">
        <h1 className="text-4xl font-bold text-white mb-4 sm:mb-0">Radiant Services Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => openModal('create')}
            className="py-2 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg transition duration-300 transform hover:scale-105"
          >
            Create Key
          </button>
          <button
            onClick={onLogout}
            className="py-2 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg transition duration-300 transform hover:scale-105"
          >
            Logout
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500 p-4 mb-6 rounded-lg text-white font-medium shadow-md">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search keys..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredLicenses.map((license) => (
          <div key={license.id} className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 transition duration-300 hover:shadow-2xl hover:border-blue-500">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-400 font-mono break-all">{license.id}</h3>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${license.status === 'active' ? 'bg-green-600 text-green-100' : 'bg-yellow-600 text-yellow-100'}`}>
                {license.status}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-300">
              <p><strong>HWID:</strong> <span className="font-mono">{license.hwid || 'N/A'}</span></p>
              <p><strong>Expires:</strong> {formatDate(license.expire_time)}</p>
              <p><strong>Duration:</strong> {getDuration(license.expire_time)}</p>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => handleAction('toggle-status', license.id)}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200 text-xs"
              >
                {license.status === 'active' ? 'Pause' : 'Activate'}
              </button>
              <button
                onClick={() => handleAction('reset-hwid', license.id)}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition duration-200 text-xs"
              >
                Reset HWID
              </button>
              <button
                onClick={() => openModal('delete', { key: license.id })}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200 text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
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
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700 relative transform transition-transform duration-300 scale-100">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition duration-200"
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
            className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
            min="1"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg transition duration-300 transform hover:scale-105"
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
      <p className="text-gray-300 mb-6">Are you sure you want to delete the key: <span className="font-mono text-white break-all">{keyToDelete}</span>?</p>
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => onConfirm()}
          className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
        >
          Confirm Delete
        </button>
      </div>
    </div>
  );
}

export default App;
