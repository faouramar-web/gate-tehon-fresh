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

// Helper to check if a header string is first name
function isFirstNameHeader(str: string): boolean {
  const s = str.toLowerCase().replace(/[\(\)\[\]\-_]/g, ' ');
  return s.includes('שם פרטי') || s.includes('first name') || s.includes('firstname') || (s.includes('פרטי') && !s.includes('איש קשר'));
}

// Helper to check if a header string is last name
function isLastNameHeader(str: string): boolean {
  const s = str.toLowerCase().replace(/[\(\)\[\]\-_]/g, ' ');
  return (
    s.includes('שם משפחה') ||
    (s.includes('משפחה') && !s.includes('בית') && !s.includes('איש קשר')) ||
    s.includes('last name') ||
    s.includes('lastname')
  );
}

// Helper to check if a header string looks like "student name" (full name) in Hebrew/English
function isStudentNameHeader(str: string): boolean {
  const s = str.toLowerCase();
  if (isFirstNameHeader(s) || isLastNameHeader(s)) return false;
  return (
    s.includes('שם תלמיד') ||
    s.includes('שם מלא') ||
    s.includes('שם התלמיד') ||
    s.includes('תלמיד') ||
    s.includes('student') ||
    s.includes('full name') ||
    s === 'שם'
  );
}

// Helper to check if header looks like "student id / code" (e.g. ת.ז)
function isStudentCodeHeader(str: string): boolean {
  const s = str.toLowerCase();
  return (
    s.includes('ת.ז') ||
    s.includes('תעודת זהות') ||
    s.includes('מספר זהות') ||
    s.includes('מזהה תלמיד') ||
    s.includes('קוד תלמיד') ||
    (s.includes('מספר') && s.includes('תלמיד')) ||
    s === 'id' ||
    s === 'student_id' ||
    s === 'code'
  );
}

// Helper to check if header looks like row number / serial number
function isRowNumberHeader(str: string): boolean {
  const s = str.trim().toLowerCase();
  return s === 'מספר' || s === "מס'" || s === 'מס סידורי' || s === 'מספר סידורי' || s === '#' || s === 'no' || s === 'num';
}

// Helper to check if header looks like parallel/section ("מקבילה")
function isSectionHeader(str: string): boolean {
  const s = str.toLowerCase();
  return s.includes('מקבילה') || s.includes('מספר כיתה') || s.includes('כיתה מקבילה') || s.includes('מס כיתה') || s.includes('section') || s.includes('parallel');
}

// Helper to check if header looks like "class name" (grade)
function isClassHeader(str: string): boolean {
  const s = str.toLowerCase();
  if (isSectionHeader(s)) return false;
  return s.includes('כיתה') || s.includes('class') || s.includes('שכבה') || s.includes('grade');
}

// Helper to check if header looks like "teacher name"
function isTeacherHeader(str: string): boolean {
  const s = str.toLowerCase();
  return s.includes('מחנכת') || s.includes('מחנך') || s.includes('מורה') || s.includes('teacher');
}

