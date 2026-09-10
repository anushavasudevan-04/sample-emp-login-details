// Local data store backed by localStorage. No server/backend required.

const Store = (() => {
  const KEY = 'hrTimeTrackingData_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { employees: [], entries: [] };
      const data = JSON.parse(raw);
      return {
        employees: Array.isArray(data.employees) ? data.employees : [],
        entries: Array.isArray(data.entries) ? data.entries : [],
      };
    } catch (e) {
      console.error('Failed to load HR time tracking data', e);
      return { employees: [], entries: [] };
    }
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save HR time tracking data', e);
    }
  }

  function uid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  return {
    // Employees
    getEmployees() {
      return state.employees.slice();
    },
    getActiveEmployees() {
      return state.employees.filter((e) => e.active);
    },
    getEmployee(id) {
      return state.employees.find((e) => e.id === id) || null;
    },
    addEmployee({ name, employeeCode, department }) {
      const emp = {
        id: uid(),
        name: name.trim(),
        employeeCode: (employeeCode || '').trim(),
        department: (department || '').trim(),
        active: true,
      };
      state.employees.push(emp);
      save();
      return emp;
    },
    updateEmployee(id, updates) {
      const emp = state.employees.find((e) => e.id === id);
      if (!emp) return null;
      Object.assign(emp, updates);
      save();
      return emp;
    },
    deleteEmployee(id) {
      state.employees = state.employees.filter((e) => e.id !== id);
      state.entries = state.entries.filter((en) => en.employeeId !== id);
      save();
    },

    // Time entries
    getEntries() {
      return state.entries.slice();
    },
    getEntry(id) {
      return state.entries.find((e) => e.id === id) || null;
    },
    getOpenEntry(employeeId) {
      return state.entries.find((e) => e.employeeId === employeeId && !e.clockOut) || null;
    },
    // `when` lets HR record a time other than right now (e.g. entering the
    // punch after the fact). Defaults to the current time.
    clockIn(employeeId, note, when) {
      const at = when instanceof Date && !isNaN(when) ? when : new Date();
      const entry = {
        id: uid(),
        employeeId,
        date: formatDate(at),
        clockIn: at.toISOString(),
        clockOut: null,
        note: (note || '').trim(),
      };
      state.entries.push(entry);
      save();
      return entry;
    },
    clockOut(entryId, note, when) {
      const entry = state.entries.find((e) => e.id === entryId);
      if (!entry) return null;
      const at = when instanceof Date && !isNaN(when) ? when : new Date();
      entry.clockOut = at.toISOString();
      if (note) entry.note = note.trim();
      save();
      return entry;
    },
    addManualEntry(data) {
      const entry = { id: uid(), ...data };
      state.entries.push(entry);
      save();
      return entry;
    },
    updateEntry(id, updates) {
      const entry = state.entries.find((e) => e.id === id);
      if (!entry) return null;
      Object.assign(entry, updates);
      save();
      return entry;
    },
    deleteEntry(id) {
      state.entries = state.entries.filter((e) => e.id !== id);
      save();
    },
  };
})();
