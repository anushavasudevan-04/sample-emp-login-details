// "Time Entries" tab: view/filter all entries and add manual corrections.

const Entries = (() => {
  let employeeFilter, fromInput, toInput, btnFilter, btnClear, tableBody, emptyMsg;
  let btnAdd, modalOverlay, modalTitle, modalForm, btnCancel;
  let fEntryId, fEntryEmployee, fEntryDate, fEntryIn, fEntryOut, fEntryNote;

  function init() {
    employeeFilter = document.getElementById('entriesEmployeeFilter');
    fromInput = document.getElementById('entriesFrom');
    toInput = document.getElementById('entriesTo');
    btnFilter = document.getElementById('btnEntriesFilter');
    btnClear = document.getElementById('btnEntriesClear');
    tableBody = document.querySelector('#entriesTable tbody');
    emptyMsg = document.getElementById('entriesEmpty');

    btnAdd = document.getElementById('btnAddEntry');
    modalOverlay = document.getElementById('entryModalOverlay');
    modalTitle = document.getElementById('entryModalTitle');
    modalForm = document.getElementById('entryForm');
    btnCancel = document.getElementById('btnEntryCancel');

    fEntryId = document.getElementById('entryId');
    fEntryEmployee = document.getElementById('entryEmployee');
    fEntryDate = document.getElementById('entryDate');
    fEntryIn = document.getElementById('entryClockIn');
    fEntryOut = document.getElementById('entryClockOut');
    fEntryNote = document.getElementById('entryNote');

    btnFilter.addEventListener('click', render);
    btnClear.addEventListener('click', () => {
      employeeFilter.value = '';
      fromInput.value = '';
      toInput.value = '';
      render();
    });

    btnAdd.addEventListener('click', () => openModal());
    btnCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    modalForm.addEventListener('submit', handleSave);
    tableBody.addEventListener('click', handleTableClick);

    refresh();
  }

  function refresh() {
    populateEmployeeFilter();
    render();
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

  function getFilteredEntries() {
    const employeeId = employeeFilter.value;
    const from = fromInput.value;
    const to = toInput.value;

    return Store.getEntries()
      .filter((e) => !employeeId || e.employeeId === employeeId)
      .filter((e) => !from || e.date >= from)
      .filter((e) => !to || e.date <= to)
      .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));
  }

  function render() {
    const entries = getFilteredEntries();
    emptyMsg.hidden = entries.length !== 0;

    tableBody.innerHTML = entries
      .map((e) => {
        const emp = Store.getEmployee(e.employeeId);
        const name = emp ? escapeHtml(emp.name) : '(removed employee)';
        const hours = e.clockOut
          ? formatHoursMinutes(minutesBetween(e.clockIn, e.clockOut))
          : '<span class="badge badge-progress">In progress</span>';
        return `<tr>
          <td>${name}</td>
          <td>${formatDateHuman(e.date)}</td>
          <td>${formatTimeOfDay(e.clockIn)}</td>
          <td>${e.clockOut ? formatTimeOfDay(e.clockOut) : '—'}</td>
          <td>${hours}</td>
          <td>${escapeHtml(e.note || '')}</td>
          <td class="row-actions">
            <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${e.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-action="delete" data-id="${e.id}">Delete</button>
          </td>
        </tr>`;
      })
      .join('');
  }

  function handleTableClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.dataset.action === 'edit') {
      openModal(Store.getEntry(id));
    } else if (btn.dataset.action === 'delete') {
      const ok = confirm('Delete this time entry?');
      if (!ok) return;
      Store.deleteEntry(id);
      render();
      TimeClock.refresh();
      showToast('Entry deleted.');
    }
  }

  function openModal(entry) {
    const employees = Store.getEmployees().sort((a, b) => a.name.localeCompare(b.name));
    if (employees.length === 0) {
      showToast('Add an employee first.');
      return;
    }

    fEntryEmployee.innerHTML = employees
      .map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`)
      .join('');

    if (entry) {
      modalTitle.textContent = 'Edit Entry';
      fEntryId.value = entry.id;
      fEntryEmployee.value = entry.employeeId;
      fEntryDate.value = entry.date;
      fEntryIn.value = isoToTimeInputValue(entry.clockIn);
      fEntryOut.value = isoToTimeInputValue(entry.clockOut);
      fEntryNote.value = entry.note || '';
    } else {
      modalTitle.textContent = 'Add Manual Entry';
      fEntryId.value = '';
      fEntryDate.value = todayStr();
      fEntryIn.value = '';
      fEntryOut.value = '';
      fEntryNote.value = '';
    }

    modalOverlay.hidden = false;
  }

  function closeModal() {
    modalOverlay.hidden = true;
    modalForm.reset();
  }

  function handleSave(e) {
    e.preventDefault();

    const employeeId = fEntryEmployee.value;
    const date = fEntryDate.value;
    const inTime = fEntryIn.value;
    const outTime = fEntryOut.value;

    if (!employeeId || !date || !inTime) {
      showToast('Employee, date and clock in time are required.');
      return;
    }

    const clockIn = combineDateTime(date, inTime);
    const clockOut = outTime ? combineDateTime(date, outTime) : null;

    if (clockOut && new Date(clockOut) <= new Date(clockIn)) {
      showToast('Clock out must be after clock in.');
      return;
    }

    const id = fEntryId.value;
    const data = {
      employeeId,
      date,
      clockIn: new Date(clockIn).toISOString(),
      clockOut: clockOut ? new Date(clockOut).toISOString() : null,
      note: fEntryNote.value.trim(),
    };

    if (id) {
      Store.updateEntry(id, data);
      showToast('Entry updated.');
    } else {
      Store.addManualEntry(data);
      showToast('Entry added.');
    }

    closeModal();
    render();
    TimeClock.refresh();
  }

  return { init, refresh, populateEmployeeFilter };
})();
