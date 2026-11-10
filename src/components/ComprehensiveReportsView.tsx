import React, { useState, useMemo } from 'react';
import { User, Student, GatePass, LateArrival, StaffMember } from '../types.ts';
import { clientStore } from '../lib/clientStore.ts';
import {
  Calendar,
  Clock,
  Printer,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  Users,
  GraduationCap,
  CalendarDays,
  DoorOpen,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';

interface ComprehensiveReportsViewProps {
  user: User;
  schoolName: string;
  allClasses: string[];
  students: Student[];
  passes: GatePass[];
  lateArrivals: LateArrival[];
  staffList?: StaffMember[];
  onRefresh?: () => void;
  fixedClassOnly?: string; // If set (e.g. homeroom teacher viewing only her class)
}

export type ReportType = 'late_arrivals' | 'gate_passes' | 'combined';
export type DatePreset = 'today' | 'yesterday' | '2days' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export function getDatePresetRange(preset: DatePreset): { fromDate: string; toDate: string; label: string } {
  const formatYMD = (d: Date) => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  };

  const now = new Date();
  const todayStr = formatYMD(now);

  if (preset === 'today') {
    return { fromDate: todayStr, toDate: todayStr, label: 'היום' };
  }
  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yStr = formatYMD(y);
    return { fromDate: yStr, toDate: yStr, label: 'אתמול' };
  }
  if (preset === '2days') {
    const d2 = new Date(now);
    d2.setDate(d2.getDate() - 2);
    return { fromDate: formatYMD(d2), toDate: todayStr, label: 'שלשום ועד היום' };
  }
  if (preset === 'this_week') {
    const d = new Date(now);
    const dayOfWeek = d.getDay(); // 0 is Sunday
    d.setDate(d.getDate() - dayOfWeek);
    return { fromDate: formatYMD(d), toDate: todayStr, label: 'שבוע נוכחי' };
  }
  if (preset === 'last_week') {
    const end = new Date(now);
    const dayOfWeek = end.getDay();
    end.setDate(end.getDate() - dayOfWeek - 1); // Last Saturday
    const start = new Date(end);
    start.setDate(start.getDate() - 6); // Last Sunday
    return { fromDate: formatYMD(start), toDate: formatYMD(end), label: 'שבוע שעבר' };
  }
  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromDate: formatYMD(start), toDate: todayStr, label: 'חודש נוכחי' };
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { fromDate: formatYMD(start), toDate: formatYMD(end), label: 'חודש שעבר' };
  }

  return { fromDate: todayStr, toDate: todayStr, label: 'היום' };
}

