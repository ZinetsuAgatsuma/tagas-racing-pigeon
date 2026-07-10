import React, { useState, FormEvent } from 'react';
import { Player, PlayerStatus } from '../types';
import { Plus, Search, Edit, Trash, Check, X, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';

interface AdminPlayersProps {
  players: Player[];
  onAddPlayer: (playerData: any) => Promise<boolean>;
  onEditPlayer: (id: string, playerData: any) => Promise<boolean>;
  onDeletePlayer: (id: string) => Promise<boolean>;
  errorMsg: string;
}

export default function AdminPlayers({
  players,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  errorMsg
}: AdminPlayersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<PlayerStatus>('Active');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form
  const resetForm = () => {
    setFullName('');
    setAddress('');
    setContactNumber('');
    setEmail('');
    setUsername('');
    setPassword('');
    setStatus('Active');
    setLocalError('');
  };

  // Trigger editing
  const startEdit = (player: Player) => {
    setEditingPlayer(player);
    setFullName(player.fullName);
    setAddress(player.address);
    setContactNumber(player.contactNumber);
    setEmail(player.email);
    setUsername(player.username);
    setPassword(''); // leave blank for no change
    setStatus(player.status);
    setLocalError('');
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!fullName || !username || !password) {
      setLocalError('Full name, username, and password are required.');
      return;
    }
    setLoading(true);
    const success = await onAddPlayer({ fullName, address, contactNumber, email, username, password, status });
    setLoading(false);
    if (success) {
      setIsAdding(false);
      resetForm();
    } else {
      setLocalError(errorMsg || 'Failed to create player. Username might be taken.');
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!fullName || !username) {
      setLocalError('Full name and username are required.');
      return;
    }
    if (!editingPlayer) return;
    setLoading(true);
    const success = await onEditPlayer(editingPlayer.id, { fullName, address, contactNumber, email, username, password, status });
    setLoading(false);
    if (success) {
      setEditingPlayer(null);
      resetForm();
    } else {
      setLocalError(errorMsg || 'Failed to update player. Username might be taken.');
    }
  };

  // Filtered players
  const filteredPlayers = players.filter(p => {
    const matchesSearch = 
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900">Player Management</h2>
          <p className="text-xs text-slate-500 mt-1">Add, edit, delete, and view profiles of pigeon racers.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingPlayer(null);
            resetForm();
          }}
          className="flex w-full items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all shrink-0 cursor-pointer sm:w-auto sm:self-center"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancel Registration' : 'Register New Player'}</span>
        </button>
      </div>

      {/* Local/Server Error messages */}
      {(localError || errorMsg) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{localError || errorMsg}</span>
        </div>
      )}

      {/* Add / Edit Form Panel */}
      {(isAdding || editingPlayer) && (
        <form 
          onSubmit={editingPlayer ? handleEditSubmit : handleAddSubmit}
          className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 max-w-2xl w-full animate-in fade-in duration-200"
        >
          <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">
            {editingPlayer ? `Edit Player: ${editingPlayer.fullName} (${editingPlayer.id})` : 'Register New Player Profile'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. juan@example.com"
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Number</label>
              <input
                type="text"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                placeholder="e.g. 09171234567"
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
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

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Account Username *</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username for login"
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                {editingPlayer ? 'New Password (leave blank to keep current)' : 'Account Password *'}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={editingPlayer ? '••••••••' : 'Enter login password'}
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required={!editingPlayer}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Account Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as PlayerStatus)}
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="Active">Active / Verified</option>
                <option value="Inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-3 border-t border-gray-50 sm:flex-row sm:items-center sm:justify-end sm:space-x-3 sm:gap-0">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingPlayer(null);
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
              <span>{editingPlayer ? 'Save Changes' : 'Register Player'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Grid of Players with Search & Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full flex-1 sm:max-w-sm">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, username..."
              className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 px-3 py-2 bg-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
            >
              <option value="all">All Players</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto">
          {filteredPlayers.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400 font-medium">
              No players found matching current search.
            </div>
          ) : (
            <table className="w-full min-w-[920px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50/70 select-none">
                  <th className="px-4 py-4 sm:px-6">Player ID</th>
                  <th className="px-4 py-4 sm:px-6">Full Name</th>
                  <th className="px-4 py-4 sm:px-6">Username</th>
                  <th className="px-4 py-4 sm:px-6">Contact Details</th>
                  <th className="px-4 py-4 sm:px-6">Address</th>
                  <th className="px-4 py-4 sm:px-6">Status</th>
                  <th className="px-4 py-4 text-right sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {filteredPlayers.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 font-mono font-bold text-slate-800 sm:px-6">{p.id}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900 sm:px-6">{p.fullName}</td>
                    <td className="px-4 py-4 font-mono sm:px-6">{p.username}</td>
                    <td className="px-4 py-4 space-y-0.5 sm:px-6">
                      <p className="font-medium text-slate-800">{p.contactNumber || 'No phone'}</p>
                      <p className="text-slate-400 text-[11px]">{p.email || 'No email'}</p>
                    </td>
                    <td className="px-4 py-4 max-w-xs truncate sm:px-6">{p.address || 'N/A'}</td>
                    <td className="px-4 py-4 sm:px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                        p.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap sm:px-6">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all cursor-pointer"
                          title="Edit Player Profile"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete Player ${p.fullName}? This will also delete their owned lofts and race entries!`)) {
                              onDeletePlayer(p.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer"
                          title="Delete Player Profile"
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
