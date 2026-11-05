import { User, Student, GatePass, GuardSearchResult, StaffMember, UserRole, School, SchoolStatus } from '../types.ts';
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

// Demo data detection and sanitization helpers
export function isDemoStudent(st: any): boolean {
  if (!st || typeof st !== 'object') return false;
  const id = String(st.id || '').toLowerCase();
  const code = String(st.studentCode || '').toUpperCase().trim();
  const name = String(st.fullName || '').trim();
  const schoolId = String(st.schoolId || '');

  if (id.startsWith('s-0') || /^s-0[0-9]{2}$/i.test(id)) return true;
  if (/^S0(0[1-9]|1[0-9]|2[0-5])$/i.test(code)) return true;

  const demoNames = [
    'אדם נאסר', 'מרים סאלח', 'יוסף חמדאן', 'נור עבדאללה', 'ליאן סעיד',
    'אמיר חורי', 'תאלה חנא', 'ראמי עיסא', 'דינה סלים', 'סאמר עבוד',
    'רים זידאן', 'איאד חלבי', 'סלמא עזאם', 'נדים שאהין', 'מאיה יעקוב',
    'האני ח׳טיב', 'האני חטיב', 'ליאן חסן', 'אמל דאהר', 'כרים עלי', 'נור פארס',
    'לין סעד', 'מאלכ איברהים', 'ג׳נא עודה', 'גנא עודה', 'אדם מנסור', 'סוהיל סלאמה'
  ];
  if (demoNames.includes(name)) return true;
  if (schoolId === 'school-main' || schoolId === 'school-ibnsina') return true;
  return false;
}

export function isDemoStaff(st: any): boolean {
  if (!st || typeof st !== 'object') return false;
  const pin = String(st.pinCode || '').trim();
  if (pin === '160525' || pin === '5940' || pin === '2001') return false;

  const id = String(st.id || '').toLowerCase();
  if (id.startsWith('staff-t0') || id === 'staff-g01' || id === 'staff-g02' || id === 'staff-vp01') return true;

  const name = String(st.fullName || '').trim();
  const demoTeachers = [
    'לינא ח׳ליל', 'לינא חליל', 'סוהא מנצור', 'דלאל חביב', 'נאדיה סרחאן', 'רימא ג׳אבר', 'רימא גאבר', 'מוחמד עלי',
    'אברהם כהן', 'יוסי לוי', 'סגן מנהל (אחראי שחרורים)'
  ];
  if (demoTeachers.some((dt) => name.includes(dt))) return true;

  const schoolId = String(st.schoolId || '');
  if (schoolId === 'school-main' || schoolId === 'school-ibnsina') return true;
  return false;
}

export function isDemoPass(p: any): boolean {
  if (!p || typeof p !== 'object') return false;
  const id = String(p.id || '').toLowerCase();
  if (id.startsWith('pass-hist-') || id === 'pass-hist-1' || id === 'pass-hist-2') return true;
  if (p.studentName && (p.studentName === 'מרים סאלח' || isDemoStudent({ fullName: p.studentName }))) return true;
  const schoolId = String(p.schoolId || '');
  if (schoolId === 'school-main' || schoolId === 'school-ibnsina') return true;
  return false;
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
    schoolId: '*',
  },
  {
    id: 'staff-vp-yanuh',
    staffCode: 'VP01',
    fullName: 'תיראן סעד (סגן מנהל / אחראי שחרורים)',
    role: 'vice_principal',
    pinCode: '5940',
    assignedClasses: ['*'],
    isActive: true,
    schoolId: 'school-yanuh',
  },
  {
    id: 'staff-guard-yanuh',
    staffCode: 'G01',
    fullName: 'שומר שער (יאנוח-ג\'ת)',
    role: 'guard',
    pinCode: '2001',
    assignedClasses: [],
    isActive: true,
    schoolId: 'school-yanuh',
  },
];

const INITIAL_STUDENTS: Student[] = [];

const INITIAL_PASSES: GatePass[] = [];

export const INITIAL_SCHOOLS: School[] = [
  {
    id: 'school-yanuh',
    name: "רב תחומי עמל יאנוח-ג'ת",
    city: "יאנוח-ג'ת / מחוז צפון",
    code: '5940',
    activationCode: '5940',
    status: 'active',
    contactPerson: 'תיראן סעד',
    phone: '',
    isSuspended: false,
    createdAt: '2026-11-05T00:00:00.000Z',
  },
];

