# Built website use test

Run this from the repo root with Node 24.

```sh
npm ci
npm ci --prefix tools/e2e-site
npm exec --prefix tools/e2e-site -- playwright install --with-deps chromium webkit
npm run build
npm test
npm test --prefix tools/e2e-site
npm run measure --prefix tools/e2e-site
```

The three Playwright profiles are iPhone WebKit at 390 × 844, iPad WebKit at 834 × 1194, and desktop Chromium at 1440 × 960. Run a single profile with `npm test --prefix tools/e2e-site -- --project=iphone`. Results, traces, screenshots and the performance JSON go in `tools/e2e-site/results/`. The GitHub Actions job uploads that directory.

The server serves `dist/` on loopback and refuses writes and function requests. Browser routes intercept submissions and function calls before they reach the server. The pricing and intake handlers run with fixture Firestore documents. The estimate email handler uses a fake provider and records the message and PDF in memory. No credentials or production addresses are needed.

The browser routes map absolute links for the website's own domains to the local build. Firebase scripts use the test SDK fixture. Leaflet and Leaflet Draw use the installed packages, with a placeholder for map tiles. The fixture answers the other external requests locally and closes WebSockets. Phone, SMS, careers email and lender checks capture the intended navigation. Headless WebKit exercises the touch controls and a reduced viewport for keyboard space.

The sitemap audit records URLs, internal link and image checks, console output, rendered width, clipped controls, compact targets, form metadata, published business facts and wording to review. The price matrix uses synthetic rates and verifies the displayed range against both the actual price function response and the actual intake handler's saved lead.

The phone performance check reports median LCP, CLS, and first-party JavaScript after three cold Chromium visits per page. It uses 390 × 844, 4× CPU slowdown and simulated 4G. The payload counts gzipped and decoded JavaScript served by the build. Third-party fixture bodies and scripts loaded after a user action are outside those totals. GitHub Actions enforces the budgets in `measure.mjs`.
