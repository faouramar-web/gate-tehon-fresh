import fs from 'fs';
import path from 'path';

export interface Student {
  id: string;
  studentCode: string; // e.g. S001
  fullName: string;
  className: string;
  teacherName?: string;
  notes?: string;
}

export interface Staff {
  id: string;
  staffCode: string; // e.g. T01, G01, VP01, A01
  fullName: string;
  role: 'teacher' | 'guard' | 'vice_principal' | 'admin';
  pinCode: string; // Secret PIN for login
  assignedClasses: string[]; // e.g. ['ז1'] or ['*']
  isActive: boolean;
  phone?: string;
  schoolId?: string;
}

export interface GatePass {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  teacherId: string;
  teacherName: string;
  dateStr: string; // YYYY-MM-DD (Israel time)
  validFromTime: string; // HH:mm
  status: 'active' | 'used' | 'cancelled' | 'expired';
  createdAt: string; // ISO
  createdBy: string;
  usedAt?: string; // ISO
  usedBy?: string; // Guard name/id
  cancelledAt?: string; // ISO
  cancelledBy?: string;
  reason?: string;
  schoolId?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO
  actionType: 'PASS_CREATED' | 'PASS_USED' | 'PASS_CANCELLED' | 'STUDENTS_IMPORTED' | 'STAFF_UPDATED' | 'PIN_CHANGED' | 'RESET_DEMO' | 'PASSES_DELETED';
  actorId: string;
  actorName: string;
  actorRole: string;
  details: string;
  studentName?: string;
  className?: string;
}

export interface ServerSchool {
  id: string;
  name: string;
  city?: string;
  code?: string;
  activationCode?: string;
  status?: string;
  contactPerson?: string;
  phone?: string;
  isSuspended?: boolean;
  createdAt: string;
}

export interface DatabaseSchema {
  schools?: ServerSchool[];
  activeSchoolId?: string;
  staff: Staff[];
  students: Student[];
  passes: GatePass[];
  auditLogs: AuditLogEntry[];
  settings: {
    schoolName: string;
    lastUpdated: string;
  };
}

// Get current date string in Asia/Jerusalem timezone (YYYY-MM-DD)
export function getIsraelDateString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // outputs YYYY-MM-DD
}

// Get current time string in Asia/Jerusalem timezone (HH:mm)
export function getIsraelTimeString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date); // outputs HH:mm
}

// Robust PIN normalization: handles mobile RTL marks, Arabic/Persian digits, whitespace
export function normalizePin(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  return String(input)
    // Convert Eastern Arabic numerals ٠-٩ to 0-9
    .replace(/[\u0660-\u0669]/g, (c) => (c.charCodeAt(0) - 0x0660).toString())
    // Convert Persian numerals ۰-۹ to 0-9
    .replace(/[\u06F0-\u06F9]/g, (c) => (c.charCodeAt(0) - 0x06F0).toString())
    // Remove invisible unicode directional markers & zero width chars & spaces
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\s]/g, '')
    .trim();
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'school_gate.json');

// Exact demo data extracted from the user's provided PDF files
export const INITIAL_DEMO_DATA: DatabaseSchema = {
  settings: {
    schoolName: 'מערכת אישור לשער',
    lastUpdated: new Date().toISOString(),
  },
  schools: [],
  activeSchoolId: '',
  staff: [
    {
      id: 'staff-admin-amar',
      staffCode: 'ADMIN',
      fullName: 'עמאר פאעור (מנהל המערכת)',
      role: 'admin',
      pinCode: '160525',
      assignedClasses: ['*'],
      isActive: true,
      schoolId: '*',
    },
  ],
  students: [],
  passes: [],
  auditLogs: [],
};

class SchoolDatabase {
  private data: DatabaseSchema;
  private listeners: Array<() => void> = [];

  constructor() {
    this.ensureDirectory();
    this.data = this.loadData();
  }

