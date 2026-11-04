import { User, Student, GatePass, GuardSearchResult, StaffMember, UserRole, School } from '../types.ts';
import { db as firestoreDb } from './firebase.ts';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  deleteDoc
} from 'firebase/firestore';

// Time helpers for Asia/Jerusalem
export function getClientIsraelDateString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function getClientIsraelTimeString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-admin-amar',
    staffCode: 'ADMIN',
    fullName: 'עמאר פאעור (מנהל המערכת)',
    role: 'admin',
    pinCode: '160525',
    assignedClasses: ['*'],
    isActive: true,
  },
  {
    id: 'staff-vp01',
    staffCode: 'VP01',
    fullName: 'סגן מנהל (אחראי שחרורים)',
    role: 'vice_principal',
    pinCode: '3001',
    assignedClasses: ['*'],
    isActive: true,
  },
  {
    id: 'staff-t01',
    staffCode: 'T01',
    fullName: 'לינא ח׳ליל',
    role: 'teacher',
    pinCode: '1001',
    assignedClasses: ['ז1'],
    isActive: true,
  },
  {
    id: 'staff-t02',
    staffCode: 'T02',
    fullName: 'סוהא מנצור',
    role: 'teacher',
    pinCode: '1002',
    assignedClasses: ['ז2'],
    isActive: true,
  },
  {
    id: 'staff-t03',
    staffCode: 'T03',
    fullName: 'דלאל חביב',
    role: 'teacher',
    pinCode: '1003',
    assignedClasses: ['ח1'],
    isActive: true,
  },
  {
    id: 'staff-t04',
    staffCode: 'T04',
    fullName: 'נאדיה סרחאן',
    role: 'teacher',
    pinCode: '1004',
    assignedClasses: ['ח2'],
    isActive: true,
  },
  {
    id: 'staff-t05',
    staffCode: 'T05',
    fullName: 'רימא ג׳אבר',
    role: 'teacher',
    pinCode: '1005',
    assignedClasses: ['ט1'],
    isActive: true,
  },
  {
    id: 'staff-t06',
    staffCode: 'T06',
    fullName: 'מוחמד עלי (מורה מקצועי)',
    role: 'teacher',
    pinCode: '1010',
    assignedClasses: ['*'],
    isActive: true,
  },
  {
    id: 'staff-g01',
    staffCode: 'G01',
    fullName: 'אברהם כהן (שומר שער)',
    role: 'guard',
    pinCode: '2001',
    assignedClasses: [],
    isActive: true,
  },
  {
    id: 'staff-g02',
    staffCode: 'G02',
    fullName: 'יוסי לוי (שומר מחליף)',
    role: 'guard',
    pinCode: '2002',
    assignedClasses: [],
    isActive: true,
  },
];

const INITIAL_STUDENTS: Student[] = [
  // כיתה ז1 | לינא ח׳ליל
  { id: 's-001', studentCode: 'S001', fullName: 'אדם נאסר', className: 'ז1', teacherName: 'לינא ח׳ליל' },
  { id: 's-002', studentCode: 'S002', fullName: 'מרים סאלח', className: 'ז1', teacherName: 'לינא ח׳ליל' },
  { id: 's-003', studentCode: 'S003', fullName: 'יוסף חמדאן', className: 'ז1', teacherName: 'לינא ח׳ליל' },
  { id: 's-004', studentCode: 'S004', fullName: 'נור עבדאללה', className: 'ז1', teacherName: 'לינא ח׳ליל' },
  { id: 's-005', studentCode: 'S005', fullName: 'ליאן סעיד', className: 'ז1', teacherName: 'לינא ח׳ליל' },

  // כיתה ז2 | סוהא מנצור
  { id: 's-006', studentCode: 'S006', fullName: 'אמיר חורי', className: 'ז2', teacherName: 'סוהא מנצור' },
  { id: 's-007', studentCode: 'S007', fullName: 'תאלה חנא', className: 'ז2', teacherName: 'סוהא מנצור' },
  { id: 's-008', studentCode: 'S008', fullName: 'ראמי עיסא', className: 'ז2', teacherName: 'סוהא מנצור' },
  { id: 's-009', studentCode: 'S009', fullName: 'דינה סלים', className: 'ז2', teacherName: 'סוהא מנצור' },
  { id: 's-010', studentCode: 'S010', fullName: 'סאמר עבוד', className: 'ז2', teacherName: 'סוהא מנצור' },

  // כיתה ח1 | דלאל חביב
  { id: 's-011', studentCode: 'S011', fullName: 'רים זידאן', className: 'ח1', teacherName: 'דלאל חביב' },
  { id: 's-012', studentCode: 'S012', fullName: 'איאד חלבי', className: 'ח1', teacherName: 'דלאל חביב' },
  { id: 's-013', studentCode: 'S013', fullName: 'סלמא עזאם', className: 'ח1', teacherName: 'דלאל חביב' },
  { id: 's-014', studentCode: 'S014', fullName: 'נדים שאהין', className: 'ח1', teacherName: 'דלאל חביב' },
  { id: 's-015', studentCode: 'S015', fullName: 'מאיה יעקוב', className: 'ח1', teacherName: 'דלאל חביב' },

  // כיתה ח2 | נאדיה סרחאן
  { id: 's-016', studentCode: 'S016', fullName: 'האני ח׳טיב', className: 'ח2', teacherName: 'נאדיה סרחאן' },
  { id: 's-017', studentCode: 'S017', fullName: 'ליאן חסן', className: 'ח2', teacherName: 'נאדיה סרחאן' },
  { id: 's-018', studentCode: 'S018', fullName: 'אמל דאהר', className: 'ח2', teacherName: 'נאדיה סרחאן' },
  { id: 's-019', studentCode: 'S019', fullName: 'כרים עלי', className: 'ח2', teacherName: 'נאדיה סרחאן' },
  { id: 's-020', studentCode: 'S020', fullName: 'נור פארס', className: 'ח2', teacherName: 'נאדיה סרחאן' },

  // כיתה ט1 | רימא ג׳אבר
  { id: 's-021', studentCode: 'S021', fullName: 'לין סעד', className: 'ט1', teacherName: 'רימא ג׳אבר' },
  { id: 's-022', studentCode: 'S022', fullName: 'מאלכ איברהים', className: 'ט1', teacherName: 'רימא ג׳אבר' },
  { id: 's-023', studentCode: 'S023', fullName: 'ג׳נא עודה', className: 'ט1', teacherName: 'רימא ג׳אבר' },
  { id: 's-024', studentCode: 'S024', fullName: 'אדם מנסור', className: 'ט1', teacherName: 'רימא ג׳אבר' },
  { id: 's-025', studentCode: 'S025', fullName: 'סוהיל סלאמה', className: 'ט1', teacherName: 'רימא ג׳אבר' },
];

