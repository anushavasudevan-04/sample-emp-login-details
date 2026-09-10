// "Time Clock" tab: HR selects an employee and records their clock in / clock out.

const TimeClock = (() => {
  let select, statusBox, timeInput, noteInput, btnIn, btnOut, todayTableBody;

  function init() {
    select = document.getElementById('clockEmployeeSelect');
    statusBox = document.getElementById('clockStatus');
    timeInput = document.getElementById('clockTime');
    noteInput = document.getElementById('clockNote');
    btnIn = document.getElementById('btnClockIn');
    btnOut = document.getElementById('btnClockOut');
    todayTableBody = document.querySelector('#todayTable tbody');

    select.addEventListener('change', () => {
      resetTime();
      renderStatus();
    });
    btnIn.addEventListener('click', handleClockIn);
    btnOut.addEventListener('click', handleClockOut);

    resetTime();
    refresh();
  }

  function refresh() {
    populateEmployeeSelect();
    renderStatus();
    renderTodayTable();
  }

  function resetTime() {
    timeInput.value = nowTimeValue();
  }

  // Resolves the (editable) time field against today's date. Falls back to
  // right now if it's ever left blank.
  function getSelectedTime() {
    const value = timeInput.value || nowTimeValue();
    return new Date(combineDateTime(todayStr(), value));
  }

  function populateEmployeeSelect() {
    const employees = Store.getActiveEmployees();
    const previous = select.value;
    select.innerHTML = '';

    if (employees.length === 0) {
      select.innerHTML = '<option value="">No active employees</option>';
      select.disabled = true;
      return;
    }

    select.disabled = false;
    select.innerHTML =
      '<option value="">Select employee…</option>' +
      employees
        .map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`)
        .join('');

    if (previous && employees.some((e) => e.id === previous)) {
      select.value = previous;
    }
  }

  function renderStatus() {
    const employeeId = select.value;
    if (!employeeId) {
      statusBox.innerHTML = '<p class="muted">Select an employee to see their status.</p>';
      btnIn.disabled = true;
      btnOut.disabled = true;
      return;
    }

    const open = Store.getOpenEntry(employeeId);
    if (open) {
      statusBox.innerHTML = `<span class="status-in">Clocked in</span> since ${formatTimeOfDay(open.clockIn)}`;
      btnIn.disabled = true;
      btnOut.disabled = false;
    } else {
      statusBox.innerHTML = '<span class="status-out">Not clocked in</span>';
      btnIn.disabled = false;
      btnOut.disabled = true;
    }
  }

  function handleClockIn() {
    const employeeId = select.value;
    if (!employeeId) return;
    if (Store.getOpenEntry(employeeId)) {
      showToast('Already clocked in.');
      return;
    }
    if (Store.hasEntryForDate(employeeId, todayStr())) {
      showToast('This employee already has a time entry for today. Edit it from Time Entries instead.');
      return;
    }
    Store.clockIn(employeeId, noteInput.value, getSelectedTime());
    noteInput.value = '';
    resetTime();
    renderStatus();
    renderTodayTable();
    Employees.refreshDependents();
    showToast('Clocked in.');
  }

  function handleClockOut() {
    const employeeId = select.value;
    if (!employeeId) return;
    const open = Store.getOpenEntry(employeeId);
    if (!open) {
      showToast('This employee is not clocked in.');
      return;
    }
    const at = getSelectedTime();
    if (at < new Date(open.clockIn)) {
      showToast('Clock out time must be after the clock in time.');
      return;
    }
    Store.clockOut(open.id, noteInput.value, at);
    noteInput.value = '';
    resetTime();
    renderStatus();
    renderTodayTable();
    Employees.refreshDependents();
    showToast('Clocked out.');
  }

  function renderTodayTable() {
    const today = todayStr();
    const entries = Store.getEntries()
      .filter((e) => e.date === today)
      .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));

    if (entries.length === 0) {
      todayTableBody.innerHTML = '<tr><td colspan="5" class="muted">No activity yet today.</td></tr>';
      return;
    }

    todayTableBody.innerHTML = entries
      .map((e) => {
        const emp = Store.getEmployee(e.employeeId);
        const name = emp ? escapeHtml(emp.name) : '(removed employee)';
        const hours = e.clockOut
          ? formatHoursMinutes(minutesBetween(e.clockIn, e.clockOut))
          : '<span class="badge badge-progress">In progress</span>';
        const rowClass = isLateClockIn(e.clockIn) ? ' class="row-late"' : '';
        return `<tr${rowClass}>
          <td>${name}</td>
          <td>${formatTimeOfDay(e.clockIn)}</td>
          <td>${e.clockOut ? formatTimeOfDay(e.clockOut) : '—'}</td>
          <td>${hours}</td>
          <td>${escapeHtml(e.note || '')}</td>
        </tr>`;
      })
      .join('');
  }

  return { init, refresh };
})();
