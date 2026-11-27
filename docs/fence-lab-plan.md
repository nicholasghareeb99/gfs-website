# Fence Lab: quality plan

Written 2026-11-27 for Nick. This is the working plan for getting every Fence Lab tool
(ghareebfence.com/showroom, Lab tab) to the point where it is realistic, correct, and
makes one clear point about why a GFS fence is better, without overselling.

Any agent working on the Lab (Claude, Codex, Antigravity) should read this first.

## Ground rules

1. **One point per tool.** Each tool exists to make one point a customer can repeat.
2. **True size, real numbers.** Movement is drawn at true size wherever it can be seen at
   true size. Where it has to be drawn bigger, the screen says so in plain words.
3. **Every number has a source** in the tool's "The math" section, and a unit test.
4. **Compare like with like.** The other fence is a real, common way to build (store panel,
   concrete-set post), built to its own normal spec. It is never drawn broken on day one.
5. **Say what isn't drawn.** If something is left out (cupping, rust), the tool says so.
6. **No colliding parts.** Every 3D scene has a `check()` that must return no overlaps.
7. **GFS's real build.** Parts, sizes and hardware match what GFS installs. When the
   Executive App's model is wrong, fix the Lab's copy and list it for the app.
8. Customer copy is plain-spoken. No supplier names. No-dig claims are for clay soil; in
   sand GFS sets posts in concrete. Per-foot prices never reach the browser.

## The point each tool makes, and what still needs work

| Tool | The point | Honest basis | Still to do |
|---|---|---|---|
| No-dig vs dug | Driven steel is in the same day with no holes, spoil or concrete to cure | Install steps and volumes from the dig plan | Check spoil volume and bag count against a real 150 ft job; crew figures and tools look blocky |
| Frost & posts | A post set short of the frost line gets lifted; steel driven 4 ft doesn't | Frost depth by county, heave model in `build-plan.mjs` | Lift is drawn bigger than life and the screen says so. Better: draw it true size with a close-up at the ground, like the gate latch view |
| Our build vs prefab | More wood and steel in the same 8 ft, and it stays straight | Part counts and sizes from the models; ageing model | Ageing (grey, rot band, lean) needs a year-by-year source check; rot timing is the weakest claim |
| Gate sag | A gate drops at the latch because joints creep and posts lean; steel posts and a steel frame hold | Eurocode 5 joint creep, NDS nail values, beam bending | Hardware redrawn from a GFS gate photo. Open: hinge count on 6 ft gates, and which face the hardware mounts on |
| Grade Lab | We follow the ground, keep the top line clean and close the gaps | Geometry only | Real grass now hides small gaps a little, like a real yard: make sure the gap label still reads |
| Vinyl walls | Same-size post, thicker wall, steel inside: it bends far less | Beam math, ASCE 7 wind, PVC and steel properties | The big-box post is modelled as bare vinyl in concrete. Confirm that is what the common store kit is; if store kits use an insert, the comparison must change |
| Wind | Solid fences take the most push; that is why posts and depth matter | ASCE 7; flow from published wind-tunnel work | Smoke lines are an average flow: says so. Add a one-line "what this means for your fence" result |
| Wood movement | Boards shrink as they dry; board-on-board never opens up | Wood Handbook shrinkage | Wood grain texture looks drawn. Needs real board textures |
| Lifespan | What wears out first on each material, and what steel posts change | Published ranges | Nothing is aged, on purpose. Keep it that way unless there is data |

## Realism work (shared by every tool)

Done in this round (`lab3d.mjs`): clouds and sun glow in the sky, a tree line at the back of
the yard (bare and grey in the Frost tool), grass blades in the strip near the fence, softer
shadows, a lawn on the near side for views that look from behind the fence.

Next, in order of how much they change the picture:

1. **Real wood textures.** The app's procedural grain reads as drawn. Use photographed
   board textures (colour, normal, roughness) for treated pine and cedar, with per-board
   variation so no two pickets match. Needs CC0 or GFS's own photos.
2. **Real sky lighting.** Light the scene from a photographed sky (HDRI) so steel, vinyl
   and wet soil pick up real reflections.
3. **Contact shadows** where boards meet rails and the fence meets the ground.
4. **Soil cut face.** Layered topsoil, roots near the top, stones, a cleaner cut edge.
5. **People and tools** in No-dig vs dug are blocky. Either model them properly or remove them.
6. **Check on a real iPhone and iPad** for speed. The grass uses up to 46,000 tufts on an
   iPad and 26,000 on a phone; if it drops frames, lower the count.

## Hardware (from Nick, 2026-11-27)

- Wood gates hang on **butterfly hinges** and close on **post-mount latches**.
- Hardware is Nationwide Industries. The 8 in contemporary butterfly hinge takes one pair
  on gates 5 ft and under and three hinges on 6 ft and taller. The standard post latch has a
  receiver lag-screwed to the latch post and a spring lever on the face of the gate.
- References: `public/assets/img/work/pt-shadowbox-gate-detail.jpg` (hinges, handle, catch) and
  `public/images/gallery/cedar-gate-closeup.jpg` (latch, catch and pull handle close up).
- The Lab draws from those photos: the butterfly hinge (8 in tall at the outer corners, two
  diamond cut-outs per leaf); the latch (a 4.6 in flat bar on a small pivot plate near the
  gate's edge, and a 6.9 in strap catch with two square feet near the post's edge); and a
  10½ in arched pull handle with tapered ends beside the latch. Sizes are scaled off the
  photos against 5½ in pickets.
- **Open with Nick:** two or three hinges on a 6 ft single gate (the photo shows two; the
  maker says three), and which face the hardware goes on for a privacy gate (the Lab has it
  on the picket face; brochure page 13 shows it on the rail side).

## How to check work

- `npm test` : unit tests, including the math behind each tool.
- Each 3D scene exposes `check()`; a hook on the tool's body element (`__wind`, `__vinyl`,
  `__wood`, `__life`, `__gate`, `__grade`) lets a browser test call it. It must return `[]`.
- Look at every tool at 390×844 (iPhone), 820×1180 and 1180×820 (iPad) before sending
  anything for review.
- Never push to `main`. Open a pull request; Nick approves merges, which publish the site.

## Jobs that can be handed to another agent

Each is self-contained and has a clear finish line.

1. **Browser check script in the repo.** Add `tools/lab-check.mjs` (Playwright) that opens
   each Lab tool at the three screen sizes, calls its `check()`, fails on any overlap or
   page error, and saves a screenshot per tool. Wire it into the existing site check.
2. **Photographed wood textures.** Source CC0 treated-pine and cedar board textures (or
   use GFS's photos), build 1K colour/normal/roughness sets, and load them in `lab3d.mjs`
   in place of the procedural grain, with per-board offsets. Finish line: no visible
   repeat across a 32 ft run, and the Showroom still loads under 3 MB on first visit.
3. **Real-device speed pass.** On an iPhone and an iPad, record frames per second in each
   tool while dragging; tune grass count and shadow size until every tool holds 50+.
4. **Source audit.** For each row in the table above, re-derive the headline number from
   the cited source and report any mismatch. No code changes without a failing test first.
