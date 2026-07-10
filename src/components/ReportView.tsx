import { useState, useEffect } from 'react';
import { Player, Loft, RacingEvent, EventRegistration, AuditLog } from '../types';
import { FileText, Printer, Download, Eye, Table, RefreshCw } from 'lucide-react';

interface ReportViewProps {
  onRefresh: () => void;
}

export default function ReportView({ onRefresh }: ReportViewProps) {
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

  const [reportType, setReportType] = useState<'players' | 'lofts' | 'events' | 'participants' | 'clocking' | 'results'>('results');
  const [selectedEventId, setSelectedEventId] = useState('');
  
  // Data State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    players: Player[];
    lofts: Loft[];
    events: RacingEvent[];
    registrations: EventRegistration[];
    auditLogs: AuditLog[];
  } | null>(null);

  // Fetch report data on mount or refresh
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/reports'));
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        if (data.events.length > 0 && !selectedEventId) {
          setSelectedEventId(data.events[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load reports summary data:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `report_${reportType}`;

    if (reportType === 'players') {
      headers = ['Player ID', 'Full Name', 'Username', 'Email', 'Contact Number', 'Address', 'Status', 'Registered Date'];
      rows = reportData.players.map(p => [
        p.id, p.fullName, p.username, p.email, p.contactNumber, `"${p.address}"`, p.status, new Date(p.createdAt).toLocaleDateString()
      ]);
    } else if (reportType === 'lofts') {
      headers = ['Loft Code', 'Loft Name', 'Owner Player', 'Latitude', 'Longitude', 'Complete Address'];
      rows = reportData.lofts.map(l => [
        l.loftCode, l.loftName, l.ownerName, l.latitude, l.longitude, `"${l.address}"`
      ]);
    } else if (reportType === 'events') {
      headers = ['Event Code', 'Event Name', 'Race Date', 'Release Point', 'Province', 'Municipality', 'Latitude', 'Longitude', 'Release Time', 'Status'];
      rows = reportData.events.map(e => [
        e.eventCode, e.eventName, e.raceDate, e.releasePointName, e.province, e.municipality, e.latitude, e.longitude, e.releaseTime, e.status
      ]);
    } else if (reportType === 'participants') {
      headers = ['Clocking Code', 'Event Code', 'Event Name', 'Player Name', 'Loft Name', 'Registered Date'];
      rows = reportData.registrations.map(r => [
        r.clockingCode, r.eventCode, r.eventName, r.playerName, r.loftName, new Date(r.createdAt).toLocaleDateString()
      ]);
    } else if (reportType === 'clocking') {
      headers = ['Code', 'Player Name', 'Loft Name', 'Event Name', 'Time Clocked', 'Distance (m)', 'Elapsed Time (min)', 'Speed (m/min)', 'Status'];
      rows = reportData.registrations
        .filter(r => r.status !== 'Waiting')
        .map(r => [
          r.clockingCode, r.playerName, r.loftName, r.eventName, r.clockTime ? new Date(r.clockTime).toLocaleString() : '', r.distance || '', r.elapsedTime || '', r.speed || '', r.status
        ]);
    } else if (reportType === 'results') {
      const activeEvent = reportData.events.find(e => e.id === selectedEventId);
      filename = `results_${activeEvent?.eventCode || 'race'}`;
      headers = ['Rank', 'Player Name', 'Loft Name', 'Distance (m)', 'Clock Time', 'Elapsed Time (min)', 'Speed (m/min)', 'Status'];
      
      const eventLeaderboard = reportData.registrations
        .filter(r => r.eventId === selectedEventId && r.status !== 'Waiting')
        .sort((a, b) => (b.speed || 0) - (a.speed || 0));

      rows = eventLeaderboard.map((r, idx) => [
        idx + 1, r.playerName, r.loftName, r.distance || '', r.clockTime ? new Date(r.clockTime).toLocaleTimeString() : '', r.elapsedTime || '', r.speed || '', r.status
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActiveEvent = () => reportData?.events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Top action controls bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 flex items-center space-x-2">
            <FileText className="w-5.5 h-5.5 text-emerald-600 shrink-0" />
            <span>Reports & Exports Console</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Generate printable PDF reports, certificates, and export full racing rosters to Microsoft Excel sheets.
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:space-x-2 sm:gap-0">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 rounded-xl transition-all cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Generate PDF Report</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel CSV</span>
          </button>
        </div>
      </div>

      {/* Dataset Filter Tabs */}
      <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm no-print">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'results', label: 'Race Leaderboard' },
            { id: 'players', label: 'Players Roster' },
            { id: 'lofts', label: 'Registered Lofts' },
            { id: 'events', label: 'Racing Events' },
            { id: 'participants', label: 'Participants & Codes' },
            { id: 'clocking', label: 'Clocking Logs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {reportType === 'results' && reportData && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:space-x-3 sm:gap-0">
            <span className="text-xs text-gray-500 font-bold">Select Race Event:</span>
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="text-xs border border-gray-200 px-3 py-2 bg-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
            >
              {reportData.events.map(e => (
                <option key={e.id} value={e.id}>{e.eventName} ({e.status})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Printable Report Canvas */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden print-page">
        {/* Printable Header Details (Shown when printing) */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold font-display text-gray-900 uppercase">
              {reportType === 'players' && 'Players Directory Report'}
              {reportType === 'lofts' && 'Racing Lofts Coordinates Report'}
              {reportType === 'events' && 'Racing Events Schedule Report'}
              {reportType === 'participants' && 'Registered Race Participants'}
              {reportType === 'clocking' && 'Pigeon Landing Clocking Logs'}
              {reportType === 'results' && `${getActiveEvent()?.eventName || 'Race'} Final Results Report`}
            </h1>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              System generated report as of {new Date().toLocaleDateString('en-US', { dateStyle: 'full' })} at {new Date().toLocaleTimeString()}
            </p>
          </div>

          <div className="font-mono text-[10px] text-gray-400 text-left md:text-right">
            <p>Pigeon Racing Clocking System</p>
            <p>Admin Operations Console</p>
          </div>
        </div>

        {/* Dynamic tables for preview */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          {!reportData ? (
            <div className="py-12 text-center text-sm text-gray-400 font-medium">
              Loading report summary records...
            </div>
          ) : (
            <>
              {/* PLAYERS REPORT */}
              {reportType === 'players' && (
                <table className="w-full text-left border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-[11px] font-bold text-gray-600 uppercase border-b border-gray-200">
                      <th className="p-3 border-r border-gray-200">ID</th>
                      <th className="p-3 border-r border-gray-200">Full Name</th>
                      <th className="p-3 border-r border-gray-200">Username</th>
                      <th className="p-3 border-r border-gray-200">Email</th>
                      <th className="p-3 border-r border-gray-200">Contact Number</th>
                      <th className="p-3 border-r border-gray-200">Address</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] text-gray-600">
                    {reportData.players.map(p => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="p-3 border-r border-gray-200 font-mono font-bold text-gray-800">{p.id}</td>
                        <td className="p-3 border-r border-gray-200 font-semibold text-gray-900">{p.fullName}</td>
                        <td className="p-3 border-r border-gray-200 font-mono">{p.username}</td>
                        <td className="p-3 border-r border-gray-200">{p.email || 'N/A'}</td>
                        <td className="p-3 border-r border-gray-200">{p.contactNumber || 'N/A'}</td>
                        <td className="p-3 border-r border-gray-200">{p.address}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* LOFTS REPORT */}
              {reportType === 'lofts' && (
                <table className="w-full text-left border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-[11px] font-bold text-gray-600 uppercase border-b border-gray-200">
                      <th className="p-3 border-r border-gray-200">Code</th>
                      <th className="p-3 border-r border-gray-200">Loft Name</th>
                      <th className="p-3 border-r border-gray-200">Owner Name</th>
                      <th className="p-3 border-r border-gray-200 text-center">Latitude</th>
                      <th className="p-3 border-r border-gray-200 text-center">Longitude</th>
                      <th className="p-3">Complete Address</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] text-gray-600">
                    {reportData.lofts.map(l => (
                      <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="p-3 border-r border-gray-200 font-mono font-bold text-gray-800">{l.loftCode}</td>
                        <td className="p-3 border-r border-gray-200 font-semibold text-gray-900">{l.loftName}</td>
                        <td className="p-3 border-r border-gray-200 font-medium text-gray-700">{l.ownerName}</td>
                        <td className="p-3 border-r border-gray-200 text-center font-mono text-emerald-700">{l.latitude.toFixed(6)}</td>
                        <td className="p-3 border-r border-gray-200 text-center font-mono text-emerald-700">{l.longitude.toFixed(6)}</td>
                        <td className="p-3">{l.address || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* EVENTS REPORT */}
              {reportType === 'events' && (
                <table className="w-full text-left border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-[11px] font-bold text-gray-600 uppercase border-b border-gray-200">
                      <th className="p-3 border-r border-gray-200">Event Code</th>
                      <th className="p-3 border-r border-gray-200">Event Name</th>
                      <th className="p-3 border-r border-gray-200 text-center">Race Date</th>
                      <th className="p-3 border-r border-gray-200">Release Point</th>
                      <th className="p-3 border-r border-gray-200 text-center">Release Time</th>
                      <th className="p-3 border-r border-gray-200 text-center">Coordinates</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] text-gray-600">
                    {reportData.events.map(e => (
                      <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="p-3 border-r border-gray-200 font-mono font-bold text-gray-800">{e.eventCode}</td>
                        <td className="p-3 border-r border-gray-200 font-semibold text-gray-900">{e.eventName}</td>
                        <td className="p-3 border-r border-gray-200 text-center">{e.raceDate}</td>
                        <td className="p-3 border-r border-gray-200">
                          <p className="font-semibold text-gray-800">{e.releasePointName}</p>
                          <p className="text-[9px] text-gray-400">{e.municipality}, {e.province}</p>
                        </td>
                        <td className="p-3 border-r border-gray-200 text-center font-mono">{e.releaseTime}</td>
                        <td className="p-3 border-r border-gray-200 text-center font-mono text-emerald-700">{e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}</td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-emerald-600">{e.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* PARTICIPANTS REPORT */}
              {reportType === 'participants' && (
                <table className="w-full text-left border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-[11px] font-bold text-gray-600 uppercase border-b border-gray-200">
                      <th className="p-3 border-r border-gray-200">Clocking Code</th>
                      <th className="p-3 border-r border-gray-200">Player Details</th>
                      <th className="p-3 border-r border-gray-200">Registered Loft</th>
                      <th className="p-3 border-r border-gray-200">Race Event</th>
                      <th className="p-3 text-center">Generated Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] text-gray-600">
                    {reportData.registrations.map(r => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="p-3 border-r border-gray-200 font-mono font-bold text-gray-800 tracking-wider text-xs">{r.clockingCode}</td>
                        <td className="p-3 border-r border-gray-200 font-semibold text-gray-900">{r.playerName}</td>
                        <td className="p-3 border-r border-gray-200 font-medium text-gray-700">{r.loftName}</td>
                        <td className="p-3 border-r border-gray-200 font-medium text-gray-700">{r.eventName} ({r.eventCode})</td>
                        <td className="p-3 text-center font-mono">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* CLOCKING LOGS REPORT */}
              {reportType === 'clocking' && (
                <table className="w-full text-left border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-[11px] font-bold text-gray-600 uppercase border-b border-gray-200">
                      <th className="p-3 border-r border-gray-200">Clocking Code</th>
                      <th className="p-3 border-r border-gray-200">Racer Player</th>
                      <th className="p-3 border-r border-gray-200">Registered Loft</th>
                      <th className="p-3 border-r border-gray-200">Race Event</th>
                      <th className="p-3 border-r border-gray-200 text-center">Landing Time</th>
                      <th className="p-3 border-r border-gray-200 text-right">Distance (m)</th>
                      <th className="p-3 border-r border-gray-200 text-right">Elapsed Time</th>
                      <th className="p-3 border-r border-gray-200 text-right">Speed (m/min)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] text-gray-600">
                    {reportData.registrations
                      .filter(r => r.status !== 'Waiting')
                      .map(r => (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="p-3 border-r border-gray-200 font-mono font-bold text-gray-800">{r.clockingCode}</td>
                          <td className="p-3 border-r border-gray-200 font-semibold text-gray-900">{r.playerName}</td>
                          <td className="p-3 border-r border-gray-200">{r.loftName}</td>
                          <td className="p-3 border-r border-gray-200">{r.eventName}</td>
                          <td className="p-3 border-r border-gray-200 text-center font-mono font-semibold text-gray-800">
                            {r.clockTime ? new Date(r.clockTime).toLocaleString() : ''}
                          </td>
                          <td className="p-3 border-r border-gray-200 text-right font-mono font-medium">{r.distance ? r.distance.toLocaleString() : ''}</td>
                          <td className="p-3 border-r border-gray-200 text-right font-mono font-medium">{r.elapsedTime ? `${r.elapsedTime.toFixed(2)} min` : ''}</td>
                          <td className="p-3 border-r border-gray-200 text-right font-mono font-bold text-emerald-700 bg-emerald-50/10">
                            {r.speed ? r.speed.toLocaleString() : ''}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-600">{r.status}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* LEADERBOARD STANDINGS RESULTS REPORT */}
              {reportType === 'results' && (
                <>
                  {reportData.registrations.filter(r => r.eventId === selectedEventId && r.status !== 'Waiting').length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400 font-semibold">
                      No clockings completed for this event yet. Standings are empty.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Sub-header of Event details */}
                      {getActiveEvent() && (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
                          <div>
                            <span className="font-bold text-gray-400 uppercase tracking-wider block">Race Code</span>
                            <span className="font-mono font-bold text-gray-800">{getActiveEvent()?.eventCode}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase tracking-wider block">Race Date</span>
                            <span className="font-bold text-gray-800">{getActiveEvent()?.raceDate}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase tracking-wider block">Release Point</span>
                            <span className="font-bold text-gray-800">{getActiveEvent()?.releasePointName}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase tracking-wider block">Release Time</span>
                            <span className="font-mono font-bold text-emerald-700">{getActiveEvent()?.releaseTime}</span>
                          </div>
                        </div>
                      )}

                      <table className="w-full text-left border-collapse border border-gray-200 mt-4">
                        <thead>
                          <tr className="bg-gray-100 text-[11px] font-bold text-gray-600 uppercase border-b border-gray-200">
                            <th className="p-3 border-r border-gray-200 text-center">Rank</th>
                            <th className="p-3 border-r border-gray-200">Player Name</th>
                            <th className="p-3 border-r border-gray-200">Loft Name</th>
                            <th className="p-3 border-r border-gray-200 text-right">Distance (m)</th>
                            <th className="p-3 border-r border-gray-200 text-center">Clock Time</th>
                            <th className="p-3 border-r border-gray-200 text-right">Elapsed Time</th>
                            <th className="p-3 border-r border-gray-200 text-right">Velocity (m/min)</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-[11px] text-gray-600">
                          {reportData.registrations
                            .filter(r => r.eventId === selectedEventId && r.status !== 'Waiting')
                            .sort((a, b) => (b.speed || 0) - (a.speed || 0))
                            .map((r, idx) => (
                              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                <td className="p-3 border-r border-gray-200 text-center font-bold font-mono text-gray-900 bg-slate-50/20">{idx + 1}</td>
                                <td className="p-3 border-r border-gray-200 font-bold text-gray-900">{r.playerName}</td>
                                <td className="p-3 border-r border-gray-200 font-medium">{r.loftName}</td>
                                <td className="p-3 border-r border-gray-200 text-right font-mono">{r.distance ? r.distance.toLocaleString(undefined, { minimumFractionDigits: 1 }) : ''}</td>
                                <td className="p-3 border-r border-gray-200 text-center font-mono">
                                  {r.clockTime ? new Date(r.clockTime).toLocaleTimeString() : ''}
                                </td>
                                <td className="p-3 border-r border-gray-200 text-right font-mono">{r.elapsedTime ? `${r.elapsedTime.toFixed(2)} min` : ''}</td>
                                <td className="p-3 border-r border-gray-200 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/5">
                                  {r.speed ? r.speed.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                                </td>
                                <td className="p-3 text-center font-bold text-emerald-600">{r.status}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
