# Invoice Autopilot: setup guide

This is the guide your buyer gets. It takes about 5 minutes and needs only a free Google account.

## 1. Install

1. Create a new Google Sheet (go to [sheets.new](https://sheets.new)).
2. Open **Extensions → Apps Script**.
3. Delete what's in the editor, paste all of `Code.gs`, and click **Save** 💾.
4. Go back to the sheet and **reload the page**. A new **Invoice Autopilot** menu appears.
5. Click **Invoice Autopilot → Set up sheets**.
   - Google asks you to authorize the script. Choose your account.
   - If you see *"Google hasn't verified this app"*, click **Advanced → Go to (project name)**. This is normal for your own scripts: the code runs only in your account and sends email only from you.

## 2. Fill in Settings

Open the **Settings** sheet and replace the example values:

| Setting | Example |
|---|---|
| Business name | Jane Smith Design |
| Business email | jane@example.com (clients reply here) |
| Business address | 12 High St, Leeds |
| Currency symbol | £ |
| Payment instructions | Bank: 12-34-56 / 12345678, or PayPal jane@example.com |
| Payment terms (days) | 14 |
| Reminder every (days) | 7 |
| Tax rate (%) | 0, or e.g. 20 for VAT |
| Drive folder name | Invoices |

## 3. Send an invoice

On the **Invoices** sheet, add one row per line item. Rows with the same **Invoice #** become one invoice.

| Invoice # | Date | Client name | Client email | Description | Quantity | Unit price | Status |
|---|---|---|---|---|---|---|---|
| INV-001 | 2026-10-01 | Acme Ltd | billing@acme.com | Website design | 1 | 500 | Ready |
| INV-001 | | | | Hosting (months) | 12 | 20 | Ready |

- The client name, email, date and status are taken from the **first** row of each invoice.
- Leave **Date** empty to use today. Leave **Due date** empty to use Date + payment terms.
- Use **Draft** while you're still working on an invoice. It won't be sent.

Click **Invoice Autopilot → Send invoices marked "Ready"**. For each invoice, the script:

- creates a PDF in your Google Drive folder
- emails it to the client
- sets the status to **Sent** and fills in *Sent on* and the *PDF* link

**Test it first** by sending one invoice to your own email address.

## 4. Get paid and send reminders

- When a client pays, change the status to **Paid**.
- **Invoice Autopilot → Send overdue reminders now** emails every *Sent* invoice that is past due and hasn't had a reminder in the last *Reminder every (days)* days.
- **Turn ON daily automatic reminders** runs that check every morning, so you don't have to.

## Limits and troubleshooting

- Free Gmail accounts can send about **100 emails a day** from scripts (Google Workspace accounts get about 1,500).
- "No Invoices sheet": run **Set up sheets** first.
- Nothing is sent: make sure the Status is exactly **Ready** and the client email is valid. The pop-up lists any problems.
- To change the email wording, edit `invoiceEmail_` and `reminderEmail_` in the script.
