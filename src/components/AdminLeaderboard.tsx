import { useState, useEffect } from 'react';
import { EventRegistration, RacingEvent, Loft } from '../types';
import { Award, Search, Trophy, MapPin, RefreshCw, Map } from 'lucide-react';
import MapPicker from './MapPicker';

interface AdminLeaderboardProps {
  registrations: EventRegistration[];
  events: RacingEvent[];
  lofts: Loft[];
  onRefresh: () => void;
}

export default function AdminLeaderboard({ registrations, events, lofts, onRefresh }: AdminLeaderboardProps) {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');

  // Default to first ongoing or first event overall
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      const activeEvent = events.find(e => e.status === 'Ongoing') || events[0];
      setSelectedEventId(activeEvent.id);
    }
  }, [events, selectedEventId]);

  const currentEvent = events.find(e => e.id === selectedEventId);

  // Filter registrations clocked for this event and sort by speed descending
  const leaderboardData = registrations
    .filter(r => r.eventId === selectedEventId && r.status !== 'Waiting')
    .sort((a, b) => (b.speed || 0) - (a.speed || 0));

  // Get unclocked registrations for this event
  const unclockedData = registrations
    .filter(r => r.eventId === selectedEventId && r.status === 'Waiting');

  // Prepare map coordinates for GPS visualization
  const participatingLoftsForMap = registrations
    .filter(r => r.eventId === selectedEventId)
    .map(r => {
      // Find matching loft coordinates
      const matchedLoft = lofts.find(l => l.id === r.loftId);
      return {
        name: r.loftName,
        ownerName: r.playerName,
        latitude: matchedLoft?.latitude || r.loftLatitude,
        longitude: matchedLoft?.longitude || r.loftLongitude,
        distance: r.distance || undefined
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 flex items-center space-x-2">
            <Trophy className="w-5.5 h-5.5 text-amber-500 shrink-0" />
            <span>Race Leaderboard & Standings</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Real-time speed calculations and rank standings sorted by meters per minute performance.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex w-full flex-wrap items-center gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200 sm:w-auto sm:flex-nowrap sm:space-x-2 sm:gap-0">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Leaderboard Table
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            GPS Race Visualization
          </button>
        </div>
      </div>

      {/* Selector and overall event summary card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Selector Panel */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm space-y-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Select Race Event</label>
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-semibold"
          >
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.eventName} ({e.status})</option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            className="w-full flex items-center justify-center space-x-1.5 border border-gray-200 hover:bg-gray-50 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer text-gray-600"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Live Scores</span>
          </button>
        </div>

        {/* Status Summary Cards */}
        {currentEvent && (
          <div className="md:col-span-3 bg-white border border-gray-200 p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:border-r sm:border-gray-100 sm:last:border-none sm:pr-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Race Point</span>
              <p className="font-bold text-sm text-gray-800 mt-1 font-display leading-tight truncate">{currentEvent.releasePointName}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Release: <span className="font-mono font-semibold">{currentEvent.releaseTime}</span></p>
            </div>
            
            <div className="sm:border-r sm:border-gray-100 sm:last:border-none sm:pr-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Leader Speed</span>
              <p className="font-extrabold text-lg text-emerald-600 mt-1 font-mono">
                {leaderboardData[0]?.speed ? `${leaderboardData[0].speed.toLocaleString()} m/m` : '--'}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Held by: <span className="font-semibold">{leaderboardData[0]?.playerName || 'N/A'}</span></p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Clocking Progress</span>
              <p className="font-extrabold text-lg text-slate-800 mt-1 font-mono">
                {leaderboardData.length} <span className="text-xs font-semibold text-gray-400">/ {leaderboardData.length + unclockedData.length}</span>
              </p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(leaderboardData.length / (leaderboardData.length + unclockedData.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Render Main Content depending on Tab */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rankings Leaderboard</h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Live sorted by Velocity (m/min)
            </span>
          </div>

          <div className="overflow-x-auto">
            {leaderboardData.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400 font-medium">
                No pigeons clocked yet in this race event. Waiting for first clocks...
              </div>
            ) : (
              <table className="w-full min-w-[920px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase bg-gray-50/70 select-none">
                    <th className="px-6 py-4 text-center">Rank</th>
                    <th className="px-6 py-4">Racer Player</th>
                    <th className="px-6 py-4">Loft Name</th>
                    <th className="px-6 py-4 text-right">Distance (m)</th>
                    <th className="px-6 py-4 text-center">Clock Time</th>
                    <th className="px-6 py-4 text-right">Elapsed Time</th>
                    <th className="px-6 py-4 text-right">Velocity (m/min)</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                  {leaderboardData.map((r, idx) => (
                    <tr 
                      key={r.id} 
                      className={`hover:bg-gray-50/40 transition-colors ${
                        idx === 0 
                          ? 'bg-amber-50/10' 
                          : idx === 1 
                          ? 'bg-slate-50/10' 
                          : idx === 2 
                          ? 'bg-orange-50/10' 
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          {idx === 0 ? (
                            <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm shadow-amber-500/20">1</span>
                          ) : idx === 1 ? (
                            <span className="w-6 h-6 bg-slate-400 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm shadow-slate-400/20">2</span>
                          ) : idx === 2 ? (
                            <span className="w-6 h-6 bg-amber-700/80 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm shadow-amber-800/20">3</span>
                          ) : (
                            <span className="w-6 h-6 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-xs font-semibold">{idx + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">{r.playerName}</td>
                      <td className="px-6 py-4 font-medium text-gray-700">{r.loftName}</td>
                      <td className="px-6 py-4 text-right font-mono font-medium">
                        {r.distance ? r.distance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '--'}
                      </td>
                      <td className="px-6 py-4 text-center font-mono">
                        {r.clockTime ? new Date(r.clockTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium">
                        {r.elapsedTime ? `${r.elapsedTime.toFixed(2)} min` : '--'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-extrabold text-emerald-700 text-sm bg-emerald-50/10">
                        {r.speed ? r.speed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold ${
                          r.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* GPS Visualization tab */
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-gray-800 flex items-center space-x-1.5">
                <Map className="w-4 h-4 text-emerald-600" />
                <span>Geographic GPS Flyway Map</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Visualize release point and all player loft connections geographically.</p>
            </div>
          </div>

          <div className="h-[320px] sm:h-[460px] relative">
            {currentEvent ? (
              <MapPicker
                mode="routes"
                releasePoint={{
                  name: currentEvent.releasePointName,
                  latitude: currentEvent.latitude,
                  longitude: currentEvent.longitude
                }}
                lofts={participatingLoftsForMap}
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400 font-medium rounded-xl">
                Select an event to view race map routes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