// Parse sheet name or title line like "כיתה י1 קסיס האני", "כיתה ז1 | לינא ח׳ליל" or "כיתה ז1"
function extractClassAndTeacherFromText(text: string): { className?: string; teacherName?: string } {
  const clean = text.trim();
  if (!clean) return {};

  // Pattern 1: Check pipe or dash separators ("כיתה ז1 | לינא ח׳ליל" or "ז1 - לינא ח׳ליל")
  const pipeSplit = clean.split(/[|•\-–—]/).map((s) => s.trim());
  if (pipeSplit.length > 1) {
    let className: string | undefined;
    let teacherName: string | undefined;

    for (const part of pipeSplit) {
      if (part.includes('כיתה') || /^[זחטיו][1-9]?$/i.test(part) || /^[זחטיו]׳?[1-9]?$/i.test(part) || /^י["״]?[אב][1-9]?$/i.test(part)) {
        className = part.replace(/^כיתה\s*/, '').trim();
      } else if (part.length > 2 && !part.includes('רשימ') && !part.includes('תלמיד') && !part.includes('בית ספר')) {
        teacherName = part.replace(/^(מחנכת|מחנך|מורה)\s*:?\s*/, '').trim();
      }
    }
    if (className || teacherName) {
      return { className, teacherName };
    }
  }

  // Pattern 2: Format "כיתה י1 קסיס האני" or "כיתה י 1 קסיס האני" or "כיתה י2 ביבאר גומאנה"
  const classTeacherMatch = clean.match(
    /^(?:כיתה\s*)?([א-ת]|י["״']?[אב]|[0-9]{1,2})\s*([0-9]{1,2})?\s+(.+)$/
  );
  if (classTeacherMatch) {
    const grade = classTeacherMatch[1].replace(/["״']/g, '');
    const section = classTeacherMatch[2] || '';
    const rawTeacher = classTeacherMatch[3].trim();

    if (rawTeacher && !rawTeacher.includes('רשימ') && !rawTeacher.includes('תלמיד') && !rawTeacher.includes('בית ספר')) {
      const className = section ? `${grade}${section}` : grade;
      const teacherName = rawTeacher.replace(/^(מחנכת|מחנך|מורה)\s*:?\s*/, '').trim();
      return { className, teacherName };
    }
  }

  // Pattern 3: Simple class name "כיתה י1" or "כיתה י2" or "י1"
  const justClassMatch = clean.match(/^(?:כיתה\s*)?([א-ת]|י["״']?[אב]|[0-9]{1,2})\s*([0-9]{1,2})?$/);
  if (justClassMatch) {
    const grade = justClassMatch[1].replace(/["״']/g, '');
    const section = justClassMatch[2] || '';
    const className = section ? `${grade}${section}` : grade;
    return { className };
  }

  return {};
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

    // Check if sheet name itself contains class / teacher (e.g. "כיתה י1 קסיס האני")
    const fromSheetName = extractClassAndTeacherFromText(sheetName);
    let sheetClassName = fromSheetName.className || '';
    let sheetTeacherName = fromSheetName.teacherName || '';

    // Check early title and header rows (up to 35 rows to account for top metadata banners)
    let tableHeaderRowIndex = -1;
    let firstNameColIndex = -1;
    let lastNameColIndex = -1;
    let fullNameColIndex = -1;
    let codeColIndex = -1;
    let rowNumColIndex = -1;
    let classColIndex = -1;
    let sectionColIndex = -1;
    let teacherColIndex = -1;

    for (let r = 0; r < Math.min(rows.length, 35); r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      const joinedRow = row.map(cleanStr).join(' ');

      // Check if this row is a title banner like "כיתה י1 קסיס האני"
      if (!sheetClassName || !sheetTeacherName) {
        const fromTitleRow = extractClassAndTeacherFromText(joinedRow);
        if (fromTitleRow.className && !sheetClassName) sheetClassName = fromTitleRow.className;
        if (fromTitleRow.teacherName && !sheetTeacherName) sheetTeacherName = fromTitleRow.teacherName;
      }

      // Check if this row is the column headers
      for (let c = 0; c < row.length; c++) {
        const cell = cleanStr(row[c]);
        if (!cell) continue;

        if (isFirstNameHeader(cell)) firstNameColIndex = c;
        else if (isLastNameHeader(cell)) lastNameColIndex = c;
        else if (isStudentNameHeader(cell)) fullNameColIndex = c;

        if (isStudentCodeHeader(cell)) codeColIndex = c;
        else if (isRowNumberHeader(cell)) rowNumColIndex = c;

        if (isSectionHeader(cell)) sectionColIndex = c;
        else if (isClassHeader(cell)) classColIndex = c;

        if (isTeacherHeader(cell)) teacherColIndex = c;
      }

      // Detected if we have a full name column OR first name (+ optional last name)
      if (fullNameColIndex !== -1 || firstNameColIndex !== -1) {
        tableHeaderRowIndex = r;
        break;
      }
    }

    // If we didn't find a named column header in the first 35 rows, scan for data table start
    if (tableHeaderRowIndex === -1) {
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (row && row.length >= 2) {
          const c0 = cleanStr(row[0]);
          const c1 = cleanStr(row[1]);
          const c2 = cleanStr(row[2]);
          // Check if c0 is a row number (1, 2, 3...) and c1 is Hebrew text
          const c0IsNumeric = /^[0-9]{1,10}$/.test(c0);
          const c1HasHebrew = /[\u0590-\u05FF]/.test(c1);
          if (c0IsNumeric && c1HasHebrew) {
            rowNumColIndex = 0;
            // Check if c2 is last name
            if (c2 && /[\u0590-\u05FF]/.test(c2)) {
              firstNameColIndex = 1;
              lastNameColIndex = 2;
            } else {
              fullNameColIndex = 1;
            }
            tableHeaderRowIndex = r - 1; // data starts at r
            break;
          }
        }
      }
    }

    if (fullNameColIndex === -1 && firstNameColIndex === -1) {
      unmappedSheets.push(sheetName);
      warnings.push(`בלשונית "${sheetName}" לא זוהתה עמודת שם תלמיד באופן מובהק.`);
      continue;
    }

    // Start scanning data rows after header
    const dataStartRow = tableHeaderRowIndex + 1;
    for (let r = dataStartRow; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      let fullName = '';
      if (firstNameColIndex !== -1 && lastNameColIndex !== -1) {
        const first = cleanStr(row[firstNameColIndex]);
        const last = cleanStr(row[lastNameColIndex]);
        fullName = `${first} ${last}`.trim();
      } else if (fullNameColIndex !== -1) {
        fullName = cleanStr(row[fullNameColIndex]);
      } else if (firstNameColIndex !== -1) {
        fullName = cleanStr(row[firstNameColIndex]);
      }

      if (!fullName) continue; // Skip blank rows

      // Skip accidental header repeats
      if (isStudentNameHeader(fullName) || isFirstNameHeader(fullName) || fullName === 'שם פרטי' || fullName === 'שם משפחה') continue;

      // Class determination
      let rowClass = '';
      if (classColIndex !== -1 && sectionColIndex !== -1) {
        const g = cleanStr(row[classColIndex]);
        const s = cleanStr(row[sectionColIndex]);
        rowClass = `${g}${s}`.trim();
      } else if (classColIndex !== -1) {
        rowClass = cleanStr(row[classColIndex]);
      }

      const rowTeacher = teacherColIndex !== -1 ? cleanStr(row[teacherColIndex]) : '';

      const finalClass = rowClass || sheetClassName || (sheetNames.length === 1 ? 'כללי' : sheetName);
      const finalTeacher = rowTeacher || sheetTeacherName;

      // Student code determination
      let studentCode = codeColIndex !== -1 ? cleanStr(row[codeColIndex]) : '';
      if (!studentCode && rowNumColIndex !== -1) {
        const numVal = cleanStr(row[rowNumColIndex]);
        if (numVal) {
          studentCode = `${finalClass}-${numVal.padStart(2, '0')}`;
        }
      }
      if (!studentCode) {
        studentCode = `${finalClass}-${String(r - dataStartRow + 1).padStart(2, '0')}`;
      }

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