export const ComprehensiveReportsView: React.FC<ComprehensiveReportsViewProps> = ({
  user,
  schoolName,
  allClasses,
  students,
  passes,
  lateArrivals,
  staffList = [],
  fixedClassOnly
}) => {
  const [reportType, setReportType] = useState<ReportType>('late_arrivals');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customFromDate, setCustomFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customToDate, setCustomToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<string>(fixedClassOnly || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());
  const [copiedSummaryToast, setCopiedSummaryToast] = useState(false);

  // Combine props with all clientStore records so historical dates and today are always 100% available
  const allAvailableLateArrivals = useMemo(() => {
    const storeArrivals = clientStore.getLateArrivals({
      schoolId: user.schoolId && user.schoolId !== '*' ? user.schoolId : undefined,
    });
    const map = new Map<string, LateArrival>();
    for (const item of storeArrivals) map.set(item.id, item);
    for (const item of (lateArrivals || [])) map.set(item.id, item);
    return Array.from(map.values());
  }, [lateArrivals, user.schoolId]);

  const allAvailablePasses = useMemo(() => {
    const storePasses = clientStore.getAllPasses();
    const map = new Map<string, GatePass>();
    for (const item of storePasses) map.set(item.id, item);
    for (const item of (passes || [])) map.set(item.id, item);
    return Array.from(map.values());
  }, [passes]);

  // Active date range bounds
  const activeRange = useMemo(() => {
    if (datePreset === 'custom') {
      return { fromDate: customFromDate, toDate: customToDate, label: `${customFromDate} עד ${customToDate}` };
    }
    return getDatePresetRange(datePreset);
  }, [datePreset, customFromDate, customToDate]);

  // Homeroom teacher map for classes
  const homeroomMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      if (s.className && s.teacherName && !map.has(s.className)) {
        map.set(s.className, s.teacherName);
      }
    }
    for (const st of staffList) {
      if (st.role === 'teacher' && st.assignedClasses && st.assignedClasses.length === 1 && st.assignedClasses[0] !== '*') {
        map.set(st.assignedClasses[0], st.fullName.replace(/_/g, "'"));
      }
    }
    return map;
  }, [students, staffList]);

  // Normalize helper
  const normStr = (val: string) => (val || '').replace(/^כיתה\s*/i, '').replace(/['"`׳״\s]/g, '').toLowerCase();

  const effectiveClass = fixedClassOnly || selectedClass;

  // Filtered late arrivals
  const filteredLateArrivals = useMemo(() => {
    return allAvailableLateArrivals.filter((item) => {
      if (item.dateStr < activeRange.fromDate || item.dateStr > activeRange.toDate) return false;
      if (effectiveClass !== 'ALL' && normStr(item.className) !== normStr(effectiveClass)) return false;
      if (searchQuery.trim()) {
        const q = normStr(searchQuery);
        const nameMatch = normStr(item.studentName).includes(q);
        const classMatch = normStr(item.className).includes(q);
        const codeMatch = normStr(item.studentCode).includes(q);
        if (!nameMatch && !classMatch && !codeMatch) return false;
      }
      return true;
    });
  }, [allAvailableLateArrivals, activeRange, effectiveClass, searchQuery]);

  // Filtered passes
  const filteredPasses = useMemo(() => {
    return allAvailablePasses.filter((p) => {
      const passDate = p.dateStr || (p.createdAt ? p.createdAt.split('T')[0] : '');
      if (passDate < activeRange.fromDate || passDate > activeRange.toDate) return false;
      if (effectiveClass !== 'ALL' && normStr(p.className) !== normStr(effectiveClass)) return false;
      if (searchQuery.trim()) {
        const q = normStr(searchQuery);
        const nameMatch = normStr(p.studentName).includes(q);
        const classMatch = normStr(p.className).includes(q);
        const codeMatch = normStr(p.studentCode).includes(q);
        if (!nameMatch && !classMatch && !codeMatch) return false;
      }
      return true;
    });
  }, [allAvailablePasses, activeRange, effectiveClass, searchQuery]);

  // Grouped by student for Late Arrivals
  const studentLateGrouped = useMemo(() => {
    const map = new Map<string, { studentName: string; className: string; studentCode: string; items: LateArrival[] }>();
    for (const item of filteredLateArrivals) {
      const key = `${normStr(item.className)}::${normStr(item.studentName)}`;
      if (!map.has(key)) {
        map.set(key, {
          studentName: item.studentName,
          className: item.className,
          studentCode: item.studentCode,
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [filteredLateArrivals]);

  // Grouped by student for Gate Passes
  const studentPassesGrouped = useMemo(() => {
    const map = new Map<string, { studentName: string; className: string; studentCode: string; items: GatePass[] }>();
    for (const p of filteredPasses) {
      const key = `${normStr(p.className)}::${normStr(p.studentName)}`;
      if (!map.has(key)) {
        map.set(key, {
          studentName: p.studentName,
          className: p.className,
          studentCode: p.studentCode,
          items: [],
        });
      }
      map.get(key)!.items.push(p);
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [filteredPasses]);

  // Combined metrics
  const combinedGrouped = useMemo(() => {
    const map = new Map<string, { studentName: string; className: string; lates: LateArrival[]; passes: GatePass[] }>();
    for (const l of filteredLateArrivals) {
      const key = `${normStr(l.className)}::${normStr(l.studentName)}`;
      if (!map.has(key)) {
        map.set(key, { studentName: l.studentName, className: l.className, lates: [], passes: [] });
      }
      map.get(key)!.lates.push(l);
    }
    for (const p of filteredPasses) {
      const key = `${normStr(p.className)}::${normStr(p.studentName)}`;
      if (!map.has(key)) {
        map.set(key, { studentName: p.studentName, className: p.className, lates: [], passes: [] });
      }
      map.get(key)!.passes.push(p);
    }
    return Array.from(map.values()).sort((a, b) => (b.lates.length + b.passes.length) - (a.lates.length + a.passes.length));
  }, [filteredLateArrivals, filteredPasses]);

  const toggleExpandStudent = (key: string) => {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Build WhatsApp summary message for Homeroom teacher or School Principal
  const handleCopyWhatsAppSummary = () => {
    const currentClassStr = effectiveClass === 'ALL' ? 'כל בית הספר' : `כיתה ${effectiveClass}`;
    const teacherStr = effectiveClass !== 'ALL' && homeroomMap.has(effectiveClass) ? ` (מחנכת: ${homeroomMap.get(effectiveClass)})` : '';
    let text = `📊 *סיכום מנהלים ומעקב - ${schoolName}*\n`;
    text += `📍 *חתך:* ${currentClassStr}${teacherStr}\n`;
    text += `📅 *תקופה:* ${activeRange.label} (${activeRange.fromDate} עד ${activeRange.toDate})\n`;
    text += `------------------------------------\n\n`;

    if (reportType === 'late_arrivals' || reportType === 'combined') {
      text += `⏱️ *דוח איחורים בשער (${filteredLateArrivals.length} איחורים מצטברים):*\n`;
      if (studentLateGrouped.length === 0) {
        text += `• לא נרשמו איחורים בתקופה זו.\n`;
      } else {
        studentLateGrouped.slice(0, 15).forEach((st, idx) => {
          text += `${idx + 1}. *${st.studentName}* (${st.className}) - ${st.items.length} איחורים\n`;
          st.items.forEach((item) => {
            text += `   ↳ ${item.dateStr} בשעה ${item.timeStr} (${item.reason || 'איחור בוקר'})\n`;
          });
        });
        if (studentLateGrouped.length > 15) {
          text += ` ועוד ${studentLateGrouped.length - 15} תלמידים נוספים...\n`;
        }
      }
      text += `\n`;
    }

    if (reportType === 'gate_passes' || reportType === 'combined') {
      const exitedCount = filteredPasses.filter((p) => p.status === 'used').length;
      text += `🚪 *דוח אישורי שחרור (${filteredPasses.length} הונפקו, ${exitedCount} יצאו בפועל):*\n`;
      if (studentPassesGrouped.length === 0) {
        text += `• לא נרשמו שחרורים בתקופה זו.\n`;
      } else {
        studentPassesGrouped.slice(0, 15).forEach((st, idx) => {
          text += `${idx + 1}. *${st.studentName}* (${st.className}) - ${st.items.length} אישורים\n`;
          st.items.forEach((p) => {
            const exitTime = p.usedAt ? `יצא/ה בשעה ${p.usedAt.split('T')[1].substring(0, 5)}` : 'ממתין / לא יצא';
            text += `   ↳ ${p.dateStr || p.createdAt.split('T')[0]}: ${p.reason || 'שחרור'} (${exitTime})\n`;
          });
        });
      }
    }

    text += `\n*הופק ממערכת אישור לשער - הנהלת בית הספר*`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSummaryToast(true);
      setTimeout(() => setCopiedSummaryToast(false), 3000);
    }
  };

  // Export to Excel / CSV with Hebrew UTF-8 BOM
  const handleExportCSV = () => {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    const filename = `דוח_${reportType}_${effectiveClass}_${activeRange.fromDate}_${activeRange.toDate}.csv`;

    if (reportType === 'late_arrivals') {
      csv += 'מזהה,תאריך,שעת כניסה בשער,שם התלמיד/ה,כיתה,מחנכת,תורן שער רושם,סיבת איחור,הערות\n';
      filteredLateArrivals.forEach((item) => {
        csv += `"${item.id}","${item.dateStr}","${item.timeStr}","${item.studentName}","${item.className}","${homeroomMap.get(item.className) || ''}","${item.recordedByName}","${item.reason || ''}","${item.notes || ''}"\n`;
      });
    } else if (reportType === 'gate_passes') {
      csv += 'מזהה,תאריך,שעת אישור,סטטוס,שם התלמיד/ה,כיתה,מחנכת,גורם מאשר,שעת יציאה בפועל,שומר מאשר,סיבת שחרור\n';
      filteredPasses.forEach((p) => {
        const exitTime = p.usedAt ? p.usedAt.split('T')[1].substring(0, 5) : '';
        csv += `"${p.id}","${p.dateStr || p.createdAt.split('T')[0]}","${p.validFromTime}","${p.status}","${p.studentName}","${p.className}","${p.homeroomTeacher || homeroomMap.get(p.className) || ''}","${p.teacherName}","${exitTime}","${p.usedBy || ''}","${p.reason || ''}"\n`;
      });
    } else {
      csv += 'שם התלמיד/ה,כיתה,מחנכת,כמות איחורים בתקופה,כמות שחרורים בתקופה,סה״כ אירועים\n';
      combinedGrouped.forEach((g) => {
        csv += `"${g.studentName}","${g.className}","${homeroomMap.get(g.className) || ''}","${g.lates.length}","${g.passes.length}","${g.lates.length + g.passes.length}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Official Letterhead Print via isolated print iframe
  const handlePrintOfficialReport = () => {
    const reportTitle =
      reportType === 'late_arrivals'
        ? 'דוח איחורים וכניסות בשער'
        : reportType === 'gate_passes'
        ? 'דוח אישורי שחרור ויציאה מהשער'
        : 'דוח ביקורת משולב (איחורים ושחרורים)';

    const currentClassStr = effectiveClass === 'ALL' ? 'כל שכבות בית הספר' : `כיתה ${effectiveClass}`;
    const teacherStr = effectiveClass !== 'ALL' && homeroomMap.has(effectiveClass) ? ` · מחנכת הכיתה: ${homeroomMap.get(effectiveClass)}` : '';

    let tableHtml = '';

    if (reportType === 'late_arrivals') {
      const rows = filteredLateArrivals
        .map(
          (item, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:bold;">${item.studentName}</td>
          <td>${item.className}</td>
          <td style="text-align:center;">${item.dateStr}</td>
          <td style="text-align:center; font-family:monospace; font-weight:bold; color:#b45309;">${item.timeStr}</td>
          <td>${item.recordedByName}</td>
          <td>${item.reason || 'איחור בוקר'}</td>
        </tr>
      `
        )
        .join('');

      tableHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th style="width:30px; text-align:center;">#</th>
              <th>שם התלמיד/ה</th>
              <th>כיתה</th>
              <th style="text-align:center;">תאריך</th>
              <th style="text-align:center;">שעת כניסה בשער</th>
              <th>נרשם ע״י תורן שער</th>
              <th>סיבה</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center; padding:15px;">אין נתוני איחורים בטווח זה</td></tr>'}</tbody>
        </table>
      `;
    } else if (reportType === 'gate_passes') {
      const rows = filteredPasses
        .map((p, idx) => {
          const statusText = p.status === 'used' ? 'יצא/ה מהשער' : p.status === 'cancelled' ? 'בוטל' : 'ממתין';
          const exitTime = p.usedAt ? p.usedAt.split('T')[1].substring(0, 5) : '-';
          return `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td style="font-weight:bold;">${p.studentName}</td>
            <td>${p.className}</td>
            <td style="text-align:center;">${p.dateStr || p.createdAt.split('T')[0]}</td>
            <td style="text-align:center;">${p.validFromTime}</td>
            <td>${p.teacherName}</td>
            <td style="text-align:center; font-weight:bold; color:${p.status === 'used' ? '#047857' : '#64748b'};">${statusText} (${exitTime})</td>
            <td>${p.reason || 'שחרור'}</td>
          </tr>
        `;
        })
        .join('');

      tableHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th style="width:30px; text-align:center;">#</th>
              <th>שם התלמיד/ה</th>
              <th>כיתה</th>
              <th style="text-align:center;">תאריך</th>
              <th style="text-align:center;">שעת אישור</th>
              <th>גורם מאשר</th>
              <th style="text-align:center;">יציאה בפועל</th>
              <th>סיבה</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="8" style="text-align:center; padding:15px;">אין נתוני שחרורים בטווח זה</td></tr>'}</tbody>
        </table>
      `;
    } else {
      const rows = combinedGrouped
        .map(
          (g, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:bold;">${g.studentName}</td>
          <td>${g.className}</td>
          <td style="text-align:center; font-weight:bold; color:#b45309;">${g.lates.length}</td>
          <td style="text-align:center; font-weight:bold; color:#0369a1;">${g.passes.length}</td>
          <td style="text-align:center; font-weight:900;">${g.lates.length + g.passes.length}</td>
        </tr>
      `
        )
        .join('');

      tableHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th style="width:30px; text-align:center;">#</th>
              <th>שם התלמיד/ה</th>
              <th>כיתה</th>
              <th style="text-align:center;">איחורים בתקופה</th>
              <th style="text-align:center;">שחרורים בתקופה</th>
              <th style="text-align:center;">סה״כ אירועים</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center; padding:15px;">אין נתונים בטווח זה</td></tr>'}</tbody>
        </table>
      `;
    }

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>${reportTitle} - ${schoolName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Assistant', 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background: #fff; color: #0f172a; direction: rtl; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .header .gov { font-size: 11px; font-weight: bold; color: #64748b; }
    .header h1 { margin: 4px 0 2px 0; font-size: 19px; font-weight: 900; }
    .header .meta { font-size: 11px; color: #334155; margin-top: 4px; }
    .stats-box { display: flex; justify-content: space-around; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; margin-bottom: 12px; font-size: 12px; }
    .stats-box div strong { font-size: 14px; color: #0f172a; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .report-table th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: right; border: 1px solid #334155; }
    .report-table td { padding: 5px 8px; border: 1px solid #cbd5e1; vertical-align: middle; }
    .report-table tr:nth-child(even) { background: #f8fafc; }
    .report-table tr { page-break-inside: avoid; break-inside: avoid; }
    .footer { margin-top: 25px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    .signature-area { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; }
    .sig-line { width: 160px; border-top: 1px solid #0f172a; text-align: center; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="gov">משרד החינוך · הנהלת מוסד החינוך · אגף ביטחון ובקרת שער</div>
    <h1>${schoolName} - ${reportTitle}</h1>
    <div class="meta">
      <strong>חתך:</strong> ${currentClassStr}${teacherStr} &nbsp;|&nbsp; 
      <strong>תקופה:</strong> ${activeRange.label} (${activeRange.fromDate} עד ${activeRange.toDate}) &nbsp;|&nbsp;
      <strong>הופק ע״י:</strong> ${user.fullName} (${user.role === 'admin' ? 'מנהל המערכת' : user.role === 'vice_principal' ? 'סגן מנהל / אחראי שחרורים' : 'מחנכת כיתה'})
    </div>
  </div>

  <div class="stats-box">
    <div>סה״כ רשומות בדוח: <strong>${reportType === 'late_arrivals' ? filteredLateArrivals.length : reportType === 'gate_passes' ? filteredPasses.length : combinedGrouped.length}</strong></div>
    <div>תלמידים ייחודיים: <strong>${reportType === 'late_arrivals' ? studentLateGrouped.length : reportType === 'gate_passes' ? studentPassesGrouped.length : combinedGrouped.length}</strong></div>
    <div>תאריך הפקה: <strong>${new Date().toLocaleDateString('he-IL')} בשעה ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</strong></div>
  </div>

  ${tableHtml}

  <div class="signature-area">
    <div class="sig-line">חתימת מחנך/ת הכיתה</div>
    <div class="sig-line">חתימת סגן מנהל / אחראי שחרורים</div>
    <div class="sig-line">חתימת הנהלת בית הספר</div>
  </div>

  <div class="footer">
    <span>מערכת אישור לשער - דוח מוסדי רשמי</span>
    <span>עמוד 1 מתוך 1</span>
  </div>
</body>
</html>`;

    try {
      const oldIframe = document.getElementById('report-print-hidden-iframe');
      if (oldIframe) oldIframe.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'report-print-hidden-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          }
          setTimeout(() => iframe.remove(), 4000);
        }, 350);
        return;
      }
    } catch {
      window.print();
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  {user.role === 'teacher' ? 'מחנכת כיתה · בקרה ודוחות' : 'הנהלת בית הספר · בקרה מקיפה'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Rubik'] mt-0.5">
                דוחות וסיכומים מקיפים להנהלה ולמחנכות
              </h2>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                מעקב מלא לפי מועדים (היום, אתמול, שלשום, שבוע שעבר, חודש שעבר) להצגת נתוני אמת להורים ולצוות
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsAppSummary}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-sm"
              title="העתק סיכום מוכן לשליחה בוואטסאפ"
            >
              {copiedSummaryToast ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">הועתק ללוח!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>העתק סיכום לוואטסאפ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-teal-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-sm"
              title="ייצוא קובץ אקסל (CSV) תואם עברית"
            >
              <Download className="w-4 h-4" />
              <span>ייצוא לאקסל</span>
            </button>

            <button
              type="button"
              onClick={handlePrintOfficialReport}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 active:scale-95 text-white font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/30 cursor-pointer"
              title="הדפסת דוח רשמי מוכן לחתימות בפורמט A4"
            >
              <Printer className="w-4 h-4" />
              <span>הדפס דוח רשמי (A4 / PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Row 1: Report Type Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-slate-700 ml-1">סוג הדוח:</span>
          {[
            { id: 'late_arrivals', label: '⏱️ דוח איחורים מפורט', badge: filteredLateArrivals.length },
            { id: 'gate_passes', label: '🚪 דוח שחרורים ויציאות', badge: filteredPasses.length },
            { id: 'combined', label: '📊 סיכום כיתתי משולב', badge: combinedGrouped.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportType(tab.id as ReportType)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                reportType === tab.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                reportType === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Row 2: Date Presets */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-black text-slate-700 ml-1">מועד לבדיקה:</span>
          {[
            { id: 'today', label: 'היום' },
            { id: 'yesterday', label: 'אתמול' },
            { id: '2days', label: 'שלשום' },
            { id: 'this_week', label: 'שבוע נוכחי' },
            { id: 'last_week', label: 'שבוע שעבר' },
            { id: 'this_month', label: 'חודש נוכחי' },
            { id: 'last_month', label: 'חודש שעבר' },
            { id: 'custom', label: 'מותאם אישית...' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDatePreset(p.id as DatePreset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === p.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if 'custom' is active */}
        {datePreset === 'custom' && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center gap-3 flex-wrap text-xs">
            <span className="font-bold text-indigo-950">בחר טווח תאריכים:</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">מתאריך:</span>
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">עד תאריך:</span>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Row 3: Class Filter & Search Filter (only if not fixedClassOnly) */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Class Select */}
          {!fixedClassOnly ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-700">סינון כיתה:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value="ALL">כל בית הספר (כל הכיתות)</option>
                {allClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    כיתה {cls} {homeroomMap.has(cls) ? `(מחנכת: ${homeroomMap.get(cls)})` : ''}
                  </option>
                ))}
              </select>

              {selectedClass !== 'ALL' && homeroomMap.has(selectedClass) && (
                <span className="text-xs text-indigo-950 font-bold bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                  מחנכת: {homeroomMap.get(selectedClass)}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">כיתה:</span>
              <span className="text-xs text-indigo-950 font-bold bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-xl">
                כיתה {fixedClassOnly} {homeroomMap.has(fixedClassOnly) ? `(מחנכת: ${homeroomMap.get(fixedClassOnly)})` : ''}
              </span>
            </div>
          )}

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="חיפוש תלמיד/ה לפי שם..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl pr-9 pl-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">
            {reportType === 'late_arrivals' ? 'סה״כ איחורים בתקופה' : reportType === 'gate_passes' ? 'סה״כ שחרורים שהונפקו' : 'סה״כ אירועי שער'}
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {reportType === 'late_arrivals' ? filteredLateArrivals.length : reportType === 'gate_passes' ? filteredPasses.length : filteredLateArrivals.length + filteredPasses.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">{activeRange.label}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">תלמידים ייחודיים</div>
          <div className="text-3xl font-black text-indigo-600 font-mono">
            {reportType === 'late_arrivals' ? studentLateGrouped.length : reportType === 'gate_passes' ? studentPassesGrouped.length : combinedGrouped.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">שעבורם נרשמו אירועים</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">
            {reportType === 'gate_passes' ? 'יצאו בפועל מהשער' : 'איחור חוזר (2+)'}
          </div>
          <div className="text-3xl font-black text-emerald-600 font-mono">
            {reportType === 'gate_passes'
              ? filteredPasses.filter((p) => p.status === 'used').length
              : studentLateGrouped.filter((s) => s.items.length >= 2).length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {reportType === 'gate_passes' ? 'אושרו ע״י שומר' : 'תלמידים שאיחרו שוב'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">כיתה נבחרת</div>
          <div className="text-lg font-black text-slate-900 truncate">
            {effectiveClass === 'ALL' ? 'כל בית הספר' : `כיתה ${effectiveClass}`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {effectiveClass !== 'ALL' && homeroomMap.has(effectiveClass) ? homeroomMap.get(effectiveClass) : `${allClasses.length} כיתות`}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-black text-slate-900 font-['Rubik']">
              {reportType === 'late_arrivals'
                ? `פירוט תלמידים מאחרים (${studentLateGrouped.length} תלמידים)`
                : reportType === 'gate_passes'
                ? `פירוט שחרורי תלמידים (${studentPassesGrouped.length} תלמידים)`
                : `סיכום כולל מרוכז (${combinedGrouped.length} תלמידים)`}
            </h3>
            <p className="text-xs text-slate-500">
              לחיצה על תלמיד מציגה את כל התאריכים והשעות המדויקות למענה מהיר להורים ולמחנכת
            </p>
          </div>

          <div className="text-xs text-slate-500 font-bold">
            טווח: <span className="text-slate-900">{activeRange.label} ({activeRange.fromDate} - {activeRange.toDate})</span>
          </div>
        </div>

        {/* LATE ARRIVALS ACCORDION VIEW */}
        {reportType === 'late_arrivals' && (
          <div className="space-y-3">
            {studentLateGrouped.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Clock className="w-10 h-10 mx-auto text-slate-300" />
                <div className="text-sm font-bold text-slate-600">אין נתוני איחורים בטווח מועדים זה</div>
                <div className="text-xs">בחר מועד אחר למעלה או שנה את סינון הכיתה</div>
              </div>
            ) : (
              studentLateGrouped.map((st) => {
                const key = `${st.className}::${st.studentName}`;
                const isExpanded = expandedStudentIds.has(key);
                return (
                  <div
                    key={key}
                    className="border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 transition-all bg-slate-50/50"
                  >
                    <div
                      onClick={() => toggleExpandStudent(key)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-black text-base flex items-center justify-center shrink-0 border border-amber-200">
                          {st.items.length}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>{st.studentName}</span>
                            <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              כיתה {st.className}
                            </span>
                            {homeroomMap.has(st.className) && (
                              <span className="text-[11px] text-slate-400">
                                מחנכת: {homeroomMap.get(st.className)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            סה״כ <strong>{st.items.length}</strong> איחורים מתועדים בתקופה זו
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600 hidden sm:inline">
                          {isExpanded ? 'הסתר פירוט תאריכים' : 'הצג פירוט תאריכים ושעות'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details list */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200 space-y-2 text-xs">
                        <div className="font-bold text-slate-700 pb-1">
                          מועדי כניסה מדויקים בשער (רשומות אמת לעיון הורים):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {st.items.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200 text-slate-800 space-y-1"
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span>תאריך: {item.dateStr}</span>
                                <span className="font-mono text-amber-900 text-sm bg-white px-2 py-0.5 rounded border border-amber-300">
                                  {item.timeStr}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                נרשם ע״י: <strong>{item.recordedByName}</strong>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                סיבת איחור: <strong>{item.reason || 'איחור בוקר'}</strong>
                              </div>
                              {item.notes && (
                                <div className="text-[11px] text-slate-500 italic">
                                  הערה: {item.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* GATE PASSES VIEW */}
        {reportType === 'gate_passes' && (
          <div className="space-y-3">
            {studentPassesGrouped.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <DoorOpen className="w-10 h-10 mx-auto text-slate-300" />
                <div className="text-sm font-bold text-slate-600">אין נתוני שחרורים בטווח מועדים זה</div>
                <div className="text-xs">בחר מועד אחר למעלה או שנה את סינון הכיתה</div>
              </div>
            ) : (
              studentPassesGrouped.map((st) => {
                const key = `${st.className}::${st.studentName}`;
                const isExpanded = expandedStudentIds.has(key);
                return (
                  <div
                    key={key}
                    className="border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 transition-all bg-slate-50/50"
                  >
                    <div
                      onClick={() => toggleExpandStudent(key)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 font-black text-base flex items-center justify-center shrink-0 border border-blue-200">
                          {st.items.length}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>{st.studentName}</span>
                            <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              כיתה {st.className}
                            </span>
                            {homeroomMap.has(st.className) && (
                              <span className="text-[11px] text-slate-400">
                                מחנכת: {homeroomMap.get(st.className)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            <strong>{st.items.filter((p) => p.status === 'used').length}</strong> יצאו מהשער בפועל ·{' '}
                            <strong>{st.items.filter((p) => p.status === 'cancelled').length}</strong> בוטלו
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600 hidden sm:inline">
                          {isExpanded ? 'הסתר פירוט' : 'הצג פירוט יציאות'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200 space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {st.items.map((p) => {
                            const exitTime = p.usedAt ? p.usedAt.split('T')[1].substring(0, 5) : null;
                            return (
                              <div
                                key={p.id}
                                className={`p-2.5 rounded-xl border space-y-1 ${
                                  p.status === 'used'
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                    : p.status === 'cancelled'
                                    ? 'bg-rose-50/70 border-rose-200 text-rose-950 opacity-60'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span>תאריך: {p.dateStr || p.createdAt.split('T')[0]}</span>
                                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border">
                                    לשעה {p.validFromTime}
                                  </span>
                                </div>
                                <div>אושר ע״י: <strong>{p.teacherName}</strong></div>
                                <div>
                                  סטטוס יציאה בשער:{' '}
                                  <strong className={p.status === 'used' ? 'text-emerald-700' : ''}>
                                    {p.status === 'used'
                                      ? `יצא/ה מהשער בשעה ${exitTime} (אימות שומר: ${p.usedBy || 'שומר'})`
                                      : p.status === 'cancelled'
                                      ? `בוטל ע״י ${p.cancelledBy || 'הצוות'}`
                                      : 'טרם יצא/ה'}
                                  </strong>
                                </div>
                                <div className="text-[11px] text-slate-500">סיבה: {p.reason || 'שחרור'}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* COMBINED AUDIT TABLE VIEW */}
        {reportType === 'combined' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">שם התלמיד/ה</th>
                  <th className="p-3">כיתה</th>
                  <th className="p-3">מחנכת הכיתה</th>
                  <th className="p-3 text-center bg-amber-950 text-amber-300">איחורים בתקופה</th>
                  <th className="p-3 text-center bg-blue-950 text-blue-300">שחרורים בתקופה</th>
                  <th className="p-3 text-center">סה״כ אירועים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {combinedGrouped.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      אין נתונים בטווח מועדים זה
                    </td>
                  </tr>
                ) : (
                  combinedGrouped.map((g, idx) => (
                    <tr key={`${g.className}::${g.studentName}`} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{g.studentName}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold border border-slate-200">
                          כיתה {g.className}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{homeroomMap.get(g.className) || '-'}</td>
                      <td className="p-3 text-center font-mono font-black text-amber-700 bg-amber-50/50">
                        {g.lates.length}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-blue-700 bg-blue-50/50">
                        {g.passes.length}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-slate-900 text-sm">
                        {g.lates.length + g.passes.length}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
