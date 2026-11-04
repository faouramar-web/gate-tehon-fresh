import { User, Student, GatePass, GuardSearchResult, AuditLogEntry, StaffMember, DemoAccount } from '../types.ts';

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
  // Auth
  async login(pinCode: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ pinCode }),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      removeStoredToken();
    }
  },

  async getDemoAccounts(): Promise<{ accounts: DemoAccount[] }> {
    return request<{ accounts: DemoAccount[] }>('/api/public/demo-accounts');
  },

  // Teacher
  async getTeacherClasses(): Promise<{
    assignedClasses: string[];
    teacherName: string;
    students: Student[];
    today: string;
    currentTime: string;
  }> {
    return request('/api/teacher/my-classes');
  },

  async getTeacherPasses(): Promise<{
    passes: GatePass[];
    currentTime: string;
  }> {
    return request('/api/teacher/passes');
  },

  async createPasses(studentIds: string[], validFromTime: string, reason?: string): Promise<{
    success: boolean;
    createdCount: number;
    created: GatePass[];
    errors: string[];
  }> {
    return request('/api/passes/create', {
      method: 'POST',
      body: JSON.stringify({ studentIds, validFromTime, reason }),
    });
  },

  async cancelPass(passId: string): Promise<{ success: boolean; pass: GatePass }> {
    return request('/api/passes/cancel', {
      method: 'POST',
      body: JSON.stringify({ passId }),
    });
  },

  // Guard
  async searchGuard(query = ''): Promise<{
    results: GuardSearchResult[];
    currentTime: string;
  }> {
    return request(`/api/guard/search?q=${encodeURIComponent(query)}`);
  },

  async getActivePasses(): Promise<{
    activePasses: (GatePass & { isNowValid: boolean })[];
    recentExits: GatePass[];
    currentTime: string;
    totalActive: number;
    totalExitedToday: number;
  }> {
    return request('/api/guard/active-passes');
  },

  async markExit(passId: string): Promise<{
    success: boolean;
    pass: GatePass;
    message: string;
  }> {
    return request('/api/guard/mark-exit', {
      method: 'POST',
      body: JSON.stringify({ passId }),
    });
  },

  // Admin
  async getStaff(): Promise<{ staff: StaffMember[] }> {
    return request('/api/admin/staff');
  },

  async saveStaff(staffList: StaffMember[]): Promise<{ success: boolean; staff: StaffMember[] }> {
    return request('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify({ staffList }),
    });
  },

  async getAudit(): Promise<{ logs: AuditLogEntry[] }> {
    return request('/api/admin/audit');
  },

  async importData(students: any[], classesTeachers: any[]): Promise<{
    success: boolean;
    added: number;
    updated: number;
    total: number;
  }> {
    return request('/api/admin/import', {
      method: 'POST',
      body: JSON.stringify({ students, classesTeachers }),
    });
  },

  async resetDemo(): Promise<{ success: boolean; message: string }> {
    return request('/api/admin/reset-demo', { method: 'POST' });
  },

  async searchHistory(params: {
    q?: string;
    from?: string;
    to?: string;
    className?: string;
  } = {}): Promise<{ passes: GatePass[] }> {
    const qParams = new URLSearchParams();
    if (params.q) qParams.append('q', params.q);
    if (params.from) qParams.append('from', params.from);
    if (params.to) qParams.append('to', params.to);
    if (params.className) qParams.append('class', params.className);
    return request(`/api/admin/history-search?${qParams.toString()}`);
  },
};
