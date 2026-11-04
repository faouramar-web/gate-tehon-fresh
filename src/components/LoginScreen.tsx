import React, { useState } from 'react';
import { api } from '../lib/api.ts';
import { User } from '../types.ts';
import { ShieldCheck, KeyRound, AlertCircle, ArrowLeft, Lock, Delete, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onOpenSimulator?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onOpenSimulator }) => {
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPinText, setShowPinText] = useState(false);

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
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPinCode('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-center items-center px-4 py-6 sm:py-10 bg-slate-100/70">
      <div className="w-full max-w-md mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
          {/* Header Banner - Executive Deep Blue with Ambient Glow */}
          <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6 sm:p-7 text-center relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-teal-500/20 border-2 border-teal-400/40 flex items-center justify-center shadow-lg shadow-teal-950/40 relative">
              <ShieldCheck className="w-10 h-10 text-teal-300" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Rubik'] text-white">
              אישור לשער
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xs mx-auto font-medium">
              מערכת בית ספרית לניהול ואימות יציאת תלמידים בזמן אמת
            </p>
          </div>

          {/* Form & Keypad Section */}
          <div className="p-5 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="pin-input" className="block text-xs sm:text-sm font-bold text-slate-800">
                    קוד גישה אישי סודי:
                  </label>
                  {pinCode.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPinText(!showPinText)}
                      className="text-xs font-semibold text-slate-500 hover:text-teal-700 flex items-center gap-1 transition-colors"
                      title={showPinText ? 'הסתר קוד' : 'הצג קוד'}
                    >
                      {showPinText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPinText ? 'הסתר' : 'הצג'}</span>
                    </button>
                  )}
                </div>

                {/* Input field with prominent focus */}
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-5 h-5 text-teal-600" />
                  </div>
                  <input
                    id="pin-input"
                    type={showPinText ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={pinCode}
                    onChange={(e) => {
                      setPinCode(cleanPinInput(e.target.value));
                      setErrorMessage(null);
                    }}
                    placeholder="הקלד קוד גישה אישי..."
                    className="w-full pl-12 pr-11 py-3.5 bg-slate-50 border-2 border-slate-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/15 rounded-2xl text-center text-xl sm:text-2xl font-black tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:outline-none transition-all shadow-inner"
                    maxLength={8}
                    autoFocus
                  />
                  {pinCode && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs text-slate-400 hover:text-rose-600 font-bold transition-colors"
                    >
                      נקה
                    </button>
                  )}
                </div>
              </div>

              {/* Visual PIN dots indicator (Shows number of digits entered) */}
              <div className="flex items-center justify-center gap-2 py-1">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const isFilled = idx < pinCode.length;
                  return (
                    <div
                      key={idx}
                      className={`transition-all duration-200 rounded-full ${
                        isFilled
                          ? 'w-3.5 h-3.5 bg-teal-600 scale-110 shadow-sm shadow-teal-600/40'
                          : 'w-3 h-3 bg-slate-200 border border-slate-300'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-800 text-xs sm:text-sm font-bold shadow-2xs animate-shake">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Enter Button (Prominent Emerald/Teal Action Button) */}
              <button
                type="submit"
                disabled={loading || !pinCode.trim()}
                className="w-full h-14 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.98] disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-lg shadow-teal-700/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>כניסה למערכת</span>
                    <ArrowLeft className="w-5 h-5 text-teal-100" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Tactile Numeric Keypad for fast mobile typing */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="text-center text-xs font-bold text-slate-500 mb-2.5">
                הקשה מהירה בסמארטפון / מסך מגע:
              </div>
              <div className="grid grid-cols-3 gap-2.5 max-w-[300px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-13 sm:h-14 rounded-2xl bg-white hover:bg-teal-50/50 active:bg-teal-100 active:scale-95 text-slate-900 border-2 border-slate-200 hover:border-teal-500 font-black text-2xl font-mono flex items-center justify-center transition-all shadow-sm hover:shadow-md cursor-pointer select-none"
                  >
                    {digit}
                  </button>
                ))}

                {/* Clear key */}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-50 hover:bg-rose-50 active:bg-rose-100 active:scale-95 text-slate-600 hover:text-rose-700 border-2 border-slate-200 hover:border-rose-300 font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all shadow-sm cursor-pointer select-none"
                  title="נקה קוד"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500 hover:text-rose-600" />
                  <span>נקה</span>
                </button>

                {/* 0 key */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-13 sm:h-14 rounded-2xl bg-white hover:bg-teal-50/50 active:bg-teal-100 active:scale-95 text-slate-900 border-2 border-slate-200 hover:border-teal-500 font-black text-2xl font-mono flex items-center justify-center transition-all shadow-sm hover:shadow-md cursor-pointer select-none"
                >
                  0
                </button>

                {/* Backspace key */}
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-50 hover:bg-amber-50 active:bg-amber-100 active:scale-95 text-slate-600 hover:text-amber-800 border-2 border-slate-200 hover:border-amber-300 font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all shadow-sm cursor-pointer select-none"
                  title="מחק ספרה אחרונה"
                >
                  <Delete className="w-4 h-4 text-slate-500 hover:text-amber-700" />
                  <span>מחק</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Confidentiality Notice */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5 font-semibold">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>הגישה מותרת לצוות בית הספר בלבד · קוד הכניסה אישי וסודי</span>
          </p>
        </div>
      </div>
    </div>
  );
};
