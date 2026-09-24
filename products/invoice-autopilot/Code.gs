/**
 * Invoice Autopilot — Google Sheets + Apps Script
 *
 * Turns a Google Sheet into a small invoicing system:
 *   - Add invoice lines to the "Invoices" sheet (several lines can share one Invoice #).
 *   - Set Status to "Ready" and click  Invoice Autopilot → Send invoices marked "Ready".
 *   - Each invoice is turned into a PDF, saved to Google Drive and emailed to the client.
 *   - Unpaid invoices past their due date get polite reminder emails (manually or daily).
 *   - Set Status to "Paid" when the money arrives and reminders stop.
 *
 * Install: Extensions → Apps Script, paste this file, save, reload the sheet.
 */

const SHEET_INVOICES = 'Invoices';
const SHEET_SETTINGS = 'Settings';

const HEADERS = [
  'Invoice #', 'Date', 'Client name', 'Client email', 'Description',
  'Quantity', 'Unit price', 'Status', 'Due date', 'Sent on', 'PDF', 'Last reminder',
];

const COL = HEADERS.reduce((map, name, i) => {
  map[name] = i;
  return map;
}, {});

const STATUSES = ['Draft', 'Ready', 'Sent', 'Paid'];

const DEFAULT_SETTINGS = [
  ['Business name', 'Your Business Name'],
  ['Business email', ''],
  ['Business address', '123 Main Street, Your City'],
  ['Currency symbol', '$'],
  ['Payment instructions', 'Bank transfer to: ...  /  PayPal: you@example.com'],
  ['Payment terms (days)', 14],
  ['Reminder every (days)', 7],
  ['Tax rate (%)', 0],
  ['Drive folder name', 'Invoices'],
];

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Invoice Autopilot')
    .addItem('Set up sheets', 'setup')
    .addSeparator()
    .addItem('Send invoices marked "Ready"', 'sendReadyInvoices')
    .addItem('Send overdue reminders now', 'sendOverdueReminders')
    .addSeparator()
    .addItem('Turn ON daily automatic reminders', 'installDailyTrigger')
    .addItem('Turn OFF daily automatic reminders', 'removeDailyTrigger')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActive();

  const inv = ss.getSheetByName(SHEET_INVOICES) || ss.insertSheet(SHEET_INVOICES);
  if (inv.getLastRow() === 0) {
    inv.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    inv.setFrozenRows(1);
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(STATUSES, true)
      .build();
    inv.getRange(2, COL['Status'] + 1, 998, 1).setDataValidation(statusRule);
    inv.getRange(2, COL['Date'] + 1, 998, 1).setNumberFormat('yyyy-mm-dd');
    inv.getRange(2, COL['Due date'] + 1, 998, 1).setNumberFormat('yyyy-mm-dd');
    inv.getRange(2, COL['Sent on'] + 1, 998, 1).setNumberFormat('yyyy-mm-dd');
    inv.getRange(2, COL['Last reminder'] + 1, 998, 1).setNumberFormat('yyyy-mm-dd');
  }

  const st = ss.getSheetByName(SHEET_SETTINGS) || ss.insertSheet(SHEET_SETTINGS);
  if (st.getLastRow() === 0) {
    st.getRange(1, 1, DEFAULT_SETTINGS.length, 2).setValues(DEFAULT_SETTINGS);
    st.getRange(1, 1, DEFAULT_SETTINGS.length, 1).setFontWeight('bold');
    st.autoResizeColumn(1);
  }

  notify_('Setup done. Fill in the "Settings" sheet, then add invoice lines to "Invoices".');
}

// ---------------------------------------------------------------------------
// Sending invoices
// ---------------------------------------------------------------------------

function sendReadyInvoices() {
  const settings = getSettings_();
  const sheet = getInvoiceSheet_();
  const ready = readInvoices_(sheet).filter((inv) => inv.status === 'Ready');
  if (ready.length === 0) {
    notify_('No invoices have Status "Ready".');
    return;
  }

  const folder = getFolder_(settings.folderName);
  const sent = [];
  const errors = [];

  ready.forEach((inv) => {
    try {
      if (!isEmail_(inv.clientEmail)) throw new Error('missing or invalid client email');
      if (inv.lines.length === 0) throw new Error('no invoice lines with a quantity and price');

      const issued = inv.date || today_();
      const due = inv.due || addDays_(issued, settings.termsDays);
      const pdf = buildPdf_(inv, settings, issued, due);
      const file = folder.createFile(pdf);

      sendMail_(settings, {
        to: inv.clientEmail,
        subject: `Invoice ${inv.id} from ${settings.name}`,
        htmlBody: invoiceEmail_(inv, settings, due),
        attachments: [pdf],
      });

      inv.rows.forEach((r) => {
        setCell_(sheet, r, 'Date', issued);
        setCell_(sheet, r, 'Due date', due);
        setCell_(sheet, r, 'Status', 'Sent');
        setCell_(sheet, r, 'Sent on', new Date());
        setCell_(sheet, r, 'PDF', file.getUrl());
      });
      sent.push(inv.id);
    } catch (e) {
      errors.push(`${inv.id}: ${e.message}`);
    }
  });

  notify_(summary_('Sent', sent, errors));
}