const INITIAL_PASSES: GatePass[] = [
  {
    id: 'pass-hist-1',
    studentId: 's-002',
    studentCode: 'S002',
    studentName: 'מרים סאלח',
    className: 'ז1',
    homeroomTeacher: 'לינא ח׳ליל',
    teacherId: 'staff-t01',
    teacherName: 'לינא ח׳ליל',
    dateStr: getClientIsraelDateString(),
    validFromTime: '11:30',
    status: 'used',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    createdBy: 'לינא ח׳ליל',
    usedAt: new Date(Date.now() - 1800000).toISOString(),
    usedBy: 'אברהם כהן (שומר שער)',
    reason: 'שחרור מוקדם באישור הורים',
  },
];

export const INITIAL_SCHOOLS: School[] = [
  {
    id: 'school-main',
    name: 'בית ספר מקיף (סניף ראשי)',
    city: 'ראמה / מחוז צפון',
    code: 'SCH-01',
    contactPerson: 'עמאר פאעור',
    phone: '050-1234567',
    isSuspended: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'school-ibnsina',
    name: 'תיכון אבן סינא',
    city: 'נצרת / צפון',
    code: 'SCH-02',
    contactPerson: 'סגן מנהל אחראי',
    phone: '052-7654321',
    isSuspended: false,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

// Storage keys
const STORAGE_KEY_SCHOOLS = 'gatepass_client_schools_v3';
const STORAGE_KEY_ACTIVE_SCHOOL = 'gatepass_client_active_school_id_v3';
const STORAGE_KEY_STAFF = 'gatepass_client_staff_v2';
const STORAGE_KEY_STUDENTS = 'gatepass_client_students_v2';
const STORAGE_KEY_PASSES = 'gatepass_client_passes_v2';
const STORAGE_KEY_SESSION = 'gatepass_client_session_v2';

// BroadcastChannel for cross-tab live synchronization on static host (GitHub Pages)
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel('gatepass_client_live_sync');
  } catch {
    // ignore
  }
}

class ClientStorageEngine {
  private schools: School[];
  private activeSchoolId: string;
  private staff: StaffMember[];
  private students: Student[];
  private passes: GatePass[];
  private listeners: Array<() => void> = [];

