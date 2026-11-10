export type UserRole = 'teacher' | 'guard' | 'vice_principal' | 'admin';

export type SchoolStatus = 'active' | 'pending' | 'suspended' | 'cancelled';

export interface School {
  id: string;
  name: string;
  city?: string;
  code?: string;
  activationCode: string; // Master activation code set by Amar Faour
  status: SchoolStatus;   // 'active' (מאושר) | 'pending' (ממתין) | 'suspended' (מוקפא) | 'cancelled' (מבוטל)
  contactPerson?: string;
  phone?: string;
  isSuspended: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  staffCode: string;
  fullName: string;
  role: UserRole;
  assignedClasses: string[];
  schoolId?: string;
  schoolName?: string;
}

export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  className: string;
  teacherName?: string;
  parentPhone?: string; // Homeroom teacher's parent contact phone
  notes?: string;
  currentPass?: GatePass | null;
  schoolId?: string;
}

export interface GatePass {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  parentPhone?: string;
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
  schoolId?: string;
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
  schoolId?: string;
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
  schoolId?: string;
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
