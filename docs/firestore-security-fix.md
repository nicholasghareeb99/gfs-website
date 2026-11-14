# Firestore security fix (not deployed yet)

## The problem
The rules copy in `gfs-website/firebase/firestore.rules` lets any signed-in
user (`request.auth != null`) read and write almost every collection. The
Executive app signs users in anonymously, and anonymous sign-in is open to
anyone with the public web config. If the live rules match that copy, anyone
can read jobs, customers, leads and payments, and edit website content.

That copy is out of date (the Executive app also uses `tasks`,
`calendarEvents` and `salesTeam`, which it does not mention), so the live
rules must be read before anything is deployed.

## Step 1: website content (safe now)
Only the website edit mode writes these, and it signs in with Google.
Replace their `allow write` lines with `isEditor()`:

```
function isEditor() {
  return request.auth != null
    && request.auth.token.firebase.sign_in_provider == 'google.com'
    && request.auth.token.email_verified == true
    && request.auth.token.email in ['nicholasghareeb99@gmail.com'];
}

match /siteContent/{doc} { allow read: if true; allow write: if isEditor(); }
match /pageContent/{doc} { allow read: if true; allow write: if isEditor(); }
match /content/{doc}     { allow read: if true; allow write: if isEditor(); }
match /gallery/{doc}     { allow read: if true; allow write: if isEditor(); }
```

Storage (`site-media/{uid}/...`, used by the photo editor): same `isEditor()`
check on writes.

## Step 2: business data (needs an Executive app change first)
`jobs`, `customers`, `leads`, `payments`, `contracts`, `invoices`, `crew*`,
`timeEntries`, `transactions`, `tasks`, `calendarEvents`, `salesTeam`,
`settings` (write) should require a real staff account, not anonymous:

```
function isStaff() {
  return request.auth != null
    && request.auth.token.firebase.sign_in_provider != 'anonymous'
    && request.auth.token.email in [/* staff emails */];
}
```

Deploying Step 2 before the Executive app, crew app and customer portal stop
relying on `signInAnonymously` would lock them out. Customer portal access
needs its own rule (per-job token or custom claims).

## To unblock
On the PC: `firebase login` (Google account that owns ghareeb-fencing).
Then fetch the live rules, apply Step 1 to them, and deploy with
`firebase deploy --only firestore:rules`.
