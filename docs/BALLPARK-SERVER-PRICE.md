# Ballpark price from the server

## What it does

The instant ballpark range used to be worked out in the visitor's browser from a public price list. This moves the math to a Netlify function (`netlify/functions/ballpark-price.mjs`) so the per-foot and gate rates no longer have to be public. Customers see the same range, the same way: they send the contact form, then the range and the comparison list appear.

- The function reads the rates from Firestore `settings/global` with a service account, prices the project with the same rules as the page, and answers with `low`, `high`, `parts` (the style and feet it priced, so the page can check the answer is for its layout) and a comparison list (`style`, `low`, `high`). It never sends a total, a rate, billable feet or waste.
- It only prices a project for a receipt that exists in `websiteLeads` and is under 24 hours old, or, for a returning customer, under a pricing session the function itself issued for that receipt (see "How old a lead is" and "Returning customers" below).
- Separate limits apply to each receipt (see "Limits" below): 20 attempts in any one clock minute, 60 priced ranges in each 24 hour block of the receipt's life and 180 in all. Past a limit it answers 429 and the page falls back to "We will send your price".
- Until the key is added it answers 503 `not-configured`, so deploying it changes nothing.
- The page only uses it when the public price document has no prices (the "by request" state). While prices are still public, the page never calls it.
- If the function is off, slow, over its limit or errors, the page falls back to "We will send your price" and the office quotes by hand. Nothing shows an error. A failure that may pass is not final (see "When something fails" below).

## Keeping the range with the project

The submission event prices a server-mode Ballpark request from `settings/global` before it creates the Executive App lead. It stores the submitted dimensions and range in `meta` and puts the range first in `notes`. The browser sends `saved: true` to the price function and receives that saved range for the matching layout. Other styles in the comparison are calculated from the current settings. If server pricing is unavailable while the lead is saved, the lead goes through for office pricing. A changed project must be submitted as an update before its range is shown. A legacy browser with public prices sends the price it calculated with the original lead. The price is a planning estimate for staff review.

Gate openings stay in the footage. The Ballpark uses the gross drawn or entered length, rounds up to whole sections where the style is installed in sections, and adds the gate charges. For a 151 ft run of 8 ft sections with one 4 ft walk gate and one 10 ft drive gate, the price uses 19 sections (152 billable ft) and both gate charges.

## Emailing a copy to the customer

The Ballpark result offers **Email me this estimate**. Clicking it sends a linked request through Netlify Forms for the office and records the range from the result, the project options and the customer's opt-in. The form event retries temporary Firestore errors with the same document ID. The original submission remains in Netlify Forms for office recovery if that sync fails.

Automatic delivery is off until the Netlify settings below are present. After the office request is accepted, the customer email function uses the saved opt-in and estimate. It sends the same range, selected styles and dimensions, gates, removal, timeline and yard notes, plus GFS contact details and a PDF made with the Ballpark estimate template. Without a range, the email button offers office follow-up. If automatic email is unavailable, the office still gets the request.

Reuse the EmailJS/Gmail service documented in `gfence-app` and give the customer estimate its own EmailJS template. Set the recipient to `{{to_email}}`, subject to `{{subject}}`, reply-to to `{{reply_to}}` and message to `{{message}}` with line breaks preserved. Configure a dynamic attachment with filename `Ghareeb-Fencing-Estimate.pdf`, MIME type `application/pdf` and Base64 content `{{estimate_pdf}}`. Keep CC and BCC empty.

Set `GFS_ESTIMATE_EMAILJS_SERVICE_ID`, `GFS_ESTIMATE_EMAILJS_TEMPLATE_ID`, `GFS_ESTIMATE_EMAILJS_PUBLIC_KEY` and `GFS_ESTIMATE_EMAILJS_PRIVATE_KEY` in the Netlify Functions environment. Enable EmailJS requests from non-browser applications with private-key authorization. The function also uses `GFS_FIREBASE_PROJECT_ID` and `GFS_PRICING_SERVICE_ACCOUNT` to read the follow-up and public catalogue and update `ballparkPriceUse` counters. Set `GFS_ESTIMATE_EMAIL_ENABLED=true` when the template, provider keys and Firestore permissions are in place.

