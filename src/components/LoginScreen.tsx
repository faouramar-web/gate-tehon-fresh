import React, { useState } from 'react';
import { api } from '../lib/api.ts';
import { User } from '../types.ts';
import { ShieldCheck, KeyRound, AlertCircle, ArrowLeft, Lock } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onOpenSimulator?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onOpenSimulator }) => {
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanPinInput = (val: string) => {
    return (val || '')
      .replace(/[\u0660-\u0669]/g, (c) => (c.charCodeAt(0) - 0x0660).toString())
      .replace(/[\u06F0-\u06F9]/g, (c) => (c.charCodeAt(0) - 0x06F0).toString())
      .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\s]/g, '')
      .trim();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = cleanPinInput(pinCode);
    if (!clean) {
      setErrorMessage('אנא הזן את קוד הגישה האישי שלך');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.login(clean);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'קוד גישה שגוי');
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pinCode.length < 8) {
      setPinCode((prev) => prev + digit);
      setErrorMessage(null);
    }
  };

  const handleBackspace = () => {
    setPinCode((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPinCode('');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-center items-center px-4 py-8 bg-slate-50">
      <div className="w-full max-w-md mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Header Banner - Deep Blue */}
          <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white p-6 sm:p-8 text-center relative">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-10 h-10 text-teal-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-['Rubik']">אישור לשער</h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xs mx-auto">
              מערכת בית ספרית לניהול ואימות יציאת תלמידים בזמן אמת
            </p>
          </div>

          {/* Form Section */}
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="pin-input" className="block text-sm font-semibold text-slate-800 mb-2">
                  קוד גישה אישי סודי
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    id="pin-input"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={pinCode}
                    onChange={(e) => {
                      setPinCode(cleanPinInput(e.target.value));
                      setErrorMessage(null);
                    }}
                    placeholder="הקלד קוד גישה אישי"
                    className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center text-xl font-bold tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:text-sm placeholder:font-normal focus:bg-white focus:border-teal-600 focus:outline-none transition-all shadow-inner"
                    maxLength={8}
                    autoFocus
                  />
                  {pinCode && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs text-slate-400 hover:text-slate-600 font-medium"
                    >
                      נקה
                    </button>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Enter Button (Turquoise Primary Action) */}
              <button
                type="submit"
                disabled={loading || !pinCode.trim()}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-base rounded-xl shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>כניסה למערכת</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Numeric Keypad for fast mobile typing */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="text-center text-xs text-slate-500 mb-3 font-medium">
                הקשה מהירה בסמארטפון:
              </div>
              <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg flex items-center justify-center transition-colors shadow-sm"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 font-medium text-xs flex items-center justify-center shadow-sm"
                >
                  נקה
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg flex items-center justify-center shadow-sm"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 font-medium text-xs flex items-center justify-center shadow-sm"
                >
                  מחק
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Confidentiality Notice */}
        <div className="mt-4 text-center space-y-1">
          <p className="text-xs text-slate-600 flex items-center justify-center gap-1 font-medium">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>הגישה מותרת לצוות מורשה בלבד · קוד הכניסה אישי וסודי</span>
          </p>
        </div>
      </div>
    </div>
  );
};
