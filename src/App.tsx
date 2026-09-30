import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { AuthUser, Player, Loft, RacingEvent, EventRegistration, AuditLog, AppNotification } from './types';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AdminDashboard from './components/AdminDashboard';
import AdminPlayers from './components/AdminPlayers';
import AdminLofts from './components/AdminLofts';
import AdminEvents from './components/AdminEvents';
import AdminRegistrations from './components/AdminRegistrations';
import AdminClockingMonitor from './components/AdminClockingMonitor';
import AdminLeaderboard from './components/AdminLeaderboard';
import AdminAuditLogs from './components/AdminAuditLogs';
import ReportView from './components/ReportView';
import PlayerDashboard from './components/PlayerDashboard';
import PlayerSelfRegister from './components/PlayerSelfRegister';
import { Compass, ShieldAlert, Key, Loader2, RefreshCw } from 'lucide-react';

const AUTH_STORAGE_KEY = 'prcs_user';

export default function App() {
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [apiError, setApiError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  // Core Data States
  const [players, setPlayers] = useState<Player[]>([]);
  const [lofts, setLofts] = useState<Loft[]>([]);
  const [events, setEvents] = useState<RacingEvent[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [footerTime, setFooterTime] = useState('');

  const getDefaultTabForUser = (authUser: AuthUser | null) => {
    if (!authUser) {
      return 'dashboard';
    }

    return authUser.role === 'Player' ? 'clocking-page' : 'dashboard';
  };

  const persistUserSession = (authUser: AuthUser) => {
    // Stored in localStorage with no TTL so the session remains until explicit logout.
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
  };

  const clearUserSession = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // Live footer clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setFooterTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setActiveTab(getDefaultTabForUser(parsed));
      } catch (e) {
        clearUserSession();
      }
    }
    setLoading(false);
  }, []);

  // 2. Fetch all databases from Express endpoints
  const fetchAllData = useCallback(async () => {
    if (!user) return;
    try {
      const [playersRes, loftsRes, eventsRes, regsRes, auditRes, notifRes] = await Promise.all([
        fetch(apiUrl('/api/players')),
        fetch(apiUrl('/api/lofts')),
        fetch(apiUrl('/api/events')),
        fetch(apiUrl('/api/registrations')),
        fetch(apiUrl('/api/audit-logs')),
        fetch(apiUrl('/api/notifications'))
      ]);

      if (playersRes.ok) setPlayers(await playersRes.json());
      if (loftsRes.ok) setLofts(await loftsRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (regsRes.ok) setRegistrations(await regsRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
    } catch (err) {
      console.error('Failed to sync state from backend database:', err);
      setApiError('Unable to connect to service. Please refresh or try again.');
    }
  }, [user]);

  // Fetch data whenever user logs in
  useEffect(() => {
    if (user) {
      fetchAllData();
      // Periodically sync notifications or live clocks
      const interval = setInterval(fetchAllData, 15000);
      return () => clearInterval(interval);
    }
  }, [user, fetchAllData]);

  // 3. Handlers
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthenticating(true);

    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        persistUserSession(data.user);
        setActiveTab(getDefaultTabForUser(data.user));
        setPassword('');
      } else {
        const errData = await res.json();
        setLoginError(errData.error || 'Authentication failed.');
      }
    } catch (err) {
      setLoginError('Failed to establish contact with login server.');
    }
    setAuthenticating(false);
  };

  const handleLogout = () => {
    setUser(null);
    clearUserSession();
    setActiveTab(getDefaultTabForUser(null));
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeTab, user]);

  const handleMarkNotificationsRead = async () => {
    try {
      const res = await fetch(apiUrl('/api/notifications/read-all'), { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 4. CRUD Wrapper Handlers

  // Players
  const handleAddPlayer = async (playerData: any): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl('/api/players'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData)
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to add player');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  const handleUpdatePlayer = async (id: string, playerData: any): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl(`/api/players/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData)
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to update player');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  const handleDeletePlayer = async (id: string): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl(`/api/players/${id}`), { method: 'DELETE' });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to delete player');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  // Lofts
  const handleAddLoft = async (loftData: any): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl('/api/lofts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loftData)
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to register loft');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  const handleUpdateLoft = async (id: string, loftData: any): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl(`/api/lofts/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loftData)
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to update loft');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  const handleDeleteLoft = async (id: string): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl(`/api/lofts/${id}`), { method: 'DELETE' });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to delete loft');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  // Events
  const handleAddEvent = async (eventData: any): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl('/api/events'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to create event');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  const handleUpdateEvent = async (id: string, eventData: any): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl(`/api/events/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to update event');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  const handleDeleteEvent = async (id: string): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl(`/api/events/${id}`), { method: 'DELETE' });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to delete event');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  // Registrations
  const handleAddRegistration = async (regData: any): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl('/api/registrations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to register loft');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  const handleImportRegistrations = async (
    rows: any[]
  ): Promise<{ success: boolean; importedCount?: number; error?: string; details?: string[] }> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl('/api/registrations/import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      });

      const payload = await res.json();

      if (res.ok) {
        await fetchAllData();
        return { success: true, importedCount: payload.importedCount || 0 };
      }

      const errorMessage = payload.error || 'Failed to import registrations';
      setApiError(errorMessage);
      return {
        success: false,
        error: errorMessage,
        details: Array.isArray(payload.details) ? payload.details : undefined
      };
    } catch (e) {
      const errorMessage = 'Network connection issue.';
      setApiError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const handleDeleteRegistration = async (id: string): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl(`/api/registrations/${id}`), { method: 'DELETE' });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to remove registration');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  // Clocking verification
  const handleVerifyRegistration = async (id: string): Promise<boolean> => {
    setApiError('');
    try {
      const res = await fetch(apiUrl(`/api/registrations/${id}/verify`), { method: 'POST' });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to verify clocking');
      }
    } catch (e) {
      setApiError('Network connection issue.');
    }
    return false;
  };

  // Player Pigeon Clocking submit
  const handleClockCode = async (code: string): Promise<{ success: boolean; data?: EventRegistration; error?: string }> => {
    if (!user || !user.playerId) return { success: false, error: 'Unauthenticated' };
    try {
      const res = await fetch(apiUrl('/api/clock'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clockingCode: code, playerId: user.playerId })
      });
      if (res.ok) {
        const resData = await res.json();
        await fetchAllData();
        return { success: true, data: resData.data };
      } else {
        const err = await res.json();
        return { success: false, error: err.error || 'Clocking failed' };
      }
    } catch (e) {
      return { success: false, error: 'Unable to communicate with the GPS clock server.' };
    }
  };

  // 5. Layout Rendering Logic
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-sm font-semibold tracking-wide uppercase font-mono">Initializing flight services...</p>
      </div>
    );
  }

  if (!user && showRegister) {
    return <PlayerSelfRegister apiUrl={apiUrl} onBack={() => setShowRegister(false)} />;
  }

  if (!user) {
    // Elegant, pristine slate/emerald Login card
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Decorative blur elements */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-4">
          <div className="inline-flex w-14 h-14 bg-emerald-500 rounded-2xl items-center justify-center shadow-2xl shadow-emerald-500/30">
            <Compass className="w-7 h-7 text-slate-950" />
          </div>
          <h2 className="text-center text-3xl font-extrabold font-display tracking-tight text-white">
            PRCS Flight Clock
          </h2>
          <p className="text-center text-xs text-slate-400 max-w-xs mx-auto">
            Pigeon Racing Clocking System — Role-based Authentication Portal
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-slate-900 border border-slate-800/80 py-8 px-6 shadow-2xl rounded-3xl sm:px-10 space-y-6">
            
            {loginError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-2.5 text-xs text-red-400">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-red-500 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Account Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. admin or racer01"
                  className="w-full text-xs px-4 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Secure Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs px-4 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all text-white font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authenticating}
                className="w-full flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/10 transition-all cursor-pointer disabled:opacity-50 text-xs text-white"
              >
                {authenticating && <RefreshCw className="w-4 h-4 animate-spin text-white mr-1.5" />}
                <span>Access Dashboard</span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="w-full rounded-xl border border-slate-700 py-3 text-xs font-bold text-slate-200 transition-colors hover:border-emerald-500 hover:text-white"
            >
              Register as a player
            </button>
            <p className="text-center text-[11px] leading-relaxed text-slate-500">
              New racers take a live loft photo. GPS on that photo is saved as the loft location, then an admin approves the account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard shells (Sidebar + Navbar + Container)
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 lg:flex lg:flex-row">
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar 
          user={user} 
          onLogout={handleLogout} 
          notifications={notifications} 
          onMarkNotificationsRead={handleMarkNotificationsRead} 
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Action Error Alerts */}
        {apiError && (
          <div className="mx-4 mt-4 p-3.5 bg-red-50 border border-red-200 text-xs text-red-600 rounded-xl flex items-center space-x-2 no-print sm:mx-6 sm:mt-6">
            <ShieldAlert className="w-4.5 h-4.5 text-red-500 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {user.role === 'Administrator' ? (
            /* ==================== Administrator Screens ==================== */
            <>
              {activeTab === 'dashboard' && (
                <AdminDashboard
                  players={players}
                  lofts={lofts}
                  events={events}
                  registrations={registrations}
                  auditLogs={auditLogs}
                  setActiveTab={setActiveTab}
                />
              )}
              {activeTab === 'players' && (
                <AdminPlayers
                  players={players}
                  onAddPlayer={handleAddPlayer}
                  onEditPlayer={handleUpdatePlayer}
                  onDeletePlayer={handleDeletePlayer}
                  errorMsg={apiError}
                />
              )}
              {activeTab === 'lofts' && (
                <AdminLofts
                  lofts={lofts}
                  players={players}
                  onAddLoft={handleAddLoft}
                  onEditLoft={handleUpdateLoft}
                  onDeleteLoft={handleDeleteLoft}
                  errorMsg={apiError}
                />
              )}
              {activeTab === 'events' && (
                <AdminEvents
                  events={events}
                  onAddEvent={handleAddEvent}
                  onEditEvent={handleUpdateEvent}
                  onDeleteEvent={handleDeleteEvent}
                  errorMsg={apiError}
                />
              )}
              {activeTab === 'registrations' && (
                <AdminRegistrations
                  registrations={registrations}
                  events={events}
                  players={players}
                  lofts={lofts}
                  onAddRegistration={handleAddRegistration}
                  onImportRegistrations={handleImportRegistrations}
                  onDeleteRegistration={handleDeleteRegistration}
                  errorMsg={apiError}
                />
              )}
              {activeTab === 'clocking' && (
                <AdminClockingMonitor
                  registrations={registrations}
                  events={events}
                  onVerifyRegistration={handleVerifyRegistration}
                  onRefresh={fetchAllData}
                  errorMsg={apiError}
                />
              )}
              {activeTab === 'leaderboards' && (
                <AdminLeaderboard
                  registrations={registrations}
                  events={events}
                  lofts={lofts}
                  onRefresh={fetchAllData}
                />
              )}
              {activeTab === 'reports' && (
                <ReportView onRefresh={fetchAllData} />
              )}
              {activeTab === 'audit-logs' && (
                <AdminAuditLogs logs={auditLogs} />
              )}
            </>
          ) : (
            /* ==================== Player Screens ==================== */
            <>
              {activeTab === 'leaderboards' ? (
                /* Shared Standings View */
                <AdminLeaderboard
                  registrations={registrations}
                  events={events}
                  lofts={lofts}
                  onRefresh={fetchAllData}
                />
              ) : (
                /* Combined Player Tabs */
                <PlayerDashboard
                  user={user}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  players={players}
                  lofts={lofts}
                  events={events}
                  registrations={registrations}
                  onClockCode={handleClockCode}
                />
              )}
            </>
          )}
        </main>

        {/* Footer status bar */}
        <footer className="no-print mt-auto bg-white border-t border-slate-200 px-4 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-2 sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-start">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">System Live</span>
            </div>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-mono">Server Time: {footerTime || 'Syncing...'}</span>
          </div>
          <div className="text-center text-xs text-slate-400 font-medium sm:text-right">
            &copy; 2026 SkyTrack Racing Systems. Precise Geolocation Enabled.
          </div>
        </footer>
      </div>
    </div>
  );
}
