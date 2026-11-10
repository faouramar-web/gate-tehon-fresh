import { User, Student, GatePass, GuardSearchResult, StaffMember, UserRole, School, SchoolStatus, LateArrival } from '../types.ts';
import { db as firestoreDb } from './firebase.ts';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  deleteDoc
} from 'firebase/firestore';

// Quota-aware circuit breaker to prevent repeated resource-exhausted errors on free tier
let isFirestoreQuotaExhausted =
  typeof localStorage !== 'undefined' &&
  localStorage.getItem('gatepass_firestore_quota_exhausted') === 'true';

export function isQuotaExhausted(): boolean {
  return isFirestoreQuotaExhausted;
}

export function handleFirestoreQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err.code || err);
  if (
    msg.includes('resource-exhausted') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded')
  ) {
    if (!isFirestoreQuotaExhausted) {
      console.warn(
        'Firestore free tier daily write quota reached. Operating seamlessly in high-speed local/server mode without hanging.'
      );
    }
    isFirestoreQuotaExhausted = true;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('gatepass_firestore_quota_exhausted', 'true');
      } catch {
        // ignore
      }
    }
    return true;
  }
  return false;
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    const reason = String(e.reason?.message || e.reason || '');
    if (reason.includes('resource-exhausted') || reason.includes('Quota limit exceeded') || reason.includes('Quota exceeded')) {
      e.preventDefault();
      handleFirestoreQuotaError(e.reason);
    }
  });
}

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

// Firestore collection names - clean v6 to prevent stale or quota-locked documents from loading
const FS_COLLECTION_SCHOOLS = 'schools_clean_v6';
const FS_COLLECTION_STAFF = 'staff_clean_v6';
const FS_COLLECTION_STUDENTS = 'students_clean_v6';
const FS_COLLECTION_PASSES = 'gatepasses_clean_v6';
const FS_BUNDLE_COLLECTION = 'app_sync_bundle_v2';
const FS_BUNDLE_DOC_ID = 'global_data';

// Demo data detection: ONLY matches obsolete initial test IDs, NEVER user-entered schools or names
export function isDemoSchool(s: any): boolean {
  if (!s || typeof s !== 'object') return false;
  const id = String(s.id || '').toLowerCase();
  const name = String(s.name || '').trim();
  // NEVER delete user created schools!
  return id === 'school-main' || id === 'school-ibnsina' || name === 'בית ספר לדוגמה (מערכת ישנה)';
}

export function isDemoStudent(st: any): boolean {
  if (!st || typeof st !== 'object') return false;
  const id = String(st.id || '').toLowerCase();
  return id === 's-demo-mock-01';
}

export function isDemoStaff(st: any): boolean {
  if (!st || typeof st !== 'object') return false;
  const id = String(st.id || '').toLowerCase();
  return id === 'staff-demo-mock-01';
}

export function isDemoPass(p: any): boolean {
  if (!p || typeof p !== 'object') return false;
  const id = String(p.id || '').toLowerCase();
  return id === 'pass-hist-demo-mock-1';
}

