import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api.ts';
import { User, GatePass, Student } from '../types.ts';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  Sparkles,
  UserCheck,
  DoorOpen,
  X,
  FileCheck,
  RefreshCw,
  Award,
  Layers,
  GraduationCap,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RotateCcw,
  History as HistoryIcon
} from 'lucide-react';

interface VicePrincipalViewProps {
  user: User;
  syncTick: number;
}

export const VicePrincipalView: React.FC<VicePrincipalViewProps> = ({ user, syncTick }) => {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper date offset
  const getDateOffsetString = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // Date Navigation State
  const [activeDate, setActiveDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [viewMode, setViewMode] = useState<'single_day' | 'range' | 'all'>('single_day');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '2days' | 'two_weeks' | '7days' | 'all'>('today');
  const [fromDate, setFromDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [authorizerType, setAuthorizerType] = useState<'ALL' | 'HOMEROOM' | 'SUBJECT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'USED' | 'PENDING' | 'CANCELLED'>('ALL');

  // Class list extracted dynamically
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);

  // Slip modal for printing / parent inquiry
  const [selectedSlipPass, setSelectedSlipPass] = useState<GatePass | null>(null);

  // Hebrew weekday formatter
  const formatHebrewDateWithDay = (dateStr: string) => {
    if (!dateStr) return { dayName: '', formattedDate: '', fullStr: '' };
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const dayName = new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(d);
      const formattedDate = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d);
      return {
        dayName,
        formattedDate,
        fullStr: `${dayName}, ${formattedDate}`,
      };
    } catch {
      return { dayName: '', formattedDate: dateStr, fullStr: dateStr };
    }
  };

  const handleStepDay = (delta: number) => {
    setViewMode('single_day');
    const [y, m, d] = activeDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    const nextDate = dt.toISOString().split('T')[0];
    setActiveDate(nextDate);
    setFromDate(nextDate);
    setToDate(nextDate);
    setDatePreset('custom' as any);
  };

  const handleSelectSpecificDate = (dateVal: string) => {
    if (!dateVal) return;
    setViewMode('single_day');
    setActiveDate(dateVal);
    setFromDate(dateVal);
    setToDate(dateVal);
    setDatePreset('custom' as any);
  };

  const handleJumpToToday = () => {
    const today = getDateOffsetString(0);
    setActiveDate(today);
    setFromDate(today);
    setToDate(today);
    setViewMode('single_day');
    setDatePreset('today');
  };

  const handleApplyDatePreset = (preset: 'today' | 'yesterday' | '2days' | 'two_weeks' | '7days' | 'all') => {
    setDatePreset(preset);
    if (preset === 'today') {
      const today = getDateOffsetString(0);
      setActiveDate(today);
      setFromDate(today);
      setToDate(today);
      setViewMode('single_day');
    } else if (preset === 'yesterday') {
      const yesterday = getDateOffsetString(1);
      setActiveDate(yesterday);
      setFromDate(yesterday);
      setToDate(yesterday);
      setViewMode('single_day');
    } else if (preset === '2days') {
      const twoDays = getDateOffsetString(2);
      setActiveDate(twoDays);
      setFromDate(twoDays);
      setToDate(twoDays);
      setViewMode('single_day');
    } else if (preset === 'two_weeks') {
      const twoWeeks = getDateOffsetString(14);
      setActiveDate(twoWeeks);
      setFromDate(twoWeeks);
      setToDate(twoWeeks);
      setViewMode('single_day');
    } else if (preset === '7days') {
      const sevenDays = getDateOffsetString(7);
      const today = getDateOffsetString(0);
      setFromDate(sevenDays);
      setToDate(today);
      setViewMode('range');
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
      setViewMode('all');
    }
  };

  // Fetch classes and students list to identify homeroom teachers accurately
  useEffect(() => {
    api.getTeacherClasses()
      .then((res) => {
        setAllClasses(res.assignedClasses || []);
        setStudentsList(res.students || []);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  // Map each class to its homeroom teacher name from student records
  const classHomeroomMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of studentsList) {
      if (student.className && student.teacherName) {
        map.set(student.className.trim(), student.teacherName.trim());
      }
    }
    // Default known homerooms from school roster
    if (!map.has('ז1')) map.set('ז1', 'לינא ח׳ליל');
    if (!map.has('ז2')) map.set('ז2', 'סוהא מנצור');
    if (!map.has('ח1')) map.set('ח1', 'דלאל חביב');
    if (!map.has('ח2')) map.set('ח2', 'נאדיה סרחאן');
    if (!map.has('ט1')) map.set('ט1', 'רימא ג׳אבר');
    return map;
  }, [studentsList]);

  // Load passes based on date filters
  const loadPasses = async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    try {
      const res = await api.searchHistory({
        from: fromDate || undefined,
        to: toDate || undefined,
        className: selectedClass !== 'ALL' ? selectedClass : undefined,
        q: searchQuery.trim() || undefined,
      });
      setPasses(res.passes || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPasses(passes.length === 0);
  }, [fromDate, toDate, selectedClass, searchQuery]);

  // Sync tick listener (real-time background update)
  useEffect(() => {
    if (syncTick > 0) {
      loadPasses(false);
    }
  }, [syncTick]);

  // Helper to determine if authorizer is a subject teacher or homeroom teacher
  const isSubjectTeacher = (teacherName: string, studentClass: string) => {
    const cleanTeacher = (teacherName || '').trim();
    if (cleanTeacher.includes('מקצועי') || cleanTeacher.includes('מוחמד עלי')) return true;
    const homeroom = classHomeroomMap.get(studentClass.trim());
    if (homeroom && homeroom.trim() !== cleanTeacher) {
      return true; // Authorizer is a teacher teaching this class, but NOT the homeroom teacher!
    }
    return false;
  };

  // Filtered passes
  const filteredPasses = useMemo(() => {
    return passes.filter((pass) => {
      // Class filter
      if (selectedClass !== 'ALL' && pass.className !== selectedClass) {
        return false;
      }

      // Status filter
      if (statusFilter === 'USED' && pass.status !== 'used') return false;
      if (statusFilter === 'PENDING' && pass.status !== 'active') return false;
      if (statusFilter === 'CANCELLED' && pass.status !== 'cancelled') return false;

      // Authorizer type filter (מורה מקצועי מול מחנכת)
      const subject = isSubjectTeacher(pass.teacherName, pass.className);
      if (authorizerType === 'SUBJECT' && !subject) return false;
      if (authorizerType === 'HOMEROOM' && subject) return false;

      // Search query (student name, teacher name, reason, guard)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const match =
          pass.studentName.toLowerCase().includes(q) ||
          pass.studentCode.toLowerCase().includes(q) ||
          pass.className.toLowerCase().includes(q) ||
          pass.teacherName.toLowerCase().includes(q) ||
          (pass.usedBy && pass.usedBy.toLowerCase().includes(q)) ||
          (pass.reason && pass.reason.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [passes, selectedClass, statusFilter, authorizerType, searchQuery, classHomeroomMap]);

  // KPI Statistics
  const stats = useMemo(() => {
    let total = filteredPasses.length;
    let used = 0;
    let pending = 0;
    let cancelled = 0;
    let bySubject = 0;
    let byHomeroom = 0;

    for (const p of filteredPasses) {
      if (p.status === 'used') used++;
      else if (p.status === 'active') pending++;
      else if (p.status === 'cancelled') cancelled++;

      if (isSubjectTeacher(p.teacherName, p.className)) {
        bySubject++;
      } else {
        byHomeroom++;
      }
    }

    return { total, used, pending, cancelled, bySubject, byHomeroom };
  }, [filteredPasses, classHomeroomMap]);

  // Unique classes across all current passes
  const classesOptions = useMemo(() => {
    const set = new Set<string>(['ז1', 'ז2', 'ח1', 'ח2', 'ט1']);
    allClasses.forEach((c) => set.add(c));
    passes.forEach((p) => set.add(p.className));
    return Array.from(set).filter(Boolean).sort();
  }, [allClasses, passes]);

  // Group passes by date & Hebrew weekday
  const groupedPassesByDay = useMemo(() => {
    const map = new Map<string, GatePass[]>();
    for (const p of filteredPasses) {
      const d = p.dateStr || 'unknown';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(p);
    }
    const dates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return dates.map((dateStr) => {
      const info = formatHebrewDateWithDay(dateStr);
      const dayPasses = map.get(dateStr)!;
      const usedCount = dayPasses.filter((p) => p.status === 'used').length;
      const pendingCount = dayPasses.filter((p) => p.status === 'active').length;
      const cancelledCount = dayPasses.filter((p) => p.status === 'cancelled').length;
      return {
        dateStr,
        dayName: info.dayName,
        formattedDate: info.formattedDate,
        fullStr: info.fullStr,
        passes: dayPasses,
        usedCount,
        pendingCount,
        cancelledCount,
      };
    });
  }, [filteredPasses]);

  const renderPassCard = (pass: GatePass) => {
    const isUsed = pass.status === 'used';
    const isCancelled = pass.status === 'cancelled';
    const isSubject = isSubjectTeacher(pass.teacherName, pass.className);
    const homeroom = pass.homeroomTeacher || classHomeroomMap.get(pass.className) || 'מחנכת כיתה';

    return (
      <div
        key={pass.id}
        className={`bg-white rounded-3xl p-5 sm:p-6 border-2 transition-all shadow-sm hover:shadow-md ${
          isUsed
            ? 'border-emerald-300 hover:border-emerald-400'
            : isCancelled
            ? 'border-rose-200 bg-rose-50/20'
            : 'border-amber-300 hover:border-amber-400'
        }`}
      >
        {/* Header Row: Student name, class badge, homeroom badge, authorizer badge, status badge & Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Student & Class Info */}
          <div className="flex items-center gap-3.5">
            {/* Class Tag */}
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 border-2 shadow-sm ${
                isUsed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                  : isCancelled
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-amber-50 text-amber-800 border-amber-400'
              }`}
            >
              {pass.className}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-black text-lg sm:text-xl text-slate-900 font-['Rubik']">
                  {pass.studentName}
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                  {pass.studentCode || 'ללא ת.ז'}
                </span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                  כיתה {pass.className}
                </span>
                <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                  <span>מחנכת הכיתה: {homeroom}</span>
                </span>
              </div>

              {/* Authorizer Identity (Teacher vs Homeroom) - BOLD & HIGH VISIBILITY */}
              <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500">אישור שחרור ניתן ע״י:</span>
                {isSubject ? (
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/20">
                    <GraduationCap className="w-4 h-4" />
                    <span>מורה מקצועי: {pass.teacherName}</span>
                  </span>
                ) : (
                  <span className="bg-teal-700 text-white px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-teal-700/20">
                    <UserCheck className="w-4 h-4" />
                    <span>מחנכת כיתה: {pass.teacherName}</span>
                  </span>
                )}

                <span className="text-slate-300">·</span>
                <span className="text-xs font-semibold text-slate-600">
                  תאריך: <strong className="text-slate-900">{pass.dateStr}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge & PROMINENT Action Button */}
          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0 flex-wrap">
            <span
              className={`text-xs font-black px-3.5 py-1.5 rounded-xl border-2 flex items-center gap-2 shadow-2xs ${
                isUsed
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : isCancelled
                  ? 'bg-rose-50 text-rose-900 border-rose-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isUsed ? 'bg-emerald-600' : isCancelled ? 'bg-rose-600' : 'bg-amber-600 animate-pulse'
                }`}
              />
              <span>
                {isUsed
                  ? 'יצא/ה מהשער בהצלחה'
                  : isCancelled
                  ? 'בוטל ע״י המורה'
                  : 'אושר, ממתין/ה ליציאה'}
              </span>
            </span>

            {/* PROMINENT Yellow/Amber "טופס רשמי" Button */}
            <button
              type="button"
              onClick={() => setSelectedSlipPass(pass)}
              className="px-4 py-2 text-xs sm:text-sm font-black bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 rounded-xl shadow-md hover:shadow-lg border border-amber-500/40 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
              title="הפק אישור ובירור רשמי"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>טופס רשמי</span>
            </button>
          </div>
        </div>

        {/* Timing & Authorization Detail Row - 4 Clear High-Contrast Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3.5 text-xs">
          {/* Dedicated Box: Who authorized this pass */}
          <div
            className={`p-3 rounded-2xl border-2 ${
              isSubject
                ? 'bg-blue-50/80 border-blue-300 text-blue-950'
                : 'bg-teal-50/80 border-teal-300 text-teal-950'
            }`}
          >
            <span className="block mb-1 font-bold flex items-center gap-1.5 text-slate-600">
              {isSubject ? (
                <GraduationCap className="w-4 h-4 text-blue-700" />
              ) : (
                <UserCheck className="w-4 h-4 text-teal-700" />
              )}
              <span>מי נתן את האישור:</span>
            </span>
            <div className="font-black text-sm">
              {pass.teacherName}
            </div>
            <div className="text-[11px] font-bold mt-0.5 text-slate-600">
              {isSubject ? 'מורה מקצועי (שעה אחרונה)' : `מחנכת כיתה ${pass.className}`}
            </div>
          </div>

          {/* Time Authorized */}
          <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-200">
            <span className="text-slate-500 block mb-1 font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>שעת אישור השחרור:</span>
            </span>
            <div className="font-black text-slate-900 text-base font-mono">
              {pass.validFromTime}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">
              הופק ב-{new Date(pass.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Actual Gate Exit Time */}
          <div
            className={`p-3 rounded-2xl border-2 ${
              isUsed
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span className="block mb-1 font-bold flex items-center gap-1.5 text-slate-600">
              <DoorOpen className="w-4 h-4 text-emerald-600" />
              <span>יציאה בפועל מהשער:</span>
            </span>
            <div className="font-black text-base">
              {pass.usedAt ? (
                <span className="text-emerald-800 font-mono">
                  בשעה{' '}
                  {pass.usedAt.includes('T')
                    ? pass.usedAt.split('T')[1].substring(0, 5)
                    : pass.usedAt}
                </span>
              ) : isCancelled ? (
                <span className="text-rose-700 font-bold">לא יצא (בוטל)</span>
              ) : (
                <span className="text-amber-700 font-bold">טרם יצא/ה מהשער</span>
              )}
            </div>
            {pass.usedBy && (
              <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                אושר ע״י {pass.usedBy}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-200">
            <span className="text-slate-500 block mb-1 font-bold">סיבת השחרור:</span>
            <div className="font-bold text-slate-800 truncate text-xs sm:text-sm" title={pass.reason || 'שחרור מוקדם באישור הורים'}>
              {pass.reason || 'שחרור מוקדם באישור הורים'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              מאושר במערכת
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24 max-w-5xl mx-auto px-4 pt-4 sm:pt-6">
      {/* Executive Header Banner - Sleek Deep Navy & Indigo with Prominent Actions */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-800 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border-2 border-amber-400/50 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/40">
              <ShieldAlert className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-amber-300 font-extrabold tracking-wider uppercase">
                  לוח פיקוח שחרורים בית ספרי
                </span>
                <span className="text-xs bg-amber-400/20 text-amber-200 border border-amber-400/40 px-2.5 py-0.5 rounded-lg font-bold">
                  סגן מנהל · אחראי שחרורים כולל
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-['Rubik'] mt-1 text-white tracking-tight">
                מעקב שחרורים וזמני יציאה בשער
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl font-medium">
                בקרה שוטפת על כל תלמיד ששוחרר: כיתה, זהות המורה המשחרר (מקצועי או מחנכת), שעת האישור ושעת היציאה הפיזית בשער
              </p>
            </div>
          </div>

          {/* Prominent Header Action Buttons */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => loadPasses(true)}
              disabled={refreshing}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl border border-white/25 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              title="רענן נתוני שחרורים"
            >
              <RefreshCw className={`w-4 h-4 text-slate-200 ${refreshing ? 'animate-spin' : ''}`} />
              <span>רענן נתונים</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 text-xs sm:text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-xl shadow-lg shadow-amber-400/25 transition-all flex items-center gap-2 cursor-pointer"
              title="הדפס דוח שחרורים מרוכז"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>הדפס דוח</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Statistics Cards - High-Contrast, Clean, Executive Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {/* Total */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200/90 shadow-sm hover:shadow-md transition-all">
          <div className="text-xs font-bold text-slate-500 mb-1">סה״כ שוחררו</div>
          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">{stats.total}</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-1">בטווח שנבחר</div>
        </div>

        {/* Exited */}
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-300 shadow-sm hover:shadow-md transition-all">
          <div className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700">
              <DoorOpen className="w-3.5 h-3.5" />
            </div>
            <span>יצאו מהשער</span>
          </div>
          <div className="text-3xl font-black text-emerald-700 font-mono tracking-tight">{stats.used}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">נרשמו ויצאו פיזית</div>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-300 shadow-sm hover:shadow-md transition-all">
          <div className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span>ממתינים בשער</span>
          </div>
          <div className="text-3xl font-black text-amber-700 font-mono tracking-tight">{stats.pending}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">בדרך לשומר השער</div>
        </div>

        {/* Subject Teachers */}
        <div className="bg-white p-4 rounded-2xl border-2 border-blue-300 shadow-sm hover:shadow-md transition-all">
          <div className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center text-blue-700">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span>מורים מקצועיים</span>
          </div>
          <div className="text-3xl font-black text-blue-700 font-mono tracking-tight">{stats.bySubject}</div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1">שעה אחרונה / מקצוע</div>
        </div>

        {/* Homeroom Teachers */}
        <div className="bg-white p-4 rounded-2xl border-2 border-teal-300 shadow-sm hover:shadow-md transition-all">
          <div className="text-xs font-bold text-teal-900 mb-1 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-teal-100 flex items-center justify-center text-teal-700">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <span>מחנכות כיתה</span>
          </div>
          <div className="text-3xl font-black text-teal-700 font-mono tracking-tight">{stats.byHomeroom}</div>
          <div className="text-[11px] text-teal-700 font-semibold mt-1">כיתת אם ראשית</div>
        </div>

        {/* Cancelled */}
        <div className="bg-white p-4 rounded-2xl border-2 border-rose-300 shadow-sm hover:shadow-md transition-all">
          <div className="text-xs font-bold text-rose-800 mb-1 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-rose-100 flex items-center justify-center text-rose-700">
              <X className="w-3.5 h-3.5" />
            </div>
            <span>אישורים שבוטלו</span>
          </div>
          <div className="text-3xl font-black text-rose-700 font-mono tracking-tight">{stats.cancelled}</div>
          <div className="text-[11px] text-rose-700 font-semibold mt-1">בוטלו ע״י מורה</div>
        </div>
      </div>

      {/* Control & Filter Zone - High Contrast, Prominent Segmented Buttons */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-md space-y-4 mb-6">
        {/* Row 1: Search bar + Date range presets */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          {/* Prominent Search box */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש מהיר: שם תלמיד, כיתה, שם המורה ששיחרר, או שומר השער..."
              className="w-full pl-10 pr-12 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="נקה חיפוש"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Daily Stepper & Weekday Navigation Bar */}
          <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-700 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Stepper Controls */}
              <div className="flex items-center justify-between md:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => handleStepDay(-1)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 font-bold rounded-xl text-xs border border-amber-400/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:border-amber-400"
                  title="דפדף יום אחד אחורה"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>יום קודם</span>
                </button>

                {/* Central Date Indicator */}
                <div className="px-4 py-1.5 bg-slate-800/90 rounded-xl border border-slate-700 text-center flex-1 md:flex-none min-w-[200px]">
                  {viewMode === 'single_day' ? (
                    <div>
                      <div className="text-amber-400 font-black text-sm sm:text-base font-['Rubik'] flex items-center justify-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-amber-400" />
                        <span>{formatHebrewDateWithDay(activeDate).dayName || 'יום נבחר'}</span>
                        <span className="text-white text-xs font-semibold">({formatHebrewDateWithDay(activeDate).formattedDate})</span>
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center justify-center gap-2 mt-0.5">
                        {activeDate === getDateOffsetString(0) ? (
                          <span className="bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.2 rounded-md border border-emerald-500/40">היום</span>
                        ) : activeDate === getDateOffsetString(1) ? (
                          <span className="bg-blue-500/20 text-blue-300 font-bold px-2 py-0.2 rounded-md">אתמול</span>
                        ) : activeDate === getDateOffsetString(2) ? (
                          <span className="bg-blue-500/20 text-blue-300 font-bold px-2 py-0.2 rounded-md">שלשום</span>
                        ) : activeDate === getDateOffsetString(14) ? (
                          <span className="bg-purple-500/20 text-purple-300 font-bold px-2 py-0.2 rounded-md">לפני שבועיים בדיוק</span>
                        ) : (
                          <span className="text-slate-400">תאריך בודד</span>
                        )}

                        {activeDate !== getDateOffsetString(0) && (
                          <button
                            type="button"
                            onClick={handleJumpToToday}
                            className="text-amber-400 hover:text-amber-300 font-bold underline hover:no-underline cursor-pointer flex items-center gap-1"
                          >
                            <span>קפוץ להיום</span>
                            <span>🎯</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-amber-400 font-black text-sm font-['Rubik']">
                        {viewMode === 'range' ? 'תצוגת 7 ימים אחרונים' : 'כל היסטוריית השחרורים'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        מחולק ומקובץ לפי ימים בשבוע ({groupedPassesByDay.length} ימים שונים)
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleStepDay(1)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 font-bold rounded-xl text-xs border border-amber-400/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:border-amber-400"
                  title="דפדף יום אחד קדימה"
                >
                  <span>יום הבא</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Direct Date Picker & Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center md:justify-end">
                <input
                  type="date"
                  value={activeDate}
                  onChange={(e) => handleSelectSpecificDate(e.target.value)}
                  className="bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-600 focus:border-amber-400 focus:outline-none cursor-pointer"
                  title="בחר תאריך ספציפי מהיומן"
                />

                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    datePreset === 'today' ? 'bg-amber-400 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  היום
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyDatePreset('yesterday')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    datePreset === 'yesterday' ? 'bg-amber-400 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  אתמול
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyDatePreset('two_weeks')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    datePreset === 'two_weeks' ? 'bg-amber-400 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title="קפיצה מהירה ליום לפני שבועיים"
                >
                  לפני שבועיים ⚡
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyDatePreset('7days')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    datePreset === '7days' ? 'bg-amber-400 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  7 ימים
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyDatePreset('all')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    datePreset === 'all' ? 'bg-amber-400 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  הכל (לפי ימים)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Granular Filters (Class & Authorizer Type & Status) */}
        <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Class Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-slate-700 flex items-center gap-1 ml-1 text-xs">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>כיתה:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedClass('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedClass === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
              }`}
            >
              כל הכיתות
            </button>
            {classesOptions.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedClass === cls
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>

          {/* Authorizer Type (מורה מקצועי מול מחנכת) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600 px-2">גורם משחרר:</span>
            <button
              type="button"
              onClick={() => setAuthorizerType('ALL')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                authorizerType === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              הכל
            </button>
            <button
              type="button"
              onClick={() => setAuthorizerType('SUBJECT')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                authorizerType === 'SUBJECT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-900 hover:bg-blue-50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>מורה מקצועי</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthorizerType('HOMEROOM')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                authorizerType === 'HOMEROOM'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-teal-900 hover:bg-teal-50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>מחנכת כיתה</span>
            </button>
          </div>

          {/* Gate Exit Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600 px-2">סטטוס שער:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              הכל
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('USED')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'USED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>יצאו מהשער</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-900 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>ממתינים</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dismissals List Section */}
      <div className="space-y-4">
        {loading && passes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-slate-200 text-slate-500 text-sm">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="font-bold">טוען נתוני שחרורים עבור סגן המנהל...</span>
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-slate-200 text-slate-500 space-y-3">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="font-extrabold text-slate-800 text-base">לא נמצאו שחרורים התואמים לסינון</div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto font-medium">
              {viewMode === 'single_day'
                ? `לא נרשמו אישורי שחרור לתאריך ${formatHebrewDateWithDay(activeDate).fullStr}. נסה לדפדף יום קודם / יום הבא או לקפוץ להיום.`
                : 'נסה לשנות את הכיתה שנבחרה, טווח התאריכים או להסיר את החיפוש החופשי.'}
            </p>
            {viewMode === 'single_day' && activeDate !== getDateOffsetString(0) && (
              <button
                type="button"
                onClick={handleJumpToToday}
                className="mt-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3.5 py-1.5 rounded-xl border border-amber-300 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>קפוץ לנתוני היום</span>
                <span>🎯</span>
              </button>
            )}
          </div>
        ) : viewMode === 'all' || viewMode === 'range' ? (
          /* Multi-day / All History View: Grouped by Day of Week */
          <div className="space-y-6">
            {groupedPassesByDay.map((group) => (
              <div key={group.dateStr} className="space-y-3">
                {/* Weekday Group Header Banner */}
                <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md border-2 border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center font-bold">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-sm sm:text-base font-['Rubik'] text-white">
                        {group.fullStr}
                      </span>
                      {group.dateStr === getDateOffsetString(0) && (
                        <span className="mr-2 text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                          היום
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded-xl border border-slate-700">
                      סה״כ {group.passes.length} שוחררו
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-xl">
                      {group.usedCount} יצאו מהשער
                    </span>
                    {group.pendingCount > 0 && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-xl">
                        {group.pendingCount} ממתינים
                      </span>
                    )}
                  </div>
                </div>

                {/* Day's passes */}
                <div className="space-y-3">
                  {group.passes.map(renderPassCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single Day View: Passes for active selected date */
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-800">
                <CalendarDays className="w-4 h-4 text-amber-600" />
                <span>מוצגים שחרורים ל-{formatHebrewDateWithDay(activeDate).fullStr}:</span>
              </span>
              <span>נמצאו {filteredPasses.length} תלמידים</span>
            </div>
            {filteredPasses.map(renderPassCard)}
          </div>
        )}
      </div>

      {/* Official Gate Pass Inquiry Document Modal (Dialog for Parents/Inquiries) */}
      {selectedSlipPass && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border-2 border-slate-300 flex flex-col max-h-[94vh] my-auto overflow-hidden print:border-none print:shadow-none print:rounded-none print:max-h-none print:my-0">
            {/* Modal Header Bar (Fixed, Always Visible on Screen) */}
            <div className="shrink-0 bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 z-10 print:hidden">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSlipPass(null)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 border border-slate-700 shadow-sm cursor-pointer"
                  title="חזרה לחלון הראשי"
                >
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                  <span>חזרה</span>
                </button>
                <div className="flex items-center gap-2 text-sm font-bold font-['Rubik'] text-white">
                  <FileCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">טופס בירור שחרור רשמי</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
                  title="הדפס טופס בירור רשמי"
                >
                  <Printer className="w-4 h-4" />
                  <span>הדפס אישור</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlipPass(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="סגור חלון"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Document Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 bg-white text-slate-800 print:overflow-visible print:p-0" dir="rtl">
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <div className="text-xs font-bold text-slate-500 tracking-wider">
                  משרד החינוך · הנהלת בית הספר · פיקוח שער וביטחון
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Rubik'] mt-1">
                  אישור ובירור שעת יציאת תלמיד/ה מבית הספר
                </h2>
                <div className="text-xs text-slate-600 mt-1 font-semibold">
                  תעודת בירור רשמית מאת סגן המנהל ואחראי שחרורים
                </div>
              </div>

              {/* Timestamp & Pass ID */}
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-700">תאריך הפקה: </span>
                  <span>
                    {new Date().toLocaleDateString('he-IL')} בשעה{' '}
                    {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">מזהה אישור: </span>
                  <span className="font-mono text-slate-800 font-semibold">{selectedSlipPass.id}</span>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border-2 border-slate-200 space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 text-xs block font-semibold">שם התלמיד/ה:</span>
                    <span className="font-black text-slate-900 text-lg">{selectedSlipPass.studentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block font-semibold">כיתת האם:</span>
                    <span className="font-black text-slate-900 text-lg">כיתה {selectedSlipPass.className}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block font-semibold">מחנכת הכיתה:</span>
                    <span className="font-black text-teal-900 text-base">
                      {selectedSlipPass.homeroomTeacher || classHomeroomMap.get(selectedSlipPass.className) || 'מחנכת כיתה'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 text-xs block font-semibold">ת.ז / קוד זיהוי:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedSlipPass.studentCode || 'לא צוין'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block font-semibold">תאריך השחרור:</span>
                    <span className="font-bold text-slate-800">{selectedSlipPass.dateStr}</span>
                  </div>
                </div>
              </div>

              {/* Chronological Gate Event Trail */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider">
                  ציר זמני האישור והיציאה בשער:
                </h4>

                <div className="border-2 border-slate-200 rounded-2xl p-4 space-y-3.5 bg-white text-xs sm:text-sm">
                  {/* Step 1: Teacher Release */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <div className="font-extrabold text-slate-900 text-sm">
                        שחרור אושר ע״י {selectedSlipPass.teacherName}{' '}
                        {isSubjectTeacher(selectedSlipPass.teacherName, selectedSlipPass.className)
                          ? '(מורה מקצועי)'
                          : '(מחנכת כיתה)'}
                      </div>
                      <div className="text-slate-600 text-xs mt-1">
                        שעת אישור מתוכננת: <strong className="text-slate-900 font-mono text-sm">{selectedSlipPass.validFromTime}</strong> · סיבה:{' '}
                        <span className="font-semibold text-slate-800">{selectedSlipPass.reason || 'אישור יציאה רשמי'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Gate Physical Exit */}
                  <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${
                        selectedSlipPass.usedAt ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      2
                    </div>
                    <div className="flex-1">
                      <div className="font-extrabold text-slate-900 text-sm">
                        יציאה פיזית בשער בית הספר
                      </div>
                      <div className="text-slate-600 text-xs mt-1">
                        {selectedSlipPass.usedAt ? (
                          <span className="text-emerald-800 font-semibold">
                            נרשם בשער בשעה{' '}
                            <strong className="font-mono text-sm text-emerald-900">
                              {selectedSlipPass.usedAt.includes('T')
                                ? selectedSlipPass.usedAt.split('T')[1].substring(0, 5)
                                : selectedSlipPass.usedAt}
                            </strong>{' '}
                            {selectedSlipPass.usedBy && `על ידי ${selectedSlipPass.usedBy}`}
                          </span>
                        ) : selectedSlipPass.status === 'cancelled' ? (
                          <span className="text-rose-700 font-semibold">האישור בוטל על ידי המורה</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">
                            האישור פעיל, התלמיד/ה טרם עבר/ה בשער הפיזי
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures & School Stamp Section */}
              <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-6 text-center text-xs">
                <div>
                  <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
                  <div className="font-bold text-slate-800">חתימת סגן המנהל ואחראי שחרורים</div>
                  <div className="text-[11px] text-slate-500 font-semibold">הנהלת בית הספר</div>
                </div>
                <div>
                  <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
                  <div className="font-bold text-slate-800">חתימת שומר השער</div>
                  <div className="text-[11px] text-slate-500 font-semibold">עמדת ביטחון ראשית</div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="text-[11px] text-slate-400 text-center pt-2">
                מסמך זה הינו תיעוד דיגיטלי רשמי המופק ישירות מיומן השער הממוחשב בזמן אמת.
              </div>
            </div>

            {/* Modal Bottom Footer (Fixed, Always Visible on Screen) */}
            <div className="shrink-0 bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between z-10 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedSlipPass(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                סגור חלון
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>הדפס אישור</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
