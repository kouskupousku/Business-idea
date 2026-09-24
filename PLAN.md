# Plan: automations as a service, then as products

**The idea:** get paid now to build small automations for businesses (option 3). Every time a request repeats, package it as a ready-made product and sell it many times (option 4).

```
Paid client job ──► you notice the same request 3 times ──► turn it into a template ──► sell it for $15–40, over and over
       ▲                                                                                   │
       └─────────── buyers who want changes become custom-job clients ◄────────────────────┘
```

Claude writes most of the code. Your job is to **find the problem, test the solution, and sell it**.

---

## Budget (first month: under $25)

| Item | Cost | Needed? |
|---|---|---|
| Claude Pro (writes and fixes the code) | ~$20/month | Yes |
| Google account (Sheets, Apps Script, Gmail, Drive) | Free | Yes |
| Gumroad / Payhip store | Free (they take a % of each sale) | For products |
| Etsy listing | $0.20 per listing | Optional |
| Loom or OBS for demo videos | Free | Yes |
| Your own domain | ~$12/year | Later |

---

## Part 1: automation services (money in weeks 2–4)

### What to sell
Stick to **Google Sheets + Gmail + Forms**. Most small businesses already use them, they're free, and Claude writes Apps Script well.

| Offer | Who wants it | Price |
|---|---|---|
| Invoices + automatic payment reminders (see `products/invoice-autopilot`) | Freelancers, trades, cleaners | $150–300 |
| Booking/contact form → spreadsheet → instant confirmation email → calendar event | Salons, tutors, trainers, photographers | $150–300 |
| New lead → auto-reply + follow-up email after 3 days if no answer | Anyone who sells a service | $150–300 |
| Weekly summary email (sales, bookings, stock) from their spreadsheet | Shops, cafés, small teams | $100–250 |
| Clean up / merge / de-duplicate messy spreadsheets | Everyone | $50–150 |
| Monthly "automation care" (fixes plus small changes) | Past clients | $30–100/month |

Charge **per job, not per hour**. The value is the hours the client saves every week, not the time it took you.

### Where to find clients
1. **People you know.** Ask: *"What's the most boring repetitive thing you do on a computer every week?"*
2. **Local businesses** that take bookings or send invoices. Walk in or message them.
3. **Upwork / Fiverr.** Search for "Google Apps Script", "Google Sheets automation" and "Gmail automation", and send short, specific proposals.
4. **Facebook groups and Reddit** for small-business owners (r/smallbusiness, r/forhire). Help first; don't spam.

### Outreach message (edit it for each business)
> Hi [Name], I build small automations for businesses like [theirs]. For example, a Google Sheet that emails invoices and chases late payments by itself, or a booking form that sends instant confirmations.
>
> Is there anything in your week that's repetitive admin work? If it's a fit, I'll build the first one for [$X] and you only pay once it's working.
>
> Here's a 1-minute demo: [Loom link]

### Discovery questions (5-minute call)
1. What task do you repeat every day or week? How long does it take?
2. Where does the information live now: paper, email, a spreadsheet, an app?
3. What should happen automatically, and who should get notified?
4. What would a perfect result look like?

### How to deliver with Claude
1. Write the task out in plain words: inputs, what happens, outputs, and edge cases.
2. Ask Claude: *"Write a Google Apps Script bound to a Google Sheet that … Include a custom menu, clear error messages, and comments."*
3. **Test it on a copy with fake data**, including missing values, wrong emails and duplicates. Paste any errors back into Claude.
4. Install it in the client's sheet **with them on a screen share**, or have them share the sheet with you. **Never ask for their password.**
5. Record a 2-minute Loom video showing them how to use it. This cuts down on support messages a lot.
6. Ask for a testimonial, and offer monthly care.

---

## Part 2: products (starts week 3, grows over months)

**Rule:** only turn something into a product after **2–3 people have asked for it**. Then you know people want it.

- **Product #1 is already here:** `products/invoice-autopilot/`, with the script, buyer setup guide and sales copy.
- **Where to sell:** Gumroad or Payhip (free to start) and Etsy (lots of people already searching for "Google Sheets template").
- **Pricing:** $12–39 for single templates, $49–79 for a bundle, e.g. a "Freelancer Admin Kit" with invoices, a client tracker and an expense log.
- **Marketing that costs nothing:**
  - Short screen-recorded demos on TikTok, YouTube Shorts and Instagram Reels ("I stopped chasing invoices with this Google Sheet").
  - A free "lite" version in exchange for an email address, then offer the full version.
  - Every product listing mentions custom work, which feeds Part 1.

Later product ideas (only once clients have asked for them): booking-confirmation kit, lead follow-up kit, simple inventory tracker with low-stock alerts, and a gym or tutoring membership tracker.

---

## First 30 days

| Week | Do this | Done when |
|---|---|---|
| 1 | Install Invoice Autopilot in your own Google account, test it, record a 60-second demo, and make a simple portfolio page | You have a demo link to share |
| 2 | Send 30–50 personal messages (network + local businesses) and 10 Upwork/Fiverr proposals | You've booked 3–5 conversations |
| 3 | Deliver the first 1–2 jobs (cheaply if needed, in exchange for testimonials). Put Invoice Autopilot on Gumroad/Etsy | First payment and first listing |
| 4 | Raise prices, pitch monthly care, and note which requests repeated → pick product #2 | You have a repeatable offer |

## Realistic expectations
- **Month 1:** $0–500. The first sale is the hardest.
- **Months 2–3:** $500–2,000/month is realistic from services if you keep doing outreach.
- **Products** usually earn little for the first few months, then add up as you have more listings and videos. Treat them as a long-term bonus, not rent money.
- The biggest factor is **how many people you contact**, not how good the code is.

## Track it
Keep one Google Sheet with the columns: Date · Who · Channel · Message sent · Replied? · Call? · Price · Paid? · Testimonial?
