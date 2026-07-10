import { useState } from 'react';
import { AuditLog } from '../types';
import { ShieldAlert, Search, Trash2, Calendar, ShieldCheck, Database } from 'lucide-react';

interface AdminAuditLogsProps {
  logs: AuditLog[];
}

export default function AdminAuditLogs({ logs }: AdminAuditLogsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(l => 
    l.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 flex items-center space-x-2">
            <ShieldCheck className="w-5.5 h-5.5 text-emerald-600 shrink-0" />
            <span>Security & System Audit Logs</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Browse immutable audit history tracking player clocking events, administrator overrides, and system changes.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="relative w-full flex-1 sm:max-w-sm">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search logs by action, user, or details..."
              className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white transition-all"
            />
          </div>
        </div>

        {/* List Table */}
        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400 font-medium">
              No audit logs found matching criteria.
            </div>
          ) : (
            <table className="w-full min-w-[960px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase bg-gray-50/70 select-none">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Triggered By</th>
                  <th className="px-6 py-4">Action Event</th>
                  <th className="px-6 py-4">Logged details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-600 font-mono">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-700 whitespace-nowrap">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-gray-200/50">
                        {log.username}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action.includes('CREATE') || log.action.includes('REGISTER')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/70'
                          : log.action.includes('DELETE')
                          ? 'bg-red-50 text-red-700 border border-red-100/70'
                          : log.action.includes('CLOCKING')
                          ? 'bg-blue-50 text-blue-700 border border-blue-100/70 animate-pulse'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-sans text-gray-600 text-[11px] leading-relaxed max-w-xl">
                      {log.details}
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
