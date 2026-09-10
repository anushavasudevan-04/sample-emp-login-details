// "Reports" tab: daily / weekly / monthly attendance summaries with CSV export.

const Reports = (() => {
  let typeSelect, employeeFilter;
  let dailyWrap, weeklyWrap, monthlyWrap;
  let dailyInput, weeklyInput, monthlyInput;
  let btnRun, btnExport, rangeLabel;
  let table, thead, tbody, tfoot, emptyMsg;

  let lastReport = null; // { filenamePrefix, headerRow, dataRows, footerRow }

  function init() {
    typeSelect = document.getElementById('reportType');
    employeeFilter = document.getElementById('reportEmployeeFilter');

    dailyWrap = document.getElementById('reportDateDailyWrap');
    weeklyWrap = document.getElementById('reportDateWeeklyWrap');
    monthlyWrap = document.getElementById('reportDateMonthlyWrap');

    dailyInput = document.getElementById('reportDateDaily');
    weeklyInput = document.getElementById('reportDateWeekly');
    monthlyInput = document.getElementById('reportDateMonthly');

    btnRun = document.getElementById('btnRunReport');
    btnExport = document.getElementById('btnExportCsv');
    rangeLabel = document.getElementById('reportRangeLabel');

    table = document.getElementById('reportTable');
    thead = table.querySelector('thead tr');
    tbody = table.querySelector('tbody');
    tfoot = table.querySelector('tfoot');
    emptyMsg = document.getElementById('reportEmpty');

    const today = todayStr();
    dailyInput.value = today;
    weeklyInput.value = today;
    monthlyInput.value = today.slice(0, 7);

    typeSelect.addEventListener('change', () => {
      toggleDateInputs();
      generate();
    });
    dailyInput.addEventListener('change', generate);
    weeklyInput.addEventListener('change', generate);
    monthlyInput.addEventListener('change', generate);
    employeeFilter.addEventListener('change', generate);
    btnRun.addEventListener('click', generate);
    btnExport.addEventListener('click', exportCsv);

    populateEmployeeFilter();
    toggleDateInputs();
    generate();
  }

  function populateEmployeeFilter() {
    const employees = Store.getEmployees().sort((a, b) => a.name.localeCompare(b.name));
    const previous = employeeFilter.value;
    employeeFilter.innerHTML =
      '<option value="">All employees</option>' +
      employees.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
    if (previous && employees.some((e) => e.id === previous)) {
      employeeFilter.value = previous;
    }
  }

  function toggleDateInputs() {
    const type = typeSelect.value;
    dailyWrap.hidden = type !== 'daily';
    weeklyWrap.hidden = type !== 'weekly';
    monthlyWrap.hidden = type !== 'monthly';
  }

  function getRange() {
    const type = typeSelect.value;
    if (type === 'daily') {
      const date = dailyInput.value || todayStr();
      return { type, start: date, end: date, label: formatDateHuman(date) };
    }
    if (type === 'weekly') {
      const anyDate = weeklyInput.value || todayStr();
      const start = startOfWeek(anyDate);
      const end = addDays(start, 6);
      return { type, start, end, label: `Week of ${formatDateHuman(start)} – ${formatDateHuman(end)}` };
    }
    // monthly
    const monthStr = monthlyInput.value || todayStr().slice(0, 7);
    const { start, end } = monthRange(monthStr);
    const label = parseDateOnly(start).toLocaleDateString([], { year: 'numeric', month: 'long' });
    return { type: 'monthly', start, end, label };
  }

  function employeeName(id) {
    const emp = Store.getEmployee(id);
    return emp ? emp.name : '(removed employee)';
  }

  function generate() {
    const range = getRange();
    rangeLabel.textContent = range.label;

    const employeeId = employeeFilter.value;
    const entries = Store.getEntries()
      .filter((e) => e.date >= range.start && e.date <= range.end)
      .filter((e) => !employeeId || e.employeeId === employeeId);

    if (range.type === 'daily') {
      lastReport = buildDailyReport(range, entries);
    } else if (range.type === 'weekly') {
      lastReport = buildWeeklyReport(range, entries);
    } else {
      lastReport = buildMonthlyReport(range, entries);
    }

    renderReport(lastReport);
  }

  function groupByEmployee(entries) {
    const map = new Map();
    entries.forEach((e) => {
      if (!map.has(e.employeeId)) map.set(e.employeeId, []);
      map.get(e.employeeId).push(e);
    });
    return map;
  }

  function buildDailyReport(range, entries) {
    const grouped = groupByEmployee(entries);
    const employeeIds = Array.from(grouped.keys()).sort((a, b) =>
      employeeName(a).localeCompare(employeeName(b))
    );

    const header = ['Employee', 'Clock In', 'Clock Out', 'Total Hours', 'Status'];
    let grandTotal = 0;

    const rows = employeeIds.map((id) => {
      const list = grouped.get(id).sort((a, b) => new Date(a.clockIn) - new Date(b.clockIn));
      const totalMinutes = list.reduce((sum, e) => sum + (e.clockOut ? minutesBetween(e.clockIn, e.clockOut) : 0), 0);
      grandTotal += totalMinutes;
      const hasOpen = list.some((e) => !e.clockOut);
      return {
        cells: [
          employeeName(id),
          list.map((e) => formatTimeOfDay(e.clockIn)).join(', '),
          list.map((e) => (e.clockOut ? formatTimeOfDay(e.clockOut) : '—')).join(', '),
          formatHoursMinutes(totalMinutes),
          hasOpen ? 'In progress' : 'Complete',
        ],
        late: isLateClockIn(list[0].clockIn),
      };
    });

    const footer = ['Total', '', '', formatHoursMinutes(grandTotal), ''];

    return { filenamePrefix: `daily-report-${range.start}`, header, rows, footer };
  }

  function buildWeeklyReport(range, entries) {
    const days = [];
    for (let i = 0; i < 7; i++) days.push(addDays(range.start, i));

    const grouped = groupByEmployee(entries);
    const employeeIds = Array.from(grouped.keys()).sort((a, b) =>
      employeeName(a).localeCompare(employeeName(b))
    );

    const header = ['Employee', ...days.map((d) => `${formatWeekdayShort(d)} ${d.slice(5)}`), 'Week Total'];
    const dayTotals = days.map(() => 0);
    let grandTotal = 0;

    const rows = employeeIds.map((id) => {
      const list = grouped.get(id);
      let weekTotal = 0;
      const dayCells = days.map((d, i) => {
        const minutes = list
          .filter((e) => e.date === d && e.clockOut)
          .reduce((sum, e) => sum + minutesBetween(e.clockIn, e.clockOut), 0);
        weekTotal += minutes;
        dayTotals[i] += minutes;
        return minutes > 0 ? formatHoursMinutes(minutes) : '—';
      });
      grandTotal += weekTotal;
      return { cells: [employeeName(id), ...dayCells, formatHoursMinutes(weekTotal)] };
    });

    const footer = ['Total', ...dayTotals.map((m) => (m > 0 ? formatHoursMinutes(m) : '—')), formatHoursMinutes(grandTotal)];

    return { filenamePrefix: `weekly-report-${range.start}`, header, rows, footer };
  }

  function buildMonthlyReport(range, entries) {
    const grouped = groupByEmployee(entries);
    const employeeIds = Array.from(grouped.keys()).sort((a, b) =>
      employeeName(a).localeCompare(employeeName(b))
    );

    const header = ['Employee', 'Days Worked', 'Total Hours', 'Avg Hours / Day'];
    let grandTotal = 0;
    let grandDays = 0;

    const rows = employeeIds.map((id) => {
      const list = grouped.get(id);
      const totalMinutes = list.reduce((sum, e) => sum + (e.clockOut ? minutesBetween(e.clockIn, e.clockOut) : 0), 0);
      const daysWorked = new Set(list.map((e) => e.date)).size;
      const avg = daysWorked > 0 ? totalMinutes / daysWorked : 0;
      grandTotal += totalMinutes;
      grandDays += daysWorked;
      return {
        cells: [employeeName(id), String(daysWorked), formatHoursMinutes(totalMinutes), formatHoursMinutes(avg)],
      };
    });

    const footer = ['Total', String(grandDays), formatHoursMinutes(grandTotal), ''];

    return { filenamePrefix: `monthly-report-${range.start.slice(0, 7)}`, header, rows, footer };
  }

  function renderReport(report) {
    thead.innerHTML = report.header.map((h) => `<th>${escapeHtml(h)}</th>`).join('');

    if (report.rows.length === 0) {
      tbody.innerHTML = '';
      tfoot.innerHTML = '';
      emptyMsg.hidden = false;
      btnExport.disabled = true;
      return;
    }

    emptyMsg.hidden = true;
    btnExport.disabled = false;

    tbody.innerHTML = report.rows
      .map((r) => {
        const rowClass = r.late ? ' class="row-late"' : '';
        return `<tr${rowClass}>${r.cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
      })
      .join('');

    tfoot.innerHTML = `<tr>${report.footer.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
  }

  function exportCsv() {
    if (!lastReport || lastReport.rows.length === 0) return;
    const rows = [lastReport.header, ...lastReport.rows.map((r) => r.cells), lastReport.footer];
    downloadCsv(`${lastReport.filenamePrefix}.csv`, rows);
  }

  return { init, populateEmployeeFilter, generate };
})();
