# Ghareeb Fencing Solutions - Astro Website

A modern, fast, and SEO-optimized website for Ghareeb Fencing Solutions built with Astro 5.0.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
gfs-astro/
├── public/
│   ├── images/gallery/       # Project photos
│   └── robots.txt
├── src/
│   ├── content/              # JSON data files
│   │   ├── fences.json       # Fence types & specs
│   │   ├── permits.json      # Municipality permit info
│   │   ├── reviews.json      # Customer reviews
│   │   ├── service-areas.json
│   │   └── site.json         # Site config & Firebase keys
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── admin/            # 🔐 Admin dashboard
│   │   ├── fences/[slug]     # Dynamic fence pages
│   │   ├── service-areas/[slug]
│   │   ├── quote/ballpark/   # Interactive calculator
│   │   └── index.astro
├── firebase/                 # 🔒 Security rules
│   ├── firestore.rules
│   └── storage.rules
├── netlify.toml              # Deployment config
└── astro.config.mjs
```

## 🔐 Admin Dashboard

### Access
- **URL:** `/admin/`
- **Default Credentials:** `admin` / `admin11`
- **⚠️ CHANGE PASSWORD IMMEDIATELY after first login!**

### Features
| Feature | Description |
|---------|-------------|
| **Dashboard** | View leads, jobs, stats at a glance |
| **Leads** | Manage website leads from ballpark calculator |
| **Page Builder** | Drag-and-drop editor for page content |
| **Gallery** | Upload and manage project photos |
| **Pricing** | Edit fence pricing (syncs to ballpark calculator) |
| **Security** | Change username/password, view security logs |

### Page Builder
The admin panel includes a visual page builder with:
- **Drag & Drop Components:** Heading, Text, Image, Button, Divider, CTA
- **Reorder Content:** Drag blocks up/down to rearrange
- **Edit In-Place:** Click any text to edit directly
- **Image Upload:** Upload images directly to Firebase Storage
- **Multi-Page:** Edit Home, About, Services pages

## 💰 Ballpark Quote Calculator

The interactive calculator at `/quote/ballpark/` features:
- **Map Drawing:** Draw fence lines on satellite view
- **Real-time Pricing:** Pulls prices from Firebase `settings/global.pricing`
- **Lead Capture:** Saves leads to Firebase `websiteLeads` collection
- **Mobile Friendly:** Works on all devices

### Pricing Format (in Admin > Pricing)
```
Style Name : price per foot : single gate : double gate
Cedar Privacy : 42 : 375 : 695
White Vinyl Privacy : 45 : 425 : 795
Black Chain Link : 22 : 275 : 495
```

## 🔒 Security Features

### Authentication
- SHA-256 password hashing (client-side)
- Session tokens with 30-minute timeout
- Account lockout after 5 failed attempts (15 min)
- Security event logging
- XSS prevention with input sanitization

### HTTP Headers (via Netlify)
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS filtering
- `X-Content-Type-Options: nosniff` - MIME sniffing prevention
- `Strict-Transport-Security` - Force HTTPS
- `Content-Security-Policy` - Restricts resource loading
- `Permissions-Policy` - Restricts browser features

### Firebase Security Rules
Deploy the rules in `/firebase/` to your Firebase project:

1. Go to Firebase Console > Firestore Database > Rules
2. Copy contents of `firebase/firestore.rules`
3. Click "Publish"

4. Go to Firebase Console > Storage > Rules
5. Copy contents of `firebase/storage.rules`
6. Click "Publish"

**Key protections:**
- Public can only CREATE leads (not read/update/delete)
- Only admins can access leads and jobs
- Settings are public read (for pricing) but admin-only write
- Lead data is validated for proper structure
- Image uploads limited to 5MB, images only

## 🚀 Deployment

### Deploy to Netlify

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/gfs-astro.git
   git push -u origin main
   ```

2. **Connect Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Select your GitHub repo
   - Settings are auto-detected from `netlify.toml`
   - Click "Deploy site"

3. **Add Custom Domain:**
   - Site settings > Domain management > Add custom domain
   - Add `ghareebfencing.com`
   - Configure DNS as instructed

### Deploy Firebase Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (select Firestore and Storage)
firebase init

# Deploy rules
firebase deploy --only firestore:rules,storage:rules
```

## 🔥 Firebase Setup

### Required Collections
| Collection | Purpose |
|------------|---------|
| `admin/credentials` | Admin login (auto-created on first visit) |
| `settings/global` | Pricing data (create in admin panel) |
| `settings/site` | Site settings (hero text, stats) |
| `websiteLeads` | Quote requests from calculator |
| `jobs` | Synced with Executive app |
| `gallery` | Uploaded images metadata |
| `pageContent` | Page builder content |
| `securityLogs` | Login attempts, changes |

### Firebase Config Location
Update Firebase keys in `/src/content/site.json`:

```json
{
  "firebase": {
    "apiKey": "your-api-key",
    "authDomain": "your-project.firebaseapp.com",
    "projectId": "your-project",
    "storageBucket": "your-project.appspot.com",
    "messagingSenderId": "123456789",
    "appId": "1:123456789:web:abc123"
  }
}
```

## 📄 Pages Overview

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero, services, trust signals |
| About | `/about/` | Company story, team |
| Fences | `/fences/` | All fence types |
| Fence Detail | `/fences/[slug]/` | Individual fence pages |
| Gallery | `/gallery/` | Project photos |
| Reviews | `/reviews/` | Customer testimonials |
| Service Areas | `/service-areas/` | Coverage map |
| Area Detail | `/service-areas/[slug]/` | City-specific pages |
| Permits | `/permits/` | Permit lookup tool |
| Quote | `/quote/` | Quote options |
| Ballpark | `/quote/ballpark/` | Interactive calculator |
| Contact | `/contact/` | Contact form |
| Admin | `/admin/` | Dashboard (protected) |

**Total: 43 pages generated**

## 🎨 Design System

### Colors
- **Primary:** `#1e3a5f` (Navy Blue)
- **Accent:** `#d4af37` (Gold)
- **Success:** `#10b981`
- **Warning:** `#f59e0b`
- **Error:** `#ef4444`

### Fonts
- **Headings:** Montserrat (600-800 weight)
- **Body:** Open Sans (400-600 weight)

## 📝 Content Updates

### Edit Fence Types
Edit `/src/content/fences.json` and rebuild.

### Edit Service Areas
Edit `/src/content/service-areas.json` and rebuild.

### Edit Pricing (Live)
Use Admin Panel > Pricing. Changes sync immediately to ballpark calculator.

### Add Gallery Images
1. **Static:** Add to `/public/images/gallery/` and rebuild
2. **Dynamic:** Use Admin Panel > Gallery (uploads to Firebase)

## 🛠 Troubleshooting

### Build Fails
```bash
rm -rf node_modules .astro
npm install
npm run build
```

### Firebase Connection Issues
- Verify API keys in `site.json`
- Check Firebase Console for quota limits
- Ensure Firestore/Storage rules are deployed

### Admin Login Issues
- Default: `admin` / `admin11`
- Clear localStorage if locked out
- Check `securityLogs` collection for events

## 📞 Support

For questions about this website:
- **Developer:** Claude AI
- **Business:** Ghareeb Fencing Solutions
- **Phone:** (419) 902-8257
