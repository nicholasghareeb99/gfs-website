# GFS Website - Astro Version

A modern, editable website for Ghareeb Fencing Solutions built with Astro.

## Key Features

- **All content is editable** via JSON files in `src/content/`
- **Fast static site** - Astro generates pure HTML/CSS
- **Same design** as your current site
- **Simple admin panel** at `/admin` for editing
- **Automatic rebuild** when content changes

## Project Structure

```
gfs-astro/
├── src/
│   ├── content/           # ← EDIT THESE FILES
│   │   ├── site.json      # Company info, nav, footer
│   │   ├── home.json      # Homepage content
│   │   ├── about.json     # About page content
│   │   ├── quote.json     # Quote page content
│   │   └── fences/        # Fence page content
│   │       ├── vinyl.json
│   │       ├── cedar.json
│   │       └── ...
│   ├── layouts/
│   │   └── BaseLayout.astro
│   └── pages/
│       ├── index.astro
│       ├── about/
│       ├── quote/
│       └── fences/
├── public/
│   ├── css/styles.css
│   └── images/
└── netlify.toml
```

## How to Edit Content

### Option 1: Edit JSON Files Directly

1. Open any file in `src/content/`
2. Edit the text/image URLs
3. Commit & push to GitHub
4. Netlify automatically rebuilds

### Option 2: Use the Admin Panel

1. Go to `yoursite.com/admin`
2. Login with: `admin` / `gfs2024!`
3. Edit content in the forms
4. Click "Save & Publish"

## Deployment to Netlify

### First Time Setup

1. Push this code to a new GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/gfs-website.git
   git push -u origin main
   ```

2. Go to [Netlify](https://app.netlify.com)

3. Click "Add new site" → "Import an existing project"

4. Connect your GitHub account and select the repo

5. Build settings (should auto-detect):
   - Build command: `npm run build`
   - Publish directory: `dist`

6. Click "Deploy site"

### Connect Your Domain

1. In Netlify, go to Site settings → Domain management

2. Click "Add custom domain"

3. Enter: `ghareebfencingsolutions.com`

4. Update your domain's DNS:
   - Add CNAME record: `www` → `your-site-name.netlify.app`
   - Or use Netlify DNS for automatic setup

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Adding New Pages

### New Fence Type

1. Create `src/content/fences/newtype.json` (copy from vinyl.json)
2. Edit the content
3. Add to `getStaticPaths()` in `src/pages/fences/[fence].astro`
4. Commit & push

### New Service Area

1. Create `src/content/service-areas/cityname.json`
2. Create `src/pages/service-areas/cityname.astro`
3. Commit & push

## Images

- Add images to `public/images/gallery/`
- Reference them as `/images/gallery/filename.jpg`
- Recommended: Use a CDN like Cloudinary for better performance

## Troubleshooting

### Changes not showing up?
- Clear your browser cache (Ctrl+Shift+R)
- Check Netlify deploy status
- Verify JSON syntax is valid

### Build failing?
- Check for JSON syntax errors
- Make sure all image paths exist
- Check Netlify build logs

## Support

For website issues, contact your developer.
For fencing inquiries: (419) 902-8257

---

Built with ❤️ using [Astro](https://astro.build)
