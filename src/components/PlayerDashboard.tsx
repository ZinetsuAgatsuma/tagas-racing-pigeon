import React, { useState, FormEvent } from 'react';
import { AuthUser, Player, Loft, RacingEvent, EventRegistration } from '../types';
import { 
  Home, 
  MapPin, 
  Calendar, 
  Key, 
  History, 
  AlertCircle, 
  CheckCircle, 
  Map, 
  Clock, 
  ChevronRight, 
  TrendingUp, 
  Gauge, 
  RefreshCw, 
  Trophy 
} from 'lucide-react';
import MapPicker from './MapPicker';

interface PlayerDashboardProps {
  user: AuthUser;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  players: Player[];
  lofts: Loft[];
  events: RacingEvent[];
  registrations: EventRegistration[];
  onClockCode: (code: string) => Promise<{ success: boolean; data?: EventRegistration; error?: string }>;
}

export default function PlayerDashboard({
  user,
  activeTab,
  setActiveTab,
  players,
  lofts,
  events,
  registrations,
  onClockCode
}: PlayerDashboardProps) {
  // 1. Identify current player profile and their lofts
  const playerProfile = players.find(p => p.id === user.playerId);
  const playerLofts = lofts.filter(l => l.ownerId === user.playerId);
  
  // 2. Identify player registrations
  const playerRegs = registrations.filter(r => r.playerId === user.playerId);
  
  // 3. Form clocking states
  const [clockingCode, setClockingCode] = useState('');
  const [formError, setFormError] = useState('');
  const [clockingSuccess, setClockingSuccess] = useState<EventRegistration | null>(null);
  const [loading, setLoading] = useState(false);

  // Stats
  const loftsCount = playerLofts.length;
  const joinedCount = playerRegs.length;
  const upcomingCount = events.filter(e => e.status === 'Upcoming' && playerRegs.some(r => r.eventId === e.id)).length;
  const clockedHistoryCount = playerRegs.filter(r => r.status !== 'Waiting').length;

  const handleClockingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setClockingSuccess(null);

    const normalizedCode = clockingCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
      setFormError('Please enter a valid 8-character clocking code.');
      return;
    }

    setLoading(true);
    const result = await onClockCode(normalizedCode);
    setLoading(false);

    if (result.success && result.data) {
      setClockingSuccess(result.data);
      setClockingCode('');
    } else {
      setFormError(result.error || 'Failed to clock. Please verify the code.');
    }
  };

  // Find overall best speed
  const clockedList = playerRegs.filter(r => r.status !== 'Waiting' && r.speed);
  const bestSpeed = clockedList.length > 0 
    ? Math.max(...clockedList.map(r => r.speed || 0)) 
    : null;

  return (
    <div className="space-y-6">
      {/* -------------------- Tab 1: Dashboard Overview -------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome Card */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-slate-950/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 uppercase tracking-wider">
                <span>Racer Profile Active</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight text-white">
                Welcome to PRCS, {user.fullName}!
              </h2>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Track your lofts, view upcoming race events, submit your landing clocking codes, and review final velocity scores on the leaderboard.
              </p>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">My Lofts</span>
                <span className="text-lg font-extrabold text-slate-900 font-mono leading-none mt-1 block">{loftsCount}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Joined Races</span>
                <span className="text-lg font-extrabold text-slate-900 font-mono leading-none mt-1 block">{joinedCount}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
              <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <History className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Pigeons Clocked</span>
                <span className="text-lg font-extrabold text-slate-900 font-mono leading-none mt-1 block">{clockedHistoryCount}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
              <div className="w-10 h-10 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center text-teal-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Personal Best</span>
                <span className="text-base font-extrabold text-slate-900 font-mono leading-none mt-1 block">
                  {bestSpeed ? `${bestSpeed.toLocaleString()} m/m` : 'No clocks'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Quick clocking portal */}
            <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-800 font-display flex items-center space-x-1.5">
                <Key className="w-4.5 h-4.5 text-[#10B981]" />
                <span>Express Clocking Gate</span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pigeon landed? Enter the exact 8-character clocking code assigned by admin.
              </p>
              <button
                onClick={() => setActiveTab('clocking-page')}
                className="w-full bg-[#10B981] hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1 cursor-pointer"
              >
                <span>Go to Clocking Gate</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick loft list card */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold text-sm text-slate-800 font-display">My Registered Lofts</h3>
                <button onClick={() => setActiveTab('my-loft')} className="text-xs font-bold text-[#10B981] hover:text-emerald-700">
                  Manage Maps
                </button>
              </div>

              <div className="space-y-3">
                {playerLofts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400 font-medium">
                    No lofts registered. Please contact Administrator to register your loft coordinates.
                  </div>
                ) : (
                  playerLofts.map(loft => (
                    <div key={loft.id} className="flex flex-col items-start gap-2 p-3.5 bg-slate-50 border border-gray-100 rounded-xl text-xs sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{loft.loftName}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{loft.address || 'No complete address'}</p>
                      </div>
                      <div className="text-right font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/30">
                        {loft.latitude.toFixed(4)}, {loft.longitude.toFixed(4)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- Tab 2: My Loft Details -------------------- */}
      {activeTab === 'my-loft' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold font-display text-gray-900">My Loft Coordinates</h2>
            <p className="text-xs text-gray-500 mt-1">
              Geographic boundaries of your lofts. Editing is locked. Contact system Administrator to make adjustments.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left lists */}
            <div className="lg:col-span-5 space-y-4">
              {playerLofts.length === 0 ? (
                <div className="bg-white border border-gray-200 p-6 rounded-2xl text-center text-xs text-gray-400 font-medium">
                  No registered lofts found for your player profile.
                </div>
              ) : (
                playerLofts.map(loft => (
                  <div key={loft.id} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-3.5">
                    <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                      <h3 className="font-bold text-sm text-gray-800 font-display">{loft.loftName}</h3>
                      <span className="font-mono text-[10px] font-bold text-gray-400">{loft.loftCode}</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Registered Address</span>
                        <p className="font-medium text-gray-700 mt-0.5">{loft.address || 'No address registered.'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Latitude</span>
                          <p className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100/50 w-fit mt-1">
                            {loft.latitude.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Longitude</span>
                          <p className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100/50 w-fit mt-1">
                            {loft.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right Map visualizer */}
            <div className="lg:col-span-7 bg-white border border-gray-200 p-4 rounded-2xl h-[300px] sm:h-[380px] shadow-sm flex flex-col space-y-1.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Geographic Map View</span>
              <div className="flex-1 min-h-0">
                {playerLofts.length > 0 ? (
                  <MapPicker
                    mode="view"
                    latitude={playerLofts[0].latitude}
                    longitude={playerLofts[0].longitude}
                    title={playerLofts[0].loftName}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-400 font-medium rounded-xl">
                    No coordinate map available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- Tab 3: Joined Events -------------------- */}
      {activeTab === 'joined-events' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold font-display text-gray-900">My Registered Racing Events</h2>
            <p className="text-xs text-gray-500 mt-1">
              Browse upcoming and ongoing race events where your loft is registered to fly. Hold on to your clocking codes securely!
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {playerRegs.length === 0 ? (
                <div className="p-12 text-center text-sm text-gray-400 font-medium">
                  You are not registered in any upcoming race events. Please contact the Administrator.
                </div>
              ) : (
                <table className="w-full min-w-[920px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase bg-gray-50/70 select-none">
                      <th className="px-6 py-4">Race Event Name</th>
                      <th className="px-6 py-4">Event Code</th>
                      <th className="px-6 py-4">Race Date</th>
                      <th className="px-6 py-4">Registered Loft</th>
                      <th className="px-6 py-4">Bird Ring Number</th>
                      <th className="px-6 py-4">Unique Clocking Code</th>
                      <th className="px-6 py-4">Race Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                    {playerRegs.map(r => {
                      const eventDetails = events.find(e => e.id === r.eventId);
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">{r.eventName}</td>
                          <td className="px-6 py-4 font-mono font-semibold text-gray-500">{r.eventCode}</td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-800">{eventDetails?.raceDate || 'N/A'}</p>
                            <p className="text-gray-400 text-[10px] mt-0.5">Release: {eventDetails?.releaseTime || '06:00 AM'}</p>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-700">{r.loftName}</td>
                          <td className="px-6 py-4 font-mono font-bold text-gray-900">{r.ringNumber}</td>
                          <td className="px-6 py-4">
                            <span className="font-mono font-extrabold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 select-all tracking-wider">
                              {r.clockingCode}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              eventDetails?.status === 'Upcoming'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : eventDetails?.status === 'Ongoing'
                                ? 'bg-blue-50 text-blue-700 border border-blue-100 animate-pulse'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {eventDetails?.status || 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- Tab 4: Clock Pigeon Page -------------------- */}
      {activeTab === 'clocking-page' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold font-display text-gray-900">Racer Clocking Gate</h2>
            <p className="text-xs text-gray-500 mt-1">
              Submit your 8-character clocking code immediately upon pigeon arrival to calculate and record landing metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Clocking Form */}
            <div className="lg:col-span-4 bg-white border border-gray-200 p-4 sm:p-6 rounded-2xl shadow-sm self-start space-y-4">
              <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">Enter Clocking Code</h3>
              
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-600">
                  <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleClockingSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unique Clocking Code</label>
                  <input
                    type="text"
                    value={clockingCode}
                    onChange={e => setClockingCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC12345"
                    maxLength={8}
                    className="w-full font-mono text-center text-sm font-bold tracking-widest uppercase px-3.5 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all select-all"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Format: 8 letters/numbers. Must exactly match your assigned code.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>Clock Pigeon Arrival</span>
                </button>
              </form>
            </div>

            {/* Results Display Panel */}
            <div className="lg:col-span-8">
              {clockingSuccess ? (
                /* ✓ Clocking Successful! Layout */
                <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center space-x-3 text-emerald-600">
                    <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
                    <div>
                      <h3 className="font-bold text-lg font-display text-emerald-800">✓ Clocking Successful!</h3>
                      <p className="text-xs text-emerald-600/80 mt-0.5">Velocity and parameters have been calculated using the Haversine formula.</p>
                    </div>
                  </div>

                  {/* LARGE SPEED CARD highlight */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 sm:p-6 rounded-2xl shadow-md flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider block">Landing Velocity</span>
                      <span className="text-2xl md:text-3xl font-extrabold font-mono mt-1 block">
                        {clockingSuccess.speed?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-100 tracking-wider uppercase block mt-1">meters / minute</span>
                    </div>
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/15">
                      <Gauge className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Operational details metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-100 text-xs">
                    <div className="space-y-1.5">
                      <p className="text-gray-400 font-semibold uppercase text-[9px] tracking-wider">Event Details</p>
                      <p className="font-bold text-gray-800">{clockingSuccess.eventName}</p>
                      <p className="text-gray-500 text-[10px]">Code: {clockingSuccess.eventCode}</p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-gray-400 font-semibold uppercase text-[9px] tracking-wider">Racer & Loft</p>
                      <p className="font-bold text-gray-800">{clockingSuccess.playerName}</p>
                      <p className="text-gray-500 text-[10px]">Loft: {clockingSuccess.loftName}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-gray-200/50 sm:border-t-0 sm:pt-0">
                      <p className="text-gray-400 font-semibold uppercase text-[9px] tracking-wider">Race Distance</p>
                      <p className="font-mono font-bold text-gray-800 text-sm">
                        {clockingSuccess.distance?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} meters
                      </p>
                      <p className="text-gray-400 text-[10px]">({((clockingSuccess.distance || 0)/1000).toFixed(2)} km)</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-gray-200/50 sm:border-t-0 sm:pt-0">
                      <p className="text-gray-400 font-semibold uppercase text-[9px] tracking-wider">Flight Elapsed Time</p>
                      <p className="font-mono font-bold text-gray-800 text-sm">{clockingSuccess.elapsedTime?.toFixed(2)} minutes</p>
                      <p className="text-gray-400 text-[10px]">Clock: {clockingSuccess.clockTime ? new Date(clockingSuccess.clockTime).toLocaleTimeString() : ''}</p>
                    </div>
                  </div>

                  {/* Standing Rank Summary */}
                  <div className="flex flex-col items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl sm:flex-row sm:items-center sm:space-x-3 sm:gap-0">
                    <Trophy className="w-6 h-6 text-amber-500 shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-amber-900">Current Event Placement</p>
                      <p className="text-amber-700 font-medium mt-0.5">
                        Your pigeon is currently ranked <strong className="font-mono text-sm text-amber-800">{clockingSuccess.rank || 'N/A'}</strong> of {registrations.filter(r => r.eventId === clockingSuccess.eventId).length} Registered Participants!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center text-xs text-gray-400 font-medium h-full flex flex-col items-center justify-center">
                  <Clock className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="font-bold text-gray-500">Awaiting Clock Submission</p>
                  <p className="max-w-xs mx-auto mt-1 leading-relaxed">
                    Submit your unique code in the sidebar form. Your flight metrics and speed calculations will appear here instantly.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- Tab 5: Race History -------------------- */}
      {activeTab === 'race-history' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold font-display text-gray-900">My Race Clocking History</h2>
            <p className="text-xs text-gray-500 mt-1">
              Review history of clocked velocities, landing timestamps, official flight distance parameters, and final ranks.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {clockedList.length === 0 ? (
                <div className="p-12 text-center text-sm text-gray-400 font-medium">
                  You have not submitted clockings for any race events yet.
                </div>
              ) : (
                <table className="w-full min-w-[920px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase bg-gray-50/70 select-none">
                      <th className="px-6 py-4">Race Event</th>
                      <th className="px-6 py-4">Registered Loft</th>
                      <th className="px-6 py-4 text-center">Clock landing Time</th>
                      <th className="px-6 py-4 text-right">Distance (m)</th>
                      <th className="px-6 py-4 text-right">Elapsed Time</th>
                      <th className="px-6 py-4 text-right">Speed (m/min)</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Current Rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                    {clockedList.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{r.eventName}</p>
                          <p className="text-gray-400 text-[10px] mt-0.5 font-mono">Code: {r.eventCode}</p>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-800">{r.loftName}</td>
                        <td className="px-6 py-4 text-center font-mono">
                          {r.clockTime ? (
                            <div>
                              <p className="font-bold text-gray-700">{new Date(r.clockTime).toLocaleTimeString()}</p>
                              <p className="text-gray-400 text-[10px] mt-0.5">{new Date(r.clockTime).toLocaleDateString()}</p>
                            </div>
                          ) : '--'}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium">
                          {r.distance ? r.distance.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '--'}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium">
                          {r.elapsedTime ? `${r.elapsedTime.toFixed(2)} min` : '--'}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-extrabold text-emerald-700 text-sm bg-emerald-50/5">
                          {r.speed ? r.speed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold ${
                            r.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-mono font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                            Rank {r.rank || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
