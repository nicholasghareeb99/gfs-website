# Ballpark price from the server

## What it does

The instant ballpark range used to be worked out in the visitor's browser from a public price list. This moves the math to a Netlify function (`netlify/functions/ballpark-price.mjs`) so the per-foot and gate rates no longer have to be public. Customers see the same range, the same way: they send the contact form, then the range and the comparison list appear.

- The function reads the rates from Firestore `settings/global` with a service account, prices the project with the same rules as the page, and answers with `low`, `high` and a comparison list (`style`, `low`, `high`). It never sends a total, a rate, billable feet or waste.
- It only prices a project for a receipt that exists in `websiteLeads` and is under 24 hours old.
- Each receipt is limited to 60 priced requests, and 20 in any one minute (a comparison list counts as one). Past that it answers 429 and the page says "We will send your price".
- Until the key is added it answers 503 `not-configured`, so deploying it changes nothing.
- The page only uses it when the public price document has no prices (the "by request" state). While prices are still public, the page never calls it.
- If the function is off, slow, over its limit or errors, the page falls back to "We will send your price" and the office quotes by hand. Nothing shows an error.

## Switch-on order

1. **Owner:** create the service account key (see the role below) and add it in Netlify as `GFS_PRICING_SERVICE_ACCOUNT` (the JSON, raw or base64). `GFS_FIREBASE_PROJECT_ID` is already set. Do not paste the key anywhere else.
2. **Deploy the website.** Open the ballpark page and confirm it still shows the same range as before (it still comes from the public list, and the function is not called).
3. **Publisher:** stop emitting `pricing` in `settings/public` (keep `styleNames`, photos and specs).
4. **Check:** reload the ballpark page, do a test request, and confirm the range appears after the form. In the browser network tab there should be a POST to `/.netlify/functions/ballpark-price` returning 200 with only `low`, `high`, `comparisons`.

Optional: turn on a Firestore TTL policy for field `expireAt` on collection `ballparkPriceUse` so the small counter documents clean themselves up.

## Service account permission

What the function needs:

- read `settings/global` and `websiteLeads` documents (`datastore.entities.get`)
- create and update documents in `ballparkPriceUse` (`datastore.entities.create`, `datastore.entities.update`), for the request counter. It is a separate collection on purpose: the Executive app does not read it and the lead documents are never written.

IAM cannot limit these to particular collections, and Firestore security rules do not apply to service accounts. The closest option is a custom role with just those three permissions (no list, no delete), on this project only. Be honest about the trade-off: with the counter on, the key can also update documents, so keep it only in Netlify and rotate it if it ever leaks. If you would rather keep the key strictly read-only, give it only `datastore.entities.get` and set `GFS_PRICING_LIMIT=off` in Netlify. Then there is no counter and the only protection against probing is the receipt requirement, the 24 hour age limit and the $100 rounding. (I did not verify whether Firestore IAM conditions can narrow the role to one collection; if they can, that is better.)

## What this does not stop

Someone with one valid receipt can still ask many different footages, up to the cap, and the answers are rounded to $100 with a 5% band, which is the remaining protection against working a rate backwards. Getting a receipt needs a real contact form submission, which leaves a lead behind. The caps keep that to at most 60 questions per lead.

## Rolling back

Quickest: remove `GFS_PRICING_SERVICE_ACCOUNT` in Netlify (the function answers 503, the page uses "We will send your price"). To get the old public range back, have the publisher emit `pricing` again; the page uses it the moment it is present. To remove the function entirely, delete `netlify/functions/ballpark-price.mjs` and redeploy.