  constructor() {
    this.schools = this.load(STORAGE_KEY_SCHOOLS, INITIAL_SCHOOLS);
    if (!this.schools || this.schools.length === 0) {
      this.schools = JSON.parse(JSON.stringify(INITIAL_SCHOOLS));
    }
    this.activeSchoolId = this.load(STORAGE_KEY_ACTIVE_SCHOOL, this.schools[0]?.id || 'school-main');
    this.staff = this.load(STORAGE_KEY_STAFF, INITIAL_STAFF);
    this.students = this.load(STORAGE_KEY_STUDENTS, INITIAL_STUDENTS);
    this.passes = this.load(STORAGE_KEY_PASSES, INITIAL_PASSES);
    this.ensureSchoolIntegrity();
    this.ensureEssentialStaff();

    // Listen for storage events & broadcast messages across tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (
          e.key === STORAGE_KEY_PASSES ||
          e.key === STORAGE_KEY_STAFF ||
          e.key === STORAGE_KEY_STUDENTS ||
          e.key === STORAGE_KEY_SCHOOLS ||
          e.key === STORAGE_KEY_ACTIVE_SCHOOL
        ) {
          this.reloadFromStorage();
          this.notify();
        }
      });

      if (syncChannel) {
        syncChannel.onmessage = () => {
          this.reloadFromStorage();
          this.notify();
        };
      }

      // Realtime listener with Firestore if online & available
      try {
        const passesRef = collection(firestoreDb, 'gatepasses');
        const q = query(passesRef, orderBy('createdAt', 'desc'), limit(50));
        onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const remotePasses: GatePass[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data() as GatePass;
                if (data && data.id) remotePasses.push(data);
              });
              if (remotePasses.length > 0) {
                // Merge remote passes into local passes
                const existingMap = new Map(this.passes.map((p) => [p.id, p]));
                for (const rp of remotePasses) {
                  existingMap.set(rp.id, rp);
                }
                this.passes = Array.from(existingMap.values()).sort((a, b) =>
                  b.createdAt.localeCompare(a.createdAt)
                );
                this.save(STORAGE_KEY_PASSES, this.passes);
                this.notify();
              }
            }
          },
          () => {
            // Firestore not ready or offline - works seamlessly from localStorage
          }
        );
      } catch {
        // ignore
      }
    }
  }

  private load<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private save<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  private reloadFromStorage() {
    this.schools = this.load(STORAGE_KEY_SCHOOLS, INITIAL_SCHOOLS);
    if (!this.schools || this.schools.length === 0) {
      this.schools = JSON.parse(JSON.stringify(INITIAL_SCHOOLS));
    }
    this.activeSchoolId = this.load(STORAGE_KEY_ACTIVE_SCHOOL, this.schools[0]?.id || 'school-main');
    this.staff = this.load(STORAGE_KEY_STAFF, INITIAL_STAFF);
    this.students = this.load(STORAGE_KEY_STUDENTS, INITIAL_STUDENTS);
    this.passes = this.load(STORAGE_KEY_PASSES, INITIAL_PASSES);
    this.ensureSchoolIntegrity();
    this.ensureEssentialStaff();
  }

  private ensureSchoolIntegrity() {
    let changed = false;
    if (!this.schools || this.schools.length === 0) {
      this.schools = JSON.parse(JSON.stringify(INITIAL_SCHOOLS));
      changed = true;
    }

    const defaultSchoolId = this.schools[0]?.id || 'school-main';

    // Assign default schoolId to any legacy items
    for (const student of this.students) {
      if (!student.schoolId) {
        student.schoolId = defaultSchoolId;
        changed = true;
      }
    }

    for (const pass of this.passes) {
      if (!pass.schoolId) {
        pass.schoolId = defaultSchoolId;
        changed = true;
      }
    }

    for (const member of this.staff) {
      if (!member.schoolId) {
        member.schoolId = member.role === 'admin' || member.pinCode === '160525' ? '*' : defaultSchoolId;
        changed = true;
      }
    }

    if (!this.schools.some((s) => s.id === this.activeSchoolId)) {
      this.activeSchoolId = defaultSchoolId;
      changed = true;
    }

    if (changed) {
      this.save(STORAGE_KEY_SCHOOLS, this.schools);
      this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
      this.save(STORAGE_KEY_STUDENTS, this.students);
      this.save(STORAGE_KEY_PASSES, this.passes);
      this.save(STORAGE_KEY_STAFF, this.staff);
    }
  }

  private ensureEssentialStaff() {
    let changed = false;
    for (const initStaff of INITIAL_STAFF) {
      const exists = this.staff.some(
        (s) => s.pinCode === initStaff.pinCode || s.id === initStaff.id
      );
      if (!exists) {
        this.staff.push({
          ...initStaff,
          schoolId: initStaff.role === 'admin' ? '*' : 'school-main',
        });
        changed = true;
      }
    }
    // Double check Amar Faour is active and has pin 160525
    const amar = this.staff.find((s) => s.pinCode === '160525');
    if (!amar) {
      this.staff.unshift({
        id: 'staff-admin-amar',
        staffCode: 'ADMIN',
        fullName: 'עמאר פאעור (מנהל המערכת)',
        role: 'admin',
        pinCode: '160525',
        assignedClasses: ['*'],
        isActive: true,
        schoolId: '*',
      });
      changed = true;
    } else {
      amar.isActive = true;
      amar.schoolId = '*';
    }

    if (changed) {
      this.save(STORAGE_KEY_STAFF, this.staff);
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore
      }
    });
  }

  private broadcastChange() {
    this.save(STORAGE_KEY_SCHOOLS, this.schools);
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.notify();
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'UPDATE', timestamp: Date.now() });
      } catch {
        // ignore
      }
    }
  }

  // --- Multi-School Architecture (Amar Faour) ---
  public getSchools(): { schools: School[]; activeSchoolId: string } {
    return {
      schools: [...this.schools],
      activeSchoolId: this.activeSchoolId,
    };
  }

  public getActiveSchoolId(): string {
    return this.activeSchoolId;
  }

  public setActiveSchoolId(schoolId: string): { success: boolean; activeSchoolId: string } {
    const school = this.schools.find((s) => s.id === schoolId);
    if (!school) {
      throw new Error(`בית ספר לא נמצא במערכת: ${schoolId}`);
    }
    this.activeSchoolId = schoolId;
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    this.broadcastChange();
    return { success: true, activeSchoolId: this.activeSchoolId };
  }

  public createSchool(data: {
    name: string;
    city?: string;
    code?: string;
    contactPerson?: string;
    phone?: string;
  }): { success: boolean; school: School } {
    if (!data.name || !data.name.trim()) {
      throw new Error('שם בית הספר הינו שדה חובה');
    }

    const schoolId = `school-${Date.now()}`;
    const newSchool: School = {
      id: schoolId,
      name: data.name.trim(),
      city: data.city?.trim() || '',
      code: data.code?.trim() || `SCH-${(this.schools.length + 1).toString().padStart(2, '0')}`,
      contactPerson: data.contactPerson?.trim() || '',
      phone: data.phone?.trim() || '',
      isSuspended: false,
      createdAt: new Date().toISOString(),
    };

    this.schools.push(newSchool);

    // Automatically create a default Vice Principal & Guard for the new school so it is immediately operational
    const vpPin = `${3000 + this.schools.length}`;
    const guardPin = `${2000 + this.schools.length}`;

    this.staff.push(
      {
        id: `staff-vp-${schoolId}`,
        staffCode: `VP0${this.schools.length}`,
        fullName: `סגן מנהל (${newSchool.name})`,
        role: 'vice_principal',
        pinCode: vpPin,
        assignedClasses: ['*'],
        isActive: true,
        schoolId: schoolId,
      },
      {
        id: `staff-guard-${schoolId}`,
        staffCode: `G0${this.schools.length}`,
        fullName: `שומר שער (${newSchool.name})`,
        role: 'guard',
        pinCode: guardPin,
        assignedClasses: [],
        isActive: true,
        schoolId: schoolId,
      }
    );

    this.activeSchoolId = schoolId;
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    this.broadcastChange();
    return { success: true, school: newSchool };
  }

  public updateSchool(schoolId: string, data: Partial<School>): { success: boolean; school: School } {
    const school = this.schools.find((s) => s.id === schoolId);
    if (!school) {
      throw new Error(`בית ספר לא נמצא: ${schoolId}`);
    }
    if (data.name !== undefined) school.name = data.name.trim();
    if (data.city !== undefined) school.city = data.city.trim();
    if (data.code !== undefined) school.code = data.code.trim();
    if (data.contactPerson !== undefined) school.contactPerson = data.contactPerson.trim();
    if (data.phone !== undefined) school.phone = data.phone.trim();
    if (data.isSuspended !== undefined) school.isSuspended = data.isSuspended;

    this.broadcastChange();
    return { success: true, school };
  }

  public deleteSchool(schoolId: string): { success: boolean; message: string } {
    if (this.schools.length <= 1) {
      throw new Error('לא ניתן למחוק את בית הספר היחיד במערכת. צור בית ספר אחר תחילה.');
    }
    const target = this.schools.find((s) => s.id === schoolId);
    if (!target) {
      throw new Error('בית הספר המבוקש למחיקה לא נמצא');
    }

    // Delete school
    this.schools = this.schools.filter((s) => s.id !== schoolId);

    // Delete isolated data of THIS school only (leave other schools 100% untouched!)
    this.students = this.students.filter((s) => s.schoolId !== schoolId);
    this.passes = this.passes.filter((p) => p.schoolId !== schoolId);
    this.staff = this.staff.filter((m) => m.schoolId !== schoolId || m.pinCode === '160525');

    if (this.activeSchoolId === schoolId) {
      this.activeSchoolId = this.schools[0]?.id || 'school-main';
    }

    this.broadcastChange();
    return {
      success: true,
      message: `בית הספר "${target.name}" נמחק בהצלחה יחד עם נתוניו. שאר בתי הספר פועלים כרגיל ללא פגיעה.`,
    };
  }

  public suspendSchool(schoolId: string, suspend: boolean): { success: boolean; school: School; message: string } {
    const school = this.schools.find((s) => s.id === schoolId);
    if (!school) {
      throw new Error('בית ספר לא נמצא');
    }

    school.isSuspended = suspend;

    // Suspend/unsuspend staff belonging to this school only
    for (const member of this.staff) {
      if (member.schoolId === schoolId && member.pinCode !== '160525' && member.role !== 'admin') {
        member.isActive = !suspend;
      }
    }

    this.broadcastChange();
    return {
      success: true,
      school,
      message: suspend
        ? `המנוי עבור "${school.name}" הוקפא עקב אי-תשלום! גישת הצוות בבית ספר זה נחסמה לחלוטין. בתי ספר אחרים פועלים כרגיל.`
        : `ההקפאה בוטלה עבור "${school.name}"! גישת צוות בית הספר חודשה בהצלחה.`,
    };
  }

  public rollSchoolPins(schoolId: string): { success: boolean; count: number; message: string } {
    const school = this.schools.find((s) => s.id === schoolId);
    const schoolName = school?.name || 'בית הספר';

    let count = 0;
    for (const member of this.staff) {
      if (member.schoolId === schoolId && member.pinCode !== '160525' && member.role !== 'admin') {
        member.pinCode = Math.floor(1000 + Math.random() * 9000).toString();
        count++;
      }
    }

    this.broadcastChange();
    return {
      success: true,
      count,
      message: `הוגרלו קודים סודיים חדשים עבור ${count} אנשי צוות ב"${schoolName}". שאר בתי הספר לא הושפעו!`,
    };
  }

  public clearSchoolData(schoolId: string): { success: boolean; message: string } {
    const school = this.schools.find((s) => s.id === schoolId);
    const schoolName = school?.name || 'בית הספר';

    // Remove only students and passes belonging to this school!
    const studentsBefore = this.students.length;
    this.students = this.students.filter((s) => s.schoolId !== schoolId);
    const deletedStudents = studentsBefore - this.students.length;

    const passesBefore = this.passes.length;
    this.passes = this.passes.filter((p) => p.schoolId !== schoolId);
    const deletedPasses = passesBefore - this.passes.length;

    this.broadcastChange();
    return {
      success: true,
      message: `מאגר התלמידים (${deletedStudents}) והאישורים (${deletedPasses}) של "${schoolName}" אופס ללוח נקי! שאר בתי הספר לא נפגעו כלל.`,
    };
  }

  // Normalize PIN
  public normalizePin(input: string | number | undefined | null): string {
    if (!input) return '';
    return String(input)
      .replace(/[\u0660-\u0669]/g, (c) => (c.charCodeAt(0) - 0x0660).toString())
      .replace(/[\u06F0-\u06F9]/g, (c) => (c.charCodeAt(0) - 0x06F0).toString())
      .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\s]/g, '')
      .trim();
  }

  // Get permanent homeroom teacher for a given class
  public getHomeroomForClass(className: string): string {
    const student = this.students.find((s) => s.className === className && s.teacherName);
    if (student?.teacherName) return student.teacherName;
    const homeroomMap: Record<string, string> = {
      'ז1': 'לינא ח׳ליל',
      'ז2': 'סוהא מנצור',
      'ח1': 'דלאל חביב',
      'ח2': 'נאדיה סרחאן',
      'ט1': 'רימא ג׳אבר',
    };
    return homeroomMap[className] || 'מחנכת כיתה';
  }

  // --- Auth ---
  public login(pinCode: string, targetSchoolId?: string): { user: User; token: string } {
    const clean = this.normalizePin(pinCode);
    if (!clean) {
      throw new Error('אנא הקלד קוד גישה אישי');
    }

    // Direct guaranteed check for Amar Faour (PIN: 160525) - Super Admin across ALL schools
    if (clean === '160525') {
      const activeSchool = this.schools.find((s) => s.id === (targetSchoolId || this.activeSchoolId)) || this.schools[0];
      const user: User = {
        id: 'staff-admin-amar',
        staffCode: 'ADMIN',
        fullName: 'עמאר פאעור (מנהל המערכת)',
        role: 'admin',
        assignedClasses: ['*'],
        schoolId: '*',
        schoolName: activeSchool ? activeSchool.name : 'מנהל כל בתי הספר',
      };
      const token = `client_tok_${Date.now()}_admin`;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
      }
      return { user, token };
    }

    // Find staff member
    let member: StaffMember | undefined;
    if (targetSchoolId) {
      member = this.staff.find((s) => s.pinCode === clean && s.schoolId === targetSchoolId);
    }
    if (!member) {
      member = this.staff.find((s) => s.pinCode === clean);
    }

    if (!member) {
      // Fallback check in INITIAL_STAFF
      member = INITIAL_STAFF.find((s) => s.pinCode === clean);
    }

    if (!member) {
      throw new Error('קוד אישי שגוי. אנא נסה שוב או פנה למנהל המערכת.');
    }

    const schoolId = member.schoolId || this.activeSchoolId || 'school-main';
    const school = this.schools.find((s) => s.id === schoolId);

    // Check if the school is suspended (Lockout for non-payment)
    if (school && school.isSuspended) {
      throw new Error('המערכת הושעתה ע״י מנהל המערכת (עמאר פאעור). לחידוש הגישה יש לפנות לעמאר פאעור.');
    }

    if (!member.isActive) {
      throw new Error('חשבון זה הושבת ע״י מנהל המערכת.');
    }

    const user: User = {
      id: member.id,
      staffCode: member.staffCode,
      fullName: member.fullName,
      role: member.role,
      assignedClasses: member.assignedClasses,
      schoolId: schoolId,
      schoolName: school?.name || 'בית ספר מקיף',
    };

    const token = `client_tok_${Date.now()}_${member.id}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    }
    return { user, token };
  }

  public getMe(): { user: User } {
    if (typeof localStorage !== 'undefined') {
      const sess = localStorage.getItem(STORAGE_KEY_SESSION);
      if (sess) {
        try {
          const user = JSON.parse(sess) as User;
          if (user.role !== 'admin') {
            const member = this.staff.find((s) => s.id === user.id);
            if (member && !member.isActive) {
              localStorage.removeItem(STORAGE_KEY_SESSION);
              throw new Error('גישת בית הספר למערכת הושעתה ע״י מנהל המערכת (עמאר פאעור). יש לפנות לעמאר פאעור.');
            }
          }
          return { user };
        } catch (e: any) {
          localStorage.removeItem(STORAGE_KEY_SESSION);
          throw new Error(e.message || 'חסרה הרשאת גישה. אנא היכנס עם קוד אישי.');
        }
      }
    }
    throw new Error('חסרה הרשאת גישה. אנא היכנס עם קוד אישי.');
  }

  public logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  }

  // --- Teacher ---
  public getTeacherClasses(user: User): {
    assignedClasses: string[];
    teacherName: string;
    students: Student[];
    today: string;
    currentTime: string;
  } {
    const isSuper = user.role === 'admin' || user.role === 'vice_principal';
    const hasAll = isSuper || user.assignedClasses.includes('*') || user.assignedClasses.includes('כל הכיתות');

    const schoolScope = user.schoolId && user.schoolId !== '*' ? user.schoolId : null;

    let students = schoolScope
      ? this.students.filter((s) => (s.schoolId || 'school-main') === schoolScope)
      : this.students;

    if (!hasAll) {
      students = students.filter((s) => user.assignedClasses.includes(s.className));
    }

    let classes = Array.from(new Set(students.map((s) => s.className))).sort();
    if (!hasAll) {
      classes = user.assignedClasses;
    }

    const today = getClientIsraelDateString();
    const todayPasses = this.passes.filter((p) => {
      if (p.dateStr !== today) return false;
      if (schoolScope && (p.schoolId || 'school-main') !== schoolScope) return false;
      return true;
    });
    const passByStudent = new Map(todayPasses.map((p) => [p.studentId, p]));

    const enriched = students.map((s) => ({
      ...s,
      currentPass: passByStudent.get(s.id) || null,
    }));

    return {
      assignedClasses: classes,
      teacherName: user.fullName,
      students: enriched,
      today,
      currentTime: getClientIsraelTimeString(),
    };
  }

  public getTeacherPasses(user: User): { passes: GatePass[]; currentTime: string } {
    const today = getClientIsraelDateString();
    const isSuper = user.role === 'admin' || user.role === 'vice_principal';
    const schoolScope = user.schoolId && user.schoolId !== '*' ? user.schoolId : null;

    const passes = this.passes.filter((p) => {
      if (p.dateStr !== today) return false;
      if (schoolScope && (p.schoolId || 'school-main') !== schoolScope) return false;
      if (isSuper || user.assignedClasses.includes('*')) return true;
      return p.teacherId === user.id || user.assignedClasses.includes(p.className);
    });

    return {
      passes: [...passes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      currentTime: getClientIsraelTimeString(),
    };
  }

  public createPasses(
    user: User,
    studentIds: string[],
    validFromTime: string,
    reason?: string
  ): { success: boolean; createdCount: number; created: GatePass[]; errors: string[] } {
    const today = getClientIsraelDateString();
    const effectiveTime = validFromTime || getClientIsraelTimeString();
    const created: GatePass[] = [];
    const errors: string[] = [];

    const effectiveSchoolId = user.schoolId && user.schoolId !== '*' ? user.schoolId : (this.activeSchoolId || 'school-main');

    for (const sid of studentIds) {
      const student = this.students.find((s) => s.id === sid);
      if (!student) {
        errors.push(`תלמיד לא נמצא: ${sid}`);
        continue;
      }

      // Check if already has pass today
      const existing = this.passes.find(
        (p) => p.studentId === sid && p.dateStr === today && (p.status === 'active' || p.status === 'used')
      );
      if (existing) {
        errors.push(`לתלמיד/ה ${student.fullName} כבר יש אישור פעיל להיום`);
        continue;
      }

      const homeroom = student.teacherName || this.getHomeroomForClass(student.className);

      const pass: GatePass = {
        id: `pass-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        className: student.className,
        homeroomTeacher: homeroom,
        teacherId: user.id,
        teacherName: user.fullName,
        dateStr: today,
        validFromTime: effectiveTime,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: user.fullName,
        reason: reason || 'שחרור מוקדם באישור הורים',
        schoolId: student.schoolId || effectiveSchoolId,
      };

      this.passes.unshift(pass);
      created.push(pass);

      // Async push to Firestore if online
      try {
        setDoc(doc(firestoreDb, 'gatepasses', pass.id), pass).catch(() => {});
      } catch {
        // ignore
      }
    }

    this.broadcastChange();
    return { success: true, createdCount: created.length, created, errors };
  }

  public cancelPass(user: User, passId: string): { success: boolean; pass: GatePass } {
    const pass = this.passes.find((p) => p.id === passId);
    if (!pass) {
      throw new Error('אישור שחרור לא נמצא');
    }
    if (pass.status === 'used') {
      throw new Error('התלמיד כבר יצא מהשער, לא ניתן לבטל אישור זה');
    }

    pass.status = 'cancelled';
    pass.cancelledAt = new Date().toISOString();
    pass.cancelledBy = user.fullName;

    try {
      setDoc(doc(firestoreDb, 'gatepasses', pass.id), pass).catch(() => {});
    } catch {
      // ignore
    }

    this.broadcastChange();
    return { success: true, pass };
  }

  // --- Guard ---
  public getActivePasses(): {
    activePasses: (GatePass & { isNowValid: boolean })[];
    recentExits: GatePass[];
    currentTime: string;
    totalActive: number;
    totalExitedToday: number;
  } {
    const today = getClientIsraelDateString();
    const nowTime = getClientIsraelTimeString();

    const todayPasses = this.passes.filter((p) => p.dateStr === today);
    const activePasses = todayPasses
      .filter((p) => p.status === 'active')
      .map((p) => ({
        ...p,
        isNowValid: p.validFromTime <= nowTime,
      }));

    const recentExits = todayPasses
      .filter((p) => p.status === 'used')
      .sort((a, b) => (b.usedAt || '').localeCompare(a.usedAt || ''))
      .slice(0, 10);

    return {
      activePasses,
      recentExits,
      currentTime: nowTime,
      totalActive: activePasses.length,
      totalExitedToday: todayPasses.filter((p) => p.status === 'used').length,
    };
  }

  public searchGuard(queryStr = ''): { results: GuardSearchResult[]; currentTime: string } {
    const q = queryStr.trim().toLowerCase();
    const today = getClientIsraelDateString();
    const nowTime = getClientIsraelTimeString();

    const todayPasses = this.passes.filter((p) => p.dateStr === today);
    const passByStudent = new Map(todayPasses.map((p) => [p.studentId, p]));

    let targetStudents = this.students;
    if (q) {
      targetStudents = this.students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentCode.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q)
      );
    } else {
      // If query empty, show only students with passes today
      const studentIdsWithPasses = new Set(todayPasses.map((p) => p.studentId));
      targetStudents = this.students.filter((s) => studentIdsWithPasses.has(s.id));
    }

    const results: GuardSearchResult[] = targetStudents.map((student) => {
      const pass = passByStudent.get(student.id);
      let statusType: GuardSearchResult['statusType'] = 'NO_PASS';
      let statusText = 'אין אישור שחרור פעיל להיום';

      if (pass) {
        if (pass.status === 'used') {
          statusType = 'ALREADY_EXITED';
          const time = pass.usedAt ? pass.usedAt.split('T')[1]?.substring(0, 5) : '';
          statusText = `התלמיד כבר יצא מהשער (בשעה ${time})`;
        } else if (pass.status === 'cancelled') {
          statusType = 'CANCELLED';
          statusText = 'האישור בוטל על ידי המורה';
        } else if (pass.status === 'active') {
          if (pass.validFromTime <= nowTime) {
            statusType = 'APPROVED_NOW';
            statusText = 'מאושר לצאת עכשיו';
          } else {
            statusType = 'APPROVED_FUTURE';
            statusText = `האישור ייכנס לתוקף בשעה ${pass.validFromTime}`;
          }
        }
      }

      return {
        student,
        pass: pass || null,
        statusType,
        statusText,
      };
    });

    return { results, currentTime: nowTime };
  }

  public markExit(guardUser: User, passId: string): { success: boolean; pass: GatePass; message: string } {
    const pass = this.passes.find((p) => p.id === passId);
    if (!pass) {
      throw new Error('אישור שחרור לא נמצא');
    }
    if (pass.status === 'cancelled') {
      throw new Error('האישור בוטל ולא ניתן לסמן יציאה');
    }
    if (pass.status === 'used') {
      throw new Error('התלמיד כבר סומן כמי שיצא מהשער');
    }

    const nowTime = getClientIsraelTimeString();
    if (pass.validFromTime > nowTime) {
      throw new Error(`האישור ייכנס לתוקף רק בשעה ${pass.validFromTime}`);
    }

    pass.status = 'used';
    pass.usedAt = new Date().toISOString();
    pass.usedBy = guardUser.fullName;

    try {
      setDoc(doc(firestoreDb, 'gatepasses', pass.id), pass).catch(() => {});
    } catch {
      // ignore
    }

    this.broadcastChange();
    return {
      success: true,
      pass,
      message: `היציאה נרשמה בהצלחה עבור ${pass.studentName} (${pass.className})`,
    };
  }

  // --- Admin & Staff ---
  public getStaff(schoolId?: string): { staff: StaffMember[] } {
    const target = schoolId || this.activeSchoolId;
    if (target && target !== '*') {
      return {
        staff: this.staff.filter((s) => s.schoolId === '*' || (s.schoolId || 'school-main') === target),
      };
    }
    return { staff: this.staff };
  }

  public saveStaff(staffList: StaffMember[]): { success: boolean; staff: StaffMember[] } {
    // Preserve staff from other schools that might not be in the current view
    const currentSchoolId = this.activeSchoolId;
    if (currentSchoolId && currentSchoolId !== '*') {
      const otherStaff = this.staff.filter(
        (s) => (s.schoolId || 'school-main') !== currentSchoolId && s.schoolId !== '*'
      );
      this.staff = [...otherStaff, ...staffList];
    } else {
      this.staff = staffList;
    }
    this.ensureEssentialStaff();
    this.broadcastChange();
    return { success: true, staff: this.staff };
  }

  // --- History Search ---
  public searchHistory(params: {
    q?: string;
    from?: string;
    to?: string;
    className?: string;
    schoolId?: string;
  } = {}): { passes: GatePass[] } {
    let list = [...this.passes];

    const targetSchoolId = params.schoolId || this.activeSchoolId;
    if (targetSchoolId && targetSchoolId !== '*') {
      list = list.filter((p) => (p.schoolId || 'school-main') === targetSchoolId);
    }

    if (params.className && params.className !== 'ALL') {
      list = list.filter((p) => p.className === params.className);
    }
    if (params.from) {
      list = list.filter((p) => p.dateStr >= params.from!);
    }
    if (params.to) {
      list = list.filter((p) => p.dateStr <= params.to!);
    }
    if (params.q && params.q.trim()) {
      const q = params.q.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.studentName.toLowerCase().includes(q) ||
          p.studentCode.toLowerCase().includes(q) ||
          p.teacherName.toLowerCase().includes(q) ||
          (p.usedBy && p.usedBy.toLowerCase().includes(q)) ||
          (p.reason && p.reason.toLowerCase().includes(q))
      );
    }

    return {
      passes: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  public deletePasses(options: {
    all?: boolean;
    passIds?: string[];
    fromDate?: string;
    toDate?: string;
    schoolId?: string;
  }): { success: boolean; deletedCount: number } {
    const targetSchoolId = options.schoolId || this.activeSchoolId;
    let toDelete: GatePass[] = [];

    if (options.all) {
      if (targetSchoolId && targetSchoolId !== '*') {
        toDelete = this.passes.filter((p) => (p.schoolId || 'school-main') === targetSchoolId);
        this.passes = this.passes.filter((p) => (p.schoolId || 'school-main') !== targetSchoolId);
      } else {
        toDelete = [...this.passes];
        this.passes = [];
      }
    } else if (options.passIds && options.passIds.length > 0) {
      const idSet = new Set(options.passIds);
      toDelete = this.passes.filter((p) => idSet.has(p.id));
      this.passes = this.passes.filter((p) => !idSet.has(p.id));
    } else if (options.fromDate || options.toDate) {
      toDelete = this.passes.filter((p) => {
        if (targetSchoolId && targetSchoolId !== '*' && (p.schoolId || 'school-main') !== targetSchoolId) return false;
        if (options.fromDate && p.dateStr < options.fromDate) return false;
        if (options.toDate && p.dateStr > options.toDate) return false;
        return true;
      });
      const deleteIds = new Set(toDelete.map((p) => p.id));
      this.passes = this.passes.filter((p) => !deleteIds.has(p.id));
    }

    // Persist to local storage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gate_local_passes', JSON.stringify(this.passes));
    }

    // Attempt deletion from Firestore
    try {
      for (const p of toDelete) {
        deleteDoc(doc(firestoreDb, 'gatepasses', p.id)).catch(() => {});
      }
    } catch {
      // ignore
    }

    this.broadcastChange();
    return { success: true, deletedCount: toDelete.length };
  }

  public importData(
    newStudents: Omit<Student, 'id'>[],
    classesTeachers: Array<{ className: string; teacherName?: string }>,
    replaceExisting?: boolean,
    targetSchoolId?: string
  ): { success: boolean; added: number; updated: number; total: number } {
    const schoolId = targetSchoolId || this.activeSchoolId || 'school-main';
    let added = 0;
    let updated = 0;

    if (replaceExisting) {
      // ONLY delete students and passes of THIS school!
      this.students = this.students.filter((s) => (s.schoolId || 'school-main') !== schoolId);
      this.passes = this.passes.filter((p) => (p.schoolId || 'school-main') !== schoolId);
      this.save(STORAGE_KEY_PASSES, this.passes);
    }

    for (const item of newStudents) {
      const existing = this.students.find(
        (s) =>
          (s.schoolId || 'school-main') === schoolId &&
          ((item.studentCode && s.studentCode === item.studentCode) ||
            (s.fullName.trim() === item.fullName.trim() && s.className.trim() === item.className.trim()))
      );

      if (existing) {
        existing.fullName = item.fullName.trim();
        existing.className = item.className.trim();
        if (item.teacherName) existing.teacherName = item.teacherName.trim();
        if (item.notes) existing.notes = item.notes;
        updated++;
      } else {
        const student: Student = {
          id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          studentCode: item.studentCode || `S${(this.students.length + 1).toString().padStart(3, '0')}`,
          fullName: item.fullName.trim(),
          className: item.className.trim(),
          teacherName: item.teacherName?.trim(),
          notes: item.notes,
          schoolId: schoolId,
        };
        this.students.push(student);
        added++;
      }
    }

    // Auto-create/sync homeroom teacher staff for this school
    for (const ct of classesTeachers) {
      if (ct.teacherName && ct.teacherName.trim()) {
        const tName = ct.teacherName.trim();
        const existingStaff = this.staff.find(
          (m) => (m.schoolId || 'school-main') === schoolId && m.fullName.trim() === tName
        );
        if (!existingStaff) {
          const pin = Math.floor(1000 + Math.random() * 9000).toString();
          this.staff.push({
            id: `staff-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            staffCode: `T${this.staff.length + 1}`,
            fullName: tName,
            role: 'teacher',
            pinCode: pin,
            assignedClasses: [ct.className.trim()],
            isActive: true,
            schoolId: schoolId,
          });
        } else if (!existingStaff.assignedClasses.includes(ct.className.trim())) {
          existingStaff.assignedClasses.push(ct.className.trim());
        }
      }
    }

    this.save(STORAGE_KEY_STAFF, this.staff);
    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.broadcastChange();
    const schoolTotal = this.students.filter((s) => (s.schoolId || 'school-main') === schoolId).length;
    return { success: true, added, updated, total: schoolTotal };
  }

  public clearAllDemoData(): { success: boolean; message: string } {
    this.students = [];
    this.passes = [];
    this.ensureEssentialStaff();
    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.broadcastChange();
    return { success: true, message: 'מאגר התלמידים והאישורים אופס בהצלחה ללוח חלק ונקי' };
  }

  public resetDemo(): { success: boolean; message: string } {
    this.staff = JSON.parse(JSON.stringify(INITIAL_STAFF));
    this.students = JSON.parse(JSON.stringify(INITIAL_STUDENTS));
    this.passes = JSON.parse(JSON.stringify(INITIAL_PASSES));
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.broadcastChange();
    return { success: true, message: 'המערכת אופסה לנתוני ההדגמה המקוריים' };
  }

  public suspendAllStaff(suspend: boolean): { success: boolean; staff: StaffMember[] } {
    for (const s of this.staff) {
      if (s.role !== 'admin' && s.pinCode !== '160525') {
        s.isActive = !suspend;
      }
    }
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.broadcastChange();
    return { success: true, staff: this.staff };
  }

  public rollAllStaffPins(): { success: boolean; staff: StaffMember[] } {
    for (const s of this.staff) {
      if (s.role !== 'admin' && s.pinCode !== '160525') {
        s.pinCode = Math.floor(1000 + Math.random() * 9000).toString();
      }
    }
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.broadcastChange();
    return { success: true, staff: this.staff };
  }

  public factoryResetForNewSchool(newSchoolName?: string): { success: boolean; message: string } {
    this.students = [];
    this.passes = [];
    this.staff = [
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
    if (newSchoolName && typeof localStorage !== 'undefined') {
      localStorage.setItem('gate_school_name', newSchoolName.trim());
    }
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.broadcastChange();
    return { success: true, message: 'המערכת אופסה לחלוטין ומוכנה לקליטת בית הספר החדש!' };
  }
}

export const clientStore = new ClientStorageEngine();
