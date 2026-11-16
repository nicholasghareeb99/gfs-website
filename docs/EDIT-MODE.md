# Edit Mode Guide

## How to Use Edit Mode

### 1. Log In
- Go to `https://ghareebfencing.com/admin/login`
- Sign in with your Firebase credentials
- You'll see a floating toolbar at the top of every page

### 2. Enable Editing
- Click the blue **"Edit"** button in the toolbar
- All editable text gets a dashed blue outline
- All editable images get a camera icon on hover

### 3. Edit Text
- Click any blue-outlined text to edit it inline
- Type your changes directly
- The change counter in the toolbar tracks your edits

### 4. Replace Images
- Click any image with the camera overlay
- Upload a new image or paste a URL
- Click "Apply" to replace it

### 5. Save Changes
- Click the green **"Save Changes"** button
- All edits are saved to Firestore instantly
- Changes are live immediately (SSR serves fresh content on every request)

### 6. Discard Changes
- Click **"Discard"** to revert all unsaved changes

## What's Editable

| Page | Editable Elements |
|------|-------------------|
| **Homepage** | Hero title, subtitle, badge, stats, Why Us cards, reviews, gallery images |
| **About** | Tagline, mission, history, team photo, values |
| **Fences** | Section headings, fence type details (via admin panel) |
| **Gallery** | Images (managed via admin panel/Firestore) |
| **Reviews** | Review content (managed via admin panel/Firestore) |
| **Contact** | Page title, subtitle, contact info |
| **Permits** | Page title, subtitle, permit data |
| **Service Areas** | Page title, subtitle |
| **Quote Pages** | Page titles and subtitles |
| **Booking** | Page title and subtitle |

## How Data Flows

```
You edit text on page → Saved to Firestore → Next page visit fetches fresh data from Firestore (SSR)
```

Every page request:
1. Netlify SSR function receives request
2. Astro fetches content from Firestore via REST API
3. Falls back to static JSON if Firestore is unavailable
4. Returns fully rendered HTML

## Admin Panel (Full CMS)

Go to `/admin/` for the full admin dashboard to manage:
- Leads & contact submissions
- Appointment bookings
- Fence types & pricing (syncs with Executive App)
- Reviews
- Gallery images
- Why Us cards
- Site settings

## Technical Notes

- **Edit mode toolbar** only loads Firebase SDK when admin cookie is detected
- **SSR mode** means changes are live instantly — no rebuild needed
- **Firestore REST API** is used server-side (no Firebase SDK in the deployed server)
- **Static JSON files** serve as fallback if Firestore is unreachable
- **Images** uploaded via edit mode go to Firebase Storage
