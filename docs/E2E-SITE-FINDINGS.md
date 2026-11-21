# Website use test · November 21, 2026

The audit started at `eb4a314` and incorporated `01411ce` from `main` before final verification. It exercised the production build locally with iPhone WebKit at 390 × 844, iPad WebKit at 834 × 1194, and desktop Chromium at 1440 × 960. Pool fencing is offered. The pool page, article, schema, and `llms.txt` listing are present.

## Findings

| Severity | What the homeowner sees | Result | Screenshot or evidence |
| --- | --- | --- | --- |
| Friction | An invalid phone could pass the browser's telephone field and show an error only at the bottom of the form. Required and malformed fields relied on browser validation bubbles. | Added persistent, linked errors beside invalid fields in the Ballpark, detailed quote, contact and visit forms. Correcting a field clears its error. | [Phone error on the form](e2e-site/inline-phone.webp) |
| Friction | The floating Privacy choices shortcut sat over page text on mobile after the choice was saved. Its buttons were under 44 px. | The shortcut is in the footer and the consent action buttons have 44 px targets. The current measurement and opt-out settings from `main` remain in effect. | [Before](e2e-site/careers-before.webp) · [After](e2e-site/careers-after.webp) |
| Friction | Pool fencing could be selected in the Ballpark and detailed quote, but was missing from Contact and Book a Measure. | Added Pool Fence to both form lists. The browser flows now exercise pool requests. | [Contact form](../public/contact/index.html) · [Visit form](../public/quote/book/index.html) |
| Friction | Brochure text summaries, two Toledo FAQ summaries on the iPad, the Studio refresh button and the Ballpark photo picker had touch targets under 44 px. | Increased the target heights. The audit excludes controls that are hidden from the user, such as the native selects behind the gate steppers. | [Touch target audit](../tools/e2e-site/audit.spec.mjs) |
| Friction | A zero-foot entry had no inline length warning until the customer continued. The map search field used its example address as the only visible prompt. | The Ballpark shows the length warning alongside the field, and the map field has an accessible label. | [Ballpark form](../public/quote/ballpark/index.html) |
| Friction | Contact's select placeholders clipped in its narrow two-column form rows on iPad. | The form rows use one column at tablet widths so each select gets the full form width. | [iPad before](e2e-site/contact-ipad-before.webp) |
| Friction | The wood versus vinyl, no-dig versus concrete, and open-style comparison guides offered a call but omitted the footer email shortcut. | Added the same business email link used in the other guide footers. | [Wood vs vinyl guide](../public/guides/wood-vs-vinyl/index.html) |
| Cosmetic | Article publishers and several town business schemas pointed to the legacy Squarespace-hosted logo. The founding year was in About and missing from the home schema and `llms.txt`. | Updated the schema links to the same logo used by the header and added 2022 to `llms.txt`. The current home schema also states 2022. | [Home business schema](../public/index.html) · [Published facts](../public/llms.txt) |
| Cosmetic | “Built straight, built honest, built to last” repeats across 97 sitemap pages. The Toledo closing heading, “Tell us what you want your yard to become,” is similarly promotional. | Flagged for editorial review. Pricing, financing, warranties and offers were left as published. | [Footer wording](e2e-site/footer-copy.webp) · [Toledo page](../public/service-areas/toledo-oh/index.html) |

## Homeowner paths

- Walked every location in the production sitemap and probed internal link and image URLs against the build. Logged browser errors, rendered image errors, horizontal overflow, clipped controls, touch sizes and form metadata.
- Compared the Ballpark result to the pricing handler and the lead written by the intake handler for synthetic catalogue styles and heights, including aluminum pool fence. Walk and drive gates are charged on top of the gross run. Tested a drawn corner, separate walk and drive gate counts, 0 ft, 1 ft, 10,000 ft, letters, back, refresh, a delayed price function, and a failed price function. [Retry on iPhone](e2e-site/ballpark-retry.webp)
- Tested estimate email with the sender enabled and disabled, plus an invalid email and the lack of automatic mail before opt-in. The enabled fixture captures the exact range and a PDF. The disabled fixture still records the office request.
- Walked the detailed quote, contact and booking forms, including bad contact input, a failed send and a retry under the same reference. The reduced-viewport test leaves room to reach Submit. [Keyboard-space simulation](e2e-site/submit-reachable.webp)
- Checked gallery filtering, photo links, the public 3D viewer, Careers' email and call actions, Contact's text action, and the handoff to FNBO. These outbound actions were intercepted. Careers routes applications through phone and email.

## Business facts

The current business details checked in rendered pages, contact links, applicable structured data and `llms.txt` are (419) 214-2107, nick@ghareebfence.com, 5242 Tractor Rd Suite C, Toledo, OH 43612, Monday–Saturday 8 AM–6 PM, closed Sunday, founded 2022, and the current Ghareeb logo. Town permit offices still list their own local numbers. Service-area provider references can point to the main business schema without repeating its full address.

## Phone performance

The CI measurement uses the median of three cold Chromium visits at 390 × 844, with 4× CPU slowdown and simulated 4G. JS numbers cover the first-party build served to the browser. [Measurement and budgets](../tools/e2e-site/measure.mjs)

| Page | LCP | CLS | First-party JS transferred | First-party JS decoded |
| --- | ---: | ---: | ---: | ---: |
| Home | 3.11 s | 0.0129 | 82.6 KiB | 265.6 KiB |
| Ballpark | 3.23 s | 0.0313 | 157.8 KiB | 535.2 KiB |

## Owner decisions

- Keep Careers applications on phone and email, or add an application form later.
- Decide whether Contact should require email when the homeowner chooses Call or Text. The requirement is unchanged.
- Decide whether to shorten the repeated footer slogan and the Toledo closing copy. No offer or pricing language was rewritten.
- Automatic customer email still depends on the website's provider configuration. The pass exercises both modes with a mocked EmailJS sender.

Playwright uses browser engines and emulated devices. The reduced viewport checks the space a keyboard would occupy. This pass did not exercise a physical iOS keyboard, production CMS overrides, live map imagery, inbox delivery, lender approval, or an actual phone or text handoff. All submissions and outside service calls were mocked. Nothing was deployed.
