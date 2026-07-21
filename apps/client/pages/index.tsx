import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useGeofencing } from '../contexts/GeofencingContext';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import GateMap from '../components/GateMap';
import { DashboardStats } from '../components/DashboardStats';
import { GateListItem } from '../components/GateListItem';
import { TrainAlertOverlay } from '../components/TrainAlertOverlay';
import { CustomerMessageFAB } from '../components/CustomerMessageFAB';

interface Gate {
  id: string;
  name: string;
  status: 'OPEN' | 'CLOSED';
  latitude?: number;
  longitude?: number;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export default function Home() {
  const { user, login, loginWithEmail, registerWithEmail, logout, loading } = useAuth();
  const [gates, setGates] = useState<Gate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { userLocation, permissionStatus, nearbyAlerts, activeJamAlert } = useGeofencing();

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    try { await loginWithEmail(email, password); } catch (err: any) { setError(err.message); }
  };

  const handleRegister = async () => {
    try { await registerWithEmail(email, password); } catch (err: any) { setError(err.message); }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'gates'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gate));
      setGates(gatesData);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredGates = searchTerm.trim()
    ? gates.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const DashboardHeader = () => (
    <div className="bg-[#3D405B] p-6 rounded-3xl mb-8 flex flex-col md:flex-row md:items-center md:justify-between shadow-lg shadow-[#1E2336]/50">
      <div>
        <h1 className="text-white text-2xl font-bold mb-1 tracking-wide">RailPath Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${userLocation ? 'bg-[#00D2A0] animate-pulse' : 'bg-slate-400'}`} />
          <p className={`text-sm font-medium ${userLocation ? 'text-[#00D2A0]' : 'text-slate-400'}`}>
            {userLocation ? 'Signal Active' : 'Searching Signal...'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 md:mt-0">
        <div className="text-right mr-2">
          <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-widest text-right">Welcome</span>
        </div>

        <div className="flex items-center gap-3 bg-[#2A2E45] border border-[#3D405B] pr-5 pl-2 py-1.5 rounded-full shadow-lg shadow-black/20 backdrop-blur-md">
          <img
            src={user?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=RailPath"}
            alt="Avatar"
            className="w-9 h-9 rounded-full bg-slate-600 border border-white/10"
          />
          <span className="text-white text-sm font-bold tracking-wide">{user?.displayName || 'Traveler'}</span>
        </div>

        <button
          onClick={logout}
          className="px-5 py-2.5 rounded-xl bg-[#FF5C75]/10 border border-[#FF5C75]/20 text-[#FF5C75] text-sm font-bold hover:bg-[#FF5C75]/20 transition-all ml-2"
        >
          Log Out
        </button>
      </div>
    </div>
  );

  if (loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen relative flex flex-col font-[Outfit] bg-[#1E2336]">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] bg-[#2A2E45] p-8 rounded-3xl shadow-2xl border border-[#3D405B]">
            <h1 className="text-3xl font-bold text-center text-white mb-2">Sign In</h1>
            <p className="text-center text-slate-400 mb-8">Access the RailPath Network</p>

            {error && <p className="text-[#FF5C75] bg-[#FF5C75]/10 border border-[#FF5C75]/20 p-3 rounded-xl text-sm text-center mb-6">{error}</p>}

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider block ml-1">Email</label>
                <input
                  type="email"
                  className="w-full bg-[#1E2336] border border-[#3D405B] rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#5D618C]"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider block ml-1">Password</label>
                <input
                  type="password"
                  className="w-full bg-[#1E2336] border border-[#3D405B] rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#5D618C]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={handleEmailLogin}
                className="flex-1 bg-[#5D618C] hover:bg-[#6D71A0] text-white font-bold py-3 rounded-xl transition-all"
              >
                Sign In
              </button>
              <button
                onClick={handleRegister}
                className="flex-1 bg-[#3D405B] hover:bg-[#4D506B] text-white font-bold py-3 rounded-xl transition-all"
              >
                Register
              </button>
            </div>

            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute h-px bg-[#3D405B] w-full"></div>
              <span className="relative bg-[#2A2E45] px-3 text-xs text-slate-500 font-bold uppercase">or</span>
            </div>

            <button
              onClick={login}
              className="w-full bg-white text-[#1E2336] font-bold py-3 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 font-[Outfit] bg-[#1E2336]">
      <TrainAlertOverlay jamAlertPayload={activeJamAlert} />
      <div className="max-w-5xl mx-auto">

        <DashboardHeader />

        {/* Search and Filter Section (No Icon) */}
        <div className="bg-[#3D405B] p-2 pl-3 rounded-2xl mb-8 flex items-center justify-between shadow-lg shadow-[#1E2336]/20">
          <div className="flex-1 flex items-center pl-4">
            <input
              type="text"
              placeholder="Search Gate Status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-white placeholder:text-slate-400 focus:outline-none text-lg"
            />
          </div>

          <div className="bg-[#4D506B] p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${viewMode === 'list'
                  ? 'bg-[#7B8191] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${viewMode === 'map'
                  ? 'bg-[#7B8191] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              Map
            </button>
          </div>
        </div>

        <DashboardStats gates={gates} />

        <div className="mt-8">
          <h2 className="text-white text-xl font-bold mb-4 opacity-90 tracking-wide border-b border-[#3D405B] pb-4 block">
            {viewMode === 'map' ? 'Live Map View' : 'Gate Status Overview'}
          </h2>

          {viewMode === 'map' ? (
            <div className="rounded-3xl overflow-hidden border-4 border-[#3D405B] shadow-2xl h-[500px]">
              <GateMap gates={gates} />
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {searchTerm && filteredGates.length === 0 && (
                <div className="bg-[#2A2E45] rounded-2xl p-8 text-center">
                  <p className="text-slate-400 text-lg">No gates found matching "{searchTerm}"</p>
                </div>
              )}

              {(searchTerm ? filteredGates : gates).map(gate => (
                <GateListItem
                  key={gate.id}
                  gate={gate}
                  onClick={(g) => setSelectedGate(g)}
                  isNearby={nearbyAlerts.includes(gate.id)}
                />
              ))}
            </div>
          )}
        </div>

        {selectedGate && viewMode === 'list' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E2336]/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#2A2E45] border border-[#3D405B] rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-4 flex justify-end">
                <button onClick={() => setSelectedGate(null)} className="text-slate-400 hover:text-white transition">Close</button>
              </div>

              <div className="text-center px-8 pb-10">
                <h2 className="text-2xl font-bold text-white mb-2">{selectedGate.name}</h2>
                <p className="text-slate-400 text-sm font-mono mb-6">{selectedGate.id.toUpperCase()}</p>

                <div className={`inline-flex items-center justify-center px-8 py-3 rounded-full text-lg font-bold mb-8 ${selectedGate.status === 'OPEN' ? 'bg-[#00D2A0]/20 text-[#00D2A0]' : 'bg-[#FF5C75]/20 text-[#FF5C75]'}`}>
                  <div className={`w-3 h-3 rounded-full mr-3 ${selectedGate.status === 'OPEN' ? 'bg-[#00D2A0] animate-pulse' : 'bg-[#FF5C75]'}`} />
                  {selectedGate.status}
                </div>

                <div className="grid grid-cols-2 gap-4 text-left bg-[#1E2336] p-6 rounded-2xl border border-[#3D405B]">
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1 tracking-wider">Latitude</p>
                    <p className="text-slate-300 font-mono text-lg">{selectedGate.latitude?.toFixed(6) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1 tracking-wider">Longitude</p>
                    <p className="text-slate-300 font-mono text-lg">{selectedGate.longitude?.toFixed(6) || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      {/* Floating Action Button for Customer Messages */}
      {user && <CustomerMessageFAB />}
    </div>
  );
}
