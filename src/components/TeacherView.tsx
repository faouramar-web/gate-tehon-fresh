import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { clientStore, deduplicateStudents } from '../lib/clientStore.ts';
import { User, Student, GatePass, LateArrival } from '../types.ts';
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
  UserCheck,
  MessageCircle,
  Users,
  Share2,
  Copy,
  Phone,
  ExternalLink,
  Plus,
  Trash2,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { ComprehensiveReportsView } from './ComprehensiveReportsView.tsx';
import {
  buildClassExitWhatsAppMessage,
  buildStudentExitWhatsAppMessage,
  buildLateArrivalWhatsAppMessage,
  createWhatsAppUrl,
  formatWhatsAppPhone
} from '../lib/whatsapp.ts';

interface TeacherViewProps {
  user: User;
  onRefreshNeeded?: () => void;
  syncTick: number; // Increment from SSE / polling to trigger re-fetch
}

export const TeacherView: React.FC<TeacherViewProps> = ({ user, syncTick }) => {
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const selectedClassRef = React.useRef<string>('');
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

  // Active sub-tab: 'students', 'history', or 'late_arrivals'
  const [activeTab, setActiveTab] = useState<'students' | 'history' | 'late_arrivals'>('students');

  // Gate Duty & Late Arrivals State
  const [lateArrivalsToday, setLateArrivalsToday] = useState<LateArrival[]>([]);
  const [showGateDutyModal, setShowGateDutyModal] = useState<boolean>(false);
  const [lateStudentQuery, setLateStudentQuery] = useState<string>('');
  const [selectedLateStudent, setSelectedLateStudent] = useState<Student | null>(null);
  const [lateTime, setLateTime] = useState<string>('');
  const [lateReason, setLateReason] = useState<string>('הסעה / תחבורה איחרה');
  const [lateNotes, setLateNotes] = useState<string>('');
  const [isSubmittingLate, setIsSubmittingLate] = useState<boolean>(false);
  const [deletingLateId, setDeletingLateId] = useState<string | null>(null);
  const [allSchoolStudents, setAllSchoolStudents] = useState<Student[]>([]);
  const [showTeacherReportsModal, setShowTeacherReportsModal] = useState<boolean>(false);

  // Cancel pass state
  const [cancellingPassId, setCancellingPassId] = useState<string | null>(null);

  // Parent WhatsApp Notification States (Only for exited students after guard confirmation)
  const [selectedExitedPassIds, setSelectedExitedPassIds] = useState<Set<string>>(new Set());
  const [showClassGroupModal, setShowClassGroupModal] = useState<boolean>(false);
  const [showIndividualParentsModal, setShowIndividualParentsModal] = useState<boolean>(false);
  const [activeSingleStudentPass, setActiveSingleStudentPass] = useState<GatePass | null>(null);
  const [copiedTextToast, setCopiedTextToast] = useState<string | null>(null);
  const [parentPhoneMap, setParentPhoneMap] = useState<Record<string, string>>({});
  const [customGroupText, setCustomGroupText] = useState<string>('');

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
      const todayDateStr = clientStore.getIsraelDate();
      const [classRes, passRes, lateRes] = await Promise.all([
        api.getTeacherClasses(),
        api.getTeacherPasses(),
        api.getLateArrivals({ dateStr: todayDateStr }).catch(() => ({ lateArrivals: [] })),
      ]);

      let loadedStudents = deduplicateStudents(classRes.students || []);

      // If no students returned (e.g. mobile smartphone first opening or GitHub Pages), try fetching bundle or pulling server state
      if (loadedStudents.length === 0) {
        await clientStore.fetchBundleFromCloud();
        let fresh = clientStore.getTeacherClasses(user);
        if (fresh.students && fresh.students.length > 0) {
          loadedStudents = deduplicateStudents(fresh.students);
        } else {
          const pullRes = await clientStore.pullStateFromServer();
          if (pullRes) {
            fresh = clientStore.getTeacherClasses(user);
            if (fresh.students && fresh.students.length > 0) {
              loadedStudents = deduplicateStudents(fresh.students);
            }
          }
        }
      }

      const rawClasses = classRes.assignedClasses || [];
      const cleanAssigned = rawClasses.filter((c) => c && c !== '*' && c !== 'כל הכיתות');
      const studentClasses = Array.from(new Set(loadedStudents.map((s) => s.className))).filter(Boolean);
      const displayClasses = cleanAssigned.length > 0 ? cleanAssigned : studentClasses;

      setAssignedClasses(displayClasses);

      // Bulletproof class selection: never overwrite user's selected class during background polling!
      const currentSelected = selectedClassRef.current;
      if (!currentSelected) {
        let initialCls = 'כל הכיתות';
        if (displayClasses.length === 1) {
          initialCls = displayClasses[0];
        } else if (displayClasses.length > 1) {
          initialCls = 'כל הכיתות';
        }
        selectedClassRef.current = initialCls;
        setSelectedClass(initialCls);
      } else if (
        currentSelected !== 'כל הכיתות' &&
        currentSelected !== '*' &&
        displayClasses.length > 0 &&
        !displayClasses.map(normalizeClass).includes(normalizeClass(currentSelected))
      ) {
        const fallback = displayClasses[0] || 'כל הכיתות';
        selectedClassRef.current = fallback;
        setSelectedClass(fallback);
      }

      setStudents(loadedStudents);
      const schoolAll = clientStore.getAllStudents(user.schoolId);
      setAllSchoolStudents(schoolAll.length > 0 ? deduplicateStudents(schoolAll) : loadedStudents);
      setPassesToday(passRes.passes || []);
      const localLate = clientStore.getLateArrivals({ dateStr: todayDateStr });
      const serverLate = lateRes?.lateArrivals || [];
      const arrivalMap = new Map<string, LateArrival>();
      for (const item of localLate) arrivalMap.set(item.id, item);
      for (const item of serverLate) arrivalMap.set(item.id, item);
      const mergedLate = Array.from(arrivalMap.values()).sort(
        (a, b) => (b.timeStr || '').localeCompare(a.timeStr || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      setLateArrivalsToday(mergedLate);

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

  // Handle user selecting a class button (updates state & ref so background polling never resets it)
  const handleSelectClass = (cls: string) => {
    selectedClassRef.current = cls;
    setSelectedClass(cls);
    setSelectedStudentIds(new Set());
  };

  // Filter passes by selected class so history shows only passes of selected class (or all if 'כל הכיתות')
  const filteredPasses = passesToday.filter((p) => {
    const isShowAll =
      !selectedClass ||
      selectedClass === '*' ||
      selectedClass === 'כל הכיתות' ||
      selectedClass === 'הכל';

    if (isShowAll) return true;
    return normalizeClass(p.className) === normalizeClass(selectedClass);
  });

  // Filter late arrivals by selected class
  const filteredLateArrivals = lateArrivalsToday.filter((la) => {
    const isShowAll =
      !selectedClass ||
      selectedClass === '*' ||
      selectedClass === 'כל הכיתות' ||
      selectedClass === 'הכל';

    if (isShowAll) return true;
    return normalizeClass(la.className) === normalizeClass(selectedClass);
  });

  const handleOpenGateDutyModal = () => {
    setLateStudentQuery('');
    setSelectedLateStudent(null);
    setLateNotes('');
    setLateReason('הסעה / תחבורה איחרה');
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setLateTime(`${hours}:${minutes}`);
    setShowGateDutyModal(true);
  };

  const handleRecordLateArrival = async () => {
    if (!selectedLateStudent || isSubmittingLate) return;
    setIsSubmittingLate(true);
    setActionError(null);
    try {
      await api.recordLateArrival({
        studentId: selectedLateStudent.id,
        studentCode: selectedLateStudent.studentCode,
        studentName: selectedLateStudent.fullName,
        className: selectedLateStudent.className,
        homeroomTeacher: selectedLateStudent.teacherName || '',
        timeStr: lateTime || undefined,
        reason: lateReason,
        notes: lateNotes,
        recordedById: user.id,
        recordedByName: user.fullName,
        recordedByRole: 'teacher',
        schoolId: user.schoolId || 'default_school'
      });
      setShowGateDutyModal(false);
      setSelectedLateStudent(null);
      setLateNotes('');
      setSuccessBanner(`איחור כניסה נרשם בהצלחה עבור ${selectedLateStudent.fullName} (${lateTime || 'שעת כניסה'})`);
      await loadData(false);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'שגיאה ברישום איחור');
    } finally {
      setIsSubmittingLate(false);
    }
  };

  const handleSendLateArrivalWhatsApp = (arrival: LateArrival) => {
    const phone = getStudentParentPhone(arrival.studentId);
    const text = buildLateArrivalWhatsAppMessage({
      studentName: arrival.studentName,
      className: arrival.className,
      arrivalTime: arrival.timeStr,
      homeroomTeacher: arrival.homeroomTeacher || user.fullName,
      schoolName,
      recordedBy: arrival.recordedByName,
      reason: arrival.reason,
    });
    const url = createWhatsAppUrl(phone, text);
    window.open(url, '_blank');
  };

  const handleDeleteLateArrival = async (id: string) => {
    if (deletingLateId) return;
    setDeletingLateId(id);
    try {
      await api.deleteLateArrival(id);
      setSuccessBanner('רישום האיחור נמחק בהצלחה');
      await loadData(false);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'שגיאה במחיקת רישום');
    } finally {
      setDeletingLateId(null);
    }
  };

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

  // Strictly only students who have PHYSICALLY EXITED the gate (confirmed by guard)
  const exitedPasses = filteredPasses.filter((p) => p.status === 'used');
  const pendingPasses = filteredPasses.filter((p) => p.status === 'active');

  const toggleExitedPassSelection = (passId: string) => {
    const next = new Set(selectedExitedPassIds);
    if (next.has(passId)) {
      next.delete(passId);
    } else {
      next.add(passId);
    }
    setSelectedExitedPassIds(next);
  };

  const handleSelectAllExited = () => {
    if (selectedExitedPassIds.size === exitedPasses.length) {
      setSelectedExitedPassIds(new Set());
    } else {
      setSelectedExitedPassIds(new Set(exitedPasses.map((p) => p.id)));
    }
  };

  const getStudentParentPhone = (studentId: string): string => {
    if (parentPhoneMap[studentId]) return parentPhoneMap[studentId];
    return clientStore.getParentPhone(studentId);
  };

  const handleSaveParentPhone = (studentId: string, phone: string) => {
    setParentPhoneMap((prev) => ({ ...prev, [studentId]: phone }));
    clientStore.updateStudentParentPhone(studentId, phone);
  };

  const copyToClipboard = (text: string, label = 'ההודעה הועתקה בהצלחה ללוח!') => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedTextToast(label);
      setTimeout(() => setCopiedTextToast(null), 3000);
    }
  };

  const schoolName = user.schoolName || 'בית הספר';

  const defaultClassGroupMessage = React.useMemo(() => {
    const targetClass = selectedClass && selectedClass !== 'כל הכיתות' ? selectedClass : (assignedClasses[0] || 'הכיתה');
    const latestExit = exitedPasses[0]?.usedAt
      ? (exitedPasses[0].usedAt.includes('T') ? exitedPasses[0].usedAt.split('T')[1].substring(0, 5) : exitedPasses[0].usedAt)
      : undefined;
    const homeroom = classHomeroomMap.get(targetClass.trim()) || user.fullName;

    return buildClassExitWhatsAppMessage({
      className: targetClass,
      exitTime: latestExit,
      homeroomTeacher: homeroom,
      schoolName,
      studentCount: exitedPasses.length,
    });
  }, [selectedClass, assignedClasses, exitedPasses, classHomeroomMap, user.fullName, schoolName]);

  const buildIndividualMessage = (pass: GatePass): string => {
    const homeroom = pass.homeroomTeacher || classHomeroomMap.get(pass.className.trim()) || user.fullName;
    const exitTime = pass.usedAt ? (pass.usedAt.includes('T') ? pass.usedAt.split('T')[1].substring(0, 5) : pass.usedAt) : 'לאחרונה';
    return buildStudentExitWhatsAppMessage({
      studentName: pass.studentName,
      studentCode: pass.studentCode,
      className: pass.className,
      exitTime,
      homeroomTeacher: homeroom,
      authorizedBy: pass.teacherName,
      guardName: pass.usedBy || 'שומר השער',
      reason: pass.reason,
      schoolName,
    });
  };

  const handleOpenClassGroupWhatsApp = () => {
    const textToSend = customGroupText || defaultClassGroupMessage;
    const url = createWhatsAppUrl(textToSend);
    window.open(url, '_blank');
  };

  const handleOpenStudentWhatsApp = (pass: GatePass, customPhone?: string) => {
    const phone = customPhone || getStudentParentPhone(pass.studentId);
    const msg = buildIndividualMessage(pass);
    const url = createWhatsAppUrl(msg, phone);
    window.open(url, '_blank');
  };

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

        {/* Gate Duty / Morning Late Arrival Registration Button */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleOpenGateDutyModal}
            className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-300"
          >
            <Clock className="w-4 h-4 text-slate-950 shrink-0" />
            <span>תורן שער: רישום תלמיד מאחר בכניסה לבית הספר</span>
            <span className="text-[10px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full font-bold">
              שער בוקר
            </span>
          </button>
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
                  onClick={() => handleSelectClass('כל הכיתות')}
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
                    onClick={() => handleSelectClass(cls)}
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

      {/* Tabs: Student selection vs Exit passes vs Late arrivals */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-4 bg-slate-200/70 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`flex-1 py-2 sm:py-2.5 text-[11px] sm:text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-2 ${
            activeTab === 'students'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 shrink-0" />
          <span className="truncate">שחרור תלמידים ({filteredStudents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 sm:py-2.5 text-[11px] sm:text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-2 ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DoorOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
          <span className="truncate">יציאות שער ({filteredPasses.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('late_arrivals')}
          className={`flex-1 py-2 sm:py-2.5 text-[11px] sm:text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-2 ${
            activeTab === 'late_arrivals'
              ? 'bg-white text-slate-900 shadow-sm border border-amber-300'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
          <span className="truncate">איחורים היום ({filteredLateArrivals.length})</span>
        </button>
      </div>

      {activeTab === 'students' && (
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
      )}

      {activeTab === 'history' && (
        /* History Section: "אישורים ששלחתי היום" */
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-600 px-1 flex items-center justify-between">
            <span>
              {selectedClass && selectedClass !== 'כל הכיתות'
                ? `מעקב אחר אישורי יציאה להיום עבור כיתה ${selectedClass}:`
                : 'מעקב אחר אישורי יציאה להיום והסטטוס שלהם בשער:'}
            </span>
            {selectedClass && selectedClass !== 'כל הכיתות' && (
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg">
                כיתה {selectedClass}
              </span>
            )}
          </div>

          {/* Parent WhatsApp Notification Hub (Exclusively after gate exit confirmation) */}
          <div className="bg-gradient-to-l from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-4 sm:p-5 border border-emerald-500/30 shadow-md space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>יידוע הורים בוואטסאפ (מחנכת כיתה)</span>
                  </span>
                  <span className="text-xs text-slate-300 font-bold">
                    {exitedPasses.length} יצאו מהשער בפועל
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold mt-1 text-white">
                  עדכון הורים על יציאת תלמידים מבית הספר
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  הודעות נשלחות אך ורק לאחר שהשומר אישר פיזית שהתלמידים עברו את השער (לא כשהם מסתובבים בחצר)
                </p>
              </div>

              <div className="shrink-0 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] text-emerald-300 block font-bold">בטוח ומאומת</span>
                <span className="text-xs font-black text-white flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>יצאו מהשער</span>
                </span>
              </div>
            </div>

            {exitedPasses.length === 0 ? (
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {pendingPasses.length > 0
                    ? `ישנם כרגע ${pendingPasses.length} תלמידים שממתינים בשער או בחצר. כפתורי שליחת הוואטסאפ להורים ייפתחו ברגע שהשומר יאשר יציאה פיזית בשער.`
                    : 'ברגע שיונפקו אישורים והשומר יאשר את יציאת התלמידים בשער, תוכל לשלוח הודעות לוואטסאפ כאן.'}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Option 1: Whole Class WhatsApp Group */}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomGroupText(defaultClassGroupMessage);
                      setShowClassGroupModal(true);
                    }}
                    className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-between cursor-pointer border border-emerald-400/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="font-black text-xs sm:text-sm">1. הודעה לקבוצת ההורים של כל הכיתה</div>
                        <div className="text-[10px] text-emerald-100 font-medium">מתאים לשחרור כיתתי / יציאה מרוכזת</div>
                      </div>
                    </div>
                    <Share2 className="w-4 h-4 text-emerald-200 shrink-0 mr-1" />
                  </button>

                  {/* Option 2: Individual Parent WhatsApp for Selected Students */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedExitedPassIds.size === 0) {
                        setSelectedExitedPassIds(new Set(exitedPasses.map((p) => p.id)));
                      }
                      setShowIndividualParentsModal(true);
                    }}
                    className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-between cursor-pointer border border-blue-400/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="font-black text-xs sm:text-sm">
                          2. בחירת תלמידים להודעה פרטית
                        </div>
                        <div className="text-[10px] text-blue-100 font-medium">
                          {selectedExitedPassIds.size > 0
                            ? `נבחרו ${selectedExitedPassIds.size} תלמידים שיצאו מהשער`
                            : `בחר מתוך ${exitedPasses.length} תלמידים שיצאו`}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs bg-white text-blue-900 font-black px-2 py-0.5 rounded-lg shrink-0 mr-1">
                      {selectedExitedPassIds.size > 0 ? selectedExitedPassIds.size : exitedPasses.length}
                    </span>
                  </button>
                </div>

                {/* Exited Selection Bar Controls */}
                <div className="flex items-center justify-between text-xs px-2 pt-1 text-slate-300">
                  <span className="text-[11px]">
                    סמן למטה תלמידים שיצאו כדי לשלוח הודעה פרטית מותאמת אישית:
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllExited}
                    className="text-emerald-300 hover:text-white font-bold underline cursor-pointer text-xs"
                  >
                    {selectedExitedPassIds.size === exitedPasses.length ? 'בטל בחירת הכל' : 'סמן את כל מי שיצא'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {filteredPasses.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {selectedClass && selectedClass !== 'כל הכיתות'
                  ? `לא נמצאו אישורי יציאה להיום עבור כיתה ${selectedClass}`
                  : 'עדיין לא נשלחו אישורים היום'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedClass && selectedClass !== 'כל הכיתות'
                  ? `אישורים שיונפקו לתלמידי כיתה ${selectedClass} (על ידך או על ידי מחנכת הכיתה) יופיעו כאן בזמן אמת`
                  : 'סמן תלמידים בלשונית ״רשימת התלמידים״ ולחץ על ״שליחת אישור לשער״'}
              </p>
            </div>
          ) : (
            filteredPasses.map((pass) => {
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

                  {/* Gate exit confirmed: WhatsApp parent notification actions */}
                  {isUsed && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-200/80 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                          <input
                            type="checkbox"
                            checked={selectedExitedPassIds.has(pass.id)}
                            onChange={() => toggleExitedPassSelection(pass.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                          />
                          <span>סמן להודעה פרטית</span>
                        </label>
                        {getStudentParentPhone(pass.studentId) && (
                          <span className="text-[11px] font-mono text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                            טלפון: {getStudentParentPhone(pass.studentId)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSingleStudentPass(pass);
                          setShowIndividualParentsModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>📲 וואטסאפ אישי להורה</span>
                      </button>
                    </div>
                  )}

                  {/* Active pass: explicitly explain that parent notifications are blocked until physical gate exit */}
                  {isActive && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-[11px] text-amber-800 bg-amber-100/70 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>התלמיד עדיין בחצר / ממתין בשער. הודעת יציאה להורים תיפתח רק לאחר אישור השומר בשער.</span>
                      </div>
                      <button
                        type="button"
                        disabled={cancellingPassId === pass.id}
                        onClick={() => handleCancelPass(pass.id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 shrink-0 self-end sm:self-center cursor-pointer"
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

      {/* Late Arrivals Section: "איחורים היום בכיתה / תורן שער" */}
      {activeTab === 'late_arrivals' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-gradient-to-l from-amber-950 via-slate-900 to-amber-900 text-white rounded-3xl p-5 border border-amber-500/30 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase bg-amber-500/25 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>מעקב איחורים ומעבר שער בוקר</span>
                  </span>
                  <span className="text-xs text-slate-300 font-bold">
                    {filteredLateArrivals.length} איחורים היום
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold mt-1 text-white">
                  {selectedClass && selectedClass !== 'כל הכיתות'
                    ? `איחורי כניסה להיום - כיתה ${selectedClass}`
                    : 'איחורי כניסה להיום - כל הכיתות שלי'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  רישום תלמידים שנכנסו בשער לאחר תחילת יום הלימודים ויידוע ההורים בוואטסאפ
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowTeacherReportsModal(true)}
                  className="py-2.5 px-3.5 bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/20"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                  <span>דוח וסיכום איחורים</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenGateDutyModal}
                  className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-300"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  <span>רישום איחור (תורן שער)</span>
                </button>
              </div>
            </div>
          </div>

          {/* List of late arrivals */}
          {filteredLateArrivals.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                {selectedClass && selectedClass !== 'כל הכיתות'
                  ? `אין איחורים שנרשמו היום בכיתה ${selectedClass}`
                  : 'אין איחורים שנרשמו היום בכיתות שלך'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                כל התלמידים הגיעו בזמן לבית הספר. במידה ותלמיד מגיע כעת, ניתן לרשום אותו דרך כפתור "תורן שער".
              </p>
              <button
                type="button"
                onClick={handleOpenGateDutyModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>רישום תלמיד מאחר כעת</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLateArrivals.map((arrival) => {
                const parentPhone = getStudentParentPhone(arrival.studentId);
                const canDelete =
                  arrival.recordedById === user.id ||
                  user.role === 'admin' ||
                  user.role === 'vice_principal';

                return (
                  <div
                    key={arrival.id}
                    className="p-4 bg-white border border-amber-200/80 rounded-3xl shadow-xs hover:border-amber-400 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-base">
                            {arrival.studentName}
                          </h4>
                          <span className="text-[11px] font-bold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-lg border border-blue-200">
                            כיתה {arrival.className}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {arrival.studentCode}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>שעת כניסה בשער: {arrival.timeStr}</span>
                          </span>

                          <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                            סיבה: <strong className="text-slate-900">{arrival.reason}</strong>
                          </span>

                          <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg">
                            תורן רושם: {arrival.recordedByName}
                          </span>
                        </div>

                        {arrival.notes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl mt-2 border border-slate-100">
                            הערה: {arrival.notes}
                          </div>
                        )}
                      </div>

                      {canDelete && (
                        <button
                          type="button"
                          disabled={deletingLateId === arrival.id}
                          onClick={() => handleDeleteLateArrival(arrival.id)}
                          title="מחיקת רישום איחור זה"
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* WhatsApp notification button to parents */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>טלפון הורה:</span>
                        <input
                          type="tel"
                          placeholder="לדוגמה: 050-1234567"
                          defaultValue={parentPhone}
                          onBlur={(e) => handleSaveParentPhone(arrival.studentId, e.target.value)}
                          className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none w-36"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendLateArrivalWhatsApp(arrival)}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>📲 שלח וואטסאפ להורה על איחור</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Action Bar - Natural Thumb Zone (Only in students selection tab) */}
      {activeTab === 'students' && (
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
      )}

      {/* Modal: Morning Gate Duty - Late Arrival Registration */}
      {showGateDutyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs font-black">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Rubik']">
                    תורן שער: רישום איחור כניסה
                  </h2>
                  <p className="text-xs text-amber-800 font-semibold">
                    דיווח מיידי למחנכת הכיתה ולתיעוד בית הספר
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGateDutyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Student Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. בחר תלמיד שנכנס בשער:
                </label>
                {selectedLateStudent ? (
                  <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="font-black text-slate-900 text-sm">
                        {selectedLateStudent.fullName}
                      </div>
                      <div className="text-xs text-amber-950 font-bold mt-0.5">
                        כיתה {selectedLateStudent.className} · קוד: {selectedLateStudent.studentCode}
                      </div>
                      <div className="text-xs text-teal-800 font-bold mt-1 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>יישלח ישירות למחנכת: {selectedLateStudent.teacherName || classHomeroomMap.get(selectedLateStudent.className) || 'מחנכת הכיתה'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedLateStudent(null)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer shadow-2xs"
                    >
                      החלף תלמיד
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={lateStudentQuery}
                        onChange={(e) => setLateStudentQuery(e.target.value)}
                        placeholder="חיפוש בכל תלמידי בית הספר (שם, כיתה או קוד)..."
                        className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-2xl p-1 bg-slate-50/50">
                      {(allSchoolStudents.length > 0 ? allSchoolStudents : students)
                        .filter((s) => {
                          if (!lateStudentQuery.trim()) return true;
                          const q = lateStudentQuery.trim().toLowerCase();
                          return (
                            s.fullName.toLowerCase().includes(q) ||
                            s.studentCode.toLowerCase().includes(q) ||
                            s.className.toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 20)
                        .map((s) => {
                          const homeroom = s.teacherName || classHomeroomMap.get(s.className) || '';
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedLateStudent(s)}
                              className="w-full text-right p-2.5 hover:bg-amber-50 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{s.fullName}</span>
                                {homeroom && (
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    מחנכת: <span className="text-teal-700 font-bold">{homeroom}</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                                כיתה {s.className}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Arrival Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. שעת כניסה מדויקת בשער:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={lateTime}
                    onChange={(e) => setLateTime(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold text-slate-900 text-base focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const h = String(now.getHours()).padStart(2, '0');
                      const m = String(now.getMinutes()).padStart(2, '0');
                      setLateTime(`${h}:${m}`);
                    }}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    עכשיו
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  3. סיבת איחור:
                </label>
                <input
                  type="text"
                  value={lateReason}
                  onChange={(e) => setLateReason(e.target.value)}
                  placeholder="הקלד סיבת איחור..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none mb-2"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    'הסעה / תחבורה איחרה',
                    'בדיקה רפואית / קופת חולים',
                    'אישור הורים',
                    'התעורר מאוחר',
                    'עומס תנועה בכביש',
                    'סיבה אישית / אחר'
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setLateReason(r)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        lateReason === r
                          ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  הערות תורן (אופציונלי):
                </label>
                <input
                  type="text"
                  value={lateNotes}
                  onChange={(e) => setLateNotes(e.target.value)}
                  placeholder="הערה נוספת לצוות החינוכי..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowGateDutyModal(false)}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer"
              >
                ביטול
              </button>

              <button
                type="button"
                disabled={!selectedLateStudent || isSubmittingLate}
                onClick={handleRecordLateArrival}
                className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingLate ? (
                  <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>אישור כניסה ורישום איחור</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Reports Modal (Comprehensive Class Late Arrivals & Exits Report) */}
      {showTeacherReportsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-slate-100 w-full max-w-5xl rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-300 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-700" />
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Rubik']">
                  דוחות איחורים ושחרורים - {selectedClass && selectedClass !== 'כל הכיתות' ? `כיתה ${selectedClass}` : 'הכיתות שלי'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherReportsModal(false)}
                className="p-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer border border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ComprehensiveReportsView
              user={user}
              schoolName={schoolName}
              allClasses={assignedClasses.length > 0 ? assignedClasses : Array.from(new Set(students.map((s) => s.className)))}
              students={allSchoolStudents.length > 0 ? allSchoolStudents : students}
              passes={passesToday.length > 0 ? passesToday : clientStore.getAllPasses()}
              lateArrivals={lateArrivalsToday.length > 0 ? lateArrivalsToday : clientStore.getLateArrivals({ schoolId: user.schoolId })}
              fixedClassOnly={selectedClass && selectedClass !== 'כל הכיתות' ? selectedClass : (assignedClasses.length === 1 ? assignedClasses[0] : undefined)}
              onRefresh={() => loadData(false)}
            />
          </div>
        </div>
      )}

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

      {/* Modal 1: WhatsApp Message to Class Parents Group */}
      {showClassGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Rubik']">
                    הודעה לקבוצת ההורים של הכיתה
                  </h2>
                  <p className="text-[11px] text-emerald-700 font-bold">
                    שחרור כיתתי · {exitedPasses.length} תלמידים יצאו מהשער
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClassGroupModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">יציאה פיזית מאומתת</span>
                  <span>ההודעה מאשרת שהתלמידים עברו את בדיקת השומר ויצאו בפועל ממתחם בית הספר.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  נוסח ההודעה שתישלח לקבוצת הוואטסאפ (ניתן לערוך במידת הצורך):
                </label>
                <textarea
                  rows={8}
                  value={customGroupText || defaultClassGroupMessage}
                  onChange={(e) => setCustomGroupText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 leading-relaxed focus:bg-white focus:border-emerald-600 focus:outline-none"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => copyToClipboard(customGroupText || defaultClassGroupMessage, 'נוסח ההודעה לקבוצת ההורים הועתק!')}
                className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-slate-600" />
                <span>העתק נוסח</span>
              </button>

              <button
                type="button"
                onClick={handleOpenClassGroupWhatsApp}
                className="flex-1 w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>📲 פתח בוואטסאפ ושגר לקבוצת ההורים</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Individual WhatsApp Messages to Parents of Exited Students */}
      {showIndividualParentsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Rubik']">
                    הודעות פרטיות להורי התלמידים שיצאו
                  </h2>
                  <p className="text-[11px] text-blue-700 font-bold">
                    {activeSingleStudentPass
                      ? `תלמיד: ${activeSingleStudentPass.studentName}`
                      : `${selectedExitedPassIds.size > 0 ? selectedExitedPassIds.size : exitedPasses.length} תלמידים נבחרו לשליחה אישית`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowIndividualParentsModal(false);
                  setActiveSingleStudentPass(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 overflow-y-auto flex-1 space-y-3 pr-0.5">
              <div className="p-2.5 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  כל הודעה מנוסחת אישית עם שם התלמיד ושעת היציאה המאומתת מהשער.
                </span>
              </div>

              {/* List of target passes */}
              {(activeSingleStudentPass
                ? [activeSingleStudentPass]
                : exitedPasses.filter((p) => selectedExitedPassIds.size === 0 || selectedExitedPassIds.has(p.id))
              ).map((pass) => {
                const currentPhone = getStudentParentPhone(pass.studentId);
                const exitTime = pass.usedAt ? (pass.usedAt.includes('T') ? pass.usedAt.split('T')[1].substring(0, 5) : pass.usedAt) : '';

                return (
                  <div
                    key={pass.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{pass.studentName}</span>
                          <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            כיתה {pass.className}
                          </span>
                        </div>
                        <div className="text-xs text-emerald-800 font-bold mt-1 flex items-center gap-1">
                          <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
                          <span>יצא/ה מהשער בשעה {exitTime}</span>
                          {pass.usedBy && <span className="text-slate-500 font-normal">· שומר: {pass.usedBy}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(buildIndividualMessage(pass), `הנוסח עבור ${pass.studentName} הועתק!`)}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded-xl border border-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                        <span>העתק</span>
                      </button>
                    </div>

                    {/* Parent Phone Input */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 shrink-0">טלפון ההורה:</span>
                        <input
                          type="tel"
                          placeholder="לדוגמה: 050-1234567"
                          defaultValue={currentPhone}
                          onBlur={(e) => handleSaveParentPhone(pass.studentId, e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {currentPhone ? '✓ שמור במכשיר' : 'נשמר אוטומטית'}
                      </span>
                    </div>

                    {/* Direct WhatsApp Action Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenStudentWhatsApp(pass, currentPhone)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>
                        {currentPhone
                          ? `📲 פתח צ'אט וואטסאפ עם הורי ${pass.studentName}`
                          : `📲 שלח בוואטסאפ להורי ${pass.studentName}`}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500">
                הודעות נשלחות ישירות לחשבון הוואטסאפ של המחנכת
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowIndividualParentsModal(false);
                  setActiveSingleStudentPass(null);
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Clipboard Copy Toast Notification */}
      {copiedTextToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedTextToast}</span>
        </div>
      )}
    </div>
  );
};