// Universal robust student deduplicator by ID, StudentCode + Class, and FullName + Class
export function deduplicateStudents(students: Student[]): Student[] {
  if (!Array.isArray(students) || students.length === 0) return [];
  const result: Student[] = [];

  const norm = (s: any) =>
    String(s || '')
      .replace(/^כיתה\s*/i, '')
      .replace(/['"`׳״\s]/g, '')
      .trim()
      .toLowerCase();

  for (const st of students) {
    if (!st || isDemoStudent(st)) continue;

    const idKey = st.id ? norm(st.id) : '';
    const normClass = norm(st.className);
    const normName = norm(st.fullName);
    const normCode = norm(st.studentCode);

    const nameClassKey = normName && normClass ? `${normClass}::${normName}` : '';
    const codeClassKey = normCode && normClass ? `${normClass}::${normCode}` : '';

    const existingIdx = result.findIndex((r) => {
      if (idKey && norm(r.id) === idKey) return true;
      const rClass = norm(r.className);
      const rName = norm(r.fullName);
      const rCode = norm(r.studentCode);
      if (nameClassKey && rClass && rName && `${rClass}::${rName}` === nameClassKey) return true;
      if (codeClassKey && rClass && rCode && `${rClass}::${rCode}` === codeClassKey) return true;
      return false;
    });

    if (existingIdx >= 0) {
      const existing = result[existingIdx];
      // If incoming record has an active or used pass and existing doesn't, upgrade
      if (st.currentPass && (!existing.currentPass || existing.currentPass.status === 'cancelled')) {
        result[existingIdx] = { ...existing, currentPass: st.currentPass };
      }
      continue;
    }

    result.push(st);
  }

  return result;
}

// Guaranteed globally unique PIN generator across all staff members
export function generateUniquePin(
  existingStaffOrPins: Array<{ pinCode?: string }> | Set<string>,
  preferredPin?: string
): string {
  const usedPins = new Set<string>();
  if (existingStaffOrPins instanceof Set) {
    for (const p of existingStaffOrPins) {
      if (p) usedPins.add(p.trim());
    }
  } else if (Array.isArray(existingStaffOrPins)) {
    for (const s of existingStaffOrPins) {
      if (s?.pinCode?.trim()) usedPins.add(s.pinCode.trim());
    }
  }
  usedPins.add('160525'); // Amar Faour Super Admin reserved PIN

  if (preferredPin && preferredPin.trim() && !usedPins.has(preferredPin.trim()) && preferredPin.trim() !== '160525') {
    return preferredPin.trim();
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


import {
  SEEDED_SCHOOLS,
  SEEDED_ACTIVE_SCHOOL_ID,
  SEEDED_STAFF,
  SEEDED_STUDENTS,
} from './seedData.ts';

export const INITIAL_SCHOOLS: School[] = SEEDED_SCHOOLS;

export const INITIAL_STAFF: StaffMember[] = SEEDED_STAFF;

export const INITIAL_STUDENTS: Student[] = SEEDED_STUDENTS;

const INITIAL_PASSES: GatePass[] = [];

// Storage keys - v8_fresh_empty_slate guaranteed 100% clean reset
const STORAGE_KEY_SCHOOLS = 'gatepass_client_schools_v8_fresh_empty_slate';
const STORAGE_KEY_ACTIVE_SCHOOL = 'gatepass_client_active_school_id_v8_fresh_empty_slate';
const STORAGE_KEY_STAFF = 'gatepass_client_staff_v8_fresh_empty_slate';
const STORAGE_KEY_STUDENTS = 'gatepass_client_students_v8_fresh_empty_slate';
const STORAGE_KEY_PASSES = 'gatepass_client_passes_v8_fresh_empty_slate';
const STORAGE_KEY_LATE_ARRIVALS = 'gatepass_client_late_arrivals_v8_fresh_empty_slate';
const STORAGE_KEY_SESSION = 'gatepass_client_session_v8_fresh_empty_slate';
const STORAGE_SEED_KEY = 'gatepass_seeded_v8_fresh_empty_slate';

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
  private lateArrivals: LateArrival[];
  private listeners: Array<() => void> = [];

  constructor() {
    // Thoroughly purge old test storage keys from all previous versions
    if (typeof localStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith('gatepass_') || key.startsWith('gate_')) &&
            !key.includes('_v8_fresh_empty_slate')
          ) {
            keysToRemove.push(key);
          }
        }
        for (const k of keysToRemove) {
          localStorage.removeItem(k);
        }
      } catch {
        // ignore
      }
    }

    const loadedSchools = this.load<School[]>(STORAGE_KEY_SCHOOLS, INITIAL_SCHOOLS);
    this.schools = Array.isArray(loadedSchools)
      ? loadedSchools.filter((s) => s && !isDemoSchool(s))
      : [];
    this.activeSchoolId = this.load<string>(STORAGE_KEY_ACTIVE_SCHOOL, this.schools[0]?.id || '');
    if (!this.schools.some((s) => s.id === this.activeSchoolId)) {
      this.activeSchoolId = this.schools[0]?.id || '';
    }

    const loadedStaff = this.load<StaffMember[]>(STORAGE_KEY_STAFF, INITIAL_STAFF);
    this.staff = Array.isArray(loadedStaff) && loadedStaff.length > 0
      ? loadedStaff.filter((s: StaffMember) => s && !isDemoStaff(s))
      : JSON.parse(JSON.stringify(INITIAL_STAFF));

    const loadedStudents = this.load<Student[]>(STORAGE_KEY_STUDENTS, INITIAL_STUDENTS);
    this.students = deduplicateStudents(
      Array.isArray(loadedStudents) && loadedStudents.length > 0
        ? loadedStudents.filter((st) => st && !isDemoStudent(st))
        : INITIAL_STUDENTS
    );

    const loadedPasses = this.load<GatePass[]>(STORAGE_KEY_PASSES, INITIAL_PASSES);
    this.passes = Array.isArray(loadedPasses)
      ? loadedPasses.filter((p) => p && !isDemoPass(p))
      : [];

    const loadedLate = this.load<LateArrival[]>(STORAGE_KEY_LATE_ARRIVALS, []);
    this.lateArrivals = Array.isArray(loadedLate) ? loadedLate : [];

    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.save(STORAGE_KEY_LATE_ARRIVALS, this.lateArrivals);
    this.save(STORAGE_KEY_SCHOOLS, this.schools);
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);

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

      // Realtime multi-device sync with Firestore (Read-only listeners with quota error handling)
      try {
        // 1. Schools realtime listener
        const schoolsRef = collection(firestoreDb, FS_COLLECTION_SCHOOLS);
        onSnapshot(
          schoolsRef,
          (snapshot) => {
            if (!snapshot.empty) {
              const remoteSchools: School[] = [];
              snapshot.forEach((docSnap) => {
                const s = docSnap.data() as School;
                if (!s || !s.id || isDemoSchool(s)) return;
                remoteSchools.push(s);
              });
              if (remoteSchools.length > 0) {
                const map = new Map(this.schools.map((s) => [s.id, s]));
                for (const rs of remoteSchools) {
                  if (!isDemoSchool(rs)) map.set(rs.id, rs);
                }
                this.schools = Array.from(map.values()).filter((s) => s && !isDemoSchool(s));
                this.ensureSchoolIntegrity();
                this.save(STORAGE_KEY_SCHOOLS, this.schools);
                this.notify();
              }
            }
          },
          (err) => {
            handleFirestoreQuotaError(err);
          }
        );

        // 2. Staff realtime listener
        const staffRef = collection(firestoreDb, FS_COLLECTION_STAFF);
        onSnapshot(
          staffRef,
          (snapshot) => {
            if (!snapshot.empty) {
              const remoteStaff: StaffMember[] = [];
              snapshot.forEach((docSnap) => {
                const st = docSnap.data() as StaffMember;
                if (!st || !st.id || isDemoStaff(st)) return;
                remoteStaff.push(st);
              });
              const map = new Map(this.staff.map((s) => [s.id, s]));
              for (const rst of remoteStaff) {
                if (!isDemoStaff(rst)) map.set(rst.id, rst);
              }
              this.staff = Array.from(map.values()).filter((st) => st && !isDemoStaff(st));
              this.ensureEssentialStaff();
              this.save(STORAGE_KEY_STAFF, this.staff);
              this.notify();
            }
          },
          (err) => {
            handleFirestoreQuotaError(err);
          }
        );

        // 3. Students realtime listener
        const studentsRef = collection(firestoreDb, FS_COLLECTION_STUDENTS);
        onSnapshot(
          studentsRef,
          (snapshot) => {
            if (!snapshot.empty) {
              const remoteStudents: Student[] = [];
              snapshot.forEach((docSnap) => {
                const stud = docSnap.data() as Student;
                if (!stud || !stud.id || isDemoStudent(stud)) return;
                remoteStudents.push(stud);
              });
              this.students = deduplicateStudents([...this.students, ...remoteStudents]);
              this.save(STORAGE_KEY_STUDENTS, this.students);
              this.notify();
            }
          },
          (err) => {
            handleFirestoreQuotaError(err);
          }
        );

        // 4. Passes realtime listener
        const passesRef = collection(firestoreDb, FS_COLLECTION_PASSES);
        const q = query(passesRef, orderBy('createdAt', 'desc'), limit(150));
        onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const remotePasses: GatePass[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data() as GatePass;
                if (!data || !data.id || isDemoPass(data)) return;
                remotePasses.push(data);
              });
              const existingMap = new Map(this.passes.map((p) => [p.id, p]));
              for (const rp of remotePasses) {
                if (!isDemoPass(rp)) existingMap.set(rp.id, rp);
              }
              this.passes = Array.from(existingMap.values())
                .filter((p) => p && !isDemoPass(p))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
              this.save(STORAGE_KEY_PASSES, this.passes);
              this.notify();
            }
          },
          (err) => {
            handleFirestoreQuotaError(err);
          }
        );
        // 5. Cloud State Bundle realtime listener (guarantees GitHub Pages and smartphones receive 100% of data in 1 single read)
        try {
          const bundleRef = doc(firestoreDb, FS_BUNDLE_COLLECTION, FS_BUNDLE_DOC_ID);
          onSnapshot(
            bundleRef,
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                let changed = false;
                if (Array.isArray(data.schools) && data.schools.length > 0) {
                  if (this.schools.length === 0 || data.schools.length >= this.schools.length) {
                    this.schools = data.schools.filter((s: any) => s && !isDemoSchool(s));
                    this.save(STORAGE_KEY_SCHOOLS, this.schools);
                    changed = true;
                  }
                }
                if (data.activeSchoolId && (!this.activeSchoolId || this.schools.some((s) => s.id === data.activeSchoolId))) {
                  this.activeSchoolId = data.activeSchoolId;
                  this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
                  changed = true;
                }
                if (Array.isArray(data.staff) && data.staff.length > 0) {
                  const staffMap = new Map(this.staff.map((s) => [s.id, s]));
                  for (const st of data.staff) {
                    if (st && st.id && !isDemoStaff(st)) staffMap.set(st.id, st);
                  }
                  this.staff = Array.from(staffMap.values());
                  this.ensureEssentialStaff();
                  this.save(STORAGE_KEY_STAFF, this.staff);
                  changed = true;
                }
                if (Array.isArray(data.students) && data.students.length > 0) {
                  this.students = deduplicateStudents([...this.students, ...data.students]);
                  this.save(STORAGE_KEY_STUDENTS, this.students);
                  changed = true;
                }
                if (Array.isArray(data.passes)) {
                  this.passes = data.passes.filter((p: any) => p && !isDemoPass(p));
                  this.save(STORAGE_KEY_PASSES, this.passes);
                  changed = true;
                }
                if (changed) {
                  this.notify();
                }
              }
            },
            () => {}
          );
        } catch {
          // ignore
        }
      } catch (err) {
        handleFirestoreQuotaError(err);
      }

      // Auto-sync with server state and cloud bundle
      setTimeout(() => {
        if (this.students.length > 0) {
          this.pushStateToServer();
          if (!isFirestoreQuotaExhausted) {
            this.syncBundleToCloud();
          }
        } else {
          this.fetchBundleFromCloud().then((found) => {
            if (!found) {
              this.pullStateFromServer();
            }
          });
        }
      }, 60);
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
    const rawSchools = this.load<School[]>(STORAGE_KEY_SCHOOLS, INITIAL_SCHOOLS);
    this.schools = Array.isArray(rawSchools) && rawSchools.length > 0
      ? rawSchools.filter((s: School) => s && !isDemoSchool(s))
      : JSON.parse(JSON.stringify(INITIAL_SCHOOLS));
    if (this.schools.length === 0 && INITIAL_SCHOOLS.length > 0) {
      this.schools = JSON.parse(JSON.stringify(INITIAL_SCHOOLS));
    }
    this.activeSchoolId = this.load<string>(STORAGE_KEY_ACTIVE_SCHOOL, SEEDED_ACTIVE_SCHOOL_ID || this.schools[0]?.id || '');
    if (!this.schools.some((s) => s.id === this.activeSchoolId)) {
      this.activeSchoolId = this.schools[0]?.id || SEEDED_ACTIVE_SCHOOL_ID || '';
    }

    const rawStaff = this.load<StaffMember[]>(STORAGE_KEY_STAFF, INITIAL_STAFF);
    this.staff = (Array.isArray(rawStaff) && rawStaff.length > 0 ? rawStaff : JSON.parse(JSON.stringify(INITIAL_STAFF))).filter(
      (s: StaffMember) => s && !isDemoStaff(s)
    );
    if (this.staff.length <= 1 && INITIAL_STAFF.length > 1) {
      this.staff = JSON.parse(JSON.stringify(INITIAL_STAFF));
    }

    const rawStudents = this.load<Student[]>(STORAGE_KEY_STUDENTS, INITIAL_STUDENTS);
    this.students = deduplicateStudents(
      Array.isArray(rawStudents) && rawStudents.length > 0 ? rawStudents : INITIAL_STUDENTS
    );
    if (this.students.length === 0 && INITIAL_STUDENTS.length > 0) {
      this.students = deduplicateStudents(JSON.parse(JSON.stringify(INITIAL_STUDENTS)));
    }

    const rawPasses = this.load<GatePass[]>(STORAGE_KEY_PASSES, []);
    this.passes = (Array.isArray(rawPasses) ? rawPasses : []).filter(
      (p: GatePass) => p && !isDemoPass(p)
    );

    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.ensureSchoolIntegrity();
    this.ensureEssentialStaff();
  }

  public async pushStateToServer(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:') return;
    try {
      await fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schools: this.schools,
          staff: this.staff,
          students: this.students,
          activeSchoolId: this.activeSchoolId,
          passes: this.passes,
        }),
      });
    } catch {
      // ignore
    }
  }

  public async pullStateFromServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:') return false;
    try {
      const res = await fetch('/api/sync/state');
      if (!res.ok) return false;
      const data = await res.json();
      let changed = false;

      if (Array.isArray(data.schools) && data.schools.length > 0) {
        if (this.schools.length === 0 || data.schools.length > this.schools.length) {
          this.schools = data.schools;
          this.save(STORAGE_KEY_SCHOOLS, this.schools);
          changed = true;
        }
      }

      if (data.activeSchoolId && (!this.activeSchoolId || !this.schools.some((s) => s.id === data.activeSchoolId))) {
        this.activeSchoolId = data.activeSchoolId;
        this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
        changed = true;
      }

      if (Array.isArray(data.staff) && data.staff.length > 0) {
        const staffMap = new Map(this.staff.map((s) => [s.id, s]));
        for (const st of data.staff) {
          if (st && st.id && !staffMap.has(st.id)) {
            staffMap.set(st.id, st);
            changed = true;
          }
        }
        if (changed) {
          this.staff = Array.from(staffMap.values());
          this.ensureEssentialStaff();
          this.save(STORAGE_KEY_STAFF, this.staff);
        }
      }

      if (Array.isArray(data.students) && data.students.length > 0) {
        this.students = deduplicateStudents([...this.students, ...data.students]);
        this.save(STORAGE_KEY_STUDENTS, this.students);
        changed = true;
      }

      if (Array.isArray(data.passes)) {
        this.passes = data.passes.filter((p: any) => p && !isDemoPass(p));
        this.save(STORAGE_KEY_PASSES, this.passes);
        changed = true;
      }

      if (changed) {
        this.notify();
      }
      return changed;
    } catch {
      return false;
    }
  }

  public async syncBundleToCloud(): Promise<boolean> {
    if (isFirestoreQuotaExhausted || !firestoreDb) return false;
    if (this.schools.length === 0 && this.students.length === 0 && this.staff.length <= 1) return false;

    try {
      const bundleRef = doc(firestoreDb, FS_BUNDLE_COLLECTION, FS_BUNDLE_DOC_ID);
      const payload: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };
      if (this.schools.length > 0) payload.schools = this.schools;
      if (this.staff.length > 0) payload.staff = this.staff;
      if (this.students.length > 0) payload.students = this.students;
      if (this.activeSchoolId) payload.activeSchoolId = this.activeSchoolId;
      payload.passes = this.passes || [];

      await setDoc(bundleRef, payload, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreQuotaError(e);
      return false;
    }
  }

  public async fetchBundleFromCloud(): Promise<boolean> {
    if (!firestoreDb) return false;
    try {
      const bundleRef = doc(firestoreDb, FS_BUNDLE_COLLECTION, FS_BUNDLE_DOC_ID);
      const snap = await getDoc(bundleRef);
      if (!snap.exists()) return false;

      const data = snap.data();
      let changed = false;

      if (Array.isArray(data.schools) && data.schools.length > 0) {
        if (this.schools.length === 0 || data.schools.length >= this.schools.length) {
          this.schools = data.schools.filter((s: any) => s && !isDemoSchool(s));
          this.save(STORAGE_KEY_SCHOOLS, this.schools);
          changed = true;
        }
      }

      if (data.activeSchoolId && (!this.activeSchoolId || this.schools.some((s) => s.id === data.activeSchoolId))) {
        this.activeSchoolId = data.activeSchoolId;
        this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
        changed = true;
      }

      if (Array.isArray(data.staff) && data.staff.length > 0) {
        const staffMap = new Map(this.staff.map((s) => [s.id, s]));
        for (const st of data.staff) {
          if (st && st.id && !isDemoStaff(st)) staffMap.set(st.id, st);
        }
        this.staff = Array.from(staffMap.values());
        this.ensureEssentialStaff();
        this.save(STORAGE_KEY_STAFF, this.staff);
        changed = true;
      }

      if (Array.isArray(data.students) && data.students.length > 0) {
        this.students = deduplicateStudents([...this.students, ...data.students]);
        this.save(STORAGE_KEY_STUDENTS, this.students);
        changed = true;
      }

      if (Array.isArray(data.passes)) {
        this.passes = data.passes.filter((p: any) => p && !isDemoPass(p));
        this.save(STORAGE_KEY_PASSES, this.passes);
        changed = true;
      }

      if (changed) {
        this.notify();
      }
      return changed;
    } catch {
      return false;
    }
  }

  public async importSystemBackup(data: {
    schools?: School[];
    staff?: StaffMember[];
    students?: Student[];
    activeSchoolId?: string;
  }): Promise<boolean> {
    if (Array.isArray(data.schools) && data.schools.length > 0) {
      this.schools = data.schools.filter((s) => s && !isDemoSchool(s));
      this.save(STORAGE_KEY_SCHOOLS, this.schools);
    }
    if (data.activeSchoolId) {
      this.activeSchoolId = data.activeSchoolId;
      this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    }
    if (Array.isArray(data.staff) && data.staff.length > 0) {
      this.staff = data.staff.filter((s) => s && !isDemoStaff(s));
      this.ensureEssentialStaff();
      this.deduplicateStaffPins();
      this.save(STORAGE_KEY_STAFF, this.staff);
    }
    if (Array.isArray(data.students) && data.students.length > 0) {
      this.students = deduplicateStudents(data.students);
      this.save(STORAGE_KEY_STUDENTS, this.students);
    }
    this.broadcastChange();
    await this.syncBundleToCloud();
    await this.pushStateToServer();
    return true;
  }

  private ensureSchoolIntegrity() {
    let changed = false;

    // Filter out any dummy placeholder or old demo schools
    const prevCount = this.schools.length;
    this.schools = this.schools.filter((s) => s && !isDemoSchool(s));
    if (this.schools.length !== prevCount) {
      changed = true;
    }

    if (this.schools.length === 0) {
      if (this.activeSchoolId !== '') {
        this.activeSchoolId = '';
        changed = true;
      }
    } else if (!this.schools.some((s) => s.id === this.activeSchoolId)) {
      this.activeSchoolId = this.schools[0]?.id || '';
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

  public deduplicateStaffPins(): boolean {
    const seenPins = new Set<string>();
    seenPins.add('160525'); // Amar Faour Super Admin reserved PIN
    let changed = false;

    for (const member of this.staff) {
      if (!member) continue;
      if (member.role === 'admin' && member.pinCode === '160525') continue;

      const currentPin = (member.pinCode || '').trim();
      if (!currentPin || seenPins.has(currentPin) || currentPin === '160525') {
        const uniquePin = generateUniquePin(seenPins);
        member.pinCode = uniquePin;
        seenPins.add(uniquePin);
        changed = true;
      } else {
        seenPins.add(currentPin);
      }
    }

    if (changed) {
      this.save(STORAGE_KEY_STAFF, this.staff);
      for (const m of this.staff) {
        if (m && m.id) {
          this.syncStaffToFirestore(m);
        }
      }
    }
    return changed;
  }

  private ensureEssentialStaff() {
    let changed = false;

    // Ensure all essential staff from INITIAL_STAFF are present and active
    for (const initMember of INITIAL_STAFF) {
      const existing = this.staff.find((s) => s.pinCode === initMember.pinCode || s.id === initMember.id);
      if (!existing) {
        this.staff.push(JSON.parse(JSON.stringify(initMember)));
        changed = true;
      } else {
        if (!existing.isActive) {
          existing.isActive = true;
          changed = true;
        }
        if (initMember.role === 'admin') {
          existing.schoolId = '*';
          existing.role = 'admin';
        }
      }
    }

    // Automatically deduplicate any staff PIN collisions
    if (this.deduplicateStaffPins()) {
      changed = true;
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
    if (isFirestoreQuotaExhausted || !firestoreDb || !school || !school.id) return;
    try {
      setDoc(doc(firestoreDb, FS_COLLECTION_SCHOOLS, school.id), school, { merge: true }).catch(handleFirestoreQuotaError);
    } catch (e) {
      handleFirestoreQuotaError(e);
    }
  }

  public deleteSchoolFromFirestore(schoolId: string): void {
    if (isFirestoreQuotaExhausted || !firestoreDb || !schoolId) return;
    try {
      deleteDoc(doc(firestoreDb, FS_COLLECTION_SCHOOLS, schoolId)).catch(handleFirestoreQuotaError);
    } catch (e) {
      handleFirestoreQuotaError(e);
    }
  }

  public syncStaffToFirestore(member: StaffMember): void {
    if (isFirestoreQuotaExhausted || !firestoreDb || !member || !member.id) return;
    try {
      setDoc(doc(firestoreDb, FS_COLLECTION_STAFF, member.id), member, { merge: true }).catch(handleFirestoreQuotaError);
    } catch (e) {
      handleFirestoreQuotaError(e);
    }
  }

  public deleteStaffFromFirestore(staffId: string): void {
    if (isFirestoreQuotaExhausted || !firestoreDb || !staffId) return;
    try {
      deleteDoc(doc(firestoreDb, FS_COLLECTION_STAFF, staffId)).catch(handleFirestoreQuotaError);
    } catch (e) {
      handleFirestoreQuotaError(e);
    }
  }

  public syncStudentToFirestore(student: Student): void {
    if (isFirestoreQuotaExhausted || !firestoreDb || !student || !student.id) return;
    try {
      setDoc(doc(firestoreDb, FS_COLLECTION_STUDENTS, student.id), student, { merge: true }).catch(handleFirestoreQuotaError);
    } catch (e) {
      handleFirestoreQuotaError(e);
    }
  }

  public deleteStudentFromFirestore(studentId: string): void {
    if (isFirestoreQuotaExhausted || !firestoreDb || !studentId) return;
    try {
      deleteDoc(doc(firestoreDb, FS_COLLECTION_STUDENTS, studentId)).catch(handleFirestoreQuotaError);
    } catch (e) {
      handleFirestoreQuotaError(e);
    }
  }

  public syncPassToFirestore(pass: GatePass): void {
    if (isFirestoreQuotaExhausted || !firestoreDb || !pass || !pass.id) return;
    try {
      setDoc(doc(firestoreDb, FS_COLLECTION_PASSES, pass.id), pass, { merge: true }).catch((err) => {
        handleFirestoreQuotaError(err);
      });
    } catch (e) {
      handleFirestoreQuotaError(e);
    }
  }

  public syncLocalToCloud(): void {
    if (isFirestoreQuotaExhausted || !firestoreDb) return;
    try {
      this.syncBundleToCloud();
      for (const s of this.schools) {
        if (s && s.id) {
          this.syncSchoolToFirestore(s);
        }
      }
      for (const m of this.staff) {
        if (m && m.id) {
          this.syncStaffToFirestore(m);
        }
      }
      for (const st of this.students) {
        if (st && st.id) {
          this.syncStudentToFirestore(st);
        }
      }
    } catch (e) {
      handleFirestoreQuotaError(e);
    }
  }

  private broadcastChange() {
    this.save(STORAGE_KEY_SCHOOLS, this.schools);
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.save(STORAGE_KEY_STUDENTS, this.students);
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
      if (stored && !stored.includes('בית ספר מקיף') && !stored.includes('תיכון אבן סינא')) {
        const match = this.schools.find((s) => s.name === stored);
        if (match) return match.name;
      }
    }
    return this.schools[0]?.name || '';
  }

  public setActiveSchoolId(schoolId: string): { success: boolean; activeSchoolId: string; activeSchoolName: string } {
    if (!schoolId) {
      this.activeSchoolId = '';
      this.save(STORAGE_KEY_ACTIVE_SCHOOL, '');
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('gate_school_name');
      }
      this.broadcastChange();
      return { success: true, activeSchoolId: '', activeSchoolName: '' };
    }
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

  public syncSchoolsFromServer(serverSchools: School[], activeSchoolId?: string) {
    if (!Array.isArray(serverSchools) || serverSchools.length === 0) return;
    for (const ss of serverSchools) {
      if (!ss || !ss.id) continue;
      const existing = this.schools.find((s) => s.id === ss.id);
      if (existing) {
        Object.assign(existing, ss);
      } else {
        this.schools.push(ss);
      }
    }
    if (activeSchoolId && this.schools.some((s) => s.id === activeSchoolId)) {
      this.activeSchoolId = activeSchoolId;
    } else if (!this.activeSchoolId && this.schools.length > 0) {
      this.activeSchoolId = this.schools[0].id;
    }
    this.save(STORAGE_KEY_SCHOOLS, this.schools);
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    this.broadcastChange();
  }

  public syncSchoolFromServer(school: School) {
    if (!school || !school.id) return;
    const existing = this.schools.find((s) => s.id === school.id);
    if (existing) {
      Object.assign(existing, school);
    } else {
      this.schools.push(school);
    }
    this.activeSchoolId = school.id;
    this.save(STORAGE_KEY_SCHOOLS, this.schools);
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    this.broadcastChange();
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
    const initialStatus = data.status || 'active';
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
      isSuspended: false,
      createdAt: new Date().toISOString(),
    };

    this.schools.push(newSchool);

    // Coordinator (Vice Principal / Secretary) assigned guaranteed unique personal PIN
    const vpPin = generateUniquePin(this.staff, data.contactPin?.trim());
    const tempUsedPins = new Set(this.staff.map((s) => s.pinCode).filter(Boolean) as string[]);
    tempUsedPins.add(vpPin);
    const guardPin = generateUniquePin(tempUsedPins);
    const vpTitle = data.contactRole?.trim() || 'סגן מנהל / אחראי מערכת';
    const coordinatorDisplay = fullNameContact ? `${fullNameContact} (${vpTitle})` : `${vpTitle} (${newSchool.name})`;

    // External staff start active immediately
    const staffShouldBeActive = true;

    const vpMember: StaffMember = {
      id: `staff-vp-${schoolId}`,
      staffCode: `VP0${this.schools.length}`,
      fullName: coordinatorDisplay,
      role: 'vice_principal',
      pinCode: vpPin,
      phone: data.phone?.trim() || '',
      assignedClasses: ['*'],
      isActive: staffShouldBeActive,
      schoolId: schoolId,
    };

    const guardMember: StaffMember = {
      id: `staff-guard-${schoolId}`,
      staffCode: `G0${this.schools.length}`,
      fullName: `שומר שער (${newSchool.name})`,
      role: 'guard',
      pinCode: guardPin,
      assignedClasses: [],
      isActive: staffShouldBeActive,
      schoolId: schoolId,
    };

    this.staff.push(vpMember, guardMember);

    this.activeSchoolId = schoolId;
    this.save(STORAGE_KEY_SCHOOLS, this.schools);
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    this.save(STORAGE_KEY_STAFF, this.staff);

    this.syncSchoolToFirestore(newSchool);
    this.syncStaffToFirestore(vpMember);
    this.syncStaffToFirestore(guardMember);

    this.broadcastChange();
    this.pushStateToServer();
    this.syncBundleToCloud();
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
    this.pushStateToServer();
    this.syncBundleToCloud();
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

  public activateSchoolByCode(code: string): { success: boolean; school: School; message: string; matchedStaff?: StaffMember } {
    const clean = this.normalizePin(code).toUpperCase();
    if (!clean) {
      throw new Error('אנא הזן קוד הפעלה בית ספרי או קוד גישה אישי');
    }

    let school = this.schools.find(
      (s) => (s.activationCode || '').toUpperCase() === clean || (s.code || '').toUpperCase() === clean
    );

    // Fallback 1: Check if user typed a staff member's personal PIN (e.g., teacher or guard)
    let matchedStaff: StaffMember | undefined;
    if (!school) {
      const staffFound = this.staff.find((s) => s.pinCode === clean);
      if (staffFound) {
        matchedStaff = staffFound;
        if (staffFound.schoolId && staffFound.schoolId !== '*') {
          school = this.schools.find((s) => s.id === staffFound.schoolId);
        } else if (this.schools.length > 0) {
          school = this.schools[0];
        }
      }
    }

    if (!school) {
      throw new Error('קוד הפעלה בית ספרי שגוי. אנא ודא את הקוד שקיבלת מעמאר פאעור.');
    }

    if (school.status === 'suspended') {
      throw new Error(`מנוי בית הספר "${school.name}" מוקפא עקב אי-תשלום. לחידוש המנוי יש לפנות לעמאר פאעור.`);
    }

    if (school.status === 'cancelled') {
      throw new Error(`מנוי בית הספר "${school.name}" בוטל לצמיתות.`);
    }

    // Auto-approve and ensure school and staff are active
    school.status = 'active';
    school.isSuspended = false;
    for (const member of this.staff) {
      if (member.schoolId === school.id || member.schoolId === '*') {
        member.isActive = true;
      }
    }

    this.activeSchoolId = school.id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SCHOOL, school.id);
      localStorage.setItem('gate_school_name', school.name);
      localStorage.setItem('gate_activated_school_id', school.id);
      localStorage.setItem('gate_activated_school_code', school.activationCode);
    }

    this.save(STORAGE_KEY_SCHOOLS, this.schools);
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.broadcastChange();

    const msg = matchedStaff
      ? `זוהה קוד אישי של ${matchedStaff.fullName}! בית הספר "${school.name}" הופעל בהצלחה במכשיר זה.`
      : `בית הספר "${school.name}" הופעל בהצלחה במכשיר זה! כעת ניתן להיכנס עם הקוד האישי שלך.`;

    return {
      success: true,
      school,
      matchedStaff,
      message: msg,
    };
  }

  public rollSchoolPins(schoolId: string): { success: boolean; count: number; message: string } {
    const school = this.schools.find((s) => s.id === schoolId);
    const schoolName = school?.name || 'בית הספר';

    let count = 0;
    const tempPins = new Set(
      this.staff
        .filter((s) => s.schoolId !== schoolId || s.pinCode === '160525')
        .map((s) => s.pinCode)
        .filter(Boolean) as string[]
    );
    tempPins.add('160525');

    for (const member of this.staff) {
      if (member.schoolId === schoolId && member.pinCode !== '160525' && member.role !== 'admin') {
        const newPin = generateUniquePin(tempPins);
        member.pinCode = newPin;
        tempPins.add(newPin);
        count++;
      }
    }

    this.deduplicateStaffPins();
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.broadcastChange();
    return {
      success: true,
      count,
      message: `הוגרלו קודים סודיים חדשים עבור ${count} אנשי צוות ב"${schoolName}". כל קוד הינו ייחודי לחלוטין!`,
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

    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.broadcastChange();
    this.syncBundleToCloud();
    this.pushStateToServer();
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
    return 'מחנכת כיתה';
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
      member = this.staff.find((s) => s.pinCode === clean && (s.schoolId === targetSchoolId || s.schoolId === '*'));
    }
    if (!member) {
      member = this.staff.find((s) => s.pinCode === clean);
    }


    // If entered code is a school activation code, activate the school and inform the user
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
        this.save(STORAGE_KEY_SCHOOLS, this.schools);
        this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
        this.broadcastChange();
        throw new Error(`בית הספר "${schoolByCode.name}" הופעל בהצלחה במכשיר זה! אנא הקש כעת את קוד הגישה האישי הסודי שלך (4 ספרות).`);
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

  public setSessionUser(user: User): void {
    if (typeof localStorage !== 'undefined' && user) {
      try {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
      } catch {
        // ignore
      }
    }
  }

  public getPassById(passId: string): GatePass | undefined {
    return this.passes.find((p) => p.id === passId);
  }

  public mergeRemotePasses(remotePasses: GatePass[]): void {
    if (!Array.isArray(remotePasses) || remotePasses.length === 0) return;
    const existingMap = new Map(this.passes.map((p) => [p.id, p]));
    let changed = false;
    for (const rp of remotePasses) {
      if (!rp || !rp.id || isDemoPass(rp)) continue;
      const current = existingMap.get(rp.id);
      if (
        !current ||
        current.status !== rp.status ||
        current.usedAt !== rp.usedAt ||
        current.cancelledAt !== rp.cancelledAt
      ) {
        existingMap.set(rp.id, { ...current, ...rp });
        changed = true;
      }
    }
    if (changed) {
      this.passes = Array.from(existingMap.values())
        .filter((p) => p && !isDemoPass(p))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      this.save(STORAGE_KEY_PASSES, this.passes);
      this.notify();
    }
  }

  public updateStudentParentPhone(studentId: string, parentPhone: string): void {
    const student = this.students.find((s) => s.id === studentId);
    if (student) {
      student.parentPhone = parentPhone.trim();
      this.save(STORAGE_KEY_STUDENTS, this.students);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(`gatepass_parent_phone_${studentId}`, parentPhone.trim());
        } catch {
          // ignore
        }
      }
      this.broadcastChange();
      this.notify();
    }
  }

  public getParentPhone(studentId: string): string {
    const student = this.students.find((s) => s.id === studentId);
    if (student?.parentPhone) return student.parentPhone;
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(`gatepass_parent_phone_${studentId}`) || '';
      } catch {
        // ignore
      }
    }
    return '';
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
    const hasAll = isSuper || (user.assignedClasses && (user.assignedClasses.includes('*') || user.assignedClasses.includes('כל הכיתות')));

    const schoolScope = user.schoolId && user.schoolId !== '*' ? user.schoolId : null;
    const defaultScope = this.activeSchoolId || this.schools[0]?.id || 'school-yanuh';

    let students = schoolScope
      ? this.students.filter((s) => (s.schoolId || defaultScope) === schoolScope)
      : this.students;

    // Safety fallback: If scoped filter yielded 0 students but this.students has students, use this.students
    if (students.length === 0 && this.students.length > 0) {
      students = this.students;
    }

    const normClass = (c: string) =>
      (c || '')
        .replace(/^כיתה\s*/i, '')
        .replace(/['"`׳״\s]/g, '')
        .toLowerCase();

    if (!hasAll) {
      const assignedNorm = (user.assignedClasses || []).map(normClass).filter(Boolean);
      const userCleanName = (user.fullName || '').trim().toLowerCase();

      const matchedStudents = students.filter((s) => {
        const studentClassNorm = normClass(s.className);
        const matchClass = assignedNorm.includes(studentClassNorm);

        const studentTeacherNorm = (s.teacherName || '').trim().toLowerCase();
        const matchTeacher =
          studentTeacherNorm && userCleanName && (
            studentTeacherNorm.includes(userCleanName) ||
            userCleanName.includes(studentTeacherNorm)
          );

        return matchClass || matchTeacher;
      });

      students = matchedStudents;
    }

    // Extract real unique class names from students
    const studentClasses = Array.from(new Set(students.map((s) => s.className))).filter(Boolean).sort();
    const cleanUserClasses = (user.assignedClasses || []).filter((c) => c && c !== '*' && c !== 'כל הכיתות');
    const classes = Array.from(new Set([...cleanUserClasses, ...studentClasses])).filter(Boolean).sort();

    const today = getClientIsraelDateString();
    const todayPasses = this.passes.filter((p) => {
      if (p.dateStr !== today) return false;
      if (schoolScope && (p.schoolId || defaultScope) !== schoolScope) return false;
      return true;
    });

    // Priority: 'used' first, 'active' second, 'cancelled' last, newest created first
    const sortedTodayPasses = [...todayPasses].sort((a, b) => {
      if (a.status === 'used' && b.status !== 'used') return -1;
      if (b.status === 'used' && a.status !== 'used') return 1;
      if (a.status === 'active' && b.status === 'cancelled') return -1;
      if (b.status === 'active' && a.status === 'cancelled') return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const passByStudent = new Map<string, GatePass>();
    for (const p of sortedTodayPasses) {
      if (!passByStudent.has(p.studentId)) {
        passByStudent.set(p.studentId, p);
      }
    }

    const enriched = students.map((s) => ({
      ...s,
      currentPass: passByStudent.get(s.id) || null,
    }));

    return {
      assignedClasses: classes,
      teacherName: user.fullName,
      students: deduplicateStudents(enriched),
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
      if (isSuper || user.assignedClasses.includes('*') || user.assignedClasses.includes('כל הכיתות')) return true;
      return (
        p.teacherId === user.id ||
        user.assignedClasses.includes(p.className) ||
        p.teacherName === user.fullName ||
        p.homeroomTeacher === user.fullName ||
        p.createdBy === user.fullName ||
        (user.fullName && (p.teacherName?.includes(user.fullName) || p.homeroomTeacher?.includes(user.fullName)))
      );
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

      // Instant push to Firestore gatepasses document (guarded by quota check)
      this.syncPassToFirestore(pass);
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

    this.syncPassToFirestore(pass);
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

  public getAllStudents(schoolId?: string): Student[] {
    const target = schoolId || this.activeSchoolId;
    const all = deduplicateStudents(Array.isArray(this.students) ? this.students : []);
    if (!target || target === '*') {
      return all;
    }
    return all.filter((s) => !s.schoolId || s.schoolId === target);
  }

  public searchGuard(queryStr = ''): { results: GuardSearchResult[]; currentTime: string } {
    const q = queryStr.trim().toLowerCase();
    const today = getClientIsraelDateString();
    const nowTime = getClientIsraelTimeString();

    const todayPasses = this.passes.filter((p) => p.dateStr === today);

    // Prioritize active and used passes over cancelled passes so re-issued passes always win
    const sortedTodayPasses = [...todayPasses].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      if (a.status === 'used' && b.status === 'cancelled') return -1;
      if (b.status === 'used' && a.status === 'cancelled') return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const passByStudent = new Map<string, GatePass>();
    for (const p of sortedTodayPasses) {
      if (!passByStudent.has(p.studentId)) {
        passByStudent.set(p.studentId, p);
      }
    }

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

  public markExit(guardUser: User, passId: string, fallbackPass?: Partial<GatePass>): { success: boolean; pass: GatePass; message: string } {
    let pass = this.passes.find((p) => p.id === passId);
    if (!pass && fallbackPass && fallbackPass.id) {
      pass = fallbackPass as GatePass;
      this.passes.unshift(pass);
    }

    const nowIso = new Date().toISOString();
    const guardName = guardUser?.fullName || 'שומר שער';

    if (!pass) {
      // Even if pass isn't in local memory yet, update Firestore directly
      if (!isFirestoreQuotaExhausted && firestoreDb && passId) {
        setDoc(
          doc(firestoreDb, FS_COLLECTION_PASSES, passId),
          {
            status: 'used',
            usedAt: nowIso,
            usedBy: guardName,
          },
          { merge: true }
        ).catch((err) => {
          handleFirestoreQuotaError(err);
        });
      }

      this.broadcastChange();
      return {
        success: true,
        pass: {
          id: passId,
          status: 'used',
          usedAt: nowIso,
          usedBy: guardName,
        } as any,
        message: 'היציאה נרשמה בהצלחה בשער',
      };
    }

    if (pass.status === 'cancelled') {
      const activePass = this.passes.find(
        (p) => p.studentId === pass!.studentId && p.dateStr === pass!.dateStr && p.status === 'active'
      );
      if (activePass) {
        pass = activePass;
      } else {
        throw new Error('האישור בוטל ולא ניתן לסמן יציאה');
      }
    }
    if (pass.status === 'used') {
      return {
        success: true,
        pass,
        message: `התלמיד ${pass.studentName} כבר סומן כמי שיצא מהשער`,
      };
    }

    pass.status = 'used';
    pass.usedAt = nowIso;
    pass.usedBy = guardName;

    this.syncPassToFirestore(pass);

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
    const currentSchoolId = this.activeSchoolId || this.schools[0]?.id || '';
    if (currentSchoolId && currentSchoolId !== '*') {
      const otherStaff = this.staff.filter(
        (s) => (s.schoolId || currentSchoolId) !== currentSchoolId && s.schoolId !== '*'
      );
      this.staff = [...otherStaff, ...staffList];
    } else {
      this.staff = staffList;
    }
    this.ensureEssentialStaff();
    this.save(STORAGE_KEY_STAFF, this.staff);

    // Sync all staff to Firestore so GitHub Pages & all smartphones receive them immediately
    for (const member of this.staff) {
      if (member && member.id) {
        this.syncStaffToFirestore(member);
      }
    }

    this.broadcastChange();
    this.pushStateToServer();
    this.syncBundleToCloud();
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
    this.save(STORAGE_KEY_PASSES, this.passes);

    // Attempt deletion from Firestore
    try {
      for (const p of toDelete) {
        deleteDoc(doc(firestoreDb, FS_COLLECTION_PASSES, p.id)).catch(() => {});
      }
    } catch {
      // ignore
    }

    this.broadcastChange();
    this.syncBundleToCloud();
    this.pushStateToServer();
    return { success: true, deletedCount: toDelete.length };
  }

  public deleteLateArrivals(options: {
    all?: boolean;
    arrivalIds?: string[];
    fromDate?: string;
    toDate?: string;
    schoolId?: string;
  }): { success: boolean; deletedCount: number } {
    const list = this.getLateArrivals();
    const targetSchoolId = options.schoolId || this.activeSchoolId || this.schools[0]?.id;
    let toDelete: LateArrival[] = [];

    if (options.all) {
      if (targetSchoolId && targetSchoolId !== '*') {
        toDelete = list.filter((l) => (l.schoolId || targetSchoolId) === targetSchoolId);
        const remaining = list.filter((l) => (l.schoolId || targetSchoolId) !== targetSchoolId);
        this.setLateArrivals(remaining);
      } else {
        toDelete = [...list];
        this.setLateArrivals([]);
      }
    } else if (options.arrivalIds && options.arrivalIds.length > 0) {
      const idSet = new Set(options.arrivalIds);
      toDelete = list.filter((l) => idSet.has(l.id));
      const remaining = list.filter((l) => !idSet.has(l.id));
      this.setLateArrivals(remaining);
    } else if (options.fromDate || options.toDate) {
      toDelete = list.filter((l) => {
        if (targetSchoolId && targetSchoolId !== '*' && (l.schoolId || targetSchoolId) !== targetSchoolId) return false;
        if (options.fromDate && l.dateStr < options.fromDate) return false;
        if (options.toDate && l.dateStr > options.toDate) return false;
        return true;
      });
      const deleteIds = new Set(toDelete.map((l) => l.id));
      const remaining = list.filter((l) => !deleteIds.has(l.id));
      this.setLateArrivals(remaining);
    }

    this.broadcastChange();
    this.notify();
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
        const cleanClass = ct.className.trim();
        const normCls = (c: string) => (c || '').replace(/^כיתה\s*/i, '').replace(/['"`׳״\s]/g, '').toLowerCase();
        const normTarget = normCls(cleanClass);

        if (!existingStaff) {
          const pin = generateUniquePin(this.staff);
          this.staff.push({
            id: `staff-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            staffCode: `T${this.staff.length + 1}`,
            fullName: tName,
            role: 'teacher',
            pinCode: pin,
            assignedClasses: [cleanClass],
            isActive: true,
            schoolId: schoolId,
          });
        } else if (!existingStaff.assignedClasses.some((c) => normCls(c) === normTarget)) {
          existingStaff.assignedClasses.push(cleanClass);
        }
      }
    }

    this.deduplicateStaffPins();
    this.save(STORAGE_KEY_STAFF, this.staff);
    this.save(STORAGE_KEY_STUDENTS, this.students);

    // Sync newly imported teachers and students to Firestore for GitHub Pages and all devices (if quota allows)
    if (!isFirestoreQuotaExhausted) {
      for (const member of this.staff) {
        if (member && member.id && (member.schoolId || schoolId) === schoolId) {
          this.syncStaffToFirestore(member);
        }
      }
      for (const stud of this.students) {
        if (stud && stud.id && (stud.schoolId || schoolId) === schoolId) {
          this.syncStudentToFirestore(stud);
        }
      }
      this.syncBundleToCloud();
    }
    this.broadcastChange();
    this.pushStateToServer();
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
    let schoolStudents = studentsArr.filter((s) => s && !isDemoStudent(s) && (s.schoolId || schoolId) === schoolId);

    // Safety fallback: If school-scoped filter yielded 0, but students exist in store, use all valid students
    if (schoolStudents.length === 0 && studentsArr.length > 0) {
      schoolStudents = studentsArr.filter((s) => s && !isDemoStudent(s));
    }

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
    this.schools = [];
    this.activeSchoolId = '';
    this.students = [];
    this.passes = [];
    this.staff = this.staff.filter((s: StaffMember) => s.role === 'admin' && s.pinCode === '160525');
    this.ensureEssentialStaff();
    this.save(STORAGE_KEY_SCHOOLS, this.schools);
    this.save(STORAGE_KEY_ACTIVE_SCHOOL, this.activeSchoolId);
    this.save(STORAGE_KEY_STUDENTS, this.students);
    this.save(STORAGE_KEY_PASSES, this.passes);
    this.save(STORAGE_KEY_STAFF, this.staff);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('gate_school_name');
      localStorage.removeItem('gate_activated_school_code');
      const keysToRemove = [
        'gatepass_client_schools_v3',
        'gatepass_client_active_school_id_v3',
        'gatepass_client_staff_v2',
        'gatepass_client_students_v2',
        'gatepass_client_passes_v2',
        'gatepass_client_session_v2',
        'gatepass_seeded_v36_clean_slate_zero_schools',
      ];
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    }

    // Delete all schools, students, passes, and non-admin staff from Firestore if quota permits
    if (!isFirestoreQuotaExhausted && firestoreDb) {
      try {
        const schoolDocs = await getDocs(collection(firestoreDb, FS_COLLECTION_SCHOOLS));
        for (const d of schoolDocs.docs) {
          deleteDoc(d.ref).catch(handleFirestoreQuotaError);
        }
        const studentDocs = await getDocs(collection(firestoreDb, FS_COLLECTION_STUDENTS));
        for (const d of studentDocs.docs) {
          deleteDoc(d.ref).catch(handleFirestoreQuotaError);
        }
        const passDocs = await getDocs(collection(firestoreDb, FS_COLLECTION_PASSES));
        for (const d of passDocs.docs) {
          deleteDoc(d.ref).catch(handleFirestoreQuotaError);
        }
        const staffDocs = await getDocs(collection(firestoreDb, FS_COLLECTION_STAFF));
        for (const d of staffDocs.docs) {
          const st = d.data() as StaffMember;
          if (st && (st.id !== 'staff-admin-amar' && st.pinCode !== '160525')) {
            deleteDoc(d.ref).catch(handleFirestoreQuotaError);
          }
        }
      } catch (e) {
        handleFirestoreQuotaError(e);
      }
    }

    this.broadcastChange();
    return { success: true, message: 'כל בתי הספר, התלמידים, הצוותים והאישורים אופסו בהצלחה ללוח חלק ונקי לחלוטין!' };
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
    const tempPins = new Set<string>();
    tempPins.add('160525');
    for (const s of this.staff) {
      if (s.role !== 'admin' && s.pinCode !== '160525') {
        const newPin = generateUniquePin(tempPins);
        s.pinCode = newPin;
        tempPins.add(newPin);
      }
    }
    this.deduplicateStaffPins();
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

  // ==================== LATE ARRIVALS METHODS ====================

  public recordLateArrival(params: {
    studentId: string;
    studentCode?: string;
    studentName: string;
    className: string;
    homeroomTeacher?: string;
    timeStr?: string;
    dateStr?: string;
    reason?: string;
    notes?: string;
    actor: User | StaffMember;
  }): LateArrival {
    const today = this.getIsraelDate();
    const nowTime = this.getIsraelTime();

    const newArrival: LateArrival = {
      id: `late-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: params.studentId,
      studentCode: params.studentCode || '',
      studentName: params.studentName,
      className: params.className,
      homeroomTeacher: params.homeroomTeacher || '',
      dateStr: params.dateStr || today,
      timeStr: params.timeStr || nowTime,
      recordedById: params.actor.id,
      recordedByName: params.actor.fullName,
      recordedByRole: params.actor.role,
      reason: params.reason || 'איחור בוקר',
      notes: params.notes || '',
      schoolId: params.actor.schoolId || this.activeSchoolId,
      createdAt: new Date().toISOString(),
    };

    this.lateArrivals.unshift(newArrival);
    this.save(STORAGE_KEY_LATE_ARRIVALS, this.lateArrivals);
    this.notify();
    return newArrival;
  }

  public saveLateArrivalLocally(arrival: LateArrival): void {
    if (!arrival || !arrival.id) return;
    const idx = this.lateArrivals.findIndex((x) => x.id === arrival.id);
    if (idx >= 0) {
      this.lateArrivals[idx] = arrival;
    } else {
      this.lateArrivals.unshift(arrival);
    }
    this.save(STORAGE_KEY_LATE_ARRIVALS, this.lateArrivals);
    this.notify();
  }

  public setLateArrivals(list: LateArrival[]): void {
    if (Array.isArray(list)) {
      this.lateArrivals = list;
      this.save(STORAGE_KEY_LATE_ARRIVALS, this.lateArrivals);
      this.notify();
    }
  }

  public getLateArrivals(filter?: {
    dateStr?: string;
    fromDate?: string;
    toDate?: string;
    className?: string;
    studentId?: string;
  }): LateArrival[] {
    return this.lateArrivals.filter((item) => {
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

  public getLateArrivalsTodayForClass(className: string): LateArrival[] {
    const today = this.getIsraelDate();
    const normStr = (c: string) => (c || '').replace(/^כיתה\s*/i, '').replace(/['"`׳״\s]/g, '').toLowerCase();
    const targetNorm = normStr(className);

    return this.lateArrivals.filter((item) => {
      if (item.dateStr !== today) return false;
      if (!className || className === 'ALL' || className === '*') return true;
      return normStr(item.className) === targetNorm;
    });
  }

  public getLateArrivalsCountToday(): number {
    const today = this.getIsraelDate();
    return this.lateArrivals.filter((item) => item.dateStr === today).length;
  }

  public getIsraelDate(): string {
    return getClientIsraelDateString();
  }

  public getIsraelTime(): string {
    return getClientIsraelTimeString();
  }

  public getSessionUser(): User | null {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_SESSION);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  public deleteLateArrival(id: string): boolean {
    const idx = this.lateArrivals.findIndex((x) => x.id === id);
    if (idx >= 0) {
      this.lateArrivals.splice(idx, 1);
      this.save(STORAGE_KEY_LATE_ARRIVALS, this.lateArrivals);
      this.notify();
      return true;
    }
    return false;
  }
}

export const clientStore = new ClientStorageEngine();
