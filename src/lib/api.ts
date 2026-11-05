import { User, Student, GatePass, GuardSearchResult, AuditLogEntry, StaffMember, DemoAccount, School, SchoolStatus } from '../types.ts';
import { clientStore } from './clientStore.ts';

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
    ...options,
    headers,
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
      const res = clientStore.login(pinCode, targetSchoolId);
      setStoredToken(res.token);
      return res;
    }

    try {
      const res = await request<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pinCode, targetSchoolId }),
      });
      setStoredToken(res.token);
      return res;
    } catch (err: any) {
      // If server route is unreachable (404/static host), fallback seamlessly to clientStore
      try {
        const res = clientStore.login(pinCode, targetSchoolId);
        setStoredToken(res.token);
        return res;
      } catch (clientErr: any) {
        throw new Error(clientErr.message || err.message || 'קוד גישה שגוי');
      }
    }
  },

  async getMe(): Promise<{ user: User }> {
    if (isStaticHost) {
      return clientStore.getMe();
    }
    try {
      return await request<{ user: User }>('/api/auth/me');
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
          { role: 'teacher', title: 'מחנכת כיתה ז1', name: 'לינא ח׳ליל' },
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
          { role: 'teacher', title: 'מחנכת כיתה ז1', name: 'לינא ח׳ליל' },
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
    if (isStaticHost) {
      const { user } = clientStore.getMe();
      return clientStore.getTeacherClasses(user);
    }
    try {
      return await request('/api/teacher/my-classes');
    } catch {
      const { user } = clientStore.getMe();
      return clientStore.getTeacherClasses(user);
    }
  },

  async getTeacherPasses(): Promise<{
    passes: GatePass[];
    currentTime: string;
  }> {
    if (isStaticHost) {
      const { user } = clientStore.getMe();
      return clientStore.getTeacherPasses(user);
    }
    try {
      return await request('/api/teacher/passes');
    } catch {
      const { user } = clientStore.getMe();
      return clientStore.getTeacherPasses(user);
    }
  },

  async createPasses(studentIds: string[], validFromTime: string, reason?: string): Promise<{
    success: boolean;
    createdCount: number;
    created: GatePass[];
    errors: string[];
  }> {
    if (isStaticHost) {
      const { user } = clientStore.getMe();
      return clientStore.createPasses(user, studentIds, validFromTime, reason);
    }
    try {
      return await request('/api/passes/create', {
        method: 'POST',
        body: JSON.stringify({ studentIds, validFromTime, reason }),
      });
    } catch {
      const { user } = clientStore.getMe();
      return clientStore.createPasses(user, studentIds, validFromTime, reason);
    }
  },

  async cancelPass(passId: string): Promise<{ success: boolean; pass: GatePass }> {
    if (isStaticHost) {
      const { user } = clientStore.getMe();
      return clientStore.cancelPass(user, passId);
    }
    try {
      return await request('/api/passes/cancel', {
        method: 'POST',
        body: JSON.stringify({ passId }),
      });
    } catch {
      const { user } = clientStore.getMe();
      return clientStore.cancelPass(user, passId);
    }
  },

  // --- Guard ---
  async searchGuard(query = ''): Promise<{
    results: GuardSearchResult[];
    currentTime: string;
  }> {
    if (isStaticHost) {
      return clientStore.searchGuard(query);
    }
    try {
      return await request(`/api/guard/search?q=${encodeURIComponent(query)}`);
    } catch {
      return clientStore.searchGuard(query);
    }
  },

  async getActivePasses(): Promise<{
    activePasses: (GatePass & { isNowValid: boolean })[];
    recentExits: GatePass[];
    currentTime: string;
    totalActive: number;
    totalExitedToday: number;
  }> {
    if (isStaticHost) {
      return clientStore.getActivePasses();
    }
    try {
      return await request('/api/guard/active-passes');
    } catch {
      return clientStore.getActivePasses();
    }
  },

  async markExit(passId: string): Promise<{
    success: boolean;
    pass: GatePass;
    message: string;
  }> {
    if (isStaticHost) {
      const { user } = clientStore.getMe();
      return clientStore.markExit(user, passId);
    }
    try {
      return await request('/api/guard/mark-exit', {
        method: 'POST',
        body: JSON.stringify({ passId }),
      });
    } catch {
      const { user } = clientStore.getMe();
      return clientStore.markExit(user, passId);
    }
  },

  // --- Admin ---
  async getStaff(): Promise<{ staff: StaffMember[] }> {
    if (isStaticHost) {
      return clientStore.getStaff();
    }
    try {
      return await request('/api/admin/staff');
    } catch {
      return clientStore.getStaff();
    }
  },

  async saveStaff(staffList: StaffMember[]): Promise<{ success: boolean; staff: StaffMember[] }> {
    if (isStaticHost) {
      return clientStore.saveStaff(staffList);
    }
    try {
      return await request('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({ staffList }),
      });
    } catch {
      return clientStore.saveStaff(staffList);
    }
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
    if (isStaticHost) {
      return clientStore.importData(students, classesTeachers, replaceExisting, targetSchoolId);
    }
    try {
      return await request('/api/admin/import', {
        method: 'POST',
        body: JSON.stringify({ students, classesTeachers, replaceExisting, targetSchoolId }),
      });
    } catch {
      return clientStore.importData(students, classesTeachers, replaceExisting, targetSchoolId);
    }
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
    if (isStaticHost) {
      return clientStore.deletePasses(options);
    }
    try {
      return await request('/api/admin/passes/delete', {
        method: 'POST',
        body: JSON.stringify(options),
      });
    } catch {
      return clientStore.deletePasses(options);
    }
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
      return await request<{ schools: School[]; activeSchoolId: string }>('/api/admin/schools');
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
    if (isStaticHost) {
      return clientStore.createSchool(data);
    }
    try {
      return await request<{ success: boolean; school: School; coordinatorPin?: string }>('/api/admin/schools', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      return clientStore.createSchool(data);
    }
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
    if (isStaticHost) {
      return clientStore.clearSchoolData(schoolId);
    }
    try {
      return await request<{ success: boolean; message: string }>(`/api/admin/schools/${schoolId}/clear-data`, {
        method: 'POST',
      });
    } catch {
      return clientStore.clearSchoolData(schoolId);
    }
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
    if (isStaticHost) {
      return clientStore.activateSchoolByCode(code);
    }
    try {
      return await request<{ success: boolean; school: School; message: string }>('/api/public/activate-school', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    } catch {
      return clientStore.activateSchoolByCode(code);
    }
  },
};
