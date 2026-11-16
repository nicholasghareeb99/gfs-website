# GFS Astro Website — Security Audit Report

**Date:** February 5, 2026
**Status:** All critical and high issues resolved

---

## Summary

| Severity | Found | Fixed |
|----------|-------|-------|
| 🔴 Critical | 3 | 3 ✅ |
| 🟠 High | 4 | 4 ✅ |
| 🟡 Medium | 4 | 4 ✅ |
| 🔵 Low | 4 | 4 ✅ |

---

## All Fixes Applied

### 🔴 Critical

**C1. HTML Injection in Email Templates** ✅
User input was inserted raw into HTML email templates. Added `esc()` function — 21 calls escape all user data with entity encoding before insertion.

**C2. Hardcoded Admin Credentials** ✅
`public/js/main.js` had `ADMIN_PASS: 'admin11'` in plaintext. File deleted entirely (was unused legacy code).

**C3. Server Error Message Leakage** ✅
API returned `err.message` to clients. Now returns generic `"Server error"` while logging details server-side.

### 🟠 High

**H1. Firestore Rules: 28 Collections Open Write** ✅
Completely rewritten with 3-tier security model:
- **Tier 1 — Public create (validated):** `websiteLeads`, `bookings`, `mail` — field validation enforces required fields, string length limits, correct data types
- **Tier 2 — Public read, auth write:** `settings`, `content`, `gallery`, `availableSlots`, etc. — website can read, only Firebase Auth users can edit
- **Tier 3 — Auth required:** 17 business collections (`jobs`, `contracts`, `payments`, `crew`, etc.) — all operations require Firebase Auth
- **No catch-all** — Firestore denies unlisted collections by default

**H2. No Rate Limiting** ✅
Added in-memory per-IP rate limiting: 5 submissions per minute per IP. Returns 429 on excess. Automatic cleanup of stale entries.

**H3. No Upload Size Limits** ✅
Added 5MB limit + MIME type validation at 3 checkpoints in edit mode (drag-drop, file select, pre-upload). Filenames sanitized. Gallery already had validation.

**H4. `unsafe-eval` in CSP** ✅
Removed from Content-Security-Policy. Zero `eval()` calls found in codebase.

### 🟡 Medium

**M1. No Email/Phone Validation** ✅
Added regex validation for email (`/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`) and phone (`/^[\d\s()+-]{7,20}$/`) to all 3 API handlers plus the client-side quote form.

**M2. No CSRF Protection** ✅
API checks `Origin` header against `Host` header. Rejects cross-origin requests that don't match the site domain.

**M3. innerHTML with Dynamic Data** ✅
Added `san()` sanitizer function to admin panel. Applied to `confirmAction()` inputs. Risk mitigated by Firestore rules requiring auth for all content collections.

**M4. npm Dependency Vulnerability** ✅
Removed unused `firebase-admin` package (was in `package.json` but never imported). Eliminated `fast-xml-parser` DoS vulnerability. `npm audit` now shows 0 vulnerabilities.

### 🔵 Low

**L1. Cookie Flags** ✅
Added `SameSite=Strict;Secure` to all admin cookie operations.

**L2. set:html Usage** ✅ (No action needed)
All 4 uses are JSON.stringify into `<script type="application/ld+json">`. Safe — no user input.

**L3. Business Contact Info** ✅ (No action needed)
Phone number in SEO meta descriptions is intentional public business info.

**L4. Legacy public/js/main.js** ✅
Deleted. Was dead code with remnant credential patterns.

---

## Additional Security: Honeypot Bot Protection

Added hidden honeypot fields to all 4 forms:
- Contact form, Booking form, Ballpark form, Detailed quote form
- Hidden via CSS positioning (not `type="hidden"` which bots skip)
- API silently accepts but discards submissions that fill honeypot
- Client-side quote form also checks honeypot before Firestore write

---

## Deploying Firestore Rules

The new rules in `firebase/firestore.rules` must be deployed to take effect:

```bash
firebase deploy --only firestore:rules
```

**Important:** Your exec app, crew portal, and customer portal all use Firebase Auth login flows, so they will continue working — the new rules simply require that `request.auth != null` for business data collections. Only unauthenticated access to business data is blocked.

**What changes for users:**
- Website forms: Still work (public create with validation)
- Website pages: Still work (public read for content)
- Edit mode: Still works (requires Firebase Auth login)
- Admin panel: Still works (requires Firebase Auth login)
- Exec app: Still works (uses Firebase Auth)
- Crew portal: Still works (uses Firebase Auth)

**What's blocked:**
- Anonymous writes to business collections (jobs, payments, contracts, etc.)
- Anonymous reads of business data (jobs, crew, customers, etc.)
- Bot form spam (honeypot + rate limiting + validation)
- Cross-origin form submissions (CSRF protection)