function sendOverdueReminders() {
  const settings = getSettings_();
  const sheet = getInvoiceSheet_();
  const today = today_();

  const overdue = readInvoices_(sheet).filter((inv) =>
    inv.status === 'Sent' &&
    inv.due && inv.due < today &&
    (!inv.lastReminder || daysBetween_(inv.lastReminder, today) >= settings.reminderDays));

  const sent = [];
  const errors = [];

  overdue.forEach((inv) => {
    try {
      if (!isEmail_(inv.clientEmail)) throw new Error('missing or invalid client email');
      const pdf = buildPdf_(inv, settings, inv.date || inv.due, inv.due);
      sendMail_(settings, {
        to: inv.clientEmail,
        subject: `Reminder: invoice ${inv.id} from ${settings.name} is overdue`,
        htmlBody: reminderEmail_(inv, settings, daysBetween_(inv.due, today)),
        attachments: [pdf],
      });
      inv.rows.forEach((r) => setCell_(sheet, r, 'Last reminder', new Date()));
      sent.push(inv.id);
    } catch (e) {
      errors.push(`${inv.id}: ${e.message}`);
    }
  });

  notify_(summary_('Reminders sent', sent, errors));
}

// ---------------------------------------------------------------------------
// Daily trigger
// ---------------------------------------------------------------------------

function installDailyTrigger() {
  deleteReminderTriggers_();
  ScriptApp.newTrigger('sendOverdueReminders').timeBased().everyDays(1).atHour(9).create();
  notify_('Daily reminders are ON. Overdue invoices will be checked every morning around 9am.');
}

function removeDailyTrigger() {
  deleteReminderTriggers_();
  notify_('Daily reminders are OFF.');
}

function deleteReminderTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'sendOverdueReminders')
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

// ---------------------------------------------------------------------------
// Reading the sheets
// ---------------------------------------------------------------------------

function getInvoiceSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_INVOICES);
  if (!sheet) throw new Error('No "Invoices" sheet. Run Invoice Autopilot → Set up sheets first.');
  return sheet;
}

function getSettings_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_SETTINGS);
  if (!sheet) throw new Error('No "Settings" sheet. Run Invoice Autopilot → Set up sheets first.');

  const s = {};
  sheet.getDataRange().getValues().forEach((row) => {
    if (row[0]) s[String(row[0]).trim()] = row[1];
  });

  return {
    name: String(s['Business name'] || ''),
    email: String(s['Business email'] || ''),
    address: String(s['Business address'] || ''),
    currency: String(s['Currency symbol'] || ''),
    payment: String(s['Payment instructions'] || ''),
    termsDays: toNumber_(s['Payment terms (days)'], 14),
    reminderDays: Math.max(1, toNumber_(s['Reminder every (days)'], 7)),
    taxRate: toNumber_(s['Tax rate (%)'], 0),
    folderName: String(s['Drive folder name'] || 'Invoices'),
  };
}

/**
 * Groups invoice lines by Invoice #. Client, status and dates come from the
 * first line of each invoice; every line contributes a line item.
 */
function readInvoices_(sheet) {
  const values = sheet.getDataRange().getValues();
  const byId = {};
  const order = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = String(row[COL['Invoice #']]).trim();
    if (!id) continue;

    if (!byId[id]) {
      byId[id] = {
        id: id,
        rows: [],
        lines: [],
        date: asDate_(row[COL['Date']]),
        clientName: String(row[COL['Client name']]).trim(),
        clientEmail: String(row[COL['Client email']]).trim(),
        status: String(row[COL['Status']]).trim(),
        due: asDate_(row[COL['Due date']]),
        lastReminder: asDate_(row[COL['Last reminder']]),
      };
      order.push(id);
    }

    const inv = byId[id];
    inv.rows.push(i + 1);

    const qty = toNumber_(row[COL['Quantity']], NaN);
    const price = toNumber_(row[COL['Unit price']], NaN);
    if (!isNaN(qty) && !isNaN(price)) {
      inv.lines.push({ description: String(row[COL['Description']]), qty: qty, price: price });
    }
  }

  return order.map((id) => byId[id]);
}

// ---------------------------------------------------------------------------
// PDF + emails
// ---------------------------------------------------------------------------

function totals_(inv, settings) {
  const subtotal = inv.lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const tax = round2_(subtotal * settings.taxRate / 100);
  return { subtotal: round2_(subtotal), tax: tax, total: round2_(subtotal + tax) };
}

function buildPdf_(inv, settings, issued, due) {
  const html = invoiceHtml_(inv, settings, issued, due);
  return Utilities.newBlob(html, 'text/html', 'invoice.html')
    .getAs('application/pdf')
    .setName(`Invoice ${inv.id} - ${inv.clientName || inv.clientEmail}.pdf`);
}