Each clock hour the function allows up to three sends per email address and ten per Netlify client IP, with a single provider attempt per follow-up receipt. The receipt limit also covers concurrent clicks and uncertain provider responses. The office can follow up from the saved request if the automatic email fails.

## When something fails (page behaviour)

- **Capability check.** Only a definite answer is remembered for the browser session: `{ok:true}` for 30 minutes, an explicit 503 `not-configured` for 2 minutes. The time of the answer is kept in memory too, so the explicit "off" really expires after 120 seconds. After that the catalogue check, coming back to the tab (`visibilitychange`), `online` and the page's own recheck may ping once more. At most one ping is in flight, a tab or online event never starts one less than 10 seconds after the last, and a service that is still off is believed for another 120 seconds. When the ping succeeds, a customer who already sent the form gets the range without sending anything again. A network error, a timeout, or any other status is not an answer: nothing is stored, the page stays undecided (it shows the by-request wording meanwhile), asks again at 5 s, 15 s and 45 s, and then stops. A healthy reload always makes its own check. If the check starts working, a customer who already sent the form gets the range without sending anything again.
- **Asking for the range.** If the lead is not there yet (409) the page asks four times in the first ~9 s, then at 5 s, 15 s and 45 s after that. A 503, a network error or a 12 s timeout is retried at the same 5 s, 15 s and 45 s. A 429 with `Retry-After` (the minute limit) waits that many seconds (at least the normal pause; over 120 s is left to the button). Then it stops. Each retry uses the same project and receipt.
- **Not retried** because asking again cannot change the answer: needs a quote, a 429 with no `Retry-After` (the allowance is used), 400, and a 403 that a session cannot fix (see "Returning customers"). A renewal that fails for an outage or a busy minute follows the same pauses as a price ask, and takes nothing from the allowance.
- **Try again.** While the by-request wording is showing after a failure that may pass, a plain "Try again" button sits under it. It asks again straight away and starts a fresh set of recovery pauses.
- **Back online / back in the tab.** On `online`, and on `visibilitychange` to visible, a failed ask (or an undecided capability check) is tried again, at most three extra times per failure.
- **Changed project.** A change cancels any pending retry for the old project. Submitting the update creates a fresh receipt for the changed details. A late answer for the old project is ignored.
- **Public prices.** While the price document still has prices the page never calls the function, including on these events.

## Limits (attempts and priced ranges are counted apart)

- **Attempts, per clock minute: 20.** Every request for a real, fresh lead counts here, whatever happens to it (priced, needs a quote, 503). It is only a cheap bound on how fast one receipt can ask. Over it: 429 with a `Retry-After` header (seconds to the next minute). Counter document: `ballparkPriceUse/{receipt}_m{minute}`.
- **Priced ranges: 60 per 24 hour block, 180 in all.** Counted only when a range is actually returned. A block is 24 hours counted from the lead's own trusted creation time (block 0 is the first day, exactly the old 60-for-the-first-day rule). The function works out the range first (nothing is written), then takes two slots, each one atomic Firestore increment: the block counter `ballparkPriceUse/{receipt}_d{block}` (cap 60), then the lifetime counter `ballparkPriceUse/{receipt}` (cap 180). A range is sent only if both increments returned their cap or less. Why this is safe: an increment returns that request's own place in line, so of any number of simultaneous requests only those numbered inside the cap get a slot (there is no read-then-write to race), and a range is never sent unless its increments committed. If the second commit fails, the first slot is handed back (best effort; if even that fails the slot stays taken, the safe side) and the customer gets a 503 and no range. A block that is full is refused before the lifetime counter is touched. A 503, a minute throttle, a needs-a-quote answer, a bad request or a missing lead take nothing. Past a cap: 429 with no `Retry-After` and no range in the body.
- **Why a day block and a hard cap instead of 60 for life.** With sessions a legitimate customer comes back days later. Sixty for life would lock them out for good after one busy first day, while 60 a day with no ceiling would give a leaked receipt unlimited rate probing. 60 a block keeps the first day identical to before, and 180 in all (three full blocks) is the most one real lead can ever ask, even with a session every day. The counters live in a separate collection; the lifetime counters are kept for the 180 day renewal horizon plus three days if a TTL policy is on.
- **Renewals** have their own limits, below.
- `GFS_PRICING_LIMIT=off` skips every counter.

