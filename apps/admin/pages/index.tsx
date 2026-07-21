import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import LocationPicker from '../components/LocationPicker';

interface Gate {
  id: string;
  name: string;
  status: 'OPEN' | 'CLOSED';
  latitude?: number;
  longitude?: number;
  isJammed?: boolean;
  jamAlertPayload?: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

interface NearMiss {
  id: string;
  gateId: string;
  gateName: string;
  timestamp: Timestamp;
}

interface CustomerMessage {
  id: string;
  message: string;
  senderEmail: string;
  senderName: string;
  timestamp: Timestamp;
}

export default function AdminDashboard() {
  const { user, isAdmin, loading, login, loginWithEmail, logout } = useAuth();
  const [gates, setGates] = useState<Gate[]>([]);
  const [nearMisses, setNearMisses] = useState<NearMiss[]>([]);
  const [customerMessages, setCustomerMessages] = useState<CustomerMessage[]>([]);
  const [newGateName, setNewGateName] = useState('');
  const [newGateLat, setNewGateLat] = useState('');
  const [newGateLng, setNewGateLng] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [editingGate, setEditingGate] = useState<Gate | null>(null);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async () => {
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setError("Login failed: " + err.message);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    const qBase = collection(db, 'gates');
    const q = query(qBase, orderBy('name'));
    const unsubscribeGates = onSnapshot(q, (snapshot) => {
      const gatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gate));
      setGates(gatesData);
    }, (error) => {
      console.error("Gates snapshot error:", error);
    });

