# 3D style sweep, 2026-11-15

> **Scope correction, 15 Nov (after independent QA).** The "Exec" column in this sweep was rendered from the Executive App repo's ROOT `fence3d.html`, which is stale source. The deployed Executive viewer is built from the patch chain and differs. Read the comparison below with these corrections, and re-run the sweep against the release build before assigning fixes:
>
> - **Wood lattice-top gates.** The deployed Executive viewer already draws the gate lattice (five gate-topper parts: lattice plus four frame parts). The website viewer does not. This is a WEBSITE gap. Port the built Executive implementation into the website's persistent source; do not write a second one. Add run/gate parity tests on the release build, with double-gate, open-gate and saved-override cases.
> - **Four spaced-picket styles** (PT/CEDAR spaced picket 4'; 3'/4' wood spaced picket; 6' spaced 4in/w pickets P/T; 6' spaced cedar 4in picket). The two DEPLOYED viewers already match: 48 pickets on 24 ft, 4 in boards, about 2 in gaps. The difference in this doc is root-versus-built drift, not a live defect. Do not change the website's spacing from the table below.
> - Capped shadowbox / cap-and-trim and vinyl shadowbox gate differences were also measured against the root file and need re-checking on the release build.
>
> These measurements show visual parity between viewers. They are not verified construction dimensions.

Read-only survey of all 249 catalog styles in two viewers: the Executive App
viewer (this worktree, `fence3d.html` plus `gfs/`) and the public website
viewer (`gfs-website` at `origin/main` 482cac1, `public/fence3d.html` plus
`public/gfs/`). Nothing was fixed, pushed or deployed. Output lives in
`/home/claude/work/sweep/` (not committed): `exec/`, `site/` (one PNG per style),
`sheets/` (side-by-side sheets), `phone/` (phone and iPad shots),
`render.py`, `entry.py`, `results.jsonl` files, `summary.json`.

## Method and limits

- Style list: `catalogNames` from `gfs/studio-catalog.mjs` (249). The website's
  own list comes from Firestore at runtime and could not be reached. Its
  bundled `studio-catalog.mjs` is byte-identical to this one.
- Same spec in both viewers, 1280x800, headless Chrome with SwiftShader
  (software WebGL): 24 ft run along x plus a 10 ft return along z, one 4 ft gate
  at x=2, height parsed from the name (else 6), `ov:{}`. Each page was waited on
  until the fence group existed, then 2.5 s, then a screenshot and a scene
  measurement (mesh count, triangle count, bounding box, resolved `mode`).
- The built-in models only. No live saved overrides (Firestore) were applied in
  the main sweep. That matters: the website's `studio-catalog.mjs` carries 27
  built-in override entries (19 match catalog names) and both the ballpark
  dialog and the studio page apply them. A second, smaller pass (19 styles,
  `sheets/studio01-04.jpg`) used the website's own `buildPreviewSpec` output.
- Executive viewer was served from the worktree root. The release scripts named
  in the brief do not exist here (`scripts/build-release.mjs` is missing;
  `build:executive` and `build-executive-release.mjs` build a copy of the live
  static layer instead of the worktree), so the worktree's `fence3d.html` and
  `gfs/` were served directly. That includes the unmerged gate fix.
- Software rendering has no real GPU shading. Soft light, white fences reading
  blue-grey, aliasing, and shadows were not counted as defects. Load times
  below were taken on a shared two-core machine under load and are relative only.
- Ballpark and studio checks ran offline (Firebase and Google scripts blocked),
  so the ballpark dialog was opened by calling `GFSFence3D.open` with a stubbed
  style list, not through the price-gated button.
- Not measured: gate opening width, post spacing, anything needing live data,
  real device behaviour (touch, iOS Safari, GPU memory).

## Totals

| | Executive | Website |
|---|---|---|
| Rendered with fence parts (after one retry for tool timeouts) | 249 / 249 | 249 / 249 |
| Blank | 0 | 0 |
| Viewer error overlay or run error | 0 | 0 |
| Console errors | 0 | 1 per cold load: `GET /favicon.ico` 404 (4 of 249 logged it; Chrome only asks once per session) |
| Resolved family differs between viewers | 0 of 249 | |
| Part count differs | 17 of 249 | |

Resolved families (identical in both): solid 94, picket 58, spaced 42,
shadowbox 20, chain 10, ranch 10, bob 6, split 5, alu 4.

Styles with an issue I could see (either viewer): roughly 40 of 249, plus the 54 `Adobe` styles for colour; listed below. These are counts of what I noticed on the sheets, not an exhaustive audit.
Styles that differ between viewers: 17 by part count plus 1 by colour/profile.
All the rest are visually the same.

## Exec vs website differences (same spec)

The brief expected the website to be missing fixes. For the 249 styles with the
same spec it is mostly identical, and where they differ the website is ahead
or the two disagree about a model, not behind.

| Styles | Executive | Website | Sheet |
|---|---|---|---|
| `6' P/T Capped Shadowbox`, `6' Cedar Capped Shadowbox` | no cap drawn (top height 6.00 ft) | cap drawn (6.13 ft). Matches the name. | sheet05 |
| `Cedar Board on Board cap and trim`, `6' P/t cap and trim board on board` | no cap or trim | cap drawn | sheet47, sheet49 |
| Vinyl `Shadowbox - Adobe/Tan/White 4/5/6ft` (9 styles) | gate leaf is a solid privacy board (66 meshes) | gate leaf has the same pickets as the fence (54 meshes). Matches the fence. | sheet35, sheet36 |
| `PT/CEDAR spaced picket 4'`, `3'/4' wood spaced picket`, `6' spaced 4in/w pickets P/T`, `6' spaced cedar 4in picket` | 117 or 127 meshes | 110 or 120: fewer, wider-spaced pickets (site has `fixedSpacedPicketLayout`). Mean pixel difference 12 to 20 of 255, the largest of any style. I could not tell which spacing is right. | sheet01, 45, 49 |
| `4.5' 4 Board Ranch Rail` | same part count | rails look thicker and greyer (site has a ranch model contract) | sheet46 |

Code-level differences (static comparison, not all visible in this sweep):

- Executive-only: `portal-viewer-mode.mjs`; `buildWoodFacing` (mirrors a wood fence
  with an explicitly reversed finished side); `fence-engine.mjs`, `model-profiles.mjs`,
  `viewer-model-contract.js`, `viewer-workspace.mjs` differ in size from the site copies.
- Website-only: `audited-model-corrections.mjs`, `ranch-model-contract.mjs`,
  `owner-model-corrections.mjs`, `website-model.mjs`, `website-scene.mjs`,
  and a lattice-top rail offset and the `cap and trim` check moved ahead of the
  shadowbox branch (this last one explains the missing caps in the Executive viewer).
- Both viewers ship the same `three.module.js`, `studio-rendering.mjs`,
  `gate-review.js`, `chain-link-controls.js`, `fence-layers.mjs`.
- With website flags (`embed=1&website=1&studio=1`) the sky, ground and light are
  different from the Executive viewer: wood looks lighter and yellower, white
  looks whiter (`sheets/studio01-04.jpg`). This is a deliberate website look, but the
  same style does not look the same colour in the office tool and on the website.

## Per-family issues

"Both" means both viewers show it. Sheet numbers are in catalog order, 5 styles a sheet
(`sheets/sheetNN.jpg`, left Executive, right website).

### Wood and cedar (catalog #001 to #025, #222 to #248)

- Both: `Lattice Top`, `Full Cedar Shadowbox Lattice Top 6ft`, `Pressure Treated Lattice
  Top shadowbox`: the gate section has no lattice, while the fence runs on either side do.
  (Vinyl lattice-top gates do have it.) sheet03, 46, 48.
- Both: `4' Cedar shadowbox with trim`, `6' cedar shadowbox with trim`: no trim visible.
  sheet47, 48.
- Both: `cedar horizontal`, `6' p/t Cedar-tone horizontal fence`: the gate leaf is drawn
  with vertical dog-ear pickets next to horizontal boards. sheet49.
- Both: `3'/4' wood spaced picket` renders at 3 ft only; the name offers two heights. sheet45.
- Executive only: the four capped/cap-and-trim styles above lack the cap.
- Studio pass (built-in overrides, both viewers): `Rockport - White 4ft` has
  `boardIn:0.75` in `catalogSpecs` and draws as thin horizontal lines instead of vertical
  boards; `Rockport-Midrail - Tan 7ft` has `horiz:true` and draws as horizontal boards
  although the same style in the main sweep (no overrides) is a vertical privacy panel.
  Evidence: `sheets/studio03.jpg`, `studio04.jpg`; entries in `gfs/studio-catalog.mjs`.

### Vinyl (catalog #026 to #212, #249; about 187 styles)

- Both: `Adobe` (54 styles) renders as a cool grey, close to the grey of the other
  neutrals and hard to tell from `Tan`, which is olive-beige. Adobe should read warmer.
  Example sheet06, sheet08, sheet12 (HW).
- Both: `Kingston - White/tan 6ft` renders all one tan. No two-tone. sheet17.
- Both, possible: `Rockport- white post/rail tan picket`: posts and rails white,
  panel tan, but the gate leaf is entirely white. sheet28.
- Both: `Midland Ranch` 3/4-rail runs have a gate with only two rails; white ranch
  (`White 3ft/4ft/5ft`) is very low contrast against the ground. sheet23 to 25.
- Both: `HW ... Mocha Walnut` shows no wood grain at sweep size, while
  `Rockport Privacy - Aspen Latte/Chai Gray` does. sheet12 to 14, 29, 30.
- Executive only: vinyl `Shadowbox` gates (see table).
- White vinyl is low contrast against the pale ground in every `White` style (56). Treat as lighting, not a model fault.

### Chain link (#015 to #018, #213 to #218) and aluminum (#219 to #221, #247)

- No model issue seen. Posts, mesh, gate and returns match between viewers.
- Both: `5' Bronze ornamental aluminum` renders near-black (colour `#3a2e26`); it
  reads as black, not bronze. sheet50.
- Studio detail view: chain-link mesh is almost invisible against the sky and the
  `Full layout` view is a thin line (see phone section). `sheets/phone-studio-misc.jpg`.

### Split rail and ranch (#223 to #227, #246, vinyl ranch #113 to #121)

- Both: plain `split rail` (no height in the name) renders 3.9 ft tall. Probably intended; flag only because the other split-rail names carry a height.
- Both: no missing parts. Rail ends, mesh and gate bracing present. sheet45, 46, 50.

### Framing, UI overlap, ground

- No ground or dirt artefacts, clipping, or missing posts seen in any of the 249.
- At 1280x800 the top-right controls card never covers the fence. 7 ft and 8 ft
  fences (`Rockport-Midrail 7ft/8ft`, `8' P/t dog ear privacy`, `8' Tounge and
  groove`) fill the view and the front-left post foot touches the bottom sheet.
- Heights match the name (bounding box top is the name height, plus 0.5 to 0.6 ft of
  post cap on vinyl, plus 0.25 to 0.9 ft of top rail/post on chain, alum and split).

## Website entry points

How the website shows 3D:

1. Ballpark result: `fence-3d.js` imports `website-viewer.mjs`, which opens a `<dialog>`
   with an iframe on `/fence3d.html?embed=1&website=1#<spec>`. Two tabs: Panel detail
   (one section) and Full layout (the requested length). The spec comes from
   `buildPreviewSpec`, which applies the built-in `catalogSpecs`.
2. `/fence-studio/`: the same viewer with `&studio=1` in an inline frame, launched by a
   button, with a style picker.
3. `/fences/*` pages: `fence3d-embed.js` mounts `?embed=1` cards from a stored geometry.

Findings (390x844 and 820x1180; `phone/`, `sheets/phone-compare.jpg`, `phone-dialog.jpg`,
`phone-studio-misc.jpg`):

- Ballpark dialog on a phone: the viewer's controls card (`.ws-viewer-controls`) is
  376x503 px in a 615 px tall frame, so it covers most of the fence. The fence is
  faintly visible behind it. The same page at 390 wide without the `website=1`
  flag has a 189 px card. In the website frame the card height grows with the
  viewport (503 at 615, 588 at 700, 648 at 760 px); the Executive viewer with `embed=1` stays at 189 px.
  `phone/dialog-phone-kingston-12s.png`. Cause not isolated: look at
  `public/gfs/viewer-workspace.css` and `website-scene.mjs`.
- Ballpark dialog on iPad: the card (686x135) covers the top of a 6 ft panel. The
  fence is visible, so usable. `phone/dialog-ipad-wellington.png`.
- The dialog chrome (96 px header, 65 px toolbar, 68 px footer) leaves 615 of 844 px for the
  model on a phone.
- Full layout on a phone and in the studio: a 50 ft run is a thin strip a few pixels
  tall; chain link is a hairline. Nothing says what to do (zoom, rotate). I did not see the
  viewer's own hint text in these frames.
- Panel detail is labelled `8 ft` in the top-left badge for 4 ft to 6 ft fences
  (it is the section width, not height), next to the style name "6 ft". Customers can read it as an 8 ft fence.
- Studio page on a phone: the site's floating "Privacy choices" chip and the sticky
  Call / Get Free Estimate bar overlap the viewer's "Lighting & quality" button.
  The ballpark page shows a half-screen privacy dialog on first visit that
  has to be dismissed before the 3D button is reachable.
- No horizontal overflow: `scrollWidth` equals the viewport on the ballpark page, the studio page, the dialog and the viewer at both sizes.
- Small tap targets inside the viewer: a style `<select>` 88x36 on phone; two
  buttons 121x38 and 89x38 on iPad (below the usual 44 px).
- Time to first frame in the dialog (software GL, shared CPU, so relative):
  about 6 s on the phone viewport, 14 to 16 s at 820x1180. The 3D view is a
  grey spinner until then.
- Download for one view, cold cache, uncompressed (the local server does not
  gzip): 1.59 MB over 15 files, of which `three.module.js` is 1.27 MB; about 360 KB
  if gzipped (estimated with zlib level 6). No texture files: materials are
  generated in the browser. The Executive viewer is the same size (1.59 MB).
- `favicon.ico` 404 on every cold load of the website viewer.

## Prioritised improvements for the website 3D viewer

Correctness first.

1. Fix the built-in overrides that change the look: `Rockport - White 4ft`
   (`boardIn:0.75`) and `Rockport-Midrail - Tan 7ft` (`horiz:true`) draw horizontal
   boards. Evidence: `studio03/04.jpg` against sheet27/33. Review the other 25 entries in
   `catalogSpecs` the same way. This is what customers see in the studio and ballpark.
2. Decide the colours for `Adobe` (54 styles) and `Kingston - White/tan`, and the
   dark `Bronze` aluminum, against the real products. Adobe is currently the
   wrong temperature.
3. Wood gate leaves: add lattice to the gate on lattice-top styles; make
   horizontal-fence gates match the fence; show trim on the `with trim` shadowboxes.
4. Send the `Shadowbox` vinyl gate and capped-shadowbox/cap-and-trim fixes the other
   way: they are right on the website and wrong in the Executive viewer.
5. Settle the spaced-picket spacing between the two viewers (4 styles).

Phone usability.

6. Fix the controls card in the ballpark dialog (a 503 px card over a 615 px frame).
   Collapse it by default in `embed` and show only the view buttons.
7. Make Full layout readable on a phone: frame the fence to fill the width, fit a
   long run by starting closer, add a one-line hint.
8. Raise small targets to 44 px; stop the Privacy chip and sticky Call bar
   covering the viewer on the studio page; give the dialog more height on phones
   (smaller header and footer, or full-screen).

Load time.

9. Serve `three.module.js` (1.27 MB) minified and compressed (about 258 KB with
   gzip), and start loading it when the ballpark result appears rather than when
   the dialog opens. Add a favicon route.
10. Show a still image of the chosen style while the model builds (the first frame
    takes 6 s or more on software GL, longer on a slow phone).

Controls and clarity.

11. Rename the `8 ft` badge in Panel detail ("one 8 ft section") and show the
    fence height next to it.
12. Say what the customer is looking at: the dialog shows one panel or one
    straight run of the requested length, labelled as illustrative; the label
    does not say so in the frame itself.
13. Keep the website and office looks consistent or say they differ, so the
    same style does not look a different colour on the website and in a quote.
14. Keep the website viewer on the sync path: files differ in `fence-engine.mjs`,
    `model-profiles.mjs`, `viewer-model-contract.js`, `viewer-workspace.mjs`
    and `fence3d.html`; the fixes that are website-only (items above) need to
    flow back into the app, and `buildWoodFacing`/portal mode into the site.
