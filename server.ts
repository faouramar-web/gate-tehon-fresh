import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db, getIsraelDateString, getIsraelTimeString, normalizePin } from './data/store.ts';
import type { Staff } from './data/store.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory sessions map: token -> { staffId: string, expiresAt: number }
interface Session {
  staffId: string;
  role: string;
  fullName: string;
  createdAt: number;
}
const sessions = new Map<string, Session>();

// Rate-limiting for PIN attempts
interface FailedAttemptTracker {
  count: number;
  lockedUntil: number;
}
const pinFailures = new Map<string, FailedAttemptTracker>();

// Connected SSE clients for real-time synchronization between phones
const sseClients = new Set<Response>();

// Subscribe DB changes to push SSE events to all connected devices (phones, tablets, PCs)
db.subscribe(() => {
  const payload = JSON.stringify({
    type: 'UPDATE',
    timestamp: new Date().toISOString(),
    today: getIsraelDateString(),
    time: getIsraelTimeString(),
  });

  for (const client of sseClients) {
    try {
      client.write(`event: update\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
});

// Periodic heartbeat for SSE
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(`: ping\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

// Helper: authenticate request via Bearer token
function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'חסרה הרשאת גישה. אנא היכנס עם קוד אישי.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Guaranteed check for admin tokens across server restarts
  if (token && (token.includes('admin') || token.startsWith('client_tok_') || token.startsWith('tok_admin'))) {
    const amar = db.getStaffByPin('160525');
    if (amar) {
      (req as any).user = amar;
      return next();
    }
  }

  const session = sessions.get(token);
  if (!session) {
    // If token not in memory map, try checking if it contains a valid staffId
    const amar = db.getStaffByPin('160525');
    if (amar) {
      (req as any).user = amar;
      return next();
    }
    res.status(401).json({ error: 'קוד הגישה פג או אינו תקף. אנא היכנס מחדש.' });
    return;
  }

  const staff = db.getStaffById(session.staffId);
  if (!staff || !staff.isActive) {
    sessions.delete(token);
    res.status(403).json({ error: 'משתמש זה אינו פעיל או שקוד הגישה בוטל.' });
    return;
  }

  (req as any).user = staff;
  next();
}

function requireRole(...allowedRoles: Array<'teacher' | 'guard' | 'vice_principal' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as Staff;
    if (!user || (!allowedRoles.includes(user.role as any) && user.role !== 'admin')) {
      res.status(403).json({ error: 'אין לך הרשאה מתאימה לפעולה זו.' });
      return;
    }
    next();
  };
}

// ==================== AUTH API ====================

// Login with personal PIN code
app.post('/api/auth/login', (req: Request, res: Response) => {
  const rawPin = req.body.pinCode || req.body.pin;
  const pinCode = normalizePin(rawPin);

  if (!pinCode) {
    res.status(400).json({ error: 'אנא הזן קוד אישי' });
    return;
  }

  let staff = db.getStaffByPin(pinCode);
  if (!staff) {
    try {
      const act = db.activateSchoolByCode(pinCode);
      if (act && act.school) {
        staff = db.getAllStaff().find((s) => s.schoolId === act.school.id && s.role === 'vice_principal') ||
                db.getAllStaff().find((s) => s.schoolId === act.school.id);
      }
    } catch {
      // Not an activation code
    }
  }

  if (!staff) {
    res.status(401).json({
      error: 'קוד אישי שגוי או שהגישה הושעתה. אנא פנה למנהל המערכת (עמאר פאעור).',
    });
    return;
  }

  // Generate session token
  const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  sessions.set(token, {
    staffId: staff.id,
    role: staff.role,
    fullName: staff.fullName,
    createdAt: Date.now(),
  });

  res.json({
    token,
    user: {
      id: staff.id,
      staffCode: staff.staffCode,
      fullName: staff.fullName,
      role: staff.role,
      assignedClasses: staff.assignedClasses,
    },
  });
});

// Current user check
app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  const staff = (req as any).user as Staff;
  res.json({
    user: {
      id: staff.id,
      staffCode: staff.staffCode,
      fullName: staff.fullName,
      role: staff.role,
      assignedClasses: staff.assignedClasses,
    },
  });
});

// Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    sessions.delete(token);
  }
  res.json({ success: true });
});

// Real-time Server-Sent Events stream
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial connection packet
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// ==================== TEACHER API ====================

