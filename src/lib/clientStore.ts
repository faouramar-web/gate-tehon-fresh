import { User, Student, GatePass, GuardSearchResult, StaffMember, UserRole } from '../types.ts';
import { db as firestoreDb } from './firebase.ts';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit
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

// Storage keys
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
  private staff: StaffMember[];
  private students: Student[];
  private passes: GatePass[];
  private listeners: Array<() => void> = [];

  constructor() {
    this.staff = this.load(STORAGE_KEY_STAFF, INITIAL_STAFF);
    this.students = this.load(STORAGE_KEY_STUDENTS, INITIAL_STUDENTS);
    this.passes = this.load(STORAGE_KEY_PASSES, INITIAL_PASSES);
    this.ensureEssentialStaff();

    // Listen for storage events & broadcast messages across tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (
          e.key === STORAGE_KEY_PASSES ||
          e.key === STORAGE_KEY_STAFF ||
          e.key === STORAGE_KEY_STUDENTS
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
    this.staff = this.load(STORAGE_KEY_STAFF, INITIAL_STAFF);
    this.students = this.load(STORAGE_KEY_STUDENTS, INITIAL_STUDENTS);
    this.passes = this.load(STORAGE_KEY_PASSES, INITIAL_PASSES);
    this.ensureEssentialStaff();
  }

  private ensureEssentialStaff() {
    let changed = false;
    for (const initStaff of INITIAL_STAFF) {
      const exists = this.staff.some(
        (s) => s.pinCode === initStaff.pinCode || s.id === initStaff.id
      );
      if (!exists) {
        this.staff.push(initStaff);
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
      });
      changed = true;
    } else {
      amar.isActive = true;
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

  // Normalize PIN
  public normalizePin(input: string | number | undefined | null): string {
    if (!input) return '';
    return String(input)
      .replace(/[\u0660-\u0669]/g, (c) => (c.charCodeAt(0) - 0x0660).toString())
      .replace(/[\u06F0-\u06F9]/g, (c) => (c.charCodeAt(0) - 0x06F0).toString())
      .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\s]/g, '')
      .trim();
  }

  // --- Auth ---
  public login(pinCode: string): { user: User; token: string } {
    const clean = this.normalizePin(pinCode);
    if (!clean) {
      throw new Error('אנא הקלד קוד גישה אישי');
    }

    // Direct guaranteed check for Amar Faour (PIN: 160525)
    if (clean === '160525') {
      const user: User = {
        id: 'staff-admin-amar',
        staffCode: 'ADMIN',
        fullName: 'עמאר פאעור (מנהל המערכת)',
        role: 'admin',
        assignedClasses: ['*'],
      };
      const token = `client_tok_${Date.now()}_admin`;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
      }
      return { user, token };
    }

    // Check loaded staff or fallback to INITIAL_STAFF
    let member = this.staff.find((s) => s.pinCode === clean && s.isActive);
    if (!member) {
      member = INITIAL_STAFF.find((s) => s.pinCode === clean && s.isActive);
    }

    if (!member) {
      throw new Error('קוד אישי שגוי. אנא נסה שוב או פנה למנהל המערכת.');
    }

    const user: User = {
      id: member.id,
      staffCode: member.staffCode,
      fullName: member.fullName,
      role: member.role,
      assignedClasses: member.assignedClasses,
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
          return { user: JSON.parse(sess) };
        } catch {
          // ignore
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

    let classes = user.assignedClasses;
    let students = hasAll
      ? this.students
      : this.students.filter((s) => user.assignedClasses.includes(s.className));

    if (hasAll) {
      classes = Array.from(new Set(this.students.map((s) => s.className))).sort();
    }

    const today = getClientIsraelDateString();
    const todayPasses = this.passes.filter((p) => p.dateStr === today);
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

    const passes = this.passes.filter((p) => {
      if (p.dateStr !== today) return false;
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

      const pass: GatePass = {
        id: `pass-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        className: student.className,
        teacherId: user.id,
        teacherName: user.fullName,
        dateStr: today,
        validFromTime: effectiveTime,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: user.fullName,
        reason: reason || 'שחרור מוקדם באישור הורים',
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
  public getStaff(): { staff: StaffMember[] } {
    return { staff: this.staff };
  }

  public saveStaff(staffList: StaffMember[]): { success: boolean; staff: StaffMember[] } {
    this.staff = staffList;
    this.broadcastChange();
    return { success: true, staff: this.staff };
  }

  // --- History Search ---
  public searchHistory(params: {
    q?: string;
    from?: string;
    to?: string;
    className?: string;
  } = {}): { passes: GatePass[] } {
    let list = [...this.passes];

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

  public importData(
    newStudents: Omit<Student, 'id'>[],
    classesTeachers: Array<{ className: string; teacherName?: string }>
  ): { success: boolean; added: number; updated: number; total: number } {
    let added = 0;
    let updated = 0;

    for (const item of newStudents) {
      const existing = this.students.find(
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
        const student: Student = {
          id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          studentCode: item.studentCode || `S${(this.students.length + 1).toString().padStart(3, '0')}`,
          fullName: item.fullName.trim(),
          className: item.className.trim(),
          teacherName: item.teacherName?.trim(),
          notes: item.notes,
        };
        this.students.push(student);
        added++;
      }
    }

    this.broadcastChange();
    return { success: true, added, updated, total: this.students.length };
  }

  public resetDemo(): { success: boolean; message: string } {
    this.staff = JSON.parse(JSON.stringify(INITIAL_STAFF));
    this.students = JSON.parse(JSON.stringify(INITIAL_STUDENTS));
    this.passes = JSON.parse(JSON.stringify(INITIAL_PASSES));
    this.broadcastChange();
    return { success: true, message: 'המערכת אופסה לנתוני ההדגמה המקוריים' };
  }
}

export const clientStore = new ClientStorageEngine();
