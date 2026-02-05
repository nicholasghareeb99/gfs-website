# Ghareeb Fencing Solutions - Content Editing Guide

This guide explains how to edit and manage all content on the GFS website.

---

## Table of Contents

1. [Admin Panel (Firebase-Based Editing)](#admin-panel)
2. [JSON File Content](#json-file-content)
3. [Adding New Pages](#adding-new-pages)
4. [Image Management](#image-management)
5. [SEO Optimization](#seo-optimization)
6. [Building & Deploying](#building--deploying)

---

## Admin Panel

**URL:** `https://yoursite.com/admin/`

The admin panel provides real-time editing for dynamic content stored in Firebase.

### Features Available:

| Section | What You Can Edit | Firebase Collection |
|---------|------------------|---------------------|
| **Dashboard** | View leads & stats | `websiteLeads`, `jobs` |
| **Website Leads** | View/manage quote requests | `websiteLeads` |
| **Jobs** | View job pipeline | `jobs` |
| **Fence Types** | Names, descriptions, features, pricing | `content/fences` |
| **Reviews** | Customer testimonials | `content/reviews` |
| **Gallery** | Upload/delete photos | `gallery` |
| **Why Choose Us** | Homepage selling points | `content/whyUs` |
| **Pricing** | Calculator pricing per foot | `settings/global` |
| **Site Settings** | Hero text, stats, contact, SEO | `settings/site` |

### Login Credentials

Create an admin user in Firebase Console:
1. Go to Firebase Console → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. Use these credentials to log into `/admin/`

---

## JSON File Content

For content that doesn't change often, edit the JSON files directly:

### File Locations:

```
src/content/
├── site.json          # Company info, Firebase config, API keys
├── fences.json        # Fence types for static pages
├── reviews.json       # Default reviews (fallback)
├── service-areas.json # All 25 service areas
├── permits.json       # Permit info by municipality
├── about.json         # About page content
└── contact.json       # Contact page content
```

### Editing site.json

```json
{
  "company": {
    "name": "Ghareeb Fencing Solutions",
    "phone": "(419) 902-8257",
    "email": "info@ghareebfencing.com",
    "city": "Toledo",
    "state": "OH"
  },
  "hero": {
    "badge": "Toledo's #1 Rated Fence Contractor",
    "title": "Your Family Deserves a",
    "titleHighlight": "Beautiful, Safe Backyard",
    "subtitle": "Professional fence installation..."
  },
  "stats": {
    "fencesInstalled": "500+",
    "googleRating": "4.9",
    "reviewCount": "127"
  },
  "googleMaps": {
    "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
  },
  "firebase": {
    "apiKey": "...",
    "projectId": "...",
    ...
  }
}
```

### Editing fences.json

```json
{
  "fences": [
    {
      "name": "Wood Fence",
      "slug": "wood-fence",
      "shortDescription": "Classic beauty with natural warmth",
      "description": "Full page description...",
      "priceRange": "$28-45/ft",
      "lifespan": "15-20 years",
      "features": [
        "Natural beauty",
        "Customizable stains",
        "Privacy options"
      ],
      "image": "/images/gallery/cedar-full-yard.jpg"
    }
  ]
}
```

### Editing service-areas.json

```json
{
  "areas": [
    {
      "name": "Toledo",
      "slug": "toledo-oh",
      "state": "OH",
      "county": "Lucas County",
      "population": "270,871",
      "description": "Custom description for Toledo...",
      "neighborhoods": ["West Toledo", "Old Orchard", "Point Place"]
    }
  ]
}
```

### Editing permits.json

```json
{
  "permits": [
    {
      "municipality": "Toledo",
      "state": "OH",
      "required": true,
      "cost": "$50",
      "process": "Apply online or in person...",
      "setbacks": {
        "front": "Property line",
        "side": "Property line", 
        "rear": "Property line"
      },
      "maxHeight": {
        "front": "4 feet",
        "sideRear": "6 feet"
      },
      "website": "https://toledo.oh.gov/permits",
      "phone": "(419) 245-1220"
    }
  ]
}
```

---

## Adding New Pages

### Adding a New Fence Type

1. **Add to fences.json:**
```json
{
  "name": "Composite Fence",
  "slug": "composite-fence",
  "shortDescription": "...",
  ...
}
```

2. **The page auto-generates** at `/fences/composite-fence/` using the `[slug].astro` template.

### Adding a New Service Area

1. **Add to service-areas.json:**
```json
{
  "name": "Findlay",
  "slug": "findlay-oh",
  "state": "OH",
  "county": "Hancock County",
  ...
}
```

2. **The page auto-generates** at `/service-areas/findlay-oh/`

### Adding a Blog Post

1. **Create file:** `src/pages/blog/your-post-slug/index.astro`

2. **Use this template:**
```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro';

const post = {
    title: 'Your Post Title',
    excerpt: 'Brief description...',
    date: '2025-01-15',
    ...
};
---

<BaseLayout title={post.title} description={post.excerpt}>
    <article>
        <!-- Your content -->
    </article>
</BaseLayout>
```

---

## Image Management

### Option 1: Admin Panel (Recommended)

1. Go to `/admin/` → Gallery
2. Click "Upload" and select images
3. Images upload to Firebase Storage
4. Use URLs in your content

### Option 2: Static Images

1. Add images to: `public/images/gallery/`
2. Reference as: `/images/gallery/your-image.jpg`
3. Rebuild site: `npm run build`

### Image Guidelines

| Type | Recommended Size | Format |
|------|------------------|--------|
| Gallery | 1200×800px | JPG |
| Hero | 1920×1080px | JPG |
| Thumbnails | 400×300px | JPG/WebP |
| Icons | 64×64px | PNG/SVG |

### Naming Convention

```
material-style-location.jpg

Examples:
- cedar-privacy-main.jpg
- vinyl-white-pool.jpg
- aluminum-black-gate.jpg
```

---

## SEO Optimization

### Per-Page SEO

Edit in the page's frontmatter:

```astro
<BaseLayout 
    title="Page Title | Ghareeb Fencing"
    description="150-160 character description with keywords"
    keywords={['keyword1', 'keyword2', 'keyword3']}
    canonical="/page-url/"
>
```

### Sitemap

Auto-generated at build time. Located at `/sitemap-index.xml`

Configuration in `astro.config.mjs`:
```javascript
sitemap({
    filter: (page) => !page.includes('/admin/'),
    changefreq: 'weekly',
    priority: 0.7
})
```

### Structured Data

Already implemented:
- ✅ LocalBusiness schema (all pages)
- ✅ BreadcrumbList (navigation)
- ✅ FAQPage (blog posts)
- ✅ Article/BlogPosting (blog)
- ✅ Service (fence pages)
- ✅ Review (reviews page)

### robots.txt

Located at `public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://ghareebfencing.com/sitemap-index.xml
```

---

## Building & Deploying

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# View at http://localhost:4321
```

### Production Build

```bash
# Build static files
npm run build

# Preview build
npm run preview

# Output in /dist folder
```

### Deploy to Netlify

**Option 1: Drag & Drop**
1. Run `npm run build`
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `dist/` folder

**Option 2: Git Integration**
1. Push to GitHub
2. Connect repo in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`

### Environment Variables (Netlify)

Required for production:
```
GOOGLE_MAPS_API_KEY=your_key_here
```

---

## Quick Reference

### File Changes That Require Rebuild:

| Change | Rebuild Needed? |
|--------|----------------|
| JSON content files | ✅ Yes |
| Astro page templates | ✅ Yes |
| CSS styles | ✅ Yes |
| Static images | ✅ Yes |
| Admin panel data (Firebase) | ❌ No |
| Gallery uploads | ❌ No |
| Pricing changes | ❌ No |

### Common Tasks:

| Task | How To |
|------|--------|
| Update phone number | Edit `src/content/site.json` → rebuild |
| Add fence photo | Upload via admin panel OR add to `public/images/gallery/` |
| Change pricing | Admin panel → Pricing |
| Add review | Admin panel → Reviews → Add Review |
| Edit homepage hero | Admin panel → Site Settings → Hero |
| Add service area | Edit `src/content/service-areas.json` → rebuild |
| Fix permit info | Edit `src/content/permits.json` → rebuild |

---

## Support

For technical issues with the website:
- Check browser console for errors
- Verify Firebase configuration
- Ensure Google Maps API key is valid
- Review Netlify deploy logs

For content questions:
- Refer to this guide
- Check JSON file formatting (use a JSON validator)
- Test changes locally before deploying
