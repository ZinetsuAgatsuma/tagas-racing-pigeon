import React, { useState, FormEvent } from 'react';
import { RacingEvent, EventStatus } from '../types';
import { Plus, Search, Edit, Trash, X, AlertCircle, RefreshCw, MapPin, Calendar, Clock, Flag } from 'lucide-react';
import MapPicker from './MapPicker';

interface AdminEventsProps {
  events: RacingEvent[];
  onAddEvent: (eventData: any) => Promise<boolean>;
  onEditEvent: (id: string, eventData: any) => Promise<boolean>;
  onDeleteEvent: (id: string) => Promise<boolean>;
  errorMsg: string;
}

export default function AdminEvents({
  events,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  errorMsg
}: AdminEventsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RacingEvent | null>(null);

  // Form states
  const [eventName, setEventName] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [releasePointName, setReleasePointName] = useState('');
  const [province, setProvince] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [latitude, setLatitude] = useState(16.4023); // Default Baguio Plaza
  const [longitude, setLongitude] = useState(120.5960);
  const [releaseTime, setReleaseTime] = useState('06:00:00');
  const [status, setStatus] = useState<EventStatus>('Upcoming');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form
  const resetForm = () => {
    setEventName('');
    setRaceDate('');
    setReleasePointName('');
    setProvince('');
    setMunicipality('');
    setLatitude(16.4023);
    setLongitude(120.5960);
    setReleaseTime('06:00:00');
    setStatus('Upcoming');
    setLocalError('');
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingEvent(null);
    resetForm();
  };

  const startEdit = (event: RacingEvent) => {
    setEditingEvent(event);
    setIsAdding(false);
    setEventName(event.eventName);
    setRaceDate(event.raceDate);
    setReleasePointName(event.releasePointName);
    setProvince(event.province);
    setMunicipality(event.municipality);
    setLatitude(event.latitude);
    setLongitude(event.longitude);
    setReleaseTime(event.releaseTime);
    setStatus(event.status);
    setLocalError('');
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!eventName || !raceDate || !releasePointName || !releaseTime || latitude === undefined || longitude === undefined) {
      setLocalError('Event name, date, release point, release time, and location coordinates are required.');
      return;
    }

    setLoading(true);
    const success = await onAddEvent({
      eventName,
      raceDate,
      releasePointName,
      province,
      municipality,
      latitude,
      longitude,
      releaseTime,
      status
    });
    setLoading(false);

    if (success) {
      setIsAdding(false);
      resetForm();
    } else {
      setLocalError(errorMsg || 'Failed to create racing event.');
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!eventName || !raceDate || !releasePointName || !releaseTime || latitude === undefined || longitude === undefined) {
      setLocalError('All fields including release point location are required.');
      return;
    }

    if (!editingEvent) return;

    setLoading(true);
    const success = await onEditEvent(editingEvent.id, {
      eventName,
      raceDate,
      releasePointName,
      province,
      municipality,
      latitude,
      longitude,
      releaseTime,
      status
    });
    setLoading(false);

    if (success) {
      setEditingEvent(null);
      resetForm();
    } else {
      setLocalError(errorMsg || 'Failed to update racing event.');
    }
  };

  const handleCoordsChange = (lat: number, lng: number) => {
    setLatitude(parseFloat(lat.toFixed(6)));
    setLongitude(parseFloat(lng.toFixed(6)));
  };

  const filteredEvents = events.filter(e =>
    e.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.eventCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.releasePointName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.municipality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900">Racing Events Management</h2>
          <p className="text-xs text-gray-500 mt-1">Create, edit, and release new pigeon races with precise coordinates.</p>
        </div>
        <button
          onClick={isAdding ? () => setIsAdding(false) : startAdd}
          className="flex w-full items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all shrink-0 cursor-pointer sm:w-auto sm:self-center"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancel Event' : 'Create Racing Event'}</span>
        </button>
      </div>

      {(localError || errorMsg) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{localError || errorMsg}</span>
        </div>
      )}

      {/* Form with Map Coordinate selection for Release Point */}
      {(isAdding || editingEvent) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm animate-in fade-in duration-200">
          <form onSubmit={editingEvent ? handleEditSubmit : handleAddSubmit} className="space-y-6">
            <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">
              {editingEvent ? `Edit Event: ${editingEvent.eventName} (${editingEvent.eventCode})` : 'Schedule New Racing Event'}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input fields */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Event Name *</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    placeholder="e.g. Summer Derby 2026"
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Race Date *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={raceDate}
                        onChange={e => setRaceDate(e.target.value)}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Release Time *</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={releaseTime}
                        onChange={e => setReleaseTime(e.target.value)}
                        placeholder="e.g. 06:00:00"
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Release Point Name *</label>
                  <input
                    type="text"
                    value={releasePointName}
                    onChange={e => setReleasePointName(e.target.value)}
                    placeholder="e.g. Baguio City Plaza Grounds"
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Province</label>
                    <input
                      type="text"
                      value={province}
                      onChange={e => setProvince(e.target.value)}
                      placeholder="e.g. Benguet"
                      className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Municipality</label>
                    <input
                      type="text"
                      value={municipality}
                      onChange={e => setMunicipality(e.target.value)}
                      placeholder="e.g. Baguio"
                      className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

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

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Race Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as EventStatus)}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing (Open for clocking)</option>
                    <option value="Finished">Finished / Closed</option>
                  </select>
                </div>
              </div>

              {/* Map coordinate selection */}
              <div className="lg:col-span-7 flex flex-col space-y-1.5 h-[300px] sm:h-[360px]">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Select Release Location on Map *
                </label>
                <div className="flex-1 min-h-0">
                  <MapPicker
                    mode="pick"
                    latitude={latitude}
                    longitude={longitude}
                    onChange={handleCoordsChange}
                    title={releasePointName || 'New Release Point'}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-3 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-end sm:space-x-3 sm:gap-0">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingEvent(null);
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
                <span>{editingEvent ? 'Save Changes' : 'Create Race'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events Table list */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="relative w-full flex-1 sm:max-w-sm">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, code, release point..."
              className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white transition-all"
            />
          </div>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400 font-medium">
              No racing events scheduled.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase bg-gray-50/70 select-none">
                  <th className="px-6 py-4">Event Code</th>
                  <th className="px-6 py-4">Event Name</th>
                  <th className="px-6 py-4">Race Date / Time</th>
                  <th className="px-6 py-4">Release Point</th>
                  <th className="px-6 py-4">Coordinates</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                {filteredEvents.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-800">{e.eventCode}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{e.eventName}</td>
                    <td className="px-6 py-4 space-y-0.5">
                      <div className="flex items-center space-x-1 font-medium text-gray-800">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{e.raceDate}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-400 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>Release: {e.releaseTime}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-0.5">
                      <p className="font-semibold text-gray-800">{e.releasePointName}</p>
                      <p className="text-gray-400 text-[10px]">{e.municipality}, {e.province}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1 text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 w-fit">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        e.status === 'Upcoming'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : e.status === 'Ongoing'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100 animate-pulse'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => startEdit(e)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all cursor-pointer"
                          title="Edit Event Details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete Event ${e.eventName}? This will also delete all registrations and clocked results for this race!`)) {
                              onDeleteEvent(e.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer"
                          title="Delete Event"
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
