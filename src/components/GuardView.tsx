import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api.ts';
import { clientStore } from '../lib/clientStore.ts';
import { User, GatePass, GuardSearchResult, GuardStatusType } from '../types.ts';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertOctagon,
  DoorOpen,
  WifiOff,
  UserCheck,
  XCircle,
  X,
  Sparkles,
  AlertCircle,
  Layers,
  GraduationCap
} from 'lucide-react';

interface GuardViewProps {
  user: User;
  isConnected: boolean;
  lastSyncTime: string;
  syncTick: number;
}

export const GuardView: React.FC<GuardViewProps> = ({
  user,
  isConnected,
  lastSyncTime,
  syncTick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GuardSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GuardSearchResult | null>(null);
  const [activePasses, setActivePasses] = useState<(GatePass & { isNowValid: boolean })[]>([]);
  const [recentExits, setRecentExits] = useState<GatePass[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Exit confirmation modal
  const [confirmingExitPass, setConfirmingExitPass] = useState<{
    pass: GatePass;
    studentName: string;
    className: string;
  } | null>(null);
  const [isSubmittingExit, setIsSubmittingExit] = useState<boolean>(false);
  const [exitFeedback, setExitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch active gate passes
  const loadGateData = async () => {
    try {
      const res = await api.getActivePasses();
      setActivePasses(res.activePasses);
      setRecentExits(res.recentExits);
      setCurrentTime(res.currentTime);
    } catch {
      // ignore
    }
  };

  // Perform search query
  const executeSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSelectedResult(null);
      return;
    }

    try {
      setLoading(true);
      const res = await api.searchGuard(query);
      setSearchResults(res.results);
      setCurrentTime(res.currentTime);

      // If exactly 1 match found, auto-select it for instant verification
      if (res.results.length === 1) {
        setSelectedResult(res.results[0]);
      } else if (res.results.length === 0) {
        setSelectedResult(null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGateData();

    // 1. Subscribe directly to clientStore so Firestore onSnapshot updates guard immediately
    const unsubscribe = clientStore.subscribe(() => {
      loadGateData();
      if (searchQuery.trim()) {
        executeSearch(searchQuery);
      }
    });

    // 2. High-frequency 2.5-second polling interval
    const interval = setInterval(() => {
      loadGateData();
    }, 2500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    loadGateData();
    if (searchQuery.trim()) {
      executeSearch(searchQuery);
    }
  }, [syncTick]);

  // When search query changes
  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    executeSearch(text);
    if (!text.trim()) {
      setSelectedResult(null);
    }
  };

  const handleSelectStudent = (result: GuardSearchResult) => {
    setSelectedResult(result);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Guard clicks "סמן שיצא"
  const handleInitiateExit = (pass: GatePass, studentName: string, className: string) => {
    if (!isConnected) return;
    setConfirmingExitPass({
      pass,
      studentName,
      className,
    });
  };

  // Confirm exit submission (Atomic server call)
  const handleConfirmExit = async () => {
    if (!confirmingExitPass || isSubmittingExit) return;

    setIsSubmittingExit(true);
    setExitFeedback(null);

    try {
      const res = await api.markExit(confirmingExitPass.pass.id, user);
      setExitFeedback({
        type: 'success',
        message: res.message || `יציאת ${confirmingExitPass.studentName} נרשמה בהצלחה`,
      });

      // Close modal and reset search to return guard directly to ready state for next student
      setConfirmingExitPass(null);
      handleClearSearch();

      // Refresh data
      await loadGateData();

      // Auto clear toast after 4s
      setTimeout(() => {
        setExitFeedback(null);
      }, 4000);
    } catch (err: any) {
      setExitFeedback({
        type: 'error',
        message: err.message || 'שגיאה באישור היציאה. ייתכן שהאישור בוטל או סומן כבר.',
      });
      setConfirmingExitPass(null);
      // Re-run search to show fresh status
      if (searchQuery) {
        executeSearch(searchQuery);
      }
      await loadGateData();
    } finally {
      setIsSubmittingExit(false);
    }
  };

  // Helper to resolve homeroom teacher for a class
  const getHomeroomTeacher = (_className: string, fallback?: string) => {
    return fallback || 'מחנכת כיתה';
  };

  const isSubjectAuthorizer = (teacherName: string, className: string, homeroom?: string) => {
    const cleanTeacher = (teacherName || '').trim();
    if (cleanTeacher.includes('מקצועי') || cleanTeacher.includes('מוחמד עלי')) return true;
    const hr = homeroom || getHomeroomTeacher(className);
    if (hr && hr.trim() !== cleanTeacher) return true;
    return false;
  };

  // Group active passes by class
  const passesByClass = activePasses.reduce((acc, p) => {
    if (!acc[p.className]) acc[p.className] = [];
    acc[p.className].push(p);
    return acc;
  }, {} as Record<string, typeof activePasses>);

  // Render Status Badge / Card for search result
  const renderStatusCard = (result: GuardSearchResult) => {
    const { student, pass, statusType, statusText } = result;
    const homeroom = student.teacherName || pass?.homeroomTeacher || getHomeroomTeacher(student.className);
    const isSubject = pass ? isSubjectAuthorizer(pass.teacherName, student.className, homeroom) : false;

    switch (statusType) {
      case 'APPROVED_NOW':
        return (
          <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-md text-center">
            <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-900 tracking-tight font-['Rubik']">
              מאושר לצאת עכשיו
            </div>
            <div className="text-lg font-black text-slate-900 mt-2 font-['Rubik']">
              {student.fullName} · כיתה {student.className}
            </div>

            {/* Structured Dual Verification Box: Homeroom vs Authorizer */}
            <div className="mt-3.5 p-3.5 bg-white rounded-2xl border-2 border-emerald-200 text-right space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-700" />
                  <span>מחנכת הכיתה:</span>
                </span>
                <span className="font-black text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg text-xs">
                  {homeroom}
                </span>
              </div>

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  {isSubject ? (
                    <GraduationCap className="w-4 h-4 text-blue-700" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-teal-700" />
                  )}
                  <span>מי אישר את השחרור:</span>
                </span>
                <span className={`font-black px-2.5 py-0.5 rounded-lg text-xs ${
                  isSubject ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'bg-teal-50 text-teal-900 border border-teal-200'
                }`}>
                  {pass?.teacherName} {isSubject ? '(מורה מקצועי)' : '(מחנכת הכיתה)'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>שעת אישור השחרור:</span>
                </span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  משעה {pass?.validFromTime}
                </span>
              </div>

              {pass?.reason && (
                <div className="pt-1.5 border-t border-slate-100 text-slate-700">
                  <span className="font-bold text-slate-500 ml-1">סיבת שחרור:</span>
                  <span className="font-semibold">{pass.reason}</span>
                </div>
              )}
            </div>

            {/* Big Action Button */}
            <div className="mt-5">
              <button
                type="button"
                disabled={!isConnected}
                onClick={() => handleInitiateExit(pass!, student.fullName, student.className)}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <DoorOpen className="w-6 h-6" />
                <span>סמן שיצא מהשער</span>
              </button>
              {!isConnected && (
                <div className="text-[11px] text-rose-600 mt-1.5 font-medium">
                  אין חיבור לרשת — הכפתור מושבת למניעת שגיאות
                </div>
              )}
            </div>
          </div>
        );

      case 'APPROVED_FUTURE':
        return (
          <div className="bg-amber-50 border-2 border-amber-500 rounded-3xl p-5 sm:p-6 shadow-md text-center">
            <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <Clock className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-900 tracking-tight font-['Rubik']">
              האישור ייכנס לתוקף בשעה {pass?.validFromTime}
            </div>
            <div className="text-lg font-black text-slate-900 mt-2 font-['Rubik']">
              {student.fullName} · כיתה {student.className}
            </div>

            {/* Structured Dual Verification Box */}
            <div className="mt-3.5 p-3.5 bg-white rounded-2xl border-2 border-amber-200 text-right space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-700" />
                  <span>מחנכת הכיתה:</span>
                </span>
                <span className="font-black text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg text-xs">
                  {homeroom}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  {isSubject ? (
                    <GraduationCap className="w-4 h-4 text-blue-700" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-teal-700" />
                  )}
                  <span>מי אישר את השחרור:</span>
                </span>
                <span className={`font-black px-2.5 py-0.5 rounded-lg text-xs ${
                  isSubject ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'bg-teal-50 text-teal-900 border border-teal-200'
                }`}>
                  {pass?.teacherName} {isSubject ? '(מורה מקצועי)' : '(מחנכת הכיתה)'}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-100/80 rounded-xl text-xs text-amber-900 font-bold">
              התלמיד אינו מורשה לצאת עדיין. יש להמתין לשעה {pass?.validFromTime} (השעה כעת: {currentTime}).
            </div>
          </div>
        );

      case 'ALREADY_EXITED':
        return (
          <div className="bg-blue-50 border-2 border-blue-400 rounded-3xl p-5 sm:p-6 shadow-md text-center">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <UserCheck className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight font-['Rubik']">
              כבר יצא בשעה {pass?.usedAt ? new Date(pass.usedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
            <div className="text-lg font-black text-slate-900 mt-2 font-['Rubik']">
              {student.fullName} · כיתה {student.className}
            </div>

            {/* Structured Dual Verification Box */}
            <div className="mt-3.5 p-3.5 bg-white rounded-2xl border-2 border-blue-200 text-right space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-700" />
                  <span>מחנכת הכיתה:</span>
                </span>
                <span className="font-black text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg text-xs">
                  {homeroom}
                </span>
              </div>

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  {isSubject ? (
                    <GraduationCap className="w-4 h-4 text-blue-700" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-teal-700" />
                  )}
                  <span>מי אישר את השחרור:</span>
                </span>
                <span className={`font-black px-2.5 py-0.5 rounded-lg text-xs ${
                  isSubject ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'bg-teal-50 text-teal-900 border border-teal-200'
                }`}>
                  {pass?.teacherName} {isSubject ? '(מורה מקצועי)' : '(מחנכת הכיתה)'}
                </span>
              </div>

              {pass?.usedBy && (
                <div className="flex items-center justify-between text-emerald-800 font-bold">
                  <span>סומן בשער ע״י:</span>
                  <span>{pass.usedBy}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'CANCELLED':
        return (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-3xl p-5 sm:p-6 shadow-md text-center">
            <div className="w-14 h-14 bg-rose-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <XCircle className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-950 tracking-tight font-['Rubik']">
              האישור בוטל
            </div>
            <div className="text-lg font-black text-slate-900 mt-2 font-['Rubik']">
              {student.fullName} · כיתה {student.className}
            </div>
            <div className="mt-2 text-xs font-bold text-slate-600">
              מחנכת הכיתה: <strong className="text-slate-900">{homeroom}</strong>
            </div>
            <div className="text-xs text-rose-700 mt-2 font-bold p-2.5 bg-rose-100 rounded-xl">
              האישור בוטל על ידי {pass?.cancelledBy || pass?.teacherName || 'המורה'}. אין לאפשר יציאה!
            </div>
          </div>
        );

      case 'NO_PASS':
      default:
        return (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-3xl p-5 sm:p-6 shadow-md text-center">
            <div className="w-14 h-14 bg-rose-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <AlertOctagon className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-950 tracking-tight font-['Rubik']">
              אין אישור יציאה פעיל
            </div>
            <div className="text-lg font-black text-slate-900 mt-2 font-['Rubik']">
              {student.fullName} · כיתה {student.className}
            </div>
            <div className="mt-2 text-xs font-bold text-slate-700">
              מחנכת הכיתה לבירור: <strong className="text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">{homeroom}</strong>
            </div>
            <div className="text-xs text-rose-800 mt-3 font-semibold p-2.5 bg-rose-100/70 rounded-xl">
              התלמיד רשום בבית הספר אך לא הונפק עבורו שום אישור יציאה להיום.
            </div>
          </div>
        );
    }
  };

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-4 sm:pt-6">
      {/* Offline Alert Banner */}
      {!isConnected && (
        <div className="mb-4 p-4 bg-rose-600 text-white rounded-2xl flex items-center justify-between gap-3 shadow-md animate-pulse">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold text-sm">אין חיבור — לא ניתן לאמת אישור</div>
              <div className="text-xs text-rose-100">עדכון אחרון: {lastSyncTime || 'לא ידוע'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Feedback Notification Toast */}
      {exitFeedback && (
        <div
          className={`mb-4 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm border ${
            exitFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {exitFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-bold">{exitFeedback.message}</span>
          </div>
          <button onClick={() => setExitFeedback(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Guard Header Banner - Deep Blue */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-teal-300 font-semibold tracking-wide">עמדת ביטחון</div>
            <h1 className="text-2xl font-bold font-['Rubik'] mt-0.5">בדיקה בשער</h1>
            <p className="text-xs text-slate-300 mt-1">{user.fullName}</p>
          </div>
          <div className="text-left bg-white/10 rounded-2xl px-3 py-2 border border-white/10">
            <div className="text-[11px] text-slate-300">פעילים עכשיו</div>
            <div className="text-base font-bold text-teal-300">{activePasses.length} אישורים</div>
          </div>
        </div>
      </div>

      {/* Main Search Input */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 mb-5">
        <label htmlFor="guard-student-search" className="block text-xs font-bold text-slate-700 mb-2">
          הקלד שם תלמיד לבדיקה מיידית:
        </label>
        <div className="relative">
          <Search className="w-6 h-6 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="guard-student-search"
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="הקלד שם תלמיד או כיתה..."
            className="w-full pl-10 pr-13 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-teal-600 focus:outline-none transition-all shadow-inner"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 bg-slate-200 hover:bg-slate-300 px-2.5 py-1 rounded-lg transition-colors"
            >
              נקה
            </button>
          )}
        </div>

        {/* Multiple Matches Disambiguation list */}
        {searchQuery.trim() && searchResults.length > 1 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-600 mb-2">
              נמצאו {searchResults.length} תלמידים. בחר את התלמיד המתאים:
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searchResults.map((res) => (
                <div
                  key={res.student.id}
                  onClick={() => handleSelectStudent(res)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedResult?.student.id === res.student.id
                      ? 'bg-teal-50 border-teal-500 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{res.student.fullName}</span>
                    <span className="text-xs font-semibold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md mr-2">
                      כיתה {res.student.className}
                    </span>
                  </div>
                  <div className="text-xs font-medium">
                    {res.statusType === 'APPROVED_NOW' && (
                      <span className="text-emerald-700 font-bold">מאושר לצאת</span>
                    )}
                    {res.statusType === 'APPROVED_FUTURE' && (
                      <span className="text-amber-700 font-bold">משעה {res.pass?.validFromTime}</span>
                    )}
                    {res.statusType === 'ALREADY_EXITED' && (
                      <span className="text-blue-700 font-bold">כבר יצא</span>
                    )}
                    {res.statusType === 'NO_PASS' && (
                      <span className="text-slate-400">ללא אישור</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Matches Found */}
        {searchQuery.trim() && !loading && searchResults.length === 0 && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <p className="text-base font-bold text-slate-800">לא נמצא תלמיד בשם הזה</p>
            <p className="text-xs text-slate-500 mt-1">בדוק את איות השם או נסה לחפש לפי כיתה</p>
          </div>
        )}
      </div>

      {/* Selected Student Result Verification Card */}
      {selectedResult && (
        <div className="mb-6 animate-in fade-in">
          <div className="text-xs font-bold text-slate-600 mb-2 px-1">תוצאת בדיקה:</div>
          {renderStatusCard(selectedResult)}
        </div>
      )}

      {/* Live "אישורים חדשים" Feed - Auto-updates via SSE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900 font-['Rubik']">
              אישורים חדשים היום ({activePasses.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">מתעדכן אוטומטית</span>
        </div>

        {activePasses.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 text-slate-500">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">אין כרגע אישורי יציאה ממתינים בשער</p>
            <p className="text-xs text-slate-400 mt-1">
              ברגע שמחנכת תשגר אישור מהטלפון שלה, הוא יופיע כאן אוטומטית ללא צורך ברענון.
            </p>
          </div>
        ) : (
          Object.entries(passesByClass).map(([className, passes]) => (
            <div key={className} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
                <div className="font-bold text-slate-900 text-sm">
                  כיתה {className} · מחנכת כיתה: {getHomeroomTeacher(className, passes[0]?.homeroomTeacher)}
                </div>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                  {passes.length} תלמידים
                </span>
              </div>

              <div className="space-y-2">
                {passes.map((pass) => {
                  const isNew =
                    Date.now() - new Date(pass.createdAt).getTime() < 15 * 60 * 1000; // < 15 mins
                  const isSubject = isSubjectAuthorizer(pass.teacherName, pass.className, pass.homeroomTeacher);

                  return (
                    <div
                      key={pass.id}
                      onClick={() => {
                        handleQueryChange(pass.studentName);
                      }}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{pass.studentName}</span>
                          {isNew && (
                            <span className="text-[10px] font-bold text-white bg-teal-600 px-1.5 py-0.5 rounded-full">
                              חדש
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          מחנכת: <strong className="text-slate-800">{pass.homeroomTeacher || getHomeroomTeacher(pass.className)}</strong> · 
                          אישור מאת: <strong className={isSubject ? 'text-blue-800' : 'text-teal-800'}>{pass.teacherName} {isSubject ? '(מקצועי)' : ''}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">משעה: {pass.validFromTime}</span>
                        <span className="text-xs font-bold text-teal-700 bg-white px-2 py-1 rounded-lg border border-slate-200">
                          בדוק
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Recent exits audit strip */}
        {recentExits.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-500 mb-2 px-1">יציאות אחרונות שנרשמו היום:</div>
            <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-1.5">
              {recentExits.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-100 last:border-none">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-slate-900">{p.studentName}</span>
                    <span className="text-slate-400">({p.className})</span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {p.usedAt ? new Date(p.usedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Exit Confirmation Dialog */}
      {confirmingExitPass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <DoorOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 font-['Rubik']">אישור יציאה מהשער</h3>
              <p className="text-xs text-slate-500 mt-1">האם לרשום יציאה בפועל כעת?</p>
            </div>

            <div className="my-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <div className="text-lg font-bold text-slate-900">{confirmingExitPass.studentName}</div>
              <div className="text-xs font-semibold text-teal-800 mt-0.5">כיתה {confirmingExitPass.className}</div>
              <div className="text-xs text-slate-500 mt-2">
                מאושר ע״י: {confirmingExitPass.pass.teacherName} · שעה מורשית: {confirmingExitPass.pass.validFromTime}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmingExitPass(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
              >
                חזור
              </button>

              <button
                type="button"
                disabled={isSubmittingExit}
                onClick={handleConfirmExit}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-slate-300 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isSubmittingExit ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>אשר יציאה סופית</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
