import { 
  Compass, 
  Users, 
  Home, 
  Calendar, 
  Award, 
  FileText, 
  History, 
  MapPin, 
  Key, 
  Activity, 
  Clock, 
  X
} from 'lucide-react';
import { AuthUser } from '../types';

interface SidebarProps {
  user: AuthUser;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const isAdmin = user.role === 'Administrator';

  // Define sidebar items based on role
  const menuItems = isAdmin
    ? [
        { id: 'dashboard', label: 'Admin Dashboard', icon: Home },
        { id: 'players', label: 'Player Management', icon: Users },
        { id: 'lofts', label: 'Loft Management', icon: MapPin },
        { id: 'events', label: 'Racing Events', icon: Calendar },
        { id: 'registrations', label: 'Event Registrations', icon: Key },
        { id: 'clocking', label: 'Clocking Monitor', icon: Clock },
        { id: 'leaderboards', label: 'Live Leaderboard', icon: Award },
        { id: 'reports', label: 'Reports & Export', icon: FileText },
        { id: 'audit-logs', label: 'System Audit Logs', icon: Activity },
      ]
    : [
        { id: 'dashboard', label: 'Player Dashboard', icon: Home },
        { id: 'my-loft', label: 'My Loft Details', icon: MapPin },
        { id: 'joined-events', label: 'My Racing Events', icon: Calendar },
        { id: 'clocking-page', label: 'Clock Pigeon', icon: Key },
        { id: 'race-history', label: 'Race History & Ranks', icon: History },
        { id: 'leaderboards', label: 'Race Standings', icon: Award },
      ];

  const navigation = (
    <>
      {/* Brand Header */}
      <div className="h-16 px-5 sm:px-6 border-b border-slate-800 flex items-center justify-between space-x-3 bg-[#111827]">
        <div className="flex items-center space-x-3 min-w-0">
        <div className="w-10 h-10 bg-[#10B981] rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <Compass className="w-6 h-6 text-white animate-spin-slow" style={{ animationDuration: '8s' }} />
        </div>
        <div>
          <h1 className="text-base font-bold font-display tracking-tight text-white leading-none">PRCS Flight</h1>
          <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase font-mono mt-1 block">Clocking System</span>
        </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase px-3 mb-3">
          {isAdmin ? 'Administration' : 'Racer Panel'}
        </div>
        {menuItems.map(item => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onClose();
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-[#10B981] text-white shadow-md shadow-[#10B981]/15'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <IconComponent className={`w-4.5 h-4.5 shrink-0 transition-transform ${
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
              }`} />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white block" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800 bg-[#111827] text-center">
        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-800/50 text-[10px] text-slate-400 font-semibold border border-slate-700/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
          <span>System Connected</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="no-print hidden w-64 bg-[#111827] text-slate-100 border-r border-slate-800 lg:flex lg:h-screen lg:sticky lg:top-0 lg:z-20 lg:flex-col">
        {navigation}
      </aside>

      <div className={`no-print fixed inset-0 z-40 bg-slate-950/55 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />

      <aside className={`no-print fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[#111827] text-slate-100 border-r border-slate-800 shadow-2xl transition-transform duration-200 lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {navigation}
      </aside>
    </>
  );
}
