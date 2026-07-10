import { useState, useEffect } from 'react';
import { Bell, LogOut, Shield, User, Clock as ClockIcon, CheckCircle, Menu } from 'lucide-react';
import { AuthUser, AppNotification } from '../types';

interface NavbarProps {
  user: AuthUser;
  onLogout: () => void;
  notifications: AppNotification[];
  onMarkNotificationsRead: () => void;
  onOpenSidebar: () => void;
}

export default function Navbar({ user, onLogout, notifications, onMarkNotificationsRead, onOpenSidebar }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Update local time live
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="no-print min-h-16 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm sm:px-6">
      {/* Search / Left bar - Welcome Message */}
      <div className="flex min-w-0 items-center space-x-2 sm:space-x-3">
        <button
          onClick={onOpenSidebar}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 sm:flex">
          <ClockIcon className="w-3.5 h-3.5 text-primary-green-600 mr-1.5 animate-pulse" />
          <span className="font-mono text-gray-700">{currentTime || 'Loading...'}</span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
        {/* Notifications dropdown */}
        <div className="relative">
          <button
            id="notification-bell-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && unreadCount > 0) {
                onMarkNotificationsRead();
              }
            }}
            className="relative p-2 text-gray-500 hover:text-primary-green-600 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-[10px] text-white font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100 animate-in fade-in slide-in-from-top-3 duration-200 sm:w-80">
              <div className="p-3 bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-semibold font-display text-gray-800">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-primary-green-600 bg-primary-green-50 px-2 py-0.5 rounded font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">
                    No recent notifications
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-3 text-xs transition-colors hover:bg-gray-50 ${!notif.read ? 'bg-primary-green-50/40' : ''}`}
                    >
                      <div className="flex items-start space-x-2">
                        <div className="mt-0.5">
                          {notif.type === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-primary-green-500 mt-1.5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{notif.title}</p>
                          <p className="text-gray-600 mt-0.5 leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {new Date(notif.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile details */}
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-2 sm:space-x-3 sm:pl-4">
          <div className="w-10 h-10 rounded-full bg-[#1F2937] border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.role === 'Administrator' ? 'AD' : user.fullName.substring(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{user.fullName}</p>
            <div className="flex items-center space-x-1 mt-0.5">
              {user.role === 'Administrator' ? (
                <Shield className="w-3 h-3 text-[#10B981]" />
              ) : (
                <User className="w-3 h-3 text-slate-400" />
              )}
              <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center space-x-1 rounded-lg border border-transparent px-2 py-1.5 text-xs font-bold text-gray-500 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-600 sm:px-3"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
