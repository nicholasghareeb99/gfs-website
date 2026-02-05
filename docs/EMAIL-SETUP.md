# Email Notification Setup Guide

## How It Works

When someone submits a form on the website (contact, booking, or ballpark calculator),
the server API writes a document to the Firestore `mail` collection. Firebase's
**Trigger Email from Firestore** extension watches that collection and sends the email.

**Notification recipient:** `nicholasghareeb99@gmail.com`

---

## Step 1: Install the Firebase Extension

1. Go to [Firebase Console](https://console.firebase.google.com/project/ghareeb-fencing/extensions)
2. Click **"Install an extension"** (or "Explore extensions")
3. Search for **"Trigger Email from Firestore"** (by Firebase)
4. Click **Install** → Select your project `ghareeb-fencing`
5. Configure these settings:

| Setting | Value |
|---------|-------|
| **Email documents collection** | `mail` |
| **Default FROM address** | `Ghareeb Fencing <noreply@ghareebfencing.com>` (or your Gmail) |
| **Default REPLY TO** | `nicholasghareeb99@gmail.com` |
| **SMTP connection URI** | See Step 2 below |

---

## Step 2: Set Up SMTP (Choose One)

### Option A: Gmail App Password (Easiest)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (required)
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Create a new app password:
   - App: **Mail**
   - Device: **Other** → name it "Firebase Email"
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
6. Use this SMTP URI in the extension:

```
smtps://nicholasghareeb99@gmail.com:YOUR_APP_PASSWORD@smtp.gmail.com:465
```

Replace `YOUR_APP_PASSWORD` with the 16 characters (no spaces).

**Example:** `smtps://nicholasghareeb99@gmail.com:abcdefghijklmnop@smtp.gmail.com:465`

### Option B: SendGrid (For High Volume)

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Create an API key with Mail Send permissions
3. Use this SMTP URI:

```
smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465
```

---

## Step 3: Deploy Firestore Rules

Copy the rules from `firebase/firestore.rules` into:
**Firebase Console → Firestore Database → Rules → Publish**

The `mail` collection rule allows public creates (so the server API can write email docs):
```
match /mail/{document} {
  allow create: if true;
  allow read, update, delete: if request.auth != null;
}
```

---

## Step 4: Test

1. Deploy the site to Netlify
2. Submit the contact form at `/contact/`
3. Check:
   - **Firestore Console → websiteLeads** — should see the new lead
   - **Firestore Console → mail** — should see the email doc
   - **Your inbox** — should receive the notification email

If the lead appears in Firestore but the email doesn't send:
- Check the Firebase Extension logs: **Extensions → Trigger Email → Logs**
- Verify the SMTP URI is correct
- Ensure the `mail` document has the correct format: `{ to, message: { subject, html } }`

---

## Email Format

Each form generates a styled HTML email:

| Form | Subject | What's Included |
|------|---------|-----------------|
| **Contact** | `New Contact Form: [Name]` | Name, phone, email, fence interest, message |
| **Booking** | `New Booking: [Name] — [Date] at [Time]` | Date/time, name, phone, email, address, project, notes |
| **Ballpark** | `New Ballpark Lead: [Name] — [Fence Type]` | Estimated range, contact info, fence details |

---

## Changing the Email Address

Edit `src/pages/api/submit.ts` line ~16:
```typescript
const NOTIFY_EMAIL = 'nicholasghareeb99@gmail.com';
```

Change to any email address, then redeploy.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Leads saved but no email | Check Firebase Extension logs; verify SMTP URI |
| 403 error in Netlify logs | Deploy the updated Firestore rules from `firebase/firestore.rules` |
| Email goes to spam | Use a custom domain with SPF/DKIM, or use SendGrid |
| Extension not triggering | Ensure collection name is `mail` (not `emails` or `notifications`) |
| "Missing scopes" error | Reinstall the extension with correct permissions |
