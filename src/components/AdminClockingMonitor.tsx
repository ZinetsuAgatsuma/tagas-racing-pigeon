import { useState, useEffect } from 'react';
import { EventRegistration, RacingEvent } from '../types';
import { Clock, CheckCircle, RefreshCw, Search, AlertCircle, Eye, Calendar, Award } from 'lucide-react';

interface AdminClockingMonitorProps {
  registrations: EventRegistration[];
  events: RacingEvent[];
  onVerifyRegistration: (id: string) => Promise<boolean>;
  onRefresh: () => void;
  errorMsg: string;
}

export default function AdminClockingMonitor({
  registrations,
  events,
  onVerifyRegistration,
  onRefresh,
  errorMsg
}: AdminClockingMonitorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [autoPoll, setAutoPoll] = useState(true);
  const [countdown, setCountdown] = useState(5);

  // Auto poll every 5 seconds for live race monitoring updates!
  useEffect(() => {
    if (!autoPoll) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onRefresh(); // trigger reload of db states from backend!
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPoll, onRefresh]);

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    await onVerifyRegistration(id);
    setVerifyingId(null);
  };

  // Filtered registrations
  const filteredRegs = registrations.filter(r => {
    const matchesSearch =
      r.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.loftName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clockingCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEvent = eventFilter === 'all' || r.eventId === eventFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesEvent && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900">Live Clocking Monitor</h2>
          <p className="text-xs text-gray-500 mt-1">
            Monitor real-time racing clocks, speeds (m/min), and verify participant entries as they land.
          </p>
        </div>

        {/* Real-time sync status indicator */}
        <div className="flex w-full flex-col items-stretch gap-3 shrink-0 sm:w-auto sm:flex-row sm:items-center sm:space-x-3 sm:gap-0">
          <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100/70 text-[11px] font-bold text-emerald-700">
            <span className={`w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 ${autoPoll ? 'animate-ping' : ''}`} />
            <span>{autoPoll ? `Live Tracking (${countdown}s)` : 'Polling Paused'}</span>
          </div>
          
          <button
            onClick={() => {
              onRefresh();
              setCountdown(5);
            }}
            className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl shadow-sm transition-all text-gray-500 hover:text-emerald-600 cursor-pointer"
            title="Manual sync"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <label className="flex items-center space-x-1.5 text-xs font-semibold text-gray-600 select-none">
            <input
              type="checkbox"
              checked={autoPoll}
              onChange={e => setAutoPoll(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500/20"
            />
            <span>Auto Refresh</span>
          </label>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tables & Filters Container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Filter controls bar */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
          <div className="relative w-full flex-1 md:max-w-xs">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by code, racer name..."
              className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-gray-500 font-medium">Race Event:</span>
              <select
                value={eventFilter}
                onChange={e => setEventFilter(e.target.value)}
                className="text-xs border border-gray-200 px-3 py-2 bg-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              >
                <option value="all">All Events</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.eventName}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-gray-500 font-medium">Clocking Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs border border-gray-200 px-3 py-2 bg-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="Waiting">Waiting (Unclocked)</option>
                <option value="Clocked">Clocked (Awaiting Verification)</option>
                <option value="Verified">Verified Results</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live List Table */}
        <div className="overflow-x-auto">
          {filteredRegs.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400 font-medium">
              No racers found with current filters.
            </div>
          ) : (
            <table className="w-full min-w-[1180px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase bg-gray-50/70 select-none">
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Player / Loft</th>
                  <th className="px-6 py-4">Racing Event</th>
                  <th className="px-6 py-4 text-center">Clock Time</th>
                  <th className="px-6 py-4 text-right">Distance (m)</th>
                  <th className="px-6 py-4 text-right">Elapsed Time</th>
                  <th className="px-6 py-4 text-right">Speed (m/min)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                {filteredRegs.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50/50 transition-colors ${r.status === 'Clocked' ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-6 py-4 font-mono font-bold text-gray-800 text-sm">{r.clockingCode}</td>
                    <td className="px-6 py-4 space-y-0.5">
                      <p className="font-bold text-gray-900">{r.playerName}</p>
                      <p className="text-gray-400 text-[10px]">Loft: {r.loftName}</p>
                    </td>
                    <td className="px-6 py-4 space-y-0.5">
                      <p className="font-semibold text-gray-800">{r.eventName}</p>
                      <p className="text-gray-400 text-[10px] font-mono">Code: {r.eventCode}</p>
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      {r.clockTime ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-800">
                            {new Date(r.clockTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(r.clockTime).toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-medium">--:--:--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium">
                      {r.distance ? r.distance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '--'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium">
                      {r.elapsedTime ? `${r.elapsedTime.toFixed(2)} min` : '--'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/10">
                      {r.speed ? (
                        <span>{r.speed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      ) : (
                        <span className="text-gray-400 font-normal">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                        r.status === 'Waiting'
                          ? 'bg-gray-100 text-gray-700 border border-gray-200'
                          : r.status === 'Clocked'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {r.status === 'Waiting' && <Clock className="w-3 h-3 mr-1 shrink-0" />}
                        {r.status === 'Clocked' && <Eye className="w-3 h-3 mr-1 shrink-0" />}
                        {r.status === 'Verified' && <CheckCircle className="w-3 h-3 mr-1 shrink-0" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {r.status === 'Clocked' ? (
                        <button
                          onClick={() => handleVerify(r.id)}
                          disabled={verifyingId === r.id}
                          className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg shadow-sm border border-emerald-500 hover:border-emerald-600 transition-colors cursor-pointer inline-flex items-center space-x-1"
                        >
                          {verifyingId === r.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          <span>Verify</span>
                        </button>
                      ) : r.status === 'Verified' ? (
                        <span className="text-[10px] font-bold text-gray-400">Verified ✓</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Pending Fly...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
