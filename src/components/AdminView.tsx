import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api.ts';
import { parseExcelOrCsv, generateSampleExcelWorkbook, ParseResult } from '../lib/excelParser.ts';
import { User, StaffMember, AuditLogEntry, GatePass } from '../types.ts';
import {
  Upload,
  FileSpreadsheet,
  Users,
  Shield,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Key,
  Download,
  Search,
  Lock,
  Layers,
  Check,
  X,
  History,
  Calendar,
  Clock,
  Printer,
  FileCheck,
  UserCheck,
  Award,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface AdminViewProps {
  user: User;
  syncTick: number;
}

export const AdminView: React.FC<AdminViewProps> = ({ user, syncTick }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'import' | 'staff' | 'audit'>('history');

  // History & Parent Inquiry state
  const [historyPasses, setHistoryPasses] = useState<GatePass[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const [historyClass, setHistoryClass] = useState('');
  const [historyDatePreset, setHistoryDatePreset] = useState<'all' | 'today' | 'yesterday' | '2days' | '7days'>('all');
  const [selectedSlipPass, setSelectedSlipPass] = useState<GatePass | null>(null);

  // Import state
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Staff state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);
  const [newStaffModal, setNewStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRoleType, setNewStaffRoleType] = useState<
    'subject_all' | 'subject_classes' | 'homeroom' | 'guard' | 'vice_principal' | 'admin'
  >('subject_all');
  const [newStaffClass, setNewStaffClass] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);

  const togglePinVisibility = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPin = (id: string, pin: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pin);
      setCopiedPinId(id);
      setTimeout(() => setCopiedPinId(null), 2000);
    }
  };

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Reset demo state
  const [resetting, setResetting] = useState(false);

  // Pass Deletion & Archive Purge state (Admin Amar Faour)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'range' | 'single'>('range');
  const [singlePassToDelete, setSinglePassToDelete] = useState<GatePass | null>(null);
  const [purgeFromDate, setPurgeFromDate] = useState('');
  const [purgeToDate, setPurgeToDate] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Homeroom & Authorizer helpers
  const getHomeroomTeacher = (className: string, fallback?: string) => {
    if (fallback) return fallback;
    const map: Record<string, string> = {
      'ז1': 'לינא ח׳ליל',
      'ז2': 'סוהא מנצור',
      'ח1': 'דלאל חביב',
      'ח2': 'נאדיה סרחאן',
      'ט1': 'רימא ג׳אבר',
    };
    return map[className] || 'מחנכת כיתה';
  };

  const isSubjectAuthorizer = (teacherName: string, className: string, homeroom?: string) => {
    const cleanTeacher = (teacherName || '').trim();
    if (cleanTeacher.includes('מקצועי') || cleanTeacher.includes('מוחמד עלי')) return true;
    const hr = homeroom || getHomeroomTeacher(className);
    if (hr && hr.trim() !== cleanTeacher) return true;
    return false;
  };

  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    try {
      let res;
      if (deleteMode === 'all') {
        res = await api.deletePasses({ all: true });
        setDeleteFeedback({
          type: 'success',
          message: `כל מאגר האישורים נמחק בהצלחה (${res.deletedCount} אישורים הוסרו מהמאגר).`,
        });
      } else if (deleteMode === 'single' && singlePassToDelete) {
        res = await api.deletePasses({ passIds: [singlePassToDelete.id] });
        setDeleteFeedback({
          type: 'success',
          message: `אישור השחרור של ${singlePassToDelete.studentName} נמחק בהצלחה מהמאגר.`,
        });
      } else if (deleteMode === 'range') {
        if (!purgeFromDate && !purgeToDate) {
          throw new Error('אנא בחר לפחות תאריך התחלה או תאריך סיום למחיקה');
        }
        res = await api.deletePasses({
          fromDate: purgeFromDate || undefined,
          toDate: purgeToDate || undefined,
        });
        setDeleteFeedback({
          type: 'success',
          message: `נמחקו ${res.deletedCount} אישורי שחרור בטווח התאריכים שנבחר.`,
        });
      }
      setDeleteModalOpen(false);
      setSinglePassToDelete(null);
      await loadHistory(true);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה במחיקת האישורים מהמאגר',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper for date offsets
  const getDateOffsetString = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const handleApplyDatePreset = (preset: 'all' | 'today' | 'yesterday' | '2days' | '7days') => {
    setHistoryDatePreset(preset);
    if (preset === 'all') {
      setHistoryFromDate('');
      setHistoryToDate('');
    } else if (preset === 'today') {
      const today = getDateOffsetString(0);
      setHistoryFromDate(today);
      setHistoryToDate(today);
    } else if (preset === 'yesterday') {
      const yesterday = getDateOffsetString(1);
      setHistoryFromDate(yesterday);
      setHistoryToDate(yesterday);
    } else if (preset === '2days') {
      const twoDays = getDateOffsetString(2);
      setHistoryFromDate(twoDays);
      setHistoryToDate(twoDays);
    } else if (preset === '7days') {
      const sevenDays = getDateOffsetString(7);
      const today = getDateOffsetString(0);
      setHistoryFromDate(sevenDays);
      setHistoryToDate(today);
    }
  };

  // Load History / Parent inquiry (with seamless background update)
  const loadHistory = async (forceSpinner = false) => {
    try {
      if (forceSpinner || historyPasses.length === 0) setLoadingHistory(true);
      const res = await api.searchHistory({
        q: historyQuery.trim() || undefined,
        from: historyFromDate || undefined,
        to: historyToDate || undefined,
        className: historyClass || undefined,
      });
      setHistoryPasses(res.passes);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load Staff
  const loadStaff = async (forceSpinner = false) => {
    try {
      if (forceSpinner || staffList.length === 0) setLoadingStaff(true);
      const res = await api.getStaff();
      setStaffList(res.staff);
    } catch {
      // ignore
    } finally {
      setLoadingStaff(false);
    }
  };

  // Load Audit
  const loadAudit = async (forceSpinner = false) => {
    try {
      if (forceSpinner || auditLogs.length === 0) setLoadingAudit(true);
      const res = await api.getAudit();
      setAuditLogs(res.logs);
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') loadHistory(false);
    if (activeTab === 'staff') loadStaff(false);
    if (activeTab === 'audit') loadAudit(false);
  }, [activeTab, historyFromDate, historyToDate, historyClass]);

  // Handle File Upload & Parse
  const handleFileUpload = async (file: File) => {
    setParsing(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = parseExcelOrCsv(arrayBuffer, file.name);

      if (result.students.length === 0) {
        setImportError('לא נמצאו תלמידים בקובץ. אנא בדוק את מבנה הגיליון.');
        setParseResult(null);
      } else {
        setParseResult(result);
      }
    } catch (err: any) {
      setImportError(`שגיאה בקריאת הקובץ: ${err.message || 'פורמט לא נתמך'}. יש להעלות Excel (.xlsx/.xls) או CSV.`);
      setParseResult(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Confirm import and save to server
  const handleConfirmImport = async () => {
    if (!parseResult || importing) return;

    setImporting(true);
    setImportError(null);

    try {
      const classesTeachers = parseResult.classesSummary.map((c) => ({
        className: c.className,
        teacherName: c.teacherName,
      }));

      const res = await api.importData(parseResult.students, classesTeachers);
      setImportSuccess(
        `הייבוא הושלם בהצלחה! ${res.added} תלמידים חדשים נוספו, ${res.updated} עודכנו. סה״כ במערכת: ${res.total}`
      );
      setParseResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setImportError(err.message || 'שגיאה בשמירת הנתונים בשרת');
    } finally {
      setImporting(false);
    }
  };

  // Download sample template
  const handleDownloadSample = () => {
    const bytes = generateSampleExcelWorkbook();
    const blob = new Blob([bytes as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'דוגמה_לקובץ_כיתות_ותלמידים.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Staff management methods
  const handleToggleStaffActive = (staffId: string) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handleRegeneratePin = (staffId: string) => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, pinCode: randomPin } : s))
    );
  };

  const handleAddClassToTeacher = (staffId: string, newClass: string) => {
    if (!newClass.trim()) return;
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === staffId) {
          const classes = s.assignedClasses.includes(newClass.trim())
            ? s.assignedClasses
            : [...s.assignedClasses, newClass.trim()];
          return { ...s, assignedClasses: classes };
        }
        return s;
      })
    );
  };

  const handleRemoveClassFromTeacher = (staffId: string, clsToRemove: string) => {
    setStaffList((prev) =>
      prev.map((s) =>
        s.id === staffId
          ? { ...s, assignedClasses: s.assignedClasses.filter((c) => c !== clsToRemove) }
          : s
      )
    );
  };

  const handleSaveStaffChanges = async () => {
    setSavingStaff(true);
    setStaffSuccess(null);
    try {
      const res = await api.saveStaff(staffList);
      setStaffList(res.staff);
      setStaffSuccess('פרטי הצוות וקודי הגישה נשמרו בהצלחה בשרת');
      setTimeout(() => setStaffSuccess(null), 4000);
    } catch {
      // ignore
    } finally {
      setSavingStaff(false);
    }
  };

  const handleCreateNewStaff = async () => {
    if (!newStaffName.trim()) return;
    const pin = newStaffPin.trim() || Math.floor(1000 + Math.random() * 9000).toString();

    let role: StaffMember['role'] = 'teacher';
    let assignedClasses: string[] = [];

    if (newStaffRoleType === 'subject_all') {
      role = 'teacher';
      assignedClasses = ['*'];
    } else if (newStaffRoleType === 'subject_classes') {
      role = 'teacher';
      assignedClasses = newStaffClass.trim()
        ? newStaffClass.split(/[,;\s]+/).map((c) => c.trim()).filter(Boolean)
        : ['*'];
    } else if (newStaffRoleType === 'homeroom') {
      role = 'teacher';
      assignedClasses = newStaffClass.trim() ? [newStaffClass.trim()] : ['ז1'];
    } else if (newStaffRoleType === 'guard') {
      role = 'guard';
      assignedClasses = [];
    } else if (newStaffRoleType === 'vice_principal') {
      role = 'vice_principal';
      assignedClasses = ['*'];
    } else if (newStaffRoleType === 'admin') {
      role = 'admin';
      assignedClasses = ['*'];
    }

    const newMember: StaffMember = {
      id: `staff-${Date.now()}`,
      staffCode: `${role[0].toUpperCase()}${staffList.length + 1}`,
      fullName: newStaffName.trim(),
      role,
      pinCode: pin,
      assignedClasses,
      isActive: true,
    };

    const updatedList = [...staffList, newMember];
    setStaffList(updatedList);
    setNewStaffModal(false);
    setNewStaffName('');
    setNewStaffClass('');
    setNewStaffPin('');
    setNewStaffRoleType('subject_all');

    // Auto-save to server
    try {
      setSavingStaff(true);
      await api.saveStaff(updatedList);
      setStaffSuccess(`איש הצוות ${newMember.fullName} נוסף ונשמר בשרת בהצלחה!`);
      setTimeout(() => setStaffSuccess(null), 4000);
    } catch {
      // ignore
    } finally {
      setSavingStaff(false);
    }
  };

  // Reset to original PDF demo data
  const handleResetDemoData = async () => {
    if (!confirm('האם לאפס את כל הנתונים בחזרה ל-5 הכיתות ו-25 התלמידים המקוריים מקובץ ה-PDF?')) {
      return;
    }
    setResetting(true);
    try {
      await api.resetDemo();
      alert('המערכת אופסה בהצלחה לנתוני ההדגמה המקוריים');
      if (activeTab === 'staff') loadStaff();
      if (activeTab === 'audit') loadAudit();
    } catch {
      alert('שגיאה באיפוס הנתונים');
    } finally {
      setResetting(false);
    }
  };

  // Filtered audit logs
  const filteredAudit = auditLogs.filter((log) => {
    if (auditFilter !== 'ALL' && log.actionType !== auditFilter) return false;
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.actorName.toLowerCase().includes(q) ||
      (log.studentName && log.studentName.toLowerCase().includes(q)) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="pb-24 max-w-4xl mx-auto px-4 pt-4 sm:pt-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-teal-300 font-semibold tracking-wide">לוח ניהול ומזכירות</div>
            <h1 className="text-xl sm:text-2xl font-bold font-['Rubik'] mt-0.5">מזכירות בית הספר</h1>
            <p className="text-xs text-slate-300 mt-1">ניהול קובצי כיתות, קודי גישה ויומן פעולות</p>
          </div>
          <button
            onClick={handleResetDemoData}
            disabled={resetting}
            className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            title="איפוס לנתוני PDF המקוריים"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>שחזר נתוני PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-5 bg-slate-200/80 p-1 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'history' ? 'bg-white text-emerald-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-emerald-600" />
          <span>בירור יציאות הורים וארכיון</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-4 h-4 text-teal-600" />
          <span>ייבוא Excel / CSV</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>צוות וקודי גישה</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" />
          <span>יומן פעולות</span>
        </button>
      </div>

      {/* ================= TAB 0: PARENT INQUIRY & HISTORY ================= */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Feedback Toast */}
          {deleteFeedback && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-bold shadow-sm border ${
                deleteFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {deleteFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{deleteFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteFeedback(null)}
                className="p-1 hover:bg-black/5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Admin Database Pass Management & Purge Toolbar (Amar Faour) */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 border-2 border-slate-700 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-sm">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-rose-500/30 text-rose-300 font-extrabold px-2.5 py-0.5 rounded-full border border-rose-500/40">
                    פעולות מנהל בלבד · עמאר פאעור
                  </span>
                  <span className="text-xs text-slate-400">איפוס ומחיקת אישורים</span>
                </div>
                <h3 className="text-base font-black text-white font-['Rubik'] mt-1">
                  ניהול ומחיקת אישורי שחרור מהמאגר
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  מחיקת אישורים ישנים לפי טווח תאריכים מוגדר או ריקון כולל של מאגר האישורים.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-stretch sm:self-auto shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setDeleteMode('range');
                  setPurgeFromDate('');
                  setPurgeToDate(getDateOffsetString(14)); // default to older than 2 weeks
                  setDeleteModalOpen(true);
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>מחיקה לפי טווח תאריכים...</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteMode('all');
                  setDeleteModalOpen(true);
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>מחיקת כל האישורים במערכת</span>
              </button>
            </div>
          </div>

          {/* Inquiry Explainer Banner */}
          <div className="bg-emerald-950 text-emerald-100 rounded-3xl p-5 border border-emerald-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  מענה מדויק להורים
                </span>
                <span className="text-xs text-emerald-400 font-medium">ארכיון דיגיטלי מתועד</span>
              </div>
              <h2 className="text-lg font-bold text-white font-['Rubik']">
                בירור יציאת תלמידים עבור הורים (היום, אתמול, שלשום ובכל מועד)
              </h2>
              <p className="text-xs text-emerald-200/90 leading-relaxed max-w-2xl">
                הורה מברר מתי יצא/ה הבת או הבן מבית הספר? כאן רואים במדויק: באיזה יום, באיזו דקה המורה שיחרר/ה, מה הייתה הסיבה, באיזו דקה השומר אישר יציאה בשער, ומי השומר שאישר — כולל הפקת מסמך אישור רשמי להורה.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadHistory(true)}
              disabled={loadingHistory}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow shrink-0 self-stretch sm:self-auto justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>רענן נתונים</span>
            </button>
          </div>

          {/* Search & Filters Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            {/* Student Search Bar */}
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadHistory(true)}
                placeholder="הקלד שם תלמיד/ה, מספר כיתה או קוד תלמיד (לדוגמה: מרים, ראמי, ז2)..."
                className="w-full pr-11 pl-24 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
              <button
                type="button"
                onClick={() => loadHistory(true)}
                className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                חפש
              </button>
            </div>

            {/* Quick Date Presets */}
            <div>
              <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>קיצורי תאריך לבדיקה:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'all', label: 'כל הזמן' },
                  { key: 'today', label: 'היום' },
                  { key: 'yesterday', label: 'אתמול' },
                  { key: '2days', label: 'שלשום (לפני יומיים)' },
                  { key: '7days', label: '7 ימים אחרונים' },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleApplyDatePreset(preset.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      historyDatePreset === preset.key
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers & Class Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">מתאריך:</label>
                <input
                  type="date"
                  value={historyFromDate}
                  onChange={(e) => {
                    setHistoryFromDate(e.target.value);
                    setHistoryDatePreset('all');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">עד תאריך:</label>
                <input
                  type="date"
                  value={historyToDate}
                  onChange={(e) => {
                    setHistoryToDate(e.target.value);
                    setHistoryDatePreset('all');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">סינון לפי כיתה:</label>
                <select
                  value={historyClass}
                  onChange={(e) => setHistoryClass(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="">כל הכיתות</option>
                  <option value="ז1">כיתה ז1</option>
                  <option value="ז2">כיתה ז2</option>
                  <option value="ח1">כיתה ח1</option>
                  <option value="ח2">כיתה ח2</option>
                  <option value="ח3">כיתה ח3</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700">
                נמצאו {historyPasses.length} אישורי יציאה מתועדים
              </span>
              {(historyQuery || historyFromDate || historyToDate || historyClass) && (
                <button
                  type="button"
                  onClick={() => {
                    setHistoryQuery('');
                    setHistoryFromDate('');
                    setHistoryToDate('');
                    setHistoryClass('');
                    setHistoryDatePreset('all');
                  }}
                  className="text-xs text-emerald-700 hover:underline font-semibold"
                >
                  נקה סינונים
                </button>
              )}
            </div>

            {loadingHistory && historyPasses.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <span>טוען נתוני ארכיון...</span>
              </div>
            ) : historyPasses.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-800 text-sm">לא נמצאו אישורי יציאה לפי הסינון</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  נסה לבחור בקיצור &quot;כל הזמן&quot; או לחפש שם תלמיד אחר (לדוגמה: מרים סאלח, ראמי עיסא)
                </p>
                <button
                  type="button"
                  onClick={() => handleApplyDatePreset('all')}
                  className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 inline-block"
                >
                  הצג את כל הרישומים
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {historyPasses.map((pass) => {
                  const isUsed = pass.status === 'used';
                  const isCancelled = pass.status === 'cancelled';
                  const isActive = pass.status === 'active';
                  const homeroom = pass.homeroomTeacher || getHomeroomTeacher(pass.className);
                  const isSubject = isSubjectAuthorizer(pass.teacherName, pass.className, homeroom);

                  return (
                    <div
                      key={pass.id}
                      className={`p-5 rounded-3xl border transition-all bg-white shadow-sm hover:shadow-md ${
                        isUsed
                          ? 'border-emerald-200'
                          : isCancelled
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-amber-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm shrink-0 ${
                              isUsed
                                ? 'bg-emerald-100 text-emerald-800'
                                : isCancelled
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {pass.studentName[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-black text-slate-900 text-base">{pass.studentName}</h3>
                              <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200">
                                {pass.className}
                              </span>
                              {pass.studentCode && (
                                <span className="text-[11px] font-mono text-slate-500">
                                  ת.ז/קוד: {pass.studentCode}
                                </span>
                              )}
                              <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                                <span>מחנכת הכיתה: {homeroom}</span>
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="font-bold text-slate-500">אישור ניתן ע״י:</span>
                              <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                                isSubject ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-teal-50 text-teal-800 border border-teal-200'
                              }`}>
                                {pass.teacherName} {isSubject ? '(מורה מקצועי)' : '(מחנכת הכיתה)'}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-semibold text-slate-700 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>תאריך יציאה: <strong className="text-slate-900">{pass.dateStr}</strong></span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                              isUsed
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : isCancelled
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
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
                            className="px-3 py-1.5 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl border border-amber-500/40 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                            title="הפק דוח בירור רשמי להורה"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-950" />
                            <span>אישור להורה</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSinglePassToDelete(pass);
                              setDeleteMode('single');
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="מחיקת אישור זה מהמאגר"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Detailed Breakdown Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3.5 text-xs">
                        <div className={`p-2.5 rounded-xl border ${
                          isSubject ? 'bg-blue-50/70 border-blue-200' : 'bg-teal-50/70 border-teal-200'
                        }`}>
                          <span className="text-slate-500 block mb-0.5 font-bold">מי אישר שחרור בפועל:</span>
                          <span className="font-extrabold text-slate-900 flex items-center gap-1">
                            {isSubject ? <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> : <UserCheck className="w-3.5 h-3.5 text-teal-600" />}
                            <span>{pass.teacherName}</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 mt-0.5 block">
                            {isSubject ? 'מורה מקצועי (שעה אחרונה)' : `מחנכת כיתה ${pass.className}`}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-500 block mb-0.5 font-bold">מחנכת הכיתה הקבועה:</span>
                          <span className="font-bold text-teal-900 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                            <span>{homeroom}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            כיתת אם {pass.className}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-500 block mb-0.5 font-bold">יציאה בפועל בשער:</span>
                          <span
                            className={`font-bold flex items-center gap-1 ${
                              pass.usedAt ? 'text-emerald-800' : 'text-slate-500'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {pass.usedAt
                                ? pass.usedAt.includes('T')
                                  ? pass.usedAt.split('T')[1].substring(0, 5)
                                  : pass.usedAt
                                : 'טרם יצא/ה'}
                            </span>
                            {pass.usedBy && (
                              <span className="text-[11px] font-normal text-slate-600">
                                (ע״י {pass.usedBy})
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            שעת אישור: {pass.validFromTime}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-500 block mb-0.5 font-bold">סיבת השחרור:</span>
                          <span className="font-semibold text-slate-800 truncate block">
                            {pass.reason || 'אישור יציאה רשמי מבית הספר'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 1: FILE IMPORT ================= */}
      {activeTab === 'import' && (
        <div className="space-y-5">
          {importSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-900 text-sm font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{importSuccess}</span>
              </div>
              <button onClick={() => setImportSuccess(null)} className="text-emerald-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {importError && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center justify-between text-rose-900 text-sm font-bold">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{importError}</span>
              </div>
              <button onClick={() => setImportError(null)} className="text-rose-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`bg-white border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
              dragOver ? 'border-teal-500 bg-teal-50/50 scale-[1.01]' : 'border-slate-300 hover:border-slate-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Rubik']">
              גרור לכאן קובץ Excel או CSV, או לחץ לבחירה
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              תומך בגיליון עם מספר לשוניות (לשונית לכל כיתה) או גיליון יחיד. שם הכיתה והמחנכת מזוהים אוטומטית מראש הגיליון או משם הלשונית.
            </p>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadSample();
                }}
                className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>הורד קובץ דוגמה לדוגמה</span>
              </button>
            </div>

            {parsing && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-teal-700 font-bold">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span>מפענח את הקובץ והמבנה...</span>
              </div>
            )}
          </div>

          {/* Parsed Preview Section */}
          {parseResult && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-['Rubik']">
                    תצוגה מקדימה לפני שמירה
                  </h3>
                  <div className="text-xs text-slate-500">
                    קובץ: <span className="font-semibold">{parseResult.fileName}</span> · נמצאו{' '}
                    <strong className="text-teal-700">{parseResult.students.length} תלמידים</strong> ב-
                    {parseResult.classesSummary.length} כיתות
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setParseResult(null)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
                  >
                    בטל
                  </button>

                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleConfirmImport}
                    className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    {importing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>אישור ושמירה במסד הנתונים</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Warnings / Duplicates Notice */}
              {(parseResult.duplicatesCount > 0 || parseResult.missingDataCount > 0) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>שים לב לשורות הדורשות בדיקה:</span>
                  </div>
                  {parseResult.duplicatesCount > 0 && (
                    <p>• זוהו {parseResult.duplicatesCount} כפילויות. טעינה מחדש תעדכן את הרשומה הקיימת ולא תיצור כפילויות.</p>
                  )}
                  {parseResult.missingDataCount > 0 && (
                    <p>• זוהו {parseResult.missingDataCount} שורות ללא כיתה משויכת.</p>
                  )}
                </div>
              )}

              {/* Classes Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parseResult.classesSummary.map((cls) => (
                  <div key={cls.className} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                      <span>כיתה {cls.className}</span>
                      <span className="text-xs font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-lg">
                        {cls.count} תלמידים
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      מחנכת: <strong>{cls.teacherName || 'לא זוהתה (תוכל להגדיר בצוות)'}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sample students table */}
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">מזהה תלמיד</th>
                      <th className="p-2.5">שם התלמיד</th>
                      <th className="p-2.5">כיתה</th>
                      <th className="p-2.5">מחנכת</th>
                      <th className="p-2.5">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResult.students.slice(0, 50).map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-600">{s.studentCode || '-'}</td>
                        <td className="p-2.5 font-bold text-slate-900">{s.fullName}</td>
                        <td className="p-2.5 text-slate-700">{s.className}</td>
                        <td className="p-2.5 text-slate-600">{s.teacherName || '-'}</td>
                        <td className="p-2.5">
                          {s.hasWarning ? (
                            <span className="text-rose-600 font-semibold">{s.warningMessage}</span>
                          ) : (
                            <span className="text-emerald-700 font-medium">תקין</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: STAFF & PIN CODES ================= */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          {/* Sole Admin Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl border border-blue-700/50 shadow flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-200">מנהל המערכת הבלעדי</div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>עמאר פאעור</span>
                  <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 px-2.5 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1">
                    <Shield className="w-3 h-3 text-blue-300" />
                    <span>מורשה על · גישת ניהול בלעדית</span>
                  </span>
                </div>
                <p className="text-[11px] text-blue-300/90 mt-0.5">
                  כל עניין הניהול, חיבור מורים לכיתות מסוימות, עדכון כיתות והנפקת קודים שמור בלעדית עבורך
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Rubik']">
                אנשי צוות וקודי גישה אישיים
              </h3>
              <p className="text-xs text-slate-500">
                כל איש צוות נכנס באמצעות קוד אישי ייחודי ללא צורך במייל
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNewStaffModal(true)}
                className="px-3 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>הוסף איש צוות</span>
              </button>

              <button
                type="button"
                disabled={savingStaff}
                onClick={handleSaveStaffChanges}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {savingStaff ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>שמור שינויים</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {staffSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{staffSuccess}</span>
            </div>
          )}

          {loadingStaff && staffList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">טוען רשימת צוות...</div>
          ) : (
            <div className="space-y-3">
              {staffList.map((member) => (
                <div
                  key={member.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    member.isActive ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-200 opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{member.fullName}</span>
                        {member.pinCode === '160525' ? (
                          <span className="text-[11px] font-bold text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                            <Shield className="w-3 h-3 text-purple-700" />
                            <span>מנהל ראשי ומורשה בלעדי</span>
                          </span>
                        ) : member.role === 'teacher' && (member.assignedClasses.includes('*') || member.fullName.includes('מקצועי')) ? (
                          <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-700" />
                            <span>מורה מקצועי (כל הכיתות)</span>
                          </span>
                        ) : member.role === 'teacher' && member.assignedClasses.length > 1 ? (
                          <span className="text-[11px] font-bold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-md">
                            מורה מקצועי ({member.assignedClasses.join(', ')})
                          </span>
                        ) : member.role === 'teacher' ? (
                          <span className="text-[11px] font-semibold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                            מחנכת {member.assignedClasses.length > 0 ? `(${member.assignedClasses.join(', ')})` : ''}
                          </span>
                        ) : member.role === 'guard' ? (
                          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                            שומר שער
                          </span>
                        ) : member.role === 'vice_principal' ? (
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                            <ShieldAlert className="w-3 h-3 text-amber-700" />
                            <span>סגן מנהל (אחראי שחרורים)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                            מזכירות / הנהלה
                          </span>
                        )}
                        {!member.isActive && (
                          <span className="text-[11px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-bold">
                            חסום
                          </span>
                        )}
                      </div>

                      {/* PIN and Assigned Classes */}
                      <div className="text-xs text-slate-600 mt-2 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                          <Key className="w-3.5 h-3.5 text-teal-600" />
                          <span className="font-medium text-slate-500 text-[11px]">קוד סודי:</span>
                          <span className="font-mono font-bold text-slate-900 tracking-wider text-xs min-w-[52px] text-center">
                            {revealedPins[member.id] ? member.pinCode : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePinVisibility(member.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title={revealedPins[member.id] ? 'הסתר קוד' : 'הצג קוד'}
                          >
                            {revealedPins[member.id] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPin(member.id, member.pinCode)}
                            className="p-1 text-slate-400 hover:text-teal-700 rounded transition-colors"
                            title="העתק קוד לשליחה דיסקרטית"
                          >
                            {copiedPinId === member.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegeneratePin(member.id)}
                            className="text-[10px] text-teal-700 hover:underline mr-1 font-semibold"
                            title="חולל קוד חדש"
                          >
                            (חולל חדש)
                          </button>
                        </div>

                        {member.role === 'teacher' && (
                          <div className="flex items-center gap-1">
                            <span>כיתות:</span>
                            {member.assignedClasses.map((cls) => (
                              <span
                                key={cls}
                                className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1"
                              >
                                {cls}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveClassFromTeacher(member.id, cls)}
                                  className="text-teal-600 hover:text-rose-600"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const cls = prompt('הזן שם כיתה להוספה (לדוגמה: ז3):');
                                if (cls) handleAddClassToTeacher(member.id, cls);
                              }}
                              className="text-xs text-teal-700 font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-100"
                            >
                              + הוסף כיתה
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddClassToTeacher(member.id, '*')}
                              className="text-xs text-emerald-700 font-bold bg-white border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-50"
                              title="מתאים למורה מקצועי שמלמד את כל השכבה/בית הספר"
                            >
                              + כל הכיתות (מקצועי)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Toggle Active Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleStaffActive(member.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                        member.isActive
                          ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {member.isActive ? 'בטל קוד' : 'הפעל קוד'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: AUDIT LOG ================= */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Rubik']">יומן פעולות (Audit Trail)</h3>
              <p className="text-xs text-slate-500">תיעוד מאובטח של כל אישור יציאה, ביטול ופעולה בשער</p>
            </div>
            <button
              onClick={() => loadAudit(true)}
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
              title="רענן יומן"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="חיפוש לפי תלמיד, מחנכת או פעולה..."
                className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'ALL', label: 'הכל' },
                { id: 'PASS_CREATED', label: 'אישורים שהונפקו' },
                { id: 'PASS_USED', label: 'יציאות מהשער' },
                { id: 'PASS_CANCELLED', label: 'ביטולים' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setAuditFilter(f.id)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    auditFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logs List */}
          {loadingAudit ? (
            <div className="p-8 text-center text-slate-400 text-xs">טוען יומן...</div>
          ) : filteredAudit.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">אין רשומות מתאימות ביומן</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredAudit.map((log) => {
                const date = new Date(log.timestamp);
                const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString('he-IL');

                return (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="font-semibold text-slate-800">
                        {log.actorName} ({log.actorRole === 'teacher' ? 'מחנכת' : log.actorRole === 'guard' ? 'שומר' : 'מנהל'})
                      </span>
                      <span className="font-mono text-[11px]">{dateStr} {timeStr}</span>
                    </div>
                    <div className="text-slate-800 font-medium">
                      {log.studentName && (
                        <strong className="text-teal-800 ml-1">
                          {log.studentName} {log.className ? `(${log.className})` : ''} -
                        </strong>
                      )}
                      <span>{log.details}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add New Staff Member */}
      {newStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 font-['Rubik']">הוספת איש צוות חדש</h3>
              <button onClick={() => setNewStaffModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">שם מלא:</label>
              <input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="לדוגמה: מרים כהן"
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">תפקיד והרשאה בבית הספר:</label>
              <select
                value={newStaffRoleType}
                onChange={(e) => setNewStaffRoleType(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="subject_all">🎓 מורה מקצועי - שעה אחרונה / גישה לכל הכיתות (*)</option>
                <option value="subject_classes">📚 מורה מקצועי - כיתות נבחרות (מלמד במספר כיתות)</option>
                <option value="homeroom">👩‍🏫 מחנכת כיתה (כיתת אם ספציפית)</option>
                <option value="vice_principal">👑 סגן מנהל - פיקוח שחרורים ובקרה כוללת (ללא גישת ניהול)</option>
                <option value="guard">🛡️ שומר שער (בדיקת אישורים בשער)</option>
                <option value="admin">🏛️ מזכירות / הנהלת בית הספר</option>
              </select>
            </div>

            {newStaffRoleType === 'vice_principal' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>פיקוח ובקרה שוטפת על כל שחרורי בית הספר</span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  לסגן המנהל מוענק לוח פיקוח ייעודי עם מעקב לפי כיתות, זיהוי מורה משחרר (מקצועי או מחנכת) וזמני יציאה בשער, ללא גישה להגדרות הניהול הבלעדיות שלך.
                </p>
              </div>
            )}

            {newStaffRoleType === 'subject_all' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>גישה רחבה לכלל כיתות בית הספר (*)</span>
                </div>
                <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                  המורה יוכל לבחור כל כיתה בבית הספר ולשחרר תלמידים בשיעור שלו או בשעה האחרונה ישירות לשער, ללא צורך בקוד המחנכת.
                </p>
              </div>
            )}

            {newStaffRoleType === 'subject_classes' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  הזן את הכיתות שהמורה מלמד/ת בהן (מופרדות בפסיקים):
                </label>
                <input
                  type="text"
                  value={newStaffClass}
                  onChange={(e) => setNewStaffClass(e.target.value)}
                  placeholder="לדוגמה: ז1, ז2, ח1, ח3"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  המורה יוכל לעבור בין כיתות אלו ולשחרר תלמידים מהן בלבד.
                </p>
              </div>
            )}

            {newStaffRoleType === 'homeroom' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">כיתת אם ראשית של המחנכת:</label>
                <input
                  type="text"
                  value={newStaffClass}
                  onChange={(e) => setNewStaffClass(e.target.value)}
                  placeholder="לדוגמה: ז3"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">קוד אישי סודי (השאר ריק לחילול אוטומטי):</label>
              <input
                type="text"
                value={newStaffPin}
                onChange={(e) => setNewStaffPin(e.target.value)}
                placeholder="הקלד קוד סודי בן 4-6 ספרות או השאר ריק"
                maxLength={8}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewStaffModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleCreateNewStaff}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold shadow"
              >
                הוסף
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Parent Inquiry Verification Slip */}
      {selectedSlipPass && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0 print:overflow-visible">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[94vh] my-auto overflow-hidden print:border-none print:shadow-none print:rounded-none print:max-h-none print:my-0">
            {/* Top Navigation & Action Bar (Fixed, Always Visible on Screen) */}
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
                  <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">טופס בירור שחרור להורים</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/30"
                  title="הדפס טופס בירור רשמי"
                >
                  <Printer className="w-4 h-4" />
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
              {/* Document Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <div className="text-xs font-semibold text-slate-500 tracking-wider">
                  משרד החינוך · בית ספר מקיף · פיקוח שער וביטחון
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Rubik'] mt-1">
                  אישור ובירור שעת יציאת תלמיד/ה מבית הספר
                </h2>
                <div className="text-xs text-slate-600 mt-1 font-medium">
                  תעודת בירור רשמית מיועדת להורי התלמיד/ה
                </div>
              </div>

              {/* Timestamp & Pass ID */}
              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-700">תאריך הפקה: </span>
                  <span>{new Date().toLocaleDateString('he-IL')} בשעה {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
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
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  מהלך האירוע ותיעוד שעות במערכת:
                </div>

                <div className="space-y-2 text-xs">
                  {/* Step 1: Teacher Approval */}
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-blue-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>שלב 1: אישור שחרור ע״י מורה / מחנך</span>
                      </div>
                      <div className="text-slate-700 mt-1">
                        אושר ע״י: <strong className="text-slate-900">{selectedSlipPass.teacherName}</strong>
                      </div>
                      <div className="text-slate-600 mt-0.5">
                        סיבת השחרור שנמסרה: <span className="font-semibold">{selectedSlipPass.reason || 'אישור יציאה רשמי'}</span>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="text-[11px] text-blue-700 block font-semibold">שעת שחרור מתוכננת:</span>
                      <span className="font-mono text-base font-black text-blue-900">{selectedSlipPass.validFromTime}</span>
                    </div>
                  </div>

                  {/* Step 2: Gate Security Exit */}
                  <div
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                      selectedSlipPass.status === 'used'
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : selectedSlipPass.status === 'cancelled'
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-amber-50/70 border-amber-300'
                    }`}
                  >
                    <div>
                      <div
                        className={`font-bold flex items-center gap-1.5 ${
                          selectedSlipPass.status === 'used'
                            ? 'text-emerald-950'
                            : selectedSlipPass.status === 'cancelled'
                            ? 'text-rose-950'
                            : 'text-amber-950'
                        }`}
                      >
                        <Shield
                          className={`w-4 h-4 shrink-0 ${
                            selectedSlipPass.status === 'used'
                              ? 'text-emerald-600'
                              : selectedSlipPass.status === 'cancelled'
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }`}
                        />
                        <span>
                          {selectedSlipPass.status === 'used'
                            ? 'שלב 2: יציאה פיזית מתועדת בשער בית הספר'
                            : selectedSlipPass.status === 'cancelled'
                            ? 'שלב 2: האישור בוטל'
                            : 'שלב 2: טרם עבר/ה בשער'}
                        </span>
                      </div>
                      <div className="text-slate-700 mt-1">
                        שומר שער מאשר: <strong className="text-slate-900">{selectedSlipPass.usedBy || 'שומר השער'}</strong>
                      </div>
                      <div className="text-slate-600 mt-0.5">
                        סטטוס רישום: {selectedSlipPass.status === 'used' ? 'התלמיד/ה יצא/ה פיזית דרך השער' : 'ממתין לבדיקת שומר'}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="text-[11px] text-slate-500 block font-semibold">שעת יציאה בפועל:</span>
                      <span className="font-mono text-base font-black text-emerald-900">
                        {selectedSlipPass.usedAt
                          ? selectedSlipPass.usedAt.includes('T')
                            ? selectedSlipPass.usedAt.split('T')[1].substring(0, 5)
                            : selectedSlipPass.usedAt
                          : '--:--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Stamp & Signatures Box */}
              <div className="pt-3 border-t-2 border-slate-300 space-y-3">
                <div className="grid grid-cols-2 gap-6 text-center text-xs">
                  <div className="border-t border-slate-400 pt-2">
                    <span className="text-slate-500 block">חתימת הנהלת בית הספר</span>
                    <span className="font-bold text-slate-800">עמאר פאעור</span>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <span className="text-slate-500 block">חתימת שומר השער</span>
                    <span className="font-bold text-slate-800">{selectedSlipPass.usedBy || 'אברהם כהן (שומר שער)'}</span>
                  </div>
                </div>

                <div className="bg-slate-100 p-2 rounded-xl text-center text-[11px] text-slate-600 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    מערכת ״אישור לשער״ · פותח ומנוהל ע״י עמאר פאעור
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Developed & Managed by Amar Faour · GatePass Verification System
                  </div>
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
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>הדפס טופס רשמי (A4 / PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Pass Deletion & Purge Modal (Amar Faour) */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border-2 border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-['Rubik']">
                    {deleteMode === 'all'
                      ? 'מחיקת כל האישורים במערכת'
                      : deleteMode === 'single'
                      ? 'מחיקת אישור שחרור בודד'
                      : 'מחיקת אישורים לפי טווח תאריכים'}
                  </h3>
                  <p className="text-xs text-slate-500">פעולת ניהול זו מוחקת נתונים מהמאגר לצמיתות</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-4 text-xs">
              {deleteMode === 'all' && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 space-y-2">
                  <div className="flex items-center gap-2 font-black text-sm text-rose-700">
                    <AlertTriangle className="w-5 h-5" />
                    <span>אזהרה חמורה: איפוס כולל של כל האישורים</span>
                  </div>
                  <p className="leading-relaxed">
                    פעולה זו תמחק את <strong>כל {historyPasses.length} אישורי השחרור</strong> הקיימים כרגע במסד הנתונים.
                    רשימת התלמידים, הכיתות וצוות המורים לא תיפגע — רק היסטוריית האישורים תימחק.
                  </p>
                </div>
              )}

              {deleteMode === 'single' && singlePassToDelete && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="font-bold text-slate-900 text-sm">האישור שיימחק לצמיתות:</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>תלמיד: <strong>{singlePassToDelete.studentName}</strong></div>
                    <div>כיתה: <strong>{singlePassToDelete.className}</strong></div>
                    <div>תאריך: <strong>{singlePassToDelete.dateStr}</strong></div>
                    <div>אושר ע״י: <strong>{singlePassToDelete.teacherName}</strong></div>
                  </div>
                </div>
              )}

              {deleteMode === 'range' && (
                <div className="space-y-3.5">
                  <p className="text-slate-600 font-medium">
                    בחר את טווח התאריכים של אישורי השחרור שברצונך למחוק מהמאגר:
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">מתאריך:</label>
                      <input
                        type="date"
                        value={purgeFromDate}
                        onChange={(e) => setPurgeFromDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">עד תאריך:</label>
                      <input
                        type="date"
                        value={purgeToDate}
                        onChange={(e) => setPurgeToDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Range Quick Shortcuts */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500">קיצורים מהירים לבחירה:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPurgeFromDate('');
                          setPurgeToDate(getDateOffsetString(14));
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                      >
                        מחק שחרורים ישנים מעל שבועיים
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPurgeFromDate('');
                          setPurgeToDate(getDateOffsetString(30));
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                      >
                        מחק שחרורים ישנים מעל חודש
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const today = getDateOffsetString(0);
                          setPurgeFromDate(today);
                          setPurgeToDate(today);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                      >
                        היום בלבד
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                ביטול וחזרה
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:bg-slate-300 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>אשר מחיקה לצמיתות</span>
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
