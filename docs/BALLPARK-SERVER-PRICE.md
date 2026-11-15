# Ballpark price from the server

## What it does

The instant ballpark range used to be worked out in the visitor's browser from a public price list. This moves the math to a Netlify function (`netlify/functions/ballpark-price.mjs`) so the per-foot and gate rates no longer have to be public. Customers see the same range, the same way: they send the contact form, then the range and the comparison list appear.

- The function reads the rates from Firestore `settings/global` with a service account, prices the project with the same rules as the page, and answers with `low`, `high`, `parts` (the style and feet it priced, so the page can check the answer is for its layout) and a comparison list (`style`, `low`, `high`). It never sends a total, a rate, billable feet or waste.
- It only prices a project for a receipt that exists in `websiteLeads` and is under 24 hours old (see "How old a lead is" below).
- Two separate limits apply to each receipt (see "Limits" below): 20 attempts in any one clock minute, and 60 priced ranges for the life of the receipt. Past a limit it answers 429 and the page falls back to "We will send your price".
- Until the key is added it answers 503 `not-configured`, so deploying it changes nothing.
- The page only uses it when the public price document has no prices (the "by request" state). While prices are still public, the page never calls it.
- If the function is off, slow, over its limit or errors, the page falls back to "We will send your price" and the office quotes by hand. Nothing shows an error. A failure that may pass is not final (see "When something fails" below).

## When something fails (page behaviour)

- **Capability check.** Only a definite answer is remembered for the browser session: `{ok:true}` for 30 minutes, an explicit 503 `not-configured` for 2 minutes. A network error, a timeout, or any other status is not an answer: nothing is stored, the page stays undecided (it shows the by-request wording meanwhile), asks again at 5 s, 15 s and 45 s, and then stops. A healthy reload always makes its own check. If the check starts working, a customer who already sent the form gets the range without sending anything again.
- **Asking for the range.** If the lead is not there yet (409) the page asks four times in the first ~9 s, then at 5 s, 15 s and 45 s after that. A 503, a network error or a 12 s timeout is retried at the same 5 s, 15 s and 45 s. A 429 with `Retry-After` (the minute limit) waits that many seconds (at least the normal pause; over 120 s is left to the button). Then it stops. Each ask is for the unchanged project and the same receipt, so no new contact submission is needed.
- **Not retried** because asking again cannot change the answer: needs a quote, a 429 with no `Retry-After` (the 60 ranges are used), 400, 403 (too old or not valid).
- **Try again.** While the by-request wording is showing after a failure that may pass, a plain "Try again" button sits under it. It asks again straight away and starts a fresh set of recovery pauses.
- **Back online / back in the tab.** On `online`, and on `visibilitychange` to visible, a failed ask (or an undecided capability check) is tried again, at most three extra times per failure.
- **Changed project.** A change cancels any pending retry for the old project and asks for the new one; a late answer for an old project is ignored, so an old range is never shown for a changed project.
- **Public prices.** While the price document still has prices the page never calls the function, including on these events.

## Limits (attempts and priced ranges are counted apart)

- **Attempts, per clock minute: 20.** Every request for a real, fresh lead counts here, whatever happens to it (priced, needs a quote, 503). It is only a cheap bound on how fast one receipt can ask. Over it: 429 with a `Retry-After` header (seconds to the next minute). The next minute starts a new window and prices normally. Counter document: `ballparkPriceUse/{receipt}_m{minute}`.
- **Priced ranges, lifetime: 60.** Counted only when a range is actually returned. The function works out the range first (nothing is written), then takes one slot with a single atomic Firestore increment on `ballparkPriceUse/{receipt}`, and sends the range only if the number that increment returned is 60 or less. Why this is safe: the increment returns that request's own place in line, so of any number of simultaneous requests only the ones numbered 1 to 60 get a range (two requests cannot both get the last slot, there is no read-then-write to race), and a range is never sent unless its increment committed (if the commit fails the customer gets a 503 and no range, and a retry takes one slot, not two). A 503, a minute throttle, a needs-a-quote answer, a bad request or a missing lead take nothing from the 60. Past 60: 429 with no `Retry-After` (waiting does not help) and no range in the body; the counter keeps rising but nothing more is sent.
- `GFS_PRICING_LIMIT=off` skips both counters.

## How old a lead is

The age comes from the lead document's own Firestore `createTime` when the REST answer has it (the database sets it, the sender cannot). If it is absent the intake function's `createdAtMs` (also written with server time) is used. A lead is refused with 403 `Request not valid` when the time is missing, not a number (text is refused), zero or negative, unreadable, or more than 5 minutes in the future (a little clock skew is allowed). A readable time older than 24 hours gives 403 `Request too old`. A time that cannot be read never authorises a price.

## Returning customers after 24 hours (renewal rule)

Pricing authority and marketing attribution are kept apart. `acquisitionReceipt` (the original lead, used as the parent of follow-ups and for reporting) is unchanged. The page prices with a separate pricing receipt: the `id` of the document the customer's last submission just produced. When "Continue this project" is followed by an accepted project update, that is the new `project_update` document, written by the real intake a moment ago, so it is under 24 hours old and is priced like any fresh lead. No duplicate marketing lead is created: the update was already going to be written. Rule in one line: a lead older than 24 hours is never priced, and the only renewal is a newer accepted update document, which is itself the receipt. Limit counters belong to the receipt asked about, so an update starts its own counters; each fresh set of limits costs the customer a real submission. One case stays by-request on purpose: resending the exact same project after 24 hours is recognised as already received, creates nothing new, and so has nothing fresh to price against (the page says "We will send your price"); any change to the project creates the update that renews it.

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

IAM cannot limit these to particular collections, and Firestore security rules do not apply to service accounts. The closest option is a custom role with just those three permissions (no list, no delete), on this project only. Be honest about the trade-off: with the counter on, the key can also update documents, so keep it only in Netlify and rotate it if it ever leaks. If you would rather keep the key strictly read-only, give it only `datastore.entities.get` and set `GFS_PRICING_LIMIT=off` in Netlify. Then there is no counter and the only protection against probing is the receipt requirement, the 24 hour age limit and the $100 rounding. (I did not verify whether Firestore IAM conditions can narrow the role to one collection; if they can, that is better.)

## What this does not stop

The range is the product, so it always says something about the rate. At a long length the answer is a 5% band rounded to $100, which pins the per-foot rate for that style to within a fraction of a percent; at short lengths the $100 rounding hides more. Anyone who really sends the contact form can work out a rate for the styles that way. What the function stops is doing it in bulk with no lead: a price needs a real receipt, under 24 hours old, and each receipt gets at most 60 priced requests (20 a minute). The remaining protection is the cost of leaving a real lead per 60 questions, not the rounding.

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
