import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api.ts';
import { parseExcelOrCsv, generateSampleExcelWorkbook, ParseResult } from '../lib/excelParser.ts';
import { User, StaffMember, AuditLogEntry, GatePass, School, SchoolStatus } from '../types.ts';
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
  ArrowRight,
  Building,
  Building2,
  Unlock,
  ChevronDown,
  Power,
  Ban,
  ShieldCheck,
  Edit3,
  Phone,
  MapPin,
  Send,
  School as SchoolIcon
} from 'lucide-react';

interface AdminViewProps {
  user: User;
  syncTick: number;
}

export const AdminView: React.FC<AdminViewProps> = ({ user, syncTick }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'import' | 'staff' | 'audit' | 'transfer'>('history');

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
  const [newStaffPhoneInput, setNewStaffPhoneInput] = useState('');
  const [createdStaffForInvite, setCreatedStaffForInvite] = useState<StaffMember | null>(null);
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

  // Reset demo & Clear all state
  const [resetting, setResetting] = useState(false);
  const [resetDemoModalOpen, setResetDemoModalOpen] = useState(false);
  const [clearDemoModalOpen, setClearDemoModalOpen] = useState(false);
  const [clearingDemo, setClearingDemo] = useState(false);
  const [replaceExistingDemo, setReplaceExistingDemo] = useState(true);

  // Multi-school Architecture state (Amar Faour)
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [createSchoolModalOpen, setCreateSchoolModalOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCity, setNewSchoolCity] = useState('');
  const [newSchoolContactFirstName, setNewSchoolContactFirstName] = useState('');
  const [newSchoolContactLastName, setNewSchoolContactLastName] = useState('');
  const [newSchoolContactRole, setNewSchoolContactRole] = useState<'vice_principal' | 'secretary'>('vice_principal');
  const [newSchoolContactPin, setNewSchoolContactPin] = useState(() => Math.floor(3000 + Math.random() * 900).toString());
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolActivationCode, setNewSchoolActivationCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [newSchoolStatus, setNewSchoolStatus] = useState<SchoolStatus>('pending');
  const [isCreatingSchool, setIsCreatingSchool] = useState(false);
  const [targetActionSchool, setTargetActionSchool] = useState<School | null>(null);
  const [schoolActionType, setSchoolActionType] = useState<'suspend' | 'unsuspend' | 'roll_pins' | 'clear_data' | 'delete' | null>(null);
  const [isPerformingSchoolAction, setIsPerformingSchoolAction] = useState(false);
  const [deleteSchoolModalOpen, setDeleteSchoolModalOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);

  // Edit Activation Code state
  const [editCodeModalOpen, setEditCodeModalOpen] = useState(false);
  const [editCodeTargetSchool, setEditCodeTargetSchool] = useState<School | null>(null);
  const [editCodeInput, setEditCodeInput] = useState('');
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [copiedHandoverSchoolId, setCopiedHandoverSchoolId] = useState<string | null>(null);

  // Transfer & Legacy state
  const [newSchoolNameInput, setNewSchoolNameInput] = useState('');
  const [factoryResetModalOpen, setFactoryResetModalOpen] = useState(false);
  const [isFactoryResetting, setIsFactoryResetting] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendAction, setSuspendAction] = useState<boolean>(true);
  const [isSuspending, setIsSuspending] = useState(false);
  const [rollPinsModalOpen, setRollPinsModalOpen] = useState(false);
  const [isRollingPins, setIsRollingPins] = useState(false);

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
        res = await api.deletePasses({ all: true, schoolId: selectedSchoolId });
        setDeleteFeedback({
          type: 'success',
          message: `כל מאגר האישורים של בית ספר זה נמחק בהצלחה (${res.deletedCount} אישורים הוסרו). שאר בתי הספר נותרו ללא פגע.`,
        });
      } else if (deleteMode === 'single' && singlePassToDelete) {
        res = await api.deletePasses({ passIds: [singlePassToDelete.id], schoolId: selectedSchoolId });
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
          schoolId: selectedSchoolId,
        });
        setDeleteFeedback({
          type: 'success',
          message: `נמחקו ${res.deletedCount} אישורי שחרור בטווח התאריכים שנבחר עבור בית ספר זה.`,
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

  // Load Schools (Amar Faour)
  const loadSchools = async () => {
    try {
      const res = await api.getSchools();
      setSchools(res.schools);
      if (!selectedSchoolId) {
        setSelectedSchoolId(res.activeSchoolId || res.schools[0]?.id || 'school-main');
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  const handleSelectSchool = async (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    try {
      await api.setActiveSchoolId(schoolId);
    } catch {
      // ignore
    }
  };

  // Load History / Parent inquiry (scoped to selected school)
  const loadHistory = async (forceSpinner = false) => {
    try {
      if (forceSpinner || historyPasses.length === 0) setLoadingHistory(true);
      const res = await api.searchHistory({
        q: historyQuery.trim() || undefined,
        from: historyFromDate || undefined,
        to: historyToDate || undefined,
        className: historyClass || undefined,
        schoolId: selectedSchoolId || undefined,
      });
      setHistoryPasses(res.passes);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load Staff (scoped to selected school + admin)
  const loadStaff = async (forceSpinner = false) => {
    try {
      if (forceSpinner || staffList.length === 0) setLoadingStaff(true);
      const res = await api.getStaff();
      const filtered = selectedSchoolId
        ? res.staff.filter((s) => s.schoolId === '*' || (s.schoolId || 'school-main') === selectedSchoolId)
        : res.staff;
      setStaffList(filtered);
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
  }, [activeTab, historyFromDate, historyToDate, historyClass, selectedSchoolId, syncTick]);

  // Multi-School Management handlers (Amar Faour)
  const handleToggleSuspendSchool = async (schoolId: string, suspend: boolean) => {
    setIsPerformingSchoolAction(true);
    try {
      const res = await api.suspendSchool(schoolId, suspend);
      setDeleteFeedback({
        type: 'success',
        message: res.message,
      });
      await loadSchools();
      await loadStaff(true);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה בשינוי סטטוס המנוי',
      });
    } finally {
      setIsPerformingSchoolAction(false);
      setTargetActionSchool(null);
      setSchoolActionType(null);
    }
  };

  const handleRollSchoolPins = async (schoolId: string) => {
    setIsPerformingSchoolAction(true);
    try {
      const res = await api.rollSchoolPins(schoolId);
      setDeleteFeedback({
        type: 'success',
        message: res.message,
      });
      await loadStaff(true);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה בהגרלת קודים חדשים',
      });
    } finally {
      setIsPerformingSchoolAction(false);
      setTargetActionSchool(null);
      setSchoolActionType(null);
    }
  };

  const handleClearSchoolData = async (schoolId: string) => {
    setIsPerformingSchoolAction(true);
    try {
      const res = await api.clearSchoolData(schoolId);
      setDeleteFeedback({
        type: 'success',
        message: res.message,
      });
      await loadHistory(true);
      await loadStaff(true);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה באיפוס נתוני בית הספר',
      });
    } finally {
      setIsPerformingSchoolAction(false);
      setTargetActionSchool(null);
      setSchoolActionType(null);
    }
  };

  const handleOpenDeleteSchoolModal = (school: School) => {
    setSchoolToDelete(school);
    setDeleteSchoolModalOpen(true);
  };

  const handleConfirmDeleteSchool = async () => {
    if (!schoolToDelete) return;
    setIsPerformingSchoolAction(true);
    try {
      const res = await api.deleteSchool(schoolToDelete.id);
      setDeleteFeedback({
        type: 'success',
        message: res.message,
      });
      setDeleteSchoolModalOpen(false);
      setSchoolToDelete(null);
      const remainingSchools = await api.getSchools();
      setSchools(remainingSchools.schools);
      setSelectedSchoolId(remainingSchools.activeSchoolId);
      await loadHistory(true);
      await loadStaff(true);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה במחיקת בית הספר',
      });
    } finally {
      setIsPerformingSchoolAction(false);
    }
  };

  const handleSetSchoolStatus = async (schoolId: string, status: SchoolStatus) => {
    setIsPerformingSchoolAction(true);
    try {
      const res = await api.setSchoolStatus(schoolId, status);
      setDeleteFeedback({
        type: 'success',
        message: res.message,
      });
      await loadSchools();
      await loadStaff(true);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה בעדכון סטטוס המנוי',
      });
    } finally {
      setIsPerformingSchoolAction(false);
    }
  };

  const handleSaveActivationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCodeTargetSchool || !editCodeInput.trim()) return;
    setIsSavingCode(true);
    try {
      const res = await api.updateSchoolActivationCode(editCodeTargetSchool.id, editCodeInput.trim());
      setDeleteFeedback({
        type: 'success',
        message: res.message,
      });
      setEditCodeModalOpen(false);
      setEditCodeTargetSchool(null);
      await loadSchools();
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה בעדכון קוד ההפעלה',
      });
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleCopyWhatsAppHandover = (school: School) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const appUrl = origin + pathname;
    const code = school.activationCode || '1001';

    const coordinator = staffList.find((s) => s.schoolId === school.id && s.role === 'vice_principal');
    const coordInfo = coordinator
      ? `\n👑 *קוד כניסה אישי לאחראי/ת המערכת (${coordinator.fullName}):* *${coordinator.pinCode}*`
      : '';

    const text = `שלום רב,\nלהלן פרטי ההתחברות למערכת ״אישור לשער״ עבור בית ספר *${school.name}*:\n\n` +
      `🔗 *קישור ישיר לאפליקציה:*\n${appUrl}\n\n` +
      `🔑 *קוד הפעלה מוסדי (סודי לבית הספר):* *${code}*\n` +
      coordInfo +
      `\n\n📋 *הנחיות הפעלה לצוות (מחנכים, מורים, שומר, סגן מנהל):*\n` +
      `1. פתחו את הקישור בדפדפן הטלפון.\n` +
      `2. בכניסה הראשונה, לחצו על ״🔑 הפעלת בית ספר / קוד מוסדי״ והזינו את קוד ההפעלה: *${code}*.\n` +
      `3. לאחר ההפעלה, כל איש צוות מקליד את קוד הגישה האישי שקיבל.\n` +
      (coordinator ? `4. אחראי/ת המערכת נכנס/ת עם הקוד האישי (*${coordinator.pinCode}*) ויכול/ה להוסיף מיידית מורים, מחנכות ושומרים!\n\n` : '\n') +
      `לכל שאלה ותמיכה:\nעמאר פאעור - מנהל מערכת אישור לשער`;

    try {
      navigator.clipboard.writeText(text);
      setCopiedHandoverSchoolId(school.id);
      setDeleteFeedback({
        type: 'success',
        message: `נוסח ההודעה לוואטסאפ עבור בית ספר "${school.name}" הועתק בהצלחה! שלח אותה לאחראי בית הספר.`,
      });
      setTimeout(() => setCopiedHandoverSchoolId(null), 4000);
    } catch {
      setDeleteFeedback({
        type: 'error',
        message: 'לא ניתן היה להעתיק ישירות ללוח. אנא העתק ידנית.',
      });
    }
  };

  const handleCreateNewSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) {
      setDeleteFeedback({ type: 'error', message: 'אנא הזן את שם בית הספר' });
      return;
    }
    setIsCreatingSchool(true);
    try {
      const coordinatorFullName = `${newSchoolContactFirstName.trim()} ${newSchoolContactLastName.trim()}`.trim();
      const res = await api.createSchool({
        name: newSchoolName.trim(),
        city: newSchoolCity.trim() || undefined,
        contactFirstName: newSchoolContactFirstName.trim() || undefined,
        contactLastName: newSchoolContactLastName.trim() || undefined,
        contactRole: newSchoolContactRole === 'secretary' ? 'מזכירת בית הספר' : 'סגן מנהל / אחראי שחרורים',
        contactPin: newSchoolContactPin.trim() || undefined,
        phone: newSchoolPhone.trim() || undefined,
        activationCode: newSchoolActivationCode.trim() || undefined,
        status: newSchoolStatus,
      });

      const assignedPin = res.coordinatorPin || newSchoolContactPin;
      setDeleteFeedback({
        type: 'success',
        message: `בית הספר "${res.school.name}" נוצר בהצלחה! קוד הפעלה: ${res.school.activationCode}. נוצר אחראי מערכת${coordinatorFullName ? ` (${coordinatorFullName})` : ''} עם קוד כניסה אישי: ${assignedPin}.`,
      });
      setCreateSchoolModalOpen(false);
      setNewSchoolName('');
      setNewSchoolCity('');
      setNewSchoolContactFirstName('');
      setNewSchoolContactLastName('');
      setNewSchoolContactPin(Math.floor(3000 + Math.random() * 900).toString());
      setNewSchoolPhone('');
      setNewSchoolActivationCode(Math.floor(1000 + Math.random() * 9000).toString());
      setNewSchoolStatus('pending');
      await loadSchools();
      setSelectedSchoolId(res.school.id);
      await loadStaff(true);
      await loadHistory(true);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה ביצירת בית ספר חדש',
      });
    } finally {
      setIsCreatingSchool(false);
    }
  };

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

      const res = await api.importData(parseResult.students, classesTeachers, replaceExistingDemo, selectedSchoolId);
      setImportSuccess(
        replaceExistingDemo
          ? `המאגר הוחלף בהצלחה עבור בית הספר הנבחר! נקלטו ${res.added} תלמידים חדשים מתוך הקובץ. שאר בתי הספר נותרו ללא פגע. סה״כ בבית ספר זה: ${res.total}`
          : `הייבוא הושלם בהצלחה! ${res.added} תלמידים חדשים נוספו, ${res.updated} עודכנו. סה״כ בבית ספר זה: ${res.total}`
      );
      setParseResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadStaff(true);
      await loadHistory(true);
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
      phone: newStaffPhoneInput.trim() || undefined,
      schoolId: selectedSchoolId || 'school-main',
    };

    const updatedList = [...staffList, newMember];
    setStaffList(updatedList);
    setCreatedStaffForInvite(newMember);
    setNewStaffModal(false);
    setNewStaffName('');
    setNewStaffClass('');
    setNewStaffPin('');
    setNewStaffPhoneInput('');
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

  const handleSendStaffWhatsApp = (member: StaffMember) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const appUrl = origin + pathname;
    const currentSch = schools.find((s) => s.id === (member.schoolId || selectedSchoolId));
    const schoolName = currentSch ? currentSch.name : 'בית הספר';

    const roleHebrew =
      member.role === 'guard'
        ? 'שומר שער'
        : member.role === 'vice_principal'
        ? 'סגן מנהל / אחראי שחרורים'
        : member.role === 'admin'
        ? 'מנהל המערכת'
        : member.assignedClasses.includes('*')
        ? 'מורה מקצועי'
        : `מחנכת כיתה ${member.assignedClasses.join(', ')}`;

    const text = `שלום ${member.fullName},\nנוספת לצוות המערכת ״אישור לשער״ של *${schoolName}*.\n\n` +
      `📋 *תפקיד:* ${roleHebrew}\n` +
      `🔗 *קישור ישיר לאפליקציה:*\n${appUrl}\n\n` +
      `🔑 *קוד הגישה האישי הסודי שלך:* *${member.pinCode}*\n\n` +
      `היכנס לקישור מהטלפון, הקלד את קוד הגישה האישי שלך והתחל לעבוד מיד!\n` +
      `שמור את הקוד בסודיות.\nעבודה נעימה!`;

    try {
      navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }

    if (member.phone) {
      let clean = member.phone.replace(/\D/g, '');
      if (clean.startsWith('0')) {
        clean = '972' + clean.slice(1);
      } else if (!clean.startsWith('972')) {
        clean = '972' + clean;
      }
      window.open(`https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }

    setCopiedPinId(member.id);
    setStaffSuccess(`נפתח וואטסאפ לשליחת פרטי ההתחברות ל-${member.fullName}! הנוסח הועתק גם ללוח.`);
    setTimeout(() => {
      setCopiedPinId(null);
      setStaffSuccess(null);
    }, 4000);
  };

  // Reset to original PDF demo data
  const handleExecuteResetDemo = async () => {
    setResetting(true);
    try {
      const res = await api.resetDemo();
      setDeleteFeedback({
        type: 'success',
        message: res.message || 'המערכת אופסה לנתוני ההדגמה המקוריים',
      });
      setResetDemoModalOpen(false);
      const schRes = await api.getSchools();
      setSchools(schRes.schools);
      setSelectedSchoolId(schRes.activeSchoolId || schRes.schools[0]?.id || '');
      await loadStaff(true);
      await loadHistory(true);
      await loadAudit(true);
    } catch {
      setDeleteFeedback({
        type: 'error',
        message: 'שגיאה בשחזור נתוני הדמו',
      });
    } finally {
      setResetting(false);
    }
  };

  // Clear all demo data completely to a fresh blank slate
  const handleExecuteClearAllDemo = async () => {
    setClearingDemo(true);
    try {
      const res = await api.clearAllDemoData();
      setDeleteFeedback({
        type: 'success',
        message: res.message || 'מאגר התלמידים והאישורים אופס בהצלחה ללוח חלק ונקי!',
      });
      setClearDemoModalOpen(false);
      await loadHistory(true);
      await loadStaff(true);
      await loadAudit(true);
      await loadSchools();
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה באיפוס המאגר',
      });
    } finally {
      setClearingDemo(false);
    }
  };

  // Check if all non-admin staff are suspended
  const nonAdminStaff = staffList.filter((s) => s.role !== 'admin' && s.pinCode !== '160525');
  const isSchoolSuspended = nonAdminStaff.length > 0 && nonAdminStaff.every((s) => !s.isActive);

  // Suspend or Unsuspend all staff (Kill switch for unpaid school)
  const handleToggleSuspendAll = async (suspend: boolean) => {
    setIsSuspending(true);
    try {
      const res = await api.suspendAllStaff(suspend);
      setStaffList(res.staff);
      setDeleteFeedback({
        type: 'success',
        message: suspend
          ? 'כל חשבונות הצוות הושבתו והוקפאו מיידית! הגישה מהטלפונים שלהם נחסמה.'
          : 'גישת צוות בית הספר חודשה בהצלחה! כל אנשי הצוות יכולים להיכנס שוב.',
      });
      setSuspendModalOpen(false);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה בביצוע הפעולה',
      });
    } finally {
      setIsSuspending(false);
    }
  };

  // Emergency PIN shuffle for all staff
  const handleExecuteRollPins = async () => {
    setIsRollingPins(true);
    try {
      const res = await api.rollAllStaffPins();
      setStaffList(res.staff);
      setDeleteFeedback({
        type: 'success',
        message: 'הוגרלו קודי גישה חדשים לכל אנשי הצוות! הקודים הישנים בוטלו לחלוטין.',
      });
      setRollPinsModalOpen(false);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה בהגרלת קודים חדשים',
      });
    } finally {
      setIsRollingPins(false);
    }
  };

  // Factory reset to hand over app to a brand new school
  const handleExecuteFactoryReset = async () => {
    setIsFactoryResetting(true);
    try {
      const res = await api.factoryResetForNewSchool(newSchoolNameInput);
      setDeleteFeedback({
        type: 'success',
        message: res.message || 'המערכת אופסה לחלוטין! כל נתוני בית הספר הקודם נמחקו ומוכנה לבית הספר החדש.',
      });
      setFactoryResetModalOpen(false);
      setNewSchoolNameInput('');
      loadStaff();
      if (activeTab === 'history') loadHistory();
      if (activeTab === 'audit') loadAudit();
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'שגיאה באיפוס המערכת',
      });
    } finally {
      setIsFactoryResetting(false);
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

    const currentSchool = schools.find((s) => s.id === selectedSchoolId) || schools[0];
    const isCurrentSchoolSuspended = currentSchool?.isSuspended || false;

    return (
    <div className="pb-24 max-w-4xl mx-auto px-4 pt-4 sm:pt-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-teal-300 font-semibold tracking-wide">הנהלת בית הספר ומנהל המערכת</div>
            <h1 className="text-xl sm:text-2xl font-bold font-['Rubik'] mt-0.5">עמאר פאעור · ניהול בתי ספר ומנויים</h1>
            <p className="text-xs text-slate-300 mt-1">
              שליטה עליונה בכל בתי הספר, כרטיסיות מבודדות, קודי גישה ואישורי שער בזמן אמת
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCreateSchoolModalOpen(true)}
              className="text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>הוסף בית ספר חדש</span>
            </button>
            <button
              type="button"
              onClick={() => setClearDemoModalOpen(true)}
              className="text-xs font-bold bg-rose-600/25 hover:bg-rose-600/35 active:scale-98 text-rose-200 border border-rose-500/50 px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="מחיקת כל נתוני הדמו והאישורים ללוח חלק ונקי"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400 stroke-[2.2]" />
              <span>איפוס למאגר נקי</span>
            </button>
            <button
              type="button"
              onClick={() => setResetDemoModalOpen(true)}
              disabled={resetting}
              className="text-xs font-semibold bg-white/10 hover:bg-white/20 active:scale-98 text-slate-200 border border-white/20 px-3 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="שחזור נתוני הדמו המקוריים"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">שחזר דמו</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= MULTI-SCHOOL TABS & DROPDOWN BAR (AMAR FAOUR) ================= */}
      <div className="mb-4 bg-slate-900 text-white rounded-3xl p-3 sm:p-4 shadow-md border border-slate-800">
        {schools.length === 0 ? (
          <div className="py-6 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-teal-500/20 text-teal-300 flex items-center justify-center mx-auto border border-teal-500/30">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-['Rubik']">
                אין כרגע בתי ספר מחוברים למערכת
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                מחקת את בתי הספר או שהמאגר ריק. כרטיסיות הניהול, קוד ההפעלה, סטטוס המנוי ומחיקת הכרטיסייה יופיעו אוטומטית ברגע שתרשום בית ספר חדש.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setCreateSchoolModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black bg-teal-500 hover:bg-teal-400 active:scale-98 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-teal-500/30 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>הוסף בית ספר חדש עכשיו</span>
              </button>
              <button
                type="button"
                onClick={() => setResetDemoModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>שחזר בתי ספר לדוגמה (דמו)</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Dropdown with down arrow + status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800/80 px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                  <SchoolIcon className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <span className="text-[11px] text-teal-300 font-bold block">בית ספר פעיל המוצג כרגע בניהול:</span>
                  <span className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                    {currentSchool?.name || 'בחר בית ספר...'}
                  </span>
                </div>
              </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="school-dropdown-select" className="text-xs font-bold text-slate-300">
              רשימת בתי ספר (חץ נפתח):
            </label>
            <div className="relative">
              <select
                id="school-dropdown-select"
                value={selectedSchoolId}
                onChange={(e) => handleSelectSchool(e.target.value)}
                className="appearance-none bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border-2 border-teal-500/60 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 cursor-pointer shadow-sm transition-all"
              >
                {schools.map((sch) => {
                  let statusBadge = '🟢 מאושר';
                  if (sch.status === 'pending') statusBadge = '🟡 ממתין';
                  else if (sch.status === 'suspended' || sch.isSuspended) statusBadge = '🔴 מוקפא';
                  else if (sch.status === 'cancelled') statusBadge = '⚫ מבוטל';
                  return (
                    <option key={sch.id} value={sch.id} className="bg-slate-900 text-white py-1">
                      {sch.name} — ({statusBadge})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-teal-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Visual Tabs for one-click switching */}
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <span className="text-xs font-bold text-slate-300">
            מעבר מהיר בלחיצה בין כרטיסיות בתי הספר:
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {schools.length} בתי ספר מחוברים
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {schools.map((school) => {
            const isSelected = school.id === selectedSchoolId;
            const schStatus = school.status || (school.isSuspended ? 'suspended' : 'active');
            return (
              <button
                key={school.id}
                type="button"
                onClick={() => handleSelectSchool(school.id)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md font-black ring-2 ring-teal-300/40'
                    : 'bg-slate-800/90 text-slate-200 border-slate-700/80 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Building2 className={`w-4 h-4 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{school.name}</span>
                {schStatus === 'suspended' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                    מוקפא 🔴
                  </span>
                )}
                {schStatus === 'pending' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                    ממתין 🟡
                  </span>
                )}
                {schStatus === 'cancelled' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-700 text-slate-200">
                    מבוטל ⚫
                  </span>
                )}
                {schStatus === 'active' && (
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-emerald-400'} shrink-0`} />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setCreateSchoolModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-teal-200 border border-teal-500/40 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4 text-teal-300 stroke-[2.5]" />
            <span>הוסף בית ספר חדש</span>
          </button>
        </div>

        {/* Selected School Context, Subscription Status & Activation Code Box */}
        {currentSchool && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
            {/* Top Row: School info + The 4 Subscription Status Buttons */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-semibold">כרטיסייה פעילה:</span>
                <span className="font-extrabold text-teal-300 text-sm">{currentSchool.name}</span>
                {currentSchool.city && <span className="text-slate-400">({currentSchool.city})</span>}
                {currentSchool.contactPerson && (
                  <span className="text-slate-400 text-[11px] bg-slate-850 px-2 py-0.5 rounded-md border border-slate-750">
                    איש קשר: {currentSchool.contactPerson}
                  </span>
                )}
              </div>

              {/* 4 Subscription Buttons (מאושר, ממתין, מוקפא, מבוטל) */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 shrink-0">
                <span className="text-[11px] font-bold text-slate-400 px-2 hidden sm:inline">
                  סטטוס מנוי:
                </span>

                {/* 1. מאושר 🟢 */}
                <button
                  type="button"
                  disabled={isPerformingSchoolAction}
                  onClick={() => handleSetSchoolStatus(currentSchool.id, 'active')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    (currentSchool.status === 'active' || (!currentSchool.status && !currentSchool.isSuspended))
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/80 shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
                  }`}
                  title="מנוי מאושר ופעיל - כל הצוות עובד כרגיל"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>מאושר 🟢</span>
                </button>

                {/* 2. ממתין 🟡 */}
                <button
                  type="button"
                  disabled={isPerformingSchoolAction}
                  onClick={() => handleSetSchoolStatus(currentSchool.id, 'pending')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentSchool.status === 'pending'
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-md font-black'
                      : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                  }`}
                  title="ממתין להפעלה/תשלום ראשוני - טלפונים של צוות בית הספר ייחסמו עד אישור או הקשת קוד"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>ממתין 🟡</span>
                </button>

                {/* 3. מוקפא 🔴 */}
                <button
                  type="button"
                  disabled={isPerformingSchoolAction}
                  onClick={() => handleSetSchoolStatus(currentSchool.id, 'suspended')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    (currentSchool.status === 'suspended' || currentSchool.isSuspended)
                      ? 'bg-rose-600 text-white ring-2 ring-rose-400/80 shadow-md shadow-rose-950/50'
                      : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
                  }`}
                  title="מוקפא עקב אי-תשלום - חוסם מיידית את כל הטלפונים של בית הספר בזמן אמת!"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>מוקפא 🔴</span>
                </button>

                {/* 4. מבוטל ⚫ */}
                <button
                  type="button"
                  disabled={isPerformingSchoolAction}
                  onClick={() => handleSetSchoolStatus(currentSchool.id, 'cancelled')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentSchool.status === 'cancelled'
                      ? 'bg-slate-900 text-slate-100 ring-2 ring-slate-600 shadow-md font-black'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                  title="מנוי מבוטל לצמיתות - כניסה חסומה"
                >
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>מבוטל ⚫</span>
                </button>
              </div>
            </div>

            {/* Cancelled subscription banner with instant DELETE shortcut */}
            {currentSchool.status === 'cancelled' && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚫</span>
                  <div>
                    <strong className="text-rose-200 font-bold block text-xs">
                      מנוי בית הספר בוטל! כל המורים והשומרים חסומים לחלוטין משימוש באפליקציה.
                    </strong>
                    <span className="text-rose-300/80 text-[11px]">
                      ניתן למחוק כעת את כל הכרטיסייה וכל הנתונים לצמיתות כדי לפנות מקום.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDeleteSchoolModal(currentSchool)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md transition-all active:scale-98"
                  title="מחיקת בית הספר לצמיתות וכל נתוניו"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>מחק כרטיסייה ונתונים (DELETE)</span>
                </button>
              </div>
            )}

            {/* Bottom Row: Activation Code Box + Quick School Tools */}
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              {/* Activation Code Display & Handover */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 border border-slate-700/80 rounded-xl">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-slate-300 font-semibold">קוד הפעלה בית ספרי (סודי):</span>
                  <span className="font-mono font-black text-sm text-amber-300 tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-amber-500/30">
                    {currentSchool.activationCode || '1001'}
                  </span>
                </div>

                {/* Edit Code Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditCodeTargetSchool(currentSchool);
                    setEditCodeInput(currentSchool.activationCode || '1001');
                    setEditCodeModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  title="ערוך קוד הפעלה לבית ספר זה"
                >
                  <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                  <span>ערוך קוד</span>
                </button>

                {/* Copy WhatsApp Handover Button */}
                <button
                  type="button"
                  onClick={() => handleCopyWhatsAppHandover(currentSchool)}
                  className={`px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${
                    copiedHandoverSchoolId === currentSchool.id
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  }`}
                  title="העתק הודעה מנוסחת מוכנה לשליחה לאחראי בית הספר בוואטסאפ"
                >
                  {copiedHandoverSchoolId === currentSchool.id ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-emerald-300" />
                  )}
                  <span>
                    {copiedHandoverSchoolId === currentSchool.id
                      ? 'הועתק לוואטסאפ! ✓'
                      : '📱 העתק נוסח לוואטסאפ'}
                  </span>
                </button>
              </div>

              {/* Maintenance Tools (Roll Pins, Clear Data, Delete School) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleRollSchoolPins(currentSchool.id)}
                  className="px-2.5 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
                  title="החלפת קודי גישה לצוות בית ספר זה בלבד"
                >
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  <span>החלף קודים</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClearSchoolData(currentSchool.id)}
                  className="px-2.5 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-rose-950/60 text-rose-300 border border-rose-900/50 flex items-center gap-1 cursor-pointer"
                  title="איפוס תלמידים ואישורים של בית ספר זה בלבד"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>איפוס נתונים</span>
                </button>

                {/* Permanent Delete School Button */}
                <button
                  type="button"
                  onClick={() => handleOpenDeleteSchoolModal(currentSchool)}
                  className="px-2.5 py-1.5 rounded-xl font-bold bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-700/80 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="מחיקת כרטיסיית בית הספר לצמיתות וכל נתוניו (DELETE)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>מחק כרטיסייה (DELETE)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )}
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
          <span>הזנת תלמידי בית הספר (Excel)</span>
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

        <button
          type="button"
          onClick={() => setActiveTab('transfer')}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'transfer'
              ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm font-black'
              : 'text-purple-900 hover:text-purple-950 hover:bg-purple-50/70 font-bold'
          }`}
        >
          <Building className="w-4 h-4 text-purple-500" />
          <span>ניהול בתי ספר ומנויים</span>
          {schools.some((s) => s.isSuspended) && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
          )}
        </button>
      </div>

      {/* Current School Suspension Active Banner */}
      {isCurrentSchoolSuspended && (
        <div className="mb-5 p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-pulse">
          <div className="flex items-center gap-2.5 text-rose-950 font-bold text-xs sm:text-sm">
            <Ban className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span>שים לב: המנוי עבור ״{currentSchool?.name}״ מוקפא עקב אי-תשלום!</span>
              <p className="text-[11px] font-normal text-rose-800 mt-0.5">
                כל הצוות של בית ספר זה חסום בטלפונים שלהם. בתי ספר אחרים פועלים כרגיל לחלוטין!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggleSuspendSchool(currentSchool.id, false)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>בטל הקפאה וחדש גישה מיידית</span>
          </button>
        </div>
      )}

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
                disabled={historyPasses.length === 0}
                onClick={() => {
                  setDeleteMode('range');
                  setPurgeFromDate('');
                  setPurgeToDate(getDateOffsetString(14)); // default to older than 2 weeks
                  setDeleteModalOpen(true);
                }}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm ${
                  historyPasses.length === 0
                    ? 'bg-slate-850 text-slate-500 border border-slate-750 opacity-60 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 border border-amber-400/40 cursor-pointer'
                }`}
                title={historyPasses.length === 0 ? 'אין אישורים במאגר למחיקה' : 'מחיקה לפי טווח תאריכים'}
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>מחיקה לפי טווח תאריכים...</span>
              </button>

              {historyPasses.length === 0 ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-default transition-all"
                  title="כל האישורים נמחקו מהמאגר. כאשר ייווצרו אישורים חדשים, הכפתור יתהפך חזרה למצב מחיקה."
                >
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>הנתונים נמחקו מהמאגר ✓</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteMode('all');
                    setDeleteModalOpen(true);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 cursor-pointer"
                  title="מחיקת כל אישורי השחרור במאגר"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>מחיקת כל האישורים במערכת</span>
                </button>
              )}
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

          {/* Guidance Banner: Why file upload? How to wipe demo data and load real school? */}
          <div className="bg-gradient-to-r from-teal-50 via-cyan-50/70 to-blue-50/80 border-2 border-teal-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <FileSpreadsheet className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="space-y-3 text-xs text-slate-700 leading-relaxed flex-1">
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-teal-950 font-['Rubik']">
                    הזנת תלמידי בית הספר והחלפת נתוני הדמו
                  </h4>
                  <p className="text-slate-600 mt-1">
                    תשובות לשאלות נפוצות לגבי העלאת קבצים ומחיקת נתוני ההדגמה:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white/95 p-3.5 rounded-2xl border border-teal-100 shadow-2xs space-y-1">
                    <div className="font-bold text-teal-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black flex items-center justify-center">1</span>
                      <span>למה צריך להעלות קובץ כאן?</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      במקום להקליד ידנית מאות תלמידים אחד אחד, מעלים כאן את קובץ האקסל של בית הספר. המערכת קוראת את כל הכיתות, התלמידים והמחנכות בבת אחת ובשניות בודדות.
                    </p>
                  </div>

                  <div className="bg-white/95 p-3.5 rounded-2xl border border-teal-100 shadow-2xs space-y-1">
                    <div className="font-bold text-teal-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black flex items-center justify-center">2</span>
                      <span>איך מוחקים את נתוני הדמו ומכניסים את החדשים?</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      כל 25 התלמידים שהיו באפליקציה היו נתוני הדגמה (דמו). בעת העלאת הקובץ מסומן אוטומטית <strong>״החלפה מלאה״</strong> — הקובץ מוחק את כל נתוני הדמו ויכניס במקומם רק את תלמידי בית הספר שלך!
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setClearDemoModalOpen(true)}
                    className="text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 active:scale-98 border border-rose-300 px-3.5 py-2 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600 stroke-[2.2]" />
                    <span>רוצה לרוקן את כל נתוני הדמו ללוח חלק כבר עכשיו? לחץ לאיפוס מוחלט</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

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

              {/* Full Demo Replacement Toggle */}
              <label className="flex items-start sm:items-center gap-3 p-3.5 bg-teal-50/90 border-2 border-teal-300 rounded-2xl cursor-pointer hover:bg-teal-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={replaceExistingDemo}
                  onChange={(e) => setReplaceExistingDemo(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 mt-0.5 sm:mt-0 shrink-0"
                />
                <div className="text-xs">
                  <span className="font-bold text-teal-950 block">
                    ☑️ החלפה מלאה: מחק את כל תלמידי הדמה הקודמים והזן רק את התלמידים מקובץ זה
                  </span>
                  <span className="text-slate-600 text-[11px] block mt-0.5">
                    מומלץ ביותר! מנקה את 25 תלמידי הדוגמה הישנים, כך שבמאגר יופיעו אך ורק התלמידים האמיתיים של בית הספר שלך.
                  </span>
                </div>
              </label>

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
                            הנהלת בית הספר (מנהל)
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

                        {member.phone && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 shadow-2xs">
                            <Phone className="w-3.5 h-3.5 text-teal-600" />
                            <span className="font-mono">{member.phone}</span>
                          </div>
                        )}

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

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSendStaffWhatsApp(member)}
                        className="px-2.5 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="שלח קישור וקוד סודי ישירות לוואטסאפ של המורה/שומר"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-700" />
                        <span>📱 שלח בוואטסאפ</span>
                      </button>

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

      {/* ================= TAB 4: MULTI-SCHOOL MANAGEMENT & SUBSCRIPTIONS (AMAR FAOUR) ================= */}
      {activeTab === 'transfer' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 border-2 border-purple-800/60 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-sm">
                  <Building2 className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-500/30 text-purple-300 font-extrabold px-2.5 py-0.5 rounded-full border border-purple-500/40">
                      בלעדי למנהל המערכת: עמאר פאעור
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold font-['Rubik'] mt-1">
                    מרכז ניהול כרטיסיות בתי ספר ומנויים
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    לכל בית ספר יש כרטיסייה וסביבה מבודדת לחלוטין. פעולות הקפאת מנוי, החלפת קודים או איפוס תלמידים משפיעות אך ורק על בית הספר הספציפי, ושאר בתי הספר ממשיכים לתפקד כרגיל!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateSchoolModalOpen(true)}
                className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 active:scale-98 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>הוסף בית ספר חדש</span>
              </button>
            </div>
          </div>

          {/* Educational Multi-Tenancy Architecture Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-xs text-slate-700 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <span>איך עובדת מערכת הכרטיסיות עבור עמאר פאעור?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                <strong className="text-teal-900 font-bold block">1. בידוד מלא בין בתי ספר</strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  מורים, תלמידים ואישורים של בית ספר א׳ אינם נראים כלל בבית ספר ב׳. כל מוסד חי בסביבה נקייה משלו.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                <strong className="text-rose-900 font-bold block">2. הקפאת מנוי ללא פגיעה באחרים</strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  בית ספר שלא שילם מוקפא בלחיצה אחת. הטלפונים של המורים בו נחסמים, בעוד שאר בתי הספר ממשיכים לעבוד כרגיל!
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                <strong className="text-indigo-900 font-bold block">3. החלפת קודים ואיפוס מבודד</strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  הגרלת קודים חדשים או מחיקת תלמידים חלה רק על הכרטיסייה של בית הספר הנבחר, ללא כל סיכון לבתי ספר אחרים.
                </p>
              </div>
            </div>
          </div>

          {/* SCHOOLS LIST / CARDS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-600" />
                <span>רשימת בתי הספר המנוהלים ({schools.length})</span>
              </h4>
              <span className="text-xs text-slate-500">לחץ על כרטיסייה כדי לנהל אותה ישירות</span>
            </div>

            {schools.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3 shadow-xs">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">אין כרגע בתי ספר רשומים במערכת</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  מחקת את בתי הספר או שהמאגר ריק. לחץ על הכפתור למטה כדי להוסיף את בית הספר הראשון.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateSchoolModalOpen(true)}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>הוסף בית ספר חדש</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {schools.map((school) => {
                  const isSelected = school.id === selectedSchoolId;
                  return (
                    <div
                    key={school.id}
                    className={`rounded-3xl p-5 sm:p-6 border-2 transition-all shadow-sm ${
                      isSelected
                        ? 'bg-gradient-to-br from-white via-teal-50/20 to-teal-50/40 border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            school.isSuspended
                              ? 'bg-rose-100 text-rose-700'
                              : isSelected
                              ? 'bg-teal-500 text-slate-950 font-black'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-base sm:text-lg font-black text-slate-900 font-['Rubik']">
                              {school.name}
                            </h5>
                            {isSelected && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-500 text-slate-950 shadow-xs">
                                ⭐ כרטיסייה נבחרת כעת
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                school.isSuspended
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              {school.isSuspended ? '🔴 מנוי מוקפא (אי-תשלום)' : '🟢 מנוי פעיל ותקין'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            {school.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{school.city}</span>
                              </span>
                            )}
                            {school.contactPerson && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span>איש קשר: {school.contactPerson}</span>
                              </span>
                            )}
                            {school.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{school.phone}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Select / Switch active button */}
                      <div className="shrink-0 flex items-center gap-2">
                        {!isSelected ? (
                          <button
                            type="button"
                            onClick={() => handleSelectSchool(school.id)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>עבור לכרטיסייה זו</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-teal-800 bg-teal-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>סביבת עבודה נוכחית</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* School Specific Control Actions */}
                    <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Toggle Suspend / Freeze */}
                        <button
                          type="button"
                          onClick={() => handleToggleSuspendSchool(school.id, !school.isSuspended)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                            school.isSuspended
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                          }`}
                        >
                          {school.isSuspended ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>בטל הקפאה וחדש גישה</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5" />
                              <span>הקפא מנוי (אי-תשלום)</span>
                            </>
                          )}
                        </button>

                        {/* Roll PINs for this school only */}
                        <button
                          type="button"
                          onClick={() => handleRollSchoolPins(school.id)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="מגריל קודים חדשים לכל צוות בית ספר זה בלבד"
                        >
                          <Key className="w-3.5 h-3.5 text-blue-600" />
                          <span>החלף קודים לצוות בית ספר זה</span>
                        </button>

                        {/* Clear Data for this school only */}
                        <button
                          type="button"
                          onClick={() => handleClearSchoolData(school.id)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="מחיקת תלמידים ואישורים של בית ספר זה בלבד (משאיר בתי ספר אחרים ללא פגע)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>איפוס נתוני בית ספר זה</span>
                        </button>
                      </div>

                      {/* Permanent Delete School Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteSchoolModal(school)}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="מחיקת בית הספר לצמיתות יחד עם כל התלמידים, המורים והאישורים (DELETE)"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                        <span>מחק בית ספר וכל הנתונים לצמיתות (DELETE)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE NEW SCHOOL (AMAR FAOUR) ================= */}
      {createSchoolModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-['Rubik']">
                    הוספת כרטיסיית בית ספר חדשה
                  </h3>
                  <p className="text-xs text-slate-500">יצירת סביבה מבודדת ועצמאית לבית ספר נוסף</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateSchoolModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSchool} className="my-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  שם בית הספר <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="לדוגמה: תיכון אבן סינא / חטיבת ביניים שז״ר"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">עיר / יישוב:</label>
                <input
                  type="text"
                  value={newSchoolCity}
                  onChange={(e) => setNewSchoolCity(e.target.value)}
                  placeholder="לדוגמה: נצרת, חיפה, ראמה, עכו"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {/* Coordinator / School Contact Person Section */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/90 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      👤
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950">
                        איש קשר ואחראי מערכת בבית הספר
                      </h4>
                      <p className="text-[11px] text-indigo-700">
                        יוגדר אוטומטית כסגן מנהל / מזכירה מוסמכת שיוכלו להוסיף מורים ושומרים
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                      שם פרטי: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newSchoolContactFirstName}
                      onChange={(e) => setNewSchoolContactFirstName(e.target.value)}
                      placeholder="לדוגמה: יוסף / פאטמה"
                      className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                      שם משפחה: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newSchoolContactLastName}
                      onChange={(e) => setNewSchoolContactLastName(e.target.value)}
                      placeholder="לדוגמה: ח׳ורי / עבאס"
                      className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                      תפקיד איש הקשר:
                    </label>
                    <select
                      value={newSchoolContactRole}
                      onChange={(e) => setNewSchoolContactRole(e.target.value as 'vice_principal' | 'secretary')}
                      className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      <option value="vice_principal">סגן מנהל / אחראי שחרורים</option>
                      <option value="secretary">מזכירת בית הספר</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                      טלפון נייד (לוואטסאפ):
                    </label>
                    <input
                      type="tel"
                      value={newSchoolPhone}
                      onChange={(e) => setNewSchoolPhone(e.target.value)}
                      placeholder="לדוגמה: 050-1234567"
                      className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-medium text-slate-800"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Coordinator Personal Access PIN */}
                <div className="p-2.5 bg-white border border-indigo-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-indigo-950">
                      🔐 קוד כניסה אישי שתקבע לאחראי בית הספר:
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewSchoolContactPin(Math.floor(3000 + Math.random() * 900).toString())}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                    >
                      הגרל קוד חדש
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newSchoolContactPin}
                    onChange={(e) => setNewSchoolContactPin(e.target.value.trim())}
                    placeholder="לדוגמה: 3001"
                    className="w-full p-2 bg-indigo-50/50 border border-indigo-300 rounded-xl text-sm font-mono font-black text-indigo-950 tracking-widest text-center"
                  />
                  <p className="text-[10px] text-indigo-700">
                    זהו הקוד האישי שאיתו יוכל הסגן/מזכירה להתחבר מיד למערכת בטלפון ולהתחיל להזין מורים ושומרים.
                  </p>
                </div>
              </div>

              {/* School Activation Code Input */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-950">
                    🔑 קוד הפעלה בית ספרי סודי (שיימסר להנהלה):
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewSchoolActivationCode(Math.floor(1000 + Math.random() * 9000).toString())}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                  >
                    הגרל קוד חדש
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newSchoolActivationCode}
                  onChange={(e) => setNewSchoolActivationCode(e.target.value.trim())}
                  placeholder="לדוגמה: 4920 או 2026"
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-mono font-black text-amber-900 tracking-widest text-center"
                />
                <p className="text-[11px] text-amber-800">
                  כל מורה, שומר או סגן מנהל בבית ספר זה יצטרך להקיש קוד זה בכניסה הראשונה בטלפון שלו כדי להפעיל את המערכת.
                </p>
              </div>

              {/* Initial Subscription Status */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  סטטוס מנוי ראשוני לבית הספר:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSchoolStatus('pending')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      newSchoolStatus === 'pending'
                        ? 'bg-amber-100 border-amber-400 text-amber-900 ring-2 ring-amber-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>ממתין להפעלה 🟡</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSchoolStatus('active')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      newSchoolStatus === 'active'
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900 ring-2 ring-emerald-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>מאושר ופעיל מיידית 🟢</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-[11px] text-teal-950 space-y-1">
                <strong className="block text-teal-900 font-bold">מה יקרה לאחר היצירה?</strong>
                <p>
                  תיווצר כרטיסייה חדשה ומבודדת לחלוטין. תוכל להעתיק בלחיצה אחת נוסח לוואטסאפ עם קישור וקוד הפעלה למסירה למנהל בית הספר, ולהזין תלמידים ומורים ללא שום השפעה על בתי ספר אחרים.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateSchoolModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  ביטול
                </button>

                <button
                  type="submit"
                  disabled={isCreatingSchool}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {isCreatingSchool ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>צור סביבת בית ספר חדשה</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT ACTIVATION CODE ================= */}
      {editCodeModalOpen && editCodeTargetSchool && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-['Rubik']">
                    עריכת קוד הפעלה בית ספרי
                  </h3>
                  <p className="text-xs text-slate-500">עבור {editCodeTargetSchool.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditCodeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivationCode} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800">
                    קוד הפעלה חדש:
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditCodeInput(Math.floor(1000 + Math.random() * 9000).toString())}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                  >
                    הגרל קוד 4 ספרות
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editCodeInput}
                  onChange={(e) => setEditCodeInput(e.target.value.trim())}
                  placeholder="לדוגמה: 2026"
                  className="w-full p-3 bg-slate-50 border-2 border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl text-center text-xl font-mono font-black tracking-widest text-slate-900"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  הערה: קוד זה נמסר להנהלת בית הספר לצורך הפעלה ראשונית במכשירי הטלפון של הצוות.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditCodeModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSavingCode || !editCodeInput.trim()}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md cursor-pointer"
                >
                  {isSavingCode ? 'שומר...' : 'שמור קוד הפעלה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PERMANENT SCHOOL DELETION (DELETE) ================= */}
      {deleteSchoolModalOpen && schoolToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-rose-500 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-300">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-rose-950 font-['Rubik']">
                    מחיקת בית ספר לצמיתות (DELETE)
                  </h3>
                  <p className="text-xs text-rose-700 font-semibold">
                    ביטול מנוי מוחלט ומחיקת כל הנתונים
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteSchoolModalOpen(false);
                  setSchoolToDelete(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50/90 border border-rose-200 rounded-2xl text-xs text-rose-950 space-y-2.5">
              <div className="font-extrabold text-sm text-rose-900 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>פעולה בלתי הפיכה עבור: "{schoolToDelete.name}"</span>
              </div>
              <p className="font-medium text-rose-900 leading-relaxed">
                בעת אישור המחיקה, תתבצע מחיקה מוחלטת (DELETE) של בית הספר מכל מסכי האפליקציה:
              </p>
              <ul className="space-y-1.5 pr-2 font-semibold text-rose-900 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold shrink-0">✕</span>
                  <span><strong>חסימת כל המורים והשומרים:</strong> כל אנשי הצוות של בית ספר זה יימחקו וייחסמו לחלוטין מלהיכנס לאפליקציה בטלפונים שלהם.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold shrink-0">✕</span>
                  <span><strong>מחיקת כל התלמידים:</strong> כל מאגר התלמידים והכיתות של בית ספר זה יימחק לצמיתות.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold shrink-0">✕</span>
                  <span><strong>מחיקת היסטוריית אישורים:</strong> כל אישורי השער ודוחות היציאה של בית ספר זה יימחקו לחלוטין.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold shrink-0">✕</span>
                  <span><strong>הסרת הכרטיסייה:</strong> כרטיסיית בית הספר תימחק מתפריט הניהול שלך.</span>
                </li>
                <li className="flex items-start gap-1.5 text-emerald-800">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span><strong>הגנה על שאר בתי הספר:</strong> שאר בתי הספר שלך נשארים מבודדים ובטוחים ב-100%, ללא כל השפעה.</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isPerformingSchoolAction}
                onClick={() => {
                  setDeleteSchoolModalOpen(false);
                  setSchoolToDelete(null);
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl cursor-pointer text-xs transition-colors"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={isPerformingSchoolAction}
                onClick={handleConfirmDeleteSchool}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isPerformingSchoolAction ? 'מוחק הכל לצמיתות...' : 'כן, מחק את כל בית הספר והנתונים (DELETE)'}</span>
              </button>
            </div>
          </div>
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
                <option value="admin">🏛️ הנהלת בית הספר (מנהל מערכת)</option>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                מספר טלפון נייד (לשליחת קישור וקוד בוואטסאפ):
              </label>
              <input
                type="tel"
                value={newStaffPhoneInput}
                onChange={(e) => setNewStaffPhoneInput(e.target.value)}
                placeholder="לדוגמה: 050-1234567"
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                תוכל לשלוח הודעת וואטסאפ ישירה למורה עם קישור למערכת וקוד הכניסה שלו.
              </p>
            </div>

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
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
              >
                הוסף ושמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: IMMEDIATE WHATSAPP INVITE SENDER (ADMIN) ================= */}
      {createdStaffForInvite && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Send className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 font-['Rubik']">
                איש הצוות נוסף בהצלחה!
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                שלח כעת את פרטי ההתחברות (קישור וקוד סודי) לוואטסאפ של <strong>{createdStaffForInvite.fullName}</strong>
                {createdStaffForInvite.phone ? ` (${createdStaffForInvite.phone})` : ''}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-right text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">קוד גישה אישי:</span>
                <span className="font-mono font-black text-base text-teal-850 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {createdStaffForInvite.pinCode}
                </span>
              </div>
              {createdStaffForInvite.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">טלפון נייד:</span>
                  <span className="font-mono font-bold text-slate-800">{createdStaffForInvite.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreatedStaffForInvite(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                סגור
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSendStaffWhatsApp(createdStaffForInvite);
                  setCreatedStaffForInvite(null);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📱 שלח כעת בוואטסאפ</span>
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

      {/* Modal: Clear All Demo Data to a Clean Slate */}
      {clearDemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-['Rubik']">
                    איפוס למאגר נקי וריק
                  </h3>
                  <p className="text-xs text-slate-500">הכנת המערכת לתלמידי בית הספר האמיתיים</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClearDemoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-3.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>מה יקרה בלחיצה על איפוס זה?</span>
                </div>
                <p>
                  פעולה זו <strong>תמחק לחלוטין את 25 תלמידי הדוגמה</strong> וכל אישורי העבר, ותשאיר את המאגר כלוח חלק ונקי להזנת תלמידי בית הספר.
                </p>
              </div>

              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-teal-800">
                  <Shield className="w-4 h-4 text-teal-600" />
                  <span>חשבון המנהל שלך מוגן תמיד</span>
                </div>
                <p>
                  חשבון מנהל המערכת <strong>עמאר פאעור</strong> וקוד הגישה האישי (<strong>160525</strong>) נשמרים תמיד ללא שינוי, כך שתוכל מיד להעלות את קובץ האקסל של בית הספר שלך.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClearDemoModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                ביטול
              </button>

              <button
                type="button"
                disabled={clearingDemo}
                onClick={handleExecuteClearAllDemo}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {clearingDemo ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>אשר איפוס מוחלט</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset to PDF Demo Data */}
      {resetDemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-['Rubik']">
                    שחזור נתוני הדגמה (דמו)
                  </h3>
                  <p className="text-xs text-slate-500">שחזור 5 הכיתות ו-25 התלמידים מתיקיית הדמו</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetDemoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 text-xs text-slate-700 leading-relaxed">
              <p>
                פעולה זו תחזיר את המערכת למצב ההדגמה הראשוני עם כיתות ז1, ז2, ח1, ח2, ט1 ו-25 התלמידים לדוגמה.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetDemoModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                ביטול
              </button>

              <button
                type="button"
                disabled={resetting}
                onClick={handleExecuteResetDemo}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {resetting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>אשר שחזור דמו</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Suspend / Unsuspend All Staff */}
      {suspendModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    suspendAction ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  {suspendAction ? <Ban className="w-5 h-5 stroke-[2.5]" /> : <Unlock className="w-5 h-5 stroke-[2.5]" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-['Rubik']">
                    {suspendAction ? 'השבתת גישה והקפאת מנוי' : 'חידוש גישת הצוות'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {suspendAction ? 'חסימת כל הטלפונים של הצוות (אי-תשלום)' : 'פתיחה מחודשת של המערכת לצוות'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-3 text-xs text-slate-700 leading-relaxed">
              {suspendAction ? (
                <>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 space-y-1">
                    <strong className="block text-rose-900 font-bold">מה יקרה ברגע זה?</strong>
                    <p>
                      כל המורים, המחנכות והשומרים ייחסמו מיידית. מי שמחובר ינותק אוטומטית למסך הכניסה עם הודעה לפנות אליך (עמאר פאעור).
                    </p>
                  </div>
                  <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-950">
                    <strong className="block text-teal-900 font-bold mb-0.5">החשבון שלך מוגן</strong>
                    <p>חשבון הניהול שלך (160525) נשאר פעיל ומחובר, ותוכל לחדש את הגישה בכל רגע ברגע שיסדירו תשלום.</p>
                  </div>
                </>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-1">
                  <strong className="block text-emerald-900 font-bold">חידוש הגישה</strong>
                  <p>
                    כל אנשי הצוות יוחזרו מיידית למצב פעיל ויוכלו להיכנס כרגיל עם הקודים האישיים שלהם.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                ביטול
              </button>

              <button
                type="button"
                disabled={isSuspending}
                onClick={() => handleToggleSuspendAll(suspendAction)}
                className={`flex-1 py-3 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                  suspendAction ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSuspending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : suspendAction ? (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>אשר השבתת כל הצוות</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>אשר חידוש גישה</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Roll All Staff PINs */}
      {rollPinsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Key className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-['Rubik']">
                    הגרלת קודי גישה חדשים לכל הצוות
                  </h3>
                  <p className="text-xs text-slate-500">ביטול מיידי של כל הקודים הישנים שהיו להם</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRollPinsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 space-y-1">
                <strong className="block text-amber-900 font-bold">מה יקרה בלחיצה זו?</strong>
                <p>
                  כל מורה, מחנכת ושומר יקבלו קוד אקראי חדש בן 4 ספרות. אף איש צוות לא יוכל להיכנס יותר עם הקוד הישן שלו!
                </p>
              </div>
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-950">
                <strong className="block text-teal-900 font-bold mb-0.5">קוד הניהול שלך לא משתנה</strong>
                <p>קוד הגישה האישי שלך (160525) נשאר קבוע ללא שינוי.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRollPinsModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                ביטול
              </button>

              <button
                type="button"
                disabled={isRollingPins}
                onClick={handleExecuteRollPins}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {isRollingPins ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>אשר והגרל קודים חדשים</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Factory Reset for Complete New School Transfer */}
      {factoryResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-rose-300 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Building className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Rubik']">
                    איפוס בית ספרי מלא לקראת העברה
                  </h3>
                  <p className="text-xs text-rose-600 font-bold">מחיקת נתוני בית הספר הישן והכנה לבית הספר החדש</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFactoryResetModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-3.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 space-y-1.5">
                <div className="font-black text-sm text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>אזהרת מחיקה מוחלטת:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li>יימחקו כל התלמידים והכיתות של בית הספר הישן.</li>
                  <li>יימחקו כל אישורי השחרור וההיסטוריה.</li>
                  <li>יימחקו כל חשבונות המורים, המחנכות והשומרים הקודמים.</li>
                </ul>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-950 space-y-1">
                <strong className="block text-indigo-900 font-bold">מה קורה מיד לאחר מכן?</strong>
                <p>
                  המערכת מתרוקנת ב-100% והופכת ללוח נקי עבור בית הספר החדש. רק החשבון של <strong>עמאר פאעור (160525)</strong> נשאר.
                </p>
                <p className="font-semibold pt-1 text-indigo-800">
                  כל מה שנותר לך הוא לגשת ללשונית ״הזנת תלמידי בית הספר (Excel)״ ולהעלות את קובץ האקסל של בית הספר החדש!
                </p>
              </div>

              {newSchoolNameInput.trim() && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                  שם בית הספר החדש שייקלט: <strong className="text-indigo-950">{newSchoolNameInput.trim()}</strong>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFactoryResetModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                ביטול
              </button>

              <button
                type="button"
                disabled={isFactoryResetting}
                onClick={handleExecuteFactoryReset}
                className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-indigo-700 hover:opacity-95 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {isFactoryResetting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>אשר איפוס ומסירה לבית ספר חדש</span>
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
