export type UserRole = 'teacher' | 'guard' | 'vice_principal' | 'admin';

export interface User {
  id: string;
  staffCode: string;
  fullName: string;
  role: UserRole;
  assignedClasses: string[];
}

export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  className: string;
  teacherName?: string;
  notes?: string;
  currentPass?: GatePass | null;
}

export interface GatePass {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  homeroomTeacher?: string; // Student's permanent homeroom teacher
  teacherId: string;
  teacherName: string; // The teacher who issued this gate pass
  dateStr: string;
  validFromTime: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  createdAt: string;
  createdBy: string;
  usedAt?: string;
  usedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  reason?: string;
}

export type GuardStatusType = 'APPROVED_NOW' | 'APPROVED_FUTURE' | 'ALREADY_EXITED' | 'CANCELLED' | 'NO_PASS';

export interface GuardSearchResult {
  student: Student;
  pass: GatePass | null;
  statusType: GuardStatusType;
  statusText: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actionType: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  details: string;
  studentName?: string;
  className?: string;
}

export interface StaffMember {
  id: string;
  staffCode: string;
  fullName: string;
  role: UserRole;
  pinCode: string;
  assignedClasses: string[];
  isActive: boolean;
  phone?: string;
}

export interface DemoAccount {
  id?: string;
  fullName?: string;
  role: UserRole;
  roleLabel?: string;
  pinCode?: string;
  classes?: string;
  title?: string;
  name?: string;
}
