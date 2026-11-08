/**
 * WhatsApp helpers for parent notifications on school gate exits
 */

export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  }
  if (clean.startsWith('05')) {
    clean = '972' + clean.substring(1);
  }
  return clean;
}

export function createWhatsAppUrl(text: string, phone?: string): string {
  const encodedText = encodeURIComponent(text);
  const cleanPhone = phone ? formatWhatsAppPhone(phone) : '';
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

export interface ClassExitMessageParams {
  className: string;
  exitTime?: string;
  homeroomTeacher?: string;
  schoolName?: string;
  studentCount?: number;
}

export function buildClassExitWhatsAppMessage({
  className,
  exitTime,
  homeroomTeacher,
  schoolName = 'בית הספר',
  studentCount,
}: ClassExitMessageParams): string {
  const timeStr = exitTime || new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

  const countStr = studentCount && studentCount > 1 ? ` (${studentCount} תלמידים)` : '';

  return (
    `📢 *הודעה להורי כיתה ${className}*\n\n` +
    `שלום לכל ההורים,\n` +
    `ברצוננו לעדכן כי תלמידי הכיתה${countStr} יצאו כעת פיזית משער בית הספר (שעת יציאה: *${timeStr}*).\n` +
    `היציאה אושרה ונבדקה פיזית על ידי שומר השער.\n\n` +
    `מאחלים המשך יום נעים, בטוח ומוצלח! 🌸\n` +
    (homeroomTeacher ? `בברכה,\nמחנכת הכיתה *${homeroomTeacher}*\n` : '') +
    `*${schoolName}*`
  );
}

export interface StudentExitMessageParams {
  studentName: string;
  studentCode?: string;
  className: string;
  exitTime: string;
  homeroomTeacher?: string;
  authorizedBy?: string;
  guardName?: string;
  reason?: string;
  schoolName?: string;
}

export function buildStudentExitWhatsAppMessage({
  studentName,
  className,
  exitTime,
  homeroomTeacher,
  authorizedBy,
  guardName,
  reason,
  schoolName = 'בית הספר',
}: StudentExitMessageParams): string {
  const cleanExitTime = exitTime.includes('T')
    ? exitTime.split('T')[1].substring(0, 5)
    : exitTime;

  let msg = `שלום רב,\n`;
  msg += `הרינו לעדכנכם כי בנכם/בתכם *${studentName}* מכיתה *${className}* יצא/ה כעת פיזית משער בית הספר.\n\n`;
  msg += `🕒 *שעת יציאה מהשער:* ${cleanExitTime}\n`;
  if (authorizedBy) {
    msg += `📋 *השחרור אושר ע״י:* ${authorizedBy}\n`;
  }
  if (guardName) {
    msg += `🚪 *אושר פיזית בשער ע״י:* ${guardName}\n`;
  }
  if (reason) {
    msg += `📝 *סיבת שחרור:* ${reason}\n`;
  }
  msg += `\nהמשך יום נעים ובטוח! 🌸\n`;
  if (homeroomTeacher) {
    msg += `בברכה, מחנכת הכיתה *${homeroomTeacher}*\n`;
  }
  msg += `*${schoolName}*`;

  return msg;
}