function invoiceHtml_(inv, settings, issued, due) {
  const money = (n) => formatMoney_(n, settings.currency);
  const t = totals_(inv, settings);

  const rows = inv.lines.map((l) => `
    <tr>
      <td>${esc_(l.description)}</td>
      <td class="num">${esc_(l.qty)}</td>
      <td class="num">${money(l.price)}</td>
      <td class="num">${money(l.qty * l.price)}</td>
    </tr>`).join('');

  const taxRow = settings.taxRate
    ? `<tr><td colspan="3" class="num">Tax (${esc_(settings.taxRate)}%)</td><td class="num">${money(t.tax)}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 12px; margin: 32px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  .muted { color: #666; }
  .head { display: table; width: 100%; margin-bottom: 28px; }
  .head > div { display: table-cell; vertical-align: top; }
  .right { text-align: right; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 16px; }
  table.items th { text-align: left; border-bottom: 2px solid #222; padding: 6px 4px; }
  table.items td { border-bottom: 1px solid #ddd; padding: 6px 4px; }
  .num { text-align: right; }
  .total td { font-weight: bold; font-size: 14px; border-bottom: none; }
  .pay { margin-top: 28px; padding: 12px; background: #f4f4f4; }
</style></head><body>
  <div class="head">
    <div>
      <h1>INVOICE</h1>
      <div class="muted">#${esc_(inv.id)}</div>
    </div>
    <div class="right">
      <strong>${esc_(settings.name)}</strong><br>
      ${esc_(settings.address)}<br>
      ${esc_(settings.email)}
    </div>
  </div>
  <div class="head">
    <div>
      <div class="muted">Bill to</div>
      <strong>${esc_(inv.clientName)}</strong><br>
      ${esc_(inv.clientEmail)}
    </div>
    <div class="right">
      <span class="muted">Issued:</span> ${formatDate_(issued)}<br>
      <span class="muted">Due:</span> <strong>${formatDate_(due)}</strong>
    </div>
  </div>
  <table class="items">
    <tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr>
    ${rows}
    <tr><td colspan="3" class="num">Subtotal</td><td class="num">${money(t.subtotal)}</td></tr>
    ${taxRow}
    <tr class="total"><td colspan="3" class="num">Total due</td><td class="num">${money(t.total)}</td></tr>
  </table>
  <div class="pay"><strong>How to pay</strong><br>${esc_(settings.payment)}</div>
</body></html>`;
}

function invoiceEmail_(inv, settings, due) {
  const t = totals_(inv, settings);
  return `<p>Hi ${esc_(inv.clientName || 'there')},</p>
<p>Please find attached invoice <strong>${esc_(inv.id)}</strong> for
<strong>${formatMoney_(t.total, settings.currency)}</strong>, due on <strong>${formatDate_(due)}</strong>.</p>
<p><strong>How to pay:</strong><br>${esc_(settings.payment)}</p>
<p>Thank you for your business!</p>
<p>${esc_(settings.name)}</p>`;
}

function reminderEmail_(inv, settings, daysLate) {
  const t = totals_(inv, settings);
  return `<p>Hi ${esc_(inv.clientName || 'there')},</p>
<p>A friendly reminder that invoice <strong>${esc_(inv.id)}</strong> for
<strong>${formatMoney_(t.total, settings.currency)}</strong> was due on
<strong>${formatDate_(inv.due)}</strong> (${daysLate} day${daysLate === 1 ? '' : 's'} ago).
A copy is attached.</p>
<p>If you've already paid, thank you, and please ignore this email.</p>
<p><strong>How to pay:</strong><br>${esc_(settings.payment)}</p>
<p>${esc_(settings.name)}</p>`;
}

function sendMail_(settings, message) {
  if (settings.name) message.name = settings.name;
  if (isEmail_(settings.email)) message.replyTo = settings.email;
  MailApp.sendEmail(message);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFolder_(name) {
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function setCell_(sheet, row, column, value) {
  sheet.getRange(row, COL[column] + 1).setValue(value);
}

function notify_(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    // No UI when running from a time-based trigger.
    console.log(message);
  }
}

function summary_(label, ok, errors) {
  let msg = `${label}: ${ok.length}${ok.length ? ' (' + ok.join(', ') + ')' : ''}`;
  if (errors.length) msg += `\n\nProblems:\n- ${errors.join('\n- ')}`;
  return msg;
}

function isEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

function asDate_(v) {
  return v instanceof Date && !isNaN(v.getTime()) ? startOfDay_(v) : null;
}

function toNumber_(v, fallback) {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? fallback : n;
}

function startOfDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function today_() {
  return startOfDay_(new Date());
}

function addDays_(d, days) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function daysBetween_(a, b) {
  return Math.round((startOfDay_(b) - startOfDay_(a)) / 86400000);
}

function round2_(n) {
  return Math.round(n * 100) / 100;
}

function formatMoney_(n, currency) {
  const fixed = round2_(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return esc_(currency) + fixed;
}

function formatDate_(d) {
  if (!d) return '';
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  return Utilities.formatDate(d, tz, 'd MMM yyyy');
}

function esc_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
