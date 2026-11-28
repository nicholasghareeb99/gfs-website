# Ghareeb Fencing Solutions live website

Recovered editable static project from the November 5, 2026 production release. Public HTML, CSS, JavaScript and assets are in public/. Function source is recovered from the retained October 6 release used by that production package. This is a consolidated recovery, not the original historical development tree.

Build: npm run build (copies public/ to dist/).

Test: npm test (Node 20 or newer, no installs). tests/forms.test.mjs follows a customer request from the page's lead script through the hidden Netlify forms into the intake function. tests/pricing.test.mjs covers the server-side price function (netlify/functions/ballpark-price.mjs); the ballpark-server-* tests check it against the browser's math and the page's behaviour. See docs/BALLPARK-SERVER-PRICE.md.

Run `npm run measure` with Node 22.19 or newer and Chrome or Chromium installed. It builds and serves `dist/` on your computer, then prints mobile Lighthouse results for the home page, quote page, ballpark tool and wood fence page. The first run downloads the pinned Lighthouse CLI through npm. Set `CHROME_PATH` if Lighthouse needs help finding the browser.

Netlify site: gfencing (b06c8983-3e76-4ff1-8f19-206155103a97), ghareebfence.com. No automatic Git repository deployment is configured. The existing release used a reviewed static upload with preserved prebuilt functions, followed by publication of that exact deploy through restoreSiteDeploy.

For this consolidated source, the equivalent CLI production command is: netlify deploy --prod --build --site b06c8983-3e76-4ff1-8f19-206155103a97 --dir dist --functions netlify/functions

No deployment was performed when creating this repository branch. Credentials belong in local/provider environment settings and are excluded.

### Website and Executive App form contract

Run the website check with `node --test tests/website-forms-contract.test.mjs`. This replays the documented Netlify `formSubmitted` event and the reserved-function Request used by `tests/intake-handler.test.mjs`. It checks the Firestore writes for Careers, Contact, Ballpark, and Booking with a mocked network.

For the paired check, run the following from the Executive App checkout. Use the website checkout that contains this fixture.

```sh
GFS_WEBSITE_ROOT=../gfs-website node --test tests/website-forms-contract.test.mjs
```

The paired check compares the fixture copies and feeds the website's captured writes into the Executive App. To change the contract, edit `tests/fixtures/website-forms-contract.mjs` here first and copy it to the same path in the Executive App. Both repos can run their tests independently. Use synthetic values in the fixture.
