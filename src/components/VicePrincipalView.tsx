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
  ArrowRight
} from 'lucide-react';

interface VicePrincipalViewProps {
  user: User;
  syncTick: number;
}

export const VicePrincipalView: React.FC<VicePrincipalViewProps> = ({ user, syncTick }) => {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [authorizerType, setAuthorizerType] = useState<'ALL' | 'HOMEROOM' | 'SUBJECT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'USED' | 'PENDING' | 'CANCELLED'>('ALL');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '3days' | '7days' | 'all'>('today');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Class list extracted dynamically
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);

  // Slip modal for printing / parent inquiry
  const [selectedSlipPass, setSelectedSlipPass] = useState<GatePass | null>(null);

  // Helper date offset
  const getDateOffsetString = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const handleApplyDatePreset = (preset: 'today' | 'yesterday' | '3days' | '7days' | 'all') => {
    setDatePreset(preset);
    if (preset === 'today') {
      const today = getDateOffsetString(0);
      setFromDate(today);
      setToDate(today);
    } else if (preset === 'yesterday') {
      const yesterday = getDateOffsetString(1);
      setFromDate(yesterday);
      setToDate(yesterday);
    } else if (preset === '3days') {
      const threeDays = getDateOffsetString(3);
      const today = getDateOffsetString(0);
      setFromDate(threeDays);
      setToDate(today);
    } else if (preset === '7days') {
      const sevenDays = getDateOffsetString(7);
      const today = getDateOffsetString(0);
      setFromDate(sevenDays);
      setToDate(today);
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // Initial load
  useEffect(() => {
    const today = getDateOffsetString(0);
    setFromDate(today);
    setToDate(today);
  }, []);

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
    // Default known homerooms from PDF
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

  // Sync tick listener (SSE real-time background update)
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

  return (
    <div className="pb-24 max-w-5xl mx-auto px-4 pt-4 sm:pt-6">
      {/* Vice Principal Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-amber-800/40 mb-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                  לוח פיקוח שחרורים בית ספרי
                </span>
                <span className="text-[11px] bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-md font-semibold">
                  סגן מנהל · אחראי שחרורים כולל
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-['Rubik'] mt-0.5 text-white">
                מעקב שחרורים וזמני יציאה בשער
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                בקרה שוטפת על כל תלמיד ששוחרר: כיתה, זהות המורה המשחרר (מקצועי או מחנכת), שעת האישור ושעת היציאה הפיזית
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => loadPasses(true)}
              disabled={refreshing}
              className="px-3 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
              title="רענן נתוני שחרורים"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>רענן נתונים</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              title="הדפס דוח שחרורים מרוכז"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>הדפס דוח</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">סה״כ שוחררו</div>
          <div className="text-2xl font-black text-slate-900 font-mono">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">בטווח שנבחר</div>
        </div>

        <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-800 mb-1 flex items-center gap-1">
            <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>יצאו מהשער</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{stats.used}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">אושר ונרשם בשער</div>
        </div>

        <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-800 mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>ממתינים בשער</span>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{stats.pending}</div>
          <div className="text-[10px] text-amber-600 font-medium mt-0.5">בדרך לשומר</div>
        </div>

        <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-blue-900 mb-1 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
            <span>מורים מקצועיים</span>
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono">{stats.bySubject}</div>
          <div className="text-[10px] text-blue-600 font-medium mt-0.5">שעה אחרונה / מקצוע</div>
        </div>

        <div className="bg-teal-50/80 p-3.5 rounded-2xl border border-teal-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-teal-900 mb-1 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-teal-700" />
            <span>מחנכות כיתה</span>
          </div>
          <div className="text-2xl font-black text-teal-700 font-mono">{stats.byHomeroom}</div>
          <div className="text-[10px] text-teal-600 font-medium mt-0.5">כיתת אם ראשית</div>
        </div>

        <div className="bg-rose-50/80 p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-rose-800 mb-1">אישורים שבוטלו</div>
          <div className="text-2xl font-black text-rose-700 font-mono">{stats.cancelled}</div>
          <div className="text-[10px] text-rose-600 font-medium mt-0.5">בוטלו ע״י מורה</div>
        </div>
      </div>

      {/* Control & Filter Zone */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 mb-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש מהיר: שם תלמיד, כיתה, שם המורה ששיחרר, או שומר..."
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-600 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date range picker & presets */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500 ml-1">תקופה:</span>
            {(['today', 'yesterday', '3days', '7days', 'all'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleApplyDatePreset(preset)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  datePreset === preset
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {preset === 'today'
                  ? 'היום'
                  : preset === 'yesterday'
                  ? 'אתמול'
                  : preset === '3days'
                  ? '3 ימים'
                  : preset === '7days'
                  ? 'שבוע'
                  : 'הכל'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Granular Filters (Class & Authorizer Type & Status) */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Class Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-600 flex items-center gap-1 ml-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>כיתה:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedClass('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedClass === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              כל הכיתות
            </button>
            {classesOptions.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  selectedClass === cls
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>

          {/* Authorizer Type (מורה מקצועי מול מחנכת) */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-1">גורם משחרר:</span>
            <button
              type="button"
              onClick={() => setAuthorizerType('ALL')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                authorizerType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              הכל
            </button>
            <button
              type="button"
              onClick={() => setAuthorizerType('SUBJECT')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 ${
                authorizerType === 'SUBJECT' ? 'bg-blue-600 text-white shadow-2xs' : 'text-blue-800 hover:bg-blue-50'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>מורה מקצועי</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthorizerType('HOMEROOM')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 ${
                authorizerType === 'HOMEROOM' ? 'bg-teal-600 text-white shadow-2xs' : 'text-teal-800 hover:bg-teal-50'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>מחנכת כיתה</span>
            </button>
          </div>

          {/* Gate Exit Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-1">סטטוס שער:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              הכל
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('USED')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 ${
                statusFilter === 'USED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>יצאו מהשער</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 ${
                statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>ממתינים</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dismissals List Section */}
      <div className="space-y-3">
        {loading && passes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>טוען נתוני שחרורים עבור סגן המנהל...</span>
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs space-y-2">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-700 text-sm">לא נמצאו שחרורים התואמים לסינון</div>
            <p className="text-slate-400 max-w-sm mx-auto">
              נסה לשנות את הכיתה שנבחרה, טווח התאריכים או להסיר את החיפוש החופשי.
            </p>
          </div>
        ) : (
          filteredPasses.map((pass) => {
            const isUsed = pass.status === 'used';
            const isCancelled = pass.status === 'cancelled';
            const isSubject = isSubjectTeacher(pass.teacherName, pass.className);

            return (
              <div
                key={pass.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-2xs hover:shadow-sm ${
                  isUsed
                    ? 'border-emerald-200/90 hover:border-emerald-300'
                    : isCancelled
                    ? 'border-rose-200/90 bg-rose-50/20'
                    : 'border-amber-200/90 hover:border-amber-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  {/* Student & Class Info */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-2xs ${
                        isUsed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : isCancelled
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {pass.className}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-slate-900 font-['Rubik']">
                          {pass.studentName}
                        </span>
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {pass.studentCode || 'ללא ת.ז'}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          כיתה {pass.className}
                        </span>
                      </div>

                      {/* Authorizer Identity (Teacher vs Homeroom) */}
                      <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                        {isSubject ? (
                          <span className="bg-blue-100/80 text-blue-900 border border-blue-300/80 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                            <span>מורה מקצועי: {pass.teacherName}</span>
                          </span>
                        ) : (
                          <span className="bg-teal-100/80 text-teal-900 border border-teal-300/80 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                            <span>מחנכת כיתה: {pass.teacherName}</span>
                          </span>
                        )}

                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">תאריך: <strong>{pass.dateStr}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Action */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs ${
                        isUsed
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isCancelled
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isUsed ? 'bg-emerald-600' : isCancelled ? 'bg-rose-600' : 'bg-amber-600'
                        }`}
                      />
                      <span>
                        {isUsed
                          ? 'יצא/ה מהשער בהצלחה'
                          : isCancelled
                          ? 'בוטל ע״י המורה'
                          : 'אושר, ממתין ליציאה'}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedSlipPass(pass)}
                      className="px-3 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl border border-amber-200 transition-colors flex items-center gap-1 shadow-2xs"
                      title="הפק אישור ובירור רשמי"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-700" />
                      <span>טופס רשמי</span>
                    </button>
                  </div>
                </div>

                {/* Granular Timing Grid (שעת שחרור מול שעת יציאה מהשער) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                  {/* Time Authorized */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-0.5 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>שעת אישור השחרור:</span>
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {pass.validFromTime}
                      <span className="text-[11px] font-normal text-slate-500 mr-1.5">
                        (נוצר ב-{new Date(pass.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    </div>
                  </div>

                  {/* Actual Gate Exit Time */}
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isUsed
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <span className="block mb-0.5 font-medium flex items-center gap-1 text-slate-500">
                      <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>שעת יציאה בפועל מהשער:</span>
                    </span>
                    <div className="font-bold text-sm">
                      {pass.usedAt ? (
                        <span className="text-emerald-800">
                          בשעה{' '}
                          {pass.usedAt.includes('T')
                            ? pass.usedAt.split('T')[1].substring(0, 5)
                            : pass.usedAt}
                          {pass.usedBy && (
                            <span className="text-xs font-semibold text-emerald-700 mr-1.5">
                              (ע״י {pass.usedBy})
                            </span>
                          )}
                        </span>
                      ) : isCancelled ? (
                        <span className="text-rose-700 font-semibold">לא יצא (בוטל)</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">טרם יצא/ה (בדרך לשער)</span>
                      )}
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-0.5 font-medium">סיבת השחרור:</span>
                    <div className="font-semibold text-slate-800 truncate" title={pass.reason || 'שחרור מוקדם באישור הורים'}>
                      {pass.reason || 'שחרור מוקדם באישור הורים'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Official Parent Inquiry Slip */}
      {selectedSlipPass && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0 print:overflow-visible">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[94vh] my-auto overflow-hidden print:border-none print:shadow-none print:rounded-none print:max-h-none print:my-0">
            {/* Modal Header Bar (Fixed, Always Visible on Screen) */}
            <div className="shrink-0 bg-slate-900 text-white px-4 sm:px-5 py-3 flex items-center justify-between border-b border-slate-800 z-10 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSlipPass(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 shadow-2xs"
                  title="חזרה לחלון הראשי"
                >
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                  <span>חזרה</span>
                </button>
                <div className="flex items-center gap-1.5 mr-1 text-xs sm:text-sm font-bold font-['Rubik'] text-white">
                  <FileCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">טופס בירור שחרור להורים</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/30"
                  title="הדפס טופס בירור רשמי"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>הדפס אישור</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlipPass(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="סגור חלון"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Document Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 bg-white text-slate-800 print:overflow-visible print:p-0" dir="rtl">
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <div className="text-xs font-semibold text-slate-500 tracking-wider">
                  משרד החינוך · הנהלת בית הספר · פיקוח שער וביטחון
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Rubik'] mt-1">
                  אישור ובירור שעת יציאת תלמיד/ה מבית הספר
                </h2>
                <div className="text-xs text-slate-600 mt-1 font-medium">
                  תעודת בירור רשמית מאת סגן המנהל ואחראי שחרורים
                </div>
              </div>

              {/* Timestamp & Pass ID */}
              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-700">תאריך הפקה: </span>
                  <span>
                    {new Date().toLocaleDateString('he-IL')} בשעה{' '}
                    {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">מזהה אישור: </span>
                  <span className="font-mono text-slate-800">{selectedSlipPass.id}</span>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 text-xs block">שם התלמיד/ה:</span>
                    <span className="font-bold text-slate-900 text-base">{selectedSlipPass.studentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">כיתה:</span>
                    <span className="font-bold text-slate-900 text-base">{selectedSlipPass.className}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 text-xs block">ת.ז / קוד זיהוי:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedSlipPass.studentCode || 'לא צוין'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">תאריך השחרור:</span>
                    <span className="font-bold text-slate-800">{selectedSlipPass.dateStr}</span>
                  </div>
                </div>
              </div>

              {/* Chronological Gate Event Trail */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider">
                  ציר זמני האישור והיציאה בשער:
                </h4>

                <div className="border border-slate-200 rounded-2xl p-3.5 space-y-3 bg-white text-xs">
                  {/* Step 1: Teacher Release */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">
                        שחרור אושר ע״י {selectedSlipPass.teacherName}{' '}
                        {isSubjectTeacher(selectedSlipPass.teacherName, selectedSlipPass.className)
                          ? '(מורה מקצועי)'
                          : '(מחנכת כיתה)'}
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        שעת אישור מתוכננת: <strong className="text-slate-900">{selectedSlipPass.validFromTime}</strong> · סיבה:{' '}
                        <span className="font-semibold">{selectedSlipPass.reason || 'אישור יציאה רשמי'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Gate Physical Exit */}
                  <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                        selectedSlipPass.usedAt ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      2
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">
                        {selectedSlipPass.usedAt ? 'יציאה פיזית מהשער' : 'מעבר בשער'}
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        {selectedSlipPass.usedAt ? (
                          <span>
                            התלמיד/ה יצא/ה מהשער בשעה{' '}
                            <strong className="text-emerald-700 font-mono text-xs">
                              {selectedSlipPass.usedAt.includes('T')
                                ? selectedSlipPass.usedAt.split('T')[1].substring(0, 5)
                                : selectedSlipPass.usedAt}
                            </strong>
                            {selectedSlipPass.usedBy && ` באישור השומר ${selectedSlipPass.usedBy}`}
                          </span>
                        ) : selectedSlipPass.status === 'cancelled' ? (
                          <span className="text-rose-600 font-bold">האישור בוטל</span>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            האישור תקף, אך התלמיד/ה טרם עבר/ה בשער הפיזי
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Signatures Zone */}
              <div className="pt-3 border-t-2 border-slate-900 flex items-end justify-between text-xs">
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span className="text-slate-500">חתימת סגן המנהל (אחראי שחרורים)</span>
                </div>

                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span className="text-slate-500">חותמת בית הספר ועמאר פאעור</span>
                </div>
              </div>
            </div>

            {/* Bottom Navigation Toolbar (Fixed, Always Visible on Screen) */}
            <div className="shrink-0 bg-slate-100 border-t border-slate-200 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 z-10 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedSlipPass(null)}
                className="px-4 py-2 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span>חזרה למערכת</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/20"
              >
                <Printer className="w-4 h-4" />
                <span>הדפס טופס רשמי (A4 / PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
