import React from 'react';
import { User } from '../types.ts';
import { ShieldCheck, LogOut, Smartphone, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  isConnected: boolean;
  onRefresh?: () => void;
  isSimulatorOpen: boolean;
  onToggleSimulator: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  isConnected,
  onRefresh,
  isSimulatorOpen,
  onToggleSimulator,
}) => {
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'teacher':
        return 'מורה / מחנכת';
      case 'guard':
        return 'שומר שער';
      case 'vice_principal':
        return 'סגן מנהל · אחראי שחרורים';
      case 'admin':
        return 'מנהל המערכת';
      default:
        return '';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg tracking-tight text-white font-['Rubik']">אישור לשער</span>
            <span className="text-xs text-slate-400 hidden sm:inline">ניהול יציאות בית ספרי</span>
          </div>
        </div>

        {/* Status & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Connection state */}
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/60 animate-pulse'
            }`}
            title={isConnected ? 'מחובר לסנכרון שרת בזמן אמת' : 'אין חיבור לשרת'}
          >
            {isConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
            <span className="hidden xs:inline">{isConnected ? 'מסונכרן' : 'לא מחובר'}</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              aria-label="רענן נתונים"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="רענן נתונים"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Dual Phone Simulator Toggle (for testing both phones side-by-side) */}
          <button
            onClick={onToggleSimulator}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              isSimulatorOpen
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="פתח סימולטור שני טלפונים במקביל"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>סימולטור 2 טלפונים</span>
          </button>

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center gap-2 border-r border-slate-800 pr-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-100 leading-tight">{user.fullName}</div>
                <div className="text-[11px] text-teal-400 leading-tight">{getRoleBadge(user.role)}</div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-900/40"
                title="התנתקות מהמערכת"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">יציאה</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