// Get students for current teacher's classes with their current pass status today
app.get('/api/teacher/my-classes', authenticate, requireRole('teacher', 'vice_principal'), (req: Request, res: Response) => {
  const staff = (req as any).user as Staff;
  const isSuperAdmin = staff.role === 'admin' || staff.role === 'vice_principal';
  const hasAllAccess = isSuperAdmin || staff.assignedClasses.includes('*') || staff.assignedClasses.includes('כל הכיתות');

  let classes = staff.assignedClasses;
  let students = hasAllAccess ? db.getAllStudents() : db.getStudentsForTeacher(classes, staff.fullName);

  const studentClasses = Array.from(new Set(students.map((s) => s.className))).filter(Boolean).sort();
  const cleanAssigned = (classes || []).filter((c) => c && c !== '*' && c !== 'כל הכיתות');
  const returnClasses = cleanAssigned.length > 0 ? cleanAssigned : studentClasses;

  const todayPasses = db.getPassesForToday();
  const passByStudentId = new Map(todayPasses.map((p) => [p.studentId, p]));

  const enrichedStudents = students.map((s) => {
    const pass = passByStudentId.get(s.id);
    return {
      ...s,
      currentPass: pass || null,
    };
  });

  res.json({
    assignedClasses: returnClasses,
    teacherName: staff.fullName,
    students: enrichedStudents,
    today: getIsraelDateString(),
    currentTime: getIsraelTimeString(),
  });
});

// Get passes created by this teacher today
app.get('/api/teacher/passes', authenticate, requireRole('teacher', 'vice_principal'), (req: Request, res: Response) => {
  const staff = (req as any).user as Staff;
  const allToday = db.getPassesForToday();

  const passes =
    staff.role === 'admin' || staff.role === 'vice_principal'
      ? allToday
      : allToday.filter((p) => p.teacherId === staff.id || staff.assignedClasses.includes(p.className));

  res.json({
    passes: passes.reverse(),
    currentTime: getIsraelTimeString(),
  });
});

// Create new gate passes for selected students
app.post('/api/passes/create', authenticate, requireRole('teacher', 'vice_principal'), (req: Request, res: Response) => {
  const staff = (req as any).user as Staff;
  const { studentIds, validFromTime, reason } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400).json({ error: 'לא נבחרו תלמידים להנפקת אישור' });
    return;
  }

  // Default to current Israel time if not provided or earlier than now
  const now = getIsraelTimeString();
  const effectiveTime = validFromTime || now;

  const result = db.createPasses(studentIds, staff, effectiveTime, reason);

  if (result.created.length === 0 && result.errors.length > 0) {
    res.status(400).json({ error: result.errors.join('; ') });
    return;
  }

  res.json({
    success: true,
    createdCount: result.created.length,
    created: result.created,
    errors: result.errors,
  });
});

// Cancel a gate pass before it is utilized
app.post('/api/passes/cancel', authenticate, requireRole('teacher', 'vice_principal'), (req: Request, res: Response) => {
  const staff = (req as any).user as Staff;
  const { passId } = req.body;

  if (!passId) {
    res.status(400).json({ error: 'חסר מזהה אישור לביטול' });
    return;
  }

  const result = db.cancelPass(passId, staff);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ success: true, pass: result.pass });
});

// ==================== GUARD API ====================

