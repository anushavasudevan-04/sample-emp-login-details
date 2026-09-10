// "Employees" tab: add, edit, activate/deactivate and remove employees.

const Employees = (() => {
  let form, nameInput, codeInput, companyInput, deptInput, tableBody, emptyMsg, submitBtn;
  let bulkFileInput, btnBulkImport, btnDownloadTemplate;
  let editingId = null;

  function init() {
    form = document.getElementById('employeeForm');
    nameInput = document.getElementById('empName');
    codeInput = document.getElementById('empCode');
    companyInput = document.getElementById('empCompany');
    deptInput = document.getElementById('empDept');
    tableBody = document.querySelector('#employeesTable tbody');
    emptyMsg = document.getElementById('employeesEmpty');
    submitBtn = form.querySelector('button[type="submit"]');

    bulkFileInput = document.getElementById('bulkImportFile');
    btnBulkImport = document.getElementById('btnBulkImport');
    btnDownloadTemplate = document.getElementById('btnDownloadTemplate');

    form.addEventListener('submit', handleSubmit);
    tableBody.addEventListener('click', handleTableClick);
    btnBulkImport.addEventListener('click', handleBulkImport);
    btnDownloadTemplate.addEventListener('click', downloadTemplate);

    render();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;

    if (editingId) {
      Store.updateEmployee(editingId, {
        name,
        employeeCode: codeInput.value.trim(),
        company: companyInput.value.trim(),
        department: deptInput.value.trim(),
      });
      showToast('Employee updated.');
      cancelEdit();
    } else {
      Store.addEmployee({
        name,
        employeeCode: codeInput.value.trim(),
        company: companyInput.value.trim(),
        department: deptInput.value.trim(),
      });
      showToast('Employee added.');
      form.reset();
    }

    render();
    refreshDependents();
  }

  function cancelEdit() {
    editingId = null;
    submitBtn.textContent = 'Add Employee';
    form.reset();
  }

  function startEdit(id) {
    const emp = Store.getEmployee(id);
    if (!emp) return;
    editingId = id;
    nameInput.value = emp.name;
    codeInput.value = emp.employeeCode;
    companyInput.value = emp.company || '';
    deptInput.value = emp.department;
    submitBtn.textContent = 'Update Employee';
    nameInput.focus();
  }

  function handleTableClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === 'edit') {
      startEdit(id);
    } else if (action === 'toggle') {
      const emp = Store.getEmployee(id);
      if (!emp) return;
      Store.updateEmployee(id, { active: !emp.active });
      render();
      refreshDependents();
    } else if (action === 'delete') {
      const emp = Store.getEmployee(id);
      if (!emp) return;
      const ok = confirm(`Delete ${emp.name}? This also deletes all of their time entries.`);
      if (!ok) return;
      Store.deleteEmployee(id);
      if (editingId === id) cancelEdit();
      render();
      refreshDependents();
      showToast('Employee deleted.');
    }
  }

  function render() {
    const employees = Store.getEmployees().sort((a, b) => a.name.localeCompare(b.name));
    emptyMsg.hidden = employees.length !== 0;

    tableBody.innerHTML = employees
      .map((e) => {
        const badge = e.active
          ? '<span class="badge badge-active">Active</span>'
          : '<span class="badge badge-inactive">Inactive</span>';
        return `<tr>
          <td>${escapeHtml(e.name)}</td>
          <td>${escapeHtml(e.employeeCode || '—')}</td>
          <td>${escapeHtml(e.company || '—')}</td>
          <td>${escapeHtml(e.department || '—')}</td>
          <td>${badge}</td>
          <td class="row-actions">
            <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${e.id}">Edit</button>
            <button class="btn btn-secondary btn-sm" data-action="toggle" data-id="${e.id}">${e.active ? 'Deactivate' : 'Activate'}</button>
            <button class="btn btn-danger btn-sm" data-action="delete" data-id="${e.id}">Delete</button>
          </td>
        </tr>`;
      })
      .join('');
  }

  // Called whenever the employee list changes so other tabs stay in sync.
  function refreshDependents() {
    if (typeof TimeClock !== 'undefined') TimeClock.refresh();
    if (typeof Entries !== 'undefined') Entries.refresh();
    if (typeof Reports !== 'undefined') Reports.populateEmployeeFilter();
  }

  // Bulk import from a CSV exported by Excel/Google Sheets. Column order
  // doesn't matter; headers are matched case-insensitively.
  const CSV_COLUMN_ALIASES = {
    name: ['name', 'full name', 'employee name', 'employee'],
    employeeCode: ['employee id', 'employee code', 'emp id', 'id', 'code'],
    company: ['company', 'company name'],
    department: ['department', 'dept'],
  };

  function findColumnIndex(headerRow, aliases) {
    const normalized = headerRow.map((h) => h.trim().toLowerCase());
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function downloadTemplate() {
    downloadCsv('employee-import-template.csv', [
      ['Name', 'Employee ID', 'Company', 'Department'],
      ['Jane Doe', 'EMP-001', 'AFM Properties', 'Sales'],
    ]);
  }

  function handleBulkImport() {
    const file = bulkFileInput.files[0];
    if (!file) {
      showToast('Choose a CSV file first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result)).filter((r) => r.some((cell) => cell.trim() !== ''));
      if (rows.length < 2) {
        showToast('That CSV has no data rows to import.');
        return;
      }

      const header = rows[0];
      const nameIdx = findColumnIndex(header, CSV_COLUMN_ALIASES.name);
      if (nameIdx === -1) {
        showToast('Couldn\'t find a "Name" column. Download the template to see the expected format.');
        return;
      }
      const codeIdx = findColumnIndex(header, CSV_COLUMN_ALIASES.employeeCode);
      const companyIdx = findColumnIndex(header, CSV_COLUMN_ALIASES.company);
      const deptIdx = findColumnIndex(header, CSV_COLUMN_ALIASES.department);

      let imported = 0;
      let skipped = 0;
      rows.slice(1).forEach((row) => {
        const name = (row[nameIdx] || '').trim();
        if (!name) {
          skipped++;
          return;
        }
        Store.addEmployee({
          name,
          employeeCode: codeIdx !== -1 ? (row[codeIdx] || '').trim() : '',
          company: companyIdx !== -1 ? (row[companyIdx] || '').trim() : '',
          department: deptIdx !== -1 ? (row[deptIdx] || '').trim() : '',
        });
        imported++;
      });

      render();
      refreshDependents();
      bulkFileInput.value = '';

      const skippedMsg = skipped > 0 ? ` (${skipped} row${skipped === 1 ? '' : 's'} skipped, missing name)` : '';
      showToast(`Imported ${imported} employee${imported === 1 ? '' : 's'}${skippedMsg}.`);
    };
    reader.onerror = () => showToast('Could not read that file.');
    reader.readAsText(file);
  }

  return { init, render, refreshDependents };
})();
