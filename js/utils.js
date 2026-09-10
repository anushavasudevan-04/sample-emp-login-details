// Shared date/time/format helpers used across the app.

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Local YYYY-MM-DD (avoids UTC drift from toISOString()).
function formatDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function todayStr() {
  return formatDate(new Date());
}

function nowTimeValue() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseDateOnly(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

function addDays(dateStr, n) {
  const d = parseDateOnly(dateStr);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

// Monday of the week containing dateStr.
function startOfWeek(dateStr) {
  const d = parseDateOnly(dateStr);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}

function monthRange(monthStr) {
  // monthStr = "YYYY-MM"
  const [y, m] = monthStr.split('-').map(Number);
  const start = `${y}-${pad2(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${pad2(m)}-${pad2(lastDay)}`;
  return { start, end };
}

// Clock-ins after this time of day (minutes since midnight) count as late.
const LATE_CLOCK_IN_MINUTES = 10 * 60 + 20; // 10:20 AM

function isLateClockIn(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() > LATE_CLOCK_IN_MINUTES;
}

function formatTimeOfDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHuman(dateStr) {
  const d = parseDateOnly(dateStr);
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatWeekdayShort(dateStr) {
  const d = parseDateOnly(dateStr);
  return d.toLocaleDateString([], { weekday: 'short' });
}

function minutesBetween(startIso, endIso) {
  if (!startIso) return 0;
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  return Math.max(0, Math.round((end - start) / 60000));
}

function formatHoursMinutes(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes || 0));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${pad2(mm)}m`;
}

// Combine a date (YYYY-MM-DD) and time (HH:MM) input into a local ISO-ish string
// that Date() parses as local time.
function combineDateTime(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00`;
}

function isoToDateInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return formatDate(d);
}

function isoToTimeInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2500);
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Parses CSV text (handles quoted fields, embedded commas/newlines, "" escapes)
// into an array of rows, each an array of cell strings.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
