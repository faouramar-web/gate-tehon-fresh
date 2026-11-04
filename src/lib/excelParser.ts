import * as XLSX from 'xlsx';

export interface ParsedStudentRow {
  studentCode: string;
  fullName: string;
  className: string;
  teacherName?: string;
  notes?: string;
  rawRowIndex?: number;
  sheetName?: string;
  hasWarning?: boolean;
  warningMessage?: string;
}

export interface ParseResult {
  fileName: string;
  sheetNames: string[];
  students: ParsedStudentRow[];
  classesSummary: Array<{
    className: string;
    teacherName: string;
    count: number;
    students: ParsedStudentRow[];
  }>;
  duplicatesCount: number;
  missingDataCount: number;
  warnings: string[];
  requiresManualMapping?: boolean;
  unmappedSheets?: string[];
}

// Clean and normalize strings while preserving exact Hebrew spelling
function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// Helper to check if a header string looks like "student name" in Hebrew/English
function isStudentNameHeader(str: string): boolean {
  const s = str.toLowerCase();
  return (
    s.includes('שם תלמיד') ||
    s.includes('שם מלא') ||
    s.includes('תלמיד') ||
    s.includes('student') ||
    s.includes('full name') ||
    s === 'שם'
  );
}

// Helper to check if header looks like "student id / code"
function isStudentCodeHeader(str: string): boolean {
  const s = str.toLowerCase();
  return (
    s.includes('מזהה תלמיד') ||
    s.includes('מזהה') ||
    s.includes('ת.ז') ||
    s.includes('תעודת זהות') ||
    s.includes('קוד תלמיד') ||
    s.includes('מספר תלמיד') ||
    s.includes('id') ||
    s.includes('code')
  );
}

// Helper to check if header looks like "class name"
function isClassHeader(str: string): boolean {
  const s = str.toLowerCase();
  return s.includes('כיתה') || s.includes('class') || s.includes('שכבה');
}

// Helper to check if header looks like "teacher name"
function isTeacherHeader(str: string): boolean {
  const s = str.toLowerCase();
  return s.includes('מחנכת') || s.includes('מחנך') || s.includes('מורה') || s.includes('teacher');
}

// Parse sheet name or title line like "כיתה ז1 | לינא ח׳ליל" or "כיתה ז1"
function extractClassAndTeacherFromText(text: string): { className?: string; teacherName?: string } {
  const clean = text.trim();
  // Pattern: "כיתה ז1 | לינא ח׳ליל" or "ז1 - לינא ח׳ליל"
  const pipeSplit = clean.split(/[|•\-–]/).map((s) => s.trim());
  let className: string | undefined;
  let teacherName: string | undefined;

  for (const part of pipeSplit) {
    if (part.includes('כיתה') || /^[זחטיו][1-9]$/.test(part) || /^[זחטיו]׳?[1-9]$/.test(part)) {
      className = part.replace(/^כיתה\s*/, '').trim();
    } else if (part.length > 2 && !part.includes('רשימ') && !part.includes('תלמיד') && !part.includes('בית ספר')) {
      teacherName = part.replace(/^(מחנכת|מחנך)\s*:?\s*/, '').trim();
    }
  }

  return { className, teacherName };
}