## How old a lead is

The age comes from the lead document's own Firestore `createTime` when the REST answer has it (the database sets it, the sender cannot). If it is absent the intake function's `createdAtMs` (also written with server time) is used. A lead is refused with 403 `Request not valid` when the time is missing, not a number (text is refused), zero or negative, unreadable, or more than 5 minutes in the future (a little clock skew is allowed). A readable time older than 24 hours gives 403 `Request too old` unless the request carries a valid session (see "Returning customers"). A time that cannot be read never authorises a price.

## Returning customers (renewal rule)

Marketing attribution and pricing authority are kept apart. `acquisitionReceipt` (the original lead, parent of follow-ups, used for reporting) never changes. Pricing normally uses the receipt of the document the customer's last submission just produced, which is fresh. The case this section fixes: the customer comes back after more than 24 hours with the **same, unchanged** project. That resend is recognised as already received and writes nothing (no duplicate marketing lead), so there is no fresh document, and the old receipt alone is "too old". The customer used to get "We will send your price" instead of the instant range.

**Rule.** The function can issue a short-lived pricing session for the older lead that holds that project’s details. The page asks for one only when the price call answers `Request too old` (or it already knows the receipt is over 23 hours old), asks once, keeps it in memory and in `sessionStorage`, and prices. A changed project still makes a new `project_update` document and is priced with that document as before, with no renewal.

**`{renew:true, receipt}` is answered when all of these hold:**
- the receipt has the `web_` format and `websiteLeads/{receipt}` exists (visit bookings live in `bookings`, so a booking id is simply not found; a document shaped like a booking, with `date` or `time`, is refused too);
- its trusted creation time (same rules as above) is no more than 180 days ago;
- renewals are inside the limits: 5 attempts per clock minute, 3 sessions per 24 hour block of the lead's life, 20 in all (counters `{receipt}_rm{minute}`, `{receipt}_rd{block}`, `{receipt}_rl`). Attempts count whatever the outcome; the block and lifetime slots are taken only when the session is ready, with the same atomic-increment and hand-back rules as priced ranges, so an outage or a refused request costs nothing. Past a limit: 429 (`Retry-After` only for the minute limit).

Nothing is written except counters.

**The session.** `v1.<payload>.<mac>`, both base64url. The payload is JSON `{r: receipt, i: issuedAt, e: expiresAt, n: random nonce}` with `e - i` exactly 24 hours (never more). The MAC is HMAC-SHA256 over the payload text, keyed by a secret derived inside the function: HMAC-SHA256 of the service account private key with the fixed label `gfs-ballpark-session-v1`. No new environment variable, the key is never sent anywhere, and rotating the service account key ends every session. Verification checks the format, compares the MAC in constant time (`crypto.timingSafeEqual`), then that the receipt inside is the receipt in the request, the lifetime is at most 24 hours, and it has not expired. It is checked before any network call. A bad token is 403 `Session not valid`, an old one 403 `Session expired`; the page drops it, asks for one new session, and otherwise falls back to the by-request wording.

**Pricing with a session.** `{receipt, session, ...project}`. The 24 hour age check is replaced by the session expiry, but the lead document is still read every time (a deleted lead stops pricing) and must still be within the horizon. Counters stay per ORIGINAL receipt, so renewing never resets an allowance.

**Who this trusts, and what a leaked receipt can do.** Knowing the unguessable receipt id is the proof of identity, exactly as it is for a fresh lead today: there is no login, and the id is only ever held by the customer's browser and the office. Someone who holds a leaked receipt could already get priced for 24 hours. Renewal extends that to at most 180 days after the lead was written, at no more than 3 sessions a day and 20 in all, and the whole of it stays inside that receipt's 60 priced ranges per block and 180 in all. They cannot price without a real lead behind the receipt, cannot make a session for another receipt, cannot lengthen a session, cannot forge one without the service account key, and learn nothing beyond the same $100 rounded range. Nobody can use renewal to create or change a lead.