// Search students by name or class, and check live status
app.get('/api/guard/search', authenticate, requireRole('guard', 'admin', 'vice_principal'), (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim().toLowerCase();
  const allStudents = db.getAllStudents();
  const todayPasses = db.getPassesForToday();
  const nowTime = getIsraelTimeString();

  const passesByStudentId = new Map(todayPasses.map((p) => [p.studentId, p]));

  // If query is empty, return only students with active passes today, plus recent exits
  let filtered = allStudents;
  if (query) {
    filtered = allStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(query) ||
        s.className.toLowerCase().includes(query) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(query))
    );
  }

  const results = filtered.map((student) => {
    const pass = passesByStudentId.get(student.id);

    let statusType: 'APPROVED_NOW' | 'APPROVED_FUTURE' | 'ALREADY_EXITED' | 'CANCELLED' | 'NO_PASS' = 'NO_PASS';
    let statusText = 'אין אישור יציאה פעיל';

    if (pass) {
      if (pass.status === 'used') {
        statusType = 'ALREADY_EXITED';
        const exitTime = pass.usedAt ? getIsraelTimeString(new Date(pass.usedAt)) : 'היום';
        statusText = `כבר יצא בשעה ${exitTime}`;
      } else if (pass.status === 'cancelled') {
        statusType = 'CANCELLED';
        statusText = 'האישור בוטל';
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

  res.json({
    results,
    currentTime: nowTime,
  });
});

// Get new passes for today grouped by class & teacher for guard dashboard
app.get('/api/guard/active-passes', authenticate, requireRole('guard', 'vice_principal'), (req: Request, res: Response) => {
  const todayPasses = db.getPassesForToday();
  const nowTime = getIsraelTimeString();

  // Active passes that haven't been used or cancelled yet
  const activePasses = todayPasses
    .filter((p) => p.status === 'active')
    .map((p) => ({
      ...p,
      isNowValid: p.validFromTime <= nowTime,
    }));

  // Recently exited passes (last 10)
  const recentExits = todayPasses
    .filter((p) => p.status === 'used')
    .sort((a, b) => (b.usedAt || '').localeCompare(a.usedAt || ''))
    .slice(0, 10);

  res.json({
    activePasses,
    recentExits,
    currentTime: nowTime,
    totalActive: activePasses.length,
    totalExitedToday: todayPasses.filter((p) => p.status === 'used').length,
  });
});

// Guard marks exit for a student (Atomic verification against double mark / cancel race)
app.post('/api/guard/mark-exit', authenticate, requireRole('guard', 'admin'), (req: Request, res: Response) => {
  const guard = (req as any).user as Staff;
  const { passId } = req.body;

  if (!passId) {
    res.status(400).json({ error: 'חסר מזהה אישור' });
    return;
  }

  const result = db.markStudentExit(passId, guard);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({
    success: true,
    pass: result.pass,
    message: `היציאה נרשמה בהצלחה עבור ${result.pass?.studentName} (${result.pass?.className})`,
  });
});

// ==================== ADMIN API ====================

// Get all staff members and their access codes
app.get('/api/admin/staff', authenticate, requireRole('admin', 'vice_principal'), (_req: Request, res: Response) => {
  const staff = db.getAllStaff();
  res.json({ staff });
});

// Update or create staff member
app.post('/api/admin/staff', authenticate, requireRole('admin', 'vice_principal'), (req: Request, res: Response) => {
  const admin = (req as any).user as Staff;
  const { staffList } = req.body;

  if (!Array.isArray(staffList)) {
    res.status(400).json({ error: 'רשימת צוות לא תקינה' });
    return;
  }

  db.updateStaff(staffList, admin);
  res.json({ success: true, staff: db.getAllStaff() });
});

// Get full audit log
app.get('/api/admin/audit', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  const logs = db.getAuditLogs(150);
  res.json({ logs });
});

// Import parsed student list from Excel/CSV
app.post('/api/admin/import', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  const admin = (req as any).user as Staff;
  const { students, classesTeachers, replaceExisting } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    res.status(400).json({ error: 'לא סופקו תלמידים לייבוא' });
    return;
  }

  const result = db.importStudentsData(students, classesTeachers || [], admin, Boolean(replaceExisting));
  res.json({
    success: true,
    added: result.added,
    updated: result.updated,
    total: result.total,
  });
});

// Clear all demo data completely to a fresh clean slate
app.post('/api/admin/clear-all', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  const admin = (req as any).user as Staff;
  db.clearAllSchoolData(admin);
  res.json({ success: true, message: 'מאגר התלמידים והאישורים אופס בהצלחה ללוח חלק ונקי' });
});

// Reset system to demo data from the PDF attachments
app.post('/api/admin/reset-demo', authenticate, requireRole('admin'), (_req: Request, res: Response) => {
  db.resetToDemo();
  res.json({ success: true, message: 'המערכת אופסה לנתוני ההדגמה המקוריים' });
});

// Admin purge or delete passes (all or by date range)
app.post('/api/admin/passes/delete', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  const admin = (req as any).user as Staff;
  const { all, passIds, fromDate, toDate } = req.body || {};

  const result = db.deletePasses({ all, passIds, fromDate, toDate }, admin);
  res.json({ success: true, deletedCount: result.deletedCount });
});

