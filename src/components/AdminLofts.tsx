import React, { useState, FormEvent } from 'react';
import { Loft, Player } from '../types';
import { Plus, Search, Edit, Trash, X, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import MapPicker from './MapPicker';

interface AdminLoftsProps {
  lofts: Loft[];
  players: Player[];
  onAddLoft: (loftData: any) => Promise<boolean>;
  onEditLoft: (id: string, loftData: any) => Promise<boolean>;
  onDeleteLoft: (id: string) => Promise<boolean>;
  errorMsg: string;
}

export default function AdminLofts({
  lofts,
  players,
  onAddLoft,
  onEditLoft,
  onDeleteLoft,
  errorMsg
}: AdminLoftsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingLoft, setEditingLoft] = useState<Loft | null>(null);

  // Form states
  const [loftName, setLoftName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(14.5995); // Default Manila
  const [longitude, setLongitude] = useState(120.9842);
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form
  const resetForm = () => {
    setLoftName('');
    setOwnerId(players[0]?.id || '');
    setAddress('');
    setLatitude(14.5995);
    setLongitude(120.9842);
    setLocalError('');
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingLoft(null);
    resetForm();
  };

  const startEdit = (loft: Loft) => {
    setEditingLoft(loft);
    setIsAdding(false);
    setLoftName(loft.loftName);
    setOwnerId(loft.ownerId);
    setAddress(loft.address);
    setLatitude(loft.latitude);
    setLongitude(loft.longitude);
    setLocalError('');
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!loftName || !ownerId || !latitude || !longitude) {
      setLocalError('Loft name, owner, and map coordinates are required.');
      return;
    }

    setLoading(true);
    const success = await onAddLoft({ loftName, ownerId, address, latitude, longitude });
    setLoading(false);

    if (success) {
      setIsAdding(false);
      resetForm();
    } else {
      setLocalError(errorMsg || 'Failed to register loft.');
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!loftName || !ownerId || !latitude || !longitude) {
      setLocalError('Loft name, owner, and map coordinates are required.');
      return;
    }

    if (!editingLoft) return;

    setLoading(true);
    const success = await onEditLoft(editingLoft.id, { loftName, ownerId, address, latitude, longitude });
    setLoading(false);

    if (success) {
      setEditingLoft(null);
      resetForm();
    } else {
      setLocalError(errorMsg || 'Failed to update loft.');
    }
  };

  const handleCoordsChange = (lat: number, lng: number) => {
    setLatitude(parseFloat(lat.toFixed(6)));
    setLongitude(parseFloat(lng.toFixed(6)));
  };

  const filteredLofts = lofts.filter(l => 
    l.loftName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.loftCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900">Loft Management</h2>
          <p className="text-xs text-gray-500 mt-1">Register and coordinate geographic lofts of players on the map.</p>
        </div>
        <button
          onClick={isAdding ? () => setIsAdding(false) : startAdd}
          className="flex w-full items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all shrink-0 cursor-pointer sm:w-auto sm:self-center"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancel Registration' : 'Register New Loft'}</span>
        </button>
      </div>

      {(localError || errorMsg) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{localError || errorMsg}</span>
        </div>
      )}

      {/* Form with Map coordinate selection */}
      {(isAdding || editingLoft) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm animate-in fade-in duration-200">
          <form onSubmit={editingLoft ? handleEditSubmit : handleAddSubmit} className="space-y-6">
            <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">
              {editingLoft ? `Edit Loft: ${editingLoft.loftName} (${editingLoft.loftCode})` : 'Register New Racing Loft'}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form inputs */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Loft Name *</label>
                  <input
                    type="text"
                    value={loftName}
                    onChange={e => setLoftName(e.target.value)}
                    placeholder="e.g. Dela Cruz Aviary"
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Owner (Player) *</label>
                  <select
                    value={ownerId}
                    onChange={e => setOwnerId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    required
                  >
                    <option value="" disabled>Select Owner Player</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>{p.fullName} ({p.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Complete Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. 123 Rizal Ave, Manila"
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                {/* Coordinate Display */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={e => setLatitude(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-2.5 py-2 border border-gray-200 bg-white rounded-lg outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={e => setLongitude(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-2.5 py-2 border border-gray-200 bg-white rounded-lg outline-none font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Map Picker Panel */}
              <div className="lg:col-span-7 flex flex-col space-y-1.5 h-[280px] sm:h-[320px]">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Interactive Coordinate Selector
                </label>
                <div className="flex-1 min-h-0">
                  <MapPicker
                    mode="pick"
                    latitude={latitude}
                    longitude={longitude}
                    onChange={handleCoordsChange}
                    title={loftName || 'New Loft Position'}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-3 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-end sm:space-x-3 sm:gap-0">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingLoft(null);
                  resetForm();
                }}
                className="w-full text-xs font-bold px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition-colors cursor-pointer sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center space-x-2 text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 sm:w-auto"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingLoft ? 'Save Changes' : 'Register Loft'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lofts List Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="relative w-full flex-1 sm:max-w-sm">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by loft name, owner, code..."
              className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white transition-all"
            />
          </div>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto">
          {filteredLofts.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400 font-medium">
              No lofts found matching current search.
            </div>
          ) : (
            <table className="w-full min-w-[860px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase bg-gray-50/70 select-none">
                  <th className="px-4 py-4 sm:px-6">Loft Code</th>
                  <th className="px-4 py-4 sm:px-6">Loft Name</th>
                  <th className="px-4 py-4 sm:px-6">Owner Player</th>
                  <th className="px-4 py-4 sm:px-6">Coordinates</th>
                  <th className="px-4 py-4 sm:px-6">Address</th>
                  <th className="px-4 py-4 text-right sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                {filteredLofts.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 font-mono font-bold text-gray-800 sm:px-6">{l.loftCode}</td>
                    <td className="px-4 py-4 font-semibold text-gray-900 sm:px-6">{l.loftName}</td>
                    <td className="px-4 py-4 font-medium text-gray-700 sm:px-6">{l.ownerName}</td>
                    <td className="px-4 py-4 font-mono text-gray-500 sm:px-6">
                      <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50/70 px-2 py-1 rounded-lg border border-emerald-100/50 w-fit">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 max-w-xs truncate sm:px-6">{l.address || 'N/A'}</td>
                    <td className="px-4 py-4 text-right whitespace-nowrap sm:px-6">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => startEdit(l)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all cursor-pointer"
                          title="Edit Loft Details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete Loft ${l.loftName}?`)) {
                              onDeleteLoft(l.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer"
                          title="Delete Loft"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
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
