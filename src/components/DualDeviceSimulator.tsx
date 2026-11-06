import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';
import { TeacherView } from './TeacherView.tsx';
import { GuardView } from './GuardView.tsx';
import { LoginScreen } from './LoginScreen.tsx';
import { api } from '../lib/api.ts';
import { clientStore } from '../lib/clientStore.ts';
import { Smartphone, X, QrCode, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';

interface DualDeviceSimulatorProps {
  onClose: () => void;
  syncTick: number;
  isConnected: boolean;
  lastSyncTime: string;
}

export const DualDeviceSimulator: React.FC<DualDeviceSimulatorProps> = ({
  onClose,
  syncTick,
  isConnected,
  lastSyncTime,
}) => {
  // Device 1: Teacher (Starts logged in as Lina Khalil - T01)
  const [device1User, setDevice1User] = useState<User | null>(null);
  const [device1Loading, setDevice1Loading] = useState(true);

  // Device 2: Guard (Starts logged in as Abraham Cohen - G01)
  const [device2User, setDevice2User] = useState<User | null>(null);
  const [device2Loading, setDevice2Loading] = useState(true);

  // Share modal with QR link for physical phones
  const [showShareModal, setShowShareModal] = useState(false);

  // Auto-login registered users for simulator if any exist
  useEffect(() => {
    const { staff } = clientStore.getStaff();
    const teacher = staff.find((s) => s.role === 'teacher' && s.isActive);
    const guard = staff.find((s) => s.role === 'guard' && s.isActive);

    if (teacher) {
      api.login(teacher.pinCode)
        .then((data) => {
          if (data.user) setDevice1User(data.user);
        })
        .catch(() => {})
        .finally(() => setDevice1Loading(false));
    } else {
      setDevice1Loading(false);
    }

    if (guard) {
      api.login(guard.pinCode)
        .then((data) => {
          if (data.user) setDevice2User(data.user);
        })
        .catch(() => {})
        .finally(() => setDevice2Loading(false));
    } else {
      setDevice2Loading(false);
    }
  }, []);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in">
      {/* Simulator Top Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
            <Smartphone className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <div className="font-bold text-sm font-['Rubik'] flex items-center gap-2">
              <span>סימולטור שני טלפונים במקביל</span>
              <span className="text-[11px] font-normal text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                מסד נתונים ושרת משותפים בזמן אמת
              </span>
            </div>
            <div className="text-xs text-slate-400">
              שלח אישור בטלפון 1 (מחנכת) וראה אותו מתעדכן מיידית בטלפון 2 (שומר בשער)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-teal-400" />
            <span>סרוק QR לשני סמארטפונים אמיתיים</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            title="סגור סימולטור וחזור למסך רגיל"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Two Phone Screens Grid */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col md:flex-row items-center md:items-start justify-center gap-6 lg:gap-10">
        {/* ================= PHONE 1: TEACHER ================= */}
        <div className="w-full max-w-[390px] flex flex-col items-center shrink-0">
          <div className="text-xs font-bold text-teal-400 mb-2 flex items-center gap-1.5 bg-slate-900/90 border border-teal-500/30 px-3 py-1 rounded-full">
            <span>טלפון 1: מחנכת כיתה</span>
          </div>

          {/* Smartphone Frame */}
          <div className="w-full h-[760px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-700/80 flex flex-col relative overflow-hidden">
            {/* Notch */}
            <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-slate-950 rounded-full" />
            </div>

            {/* Screen Content */}
            <div className="flex-1 bg-slate-50 rounded-[32px] overflow-y-auto relative no-scrollbar">
              {device1Loading ? (
                <div className="p-8 text-center text-slate-500 text-xs">טוען טלפון מחנכת...</div>
              ) : device1User ? (
                <TeacherView
                  user={device1User}
                  syncTick={syncTick}
                />
              ) : (
                <LoginScreen onLoginSuccess={(u) => setDevice1User(u)} />
              )}
            </div>

            {/* Home Indicator */}
            <div className="w-28 h-1 bg-slate-600 rounded-full mx-auto mt-2 shrink-0" />
          </div>
        </div>

        {/* ================= PHONE 2: GUARD ================= */}
        <div className="w-full max-w-[390px] flex flex-col items-center shrink-0">
          <div className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-1.5 bg-slate-900/90 border border-blue-500/30 px-3 py-1 rounded-full">
            <span>טלפון 2: שומר שער (אברהם כהן)</span>
          </div>

          {/* Smartphone Frame */}
          <div className="w-full h-[760px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-700/80 flex flex-col relative overflow-hidden">
            {/* Notch */}
            <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-slate-950 rounded-full" />
            </div>

            {/* Screen Content */}
            <div className="flex-1 bg-slate-50 rounded-[32px] overflow-y-auto relative no-scrollbar">
              {device2Loading ? (
                <div className="p-8 text-center text-slate-500 text-xs">טוען טלפון שומר...</div>
              ) : device2User ? (
                <GuardView
                  user={device2User}
                  isConnected={isConnected}
                  lastSyncTime={lastSyncTime}
                  syncTick={syncTick}
                />
              ) : (
                <LoginScreen onLoginSuccess={(u) => setDevice2User(u)} />
              )}
            </div>

            {/* Home Indicator */}
            <div className="w-28 h-1 bg-slate-600 rounded-full mx-auto mt-2 shrink-0" />
          </div>
        </div>
      </div>

      {/* Share / QR Code Modal for Real Physical Smartphones */}
      {showShareModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 font-['Rubik']">
              פתיחה בשני סמארטפונים אמיתיים
            </h3>
            <p className="text-xs text-slate-600">
              פתח את הקישור הזה בשני מכשירים נפרדים (היכנס כמחנכת במכשיר אחד וכשומר שער במכשיר השני עם קודי הגישה הסודיים):
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 break-all select-all text-center">
              {currentUrl}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(currentUrl);
                  alert('הקישור הועתק ללוח!');
                }}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold shadow hover:bg-teal-700 transition-colors"
              >
                העתק קישור
              </button>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
