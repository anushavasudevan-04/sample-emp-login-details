// "Employees" tab: add, edit, activate/deactivate and remove employees.

const Employees = (() => {
  let form, nameInput, codeInput, deptInput, tableBody, emptyMsg, submitBtn;
  let editingId = null;

  function init() {
    form = document.getElementById('employeeForm');
    nameInput = document.getElementById('empName');
    codeInput = document.getElementById('empCode');
    deptInput = document.getElementById('empDept');
    tableBody = document.querySelector('#employeesTable tbody');
    emptyMsg = document.getElementById('employeesEmpty');
    submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', handleSubmit);
    tableBody.addEventListener('click', handleTableClick);

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
        department: deptInput.value.trim(),
      });
      showToast('Employee updated.');
      cancelEdit();
    } else {
      Store.addEmployee({
        name,
        employeeCode: codeInput.value.trim(),
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

  return { init, render, refreshDependents };
})();
