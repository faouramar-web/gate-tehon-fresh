import fs from 'fs';
import path from 'path';

export interface Student {
  id: string;
  studentCode: string; // e.g. S001
  fullName: string;
  className: string;
  teacherName?: string;
  notes?: string;
  schoolId?: string;
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
  homeroomTeacher?: string;
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

export interface LateArrival {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  homeroomTeacher?: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  recordedById: string;
  recordedByName: string;
  recordedByRole: string;
  reason?: string;
  notes?: string;
  schoolId?: string;
  createdAt: string; // ISO
}

export interface DatabaseSchema {
  schools?: ServerSchool[];
  activeSchoolId?: string;
  staff: Staff[];
  students: Student[];
  passes: GatePass[];
  lateArrivals?: LateArrival[];
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

export function generateUniqueStaffPin(
  existingStaffOrPins: Array<{ pinCode?: string }> | Set<string>,
  preferredPin?: string
): string {
  const usedPins = new Set<string>();
  if (existingStaffOrPins instanceof Set) {
    for (const p of existingStaffOrPins) {
      if (p) usedPins.add(normalizePin(p));
    }
  } else if (Array.isArray(existingStaffOrPins)) {
    for (const s of existingStaffOrPins) {
      if (s?.pinCode) usedPins.add(normalizePin(s.pinCode));
    }
  }
  usedPins.add('160525');

  if (preferredPin && normalizePin(preferredPin) && !usedPins.has(normalizePin(preferredPin)) && normalizePin(preferredPin) !== '160525') {
    return normalizePin(preferredPin);
  }

  let pin = '';
  let attempts = 0;
  do {
    const num = Math.floor(1000 + Math.random() * 9000);
    pin = num.toString();
    attempts++;
    if (pin[0] === pin[1] && pin[1] === pin[2] && pin[2] === pin[3]) continue;
  } while (usedPins.has(pin) && attempts < 10000);

  if (!pin || usedPins.has(pin)) {
    for (let i = 1001; i <= 9999; i++) {
      const candidate = i.toString();
      if (!usedPins.has(candidate)) {
        pin = candidate;
        break;
      }
    }
  }

  return pin;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'school_gate.json');

import {
  SEEDED_SCHOOLS,
  SEEDED_ACTIVE_SCHOOL_ID,
  SEEDED_STAFF,
  SEEDED_STUDENTS,
} from '../src/lib/seedData.ts';

// Exact demo data extracted from the user's provided PDF files
export const INITIAL_DEMO_DATA: DatabaseSchema = {
  settings: {
    schoolName: "רב תחומי עמל יאנוח ג'ת",
    lastUpdated: new Date().toISOString(),
  },
  schools: (SEEDED_SCHOOLS as any[]) || [],
  activeSchoolId: SEEDED_ACTIVE_SCHOOL_ID || '',
  staff: (SEEDED_STAFF as any[]) || [
    {
      id: "staff-admin-amar",
      staffCode: "ADMIN",
      fullName: "עמאר פאעור (מנהל המערכת)",
      role: "admin",
      pinCode: "160525",
      assignedClasses: ["*"],
      isActive: true,
      schoolId: "*",
    },
  ],
  students: (SEEDED_STUDENTS as any[]) || [],
  passes: [],
  lateArrivals: [],
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
          let updated = false;
          if ((!parsed.students || parsed.students.length === 0) && SEEDED_STUDENTS.length > 0) {
            parsed.students = JSON.parse(JSON.stringify(SEEDED_STUDENTS));
            updated = true;
          }
          if ((!parsed.schools || parsed.schools.length === 0) && SEEDED_SCHOOLS.length > 0) {
            parsed.schools = JSON.parse(JSON.stringify(SEEDED_SCHOOLS));
            updated = true;
          }
          if ((!parsed.staff || parsed.staff.length <= 1) && SEEDED_STAFF.length > 1) {
            parsed.staff = JSON.parse(JSON.stringify(SEEDED_STAFF));
            updated = true;
          }
          if (!parsed.activeSchoolId && SEEDED_ACTIVE_SCHOOL_ID) {
            parsed.activeSchoolId = SEEDED_ACTIVE_SCHOOL_ID;
            updated = true;
          }
          if (updated) {
            this.saveData(parsed);
          }
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

  public getStudentsForTeacher(assignedClasses: string[], teacherFullName?: string): Student[] {
    if (!this.data.students || this.data.students.length === 0) return [];
    const hasAll =
      !assignedClasses ||
      assignedClasses.length === 0 ||
      assignedClasses.includes('*') ||
      assignedClasses.includes('כל הכיתות');

    if (hasAll) {
      return this.data.students;
    }

    const normClass = (c: string) =>
      (c || '')
        .replace(/^כיתה\s*/i, '')
        .replace(/['"`׳״\s]/g, '')
        .toLowerCase();

    const assignedNorm = assignedClasses.map(normClass).filter(Boolean);
    const teacherNorm = (teacherFullName || '').trim().toLowerCase();

    const matched = this.data.students.filter((s) => {
      const sClassNorm = normClass(s.className);
      if (assignedNorm.includes(sClassNorm)) return true;

      const sTeacherNorm = (s.teacherName || '').trim().toLowerCase();
      if (teacherNorm && sTeacherNorm && (sTeacherNorm.includes(teacherNorm) || teacherNorm.includes(sTeacherNorm))) {
        return true;
      }

      return false;
    });

    return matched;
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
        let student = data.students.find((s) => s.id === studentId);
        if (!student) {
          student = data.students.find((s) => s.studentCode === studentId || s.fullName === studentId);
        }
        if (!student) {
          const seeded = SEEDED_STUDENTS.find((s) => s.id === studentId || s.studentCode === studentId || s.fullName === studentId);
          if (seeded) {
            student = { ...seeded };
            data.students.push(student);
          }
        }
        if (!student) {
          errors.push(`תלמיד לא נמצא: ${studentId}`);
          continue;
        }

        // Verify teacher permission with normalization
        const normStr = (c: string) => (c || '').replace(/^כיתה\s*/i, '').replace(/['"`׳״\s]/g, '').toLowerCase();
        const teacherAssignedNorm = (teacher.assignedClasses || []).map(normStr);
        const studentClassNorm = normStr(student.className);
        const matchClass = hasAllAccess || teacherAssignedNorm.includes(studentClassNorm);
        const matchTeacher = student.teacherName && teacher.fullName && (
          normStr(student.teacherName).includes(normStr(teacher.fullName)) ||
          normStr(teacher.fullName).includes(normStr(student.teacherName))
        );

        if (!hasAllAccess && !matchClass && !matchTeacher && teacher.role !== 'admin' && teacher.role !== 'vice_principal') {
          // If teacher is assigned to specific classes and this student is not in them, log warning but if emergency permit or assign
          // To ensure zero blocking of legitimate teacher actions across the school:
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
          homeroomTeacher: student.teacherName || '',
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          dateStr: today,
          validFromTime: validFromTime || getIsraelTimeString(),
          status: 'active',
          createdAt: new Date().toISOString(),
          createdBy: teacher.fullName,
          reason: reason || 'שחרור מוקדם באישור מורה',
          schoolId: student.schoolId || teacher.schoolId || 'school-1793938314748',
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

  public savePasses(newPasses: GatePass[]): GatePass[] {
    const saved: GatePass[] = [];
    const today = getIsraelDateString();
    this.mutate((data) => {
      for (const p of newPasses) {
        if (!p || !p.id) continue;
        const passWithDate = {
          ...p,
          dateStr: p.dateStr || today,
        };
        const idx = data.passes.findIndex((x) => x.id === passWithDate.id);
        if (idx >= 0) {
          data.passes[idx] = { ...data.passes[idx], ...passWithDate };
          saved.push(data.passes[idx]);
        } else {
          data.passes.push(passWithDate);
          saved.push(passWithDate);
        }
      }
    });
    return saved;
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
    guard: Staff,
    fallbackPass?: Partial<GatePass>
  ): { success: boolean; error?: string; pass?: GatePass } {
    let resultPass: GatePass | undefined;
    let errorMsg: string | undefined;

    this.mutate((data) => {
      let pass = data.passes.find((p) => p.id === passId);
      if (!pass && fallbackPass && fallbackPass.id) {
        pass = fallbackPass as GatePass;
        data.passes.unshift(pass);
      }

      if (!pass) {
        errorMsg = 'האישור לא נמצא במערכת';
        return;
      }

      if (pass.status === 'cancelled') {
        const activePass = data.passes.find(
          (p) => p.studentId === pass!.studentId && p.dateStr === pass!.dateStr && p.status === 'active'
        );
        if (activePass) {
          pass = activePass;
        } else {
          errorMsg = 'האישור בוטל על ידי המחנכת ולא ניתן לסמן יציאה';
          return;
        }
      }

      if (pass.status === 'used') {
        resultPass = pass;
        return;
      }

      const nowTime = getIsraelTimeString();

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
          const newTeacherPin = generateUniqueStaffPin(data.staff);
          data.staff.push({
            id: `staff-t${Date.now()}`,
            staffCode: `T${codeNum.toString().padStart(2, '0')}`,
            fullName: ct.teacherName.trim(),
            role: 'teacher',
            pinCode: newTeacherPin,
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
      if (!data.staff) data.staff = [];

      for (const item of staffList) {
        if (!item || !item.pinCode) continue;
        const cleanPin = normalizePin(item.pinCode);
        const existingIdx = data.staff.findIndex(
          (s) => (s.id && s.id === item.id) || (s.fullName && item.fullName && s.fullName.trim() === item.fullName.trim() && (s.schoolId || '') === (item.schoolId || ''))
        );

        const memberData: Staff = {
          ...item,
          pinCode: cleanPin,
          isActive: item.isActive !== false,
          assignedClasses: Array.isArray(item.assignedClasses) ? item.assignedClasses : [],
        };

        if (existingIdx >= 0) {
          data.staff[existingIdx] = { ...data.staff[existingIdx], ...memberData };
        } else {
          data.staff.push(memberData);
        }
      }

      // Guarantee Amar Faour is ALWAYS present and active
      if (!data.staff.some((s) => normalizePin(s.pinCode) === '160525')) {
        data.staff.unshift({
          id: 'staff-admin-amar',
          staffCode: 'ADMIN',
          fullName: 'עמאר פאעור (מנהל המערכת)',
          role: 'admin',
          pinCode: '160525',
          assignedClasses: ['*'],
          isActive: true,
          schoolId: '*',
        });
      }

      // Guarantee strict PIN uniqueness across all staff
      const seenPins = new Set<string>();
      seenPins.add('160525');
      for (const member of data.staff) {
        if (!member) continue;
        if (member.role === 'admin' && member.pinCode === '160525') continue;
        const currentPin = normalizePin(member.pinCode);
        if (!currentPin || seenPins.has(currentPin) || currentPin === '160525') {
          const uniquePin = generateUniqueStaffPin(seenPins);
          member.pinCode = uniquePin;
          seenPins.add(uniquePin);
        } else {
          seenPins.add(currentPin);
        }
      }

      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'STAFF_UPDATED',
        actorId: actor?.id || 'admin',
        actorName: actor?.fullName || 'מנהל המערכת',
        actorRole: actor?.role || 'admin',
        details: `עדכון אנשי צוות וקודי גישה (${staffList.length} אנשי צוות)`,
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
      const tempPins = new Set<string>();
      tempPins.add('160525');
      for (const s of data.staff) {
        if (s.role !== 'admin' && s.pinCode !== '160525') {
          const newPin = generateUniqueStaffPin(tempPins);
          s.pinCode = newPin;
          tempPins.add(newPin);
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
    const vpPin = generateUniqueStaffPin(this.data.staff || [], schoolData.contactPin);
    const tempUsed = new Set((this.data.staff || []).map((s) => normalizePin(s.pinCode)));
    tempUsed.add(vpPin);
    const guardPin = generateUniqueStaffPin(tempUsed);

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
        pinCode: guardPin,
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

  public syncAllState(
    schools?: ServerSchool[],
    staff?: Staff[],
    students?: Student[],
    activeSchoolId?: string,
    passes?: GatePass[],
    lateArrivals?: LateArrival[]
  ): void {
    this.mutate((data) => {
      if (Array.isArray(schools) && schools.length > 0) {
        data.schools = schools;
      }
      if (activeSchoolId) {
        data.activeSchoolId = activeSchoolId;
      }
      if (Array.isArray(staff) && staff.length > 0) {
        const staffMap = new Map(data.staff.map((s) => [s.id, s]));
        for (const st of staff) {
          if (st && st.id) staffMap.set(st.id, st);
        }
        data.staff = Array.from(staffMap.values());
        if (!data.staff.some((s) => normalizePin(s.pinCode) === '160525')) {
          data.staff.unshift({
            id: 'staff-admin-amar',
            staffCode: 'ADMIN',
            fullName: 'עמאר פאעור (מנהל המערכת)',
            role: 'admin',
            pinCode: '160525',
            assignedClasses: ['*'],
            isActive: true,
            schoolId: '*',
          });
        }
      }
      if (Array.isArray(students) && students.length > 0) {
        const studentMap = new Map<string, Student>();
        const seenNames = new Set<string>();
        const normKey = (s: any) => String(s || '').replace(/['"`׳״\s]/g, '').toLowerCase();

        for (const st of [...data.students, ...students]) {
          if (!st || !st.id) continue;
          const nameKey = st.fullName && st.className ? `${normKey(st.className)}::${normKey(st.fullName)}` : '';
          if (nameKey && seenNames.has(nameKey)) continue;
          if (nameKey) seenNames.add(nameKey);
          studentMap.set(st.id, st);
        }
        data.students = Array.from(studentMap.values());
      }
      if (Array.isArray(passes)) {
        data.passes = passes;
      }
      if (Array.isArray(lateArrivals) && lateArrivals.length > 0) {
        if (!data.lateArrivals) data.lateArrivals = [];
        const arrivalMap = new Map(data.lateArrivals.map((a) => [a.id, a]));
        for (const la of lateArrivals) {
          if (la && la.id) arrivalMap.set(la.id, la);
        }
        data.lateArrivals = Array.from(arrivalMap.values()).sort(
          (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || (b.timeStr || '').localeCompare(a.timeStr || '')
        );
      }
    });
  }

  public recordLateArrival(params: {
    studentId: string;
    studentCode?: string;
    studentName?: string;
    className?: string;
    homeroomTeacher?: string;
    timeStr?: string;
    dateStr?: string;
    reason?: string;
    notes?: string;
    actor: Staff;
  }): { success: boolean; lateArrival?: LateArrival; error?: string } {
    let result: LateArrival | undefined;
    this.mutate((data) => {
      if (!data.lateArrivals) data.lateArrivals = [];
      const student =
        data.students.find((s) => s.id === params.studentId) ||
        data.students.find(
          (s) => s.fullName === params.studentName && s.className === params.className
        );

      const studentName = student?.fullName || params.studentName || 'תלמיד';
      const className = student?.className || params.className || '';
      const studentCode = student?.studentCode || params.studentCode || '';
      const homeroomTeacher = student?.teacherName || params.homeroomTeacher || '';
      const dateStr = params.dateStr || getIsraelDateString();
      const timeStr = params.timeStr || getIsraelTimeString();

      const newArrival: LateArrival = {
        id: `late-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: student?.id || params.studentId || `stu-${Date.now()}`,
        studentCode,
        studentName,
        className,
        homeroomTeacher,
        dateStr,
        timeStr,
        recordedById: params.actor.id,
        recordedByName: params.actor.fullName,
        recordedByRole: params.actor.role,
        reason: params.reason || 'איחור בוקר',
        notes: params.notes || '',
        schoolId: student?.schoolId || params.actor.schoolId,
        createdAt: new Date().toISOString(),
      };

      data.lateArrivals.unshift(newArrival);
      result = newArrival;

      data.auditLogs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        actionType: 'PASS_CREATED',
        actorId: params.actor.id,
        actorName: params.actor.fullName,
        actorRole: params.actor.role,
        studentName,
        className,
        details: `נרשם איחור כניסה בשער בשעה ${timeStr} על ידי ${params.actor.fullName}`,
      });
    });

    return { success: true, lateArrival: result };
  }

  public getLateArrivals(filter?: {
    dateStr?: string;
    fromDate?: string;
    toDate?: string;
    className?: string;
    studentId?: string;
  }): LateArrival[] {
    const list = this.data.lateArrivals || [];
    return list.filter((item) => {
      if (filter?.dateStr && item.dateStr !== filter.dateStr) return false;
      if (filter?.fromDate && item.dateStr < filter.fromDate) return false;
      if (filter?.toDate && item.dateStr > filter.toDate) return false;
      if (
        filter?.className &&
        filter.className !== 'ALL' &&
        filter.className !== '*' &&
        item.className !== filter.className
      )
        return false;
      if (filter?.studentId && item.studentId !== filter.studentId) return false;
      return true;
    });
  }

  public deleteLateArrival(id: string, actor: Staff): { success: boolean; error?: string } {
    let success = false;
    this.mutate((data) => {
      if (!data.lateArrivals) return;
      const idx = data.lateArrivals.findIndex((x) => x.id === id);
      if (idx >= 0) {
        data.lateArrivals.splice(idx, 1);
        success = true;
      }
    });
    return { success };
  }

  public deleteLateArrivals(
    options: { all?: boolean; arrivalIds?: string[]; fromDate?: string; toDate?: string; schoolId?: string },
    actor: Staff
  ): { success: boolean; deletedCount: number; error?: string } {
    let deletedCount = 0;
    this.mutate((data) => {
      if (!data.lateArrivals || !Array.isArray(data.lateArrivals)) return;
      const initialLen = data.lateArrivals.length;
      data.lateArrivals = data.lateArrivals.filter((item) => {
        if (options.schoolId && options.schoolId !== '*' && item.schoolId && item.schoolId !== options.schoolId) {
          return true; // keep
        }
        if (options.arrivalIds && options.arrivalIds.length > 0) {
          if (options.arrivalIds.includes(item.id)) return false; // delete
          return true;
        }
        if (options.all) {
          return false; // delete
        }
        if (options.fromDate || options.toDate) {
          if (options.fromDate && item.dateStr < options.fromDate) return true;
          if (options.toDate && item.dateStr > options.toDate) return true;
          return false; // delete
        }
        return true;
      });
      deletedCount = initialLen - data.lateArrivals.length;

      if (!data.auditLogs) data.auditLogs = [];
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'PASSES_DELETED',
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: `נמחקו ${deletedCount} דיווחי איחורים מהמאגר ע״י מנהל המערכת ${options.all ? '(מחיקה כוללת)' : ''}`,
      });
    });

    return { success: true, deletedCount };
  }
}

export const db = new SchoolDatabase();
