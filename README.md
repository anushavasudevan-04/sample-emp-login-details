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
  Only one entry per employee per day is allowed.
- **Employees** — add, edit, activate/deactivate, or remove employees, with
  Name, Employee ID, Company, and Department. Also supports bulk import from
  a CSV exported from Excel/Google Sheets (a template is downloadable from
  the Employees tab).
- **Time Entries** — browse/filter full history; add or fix entries manually.
- **Reports** — generate Daily, Weekly, or Monthly summaries per employee
  (including their Company), exportable as CSV, Excel (.xls), or PDF (via
  the browser's print dialog — choose "Save as PDF"). Late clock-ins
  (after 10:20 AM) are highlighted in red.

## Notes

Because data lives in browser `localStorage`, it does not sync across
different computers or browsers. If multiple people need to see the same
data from different machines, this app would need a small backend added.
