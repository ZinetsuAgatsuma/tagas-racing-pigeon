import { Player, Loft, RacingEvent, EventRegistration, AuditLog } from '../types';
import { Users, MapPin, Calendar, Award, Clock, ShieldCheck, Flag, Shield, Activity, ListOrdered } from 'lucide-react';

interface AdminDashboardProps {
  players: Player[];
  lofts: Loft[];
  events: RacingEvent[];
  registrations: EventRegistration[];
  auditLogs: AuditLog[];
  setActiveTab: (tab: string) => void;
}

export default function AdminDashboard({
  players,
  lofts,
  events,
  registrations,
  auditLogs,
  setActiveTab
}: AdminDashboardProps) {
  // Stat Counts
  const totalPlayers = players.length;
  const totalLofts = lofts.length;
  const totalEvents = events.length;
  const registeredParticipants = registrations.length;
  const clockedCount = registrations.filter(r => r.status === 'Clocked').length;
  const verifiedCount = registrations.filter(r => r.status === 'Verified').length;
  const waitingCount = registrations.filter(r => r.status === 'Waiting').length;
  const pendingPlayers = players.filter(p => p.status === 'Pending').length;

  // Find recent landing logs (clocked or verified)
  const recentClockings = [...registrations]
    .filter(r => r.status !== 'Waiting')
    .sort((a, b) => new Date(b.clockTime || 0).getTime() - new Date(a.clockTime || 0).getTime())
    .slice(0, 5);

  // Calculate event participation data for SVG chart
  const eventStats = events.map(evt => {
    const participantCount = registrations.filter(r => r.eventId === evt.id).length;
    const clockedInEvent = registrations.filter(r => r.eventId === evt.id && r.status !== 'Waiting').length;
    return {
      name: evt.eventName,
      code: evt.eventCode,
      participants: participantCount,
      clocked: clockedInEvent,
      percentage: participantCount > 0 ? (clockedInEvent / participantCount) * 100 : 0
    };
  }).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-slate-950/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Operational Console Live</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight text-white">Administrator Command Center</h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Welcome back! Monitor live pigeon races, coordinate player lofts, audit landing logs, and publish official final result certificates.
          </p>
        </div>
      </div>

      {pendingPlayers > 0 && (
        <button
          type="button"
          onClick={() => setActiveTab('players')}
          className="w-full text-left bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-5 py-4 text-sm font-semibold"
        >
          {pendingPlayers} player {pendingPlayers === 1 ? 'registration is' : 'registrations are'} waiting for approval. Review the live loft photo and GPS, then approve.
        </button>
      )}

      {/* Grid Cards Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Players */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Players</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono leading-none mt-1 block">{totalPlayers}</span>
          </div>
        </div>

        {/* Total Lofts */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Lofts</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono leading-none mt-1 block">{totalLofts}</span>
          </div>
        </div>

        {/* Racing Events */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Racing Events</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono leading-none mt-1 block">{totalEvents}</span>
          </div>
        </div>

        {/* Clocked Pigeons */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0 relative">
            <Clock className="w-5 h-5" />
            {clockedCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Verifies</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono leading-none mt-1 block">{clockedCount}</span>
          </div>
        </div>
      </div>

      {/* Analytics & Live Feeds section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Svg Chart and Quick Actions */}
        <div className="lg:col-span-7 space-y-6">
          {/* Participation Chart Widget */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 font-display">Event Participation & Clocking Trend</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Summary of lofts registered vs landing clocks completed.</p>
            </div>

            <div className="space-y-4">
              {eventStats.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  Create events and register participants to view analytics.
                </div>
              ) : (
                eventStats.map(stat => (
                  <div key={stat.code} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">{stat.name}</span>
                      <span className="font-mono text-[11px] text-[#10B981] font-bold">
                        {stat.clocked} clocked / {stat.participants} lofts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-xl h-3 overflow-hidden border border-slate-200/50 relative">
                      <div 
                        className="bg-gradient-to-r from-[#10B981] to-emerald-500 h-3 rounded-xl transition-all duration-500"
                        style={{ width: `${stat.percentage || 5}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Administrator Quick Actions */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-800 font-display">Administrative Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('players')}
                className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-[#10B981]/30 text-left rounded-xl transition-all group cursor-pointer"
              >
                <Users className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-800">Add Player</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Register new racers</p>
              </button>

              <button
                onClick={() => setActiveTab('lofts')}
                className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-[#10B981]/30 text-left rounded-xl transition-all group cursor-pointer"
              >
                <MapPin className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-800">Configure Loft</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Set loft map coordinates</p>
              </button>

              <button
                onClick={() => setActiveTab('events')}
                className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-[#10B981]/30 text-left rounded-xl transition-all group cursor-pointer"
              >
                <Calendar className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-800">Launch Race</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Schedule release points</p>
              </button>

              <button
                onClick={() => setActiveTab('registrations')}
                className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-[#10B981]/30 text-left rounded-xl transition-all group cursor-pointer"
              >
                <ListOrdered className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-800">Register Lofts</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Generate landing codes</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live feeds of landing activities */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live landing feed */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 font-display flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Live Landing Activity Feed</span>
              </h3>
              <button
                onClick={() => setActiveTab('clocking')}
                className="text-[10px] text-[#10B981] hover:text-emerald-700 font-bold font-display uppercase tracking-wider"
              >
                Monitor All
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {recentClockings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  No pigeons clocked yet in ongoing races.
                </div>
              ) : (
                recentClockings.map(clock => (
                  <div key={clock.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1.5 hover:bg-emerald-50/20 transition-colors">
                    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-bold text-slate-800 font-mono tracking-wide">{clock.clockingCode}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        clock.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' : 'bg-amber-50 text-amber-700 border border-amber-100/50'
                      }`}>
                        {clock.status}
                      </span>
                    </div>

                    <div className="text-slate-600 space-y-0.5">
                      <p className="font-semibold text-slate-900">{clock.playerName}</p>
                      <p className="text-slate-400 text-[10px]">{clock.loftName} • {clock.eventName}</p>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/50 text-[10px]">
                      <span className="text-slate-400">Velocity: <strong className="font-mono text-emerald-700">{clock.speed?.toLocaleString()} m/m</strong></span>
                      <span className="font-mono text-slate-500">
                        {clock.clockTime ? new Date(clock.clockTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick audit trace logs */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 font-display flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Recent System Events</span>
              </h3>
              <button
                onClick={() => setActiveTab('audit-logs')}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-medium"
              >
                View Logs
              </button>
            </div>

            <div className="space-y-2.5 font-mono text-[10px] text-slate-500 max-h-48 overflow-y-auto">
              {auditLogs.slice(0, 4).map(log => (
                <div key={log.id} className="pb-2 border-b border-slate-100 last:border-none last:pb-0">
                  <div className="flex flex-col gap-1 font-bold text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                    <span className="truncate max-w-[120px]">{log.action}</span>
                    <span className="text-slate-400 text-[9px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
