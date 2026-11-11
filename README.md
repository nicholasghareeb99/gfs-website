# Ghareeb Fencing Solutions live website

Recovered editable static project from the November 5, 2026 production release. Public HTML, CSS, JavaScript and assets are in public/. Function source is recovered from the retained October 6 release used by that production package. This is a consolidated recovery, not the original historical development tree.

Build: npm run build (copies public/ to dist/).

Netlify site: gfencing (b06c8983-3e76-4ff1-8f19-206155103a97), ghareebfence.com. No automatic Git repository deployment is configured. The existing release used a reviewed static upload with preserved prebuilt functions, followed by publication of that exact deploy through restoreSiteDeploy.

For this consolidated source, the equivalent CLI production command is: netlify deploy --prod --build --site b06c8983-3e76-4ff1-8f19-206155103a97 --dir dist --functions netlify/functions

No deployment was performed when creating this repository branch. Credentials belong in local/provider environment settings and are excluded.