export function parseExcelOrCsv(fileBuffer: ArrayBuffer, fileName: string): ParseResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  const allParsedStudents: ParsedStudentRow[] = [];
  const warnings: string[] = [];
  const unmappedSheets: string[] = [];

  let duplicateCount = 0;
  let missingDataCount = 0;
  const seenStudentCodes = new Set<string>();
  const seenNamesByClass = new Set<string>();

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // Convert sheet to 2D array of rows
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rows.length === 0) continue;

    // Check if sheet name itself contains class / teacher
    const fromSheetName = extractClassAndTeacherFromText(sheetName);
    let sheetClassName = fromSheetName.className || '';
    let sheetTeacherName = fromSheetName.teacherName || '';

    // Check early title rows (rows 0 to 4) for class or teacher info
    let tableHeaderRowIndex = -1;
    let nameColIndex = -1;
    let codeColIndex = -1;
    let classColIndex = -1;
    let teacherColIndex = -1;

    for (let r = 0; r < Math.min(rows.length, 6); r++) {
      const row = rows[r];
      const joinedRow = row.map(cleanStr).join(' ');

      // Check if this row is a title banner like "כיתה ז1 | לינא ח׳ליל"
      if (!sheetClassName || !sheetTeacherName) {
        const fromTitleRow = extractClassAndTeacherFromText(joinedRow);
        if (fromTitleRow.className && !sheetClassName) sheetClassName = fromTitleRow.className;
        if (fromTitleRow.teacherName && !sheetTeacherName) sheetTeacherName = fromTitleRow.teacherName;
      }

      // Check if this row is the column headers
      for (let c = 0; c < row.length; c++) {
        const cell = cleanStr(row[c]);
        if (isStudentNameHeader(cell)) nameColIndex = c;
        if (isStudentCodeHeader(cell)) codeColIndex = c;
        if (isClassHeader(cell)) classColIndex = c;
        if (isTeacherHeader(cell)) teacherColIndex = c;
      }

      if (nameColIndex !== -1) {
        tableHeaderRowIndex = r;
        break;
      }
    }

    // If we didn't find a named column header, test if row 0 could be data or if columns are [Code, Name] or [Name, Code]
    if (tableHeaderRowIndex === -1) {
      // Look for any row that has textual names
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (row.length >= 2) {
          const c0 = cleanStr(row[0]);
          const c1 = cleanStr(row[1]);
          if (c0 && c1) {
            // Check if one looks like an ID code (e.g. S001, 12345) and the other has Hebrew letters
            const c0IsCode = /^[a-zA-Z0-9\-_]{2,10}$/.test(c0);
            const c1IsCode = /^[a-zA-Z0-9\-_]{2,10}$/.test(c1);
            if (c0IsCode && !c1IsCode) {
              codeColIndex = 0;
              nameColIndex = 1;
              tableHeaderRowIndex = r - 1; // data starts at r
              break;
            } else if (!c0IsCode && c1IsCode) {
              nameColIndex = 0;
              codeColIndex = 1;
              tableHeaderRowIndex = r - 1;
              break;
            }
          }
        }
      }
    }

    if (nameColIndex === -1) {
      unmappedSheets.push(sheetName);
      warnings.push(`בלשונית "${sheetName}" לא זוהתה עמודת שם תלמיד באופן מובהק.`);
      continue;
    }

    // Start scanning data rows after header
    const dataStartRow = tableHeaderRowIndex + 1;
    for (let r = dataStartRow; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const fullName = cleanStr(row[nameColIndex]);
      if (!fullName) continue; // Skip blank rows

      // Skip accidental header repeats
      if (isStudentNameHeader(fullName)) continue;

      const studentCode = codeColIndex !== -1 ? cleanStr(row[codeColIndex]) : '';
      const rowClass = classColIndex !== -1 ? cleanStr(row[classColIndex]) : '';
      const rowTeacher = teacherColIndex !== -1 ? cleanStr(row[teacherColIndex]) : '';

      const finalClass = rowClass || sheetClassName || (sheetNames.length === 1 ? 'כללי' : sheetName);
      const finalTeacher = rowTeacher || sheetTeacherName;

      let hasWarning = false;
      let warningMessage = '';

      if (!finalClass) {
        hasWarning = true;
        warningMessage = 'לא שויכה כיתה';
        missingDataCount++;
      }

      // Check duplicates
      const classKey = `${fullName}@${finalClass}`;
      if (studentCode && seenStudentCodes.has(studentCode)) {
        hasWarning = true;
        warningMessage = `מזהה תלמיד כפול: ${studentCode}`;
        duplicateCount++;
      } else if (seenNamesByClass.has(classKey)) {
        hasWarning = true;
        warningMessage = `שם תלמיד כפול באותה כיתה: ${fullName}`;
        duplicateCount++;
      }

      if (studentCode) seenStudentCodes.add(studentCode);
      seenNamesByClass.add(classKey);

      allParsedStudents.push({
        studentCode,
        fullName,
        className: finalClass,
        teacherName: finalTeacher,
        rawRowIndex: r + 1,
        sheetName,
        hasWarning,
        warningMessage,
      });
    }
  }

  // Group by class
  const classMap = new Map<string, { className: string; teacherName: string; count: number; students: ParsedStudentRow[] }>();

  for (const s of allParsedStudents) {
    const key = s.className || 'ללא כיתה';
    if (!classMap.has(key)) {
      classMap.set(key, {
        className: key,
        teacherName: s.teacherName || '',
        count: 0,
        students: [],
      });
    }
    const group = classMap.get(key)!;
    group.count++;
    group.students.push(s);
    if (!group.teacherName && s.teacherName) {
      group.teacherName = s.teacherName;
    }
  }

  const classesSummary = Array.from(classMap.values()).sort((a, b) => a.className.localeCompare(b.className, 'he'));

  return {
    fileName,
    sheetNames,
    students: allParsedStudents,
    classesSummary,
    duplicatesCount: duplicateCount,
    missingDataCount,
    warnings,
    requiresManualMapping: unmappedSheets.length > 0 && allParsedStudents.length === 0,
    unmappedSheets,
  };
}

// Helper to generate a downloadable Excel template for users
export function generateSampleExcelWorkbook(): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1: כיתה ז1
  const wsZ1Data = [
    ['כיתה ז1 | לינא ח׳ליל'],
    ['מזהה תלמיד', 'שם התלמיד'],
    ['S001', 'אדם נאסר'],
    ['S002', 'מרים סאלח'],
    ['S003', 'יוסף חמדאן'],
    ['S004', 'נור עבדאללה'],
    ['S005', 'ליאן סעיד'],
  ];
  const wsZ1 = XLSX.utils.aoa_to_sheet(wsZ1Data);
  XLSX.utils.book_append_sheet(wb, wsZ1, 'כיתה ז1');

  // Sheet 2: כיתה ז2
  const wsZ2Data = [
    ['כיתה ז2 | סוהא מנצור'],
    ['מזהה תלמיד', 'שם התלמיד'],
    ['S006', 'אמיר חורי'],
    ['S007', 'תאלה חנא'],
    ['S008', 'ראמי עיסא'],
    ['S009', 'דינה סלים'],
    ['S010', 'סאמר עבוד'],
  ];
  const wsZ2 = XLSX.utils.aoa_to_sheet(wsZ2Data);
  XLSX.utils.book_append_sheet(wb, wsZ2, 'כיתה ז2');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}
