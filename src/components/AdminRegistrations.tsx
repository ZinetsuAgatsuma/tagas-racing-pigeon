import React, { useRef, useState, FormEvent, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { EventRegistration, RacingEvent, Player, Loft } from '../types';
import { Plus, Search, Trash, X, AlertCircle, RefreshCw, Key, Printer, Download, QrCode, FileSpreadsheet, Upload } from 'lucide-react';

interface AdminRegistrationsProps {
  registrations: EventRegistration[];
  events: RacingEvent[];
  players: Player[];
  lofts: Loft[];
  onAddRegistration: (regData: any) => Promise<boolean>;
  onImportRegistrations: (rows: any[]) => Promise<{ success: boolean; importedCount?: number; error?: string; details?: string[] }>;
  onDeleteRegistration: (id: string) => Promise<boolean>;
  errorMsg: string;
}

export default function AdminRegistrations({
  registrations,
  events,
  players,
  lofts,
  onAddRegistration,
  onImportRegistrations,
  onDeleteRegistration,
  errorMsg
}: AdminRegistrationsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedLoftId, setSelectedLoftId] = useState('');
  const [ringNumber, setRingNumber] = useState('');
  const [clockingCode, setClockingCode] = useState('');
  const [localError, setLocalError] = useState('');
  const [importFeedback, setImportFeedback] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [viewingQr, setViewingQr] = useState<{ code: string; name: string; eventName: string } | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  // Filter lofts belonging to selected player
  const playerLofts = lofts.filter(l => l.ownerId === selectedPlayerId);

  const startAdd = () => {
    setIsAdding(true);
    setSelectedEventId(events.find(e => e.status !== 'Finished')?.id || events[0]?.id || '');
    setSelectedPlayerId(players[0]?.id || '');
    // Auto select first loft of first player if any
    const firstPlayerId = players[0]?.id || '';
    const firstPlayerLofts = lofts.filter(l => l.ownerId === firstPlayerId);
    setSelectedLoftId(firstPlayerLofts[0]?.id || '');
    setRingNumber('');
    setClockingCode('');
    setLocalError('');
  };

  const handlePlayerChange = (playerId: string) => {
    setSelectedPlayerId(playerId);
    const relatedLofts = lofts.filter(l => l.ownerId === playerId);
    setSelectedLoftId(relatedLofts[0]?.id || '');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setImportFeedback('');
    setImportErrors([]);

    const normalizedCode = clockingCode.trim().toUpperCase();

    if (!selectedEventId || !selectedPlayerId || !selectedLoftId || !ringNumber.trim() || !normalizedCode) {
      setLocalError('All selections, Bird Ring Number, and 8-character clocking code are required.');
      return;
    }

    if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
      setLocalError('Clocking code must be exactly 8 letters/numbers.');
      return;
    }

    setLoading(true);
    const success = await onAddRegistration({
      eventId: selectedEventId,
      playerId: selectedPlayerId,
      loftId: selectedLoftId,
      ringNumber: ringNumber.trim(),
      clockingCode: normalizedCode
    });
    setLoading(false);

    if (success) {
      setIsAdding(false);
      setRingNumber('');
      setClockingCode('');
    } else {
      setLocalError(errorMsg || 'Failed to register participant. Check ring number and clocking code uniqueness for this event.');
    }
  };

  const handleImportButtonClick = () => {
    excelInputRef.current?.click();
  };

  const handleExcelSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    setLocalError('');
    setImportFeedback('');
    setImportErrors([]);

    try {
      setImporting(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setLocalError('Excel file has no worksheet.');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const sheetRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (sheetRows.length === 0) {
        setLocalError('Excel file is empty. Add rows and try again.');
        return;
      }

      // Supported headers (case-sensitive examples):
      // eventId/eventCode, playerId/username, loftId/loftCode, ringNumber, clockingCode
      const normalizedRows = sheetRows.map(row => ({
        eventId: row.eventId ?? row['Event ID'] ?? row.event_id,
        eventCode: row.eventCode ?? row['Event Code'] ?? row.event_code,
        playerId: row.playerId ?? row['Player ID'] ?? row.player_id,
        username: row.username ?? row['Username'] ?? row.playerUsername ?? row.player_username,
        loftId: row.loftId ?? row['Loft ID'] ?? row.loft_id,
        loftCode: row.loftCode ?? row['Loft Code'] ?? row.loft_code,
        ringNumber: row.ringNumber ?? row['Ring Number'] ?? row.ring_number,
        clockingCode: row.clockingCode ?? row['Clocking Code'] ?? row.clocking_code
      }));

      const result = await onImportRegistrations(normalizedRows);
      if (result.success) {
        setImportFeedback(`Excel import complete: ${result.importedCount || 0} registration(s) imported.`);
      } else {
        setLocalError(result.error || 'Excel import failed.');
        setImportErrors(result.details || []);
      }
    } catch (err) {
      setLocalError('Unable to read Excel file. Make sure the file is a valid .xlsx or .xls document.');
    } finally {
      setImporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Clocking Code', 'Event Name', 'Player Name', 'Loft Name', 'Bird Ring Number', 'Latitude', 'Longitude', 'Registered Date'];
    const rows = filteredRegs.map(r => [
      r.clockingCode,
      `"${r.eventName}"`,
      `"${r.playerName}"`,
      `"${r.loftName}"`,
      `"${r.ringNumber}"`,
      r.loftLatitude,
      r.loftLongitude,
      new Date(r.createdAt).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `racing_codes_${eventFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRegs = registrations.filter(r => {
    const matchesSearch = 
      r.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.loftName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clockingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.eventCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEvent = eventFilter === 'all' || r.eventId === eventFilter;

    return matchesSearch && matchesEvent;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900">Event Participant Registrations</h2>
          <p className="text-xs text-gray-500 mt-1">Register lofts in racing events, assign full 8-character clocking codes, and print code sheets.</p>
        </div>
        <button
          onClick={isAdding ? () => setIsAdding(false) : startAdd}
          className="flex w-full items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all shrink-0 cursor-pointer sm:w-auto sm:self-center"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancel Registration' : 'Register Participant Loft'}</span>
        </button>
      </div>

      {(localError || errorMsg) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{localError || errorMsg}</span>
        </div>
      )}

      {importFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-700">
          <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{importFeedback}</span>
        </div>
      )}

      {importErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1.5">
          <p className="font-bold">Import row errors:</p>
          <div className="max-h-40 overflow-auto space-y-1 pr-1">
            {importErrors.map((err, idx) => (
              <p key={`${err}-${idx}`}>{err}</p>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Import Registrations From Excel</span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">
              Accepted headers: eventId or eventCode, playerId or username, loftId or loftCode, ringNumber, clockingCode.
            </p>
          </div>

          <button
            type="button"
            onClick={handleImportButtonClick}
            disabled={importing}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{importing ? 'Importing...' : 'Import Excel'}</span>
          </button>
        </div>

        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleExcelSelected}
          className="hidden"
        />
      </div>

      {/* Adding Participant Form */}
      {isAdding && (
        <form 
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm max-w-xl w-full animate-in fade-in duration-200 space-y-4"
        >
          <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2 flex items-center space-x-2">
            <Key className="w-4 h-4 text-emerald-600" />
            <span>Register Loft to Race Event</span>
          </h3>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Race Event *</label>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
              >
                <option value="" disabled>Select Race Event</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.eventName} ({e.eventCode} - {e.status})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Racer Player *</label>
              <select
                value={selectedPlayerId}
                onChange={e => handlePlayerChange(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
              >
                <option value="" disabled>Select Player</option>
                {players.filter(p => p.status === 'Active').map(p => (
                  <option key={p.id} value={p.id}>{p.fullName} ({p.id})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Loft to Register *</label>
              <select
                value={selectedLoftId}
                onChange={e => setSelectedLoftId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
                disabled={playerLofts.length === 0}
              >
                {playerLofts.length === 0 ? (
                  <option value="">No lofts registered for this player</option>
                ) : (
                  playerLofts.map(l => (
                    <option key={l.id} value={l.id}>{l.loftName} ({l.loftCode})</option>
                  ))
                )}
              </select>
              {playerLofts.length === 0 && selectedPlayerId && (
                <p className="text-[10px] text-amber-600 font-medium mt-1">
                  ⚠️ This player has no registered lofts. Register a loft first under Loft Management.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bird Ring Number *</label>
              <input
                type="text"
                value={ringNumber}
                onChange={e => setRingNumber(e.target.value)}
                placeholder="e.g. PHA-2026-123456"
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Enter the unique identification ring number on the racing pigeon/bird.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Clocking Code (8 chars) *</label>
              <input
                type="text"
                value={clockingCode}
                onChange={e => setClockingCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC12345"
                maxLength={8}
                className="w-full font-mono tracking-wider uppercase text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Admin sets the exact full code. Player must enter this exact 8-character code during clocking.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-3 border-t border-gray-50 sm:flex-row sm:items-center sm:justify-end sm:space-x-3 sm:gap-0">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
              }}
              className="w-full text-xs font-bold px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition-colors cursor-pointer sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || playerLofts.length === 0}
              className="flex w-full items-center justify-center space-x-2 text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 sm:w-auto"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Register Code</span>
            </button>
          </div>
        </form>
      )}

      {/* Main Grid View */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50 no-print">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative w-full flex-1 md:max-w-xs">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search codes, players..."
                className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white transition-all"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Filter Event:</span>
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
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 shrink-0 sm:w-auto sm:flex-row sm:items-center sm:space-x-2 sm:gap-0">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 rounded-xl shadow-sm transition-all cursor-pointer"
              title="Print generated codes to sheet"
            >
              <Printer className="w-4 h-4" />
              <span>Print Codes</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 rounded-xl shadow-sm transition-all cursor-pointer"
              title="Export codes list to CSV"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Dynamic print-friendly container */}
        <div className="overflow-x-auto print-page">
          <div className="hidden print:block mb-6 text-center border-b pb-4">
            <h1 className="text-2xl font-bold">PIGEON RACING CLOCKING CODES</h1>
            <p className="text-sm text-gray-500 mt-1">Admin-assigned full clocking codes. Keep secure and share only with registered players.</p>
          </div>

          {filteredRegs.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400 font-medium">
              No participant lofts registered.
            </div>
          ) : (
            <table className="w-full min-w-[980px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase bg-gray-50/70 select-none">
                  <th className="px-4 py-4 sm:px-6">Clocking Code</th>
                  <th className="px-4 py-4 sm:px-6">Racer Details</th>
                  <th className="px-4 py-4 sm:px-6">Registered Loft</th>
                  <th className="px-4 py-4 sm:px-6">Bird Ring Number</th>
                  <th className="px-4 py-4 sm:px-6">Race Event</th>
                  <th className="px-4 py-4 no-print sm:px-6">QR Preview</th>
                  <th className="px-4 py-4 text-right no-print sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                {filteredRegs.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 font-mono font-bold text-gray-900 text-sm select-all tracking-wider sm:px-6">
                      <span className="inline-block rounded-lg border border-gray-100 bg-slate-50/50 px-3 py-1.5">
                      {r.clockingCode}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-900 sm:px-6">{r.playerName}</td>
                    <td className="px-4 py-4 space-y-0.5 sm:px-6">
                      <p className="font-semibold text-gray-800">{r.loftName}</p>
                      <p className="text-gray-400 text-[10px] font-mono">Coords: {r.loftLatitude.toFixed(4)}, {r.loftLongitude.toFixed(4)}</p>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-gray-900 sm:px-6">{r.ringNumber}</td>
                    <td className="px-4 py-4 space-y-0.5 font-medium text-gray-700 sm:px-6">
                      <p className="font-bold text-slate-800">{r.eventName}</p>
                      <p className="text-gray-400 text-[10px] font-mono">Code: {r.eventCode}</p>
                    </td>
                    <td className="px-4 py-4 no-print sm:px-6">
                      <button
                        onClick={() => setViewingQr({ code: r.clockingCode, name: r.playerName, eventName: r.eventName })}
                        className="flex items-center space-x-1 border border-emerald-100 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg transition-all cursor-pointer font-semibold"
                      >
                        <QrCode className="w-3.5 h-3.5 shrink-0" />
                        <span>Show QR</span>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap no-print sm:px-6">
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete registration for ${r.playerName}?`)) {
                            onDeleteRegistration(r.id);
                          }
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer"
                        title="Delete Registration"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* QR Code Popup Dialog Modal */}
      {viewingQr && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setViewingQr(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-gray-800 font-display text-base">QR Clocking Card</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Event: {viewingQr.eventName}</p>

            <div className="my-6 flex justify-center">
              <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${viewingQr.code}`}
                  alt={viewingQr.code}
                  className="w-48 h-48 block"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 font-mono tracking-wider">
                {viewingQr.code}
              </span>
              <p className="text-xs font-bold text-gray-700 mt-3">{viewingQr.name}</p>
              <p className="text-[10px] text-gray-400 leading-relaxed max-w-[240px] mx-auto">
                Hand this card out or print it for clocking validation.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print QR Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
