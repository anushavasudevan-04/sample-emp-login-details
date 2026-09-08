// App entry point: tab switching + module init.

document.addEventListener('DOMContentLoaded', () => {
  initTabs();

  TimeClock.init();
  Employees.init();
  Entries.init();
  Reports.init();
});

function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === `tab-${tab}`);
  });
}