    const qMisses = query(collection(db, 'near_misses'), orderBy('timestamp', 'desc'));
    const unsubscribeMisses = onSnapshot(qMisses, (snapshot) => {
      const missesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NearMiss));
      setNearMisses(missesData);
    }, (error) => {
      console.warn("Could not load near_misses:", error.message);
    });

    const qMessages = query(collection(db, 'customer_messages'), orderBy('timestamp', 'desc'));
    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerMessage));
      setCustomerMessages(messagesData);
    }, (error) => {
      console.warn("Could not load customer_messages:", error.message);
    });

    return () => {
      unsubscribeGates();
      unsubscribeMisses();
      unsubscribeMessages();
    };
  }, [isAdmin]);

  const handleSaveGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGateName.trim()) return;

    // Parse coordinates if provided
    const lat = newGateLat ? parseFloat(newGateLat) : undefined;
    const lng = newGateLng ? parseFloat(newGateLng) : undefined;

    try {
      if (editingGate) {
        // Update existing gate
        await updateDoc(doc(db, 'gates', editingGate.id), {
          name: newGateName,
          latitude: lat,
          longitude: lng,
          updatedAt: Timestamp.now(),
          updatedBy: user?.email
        });
        setEditingGate(null);
      } else {
        // Create new gate
        await addDoc(collection(db, 'gates'), {
          name: newGateName,
          status: 'OPEN',
          latitude: lat,
          longitude: lng,
          updatedAt: Timestamp.now(),
          updatedBy: user?.email
        });
      }
      setNewGateName('');
      setNewGateLat('');
      setNewGateLng('');
      setShowMap(false);
    } catch (err) {
      console.error("Error saving gate:", err);
    }
  };

  const startEdit = (gate: Gate) => {
    setEditingGate(gate);
    setNewGateName(gate.name);
    setNewGateLat(gate.latitude?.toString() || '');
    setNewGateLng(gate.longitude?.toString() || '');
    setShowMap(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingGate(null);
    setNewGateName('');
    setNewGateLat('');
    setNewGateLng('');
    setShowMap(false);
  };

  const toggleStatus = async (gate: Gate) => {
    const newStatus = gate.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await updateDoc(doc(db, 'gates', gate.id), {
        status: newStatus,
        isJammed: false, // Reset jam status when gate operates normally
        jamAlertPayload: null,
        updatedAt: Timestamp.now(),
        updatedBy: user?.email
      });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const simulateJam = async (gate: Gate) => {
    try {
      if (gate.isJammed) {
        // Clear the jam
        await updateDoc(doc(db, 'gates', gate.id), {
          isJammed: false,
          jamAlertPayload: null,
          updatedAt: Timestamp.now(),
          updatedBy: user?.email
        });
      } else {
        // Create the JSON payload simulating the Optical Flow detection
        const payload = {
          type: "CRITICAL_GATE_JAM",
          gateId: gate.id,
          gateName: gate.name,
          coordinates: { lat: gate.latitude || 0, lng: gate.longitude || 0 },
          instruction: "SLOW_DOWN_UNSECURED_CROSSING",
          detectedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'gates', gate.id), {
          isJammed: true,
          jamAlertPayload: JSON.stringify(payload, null, 2),
          // Force status to CLOSED if it was commanded to close but jammed
          status: 'CLOSED', 
          updatedAt: Timestamp.now(),
          updatedBy: user?.email
        });
      }
    } catch (err) {
      console.error("Error toggling jam state:", err);
    }
  };

  const simulateNearMiss = async (gate: Gate) => {
    if (gate.status !== 'CLOSED') return;

    // 1. Play Audio Warning (Tamil)
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const text = "எச்சரிக்கை! ரயில் வருகிறது. தயவுசெய்து தண்டவாளத்தை விட்டு விலகவும்.";
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ta-IN';
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Slightly higher pitch for urgency
      utterance.volume = 1.0;
      
      // Attempt to find a Tamil voice, or let the browser use its default for the language tag
      const voices = window.speechSynthesis.getVoices();
      const tamilVoice = voices.find(v => v.lang.includes('ta'));
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }

    // 2. Log Near Miss to Firestore
    try {
      await addDoc(collection(db, 'near_misses'), {
        gateId: gate.id,
        gateName: gate.name,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error logging near miss:", error);
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen relative flex items-center justify-center bg-[#0F172A] font-[Outfit] p-4">
        
        {/* Subtle Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="bg-[#111827] border border-slate-700/50 p-10 rounded-3xl w-full max-w-[420px] shadow-2xl relative z-10 flex flex-col pt-12">
          
          {/* Header/Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">RailPath Secured Access</h1>
            <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mt-1">Admin Authorization Required</p>
          </div>

          {error && (
            <div className="bg-rose-950/50 border-l-4 border-rose-500 p-3 mb-6 rounded-r-lg">
              <p className="text-rose-400 text-xs font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">Admin ID (Email)</label>
              <input
                type="email"
                className="w-full bg-[#1A233A] border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 text-sm transition-all shadow-inner"
                placeholder="admin@railpath.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">Passcode</label>
              <input
                type="password"
                className="w-full bg-[#1A233A] border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 text-sm transition-all shadow-inner"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            onClick={handleEmailLogin} 
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(8,145,178,0.5)] hover:shadow-[0_0_20px_rgba(8,145,178,0.8)] transition-all mb-6 text-sm tracking-wide"
          >
            Authenticate
          </button>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute h-px bg-slate-800 w-full"></div>
            <span className="relative bg-[#111827] px-4 text-xs font-bold text-slate-600 uppercase tracking-widest">or</span>
          </div>

          <button 
            onClick={login} 
            className="w-full bg-[#1C2333] hover:bg-[#252E42] border border-slate-700 hover:border-slate-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3 text-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google Logo" />
            <span>Sign in with Google</span>
          </button>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[#0F172A] font-[Outfit]">
        <div className="bg-[#111827] border border-rose-900/40 p-10 text-center rounded-3xl shadow-[0_0_50px_rgba(225,29,72,0.1)] max-w-md w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-rose-400"></div>
          
          <div className="w-20 h-20 mx-auto bg-rose-950/50 border border-rose-500/30 rounded-full flex items-center justify-center mb-6">
            <span className="text-rose-500 text-4xl">!</span>
          </div>

          <h1 className="text-2xl font-black text-rose-500 mb-2 tracking-tight">Access Denied</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            The credential <span className="text-white font-mono">{user.email}</span> does not have the necessary security clearance to view the Control Grid.
          </p>
          
          <button 
            onClick={logout} 
            className="w-full px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-xl font-bold transition-all text-sm"
          >
            Terminate Session (Logout)
          </button>
        </div>
      </main>
    );
  }

  // Admin Dashboard Component
  return (
    <div className="min-h-screen flex bg-[#0F172A] font-[Outfit]">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-[280px] bg-[#131B2C] border-r border-slate-800/80 flex flex-col justify-between hidden lg:flex rounded-none h-screen fixed">
        <div>
          {/* Logo Area */}
          <div className="p-8 pb-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <h1 className="text-white text-xl font-bold tracking-tight">RailPath</h1>
                <p className="text-[#00D2A0] text-xs font-bold tracking-widest uppercase">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-4 py-8 space-y-2">
            <a href="#" className="flex items-center gap-4 px-5 py-3.5 bg-[#1A233A] rounded-xl text-cyan-400 font-bold border border-slate-700/50 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
              <span>⊞</span>
              Dashboard
              <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,1)]"></div>
            </a>
            
            <a href="#" className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition border border-transparent font-medium">
              <span>🛡️</span>
              Control Grid
            </a>
            
            <a href="#" className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition border border-transparent font-medium">
              <span>📈</span>
              Live Monitor
            </a>
            
            <a href="#" className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition border border-transparent font-medium">
              <span>📊</span>
              Analytics
            </a>
            
            <a href="#" className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition border border-transparent font-medium">
              <span>👥</span>
              Users
            </a>
            
            <a href="#" className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition border border-transparent font-medium">
              <span>🔔</span>
              Alerts
            </a>
            
            <a href="#" className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition border border-transparent font-medium">
              <span>⚙️</span>
              Settings
            </a>
          </nav>
        </div>

        {/* Profile Card Bottom */}
        <div className="p-6">
          <div className="bg-[#1A2133] rounded-2xl p-4 flex items-center justify-between border border-slate-700/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-fuchsia-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-fuchsia-600/30">
                AD
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-sm font-bold truncate block">{user.displayName || 'Admin User'}</p>
                <p className="text-slate-500 text-xs truncate block">{user.email}</p>
              </div>
            </div>
            <button onClick={logout} className="text-slate-400 hover:text-red-400 transition pr-1" title="Log Out">
              ⏏
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT PORTION */}
      <main className="flex-1 lg:ml-[280px] p-8 md:p-12 relative max-w-[1600px] mx-auto w-full">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Mission Control Dashboard</h1>
            <p className="text-slate-400 text-lg">Railway Crossing Management System</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="bg-[#0D2838] border border-[#065A7F] px-5 py-2.5 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(6,90,127,0.3)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,1)]"></div>
              <span className="text-[#00E5FF] text-sm font-bold tracking-widest uppercase">System Online</span>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-1 block">Current Time</p>
              <p className="text-white font-mono text-xl">{new Date().toLocaleTimeString('en-US', { hour12: false })}</p>
            </div>
          </div>
        </header>

        {/* TOP STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          
          {/* Total Gates Card */}
          <div className="bg-[#111827] border border-cyan-900/40 rounded-2xl p-6 shadow-lg shadow-cyan-900/10 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-slate-300 font-medium">Total Gates</h3>
              <span className="text-cyan-400 text-xl">🛡️</span>
            </div>
            <div>
              <p className="text-4xl font-black text-cyan-400 mb-2">{gates.length}</p>
              <p className="text-slate-500 text-xs text-opacity-80">All systems operational</p>
            </div>
          </div>

          {/* Gates Open Card */}
          <div className="bg-[#111827] border border-emerald-900/40 rounded-2xl p-6 shadow-lg shadow-emerald-900/10 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-slate-300 font-medium">Gates Open</h3>
              <span className="text-emerald-400 text-xl">〰️</span>
            </div>
            <div>
              <p className="text-4xl font-black text-emerald-400 mb-2">{gates.filter(g => g.status === 'OPEN').length}</p>
              <p className="text-slate-500 text-xs text-opacity-80">Normal traffic flow</p>
            </div>
          </div>

          {/* Gates Closed Card */}
          <div className="bg-[#1C131D] border border-rose-900/40 rounded-2xl p-6 shadow-lg shadow-rose-900/10 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-slate-300 font-medium">Gates Closed</h3>
              <span className="text-rose-500 text-xl">⚠️</span>
            </div>
            <div>
              <p className="text-4xl font-black text-rose-500 mb-2">{gates.filter(g => g.status === 'CLOSED').length}</p>
              <p className="text-slate-500 text-xs text-opacity-80">Train approaching</p>
            </div>
          </div>

          {/* Near-Miss Events Card */}
          <div className="bg-[#1D1815] border border-amber-900/40 rounded-2xl p-6 shadow-lg shadow-amber-900/10 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-slate-300 font-medium">Near-Miss Events</h3>
              <span className="text-amber-500 text-xl">↗️</span>
            </div>
            <div>
              <p className="text-4xl font-black text-amber-500 mb-2">{nearMisses.length}</p>
              <p className="text-slate-500 text-xs text-opacity-80">Last 24 hours</p>
            </div>
          </div>

        </div>

        {/* CONTROL GRID TITLE */}
        <div className="bg-[#111827] border border-slate-800 rounded-t-2xl p-6 flex flex-col gap-1 border-b-0">
          <h2 className="text-white text-2xl font-bold">Control Grid</h2>
          <p className="text-slate-400 text-sm">Manage railway crossing gates in real-time</p>
        </div>

        {/* ADD GATE FORM (Styled differently now) */}
        <div className="bg-[#111827] p-6 border border-slate-800 border-t-0 flex gap-4">
          <form onSubmit={handleSaveGate} className="flex-1 flex gap-3">
            {/* Name Input */}
            <div className="flex-1">
              <input
                type="text"
                value={newGateName}
                onChange={(e) => setNewGateName(e.target.value)}
                placeholder={editingGate ? "Edit Gate Name" : "Gate Name"}
                className={`w-full px-4 py-2.5 bg-slate-900 rounded-lg border outline-none focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 text-sm transition ${editingGate ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700'}`}
                required
              />
            </div>

            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition flex items-center gap-2 whitespace-nowrap"
            >
              <span>📍</span> {showMap ? 'Hide Map' : 'Set Location'}
            </button>

            {editingGate ? (
              <div className="flex gap-2">
                <button type="submit" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-lg shadow-amber-600/20 transition text-sm whitespace-nowrap">
                  Update
                </button>
                <button type="button" onClick={cancelEdit} className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition text-sm whitespace-nowrap">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-600/20 transition text-sm whitespace-nowrap">
                + Add Gate
              </button>
            )}
          </form>
        </div>

        {/* Map Expandable Section */}
        {showMap && (
          <div className="mb-6 animate-fade-in-down">
            <LocationPicker
              initialLat={newGateLat ? parseFloat(newGateLat) : undefined}
              initialLng={newGateLng ? parseFloat(newGateLng) : undefined}
              onLocationSelect={(lat, lng) => {
                setNewGateLat(lat.toString());
                setNewGateLng(lng.toString());
              }}
            />
          </div>
        )}

        <div className="space-y-4 bg-[#111827] border border-slate-800 rounded-b-2xl p-6 border-t-0 mb-10">
          {gates.map((gate, index) => {
            // Mock data to match mockup aesthetic. In real app, these would come from the gate object
            const locationMock = `Zone ${String.fromCharCode(65 + (index % 4))} - ${['North', 'East', 'South', 'West'][index % 4]}`;
            const timeAgoMock = index === 0 ? '2 mins ago' : index === 1 ? '5 mins ago' : index === 2 ? '1 min ago' : '12 mins ago';
            
            return (
            <div key={gate.id} className="bg-[#1C2333] border border-slate-700/50 rounded-xl p-5 flex items-center justify-between hover:border-slate-600 transition-colors">
              
              {/* Left Column: Name & ID */}
              <div className="w-1/4">
                <h3 className="text-white font-bold text-lg leading-tight mb-1">{gate.name}</h3>
                <p className="text-cyan-400 text-xs font-mono">
                  RG-{gate.id.substring(0, 3).toUpperCase().padStart(3, '0')}
                </p>
              </div>

              {/* Middle Columns: Location & Time */}
              <div className="w-1/5">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Location</p>
                <p className="text-white text-sm">{locationMock}</p>
              </div>
              <div className="w-1/5">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Last Updated</p>
                <p className="text-slate-300 text-sm">{timeAgoMock}</p>
              </div>

              {/* Right Column: Controls */}
              <div className="flex items-center gap-6 justify-end flex-1">
                
                {/* Custom Toggle Switch */}
                <button 
                  onClick={() => toggleStatus(gate)}
                  className={`relative w-[60px] h-[30px] rounded-full transition-colors duration-300 border focus:outline-none flex items-center shrink-0 ${
                    gate.status === 'OPEN' 
                      ? 'bg-emerald-900/40 border-emerald-500/30' 
                      : 'bg-rose-900/40 border-rose-500/30'
                  }`}
                  aria-label="Toggle Gate Status"
                >
                  <div 
                    className={`absolute w-5 h-5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out ${
                      gate.status === 'OPEN' 
                        ? 'bg-[#00D2A0] translate-x-8 shadow-[0_0_15px_rgba(0,210,160,0.6)]' 
                        : 'bg-[#FF5C75] translate-x-1 shadow-[0_0_15px_rgba(255,92,117,0.6)]'
                    }`}
                  />
                </button>

                {/* Status Badge */}
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold border shrink-0 flex items-center justify-center min-w-[100px] ${
                  gate.status === 'OPEN' 
                    ? 'bg-emerald-900/20 text-[#00D2A0] border-[#00D2A0]/30' 
                    : 'bg-rose-900/20 text-[#FF5C75] border-[#FF5C75]/30'
                }`}>
                  <span className="mr-2 text-[10px]">●</span>
                  {gate.status}
                </span>

                {/* Action Buttons (Only show when closed to match logical flow) */}
                <div className="flex items-center gap-3 w-[280px] justify-end shrink-0">
                  {gate.status === 'CLOSED' ? (
                    <>
                      <button
                        onClick={() => simulateNearMiss(gate)}
                        className="px-5 py-2.5 bg-[#A855F7] hover:bg-[#9333EA] text-white text-sm font-bold rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2"
                        title="Simulate Pedestrian Whispering Audio Alert"
                      >
                        <span className="text-base">🔊</span> Near-Miss
                      </button>
                      <button
                        onClick={() => simulateJam(gate)}
                        className={`px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
                          gate.isJammed 
                            ? 'bg-amber-600 border border-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.5)]' 
                            : 'bg-amber-500 hover:bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        }`}
                        title="Simulate Optical Flow Gate Jam Detection"
                      >
                        <span className="text-base">⚠️</span> {gate.isJammed ? 'Clear Jam' : 'Simulate Jam'}
                      </button>
                    </>
                  ) : (
                    // Empty placeholder to keep alignment
                    <div className="w-full"></div>
                  )}
                </div>

              </div>
            </div>
          )})}
          {gates.length === 0 && (
            <div className="text-center py-20 text-slate-500 bg-[#1C2333] rounded-xl border border-slate-700/50">
              Grid Empty. Initialize Sector.
            </div>
          )}
        </div>

        {/* ENGINEERING VIEW (NEAR MISS LOGS) */}
        <div className="bg-[#1C131D] border border-rose-900/40 rounded-2xl p-6 shadow-lg mb-8 relative overflow-hidden">
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-white text-xl font-bold flex items-center gap-3">
                <span className="text-rose-500 border border-rose-500 rounded-full w-6 h-6 flex items-center justify-center text-sm font-black">!</span>
                Engineering View - Pedestrian Near-Miss Logs
              </h2>
              <p className="text-slate-400 text-sm mt-1 ml-9">Real-time event monitoring and alerts</p>
            </div>
            
            <div className="bg-rose-950/50 border border-rose-900/50 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_10px_rgba(225,29,72,0.2)]">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,1)] animate-pulse"></div>
              <span className="text-rose-400 text-xs font-bold tracking-widest uppercase">Live</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-4 py-4 w-48">Timestamp</th>
                  <th className="px-4 py-4 w-32">Gate ID</th>
                  <th className="px-4 py-4">Location</th>
                  <th className="px-4 py-4">Event Type</th>
                  <th className="px-4 py-4 w-32">Severity</th>
                  <th className="px-4 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {nearMisses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic bg-[#150F16]">
                      No near-miss events logged.
                    </td>
                  </tr>
                ) : (
                  nearMisses.map((miss, i) => {
                    const isCritical = i % 2 !== 0; // Mock oscillating severity for demo
                    const locationStr = `Zone ${String.fromCharCode(65 + (i % 4))} - ${['North', 'East', 'South', 'West'][i % 4]}`;
                    
                    return (
                      <tr key={miss.id} className="hover:bg-[#251821] transition-colors border-l-2 border-transparent hover:border-l-rose-500">
                        <td className="px-4 py-3.5">
                          <span className="text-cyan-400 font-mono text-xs flex items-center gap-2">
                            <span className="text-lg">🕒</span>
                            {miss.timestamp?.toDate().toLocaleTimeString('en-US', { hour12: false }) || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 font-mono text-xs">
                          RG-{miss.gateId.substring(0, 3).toUpperCase().padStart(3, '0')}
                        </td>
                        <td className="px-4 py-3.5 text-slate-300">
                          {miss.gateName} <span className="text-slate-500 text-xs block">{locationStr}</span>
                        </td>
                        <td className="px-4 py-3.5 text-white font-bold">
                          Pedestrian Detection
                        </td>
                        <td className="px-4 py-3.5 mt-2 inline-flex">
                          {isCritical ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-500 border border-rose-900/50">CRITICAL</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-500 border border-amber-900/50">WARNING</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">
                          {isCritical ? 'Pedestrian crossed during gate closure' : 'Multiple pedestrians near track'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Messages Panel */}
        <div className="mt-8 mb-8 bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <span>💬</span> Customer Feedback & Messages
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {customerMessages.length === 0 ? (
              <p className="text-slate-500 text-sm italic text-center py-8">No messages from customers yet.</p>
            ) : (
              customerMessages.map((msg) => (
                <div key={msg.id} className="bg-slate-900 border border-slate-700/50 p-4 rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                    <div>
                      <p className="text-sm font-bold text-white">{msg.senderName}</p>
                      <p className="text-xs text-slate-400">{msg.senderEmail}</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {msg.timestamp?.toDate().toLocaleString() || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
