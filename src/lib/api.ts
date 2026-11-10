import { User, Student, GatePass, GuardSearchResult, AuditLogEntry, StaffMember, DemoAccount, School, SchoolStatus, LateArrival } from '../types.ts';
import { clientStore, deduplicateStudents } from './clientStore.ts';

const TOKEN_KEY = 'gatepass_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Check if running on a static hosting environment like GitHub Pages
export const isStaticHost: boolean =
  typeof window !== 'undefined' &&
  (window.location.hostname.endsWith('github.io') ||
    window.location.protocol === 'file:' ||
    (!window.location.port && !window.location.hostname.includes('run.app') && window.location.hostname !== 'localhost'));

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    cache: 'no-store',
    ...options,
    headers: {
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache',
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'שגיאה בביצוע הפעולה מול השרת');
  }

  return data as T;
}

export const api = {
  // --- Auth ---
  async login(pinCode: string, targetSchoolId?: string): Promise<{ token: string; user: User }> {
    if (isStaticHost) {
      try {
        const res = clientStore.login(pinCode, targetSchoolId);
        setStoredToken(res.token);
        return res;
      } catch (firstErr) {
        // Try fetching cloud bundle from Firestore in case it's a new device or GitHub Pages
        const fetched = await clientStore.fetchBundleFromCloud();
        if (fetched) {
          const res = clientStore.login(pinCode, targetSchoolId);
          setStoredToken(res.token);
          return res;
        }
        throw firstErr;
      }
    }

    try {
      const res = await request<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pinCode, targetSchoolId }),
      });
      if (res && res.schoolActivated) {
        throw new Error(res.message || 'בית הספר הופעל בהצלחה במכשיר זה!');
      }
      setStoredToken(res.token);
      clientStore.setSessionUser(res.user);
      return res as { token: string; user: User };
    } catch (err: any) {
      if (err.message && err.message.includes('הופעל בהצלחה')) {
        throw err;
      }
      // If server does not have the code yet (e.g. newly added staff on client), fallback seamlessly to clientStore
      try {
        const res = clientStore.login(pinCode, targetSchoolId);
        setStoredToken(res.token);
        clientStore.setSessionUser(res.user);
        // Push staff to server in background so server is in sync
        try {
          const allStaff = clientStore.getStaff(res.user.schoolId).staff;
          if (allStaff && allStaff.length > 0) {
            request('/api/admin/staff', {
              method: 'POST',
              body: JSON.stringify({ staffList: allStaff }),
            }).catch(() => {});
          }
        } catch {
          // ignore
        }
        return res;
      } catch (clientErr: any) {
        const fetched = await clientStore.fetchBundleFromCloud();
        if (fetched) {
          const res = clientStore.login(pinCode, targetSchoolId);
          setStoredToken(res.token);
          clientStore.setSessionUser(res.user);
          return res;
        }
        throw new Error(clientErr.message || err.message || 'קוד אישי שגוי');
      }
    }
  },

  async getMe(): Promise<{ user: User }> {
    if (isStaticHost) {
      return clientStore.getMe();
    }
    try {
      const res = await request<{ user: User }>('/api/auth/me');
      if (res && res.user) {
        clientStore.setSessionUser(res.user);
      }
      return res;
    } catch {
      return clientStore.getMe();
    }
  },

  async logout(): Promise<void> {
    clientStore.logout();
    if (!isStaticHost) {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } catch {
        // ignore
      }
    }
    removeStoredToken();
  },

  async getDemoAccounts(): Promise<{ accounts: DemoAccount[] }> {
    if (isStaticHost) {
      return {
        accounts: [
          { role: 'admin', title: 'מנהל המערכת', name: 'עמאר פאעור' },
          { role: 'vice_principal', title: 'סגן מנהל (אחראי שחרורים)', name: 'סגן מנהל' },
          { role: 'teacher', title: 'מחנכת כיתה', name: 'מחנכת' },
          { role: 'teacher', title: 'מורה מקצועי', name: 'מוחמד עלי' },
          { role: 'guard', title: 'שומר שער', name: 'אברהם כהן' },
        ],
      };
    }
    try {
      return await request<{ accounts: DemoAccount[] }>('/api/public/demo-accounts');
    } catch {
      return {
        accounts: [
          { role: 'admin', title: 'מנהל המערכת', name: 'עמאר פאעור' },
          { role: 'vice_principal', title: 'סגן מנהל (אחראי שחרורים)', name: 'סגן מנהל' },
          { role: 'teacher', title: 'מחנכת כיתה', name: 'מחנכת' },
          { role: 'teacher', title: 'מורה מקצועי', name: 'מוחמד עלי' },
          { role: 'guard', title: 'שומר שער', name: 'אברהם כהן' },
        ],
      };
    }
  },

  // --- Teacher & Vice Principal ---
  async getTeacherClasses(): Promise<{
    assignedClasses: string[];
    teacherName: string;
    students: Student[];
    today: string;
    currentTime: string;
  }> {
    let localRes: any = null;
    try {
      const { user } = clientStore.getMe();
      localRes = clientStore.getTeacherClasses(user);
    } catch {
      // ignore
    }

    if (isStaticHost || !localRes) {
      if (localRes) return localRes;
      const { user } = clientStore.getMe();
      return clientStore.getTeacherClasses(user);
    }

    try {
      const serverRes = await request<{
        assignedClasses: string[];
        teacherName: string;
        students: Student[];
        today: string;
        currentTime: string;
      }>('/api/teacher/my-classes');

      const hasServerStudents = Array.isArray(serverRes?.students) && serverRes.students.length > 0;
      const hasLocalStudents = Array.isArray(localRes?.students) && localRes.students.length > 0;

      // Reconcile with real-time pass statuses in clientStore
      if (hasServerStudents && hasLocalStudents) {
        const localPassMap = new Map<string, GatePass | null | undefined>(
          localRes.students.map((s: Student) => [s.id, s.currentPass as GatePass | null | undefined])
        );
        const enriched: Student[] = serverRes.students.map((st) => {
          const lp = localPassMap.get(st.id);
          if (lp && (lp.status === 'used' || lp.status === 'cancelled')) {
            return { ...st, currentPass: lp };
          }
          return st;
        });
        return {
          ...serverRes,
          assignedClasses: serverRes.assignedClasses?.length > 0 ? serverRes.assignedClasses : localRes.assignedClasses,
          students: deduplicateStudents(enriched),
        };
      }

      if (hasServerStudents) {
        return {
          ...serverRes,
          students: deduplicateStudents(serverRes.students),
        };
      }

      if (hasLocalStudents) {
        return {
          ...localRes,
          students: deduplicateStudents(localRes.students),
        };
      }

      return serverRes || localRes || { assignedClasses: [], teacherName: '', students: [], today: '', currentTime: '' };
    } catch {
      const res = localRes || clientStore.getTeacherClasses(clientStore.getMe().user);
      return {
        ...res,
        students: deduplicateStudents(res?.students || []),
      };
    }
  },

  async getTeacherPasses(): Promise<{
    passes: GatePass[];
    currentTime: string;
  }> {
    let localRes: { passes: GatePass[]; currentTime: string } | null = null;
    try {
      const { user } = clientStore.getMe();
      localRes = clientStore.getTeacherPasses(user);
    } catch {
      // ignore
    }

    if (isStaticHost) {
      if (localRes) return localRes;
      const { user } = clientStore.getMe();
      return clientStore.getTeacherPasses(user);
    }

    try {
      const serverRes = await request<{ passes: GatePass[]; currentTime: string }>('/api/teacher/passes');

      // If clientStore has updated passes via live Firestore onSnapshot, merge them!
      if (localRes && Array.isArray(localRes.passes)) {
        const localPassMap = new Map(localRes.passes.map((p) => [p.id, p]));
        const merged = serverRes.passes.map((sp) => {
          const lp = localPassMap.get(sp.id);
          if (lp && (lp.status === 'used' || lp.status === 'cancelled')) {
            return {
              ...sp,
              status: lp.status,
              usedAt: lp.usedAt || sp.usedAt,
              usedBy: lp.usedBy || sp.usedBy,
              cancelledAt: lp.cancelledAt || sp.cancelledAt,
              cancelledBy: lp.cancelledBy || sp.cancelledBy,
            };
          }
          return sp;
        });

        const serverIdSet = new Set(serverRes.passes.map((p) => p.id));
        for (const lp of localRes.passes) {
          if (!serverIdSet.has(lp.id)) {
            merged.unshift(lp);
          }
        }

        return {
          passes: merged,
          currentTime: serverRes.currentTime,
        };
      }

      return serverRes;
    } catch {
      if (localRes) return localRes;
      const { user } = clientStore.getMe();
      return clientStore.getTeacherPasses(user);
    }
  },

  async createPasses(
    studentIds: string[],
    validFromTime: string,
    reason?: string,
    explicitUser?: User
  ): Promise<{
    success: boolean;
    createdCount: number;
    created: GatePass[];
    errors: string[];
  }> {
    let currentUser: User = explicitUser || (function () {
      try {
        return clientStore.getMe().user;
      } catch {
        return {
          id: 'teacher-user',
          staffCode: 'TEACHER',
          fullName: 'מחנכת כיתה',
          role: 'teacher' as const,
          assignedClasses: ['*'],
          schoolId: '*',
          schoolName: '',
        };
      }
    })();

    // 1. ALWAYS execute in clientStore (pushes directly to Firestore gatepasses document)
    let localRes: { success: boolean; createdCount: number; created: GatePass[]; errors: string[] } | null = null;
    try {
      localRes = clientStore.createPasses(currentUser, studentIds, validFromTime, reason);
    } catch {
      // ignore
    }

    // 2. ALSO notify server backend if not static host
    if (!isStaticHost) {
      try {
        const serverRes = await request<{
          success: boolean;
          createdCount: number;
          created: GatePass[];
          errors: string[];
        }>('/api/passes/create', {
          method: 'POST',
          body: JSON.stringify({
            studentIds,
            validFromTime,
            reason,
            passes: localRes?.created || [],
          }),
        });

        if (serverRes.created && Array.isArray(serverRes.created)) {
          clientStore.mergeRemotePasses(serverRes.created);
          for (const cp of serverRes.created) {
            clientStore.syncPassToFirestore(cp);
          }
        }

        return serverRes;
      } catch (serverErr: any) {
        if (localRes && localRes.created && localRes.created.length > 0) {
          return localRes;
        }
        throw serverErr;
      }
    }

    if (localRes) return localRes;
    throw new Error('שגיאה ביצירת אישורי שחרור');
  },

  async cancelPass(passId: string): Promise<{ success: boolean; pass: GatePass }> {
    let currentUser: User;
    try {
      currentUser = clientStore.getMe().user;
    } catch {
      currentUser = {
        id: 'teacher-user',
        staffCode: 'TEACHER',
        fullName: 'מחנכת כיתה',
        role: 'teacher',
        assignedClasses: ['*'],
        schoolId: '*',
        schoolName: '',
      };
    }

    // 1. ALWAYS cancel in clientStore (updates Firestore immediately)
    let localRes: { success: boolean; pass: GatePass } | null = null;
    try {
      localRes = clientStore.cancelPass(currentUser, passId);
    } catch {
      // ignore
    }

    // 2. ALSO notify server backend
    if (!isStaticHost) {
      try {
        const serverRes = await request<{ success: boolean; pass: GatePass }>('/api/passes/cancel', {
          method: 'POST',
          body: JSON.stringify({ passId }),
        });
        if (serverRes.pass) {
          clientStore.syncPassToFirestore(serverRes.pass);
        }
        return serverRes;
      } catch (err: any) {
        if (localRes) return localRes;
        throw err;
      }
    }

    if (localRes) return localRes;
    throw new Error('אישור שחרור לא נמצא או שכבר יצא');
  },

  // --- Guard ---
  async searchGuard(query = ''): Promise<{
    results: GuardSearchResult[];
    currentTime: string;
  }> {
    const localRes = clientStore.searchGuard(query);
    if (isStaticHost) {
      return localRes;
    }
    try {
      const serverRes = await request<{
        results: GuardSearchResult[];
        currentTime: string;
      }>(`/api/guard/search?q=${encodeURIComponent(query)}`);

      const localResultMap = new Map(localRes.results.map((r) => [r.student.id, r]));
      const mergedResults = serverRes.results.map((sr) => {
        const lr = localResultMap.get(sr.student.id);
        if (lr && lr.pass) {
          if (lr.pass.status === 'active' && sr.pass?.status !== 'active') return lr;
          if (sr.pass?.status === 'active' && lr.pass.status !== 'active') return sr;
          if (lr.pass.status === 'used') return lr;
          if (!sr.pass) return lr;
        }
        return sr;
      });
      const serverStudentIds = new Set(serverRes.results.map((r) => r.student.id));
      for (const lr of localRes.results) {
        if (!serverStudentIds.has(lr.student.id)) {
          mergedResults.push(lr);
        }
      }
      return {
        results: mergedResults,
        currentTime: serverRes.currentTime || localRes.currentTime,
      };
    } catch {
      return localRes;
    }
  },

  async getActivePasses(): Promise<{
    activePasses: (GatePass & { isNowValid: boolean })[];
    recentExits: GatePass[];
    currentTime: string;
    totalActive: number;
    totalExitedToday: number;
  }> {
    const localRes = clientStore.getActivePasses();
    if (isStaticHost) {
      return localRes;
    }

    try {
      const serverRes = await request<{
        activePasses: (GatePass & { isNowValid: boolean })[];
        recentExits: GatePass[];
        currentTime: string;
        totalActive: number;
        totalExitedToday: number;
      }>('/api/guard/active-passes');

      // Immediately merge server passes into local clientStore
      if (serverRes.activePasses || serverRes.recentExits) {
        clientStore.mergeRemotePasses([
          ...(serverRes.activePasses || []),
          ...(serverRes.recentExits || []),
        ]);
      }

      // Filter out active passes that were marked as used in Firestore/clientStore
      const localUsedIds = new Set(localRes.recentExits.map((p) => p.id));
      const activeMap = new Map<string, GatePass & { isNowValid: boolean }>();

      for (const p of serverRes.activePasses) {
        if (!localUsedIds.has(p.id)) {
          activeMap.set(p.id, p);
        }
      }
      for (const p of localRes.activePasses) {
        if (!localUsedIds.has(p.id)) {
          activeMap.set(p.id, p);
        }
      }
      const mergedActive = Array.from(activeMap.values());

      const exitMap = new Map<string, GatePass>();
      for (const e of serverRes.recentExits) exitMap.set(e.id, e);
      for (const e of localRes.recentExits) exitMap.set(e.id, e);

      const mergedExits = Array.from(exitMap.values())
        .sort((a, b) => (b.usedAt || '').localeCompare(a.usedAt || ''))
        .slice(0, 15);

      return {
        activePasses: mergedActive,
        recentExits: mergedExits,
        currentTime: serverRes.currentTime || localRes.currentTime,
        totalActive: mergedActive.length,
        totalExitedToday: mergedExits.length,
      };
    } catch {
      return localRes;
    }
  },

  async markExit(
    passId: string,
    explicitGuardUser?: User
  ): Promise<{
    success: boolean;
    pass: GatePass;
    message: string;
  }> {
    let guardUser: User = explicitGuardUser || (function () {
      try {
        return clientStore.getMe().user;
      } catch {
        return {
          id: 'guard-user',
          staffCode: 'GUARD',
          fullName: 'שומר שער',
          role: 'guard' as const,
          assignedClasses: [],
          schoolId: '*',
          schoolName: '',
        };
      }
    })();

    // 1. ALWAYS execute in clientStore (pushes status: 'used' directly to Firestore document & broadcasts)
    let localResult: { success: boolean; pass: GatePass; message: string } | null = null;
    try {
      localResult = clientStore.markExit(guardUser, passId);
    } catch {
      // ignore
    }

    // 2. ALSO notify server backend so in-memory store and SSE are in sync
    if (!isStaticHost) {
      try {
        const passToMark = localResult?.pass || clientStore.getPassById(passId);
        const serverRes = await request<{
          success: boolean;
          pass: GatePass;
          message: string;
        }>('/api/guard/mark-exit', {
          method: 'POST',
          body: JSON.stringify({ passId, pass: passToMark }),
        });

        if (serverRes.pass) {
          clientStore.mergeRemotePasses([serverRes.pass]);
          clientStore.syncPassToFirestore(serverRes.pass);
        }
        return serverRes;
      } catch (serverErr: any) {
        if (localResult) return localResult;
        throw serverErr;
      }
    }

    if (localResult) return localResult;
    throw new Error('אישור שחרור לא נמצא או שכבר סומן כיצא');
  },

  // --- Admin ---
  async getStaff(schoolId?: string): Promise<{ staff: StaffMember[] }> {
    if (isStaticHost) {
      return clientStore.getStaff(schoolId);
    }
    try {
      const res = await request<{ staff: StaffMember[] }>('/api/admin/staff');
      if (res && Array.isArray(res.staff) && res.staff.length > 0) {
        clientStore.saveStaff(res.staff);
        return res;
      }
      return clientStore.getStaff(schoolId);
    } catch {
      return clientStore.getStaff(schoolId);
    }
  },

  async saveStaff(staffList: StaffMember[]): Promise<{ success: boolean; staff: StaffMember[] }> {
    const localRes = clientStore.saveStaff(staffList);
    if (!isStaticHost) {
      try {
        const serverRes = await request<{ success: boolean; staff: StaffMember[] }>('/api/admin/staff', {
          method: 'POST',
          body: JSON.stringify({ staffList }),
        });
        if (serverRes && Array.isArray(serverRes.staff)) {
          clientStore.saveStaff(serverRes.staff);
          return serverRes;
        }
      } catch {
        return localRes;
      }
    }
    return localRes;
  },

  async getAudit(): Promise<{ logs: AuditLogEntry[] }> {
    if (isStaticHost) {
      return { logs: [] };
    }
    try {
      return await request('/api/admin/audit');
    } catch {
      return { logs: [] };
    }
  },

  async importData(
    students: any[],
    classesTeachers: any[],
    replaceExisting?: boolean,
    targetSchoolId?: string
  ): Promise<{
    success: boolean;
    added: number;
    updated: number;
    total: number;
  }> {
    const localRes = clientStore.importData(students, classesTeachers, replaceExisting, targetSchoolId);
    const updatedStaff = clientStore.getStaff(targetSchoolId).staff;

    if (!isStaticHost) {
      try {
        const serverRes = await request<{
          success: boolean;
          added: number;
          updated: number;
          total: number;
        }>('/api/admin/import', {
          method: 'POST',
          body: JSON.stringify({ students, classesTeachers, replaceExisting, targetSchoolId }),
        });

        // Ensure server gets the exact staff list with the exact same PINs
        if (Array.isArray(updatedStaff) && updatedStaff.length > 0) {
          await request('/api/admin/staff', {
            method: 'POST',
            body: JSON.stringify({ staffList: updatedStaff }),
          }).catch(() => {});
        }

        return serverRes || localRes;
      } catch {
        return localRes;
      }
    }
    return localRes || { success: true, added: 0, updated: 0, total: 0 };
  },

  async getSchoolDirectory(targetSchoolId?: string): Promise<{
    classesSummary: Array<{
      className: string;
      teacherName: string;
      count: number;
      students: any[];
    }>;
    totalStudents: number;
    totalClasses: number;
  }> {
    return clientStore.getSchoolDirectory(targetSchoolId);
  },

  async clearAllDemoData(): Promise<{ success: boolean; message: string }> {
    const clientRes = await clientStore.clearAllDemoData();
    if (!isStaticHost) {
      try {
        await request('/api/admin/clear-all', { method: 'POST' });
      } catch {
        // ignore server error
      }
    }
    return clientRes;
  },

  async resetDemo(): Promise<{ success: boolean; message: string }> {
    const clientRes = await clientStore.resetDemo();
    if (!isStaticHost) {
      try {
        await request('/api/admin/reset-demo', { method: 'POST' });
      } catch {
        // ignore server error
      }
    }
    return clientRes;
  },

  async deletePasses(options: {
    all?: boolean;
    passIds?: string[];
    fromDate?: string;
    toDate?: string;
    schoolId?: string;
  }): Promise<{ success: boolean; deletedCount: number }> {
    const localRes = clientStore.deletePasses(options);
    if (!isStaticHost) {
      try {
        await request('/api/admin/passes/delete', {
          method: 'POST',
          body: JSON.stringify(options),
        });
      } catch {
        // ignore
      }
    }
    return localRes;
  },

  async deleteLateArrivals(options: {
    all?: boolean;
    arrivalIds?: string[];
    fromDate?: string;
    toDate?: string;
    schoolId?: string;
  }): Promise<{ success: boolean; deletedCount: number }> {
    const localRes = clientStore.deleteLateArrivals(options);
    if (!isStaticHost) {
      try {
        await request('/api/admin/late-arrivals/delete', {
          method: 'POST',
          body: JSON.stringify(options),
        });
      } catch {
        // ignore
      }
    }
    return localRes;
  },

  async searchHistory(params: {
    q?: string;
    from?: string;
    to?: string;
    className?: string;
    schoolId?: string;
  } = {}): Promise<{ passes: GatePass[] }> {
    if (isStaticHost) {
      return clientStore.searchHistory(params);
    }
    try {
      const qParams = new URLSearchParams();
      if (params.q) qParams.append('q', params.q);
      if (params.from) qParams.append('from', params.from);
      if (params.to) qParams.append('to', params.to);
      if (params.className) qParams.append('class', params.className);
      if (params.schoolId) qParams.append('schoolId', params.schoolId);
      return await request(`/api/admin/history-search?${qParams.toString()}`);
    } catch {
      return clientStore.searchHistory(params);
    }
  },

  async suspendAllStaff(suspend: boolean): Promise<{ success: boolean; staff: StaffMember[] }> {
    if (isStaticHost) {
      return clientStore.suspendAllStaff(suspend);
    }
    try {
      return await request('/api/admin/suspend-all', {
        method: 'POST',
        body: JSON.stringify({ suspend }),
      });
    } catch {
      return clientStore.suspendAllStaff(suspend);
    }
  },

  async rollAllStaffPins(): Promise<{ success: boolean; staff: StaffMember[] }> {
    if (isStaticHost) {
      return clientStore.rollAllStaffPins();
    }
    try {
      return await request('/api/admin/roll-pins', { method: 'POST' });
    } catch {
      return clientStore.rollAllStaffPins();
    }
  },

  async factoryResetForNewSchool(newSchoolName?: string): Promise<{ success: boolean; message: string }> {
    if (isStaticHost) {
      return clientStore.factoryResetForNewSchool(newSchoolName);
    }
    try {
      return await request('/api/admin/factory-reset', {
        method: 'POST',
        body: JSON.stringify({ newSchoolName }),
      });
    } catch {
      return clientStore.factoryResetForNewSchool(newSchoolName);
    }
  },

  // --- Multi-School APIs (Amar Faour) ---
  async getSchools(): Promise<{ schools: School[]; activeSchoolId: string }> {
    if (isStaticHost) {
      return clientStore.getSchools();
    }
    try {
      const res = await request<{ schools: School[]; activeSchoolId: string }>('/api/admin/schools');
      if (res && Array.isArray(res.schools)) {
        clientStore.syncSchoolsFromServer(res.schools, res.activeSchoolId);
      }
      return res;
    } catch {
      return clientStore.getSchools();
    }
  },

  async setActiveSchoolId(schoolId: string): Promise<{ success: boolean; activeSchoolId: string }> {
    if (isStaticHost) {
      return clientStore.setActiveSchoolId(schoolId);
    }
    try {
      return await request<{ success: boolean; activeSchoolId: string }>('/api/admin/schools/active', {
        method: 'POST',
        body: JSON.stringify({ schoolId }),
      });
    } catch {
      return clientStore.setActiveSchoolId(schoolId);
    }
  },

  async createSchool(data: {
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
  }): Promise<{ success: boolean; school: School; coordinatorPin?: string }> {
    const localRes = clientStore.createSchool(data);
    if (!isStaticHost) {
      try {
        const serverRes = await request<{ success: boolean; school: School; coordinatorPin?: string }>('/api/admin/schools', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (serverRes && serverRes.school) {
          clientStore.syncSchoolFromServer(serverRes.school);
          return serverRes;
        }
      } catch {
        return localRes;
      }
    }
    return localRes;
  },

  async updateSchool(schoolId: string, data: Partial<School>): Promise<{ success: boolean; school: School }> {
    if (isStaticHost) {
      return clientStore.updateSchool(schoolId, data);
    }
    try {
      return await request<{ success: boolean; school: School }>(`/api/admin/schools/${schoolId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch {
      return clientStore.updateSchool(schoolId, data);
    }
  },

  async deleteSchool(schoolId: string): Promise<{ success: boolean; message: string }> {
    if (isStaticHost) {
      return clientStore.deleteSchool(schoolId);
    }
    try {
      return await request<{ success: boolean; message: string }>(`/api/admin/schools/${schoolId}`, {
        method: 'DELETE',
      });
    } catch {
      return clientStore.deleteSchool(schoolId);
    }
  },

  async suspendSchool(schoolId: string, suspend: boolean): Promise<{ success: boolean; school: School; message: string }> {
    if (isStaticHost) {
      return clientStore.suspendSchool(schoolId, suspend);
    }
    try {
      return await request<{ success: boolean; school: School; message: string }>(`/api/admin/schools/${schoolId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ suspend }),
      });
    } catch {
      return clientStore.suspendSchool(schoolId, suspend);
    }
  },

  async rollSchoolPins(schoolId: string): Promise<{ success: boolean; count: number; message: string }> {
    if (isStaticHost) {
      return clientStore.rollSchoolPins(schoolId);
    }
    try {
      return await request<{ success: boolean; count: number; message: string }>(`/api/admin/schools/${schoolId}/roll-pins`, {
        method: 'POST',
      });
    } catch {
      return clientStore.rollSchoolPins(schoolId);
    }
  },

  async clearSchoolData(schoolId: string): Promise<{ success: boolean; message: string }> {
    const localRes = clientStore.clearSchoolData(schoolId);
    if (!isStaticHost) {
      try {
        await request<{ success: boolean; message: string }>(`/api/admin/schools/${schoolId}/clear-data`, {
          method: 'POST',
        });
      } catch {
        // ignore
      }
    }
    return localRes;
  },

  async setSchoolStatus(schoolId: string, status: SchoolStatus): Promise<{ success: boolean; school: School; message: string }> {
    if (isStaticHost) {
      return clientStore.setSchoolStatus(schoolId, status);
    }
    try {
      return await request<{ success: boolean; school: School; message: string }>(`/api/admin/schools/${schoolId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
    } catch {
      return clientStore.setSchoolStatus(schoolId, status);
    }
  },

  async updateSchoolActivationCode(schoolId: string, newCode: string): Promise<{ success: boolean; school: School; message: string }> {
    if (isStaticHost) {
      return clientStore.updateSchoolActivationCode(schoolId, newCode);
    }
    try {
      return await request<{ success: boolean; school: School; message: string }>(`/api/admin/schools/${schoolId}/activation-code`, {
        method: 'POST',
        body: JSON.stringify({ newCode }),
      });
    } catch {
      return clientStore.updateSchoolActivationCode(schoolId, newCode);
    }
  },

  async activateSchoolByCode(code: string): Promise<{ success: boolean; school: School; message: string }> {
    if (!isStaticHost) {
      try {
        const serverRes = await request<{ success: boolean; school: School; message: string }>('/api/public/activate-school', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });
        if (serverRes && serverRes.school) {
          clientStore.syncSchoolFromServer(serverRes.school);
          return serverRes;
        }
      } catch {
        // Fallback to clientStore
      }
    }
    return clientStore.activateSchoolByCode(code);
  },

  // --- Late Arrivals ---
  async recordLateArrival(data: {
    studentId: string;
    studentCode?: string;
    studentName: string;
    className: string;
    homeroomTeacher?: string;
    timeStr?: string;
    dateStr?: string;
    reason?: string;
    notes?: string;
    recordedById?: string;
    recordedByName?: string;
    recordedByRole?: string;
    schoolId?: string;
  }): Promise<{ success: boolean; lateArrival: LateArrival; message: string }> {
    // 1. Immediately record in clientStore synchronously (<1ms UI update + Firestore push + BroadcastChannel)
    const currentUser = clientStore.getSessionUser();
    const locallyRecorded = clientStore.recordLateArrival({
      ...data,
      actor: currentUser || {
        id: data.recordedById || 'teacher',
        fullName: data.recordedByName || 'מורה',
        role: (data.recordedByRole as any) || 'teacher',
        staffCode: 'T',
        assignedClasses: [],
        schoolId: data.schoolId,
      },
    });

    if (isStaticHost) {
      return { success: true, lateArrival: locallyRecorded, message: 'האיחור נרשם בהצלחה' };
    }

    try {
      const res = await request<any>('/api/late-arrivals', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res && res.lateArrival) {
        clientStore.saveLateArrivalLocally(res.lateArrival);
      }
      return res;
    } catch {
      return { success: true, lateArrival: locallyRecorded, message: 'האיחור נרשם בהצלחה' };
    }
  },

  async getLateArrivals(filter?: {
    dateStr?: string;
    from?: string;
    to?: string;
    fromDate?: string;
    toDate?: string;
    className?: string;
    schoolId?: string;
  }): Promise<{ lateArrivals: LateArrival[]; totalCount: number; currentTime: string }> {
    const normalizedFilter = {
      dateStr: filter?.dateStr,
      fromDate: filter?.fromDate || filter?.from,
      toDate: filter?.toDate || filter?.to,
      className: filter?.className,
      schoolId: filter?.schoolId,
    };

    const localList = clientStore.getLateArrivals(normalizedFilter);

    if (isStaticHost) {
      return { lateArrivals: localList, totalCount: localList.length, currentTime: clientStore.getIsraelTime() };
    }

    try {
      const query = new URLSearchParams();
      if (normalizedFilter.dateStr) query.set('dateStr', normalizedFilter.dateStr);
      if (normalizedFilter.fromDate) query.set('fromDate', normalizedFilter.fromDate);
      if (normalizedFilter.toDate) query.set('toDate', normalizedFilter.toDate);
      if (normalizedFilter.className && normalizedFilter.className !== 'ALL') query.set('className', normalizedFilter.className);
      if (normalizedFilter.schoolId) query.set('schoolId', normalizedFilter.schoolId);
      query.set('_t', String(Date.now())); // Cache buster

      const res = await request<any>(`/api/late-arrivals?${query.toString()}`);
      if (res && Array.isArray(res.lateArrivals)) {
        const arrivalMap = new Map<string, LateArrival>();
        for (const item of localList) arrivalMap.set(item.id, item);
        for (const item of res.lateArrivals) arrivalMap.set(item.id, item);
        const merged = Array.from(arrivalMap.values()).sort(
          (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || (b.timeStr || '').localeCompare(a.timeStr || '')
        );
        clientStore.setLateArrivals(merged);
        return { lateArrivals: merged, totalCount: merged.length, currentTime: res.currentTime || clientStore.getIsraelTime() };
      }
      return { lateArrivals: localList, totalCount: localList.length, currentTime: clientStore.getIsraelTime() };
    } catch {
      return { lateArrivals: localList, totalCount: localList.length, currentTime: clientStore.getIsraelTime() };
    }
  },

  async deleteLateArrival(id: string): Promise<{ success: boolean }> {
    clientStore.deleteLateArrival(id);
    if (!isStaticHost) {
      request(`/api/late-arrivals/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    return { success: true };
  },
};
