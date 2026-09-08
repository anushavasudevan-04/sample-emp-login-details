# HR Time Tracking

A small internal app for HR to record employee clock in/out times and generate
daily, weekly and monthly attendance reports.

Plain HTML/CSS/JavaScript — no server, build step, or account system required.
Data is stored locally in the browser (`localStorage`), so it's private to
whichever machine/browser opens it.

## Usage

Open `index.html` in a browser (or serve the folder with any static file
server, e.g. `python3 -m http.server`).

- **Time Clock** — pick an employee, clock them in/out, see today's activity.
- **Employees** — add, edit, activate/deactivate, or remove employees.
- **Time Entries** — browse/filter full history; add or fix entries manually.
- **Reports** — generate Daily, Weekly, or Monthly summaries per employee,
  with CSV export.

## Notes

Because data lives in browser `localStorage`, it does not sync across
different computers or browsers. If multiple people need to see the same
data from different machines, this app would need a small backend added.
