import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { clientStore } from '../lib/clientStore.ts';
import { User, Student, GatePass } from '../types.ts';
import {
  Search,
  CheckCircle2,
  Clock,
  Send,
  X,
  AlertCircle,
  XCircle,
  DoorOpen,
  CalendarCheck,
  Check,
  ChevronDown,
  GraduationCap,
  UserCheck
} from 'lucide-react';

interface TeacherViewProps {
  user: User;
  onRefreshNeeded?: () => void;
  syncTick: number; // Increment from SSE / polling to trigger re-fetch
}

export const TeacherView: React.FC<TeacherViewProps> = ({ user, syncTick }) => {
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [passesToday, setPassesToday] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Modal for sending pass
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [timeMode, setTimeMode] = useState<'now' | 'custom'>('now');
  const [customTime, setCustomTime] = useState<string>('');
  const [passReason, setPassReason] = useState<string>('שחרור מוקדם באישור הורים');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Active sub-tab: 'students' or 'history'
  const [activeTab, setActiveTab] = useState<'students' | 'history'>('students');

  // Cancel pass state
  const [cancellingPassId, setCancellingPassId] = useState<string | null>(null);

  // Helper to normalize class names (handles "י1", "י 1", "י'1", "כיתה י1")
  const normalizeClass = (val: string): string => {
    if (!val) return '';
    return val
      .replace(/^כיתה\s*/i, '')
      .replace(/['"`׳״]/g, '')
      .replace(/\s+/g, '')
      .trim()
      .toLowerCase();
  };

  // Fetch classes and students
  const loadData = async (isInitial = false) => {
    try {
      if (isInitial && students.length === 0) {
        setLoading(true);
      }
      const [classRes, passRes] = await Promise.all([
        api.getTeacherClasses(),
        api.getTeacherPasses(),
      ]);

      let loadedStudents = classRes.students || [];

      // If no students returned (e.g. mobile smartphone first opening or GitHub Pages), try fetching bundle or pulling server state
      if (loadedStudents.length === 0) {
        await clientStore.fetchBundleFromCloud();
        let fresh = clientStore.getTeacherClasses(user);
        if (fresh.students && fresh.students.length > 0) {
          loadedStudents = fresh.students;
        } else {
          const pullRes = await clientStore.pullStateFromServer();
          if (pullRes) {
            fresh = clientStore.getTeacherClasses(user);
            if (fresh.students && fresh.students.length > 0) {
              loadedStudents = fresh.students;
            }
          }
        }
      }

      const rawClasses = classRes.assignedClasses || [];
      const cleanAssigned = rawClasses.filter((c) => c && c !== '*' && c !== 'כל הכיתות');
      const studentClasses = Array.from(new Set(loadedStudents.map((s) => s.className))).filter(Boolean);
      const displayClasses = cleanAssigned.length > 0 ? cleanAssigned : studentClasses;

      setAssignedClasses(displayClasses);

      if (!selectedClass) {
        if (displayClasses.length === 1) {
          setSelectedClass(displayClasses[0]);
        } else if (displayClasses.length > 1) {
          const preferred = user.assignedClasses?.find((c) => c && c !== '*' && c !== 'כל הכיתות');
          if (preferred && loadedStudents.some((s) => normalizeClass(s.className) === normalizeClass(preferred))) {
            setSelectedClass(preferred);
          } else {
            // Default to 'כל הכיתות' so all students of the teacher are instantly visible
            setSelectedClass('כל הכיתות');
          }
        }
      }
      setStudents(loadedStudents);
      setPassesToday(passRes.passes || []);

      // Pre-set custom time to current HH:mm
      if (!customTime) {
        setCustomTime(classRes.currentTime || '12:00');
      }
    } catch (err: any) {
      if (isInitial) {
        setActionError(err.message || 'שגיאה בטעינת נתונים');
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData(true);

    // 1. Subscribe directly to clientStore so Firestore onSnapshot triggers immediate re-render (<100ms)
    const unsubscribe = clientStore.subscribe(() => {
      loadData(false);
    });

    // 2. High-frequency 2-second background poll so even on mobile WhatsApp in-app browser, teacher sees exit instantly
    const pollInterval = setInterval(() => {
      loadData(false);
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    loadData(false);
  }, [syncTick]);

  // Filter students by selected class and search query
  const filteredStudents = students.filter((s) => {
    const isShowAll =
      !selectedClass ||
      selectedClass === '*' ||
      selectedClass === 'כל הכיתות' ||
      selectedClass === 'הכל';

    const matchClass =
      isShowAll ||
      normalizeClass(s.className) === normalizeClass(selectedClass);

    if (!matchClass) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q);
  });

  const toggleStudentSelection = (studentId: string) => {
    // Check if student already has active pass
    const student = (students || []).find((s) => s.id === studentId);
    if (student?.currentPass?.status === 'active') {
      return; // already has active pass
    }

    const next = new Set(selectedStudentIds);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    setSelectedStudentIds(next);
  };

  const handleSelectAll = () => {
    const selectable = filteredStudents
      .filter((s) => s.currentPass?.status !== 'active' && s.currentPass?.status !== 'used')
      .map((s) => s.id);

    if (selectedStudentIds.size === selectable.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(selectable));
    }
  };

  const handleOpenSendModal = () => {
    if (selectedStudentIds.size === 0) return;
    setActionError(null);
    setTimeMode('now');
    setShowSendModal(true);
  };

  const handleSendPasses = async () => {
    if (selectedStudentIds.size === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    const idsArray = Array.from(selectedStudentIds);
    const validFrom = timeMode === 'now' ? '' : customTime;

    try {
      const res = await api.createPasses(idsArray, validFrom, passReason, user);
      setShowSendModal(false);
      setSelectedStudentIds(new Set());
      setSuccessBanner(`האישור נשלח לשער בהצלחה (${res.createdCount} תלמידים)`);

      // Reload data
      await loadData();

      // Auto dismiss success toast
      setTimeout(() => {
        setSuccessBanner(null);
      }, 5000);
    } catch (err: any) {
      setActionError(err.message || 'שגיאה בשליחת אישור');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPass = async (passId: string) => {
    if (cancellingPassId) return;
    setCancellingPassId(passId);
    setActionError(null);

    try {
      await api.cancelPass(passId);
      setSuccessBanner('האישור בוטל בהצלחה');
      await loadData();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'לא ניתן לבטל אישור זה');
    } finally {
      setCancellingPassId(null);
    }
  };

  const selectedStudentsList = students.filter((s) => selectedStudentIds.has(s.id));
  const activePassesCount = passesToday.filter((p) => p.status === 'active').length;
  const exitedPassesCount = passesToday.filter((p) => p.status === 'used').length;

  // Map each class to its homeroom teacher name from actual student records
  const classHomeroomMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const student of students) {
      if (student.className && student.teacherName) {
        map.set(student.className.trim(), student.teacherName.trim());
      }
    }
    return map;
  }, [students]);

  const classStudentsCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const student of students) {
      if (student.className) {
        const cur = map.get(student.className.trim()) || 0;
        map.set(student.className.trim(), cur + 1);
      }
    }
    return map;
  }, [students]);

  // Determine if acting as subject teacher
  const isSubjectTeacher = React.useMemo(() => {
    if (user.fullName && (user.fullName.includes('מקצועי') || user.fullName.includes('עמאר פאעור'))) return true;
    if (assignedClasses.length > 1) return true;
    if (assignedClasses.length === 1) {
      const cls = assignedClasses[0];
      const homeroom = classHomeroomMap.get(cls);
      if (homeroom && user.fullName && !homeroom.includes(user.fullName) && !user.fullName.includes(homeroom)) {
        return true;
      }
    }
    return false;
  }, [user.fullName, assignedClasses, classHomeroomMap]);

  return (
    <div className="pb-28 max-w-2xl mx-auto px-4 pt-4 sm:pt-6">
      {/* Teacher Top Card - Deep Blue Header */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                isSubjectTeacher
                  ? 'bg-blue-500/25 text-blue-300 border-blue-400/40'
                  : 'bg-teal-500/25 text-teal-300 border-teal-400/40'
              }`}>
                {isSubjectTeacher ? 'מורה מקצועי' : 'מחנכת כיתה'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-['Rubik']">{user.fullName}</h1>
            <p className="text-xs text-slate-300 mt-1">
              כיתות משויכות:{' '}
              <span className="font-bold text-teal-300">
                {assignedClasses.length > 0 ? assignedClasses.join(', ') : 'כל הכיתות'}
              </span>
            </p>
          </div>
          <div className="text-left bg-white/10 rounded-2xl px-3 py-2 border border-white/10 shrink-0">
            <div className="text-[11px] text-slate-300">אישורי היום</div>
            <div className="text-sm font-bold text-teal-300">
              {activePassesCount} ממתינים · {exitedPassesCount} יצאו
            </div>
          </div>
        </div>

        {/* Categories Bar / Tabs for Classes */}
        {assignedClasses.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>תפריט כיתות שאני מלמד/ת (בחר כיתה לשחרור תלמידים):</span>
              {assignedClasses.length > 1 && (
                <span className="text-[10px] text-teal-300 font-bold">
                  {assignedClasses.length} כיתות
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
              {assignedClasses.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClass('כל הכיתות');
                    setSelectedStudentIds(new Set());
                  }}
                  className={`p-2.5 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer border ${
                    selectedClass === 'כל הכיתות' || !selectedClass
                      ? 'bg-teal-500 text-white border-teal-400 shadow-md scale-[1.01]'
                      : 'bg-white/10 text-slate-200 border-white/10 hover:bg-white/20'
                  }`}
                >
                  <div>
                    <div className="font-black text-xs sm:text-sm">כל הכיתות שלי</div>
                    <div className={`text-[10px] mt-0.5 ${selectedClass === 'כל הכיתות' ? 'text-teal-100 font-medium' : 'text-slate-400'}`}>
                      הצג את כל התלמידים שאני מלמד
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                    selectedClass === 'כל הכיתות' ? 'bg-white text-teal-800' : 'bg-white/15 text-white'
                  }`}>
                    {students.length}
                  </span>
                </button>
              )}

              {assignedClasses.map((cls) => {
                const isSelected = selectedClass === cls || (assignedClasses.length === 1 && (!selectedClass || selectedClass === cls));
                const homeroom = classHomeroomMap.get(cls.trim()) || '';
                const count = classStudentsCountMap.get(cls.trim()) || 0;

                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      setSelectedClass(cls);
                      setSelectedStudentIds(new Set());
                    }}
                    className={`p-2.5 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md scale-[1.01]'
                        : 'bg-white/10 text-slate-200 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div>
                      <div className="font-black text-xs sm:text-sm flex items-center gap-1.5">
                        <span>כיתה {cls}</span>
                        {isSelected && <span className="text-[10px] bg-white text-blue-900 px-1.5 py-0.2 rounded font-black">נבחרה</span>}
                      </div>
                      {homeroom && (
                        <div className={`text-[10px] mt-0.5 truncate max-w-[170px] ${isSelected ? 'text-blue-100 font-bold' : 'text-slate-300'}`}>
                          מחנכת: {homeroom}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-white text-blue-900' : 'bg-white/15 text-white'
                    }`}>
                      {count} תלמידים
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Class Indicator Banner (When specific class selected) */}
      {selectedClass && selectedClass !== 'כל הכיתות' && (
        <div className="mb-4 p-3.5 bg-blue-50/95 border-2 border-blue-300 rounded-2xl text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
              {selectedClass}
            </div>
            <div>
              <div className="text-sm font-black flex items-center gap-2">
                <span>כיתה {selectedClass}</span>
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-lg">
                  {filteredStudents.length} תלמידים בכיתה
                </span>
              </div>
              <div className="text-xs text-blue-900 font-medium mt-0.5">
                מחנכת הכיתה: <strong className="font-black text-blue-950">{classHomeroomMap.get(selectedClass) || 'צוות בית הספר'}</strong>
              </div>
            </div>
          </div>
          <div className="text-[11px] font-bold text-blue-800 bg-white px-2.5 py-1.5 rounded-xl border border-blue-200 self-start sm:self-center shrink-0">
            הנך משחרר/ת תלמידים כמורה מקצועי
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="mb-4 p-4 bg-teal-50 border-2 border-teal-500/40 rounded-2xl flex items-center justify-between gap-3 text-teal-900 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <span className="font-bold text-sm">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-teal-700 hover:text-teal-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs: Student selection vs Today's sent passes */}
      <div className="flex items-center gap-2 mb-4 bg-slate-200/70 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'students'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-teal-600" />
          <span>רשימת התלמידים ({filteredStudents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-blue-600" />
          <span>מעקב אישורי שחרור לכיתה ({passesToday.length})</span>
        </button>
      </div>

      {activeTab === 'students' ? (
        <div>
          {/* Search & Select All controls */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש תלמיד לפי שם או מזהה..."
                className="w-full pl-4 pr-11 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  נקה
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs px-1 text-slate-600">
              <span className="font-medium">
                {selectedStudentIds.size > 0 ? (
                  <strong className="text-teal-700 font-bold">
                    נבחרו {selectedStudentIds.size} מתוך {filteredStudents.length}
                  </strong>
                ) : (
                  <span>סמן תלמידים להנפקת אישור יציאה לשער</span>
                )}
              </span>

              <button
                type="button"
                onClick={handleSelectAll}
                className="text-teal-700 hover:text-teal-900 font-bold underline"
              >
                {selectedStudentIds.size === filteredStudents.filter((s) => s.currentPass?.status !== 'active' && s.currentPass?.status !== 'used').length
                  ? 'בטל הכל'
                  : 'בחר הכל'}
              </button>
            </div>
          </div>

          {/* Student List - Big Touch Rows */}
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">טוען תלמידים...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">לא נמצאו תלמידים להצגה</p>
              <p className="text-xs text-slate-400 mt-1">
                {students.length > 0
                  ? 'נבחרה כיתה ספציפית או הופעל חיפוש ללא תוצאות'
                  : 'רשימת התלמידים נטענת או ממתינה לסנכרון מבית הספר'}
              </p>
              {students.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClass('כל הכיתות');
                    setSearchQuery('');
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  הצג את כל התלמידים ({students.length})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => loadData(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  רענן רשימה מבית הספר
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudentIds.has(student.id);
                const pass = student.currentPass;
                const hasActivePass = pass?.status === 'active';
                const hasUsedPass = pass?.status === 'used';
                const isDisabled = hasActivePass || hasUsedPass;

                return (
                  <div
                    key={student.id}
                    onClick={() => !isDisabled && toggleStudentSelection(student.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-teal-50/80 border-teal-500 shadow-sm'
                        : isDisabled
                        ? 'bg-slate-100/90 border-slate-200 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm active:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left Checkbox & Name */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : isDisabled
                              ? 'bg-slate-200 border-slate-300 text-slate-400'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>

                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-2">
                            <span>{student.fullName}</span>
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {student.studentCode}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">כיתה {student.className}</div>
                        </div>
                      </div>

                      {/* Status Pill on the Right */}
                      <div className="shrink-0">
                        {hasActivePass && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2.5 py-1 rounded-xl animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>ממתין בשער ({pass.validFromTime})</span>
                          </span>
                        )}

                        {hasUsedPass && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xl shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>✓ יצא/ה מהשער</span>
                          </span>
                        )}

                        {!hasActivePass && !hasUsedPass && isSelected && (
                          <span className="text-xs font-bold text-teal-700">מסומן לשליחה</span>
                        )}
                      </div>
                    </div>

                    {/* Prominent Authorizer and Release Info (For Homeroom and Subject Teacher tracking) */}
                    {pass && (hasActivePass || hasUsedPass) && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 bg-white/60 p-2.5 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-500 font-bold text-[11px]">אישור שחרור ע״י:</span>
                          <span className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] flex items-center gap-1 ${
                            pass.teacherName === user.fullName
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}>
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>{pass.teacherName === user.fullName ? `על ידך (${user.fullName})` : pass.teacherName}</span>
                          </span>
                          {pass.reason && (
                            <span className="text-slate-600 text-[11px] font-medium truncate max-w-[220px]">
                              · {pass.reason}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-bold text-slate-700 font-mono">
                          {hasUsedPass ? (
                            <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              יציאה בשער: {pass.usedAt ? (pass.usedAt.includes('T') ? pass.usedAt.split('T')[1].substring(0, 5) : pass.usedAt) : ''}
                            </span>
                          ) : (
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              תוקף יציאה: {pass.validFromTime}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* History Section: "אישורים ששלחתי היום" */
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-600 px-1">
            מעקב אחר אישורי יציאה להיום והסטטוס שלהם בשער:
          </div>

          {passesToday.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">עדיין לא נשלחו אישורים היום</p>
              <p className="text-xs text-slate-400 mt-1">
                סמן תלמידים בלשונית ״רשימת התלמידים״ ולחץ על ״שליחת אישור לשער״
              </p>
            </div>
          ) : (
            passesToday.map((pass) => {
              const isUsed = pass.status === 'used';
              const isCancelled = pass.status === 'cancelled';
              const isActive = pass.status === 'active';

              return (
                <div
                  key={pass.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isUsed
                      ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                      : isCancelled
                      ? 'bg-slate-100 border-slate-200 opacity-60'
                      : 'bg-amber-50/60 border-amber-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{pass.studentName}</span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">כיתה {pass.className}</span>
                        <span className="text-[11px] font-mono text-slate-400">({pass.studentCode})</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                        <span>הונפק לשעה: <strong>{pass.validFromTime}</strong></span>
                        {pass.reason && <span>· סיבה: <strong>{pass.reason}</strong></span>}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0 text-left">
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>ממתין בשער</span>
                        </span>
                      )}

                      {isUsed && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>יצא מהשער {pass.usedAt ? (pass.usedAt.includes('T') ? pass.usedAt.split('T')[1].substring(0, 5) : pass.usedAt) : ''}</span>
                        </span>
                      )}

                      {isCancelled && (
                        <span className="inline-block text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200">
                          אישור בוטל
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Authorization & Gate Exit Breakdown */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-bold block mb-1">מי אישר את השחרור:</span>
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className={pass.teacherName === user.fullName ? 'text-teal-700 font-black' : 'text-blue-950 font-black'}>
                          {pass.teacherName === user.fullName ? `אישור שלך (${user.fullName})` : pass.teacherName}
                        </span>
                      </div>
                      {pass.homeroomTeacher && pass.teacherName !== pass.homeroomTeacher && (
                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                          מחנכת הכיתה: <strong className="text-slate-700">{pass.homeroomTeacher}</strong>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-bold block mb-1">יציאה בפועל מהשער:</span>
                      <div>
                        {isUsed ? (
                          <>
                            <div className="font-extrabold text-emerald-800 flex items-center gap-1">
                              <DoorOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>יצא/ה בשעה {pass.usedAt ? (pass.usedAt.includes('T') ? pass.usedAt.split('T')[1].substring(0, 5) : pass.usedAt) : ''}</span>
                            </div>
                            {pass.usedBy && (
                              <div className="text-[10px] text-emerald-700 font-medium mt-1">
                                אושר פיזית בשער ע״י: <strong>{pass.usedBy}</strong>
                              </div>
                            )}
                          </>
                        ) : isCancelled ? (
                          <div className="text-rose-700 font-bold">לא יצא (האישור בוטל)</div>
                        ) : (
                          <div className="text-amber-800 font-bold flex items-center gap-1">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>טרם יצא/ה (ממתין/ה ליציאה)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cancel button if pass is still active */}
                  {isActive && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">התלמיד טרם יצא מבית הספר</span>
                      <button
                        type="button"
                        disabled={cancellingPassId === pass.id}
                        onClick={() => handleCancelPass(pass.id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{cancellingPassId === pass.id ? 'מבטל...' : 'ביטול אישור'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Floating Bottom Action Bar - Natural Thumb Zone */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            disabled={selectedStudentIds.size === 0}
            onClick={handleOpenSendModal}
            className="flex-1 h-14 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.98] disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none text-white font-black text-base sm:text-lg rounded-2xl shadow-lg shadow-teal-700/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Send className="w-5 h-5" />
            <span>שליחת אישור לשער</span>
            {selectedStudentIds.size > 0 && (
              <span className="bg-white text-teal-800 font-black text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                {selectedStudentIds.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal before Sending */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Grab handle for mobile */}
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 font-['Rubik']">אישור שליחה לשער</h2>
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  תלמידים שנבחרו ({selectedStudentsList.length}):
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-36 overflow-y-auto space-y-1.5">
                  {selectedStudentsList.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs text-slate-800">
                      <span className="font-semibold">{s.fullName}</span>
                      <span className="text-slate-500">כיתה {s.className} ({s.studentCode})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  שעת יציאה מותרת:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTimeMode('now')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                      timeMode === 'now'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>מעכשיו (מיידי)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimeMode('custom')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                      timeMode === 'custom'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CalendarCheck className="w-4 h-4 text-teal-600" />
                    <span>שעה מאוחרת יותר</span>
                  </button>
                </div>

                {timeMode === 'custom' && (
                  <div className="mt-3">
                    <label className="block text-xs text-slate-500 mb-1">בחר שעה מדויקת:</label>
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold text-slate-900 text-base focus:bg-white focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  סיבת יציאה:
                </label>
                <input
                  type="text"
                  value={passReason}
                  onChange={(e) => setPassReason(e.target.value)}
                  placeholder="לדוגמה: שחרור מוקדם באישור הורים / רופא"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold">סיבות מהירות:</span>
                  {[
                    isSubjectTeacher ? 'שחרור מוקדם באישור מורה מקצועי' : 'שחרור מוקדם באישור מחנכת',
                    'שחרור מוקדם באישור הורים',
                    'בדיקה רפואית / רופא',
                    'אירוע משפחתי',
                    'סיום יום לימודים מוקדם',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPassReason(r)}
                      className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                        passReason === r
                          ? 'bg-teal-600 text-white border-teal-600 font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer"
              >
                ביטול
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSendPasses}
                className="flex-1 h-12 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.98] disabled:bg-slate-300 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-teal-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>אשר ושגר לשער</span>
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