// Storage keys
const STORAGE_KEY_SCHOOLS = 'gatepass_client_schools_v3';
const STORAGE_KEY_ACTIVE_SCHOOL = 'gatepass_client_active_school_id_v3';
const STORAGE_KEY_STAFF = 'gatepass_client_staff_v2';
const STORAGE_KEY_STUDENTS = 'gatepass_client_students_v2';
const STORAGE_KEY_PASSES = 'gatepass_client_passes_v2';
const STORAGE_KEY_SESSION = 'gatepass_client_session_v2';
const STORAGE_SEED_KEY = 'gatepass_seeded_v20';

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
    const isSeeded = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_SEED_KEY) === 'true';
    if (!isSeeded) {
      this.schools = JSON.parse(JSON.stringify(INITIAL_SCHOOLS));
      this.activeSchoolId = 'school-yanuh';
      this.staff = JSON.parse(JSON.stringify(INITIAL_STAFF));
      this.students = JSON.parse(JSON.stringify(INITIAL_STUDENTS));
      this.passes = JSON.parse(JSON.stringify(INITIAL_PASSES));
      this.save(STORAGE_KEY_SCHOOLS, this.schools);
      this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
      this.save(STORAGE_KEY_STAFF, this.staff);
      this.save(STORAGE_KEY_STUDENTS, this.students);
      this.save(STORAGE_KEY_PASSES, this.passes);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_SEED_KEY, 'true');
        localStorage.setItem('gate_activated_school_code', '5940');
        localStorage.setItem('gate_school_name', "רב תחומי עמל יאנוח-ג'ת");
      }
    } else {
      const loadedSchools = this.load<School[]>(STORAGE_KEY_SCHOOLS, []);
      this.schools = Array.isArray(loadedSchools)
        ? loadedSchools.filter(
            (s) =>
              s &&
              s.id !== 'school-main' &&
              s.id !== 'school-ibnsina' &&
              s.name !== 'בית ספר חדש (ריק)' &&
              !s.name.includes('בית ספר מקיף (סניף ראשי)') &&
              !s.name.includes('תיכון אבן סינא')
          )
        : [];
      if (this.schools.length === 0) {
        this.schools = JSON.parse(JSON.stringify(INITIAL_SCHOOLS));
      }
      this.activeSchoolId = this.load<string>(STORAGE_KEY_ACTIVE_SCHOOL, this.schools[0]?.id || 'school-yanuh');
      if (!this.schools.some((s) => s.id === this.activeSchoolId)) {
        this.activeSchoolId = this.schools[0]?.id || 'school-yanuh';
      }

      const loadedStaff = this.load<StaffMember[]>(STORAGE_KEY_STAFF, INITIAL_STAFF);
      this.staff = (Array.isArray(loadedStaff) ? loadedStaff : JSON.parse(JSON.stringify(INITIAL_STAFF))).filter(
        (s: StaffMember) => s && !isDemoStaff(s)
      );

      const loadedStudents = this.load<Student[]>(STORAGE_KEY_STUDENTS, []);
      this.students = (Array.isArray(loadedStudents) ? loadedStudents : []).filter(
        (st) => st && !isDemoStudent(st)
      );

      const loadedPasses = this.load<GatePass[]>(STORAGE_KEY_PASSES, []);
      this.passes = (Array.isArray(loadedPasses) ? loadedPasses : []).filter(
        (p) => p && !isDemoPass(p)
      );

      this.save(STORAGE_KEY_STUDENTS, this.students);
      this.save(STORAGE_KEY_STAFF, this.staff);
      this.save(STORAGE_KEY_PASSES, this.passes);
    }
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

      // Realtime multi-device sync with Firestore
      try {
        // Automatically sync local data to Cloud on startup
        setTimeout(() => {
          this.syncLocalToCloud();
        }, 1200);

        // 1. Schools realtime listener
        const schoolsRef = collection(firestoreDb, 'schools');
        onSnapshot(
          schoolsRef,
          (snapshot) => {
            if (!snapshot.empty) {
              const remoteSchools: School[] = [];
              snapshot.forEach((docSnap) => {
                const s = docSnap.data() as School;
                if (!s || !s.id) return;
                // Actively purge demo schools from Firestore
                if (
                  s.id === 'school-main' ||
                  s.id === 'school-ibnsina' ||
                  s.name === 'בית ספר חדש (ריק)' ||
                  s.name.includes('בית ספר מקיף (סניף ראשי)') ||
                  s.name.includes('תיכון אבן סינא')
                ) {
                  deleteDoc(doc(firestoreDb, 'schools', s.id)).catch(() => {});
                  return;
                }
                remoteSchools.push(s);
              });
              if (remoteSchools.length > 0) {
                const map = new Map(this.schools.map((s) => [s.id, s]));
                for (const rs of remoteSchools) {
                  map.set(rs.id, rs);
                }
                this.schools = Array.from(map.values()).filter(
                  (s) =>
                    s &&
                    s.id !== 'school-main' &&
                    s.id !== 'school-ibnsina' &&
                    s.name !== 'בית ספר חדש (ריק)' &&
                    !s.name.includes('בית ספר מקיף (סניף ראשי)') &&
                    !s.name.includes('תיכון אבן סינא')
                );
                this.ensureSchoolIntegrity();
                this.save(STORAGE_KEY_SCHOOLS, this.schools);
                this.notify();
              }
            }
          },
          () => {}
        );

        // 2. Staff realtime listener
        const staffRef = collection(firestoreDb, 'staff');
        onSnapshot(
          staffRef,
          (snapshot) => {
            if (!snapshot.empty) {
              const remoteStaff: StaffMember[] = [];
              snapshot.forEach((docSnap) => {
                const st = docSnap.data() as StaffMember;
                if (!st || !st.id) return;
                // Actively purge demo staff from Firestore
                if (isDemoStaff(st)) {
                  deleteDoc(doc(firestoreDb, 'staff', st.id)).catch(() => {});
                  return;
                }
                remoteStaff.push(st);
              });
              const map = new Map(this.staff.map((s) => [s.id, s]));
              for (const rst of remoteStaff) {
                map.set(rst.id, rst);
              }
              this.staff = Array.from(map.values()).filter((st) => st && !isDemoStaff(st));
              this.ensureEssentialStaff();
              this.save(STORAGE_KEY_STAFF, this.staff);
              this.notify();
            }
          },
          () => {}
        );

        // 3. Students realtime listener
        const studentsRef = collection(firestoreDb, 'students');
        onSnapshot(
          studentsRef,
          (snapshot) => {
            if (!snapshot.empty) {
              const remoteStudents: Student[] = [];
              snapshot.forEach((docSnap) => {
                const stud = docSnap.data() as Student;
                if (!stud || !stud.id) return;
                // Actively purge demo students from Firestore
                if (isDemoStudent(stud)) {
                  deleteDoc(doc(firestoreDb, 'students', stud.id)).catch(() => {});
                  return;
                }
                remoteStudents.push(stud);
              });
              const map = new Map(this.students.map((s) => [s.id, s]));
              for (const rstud of remoteStudents) {
                map.set(rstud.id, rstud);
              }
              this.students = Array.from(map.values()).filter((st) => st && !isDemoStudent(st));
              this.save(STORAGE_KEY_STUDENTS, this.students);
              this.notify();
            }
          },
          () => {}
        );

        // 4. Passes realtime listener
        const passesRef = collection(firestoreDb, 'gatepasses');
        const q = query(passesRef, orderBy('createdAt', 'desc'), limit(150));
        onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const remotePasses: GatePass[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data() as GatePass;
                if (!data || !data.id) return;
                if (isDemoPass(data)) {
                  deleteDoc(doc(firestoreDb, 'gatepasses', data.id)).catch(() => {});
                  return;
                }
                remotePasses.push(data);
              });
              const existingMap = new Map(this.passes.map((p) => [p.id, p]));
              for (const rp of remotePasses) {
                existingMap.set(rp.id, rp);
              }
              this.passes = Array.from(existingMap.values())
                .filter((p) => p && !isDemoPass(p))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
              this.save(STORAGE_KEY_PASSES, this.passes);
              this.notify();
            }
          },
          () => {}
        );
      } catch {
        // Firestore not ready or offline - works seamlessly from localStorage
      }
    }
  }

  private load<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const data = localStorage.getItem(key);
      if (!data || data === 'null' || data === 'undefined') return fallback;
      const parsed = JSON.parse(data);
      if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
      return parsed ?? fallback;
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
    const rawSchools = this.load<School[]>(STORAGE_KEY_SCHOOLS, []);
    this.schools = Array.isArray(rawSchools)
      ? rawSchools.filter(
          (s) =>
            s &&
            s.id !== 'school-main' &&
            s.id !== 'school-ibnsina' &&
            s.name !== 'בית ספר חדש (ריק)' &&
            !s.name.includes('בית ספר מקיף (סניף ראשי)') &&
            !s.name.includes('תיכון אבן סינא')
        )
      : [];
    if (this.schools.length === 0) {
      this.schools = JSON.parse(JSON.stringify(INITIAL_SCHOOLS));
    }
    this.activeSchoolId = this.load<string>(STORAGE_KEY_ACTIVE_SCHOOL, this.schools[0]?.id || 'school-yanuh');
    if (!this.schools.some((s) => s.id === this.activeSchoolId)) {
      this.activeSchoolId = this.schools[0]?.id || 'school-yanuh';
    }

    const rawStaff = this.load<StaffMember[]>(STORAGE_KEY_STAFF, INITIAL_STAFF);
    this.staff = (Array.isArray(rawStaff) ? rawStaff : JSON.parse(JSON.stringify(INITIAL_STAFF))).filter(
      (s: StaffMember) => s && !isDemoStaff(s)
    );

    const rawStudents = this.load<Student[]>(STORAGE_KEY_STUDENTS, []);
    this.students = (Array.isArray(rawStudents) ? rawStudents : []).filter(
      (st) => st && !isDemoStudent(st)
    );

    const rawPasses = this.load<GatePass[]>(STORAGE_KEY_PASSES, []);
    this.passes = (Array.isArray(rawPasses) ? rawPasses : []).filter(
      (p) => p && !isDemoPass(p)
    );

    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.ensureSchoolIntegrity();
    this.ensureEssentialStaff();
  }

  private ensureSchoolIntegrity() {
    let changed = false;

    // Filter out any dummy placeholder or old demo schools
    const prevCount = this.schools.length;
    this.schools = this.schools.filter(
      (s) =>
        s &&
        s.id !== 'school-main' &&
        s.id !== 'school-ibnsina' &&
        s.name !== 'בית ספר חדש (ריק)' &&
        !s.name.includes('בית ספר מקיף (סניף ראשי)') &&
        !s.name.includes('תיכון אבן סינא')
    );
    if (this.schools.length !== prevCount) {
      changed = true;
    }

    if (this.schools.length === 0) {
      this.schools = JSON.parse(JSON.stringify(INITIAL_SCHOOLS));
      this.activeSchoolId = 'school-yanuh';
      changed = true;
    } else if (!this.schools.some((s) => s.id === this.activeSchoolId)) {
      this.activeSchoolId = this.schools[0]?.id || 'school-yanuh';
      changed = true;
    }

    // Ensure activation codes and subscription statuses are populated
    for (let i = 0; i < this.schools.length; i++) {
      const s = this.schools[i];
      if (!s.activationCode) {
        s.activationCode = `${1000 + i}`;
        changed = true;
      }
      if (!s.status) {
        s.status = s.isSuspended ? 'suspended' : 'active';
        changed = true;
      }
      s.isSuspended = s.status !== 'active';
    }

    if (changed) {
      this.save(STORAGE_KEY_SCHOOLS, this.schools);
      this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    }
  }

  private ensureEssentialStaff() {
    let changed = false;

    // Filter out legacy demo staff
    const prevCount = this.staff.length;
    this.staff = this.staff.filter(
      (s) =>
        s &&
        s.id !== 'staff-t01' &&
        s.id !== 'staff-t02' &&
        s.id !== 'staff-t03' &&
        s.id !== 'staff-t04' &&
        s.id !== 'staff-t05' &&
        s.id !== 'staff-t06' &&
        s.id !== 'staff-g01' &&
        s.id !== 'staff-g02' &&
        s.id !== 'staff-vp01' &&
        !s.fullName.includes('לינא ח׳ליל') &&
        !s.fullName.includes('סוהא מנצור') &&
        !s.fullName.includes('אברהם כהן') &&
        s.schoolId !== 'school-main' &&
        s.schoolId !== 'school-ibnsina'
    );
    if (this.staff.length !== prevCount) {
      changed = true;
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

    // If Yanuh-Jat is present, ensure Tiran Saad and Guard Yanuh
    if (this.schools.some((s) => s.id === 'school-yanuh')) {
      const tiran = this.staff.find((s) => s.schoolId === 'school-yanuh' && (s.pinCode === '5940' || s.role === 'vice_principal'));
      if (!tiran) {
        this.staff.push({
          id: 'staff-vp-yanuh',
          staffCode: 'VP01',
          fullName: 'תיראן סעד (סגן מנהל / אחראי שחרורים)',
          role: 'vice_principal',
          pinCode: '5940',
          assignedClasses: ['*'],
          isActive: true,
          schoolId: 'school-yanuh',
        });
        changed = true;
      }
      const guard = this.staff.find((s) => s.schoolId === 'school-yanuh' && (s.pinCode === '2001' || s.role === 'guard'));
      if (!guard) {
        this.staff.push({
          id: 'staff-guard-yanuh',
          staffCode: 'G01',
          fullName: 'שומר שער (יאנוח-ג\'ת)',
          role: 'guard',
          pinCode: '2001',
          assignedClasses: [],
          isActive: true,
          schoolId: 'school-yanuh',
        });
        changed = true;
      }
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

  public syncSchoolToFirestore(school: School): void {
    try {
      if (!firestoreDb || !school || !school.id) return;
      setDoc(doc(firestoreDb, 'schools', school.id), school, { merge: true }).catch(() => {});
    } catch {
      // ignore
    }
  }

  public deleteSchoolFromFirestore(schoolId: string): void {
    try {
      if (!firestoreDb || !schoolId) return;
      deleteDoc(doc(firestoreDb, 'schools', schoolId)).catch(() => {});
    } catch {
      // ignore
    }
  }

  public syncStaffToFirestore(member: StaffMember): void {
    try {
      if (!firestoreDb || !member || !member.id) return;
      setDoc(doc(firestoreDb, 'staff', member.id), member, { merge: true }).catch(() => {});
    } catch {
      // ignore
    }
  }

  public deleteStaffFromFirestore(staffId: string): void {
    try {
      if (!firestoreDb || !staffId) return;
      deleteDoc(doc(firestoreDb, 'staff', staffId)).catch(() => {});
    } catch {
      // ignore
    }
  }

  public syncStudentToFirestore(student: Student): void {
    try {
      if (!firestoreDb || !student || !student.id) return;
      setDoc(doc(firestoreDb, 'students', student.id), student, { merge: true }).catch(() => {});
    } catch {
      // ignore
    }
  }

  public deleteStudentFromFirestore(studentId: string): void {
    try {
      if (!firestoreDb || !studentId) return;
      deleteDoc(doc(firestoreDb, 'students', studentId)).catch(() => {});
    } catch {
      // ignore
    }
  }

  public syncPassToFirestore(pass: GatePass): void {
    try {
      if (!firestoreDb || !pass || !pass.id) return;
      setDoc(doc(firestoreDb, 'gatepasses', pass.id), pass, { merge: true }).catch(() => {});
    } catch {
      // ignore
    }
  }

  public syncLocalToCloud(): void {
    try {
      if (!firestoreDb) return;

      // Delete legacy demo documents from Firestore so they never resurrect
      try {
        deleteDoc(doc(firestoreDb, 'schools', 'school-main')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'schools', 'school-ibnsina')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'staff', 'staff-vp01')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'staff', 'staff-t01')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'staff', 'staff-t02')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'staff', 'staff-t03')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'staff', 'staff-t04')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'staff', 'staff-t05')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'staff', 'staff-t06')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'staff', 'staff-g01')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'staff', 'staff-g02')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'gatepasses', 'pass-hist-1')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'gatepasses', 'pass-hist-01')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'gatepasses', 'pass-hist-2')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'gatepasses', 'pass-hist-02')).catch(() => {});
      } catch {
        // ignore
      }

      // Sweep and delete any demo students or staff in Firestore
      try {
        getDocs(collection(firestoreDb, 'students')).then((snap) => {
          snap.forEach((d) => {
            const data = d.data();
            if (isDemoStudent(data)) {
              deleteDoc(d.ref).catch(() => {});
            }
          });
        }).catch(() => {});

        getDocs(collection(firestoreDb, 'staff')).then((snap) => {
          snap.forEach((d) => {
            const data = d.data();
            if (isDemoStaff(data)) {
              deleteDoc(d.ref).catch(() => {});
            }
          });
        }).catch(() => {});
      } catch {
        // ignore
      }

      for (const s of this.schools) {
        if (
          s &&
          s.id &&
          s.id !== 'school-main' &&
          s.id !== 'school-ibnsina' &&
          s.name &&
          s.name !== 'בית ספר חדש (ריק)' &&
          !s.name.includes('בית ספר מקיף (סניף ראשי)') &&
          !s.name.includes('תיכון אבן סינא')
        ) {
          this.syncSchoolToFirestore(s);
        }
      }
      for (const st of this.staff) {
        if (st && st.id && !isDemoStaff(st)) {
          this.syncStaffToFirestore(st);
        }
      }
      for (const stud of this.students) {
        if (stud && stud.id && !isDemoStudent(stud)) {
          this.syncStudentToFirestore(stud);
        }
      }
      // Delete legacy demo passes from Firestore
      try {
        deleteDoc(doc(firestoreDb, 'gatepasses', 'pass-hist-1')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'gatepasses', 'pass-hist-01')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'gatepasses', 'pass-hist-2')).catch(() => {});
        deleteDoc(doc(firestoreDb, 'gatepasses', 'pass-hist-02')).catch(() => {});
      } catch {
        // ignore
      }

      for (const p of this.passes) {
        if (
          p &&
          p.id &&
          p.id !== 'pass-hist-1' &&
          p.id !== 'pass-hist-01' &&
          p.id !== 'pass-hist-2' &&
          p.id !== 'pass-hist-02' &&
          p.studentName !== 'מרים סאלח'
        ) {
          this.syncPassToFirestore(p);
        }
      }
    } catch {
      // ignore
    }
  }

  private broadcastChange() {
    this.save(STORAGE_KEY_SCHOOLS, this.schools);
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.syncLocalToCloud();
    this.notify();
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new Event('school_changed'));
      } catch {
        // ignore
      }
    }
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

  public getActiveSchoolName(): string {
    const school = this.schools.find((s) => s.id === this.activeSchoolId);
    if (school?.name) return school.name;
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('gate_school_name');
      if (stored && !stored.includes('בית ספר מקיף') && !stored.includes('תיכון אבן סינא')) return stored;
    }
    return this.schools[0]?.name || "רב תחומי עמל יאנוח-ג'ת";
  }

  public setActiveSchoolId(schoolId: string): { success: boolean; activeSchoolId: string; activeSchoolName: string } {
    const school = this.schools.find((s) => s.id === schoolId);
    if (!school) {
      throw new Error(`בית ספר לא נמצא במערכת: ${schoolId}`);
    }
    this.activeSchoolId = schoolId;
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gate_school_name', school.name);
    }
    this.broadcastChange();
    return { success: true, activeSchoolId: this.activeSchoolId, activeSchoolName: school.name };
  }

  public createSchool(data: {
    name: string;
    city?: string;
    code?: string;
    activationCode?: string;
    status?: SchoolStatus;
    contactPerson?: string;
    contactFirstName?: string;
    contactLastName?: string;
    contactRole?: string;
    contactPin?: string;
    phone?: string;
  }): { success: boolean; school: School; coordinatorPin: string } {
    if (!data.name || !data.name.trim()) {
      throw new Error('שם בית הספר הינו שדה חובה');
    }

    const schoolId = `school-${Date.now()}`;
    const initialStatus = data.status || 'pending';
    const activationCode = data.activationCode?.trim() || Math.floor(1000 + Math.random() * 9000).toString();

    const fullNameContact = (data.contactFirstName || data.contactLastName)
      ? `${data.contactFirstName || ''} ${data.contactLastName || ''}`.trim()
      : (data.contactPerson?.trim() || '');

    const newSchool: School = {
      id: schoolId,
      name: data.name.trim(),
      city: data.city?.trim() || '',
      code: data.code?.trim() || `SCH-${(this.schools.length + 1).toString().padStart(2, '0')}`,
      activationCode,
      status: initialStatus,
      contactPerson: fullNameContact,
      phone: data.phone?.trim() || '',
      isSuspended: initialStatus !== 'active',
      createdAt: new Date().toISOString(),
    };

    this.schools.push(newSchool);

    // Coordinator (Vice Principal / Secretary) assigned personal PIN chosen by Amar Faour
    const vpPin = data.contactPin?.trim() || `${3000 + this.schools.length}`;
    const guardPin = `${2000 + this.schools.length}`;
    const vpTitle = data.contactRole?.trim() || 'סגן מנהל / אחראי מערכת';
    const coordinatorDisplay = fullNameContact ? `${fullNameContact} (${vpTitle})` : `${vpTitle} (${newSchool.name})`;

    // External staff start active ONLY if school status is 'active', otherwise blocked until Amar Faour approves!
    const staffShouldBeActive = initialStatus === 'active';

    this.staff.push(
      {
        id: `staff-vp-${schoolId}`,
        staffCode: `VP0${this.schools.length}`,
        fullName: coordinatorDisplay,
        role: 'vice_principal',
        pinCode: vpPin,
        phone: data.phone?.trim() || '',
        assignedClasses: ['*'],
        isActive: staffShouldBeActive,
        schoolId: schoolId,
      },
      {
        id: `staff-guard-${schoolId}`,
        staffCode: `G0${this.schools.length}`,
        fullName: `שומר שער (${newSchool.name})`,
        role: 'guard',
        pinCode: guardPin,
        assignedClasses: [],
        isActive: staffShouldBeActive,
        schoolId: schoolId,
      }
    );

    this.activeSchoolId = schoolId;
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.broadcastChange();
    return { success: true, school: newSchool, coordinatorPin: vpPin };
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
    const target = this.schools.find((s) => s.id === schoolId);
    if (!target) {
      throw new Error('בית הספר המבוקש למחיקה לא נמצא במערכת');
    }

    // Delete school from schools list
    this.schools = this.schools.filter((s) => s.id !== schoolId && s.name !== 'בית ספר חדש (ריק)');

    // Delete all isolated data of THIS school only (other schools stay 100% untouched)
    this.students = this.students.filter((s) => s.schoolId !== schoolId);
    this.passes = this.passes.filter((p) => p.schoolId !== schoolId);
    this.staff = this.staff.filter((m) => m.schoolId !== schoolId || m.pinCode === '160525');

    // Update active school ID
    this.activeSchoolId = this.schools[0]?.id || '';
    if (typeof localStorage !== 'undefined') {
      if (this.schools.length === 0) {
        localStorage.removeItem('gate_school_name');
      } else {
        localStorage.setItem('gate_school_name', this.schools[0].name);
      }
    }

    this.broadcastChange();
    return {
      success: true,
      message: this.schools.length === 0
        ? `בית הספר "${target.name}" נמחק לחלוטין (DELETE)! כל המורים והנתונים נמחקו. אין כרגע בתי ספר במערכת. כפתורי הניהול ייפתחו כשתרשום בית ספר חדש.`
        : `בית הספר "${target.name}" וכל הנתונים שלו נמחקו לחלוטין (DELETE)! כל המורים והצוות נחסמו מיידית מהאפליקציה.`,
    };
  }

  public suspendSchool(schoolId: string, suspend: boolean): { success: boolean; school: School; message: string } {
    const school = this.schools.find((s) => s.id === schoolId);
    if (!school) {
      throw new Error('בית ספר לא נמצא');
    }

    school.isSuspended = suspend;
    school.status = suspend ? 'suspended' : 'active';

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

  public setSchoolStatus(schoolId: string, status: SchoolStatus): { success: boolean; school: School; message: string } {
    const school = this.schools.find((s) => s.id === schoolId);
    if (!school) {
      throw new Error('בית ספר לא נמצא');
    }

    school.status = status;
    school.isSuspended = status !== 'active';

    // Update staff active status based on school subscription status
    const shouldStaffBeActive = status === 'active';
    for (const member of this.staff) {
      if (member.schoolId === schoolId && member.pinCode !== '160525' && member.role !== 'admin') {
        member.isActive = shouldStaffBeActive;
      }
    }

    this.broadcastChange();
    let message = '';
    switch (status) {
      case 'active':
        message = `סטטוס המנוי עבור "${school.name}" עודכן ל: מאושר ופעיל 🟢. כל צוות בית הספר יכול לעבוד כרגיל.`;
        break;
      case 'pending':
        message = `סטטוס המנוי עבור "${school.name}" עודכן ל: ממתין להפעלה 🟡. לא תתאפשר כניסה עד מסירת קוד הפעלה או אישור.`;
        break;
      case 'suspended':
        message = `סטטוס המנוי עבור "${school.name}" עודכן ל: מוקפא 🔴 (עקב אי-תשלום). הגישה בניידים נחסמה מיידית!`;
        break;
      case 'cancelled':
        message = `סטטוס המנוי עבור "${school.name}" עודכן ל: מבוטל ⚫. הגישה לבית ספר זה נסגרה.`;
        break;
    }

    return { success: true, school, message };
  }

  public updateSchoolActivationCode(schoolId: string, newCode: string): { success: boolean; school: School; message: string } {
    const school = this.schools.find((s) => s.id === schoolId);
    if (!school) {
      throw new Error('בית ספר לא נמצא');
    }
    if (!newCode || !newCode.trim()) {
      throw new Error('קוד הפעלה לא יכול להיות ריק');
    }

    school.activationCode = newCode.trim();
    this.broadcastChange();
    return {
      success: true,
      school,
      message: `קוד ההפעלה של "${school.name}" עודכן בהצלחה ל: ${school.activationCode}`,
    };
  }

  public activateSchoolByCode(code: string): { success: boolean; school: School; message: string } {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      throw new Error('אנא הזן קוד הפעלה בית ספרי');
    }

    const school = this.schools.find(
      (s) => (s.activationCode || '').toUpperCase() === clean || (s.code || '').toUpperCase() === clean
    );

    if (!school) {
      throw new Error('קוד הפעלה בית ספרי שגוי. אנא ודא את הקוד שקיבלת מעמאר פאעור.');
    }

    if (school.status === 'suspended') {
      throw new Error(`מנוי בית הספר "${school.name}" מוקפא עקב אי-תשלום. לחידוש המנוי יש לפנות לעמאר פאעור.`);
    }

    if (school.status === 'cancelled') {
      throw new Error(`מנוי בית הספר "${school.name}" בוטל לצמיתות.`);
    }

    // Auto-approve if pending
    if (school.status === 'pending') {
      school.status = 'active';
      school.isSuspended = false;
      for (const member of this.staff) {
        if (member.schoolId === school.id && member.pinCode !== '160525' && member.role !== 'admin') {
          member.isActive = true;
        }
      }
    }

    this.activeSchoolId = school.id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SCHOOL, school.id);
      localStorage.setItem('gate_school_name', school.name);
      localStorage.setItem('gate_activated_school_id', school.id);
      localStorage.setItem('gate_activated_school_code', school.activationCode);
    }

    this.broadcastChange();
    return {
      success: true,
      school,
      message: `בית הספר "${school.name}" הופעל בהצלחה במכשיר זה! כעת ניתן להיכנס עם הקוד האישי שלך.`,
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

    // Also support school activation code entered directly into the PIN pad
    if (!member) {
      const schoolByCode = this.schools.find(
        (s) => (s.activationCode && s.activationCode === clean) || (s.code && s.code === clean)
      );
      if (schoolByCode) {
        this.activeSchoolId = schoolByCode.id;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('gate_activated_school_code', schoolByCode.activationCode || clean);
          localStorage.setItem('gate_school_name', schoolByCode.name);
        }
        if (schoolByCode.status === 'pending') {
          schoolByCode.status = 'active';
          schoolByCode.isSuspended = false;
        }
        member =
          this.staff.find((s) => s.schoolId === schoolByCode.id && s.role === 'vice_principal') ||
          this.staff.find((s) => s.schoolId === schoolByCode.id);
        if (member) {
          member.isActive = true;
        }
      }
    }

    if (!member) {
      throw new Error('קוד אישי שגוי או שחשבון זה הוסר מהמערכת.');
    }

    const schoolId = member.schoolId && member.schoolId !== '*' ? member.schoolId : (this.activeSchoolId || this.schools[0]?.id || 'school-yanuh');
    const school = this.schools.find((s) => s.id === schoolId);
    if (!school) {
      throw new Error('בית ספר זה הוסר מהמערכת והמנוי בוטל לצמיתות.');
    }

    // Check school subscription status
    if (school.status === 'pending') {
      throw new Error(`המנוי עבור "${school.name}" ממתין להפעלה. אנא הזן קוד הפעלה מוסדי או פנה לעמאר פאעור.`);
    }
    if (school.status === 'suspended' || school.isSuspended) {
      throw new Error(`המערכת הושעתה ע״י מנהל המערכת (עמאר פאעור) עקב אי-תשלום. לחידוש הגישה יש לפנות לעמאר פאעור.`);
    }
    if (school.status === 'cancelled') {
      throw new Error(`מנוי בית הספר "${school.name}" בוטל לצמיתות.`);
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
      schoolName: school.name,
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
            const school = this.schools.find((s) => s.id === user.schoolId);
            if (!school) {
              localStorage.removeItem(STORAGE_KEY_SESSION);
              throw new Error('בית ספר זה הוסר מהמערכת והמנוי בוטל לצמיתות. השימוש באפליקציה חסום.');
            }
            if (school.status === 'pending') {
              localStorage.removeItem(STORAGE_KEY_SESSION);
              throw new Error('המנוי עבור בית הספר ממתין להפעלה ואישור תשלום. השימוש באפליקציה חסום.');
            }
            if (school.status === 'suspended' || school.isSuspended) {
              localStorage.removeItem(STORAGE_KEY_SESSION);
              throw new Error('גישת בית הספר למערכת הושעתה ע״י מנהל המערכת (עמאר פאעור). השימוש באפליקציה חסום.');
            }
            if (school.status === 'cancelled') {
              localStorage.removeItem(STORAGE_KEY_SESSION);
              throw new Error('מנוי בית הספר בוטל לצמיתות.');
            }

            const member = this.staff.find((s) => s.id === user.id);
            if (!member || !member.isActive) {
              localStorage.removeItem(STORAGE_KEY_SESSION);
              throw new Error('חשבון זה הוסר או הושבת ע״י מנהל המערכת (עמאר פאעור). הגישה חסומה.');
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
    const defaultScope = this.activeSchoolId || this.schools[0]?.id || 'school-yanuh';

    let students = schoolScope
      ? this.students.filter((s) => (s.schoolId || defaultScope) === schoolScope)
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
      if (schoolScope && (p.schoolId || defaultScope) !== schoolScope) return false;
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
    const defaultScope = this.activeSchoolId || this.schools[0]?.id || 'school-yanuh';

    const passes = this.passes.filter((p) => {
      if (p.dateStr !== today) return false;
      if (schoolScope && (p.schoolId || defaultScope) !== schoolScope) return false;
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

    const effectiveSchoolId = user.schoolId && user.schoolId !== '*' ? user.schoolId : (this.activeSchoolId || this.schools[0]?.id || 'school-yanuh');

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
    const target = schoolId || this.activeSchoolId || this.schools[0]?.id || 'school-yanuh';
    if (target && target !== '*') {
      return {
        staff: this.staff.filter((s) => s.schoolId === '*' || (s.schoolId || target) === target),
      };
    }
    return { staff: this.staff };
  }

  public saveStaff(staffList: StaffMember[]): { success: boolean; staff: StaffMember[] } {
    // Preserve staff from other schools that might not be in the current view
    const currentSchoolId = this.activeSchoolId || this.schools[0]?.id || 'school-yanuh';
    if (currentSchoolId && currentSchoolId !== '*') {
      const otherStaff = this.staff.filter(
        (s) => (s.schoolId || currentSchoolId) !== currentSchoolId && s.schoolId !== '*'
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
    let list = this.passes.filter(
      (p) =>
        p &&
        p.id !== 'pass-hist-1' &&
        p.id !== 'pass-hist-01' &&
        p.id !== 'pass-hist-2' &&
        p.id !== 'pass-hist-02' &&
        p.studentName !== 'מרים סאלח'
    );

    const targetSchoolId = params.schoolId || this.activeSchoolId;
    if (targetSchoolId && targetSchoolId !== '*') {
      list = list.filter((p) => p.schoolId === targetSchoolId);
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
    const targetSchoolId = options.schoolId || this.activeSchoolId || this.schools[0]?.id || 'school-yanuh';
    let toDelete: GatePass[] = [];

    if (options.all) {
      if (targetSchoolId && targetSchoolId !== '*') {
        toDelete = this.passes.filter((p) => (p.schoolId || targetSchoolId) === targetSchoolId);
        this.passes = this.passes.filter((p) => (p.schoolId || targetSchoolId) !== targetSchoolId);
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
        if (targetSchoolId && targetSchoolId !== '*' && (p.schoolId || targetSchoolId) !== targetSchoolId) return false;
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
    const schoolId = targetSchoolId || this.activeSchoolId || this.schools[0]?.id || 'school-yanuh';
    let added = 0;
    let updated = 0;

    if (replaceExisting) {
      // ONLY delete students and passes of THIS school!
      this.students = this.students.filter((s) => (s.schoolId || schoolId) !== schoolId);
      this.passes = this.passes.filter((p) => (p.schoolId || schoolId) !== schoolId);
      this.save(STORAGE_KEY_PASSES, this.passes);
    }

    for (const item of newStudents) {
      const existing = this.students.find(
        (s) =>
          (s.schoolId || schoolId) === schoolId &&
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
          (m) => (m.schoolId || schoolId) === schoolId && m.fullName.trim() === tName
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
    const schoolTotal = this.students.filter((s) => (s.schoolId || schoolId) === schoolId).length;
    return { success: true, added, updated, total: schoolTotal };
  }

  public getSchoolDirectory(targetSchoolId?: string): {
    classesSummary: Array<{
      className: string;
      teacherName: string;
      count: number;
      students: Student[];
    }>;
    totalStudents: number;
    totalClasses: number;
  } {
    const schoolId = targetSchoolId || this.activeSchoolId || this.schools[0]?.id || 'school-yanuh';
    const studentsArr = Array.isArray(this.students) ? this.students : [];
    const staffArr = Array.isArray(this.staff) ? this.staff : [];
    const schoolStudents = studentsArr.filter((s) => s && !isDemoStudent(s) && (s.schoolId || schoolId) === schoolId);

    // Group by class
    const classMap = new Map<string, { className: string; teacherName: string; count: number; students: Student[] }>();

    for (const st of schoolStudents) {
      if (!st) continue;
      const cls = st.className || 'ללא כיתה';
      if (!classMap.has(cls)) {
        const teacherStaff = staffArr.find(
          (m) => m && (m.schoolId || schoolId) === schoolId && m.assignedClasses?.includes(cls)
        );
        classMap.set(cls, {
          className: cls,
          teacherName: st.teacherName || teacherStaff?.fullName || '',
          count: 0,
          students: [],
        });
      }
      const entry = classMap.get(cls)!;
      entry.count++;
      entry.students.push(st);
      if (!entry.teacherName && st.teacherName) {
        entry.teacherName = st.teacherName;
      }
    }

    const classesSummary = Array.from(classMap.values()).sort((a, b) => a.className.localeCompare(b.className, 'he'));
    return {
      classesSummary,
      totalStudents: schoolStudents.length,
      totalClasses: classesSummary.length,
    };
  }

  public async clearAllDemoData(): Promise<{ success: boolean; message: string }> {
    this.students = [];
    this.passes = [];
    this.staff = this.staff.filter((s) => s.pinCode === '160525' || s.pinCode === '5940' || s.pinCode === '2001');
    this.ensureEssentialStaff();
    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.save(STORAGE_KEY_STAFF, this.staff);

    // Delete all students and passes from Firestore!
    try {
      if (firestoreDb) {
        const studentDocs = await getDocs(collection(firestoreDb, 'students'));
        for (const d of studentDocs.docs) {
          deleteDoc(d.ref).catch(() => {});
        }
        const passDocs = await getDocs(collection(firestoreDb, 'gatepasses'));
        for (const d of passDocs.docs) {
          deleteDoc(d.ref).catch(() => {});
        }
        const staffDocs = await getDocs(collection(firestoreDb, 'staff'));
        for (const d of staffDocs.docs) {
          const st = d.data() as StaffMember;
          if (st && isDemoStaff(st)) {
            deleteDoc(d.ref).catch(() => {});
          }
        }
      }
    } catch {
      // ignore
    }

    this.broadcastChange();
    return { success: true, message: 'מאגר התלמידים והאישורים אופס בהצלחה ללוח חלק ונקי (כולל סילוק מלא מהענן)' };
  }

  public async resetDemo(): Promise<{ success: boolean; message: string }> {
    return this.clearAllDemoData();
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
