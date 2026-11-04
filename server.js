// server.ts
import express from "express";
import path2 from "path";
import { fileURLToPath } from "url";
import fs2 from "fs";

// data/store.ts
import fs from "fs";
import path from "path";
function getIsraelDateString(date = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}
function getIsraelTimeString(date = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  return formatter.format(date);
}
function normalizePin(input) {
  if (input === void 0 || input === null) return "";
  return String(input).replace(/[\u0660-\u0669]/g, (c) => (c.charCodeAt(0) - 1632).toString()).replace(/[\u06F0-\u06F9]/g, (c) => (c.charCodeAt(0) - 1776).toString()).replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\s]/g, "").trim();
}
var DATA_DIR = path.resolve(process.cwd(), "data");
var DB_FILE = path.resolve(DATA_DIR, "school_gate.json");
var INITIAL_DEMO_DATA = {
  settings: {
    schoolName: "\u05D1\u05D9\u05EA \u05E1\u05E4\u05E8 \u05DE\u05E7\u05D9\u05E3",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  },
  staff: [
    {
      id: "staff-t01",
      staffCode: "T01",
      fullName: "\u05DC\u05D9\u05E0\u05D0 \u05D7\u05F3\u05DC\u05D9\u05DC",
      role: "teacher",
      pinCode: "1001",
      assignedClasses: ["\u05D61"],
      isActive: true
    },
    {
      id: "staff-t02",
      staffCode: "T02",
      fullName: "\u05E1\u05D5\u05D4\u05D0 \u05DE\u05E0\u05E6\u05D5\u05E8",
      role: "teacher",
      pinCode: "1002",
      assignedClasses: ["\u05D62"],
      isActive: true
    },
    {
      id: "staff-t03",
      staffCode: "T03",
      fullName: "\u05D3\u05DC\u05D0\u05DC \u05D7\u05D1\u05D9\u05D1",
      role: "teacher",
      pinCode: "1003",
      assignedClasses: ["\u05D71"],
      isActive: true
    },
    {
      id: "staff-t04",
      staffCode: "T04",
      fullName: "\u05E0\u05D0\u05D3\u05D9\u05D4 \u05E1\u05E8\u05D7\u05D0\u05DF",
      role: "teacher",
      pinCode: "1004",
      assignedClasses: ["\u05D72"],
      isActive: true
    },
    {
      id: "staff-t05",
      staffCode: "T05",
      fullName: "\u05E8\u05D9\u05DE\u05D0 \u05D2\u05F3\u05D0\u05D1\u05E8",
      role: "teacher",
      pinCode: "1005",
      assignedClasses: ["\u05D81"],
      isActive: true
    },
    {
      id: "staff-t06",
      staffCode: "T06",
      fullName: "\u05DE\u05D5\u05D7\u05DE\u05D3 \u05E2\u05DC\u05D9 (\u05DE\u05D5\u05E8\u05D4 \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9)",
      role: "teacher",
      pinCode: "1010",
      assignedClasses: ["*"],
      isActive: true
    },
    {
      id: "staff-g01",
      staffCode: "G01",
      fullName: "\u05D0\u05D1\u05E8\u05D4\u05DD \u05DB\u05D4\u05DF (\u05E9\u05D5\u05DE\u05E8 \u05E9\u05E2\u05E8)",
      role: "guard",
      pinCode: "2001",
      assignedClasses: [],
      isActive: true
    },
    {
      id: "staff-g02",
      staffCode: "G02",
      fullName: "\u05D9\u05D5\u05E1\u05D9 \u05DC\u05D5\u05D9 (\u05E9\u05D5\u05DE\u05E8 \u05DE\u05D7\u05DC\u05D9\u05E3)",
      role: "guard",
      pinCode: "2002",
      assignedClasses: [],
      isActive: true
    },
    {
      id: "staff-vp01",
      staffCode: "VP01",
      fullName: "\u05E1\u05D2\u05DF \u05DE\u05E0\u05D4\u05DC (\u05D0\u05D7\u05E8\u05D0\u05D9 \u05E9\u05D7\u05E8\u05D5\u05E8\u05D9\u05DD)",
      role: "vice_principal",
      pinCode: "3001",
      assignedClasses: ["*"],
      isActive: true
    },
    {
      id: "staff-admin-amar",
      staffCode: "ADMIN",
      fullName: "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA)",
      role: "admin",
      pinCode: "160525",
      assignedClasses: ["*"],
      isActive: true
    }
  ],
  students: [
    // כיתה ז1 | לינא ח׳ליל
    { id: "s-001", studentCode: "S001", fullName: "\u05D0\u05D3\u05DD \u05E0\u05D0\u05E1\u05E8", className: "\u05D61", teacherName: "\u05DC\u05D9\u05E0\u05D0 \u05D7\u05F3\u05DC\u05D9\u05DC" },
    { id: "s-002", studentCode: "S002", fullName: "\u05DE\u05E8\u05D9\u05DD \u05E1\u05D0\u05DC\u05D7", className: "\u05D61", teacherName: "\u05DC\u05D9\u05E0\u05D0 \u05D7\u05F3\u05DC\u05D9\u05DC" },
    { id: "s-003", studentCode: "S003", fullName: "\u05D9\u05D5\u05E1\u05E3 \u05D7\u05DE\u05D3\u05D0\u05DF", className: "\u05D61", teacherName: "\u05DC\u05D9\u05E0\u05D0 \u05D7\u05F3\u05DC\u05D9\u05DC" },
    { id: "s-004", studentCode: "S004", fullName: "\u05E0\u05D5\u05E8 \u05E2\u05D1\u05D3\u05D0\u05DC\u05DC\u05D4", className: "\u05D61", teacherName: "\u05DC\u05D9\u05E0\u05D0 \u05D7\u05F3\u05DC\u05D9\u05DC" },
    { id: "s-005", studentCode: "S005", fullName: "\u05DC\u05D9\u05D0\u05DF \u05E1\u05E2\u05D9\u05D3", className: "\u05D61", teacherName: "\u05DC\u05D9\u05E0\u05D0 \u05D7\u05F3\u05DC\u05D9\u05DC" },
    // כיתה ז2 | סוהא מנצור
    { id: "s-006", studentCode: "S006", fullName: "\u05D0\u05DE\u05D9\u05E8 \u05D7\u05D5\u05E8\u05D9", className: "\u05D62", teacherName: "\u05E1\u05D5\u05D4\u05D0 \u05DE\u05E0\u05E6\u05D5\u05E8" },
    { id: "s-007", studentCode: "S007", fullName: "\u05EA\u05D0\u05DC\u05D4 \u05D7\u05E0\u05D0", className: "\u05D62", teacherName: "\u05E1\u05D5\u05D4\u05D0 \u05DE\u05E0\u05E6\u05D5\u05E8" },
    { id: "s-008", studentCode: "S008", fullName: "\u05E8\u05D0\u05DE\u05D9 \u05E2\u05D9\u05E1\u05D0", className: "\u05D62", teacherName: "\u05E1\u05D5\u05D4\u05D0 \u05DE\u05E0\u05E6\u05D5\u05E8" },
    { id: "s-009", studentCode: "S009", fullName: "\u05D3\u05D9\u05E0\u05D4 \u05E1\u05DC\u05D9\u05DD", className: "\u05D62", teacherName: "\u05E1\u05D5\u05D4\u05D0 \u05DE\u05E0\u05E6\u05D5\u05E8" },
    { id: "s-010", studentCode: "S010", fullName: "\u05E1\u05D0\u05DE\u05E8 \u05E2\u05D1\u05D5\u05D3", className: "\u05D62", teacherName: "\u05E1\u05D5\u05D4\u05D0 \u05DE\u05E0\u05E6\u05D5\u05E8" },
    // כיתה ח1 | דלאל חביב
    { id: "s-011", studentCode: "S011", fullName: "\u05E8\u05D9\u05DD \u05D6\u05D9\u05D3\u05D0\u05DF", className: "\u05D71", teacherName: "\u05D3\u05DC\u05D0\u05DC \u05D7\u05D1\u05D9\u05D1" },
    { id: "s-012", studentCode: "S012", fullName: "\u05D0\u05D9\u05D0\u05D3 \u05D7\u05DC\u05D1\u05D9", className: "\u05D71", teacherName: "\u05D3\u05DC\u05D0\u05DC \u05D7\u05D1\u05D9\u05D1" },
    { id: "s-013", studentCode: "S013", fullName: "\u05E1\u05DC\u05DE\u05D0 \u05E2\u05D6\u05D0\u05DD", className: "\u05D71", teacherName: "\u05D3\u05DC\u05D0\u05DC \u05D7\u05D1\u05D9\u05D1" },
    { id: "s-014", studentCode: "S014", fullName: "\u05E0\u05D3\u05D9\u05DD \u05E9\u05D0\u05D4\u05D9\u05DF", className: "\u05D71", teacherName: "\u05D3\u05DC\u05D0\u05DC \u05D7\u05D1\u05D9\u05D1" },
    { id: "s-015", studentCode: "S015", fullName: "\u05DE\u05D0\u05D9\u05D4 \u05D9\u05E2\u05E7\u05D5\u05D1", className: "\u05D71", teacherName: "\u05D3\u05DC\u05D0\u05DC \u05D7\u05D1\u05D9\u05D1" },
    // כיתה ח2 | נאדיה סרחאן
    { id: "s-016", studentCode: "S016", fullName: "\u05D4\u05D0\u05E0\u05D9 \u05D7\u05F3\u05D8\u05D9\u05D1", className: "\u05D72", teacherName: "\u05E0\u05D0\u05D3\u05D9\u05D4 \u05E1\u05E8\u05D7\u05D0\u05DF" },
    { id: "s-017", studentCode: "S017", fullName: "\u05DC\u05D9\u05D0\u05DF \u05D7\u05E1\u05DF", className: "\u05D72", teacherName: "\u05E0\u05D0\u05D3\u05D9\u05D4 \u05E1\u05E8\u05D7\u05D0\u05DF" },
    { id: "s-018", studentCode: "S018", fullName: "\u05D0\u05DE\u05DC \u05D3\u05D0\u05D4\u05E8", className: "\u05D72", teacherName: "\u05E0\u05D0\u05D3\u05D9\u05D4 \u05E1\u05E8\u05D7\u05D0\u05DF" },
    { id: "s-019", studentCode: "S019", fullName: "\u05DB\u05E8\u05D9\u05DD \u05E2\u05DC\u05D9", className: "\u05D72", teacherName: "\u05E0\u05D0\u05D3\u05D9\u05D4 \u05E1\u05E8\u05D7\u05D0\u05DF" },
    { id: "s-020", studentCode: "S020", fullName: "\u05E0\u05D5\u05E8 \u05E4\u05D0\u05E8\u05E1", className: "\u05D72", teacherName: "\u05E0\u05D0\u05D3\u05D9\u05D4 \u05E1\u05E8\u05D7\u05D0\u05DF" },
    // כיתה ט1 | רימא ג׳אבר
    { id: "s-021", studentCode: "S021", fullName: "\u05DC\u05D9\u05DF \u05E1\u05E2\u05D3", className: "\u05D81", teacherName: "\u05E8\u05D9\u05DE\u05D0 \u05D2\u05F3\u05D0\u05D1\u05E8" },
    { id: "s-022", studentCode: "S022", fullName: "\u05DE\u05D0\u05DC\u05DB \u05D0\u05D9\u05D1\u05E8\u05D4\u05D9\u05DD", className: "\u05D81", teacherName: "\u05E8\u05D9\u05DE\u05D0 \u05D2\u05F3\u05D0\u05D1\u05E8" },
    { id: "s-023", studentCode: "S023", fullName: "\u05D2\u05F3\u05E0\u05D0 \u05E2\u05D5\u05D3\u05D4", className: "\u05D81", teacherName: "\u05E8\u05D9\u05DE\u05D0 \u05D2\u05F3\u05D0\u05D1\u05E8" },
    { id: "s-024", studentCode: "S024", fullName: "\u05D0\u05D3\u05DD \u05DE\u05E0\u05E1\u05D5\u05E8", className: "\u05D81", teacherName: "\u05E8\u05D9\u05DE\u05D0 \u05D2\u05F3\u05D0\u05D1\u05E8" },
    { id: "s-025", studentCode: "S025", fullName: "\u05E1\u05D5\u05D4\u05D9\u05DC \u05E1\u05DC\u05D0\u05DE\u05D4", className: "\u05D81", teacherName: "\u05E8\u05D9\u05DE\u05D0 \u05D2\u05F3\u05D0\u05D1\u05E8" }
  ],
  passes: [
    {
      id: "pass-hist-1",
      studentId: "s-002",
      studentCode: "S002",
      studentName: "\u05DE\u05E8\u05D9\u05DD \u05E1\u05D0\u05DC\u05D7",
      className: "\u05D61",
      teacherId: "staff-t01",
      teacherName: "\u05DC\u05D9\u05E0\u05D0 \u05D7\u05F3\u05DC\u05D9\u05DC",
      dateStr: "2026-11-02",
      validFromTime: "12:30",
      status: "used",
      createdAt: "2026-11-02T10:30:00.000Z",
      createdBy: "\u05DC\u05D9\u05E0\u05D0 \u05D7\u05F3\u05DC\u05D9\u05DC",
      usedAt: "2026-11-02T10:38:00.000Z",
      usedBy: "\u05D0\u05D1\u05E8\u05D4\u05DD \u05DB\u05D4\u05DF (\u05E9\u05D5\u05DE\u05E8 \u05E9\u05E2\u05E8)",
      reason: "\u05D0\u05D9\u05E8\u05D5\u05E2 \u05DE\u05E9\u05E4\u05D7\u05EA\u05D9 \u05D5\u05EA\u05D5\u05E8 \u05DC\u05E8\u05D5\u05E4\u05D0"
    },
    {
      id: "pass-hist-2",
      studentId: "s-008",
      studentCode: "S008",
      studentName: "\u05E8\u05D0\u05DE\u05D9 \u05E2\u05D9\u05E1\u05D0",
      className: "\u05D62",
      teacherId: "staff-t02",
      teacherName: "\u05E1\u05D5\u05D4\u05D0 \u05DE\u05E0\u05E6\u05D5\u05E8",
      dateStr: "2026-11-03",
      validFromTime: "13:15",
      status: "used",
      createdAt: "2026-11-03T11:15:00.000Z",
      createdBy: "\u05E1\u05D5\u05D4\u05D0 \u05DE\u05E0\u05E6\u05D5\u05E8",
      usedAt: "2026-11-03T11:22:00.000Z",
      usedBy: "\u05D0\u05D1\u05E8\u05D4\u05DD \u05DB\u05D4\u05DF (\u05E9\u05D5\u05DE\u05E8 \u05E9\u05E2\u05E8)",
      reason: "\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D5\u05E8\u05D9\u05DD \u05D1\u05D5\u05D5\u05D8\u05E1\u05D0\u05E4 \u05DC\u05DE\u05D7\u05E0\u05DB\u05EA"
    }
  ],
  auditLogs: [
    {
      id: "log-seed-1",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      actionType: "RESET_DEMO",
      actorId: "system",
      actorName: "\u05DE\u05E2\u05E8\u05DB\u05EA",
      actorRole: "system",
      details: "\u05D8\u05E2\u05D9\u05E0\u05D4 \u05E8\u05D0\u05E9\u05D5\u05E0\u05D9\u05EA \u05E9\u05DC \u05E0\u05EA\u05D5\u05E0\u05D9 \u05DB\u05D9\u05EA\u05D5\u05EA, \u05DE\u05D7\u05E0\u05DB\u05D5\u05EA \u05D5\u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD"
    }
  ]
};
var SchoolDatabase = class {
  constructor() {
    this.listeners = [];
    this.ensureDirectory();
    this.data = this.loadData();
  }
  ensureDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn("Could not create data dir, running in memory:", e);
    }
  }
  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.staff && parsed.students) {
          return parsed;
        }
      }
    } catch (err) {
      console.error("Error loading database file, falling back to initial data:", err);
    }
    this.saveData(INITIAL_DEMO_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  }
  saveData(data) {
    try {
      this.ensureDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write database file, data kept in memory:", e);
    }
  }
  mutate(fn) {
    fn(this.data);
    this.data.settings.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    this.saveData(this.data);
    this.notify();
  }
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
  notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error("Listener notification error:", e);
      }
    }
  }
  // --- Read Operations ---
  getStaffByPin(pin) {
    const clean = normalizePin(pin);
    if (!clean) return void 0;
    if (clean === "160525") {
      let amar = this.data.staff.find((s) => s.id === "staff-admin-amar" || normalizePin(s.pinCode) === "160525");
      if (!amar) {
        amar = {
          id: "staff-admin-amar",
          staffCode: "ADMIN",
          fullName: "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA)",
          role: "admin",
          pinCode: "160525",
          assignedClasses: ["*"],
          isActive: true
        };
        this.data.staff.push(amar);
        this.saveData(this.data);
      } else {
        amar.pinCode = "160525";
        amar.role = "admin";
        amar.isActive = true;
        amar.assignedClasses = ["*"];
      }
      return amar;
    }
    return this.data.staff.find(
      (s) => normalizePin(s.pinCode) === clean && s.isActive
    );
  }
  getStaffById(id) {
    return this.data.staff.find((s) => s.id === id);
  }
  getAllStaff() {
    return this.data.staff;
  }
  getAllStudents() {
    return this.data.students;
  }
  getStudentsForTeacher(assignedClasses) {
    if (!assignedClasses || assignedClasses.length === 0) return [];
    if (assignedClasses.includes("*") || assignedClasses.includes("\u05DB\u05DC \u05D4\u05DB\u05D9\u05EA\u05D5\u05EA")) {
      return this.data.students;
    }
    return this.data.students.filter((s) => assignedClasses.includes(s.className));
  }
  getPassesForToday() {
    const today = getIsraelDateString();
    return this.data.passes.filter((p) => p.dateStr === today);
  }
  getPassForStudentToday(studentId) {
    const today = getIsraelDateString();
    return this.data.passes.find(
      (p) => p.studentId === studentId && p.dateStr === today && (p.status === "active" || p.status === "used")
    );
  }
  getAuditLogs(limit = 100) {
    return [...this.data.auditLogs].reverse().slice(0, limit);
  }
  searchPassesHistory(query, dateFrom, dateTo, className) {
    let list = [...this.data.passes];
    if (className && className !== "ALL") {
      list = list.filter((p) => p.className === className);
    }
    if (dateFrom) {
      list = list.filter((p) => p.dateStr >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((p) => p.dateStr <= dateTo);
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) => p.studentName.toLowerCase().includes(q) || p.studentCode.toLowerCase().includes(q) || p.teacherName.toLowerCase().includes(q) || p.usedBy && p.usedBy.toLowerCase().includes(q) || p.reason && p.reason.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  // --- Mutate Operations ---
  createPasses(studentIds, teacher, validFromTime, reason) {
    const today = getIsraelDateString();
    const created = [];
    const errors = [];
    const hasAllAccess = teacher.role === "admin" || teacher.assignedClasses.includes("*") || teacher.assignedClasses.includes("\u05DB\u05DC \u05D4\u05DB\u05D9\u05EA\u05D5\u05EA");
    this.mutate((data) => {
      for (const studentId of studentIds) {
        const student = data.students.find((s) => s.id === studentId);
        if (!student) {
          errors.push(`\u05EA\u05DC\u05DE\u05D9\u05D3 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0: ${studentId}`);
          continue;
        }
        if (!hasAllAccess && !teacher.assignedClasses.includes(student.className)) {
          errors.push(`\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4 \u05DC\u05D4\u05E0\u05E4\u05D9\u05E7 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05DC\u05EA\u05DC\u05DE\u05D9\u05D3 ${student.fullName} \u05DE\u05DB\u05D9\u05EA\u05D4 ${student.className}`);
          continue;
        }
        const existing = data.passes.find(
          (p) => p.studentId === studentId && p.dateStr === today && p.status === "active"
        );
        if (existing) {
          errors.push(`\u05DC\u05EA\u05DC\u05DE\u05D9\u05D3 ${student.fullName} \u05DB\u05D1\u05E8 \u05D9\u05E9 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05E4\u05E2\u05D9\u05DC \u05DC\u05D4\u05D9\u05D5\u05DD`);
          continue;
        }
        const newPass = {
          id: `pass-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          className: student.className,
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          dateStr: today,
          validFromTime: validFromTime || getIsraelTimeString(),
          status: "active",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: teacher.fullName,
          reason: reason || "\u05D9\u05E6\u05D9\u05D0\u05D4 \u05D1\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DE\u05D7\u05E0\u05DB\u05EA"
        };
        data.passes.push(newPass);
        created.push(newPass);
        data.auditLogs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          actionType: "PASS_CREATED",
          actorId: teacher.id,
          actorName: teacher.fullName,
          actorRole: teacher.role,
          studentName: student.fullName,
          className: student.className,
          details: `\u05D4\u05D5\u05E0\u05E4\u05E7 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05E6\u05D9\u05D0\u05D4 \u05DC\u05E9\u05E2\u05D4 ${newPass.validFromTime}`
        });
      }
    });
    return { created, errors };
  }
  cancelPass(passId, actor) {
    let resultPass;
    let errorMsg;
    this.mutate((data) => {
      const pass = data.passes.find((p) => p.id === passId);
      if (!pass) {
        errorMsg = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA";
        return;
      }
      if (pass.status === "used") {
        errorMsg = "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D1\u05D8\u05DC \u05D0\u05D9\u05E9\u05D5\u05E8 \u05E9\u05DB\u05D1\u05E8 \u05E0\u05D5\u05E6\u05DC (\u05D4\u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D1\u05E8 \u05D9\u05E6\u05D0)";
        return;
      }
      if (pass.status === "cancelled") {
        errorMsg = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DB\u05D1\u05E8 \u05D1\u05D5\u05D8\u05DC \u05E7\u05D5\u05D3\u05DD \u05DC\u05DB\u05DF";
        return;
      }
      if (actor.role === "teacher" && pass.teacherId !== actor.id) {
        errorMsg = "\u05DE\u05D7\u05E0\u05DB\u05EA \u05D9\u05DB\u05D5\u05DC\u05D4 \u05DC\u05D1\u05D8\u05DC \u05E8\u05E7 \u05D0\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD \u05E9\u05D4\u05E0\u05E4\u05D9\u05E7\u05D4 \u05D1\u05E2\u05E6\u05DE\u05D4";
        return;
      }
      pass.status = "cancelled";
      pass.cancelledAt = (/* @__PURE__ */ new Date()).toISOString();
      pass.cancelledBy = actor.fullName;
      resultPass = pass;
      data.auditLogs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "PASS_CANCELLED",
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        studentName: pass.studentName,
        className: pass.className,
        details: `\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05E6\u05D9\u05D0\u05D4 \u05D1\u05D5\u05D8\u05DC \u05E2\u05DC \u05D9\u05D3\u05D9 ${actor.fullName}`
      });
    });
    if (errorMsg) return { success: false, error: errorMsg };
    return { success: true, pass: resultPass };
  }
  markStudentExit(passId, guard) {
    let resultPass;
    let errorMsg;
    this.mutate((data) => {
      const pass = data.passes.find((p) => p.id === passId);
      if (!pass) {
        errorMsg = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA";
        return;
      }
      if (pass.status === "cancelled") {
        errorMsg = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D1\u05D5\u05D8\u05DC \u05E2\u05DC \u05D9\u05D3\u05D9 \u05D4\u05DE\u05D7\u05E0\u05DB\u05EA \u05D5\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E1\u05DE\u05DF \u05D9\u05E6\u05D9\u05D0\u05D4";
        return;
      }
      if (pass.status === "used") {
        errorMsg = `\u05D4\u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D1\u05E8 \u05D9\u05E6\u05D0 \u05DE\u05D4\u05E9\u05E2\u05E8 (\u05E0\u05E8\u05E9\u05DD \u05D1\u05E9\u05E2\u05D4 ${getIsraelTimeString(new Date(pass.usedAt))})`;
        return;
      }
      const today = getIsraelDateString();
      if (pass.dateStr !== today) {
        errorMsg = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D9\u05D5\u05E2\u05D3 \u05DC\u05D4\u05D9\u05D5\u05DD";
        return;
      }
      const nowTime = getIsraelTimeString();
      if (pass.validFromTime > nowTime) {
        errorMsg = `\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05D9\u05DB\u05E0\u05E1 \u05DC\u05EA\u05D5\u05E7\u05E3 \u05E8\u05E7 \u05D1\u05E9\u05E2\u05D4 ${pass.validFromTime} (\u05D4\u05E9\u05E2\u05D4 \u05DB\u05E2\u05EA: ${nowTime})`;
        return;
      }
      pass.status = "used";
      pass.usedAt = (/* @__PURE__ */ new Date()).toISOString();
      pass.usedBy = guard.fullName;
      resultPass = pass;
      data.auditLogs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "PASS_USED",
        actorId: guard.id,
        actorName: guard.fullName,
        actorRole: guard.role,
        studentName: pass.studentName,
        className: pass.className,
        details: `\u05D9\u05E6\u05D9\u05D0\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D1\u05E9\u05E2\u05E8 \u05E2\u05DC \u05D9\u05D3\u05D9 ${guard.fullName} \u05D1\u05E9\u05E2\u05D4 ${nowTime}`
      });
    });
    if (errorMsg) return { success: false, error: errorMsg };
    return { success: true, pass: resultPass };
  }
  resetToDemo() {
    this.mutate((data) => {
      data.staff = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA.staff));
      data.students = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA.students));
      data.passes = [];
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "RESET_DEMO",
        actorId: "admin",
        actorName: "\u05DE\u05D6\u05DB\u05D9\u05E8\u05D5\u05EA",
        actorRole: "admin",
        details: "\u05D0\u05D9\u05E4\u05D5\u05E1 \u05DE\u05E2\u05E8\u05DB\u05EA \u05DC\u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05D3\u05D2\u05DE\u05D4 \u05DE\u05E7\u05D5\u05E8\u05D9\u05D9\u05DD"
      });
    });
  }
  importStudentsData(newStudents, classesTeachers, actor) {
    let added = 0;
    let updated = 0;
    this.mutate((data) => {
      for (const item of newStudents) {
        const existing = data.students.find(
          (s) => item.studentCode && s.studentCode === item.studentCode || s.fullName.trim() === item.fullName.trim() && s.className.trim() === item.className.trim()
        );
        if (existing) {
          existing.fullName = item.fullName.trim();
          existing.className = item.className.trim();
          if (item.teacherName) existing.teacherName = item.teacherName.trim();
          if (item.notes) existing.notes = item.notes;
          updated++;
        } else {
          const newStudent = {
            id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            studentCode: item.studentCode || `S${(data.students.length + 1).toString().padStart(3, "0")}`,
            fullName: item.fullName.trim(),
            className: item.className.trim(),
            teacherName: item.teacherName?.trim(),
            notes: item.notes
          };
          data.students.push(newStudent);
          added++;
        }
      }
      for (const ct of classesTeachers) {
        if (!ct.teacherName) continue;
        const teacher = data.staff.find(
          (s) => s.role === "teacher" && s.fullName.trim() === ct.teacherName.trim()
        );
        if (teacher) {
          if (!teacher.assignedClasses.includes(ct.className)) {
            teacher.assignedClasses.push(ct.className);
          }
        } else {
          const codeNum = data.staff.filter((s) => s.role === "teacher").length + 1;
          data.staff.push({
            id: `staff-t${Date.now()}`,
            staffCode: `T${codeNum.toString().padStart(2, "0")}`,
            fullName: ct.teacherName.trim(),
            role: "teacher",
            pinCode: (1e3 + codeNum).toString(),
            assignedClasses: [ct.className],
            isActive: true
          });
        }
      }
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "STUDENTS_IMPORTED",
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: `\u05D9\u05D9\u05D1\u05D5\u05D0 \u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD: ${added} \u05E0\u05D5\u05E1\u05E4\u05D5, ${updated} \u05E2\u05D5\u05D3\u05DB\u05E0\u05D5. \u05E1\u05D4\u05F4\u05DB \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA: ${data.students.length}`
      });
    });
    return { added, updated, total: this.data.students.length };
  }
  updateStaff(staffList, actor) {
    this.mutate((data) => {
      data.staff = staffList;
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "STAFF_UPDATED",
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: `\u05E2\u05D3\u05DB\u05D5\u05DF \u05D0\u05E0\u05E9\u05D9 \u05E6\u05D5\u05D5\u05EA \u05D5\u05E7\u05D5\u05D3\u05D9 \u05D2\u05D9\u05E9\u05D4`
      });
    });
  }
};
var db = new SchoolDatabase();

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
var sessions = /* @__PURE__ */ new Map();
var sseClients = /* @__PURE__ */ new Set();
db.subscribe(() => {
  const payload = JSON.stringify({
    type: "UPDATE",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    today: getIsraelDateString(),
    time: getIsraelTimeString()
  });
  for (const client of sseClients) {
    try {
      client.write(`event: update
data: ${payload}

`);
    } catch {
      sseClients.delete(client);
    }
  }
});
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(`: ping

`);
    } catch {
      sseClients.delete(client);
    }
  }
}, 15e3);
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "\u05D7\u05E1\u05E8\u05D4 \u05D4\u05E8\u05E9\u05D0\u05EA \u05D2\u05D9\u05E9\u05D4. \u05D0\u05E0\u05D0 \u05D4\u05D9\u05DB\u05E0\u05E1 \u05E2\u05DD \u05E7\u05D5\u05D3 \u05D0\u05D9\u05E9\u05D9." });
    return;
  }
  const token = authHeader.split(" ")[1];
  const session = sessions.get(token);
  if (!session) {
    res.status(401).json({ error: "\u05E7\u05D5\u05D3 \u05D4\u05D2\u05D9\u05E9\u05D4 \u05E4\u05D2 \u05D0\u05D5 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05E3. \u05D0\u05E0\u05D0 \u05D4\u05D9\u05DB\u05E0\u05E1 \u05DE\u05D7\u05D3\u05E9." });
    return;
  }
  const staff = db.getStaffById(session.staffId);
  if (!staff || !staff.isActive) {
    sessions.delete(token);
    res.status(403).json({ error: "\u05DE\u05E9\u05EA\u05DE\u05E9 \u05D6\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05E4\u05E2\u05D9\u05DC \u05D0\u05D5 \u05E9\u05E7\u05D5\u05D3 \u05D4\u05D2\u05D9\u05E9\u05D4 \u05D1\u05D5\u05D8\u05DC." });
    return;
  }
  req.user = staff;
  next();
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !allowedRoles.includes(user.role) && user.role !== "admin") {
      res.status(403).json({ error: "\u05D0\u05D9\u05DF \u05DC\u05DA \u05D4\u05E8\u05E9\u05D0\u05D4 \u05DE\u05EA\u05D0\u05D9\u05DE\u05D4 \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5." });
      return;
    }
    next();
  };
}
app.post("/api/auth/login", (req, res) => {
  const rawPin = req.body.pinCode || req.body.pin;
  const pinCode = normalizePin(rawPin);
  if (!pinCode) {
    res.status(400).json({ error: "\u05D0\u05E0\u05D0 \u05D4\u05D6\u05DF \u05E7\u05D5\u05D3 \u05D0\u05D9\u05E9\u05D9" });
    return;
  }
  const staff = db.getStaffByPin(pinCode);
  if (!staff) {
    res.status(401).json({
      error: "\u05E7\u05D5\u05D3 \u05D0\u05D9\u05E9\u05D9 \u05E9\u05D2\u05D5\u05D9. \u05D0\u05E0\u05D0 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05D0\u05D5 \u05E4\u05E0\u05D4 \u05DC\u05DE\u05D6\u05DB\u05D9\u05E8\u05D5\u05EA."
    });
    return;
  }
  const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  sessions.set(token, {
    staffId: staff.id,
    role: staff.role,
    fullName: staff.fullName,
    createdAt: Date.now()
  });
  res.json({
    token,
    user: {
      id: staff.id,
      staffCode: staff.staffCode,
      fullName: staff.fullName,
      role: staff.role,
      assignedClasses: staff.assignedClasses
    }
  });
});
app.get("/api/auth/me", authenticate, (req, res) => {
  const staff = req.user;
  res.json({
    user: {
      id: staff.id,
      staffCode: staff.staffCode,
      fullName: staff.fullName,
      role: staff.role,
      assignedClasses: staff.assignedClasses
    }
  });
});
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    sessions.delete(token);
  }
  res.json({ success: true });
});
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  sseClients.add(res);
  res.write(`event: connected
data: ${JSON.stringify({ status: "connected", time: (/* @__PURE__ */ new Date()).toISOString() })}

`);
  req.on("close", () => {
    sseClients.delete(res);
  });
});
app.get("/api/teacher/my-classes", authenticate, requireRole("teacher", "vice_principal"), (req, res) => {
  const staff = req.user;
  const isSuperAdmin = staff.role === "admin" || staff.role === "vice_principal";
  const hasAllAccess = isSuperAdmin || staff.assignedClasses.includes("*") || staff.assignedClasses.includes("\u05DB\u05DC \u05D4\u05DB\u05D9\u05EA\u05D5\u05EA");
  let classes = staff.assignedClasses;
  let students = hasAllAccess ? db.getAllStudents() : db.getStudentsForTeacher(classes);
  if (hasAllAccess) {
    classes = Array.from(new Set(db.getAllStudents().map((s) => s.className))).sort();
  }
  const todayPasses = db.getPassesForToday();
  const passByStudentId = new Map(todayPasses.map((p) => [p.studentId, p]));
  const enrichedStudents = students.map((s) => {
    const pass = passByStudentId.get(s.id);
    return {
      ...s,
      currentPass: pass || null
    };
  });
  res.json({
    assignedClasses: classes,
    teacherName: staff.fullName,
    students: enrichedStudents,
    today: getIsraelDateString(),
    currentTime: getIsraelTimeString()
  });
});
app.get("/api/teacher/passes", authenticate, requireRole("teacher", "vice_principal"), (req, res) => {
  const staff = req.user;
  const allToday = db.getPassesForToday();
  const passes = staff.role === "admin" || staff.role === "vice_principal" ? allToday : allToday.filter((p) => p.teacherId === staff.id || staff.assignedClasses.includes(p.className));
  res.json({
    passes: passes.reverse(),
    currentTime: getIsraelTimeString()
  });
});
app.post("/api/passes/create", authenticate, requireRole("teacher", "vice_principal"), (req, res) => {
  const staff = req.user;
  const { studentIds, validFromTime, reason } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400).json({ error: "\u05DC\u05D0 \u05E0\u05D1\u05D7\u05E8\u05D5 \u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD \u05DC\u05D4\u05E0\u05E4\u05E7\u05EA \u05D0\u05D9\u05E9\u05D5\u05E8" });
    return;
  }
  const now = getIsraelTimeString();
  const effectiveTime = validFromTime || now;
  const result = db.createPasses(studentIds, staff, effectiveTime, reason);
  if (result.created.length === 0 && result.errors.length > 0) {
    res.status(400).json({ error: result.errors.join("; ") });
    return;
  }
  res.json({
    success: true,
    createdCount: result.created.length,
    created: result.created,
    errors: result.errors
  });
});
app.post("/api/passes/cancel", authenticate, requireRole("teacher", "vice_principal"), (req, res) => {
  const staff = req.user;
  const { passId } = req.body;
  if (!passId) {
    res.status(400).json({ error: "\u05D7\u05E1\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D1\u05D9\u05D8\u05D5\u05DC" });
    return;
  }
  const result = db.cancelPass(passId, staff);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ success: true, pass: result.pass });
});
app.get("/api/guard/search", authenticate, requireRole("guard", "admin"), (req, res) => {
  const query = (req.query.q || "").trim().toLowerCase();
  const allStudents = db.getAllStudents();
  const todayPasses = db.getPassesForToday();
  const nowTime = getIsraelTimeString();
  const passesByStudentId = new Map(todayPasses.map((p) => [p.studentId, p]));
  let filtered = allStudents;
  if (query) {
    filtered = allStudents.filter(
      (s) => s.fullName.toLowerCase().includes(query) || s.className.toLowerCase().includes(query) || s.studentCode && s.studentCode.toLowerCase().includes(query)
    );
  }
  const results = filtered.map((student) => {
    const pass = passesByStudentId.get(student.id);
    let statusType = "NO_PASS";
    let statusText = "\u05D0\u05D9\u05DF \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05E6\u05D9\u05D0\u05D4 \u05E4\u05E2\u05D9\u05DC";
    if (pass) {
      if (pass.status === "used") {
        statusType = "ALREADY_EXITED";
        const exitTime = pass.usedAt ? getIsraelTimeString(new Date(pass.usedAt)) : "\u05D4\u05D9\u05D5\u05DD";
        statusText = `\u05DB\u05D1\u05E8 \u05D9\u05E6\u05D0 \u05D1\u05E9\u05E2\u05D4 ${exitTime}`;
      } else if (pass.status === "cancelled") {
        statusType = "CANCELLED";
        statusText = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D1\u05D5\u05D8\u05DC";
      } else if (pass.status === "active") {
        if (pass.validFromTime <= nowTime) {
          statusType = "APPROVED_NOW";
          statusText = "\u05DE\u05D0\u05D5\u05E9\u05E8 \u05DC\u05E6\u05D0\u05EA \u05E2\u05DB\u05E9\u05D9\u05D5";
        } else {
          statusType = "APPROVED_FUTURE";
          statusText = `\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05D9\u05DB\u05E0\u05E1 \u05DC\u05EA\u05D5\u05E7\u05E3 \u05D1\u05E9\u05E2\u05D4 ${pass.validFromTime}`;
        }
      }
    }
    return {
      student,
      pass: pass || null,
      statusType,
      statusText
    };
  });
  res.json({
    results,
    currentTime: nowTime
  });
});
app.get("/api/guard/active-passes", authenticate, requireRole("guard", "vice_principal"), (req, res) => {
  const todayPasses = db.getPassesForToday();
  const nowTime = getIsraelTimeString();
  const activePasses = todayPasses.filter((p) => p.status === "active").map((p) => ({
    ...p,
    isNowValid: p.validFromTime <= nowTime
  }));
  const recentExits = todayPasses.filter((p) => p.status === "used").sort((a, b) => (b.usedAt || "").localeCompare(a.usedAt || "")).slice(0, 10);
  res.json({
    activePasses,
    recentExits,
    currentTime: nowTime,
    totalActive: activePasses.length,
    totalExitedToday: todayPasses.filter((p) => p.status === "used").length
  });
});
app.post("/api/guard/mark-exit", authenticate, requireRole("guard", "admin"), (req, res) => {
  const guard = req.user;
  const { passId } = req.body;
  if (!passId) {
    res.status(400).json({ error: "\u05D7\u05E1\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D0\u05D9\u05E9\u05D5\u05E8" });
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
    message: `\u05D4\u05D9\u05E6\u05D9\u05D0\u05D4 \u05E0\u05E8\u05E9\u05DE\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05E2\u05D1\u05D5\u05E8 ${result.pass?.studentName} (${result.pass?.className})`
  });
});
app.get("/api/admin/staff", authenticate, requireRole("admin"), (_req, res) => {
  const staff = db.getAllStaff();
  res.json({ staff });
});
app.post("/api/admin/staff", authenticate, requireRole("admin"), (req, res) => {
  const admin = req.user;
  const { staffList } = req.body;
  if (!Array.isArray(staffList)) {
    res.status(400).json({ error: "\u05E8\u05E9\u05D9\u05DE\u05EA \u05E6\u05D5\u05D5\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4" });
    return;
  }
  db.updateStaff(staffList, admin);
  res.json({ success: true, staff: db.getAllStaff() });
});
app.get("/api/admin/audit", authenticate, requireRole("admin"), (req, res) => {
  const logs = db.getAuditLogs(150);
  res.json({ logs });
});
app.post("/api/admin/import", authenticate, requireRole("admin"), (req, res) => {
  const admin = req.user;
  const { students, classesTeachers } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    res.status(400).json({ error: "\u05DC\u05D0 \u05E1\u05D5\u05E4\u05E7\u05D5 \u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD \u05DC\u05D9\u05D9\u05D1\u05D5\u05D0" });
    return;
  }
  const result = db.importStudentsData(students, classesTeachers || [], admin);
  res.json({
    success: true,
    added: result.added,
    updated: result.updated,
    total: result.total
  });
});
app.post("/api/admin/reset-demo", authenticate, requireRole("admin"), (_req, res) => {
  db.resetToDemo();
  res.json({ success: true, message: "\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05D0\u05D5\u05E4\u05E1\u05D4 \u05DC\u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05D4\u05D3\u05D2\u05DE\u05D4 \u05D4\u05DE\u05E7\u05D5\u05E8\u05D9\u05D9\u05DD" });
});
app.get("/api/admin/history-search", authenticate, (req, res) => {
  const query = req.query.q;
  const dateFrom = req.query.from;
  const dateTo = req.query.to;
  const className = req.query.class;
  const results = db.searchPassesHistory(query, dateFrom, dateTo, className);
  res.json({ passes: results });
});
async function startServer() {
  const isInsideDist = __dirname.endsWith("dist") || __dirname.endsWith("dist/");
  const distPath = isInsideDist ? __dirname : path2.resolve(process.cwd(), "dist");
  const hasBuiltDist = fs2.existsSync(path2.resolve(distPath, "index.html"));
  const isCloudRun = process.env.K_SERVICE !== void 0 || process.env.K_REVISION !== void 0;
  const isProduction = process.env.NODE_ENV === "production" || isInsideDist || isCloudRun || hasBuiltDist && process.env.NODE_ENV !== "development";
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    if (fs2.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path2.resolve(distPath, "index.html"));
      });
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[GatePass Server] Running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