  private ensureDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('Could not create data dir, running in memory:', e);
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.staff && parsed.students) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading database file, falling back to initial data:', err);
    }
    // Save initial demo data
    this.saveData(INITIAL_DEMO_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  }

  private saveData(data: DatabaseSchema) {
    try {
      this.ensureDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not write database file, data kept in memory:', e);
    }
  }

  private mutate(fn: (data: DatabaseSchema) => void) {
    fn(this.data);
    this.data.settings.lastUpdated = new Date().toISOString();
    this.saveData(this.data);
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('Listener notification error:', e);
      }
    }
  }

  // --- Read Operations ---
  public getStaffByPin(pin: string): Staff | undefined {
    const clean = normalizePin(pin);
    if (!clean) return undefined;

    // Special priority: Amar Faour sole administrator PIN 160525
    if (clean === '160525') {
      let amar = this.data.staff.find((s) => s.id === 'staff-admin-amar' || normalizePin(s.pinCode) === '160525');
      if (!amar) {
        amar = {
          id: 'staff-admin-amar',
          staffCode: 'ADMIN',
          fullName: 'עמאר פאעור (מנהל המערכת)',
          role: 'admin',
          pinCode: '160525',
          assignedClasses: ['*'],
          isActive: true,
        };
        this.data.staff.push(amar);
        this.saveData(this.data);
      } else {
        amar.pinCode = '160525';
        amar.role = 'admin';
        amar.isActive = true;
        amar.assignedClasses = ['*'];
      }
      return amar;
    }

    return this.data.staff.find(
      (s) => normalizePin(s.pinCode) === clean && s.isActive
    );
  }

  public getStaffById(id: string): Staff | undefined {
    return this.data.staff.find((s) => s.id === id);
  }

  public getAllStaff(): Staff[] {
    return this.data.staff;
  }

  public getAllStudents(): Student[] {
    return this.data.students;
  }

  public getStudentsForTeacher(assignedClasses: string[]): Student[] {
    if (!assignedClasses || assignedClasses.length === 0) return [];
    if (assignedClasses.includes('*') || assignedClasses.includes('כל הכיתות')) {
      return this.data.students;
    }
    return this.data.students.filter((s) => assignedClasses.includes(s.className));
  }

  public getPassesForToday(): GatePass[] {
    const today = getIsraelDateString();
    return this.data.passes.filter((p) => p.dateStr === today);
  }

  public getPassForStudentToday(studentId: string): GatePass | undefined {
    const today = getIsraelDateString();
    return this.data.passes.find(
      (p) => p.studentId === studentId && p.dateStr === today && (p.status === 'active' || p.status === 'used')
    );
  }

  public getAuditLogs(limit = 100): AuditLogEntry[] {
    return [...this.data.auditLogs].reverse().slice(0, limit);
  }

  public searchPassesHistory(
    query?: string,
    dateFrom?: string,
    dateTo?: string,
    className?: string,
    schoolId?: string
  ): GatePass[] {
    let list = [...this.data.passes].filter(
      (p) => p && p.id !== 'pass-hist-1' && p.id !== 'pass-hist-01' && p.id !== 'pass-hist-2' && p.id !== 'pass-hist-02' && p.studentName !== 'מרים סאלח'
    );
    if (schoolId && schoolId !== '*') {
      list = list.filter((p) => p.schoolId === schoolId);
    }
    if (className && className !== 'ALL') {
      list = list.filter((p) => p.className === className);
    }
    if (dateFrom) {
      list = list.filter((p) => p.dateStr >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((p) => p.dateStr <= dateTo);
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.studentName.toLowerCase().includes(q) ||
          p.studentCode.toLowerCase().includes(q) ||
          p.teacherName.toLowerCase().includes(q) ||
          (p.usedBy && p.usedBy.toLowerCase().includes(q)) ||
          (p.reason && p.reason.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // --- Mutate Operations ---

  public createPasses(
    studentIds: string[],
    teacher: Staff,
    validFromTime: string,
    reason?: string
  ): { created: GatePass[]; errors: string[] } {
    const today = getIsraelDateString();
    const created: GatePass[] = [];
    const errors: string[] = [];

    const hasAllAccess =
      teacher.role === 'admin' ||
      teacher.role === 'vice_principal' ||
      teacher.assignedClasses.includes('*') ||
      teacher.assignedClasses.includes('כל הכיתות');

    this.mutate((data) => {
      for (const studentId of studentIds) {
        const student = data.students.find((s) => s.id === studentId);
        if (!student) {
          errors.push(`תלמיד לא נמצא: ${studentId}`);
          continue;
        }

        // Verify teacher permission for this student's class
        if (!hasAllAccess && !teacher.assignedClasses.includes(student.className)) {
          errors.push(`אין הרשאה להנפיק אישור לתלמיד ${student.fullName} מכיתה ${student.className}`);
          continue;
        }

        // Check if student already has an active or used pass today
        const existing = data.passes.find(
          (p) => p.studentId === studentId && p.dateStr === today && p.status === 'active'
        );
        if (existing) {
          errors.push(`לתלמיד ${student.fullName} כבר יש אישור פעיל להיום`);
          continue;
        }

        const newPass: GatePass = {
          id: `pass-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          className: student.className,
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          dateStr: today,
          validFromTime: validFromTime || getIsraelTimeString(),
          status: 'active',
          createdAt: new Date().toISOString(),
          createdBy: teacher.fullName,
          reason: reason || 'יציאה באישור מחנכת',
        };

        data.passes.push(newPass);
        created.push(newPass);

        // Audit log
        data.auditLogs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          actionType: 'PASS_CREATED',
          actorId: teacher.id,
          actorName: teacher.fullName,
          actorRole: teacher.role,
          studentName: student.fullName,
          className: student.className,
          details: `הונפק אישור יציאה לשעה ${newPass.validFromTime}`,
        });
      }
    });

    return { created, errors };
  }

  public cancelPass(
    passId: string,
    actor: Staff
  ): { success: boolean; error?: string; pass?: GatePass } {
    let resultPass: GatePass | undefined;
    let errorMsg: string | undefined;

    this.mutate((data) => {
      const pass = data.passes.find((p) => p.id === passId);
      if (!pass) {
        errorMsg = 'האישור לא נמצא במערכת';
        return;
      }

      if (pass.status === 'used') {
        errorMsg = 'לא ניתן לבטל אישור שכבר נוצל (התלמיד כבר יצא)';
        return;
      }

      if (pass.status === 'cancelled') {
        errorMsg = 'האישור כבר בוטל קודם לכן';
        return;
      }

      // Check permission: teacher can cancel their own passes, admin can cancel any
      if (actor.role === 'teacher' && pass.teacherId !== actor.id) {
        errorMsg = 'מחנכת יכולה לבטל רק אישורים שהנפיקה בעצמה';
        return;
      }

      pass.status = 'cancelled';
      pass.cancelledAt = new Date().toISOString();
      pass.cancelledBy = actor.fullName;
      resultPass = pass;

      data.auditLogs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        actionType: 'PASS_CANCELLED',
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        studentName: pass.studentName,
        className: pass.className,
        details: `אישור יציאה בוטל על ידי ${actor.fullName}`,
      });
    });

    if (errorMsg) return { success: false, error: errorMsg };
    return { success: true, pass: resultPass };
  }

  public markStudentExit(
    passId: string,
    guard: Staff
  ): { success: boolean; error?: string; pass?: GatePass } {
    let resultPass: GatePass | undefined;
    let errorMsg: string | undefined;

    this.mutate((data) => {
      const pass = data.passes.find((p) => p.id === passId);
      if (!pass) {
        errorMsg = 'האישור לא נמצא במערכת';
        return;
      }

      if (pass.status === 'cancelled') {
        errorMsg = 'האישור בוטל על ידי המחנכת ולא ניתן לסמן יציאה';
        return;
      }

      if (pass.status === 'used') {
        errorMsg = `התלמיד כבר יצא מהשער (נרשם בשעה ${getIsraelTimeString(new Date(pass.usedAt!))})`;
        return;
      }

      const today = getIsraelDateString();
      if (pass.dateStr !== today) {
        errorMsg = 'האישור אינו מיועד להיום';
        return;
      }

      // Verify validFromTime
      const nowTime = getIsraelTimeString();
      if (pass.validFromTime > nowTime) {
        errorMsg = `האישור ייכנס לתוקף רק בשעה ${pass.validFromTime} (השעה כעת: ${nowTime})`;
        return;
      }

      pass.status = 'used';
      pass.usedAt = new Date().toISOString();
      pass.usedBy = guard.fullName;
      resultPass = pass;

      data.auditLogs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        actionType: 'PASS_USED',
        actorId: guard.id,
        actorName: guard.fullName,
        actorRole: guard.role,
        studentName: pass.studentName,
        className: pass.className,
        details: `יציאה אושרה בשער על ידי ${guard.fullName} בשעה ${nowTime}`,
      });
    });

    if (errorMsg) return { success: false, error: errorMsg };
    return { success: true, pass: resultPass };
  }

  public resetToDemo(): void {
    this.mutate((data) => {
      data.staff = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA.staff));
      data.students = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA.students));
      data.passes = [];
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'RESET_DEMO',
        actorId: 'admin',
        actorName: 'עמאר פאעור (מנהל המערכת)',
        actorRole: 'admin',
        details: 'איפוס מערכת לנתוני הדגמה מקוריים',
      });
    });
  }

  public clearAllSchoolData(actor: Staff): void {
    this.mutate((data) => {
      data.students = [];
      data.passes = [];
      data.schools = [];
      data.activeSchoolId = '';
      data.staff = [
        {
          id: 'staff-admin-amar',
          staffCode: 'ADMIN',
          fullName: 'עמאר פאעור (מנהל המערכת)',
          role: 'admin',
          pinCode: '160525',
          assignedClasses: ['*'],
          isActive: true,
          schoolId: '*',
        },
      ];
      data.auditLogs = [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actionType: 'RESET_DEMO',
          actorId: actor.id,
          actorName: actor.fullName,
          actorRole: actor.role,
          details: 'איפוס מלא של כל בתי הספר, התלמידים, הצוותים והאישורים ללוח חלק ונקי',
        },
      ];
    });
  }

  public importStudentsData(
    newStudents: Omit<Student, 'id'>[],
    classesTeachers: Array<{ className: string; teacherName?: string }>,
    actor: Staff,
    replaceExisting?: boolean
  ): { added: number; updated: number; total: number } {
    let added = 0;
    let updated = 0;

    this.mutate((data) => {
      if (replaceExisting) {
        data.students = [];
        data.passes = [];
      }
      // Idempotent upsert by studentCode or (fullName + className)
      for (const item of newStudents) {
        const existing = data.students.find(
          (s) =>
            (item.studentCode && s.studentCode === item.studentCode) ||
            (s.fullName.trim() === item.fullName.trim() && s.className.trim() === item.className.trim())
        );

        if (existing) {
          existing.fullName = item.fullName.trim();
          existing.className = item.className.trim();
          if (item.teacherName) existing.teacherName = item.teacherName.trim();
          if (item.notes) existing.notes = item.notes;
          updated++;
        } else {
          const newStudent: Student = {
            id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            studentCode: item.studentCode || `S${(data.students.length + 1).toString().padStart(3, '0')}`,
            fullName: item.fullName.trim(),
            className: item.className.trim(),
            teacherName: item.teacherName?.trim(),
            notes: item.notes,
          };
          data.students.push(newStudent);
          added++;
        }
      }

      // Auto link or create teacher accounts if teacher names are provided
      for (const ct of classesTeachers) {
        if (!ct.teacherName) continue;
        const teacher = data.staff.find(
          (s) => s.role === 'teacher' && s.fullName.trim() === ct.teacherName!.trim()
        );
        if (teacher) {
          if (!teacher.assignedClasses.includes(ct.className)) {
            teacher.assignedClasses.push(ct.className);
          }
        } else {
          // Create new teacher
          const codeNum = data.staff.filter((s) => s.role === 'teacher').length + 1;
          data.staff.push({
            id: `staff-t${Date.now()}`,
            staffCode: `T${codeNum.toString().padStart(2, '0')}`,
            fullName: ct.teacherName.trim(),
            role: 'teacher',
            pinCode: (1000 + codeNum).toString(),
            assignedClasses: [ct.className],
            isActive: true,
          });
        }
      }

      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'STUDENTS_IMPORTED',
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: `ייבוא תלמידים: ${added} נוספו, ${updated} עודכנו. סה״כ במערכת: ${data.students.length}`,
      });
    });

    return { added, updated, total: this.data.students.length };
  }

  public updateStaff(
    staffList: Staff[],
    actor: Staff
  ): void {
    this.mutate((data) => {
      data.staff = staffList;
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'STAFF_UPDATED',
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: `עדכון אנשי צוות וקודי גישה`,
      });
    });
  }

  public deletePasses(
    options: { all?: boolean; passIds?: string[]; fromDate?: string; toDate?: string },
    actor: Staff
  ): { deletedCount: number } {
    let count = 0;
    this.mutate((data) => {
      let toDelete: GatePass[] = [];
      if (options.all) {
        count = data.passes.length;
        data.passes = [];
      } else if (options.passIds && options.passIds.length > 0) {
        const idSet = new Set(options.passIds);
        toDelete = data.passes.filter((p) => idSet.has(p.id));
        count = toDelete.length;
        data.passes = data.passes.filter((p) => !idSet.has(p.id));
      } else if (options.fromDate || options.toDate) {
        toDelete = data.passes.filter((p) => {
          if (options.fromDate && p.dateStr < options.fromDate) return false;
          if (options.toDate && p.dateStr > options.toDate) return false;
          return true;
        });
        count = toDelete.length;
        const deleteIds = new Set(toDelete.map((p) => p.id));
        data.passes = data.passes.filter((p) => !deleteIds.has(p.id));
      }

      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'PASSES_DELETED',
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: `מחיקת ${count} אישורי יציאה מהמאגר ${options.all ? '(מחיקה כוללת)' : options.fromDate ? `(מתאריך ${options.fromDate} עד ${options.toDate || 'עכשיו'})` : ''}`,
      });
    });

    return { deletedCount: count };
  }

  public suspendAllStaff(suspend: boolean, actor: Staff): void {
    this.mutate((data) => {
      for (const s of data.staff) {
        if (s.role !== 'admin' && s.pinCode !== '160525') {
          s.isActive = !suspend;
        }
      }
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'STAFF_UPDATED',
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: suspend
          ? 'הקפאת והשבתת כל אנשי צוות בית הספר (עקב אי-תשלום / השעיית רישוי)'
          : 'חידוש והפעלת כל אנשי צוות בית הספר במערכת',
      });
    });
  }

  public rollAllStaffPins(actor: Staff): Staff[] {
    this.mutate((data) => {
      for (const s of data.staff) {
        if (s.role !== 'admin' && s.pinCode !== '160525') {
          s.pinCode = Math.floor(1000 + Math.random() * 9000).toString();
        }
      }
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'STAFF_UPDATED',
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: 'החלפה והגרלת קודי גישה חדשים לכל צוות בית הספר',
      });
    });
    return this.data.staff;
  }

  public factoryResetForNewSchool(actor: Staff, newSchoolName?: string): void {
    this.mutate((data) => {
      data.students = [];
      data.passes = [];
      // Retain solely Amar Faour Master Admin
      data.staff = [
        {
          id: 'staff-admin-amar',
          staffCode: 'ADMIN',
          fullName: 'עמאר פאעור (מנהל המערכת)',
          role: 'admin',
          pinCode: '160525',
          assignedClasses: ['*'],
          isActive: true,
        },
      ];
      data.auditLogs = [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actionType: 'RESET_DEMO',
          actorId: actor.id,
          actorName: actor.fullName,
          actorRole: actor.role,
          details: `איפוס בית ספרי מלא לקראת העברה לבית ספר חדש${newSchoolName ? `: ${newSchoolName}` : ''}`,
        },
      ];
    });
  }

  public getSchools(): { schools: ServerSchool[]; activeSchoolId: string } {
    if (!this.data.schools || !Array.isArray(this.data.schools)) {
      this.data.schools = [];
    }
    return {
      schools: this.data.schools,
      activeSchoolId: this.data.activeSchoolId || (this.data.schools.length > 0 ? this.data.schools[0].id : ''),
    };
  }

  public setActiveSchoolId(id: string): { success: boolean; activeSchoolId: string } {
    this.mutate((data) => {
      data.activeSchoolId = id;
    });
    return { success: true, activeSchoolId: id };
  }

  public createSchool(schoolData: any): { success: boolean; school: ServerSchool; coordinatorPin: string } {
    const schoolId = schoolData.id || `school-${Date.now()}`;
    const code = schoolData.code || `SCH-${(this.data.schools?.length || 0) + 1}`;
    const activationCode = schoolData.activationCode || Math.floor(1000 + Math.random() * 9000).toString();
    const vpPin = schoolData.contactPin || `${3000 + (this.data.schools?.length || 0)}`;

    const newSchool: ServerSchool = {
      id: schoolId,
      name: schoolData.name || 'בית ספר חדש',
      city: schoolData.city || '',
      code,
      activationCode,
      status: schoolData.status || 'active',
      contactPerson: schoolData.contactPerson || '',
      phone: schoolData.phone || '',
      isSuspended: false,
      createdAt: new Date().toISOString(),
    };

    this.mutate((data) => {
      if (!data.schools) data.schools = [];
      data.schools.push(newSchool);
      data.activeSchoolId = schoolId;
      data.staff.push({
        id: `staff-vp-${schoolId}`,
        staffCode: `VP0${data.schools.length}`,
        fullName: schoolData.contactPerson ? `${schoolData.contactPerson} (סגן מנהל)` : `סגן מנהל (${newSchool.name})`,
        role: 'vice_principal',
        pinCode: vpPin,
        assignedClasses: ['*'],
        isActive: true,
      });
      data.staff.push({
        id: `staff-guard-${schoolId}`,
        staffCode: `G0${data.schools.length}`,
        fullName: `שומר שער (${newSchool.name})`,
        role: 'guard',
        pinCode: `${2000 + data.schools.length}`,
        assignedClasses: [],
        isActive: true,
      });
    });

    return { success: true, school: newSchool, coordinatorPin: vpPin };
  }

  public deleteSchool(schoolId: string): { success: boolean; message: string } {
    this.mutate((data) => {
      if (data.schools) {
        data.schools = data.schools.filter((s) => s.id !== schoolId);
      }
      if (data.activeSchoolId === schoolId) {
        data.activeSchoolId = data.schools?.[0]?.id || '';
      }
    });
    return { success: true, message: 'בית הספר נמחק בהצלחה' };
  }

  public activateSchoolByCode(code: string): { success: boolean; school: ServerSchool; message: string } {
    const clean = normalizePin(code).toUpperCase();
    const schools = this.getSchools().schools;
    let school = schools.find((s) => (s.activationCode || '').toUpperCase() === clean || (s.code || '').toUpperCase() === clean);

    // Fallback 1: Match by staff personal PIN
    let staffName = '';
    if (!school) {
      const staffMember = (this.data.staff || []).find((s) => s.pinCode === clean);
      if (staffMember) {
        staffName = staffMember.fullName;
        if (staffMember.schoolId && staffMember.schoolId !== '*') {
          school = schools.find((s) => s.id === staffMember.schoolId);
        }
      }
    }

    // Fallback 2: If there is only one school in system
    if (!school && schools.length === 1) {
      school = schools[0];
    }

    if (!school) {
      throw new Error('קוד הפעלה בית ספרי שגוי. אנא ודא את הקוד או פנה לעמאר פאעור.');
    }

    this.mutate((data) => {
      data.activeSchoolId = school.id;
      const s = data.schools?.find((x) => x.id === school.id);
      if (s) {
        s.status = 'active';
        s.isSuspended = false;
      }
      // Ensure staff is active
      if (data.staff) {
        for (const st of data.staff) {
          if (st.schoolId === school.id) {
            st.isActive = true;
          }
        }
      }
    });

    const msg = staffName
      ? `זוהה קוד אישי של ${staffName}! בית הספר "${school.name}" הופעל בהצלחה במכשיר זה.`
      : `בית הספר "${school.name}" הופעל בהצלחה במכשיר זה.`;

    return { success: true, school, message: msg };
  }
}

export const db = new SchoolDatabase();