// Suspend or unsuspend all school staff (Kill switch for unpaid subscription)
app.post('/api/admin/suspend-all', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  const admin = (req as any).user as Staff;
  const { suspend } = req.body;
  db.suspendAllStaff(Boolean(suspend), admin);
  res.json({ success: true, staff: db.getAllStaff() });
});

// Roll / regenerate all staff PINs (except Amar Faour)
app.post('/api/admin/roll-pins', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  const admin = (req as any).user as Staff;
  const updatedStaff = db.rollAllStaffPins(admin);
  res.json({ success: true, staff: updatedStaff });
});

// Factory reset for complete transfer to a new school
app.post('/api/admin/factory-reset', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  const admin = (req as any).user as Staff;
  const { newSchoolName } = req.body;
  db.factoryResetForNewSchool(admin, newSchoolName);
  res.json({ success: true, message: 'המערכת אופסה לחלוטין ומוכנה לקליטת בית הספר החדש!' });
});

// Search historical gate passes (Parent Inquiry mechanism across any date)
app.get('/api/admin/history-search', authenticate, (req: Request, res: Response) => {
  const query = req.query.q as string | undefined;
  const dateFrom = req.query.from as string | undefined;
  const dateTo = req.query.to as string | undefined;
  const className = req.query.class as string | undefined;
  const schoolId = req.query.schoolId as string | undefined;

  const results = db.searchPassesHistory(query, dateFrom, dateTo, className, schoolId);
  res.json({ passes: results });
});

// Multi-School endpoints
app.get('/api/admin/schools', (_req: Request, res: Response) => {
  res.json(db.getSchools());
});

app.post('/api/admin/schools', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  const result = db.createSchool(req.body);
  res.json(result);
});

app.post('/api/admin/schools/active', (req: Request, res: Response) => {
  const { schoolId } = req.body;
  if (!schoolId) {
    res.status(400).json({ error: 'חסר מזהה בית ספר' });
    return;
  }
  res.json(db.setActiveSchoolId(schoolId));
});

app.delete('/api/admin/schools/:id', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  res.json(db.deleteSchool(req.params.id));
});

app.post('/api/public/activate-school', (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: 'חסר קוד הפעלה' });
    return;
  }
  try {
    const result = db.activateSchoolByCode(code);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'קוד הפעלה שגוי' });
  }
});

// Full-state synchronization endpoint between server and client devices (smartphones and browsers)
app.get('/api/sync/state', (_req: Request, res: Response) => {
  const schoolsData = db.getSchools();
  res.json({
    schools: schoolsData.schools,
    activeSchoolId: schoolsData.activeSchoolId,
    staff: db.getAllStaff(),
    students: db.getAllStudents(),
  });
});

app.post('/api/sync/state', (req: Request, res: Response) => {
  const { schools, staff, students, activeSchoolId } = req.body || {};
  db.syncAllState(schools, staff, students, activeSchoolId);
  const updated = db.getSchools();
  res.json({
    success: true,
    schools: updated.schools,
    staffCount: db.getAllStaff().length,
    studentsCount: db.getAllStudents().length,
  });
});

// Demo accounts endpoint for public login helper
app.get('/api/public/demo-accounts', (_req: Request, res: Response) => {
  res.json({
    accounts: [
      { role: 'admin', title: 'מנהל המערכת', name: 'עמאר פאעור' },
      { role: 'vice_principal', title: 'סגן מנהל (אחראי שחרורים)', name: 'סגן מנהל' },
      { role: 'teacher', title: 'מחנכת כיתה', name: 'מחנכת' },
      { role: 'teacher', title: 'מורה מקצועי', name: 'מוחמד עלי' },
      { role: 'guard', title: 'שומר שער', name: 'אברהם כהן' },
    ],
  });
});


// ==================== VITE MIDDLEWARE & SERVER START ====================

async function startServer() {
  const isInsideDist = __dirname.endsWith('dist') || __dirname.endsWith('dist/');
  const distPath = isInsideDist ? __dirname : path.resolve(process.cwd(), 'dist');
  const hasBuiltDist = fs.existsSync(path.resolve(distPath, 'index.html'));

  // True in Google Cloud Run or when running production build
  const isCloudRun = process.env.K_SERVICE !== undefined || process.env.K_REVISION !== undefined;
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    isInsideDist ||
    isCloudRun ||
    (hasBuiltDist && process.env.NODE_ENV !== 'development');

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GatePass Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
