# Firestore and Storage security (checked Nov 15, 2026)

The live rules in the Firebase console (released Sep 16, 2026) are locked
down:

- Business data (jobs, customers, leads, payments, contracts, invoices,
  crew, tasks, calendar, sales team, purchase orders and the rest) needs a
  named owner/office staff account: `fullExecutive()` checks the
  `staff/{uid}` document and rejects anonymous sessions.
- Website content (`siteContent`, `pageContent`, `content`, `gallery`,
  `sitePages`, `siteConfig`) can only be written by the site owner's
  verified Google account.
- Website forms can only create leads, bookings and analytics hits, with
  field validation. Nothing is publicly readable except published site
  content and `settings/public`.
- Storage follows the same pattern; everything not listed is denied.

`firebase/firestore.rules` and `firebase/storage.rules` in this repo used
to hold an old, open copy. They are now notes that will fail to deploy, so
the live rules can't be overwritten from here. Edit rules in the console,
or copy the live rules into these files first.

Minor, not urgent: `availableSlots` lets anyone flip the `booked` flag
(needed by the booking form), and `mail` accepts public creates, but no
email extension is installed, so nothing is ever sent from it.