## Capability recovery

See "Capability check" above. The old behaviour kept an explicit `not-configured` for the life of the page even though it was documented as two minutes; an `online`, tab-visible or manual recheck never asked again, so a restored service was ignored until reload. The time of the answer is now kept and the "off" expires after 120 seconds.

## Switch-on order

1. **Owner:** create the service account key (see the role below) and add it in Netlify as `GFS_PRICING_SERVICE_ACCOUNT` (the JSON, raw or base64). `GFS_FIREBASE_PROJECT_ID` is already set. Do not paste the key anywhere else.
2. **Deploy the website.** Open the ballpark page and confirm it still shows the same range as before (it still comes from the public list, and the function is not called).
3. **Publisher:** stop emitting `pricing` in `settings/public` (keep `styleNames`, photos and specs).
4. **Check:** reload the ballpark page, do a test request, and confirm the range appears after the form. In the browser network tab there should be a POST to `/.netlify/functions/ballpark-price` returning 200 with only `low`, `high`, `parts`, `comparisons`.

Optional: turn on a Firestore TTL policy for field `expireAt` on collection `ballparkPriceUse` so the small counter documents clean themselves up.

## Service account permission

What the function needs:

- read `settings/global` and `websiteLeads` documents (`datastore.entities.get`)
- create and update documents in `ballparkPriceUse` (`datastore.entities.create`, `datastore.entities.update`), for the request counter. It is a separate collection on purpose: the Executive app does not read it and the lead documents are never written.

IAM cannot limit these to particular collections, and Firestore security rules do not apply to service accounts. The closest option is a custom role with just those three permissions (no list, no delete), on this project only. Be honest about the trade-off: with the counter on, the key can also update documents, so keep it only in Netlify and rotate it if it ever leaks. If you would rather keep the key strictly read-only, give it only `datastore.entities.get` and set `GFS_PRICING_LIMIT=off` in Netlify. Then there is no counter (and no renewal limit) and the only protection against probing is the receipt requirement, the age limit and the $100 rounding. (I did not verify whether Firestore IAM conditions can narrow the role to one collection; if they can, that is better.)

## What this does not stop

The range is the product, so it always says something about the rate. At a long length the answer is a 5% band rounded to $100, which pins the per-foot rate for that style to within a fraction of a percent; at short lengths the $100 rounding hides more. Anyone who really sends the contact form can work out a rate for the styles that way. What the function stops is doing it in bulk with no lead: a price needs a real receipt, under 24 hours old or renewed within 180 days, and each receipt gets at most 60 priced requests per 24 hour block, 180 in all (20 a minute). The remaining protection is the cost of leaving a real lead per 180 questions, not the rounding.

## Rolling back

Quickest: remove `GFS_PRICING_SERVICE_ACCOUNT` in Netlify (the function answers 503, the page uses "We will send your price"). To get the old public range back, have the publisher emit `pricing` again; the page uses it the moment it is present. To remove the function entirely, delete `netlify/functions/ballpark-price.mjs` and redeploy.

## Page wording that still promises a price range

Left as it is, for aligning later (after the switch-on these still match what the page does when the function is on; if it is turned off the page says "We will send your price" instead).

- `public/quote/ballpark/index.html:22`, `:27`, `:37` meta, og and twitter descriptions: "...pick a style, and see a price range."
- `public/quote/ballpark/index.html:288` lede: "Draw it on the map or type the length, pick a style, and see a price range."
- `public/llms.txt:28`: "...and see a planning price range"
- `public/quote/index.html:285` lede and `:295` card: "planning range" / "planning price range"
- `public/brochure/index.html:290`: "Share your contact details to see a planning range for review."
- `public/contact/index.html:486`, `public/guides/installation-process/index.html:285`, `public/terms/index.html:284`: "instant ballpark quote tool" / "instant range" / "instant quote tool ... price range"
- `public/build.txt`: no current promise. Lines 106 and 107 are an old release note ("PRICE FULLY GATED ... the range mode that showed numbers to everyone is off").
