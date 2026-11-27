// Manual IndexNow ping, for a computer with internet access: `npm run indexnow`.
// Netlify also runs this automatically after each production deploy (netlify/functions/deploy-succeeded.mjs).
import { pingIndexNow } from '../netlify/functions/deploy-succeeded.mjs';
const { status, count } = await pingIndexNow();
console.log(`IndexNow: sent ${count} URLs, status ${status} (200 or 202 = accepted)`);
if (status >= 400) process.exitCode = 1;
