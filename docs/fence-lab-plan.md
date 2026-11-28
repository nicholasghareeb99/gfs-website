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
| Gate sag | A gate drops at the latch because joints creep and posts lean; steel posts and a steel frame hold | Eurocode 5 joint creep, NDS nail values, beam bending | Hinges and post latch redrawn from the maker's drawing and photos; latch limits now come from the latch's own slot. Open: Nick to confirm the ¼ in and ⅝ in limits |
| Grade Lab | We follow the ground, keep the top line clean and close the gaps | Geometry only | Real grass now hides small gaps a little, like a real yard: make sure the gap label still reads |
| Vinyl walls | Same-size post, thicker wall, steel inside: it bends far less | Beam math, ASCE 7 wind, PVC and steel properties | The big-box post is modelled as bare vinyl in concrete. Confirm that is what the common store kit is; if store kits use an insert, the comparison must change |
| Wind | Solid fences take the most push; that is why posts and depth matter | ASCE 7; flow from published wind-tunnel work | Smoke lines are an average flow: says so. Add a one-line "what this means for your fence" result |
| Wood movement | Boards shrink as they dry; board-on-board never opens up | Wood Handbook shrinkage | Wood grain texture looks drawn. Needs real board textures |
| Lifespan | What wears out first on each material, and what steel posts change | Published ranges | Nothing is aged, on purpose. Keep it that way unless there is data |

## Realism work (shared by every tool)

Done in this round (`lab3d.mjs`): clouds and sun glow in the sky, a tree line at the back of
the yard (bare and grey in the Frost tool), grass blades in the strip near the fence, softer
shadows, a lawn on the near side for views that look from behind the fence.

Done in the definition round (2026-11-27, `lab3d.mjs`):

- **Fine picture at rest.** While something moves the picture is drawn at the screen's own
  pixels. A quarter second after it stops it is drawn once more, finer (every pixel on a
  phone, more than the screen's pixels on an iPad or laptop), capped at 4.5 million pixels.
  If a device ever drops the 3D picture while doing this, the fine pass turns itself off.
- **Sharper wood.** The app's own grain at twice the size (512 × 2048), swapped in about a
  third of a second after the first picture, and the sharpest texture filtering the device has.
- **Finer shadows** on screens 700 points wide and up (4096 map, the app's own top setting),
  and more sky light in the shade so shadows are deep but not black.
- **Smooth curved hardware** (`creased()`): the pull handle, hinge barrels and striker rod.
- **Trees that read as trees**: ragged leafy outlines, sunlit and shaded clumps, leaf dapple
  that keeps its size on screen at any distance.
- **Soil face** no longer shows the texture repeating as a grid.
- **Far ground** below the horizon is hazy green (or snow), not a dark band.
- **Lumber the right colour** (`trueToLumber()`): the app's models draw rails and gate frames
  dark brown and nail heads as black ⅜ in dots. In the Lab the rails take the pickets' colour
  and the nail heads are ¼ in and galvanized grey.

Done in the second definition round (2026-11-27):

- **Eased framing lumber** (`easedBox()`): 2×4s, 4×4s and 4×6s have their four long edges
  rounded about ¼ in, as milled. Cut ends stay square. Pickets and 1× boards are left
  square, as sawn.
- **Shadows start at the thing that casts them.** The shadow depth is now measured over just
  the slice of yard in view, with a fixed 1/10 in of slack. Before, a gate brace's shadow
  started most of an inch away from the brace.
- **Gate frame grain** runs along each piece: up the stiles and along the brace. It was
  running sideways on both (see "App model issues" below for why).
- **Bare winter trees** in Frost heave: twigs with sky between them, not grey leaf shapes.

Done in the third definition round (2026-11-28):

- **Soil cut face.** Fine pale grass roots hang from the sod into the topsoil, and a few
  round pebbles sit in the soil below. Both are drawn by the soil shader, so they cost
  nothing extra and stay sharp close up. Stones are sparse on purpose: this is Toledo clay,
  not gravel.
- **Auger, post driver and concrete bags** in No-dig vs dug are modelled as the real tools:
  a spiral flight with a worn bright edge, fishtail tip, gearbox, engine, fuel tank and a
  handle frame with rubber grips; a gas post driver with its barrel, engine and two handles;
  kraft paper bags printed "CONCRETE MIX, 80 LB" with sewn ends. No brand names.
- **Contact shade** (`contactShade()`): a soft darkening where two surfaces meet within about
  3½ in, such as pickets on rails, rails on posts, and posts at the ground. It is drawn only
  on the fine resting picture, never while something moves. Grass, trees and labels are
  left out of it.

Next, in order of how much they change the picture:

1. **Real wood textures.** The app's procedural grain reads as drawn. Use photographed
   board textures (colour, normal, roughness) for treated pine and cedar, with per-board
   variation so no two pickets match. Needs CC0 or GFS's own photos.
2. **Real sky lighting.** Light the scene from a photographed sky (HDRI) so steel, vinyl
   and wet soil pick up real reflections.
3. **Check on a real iPhone and iPad** for speed, now also with the fine picture, the
   bigger wood texture and the contact shade (about a one-second pause once per page on a
   phone). The grass uses up to 46,000 tufts on an iPad and 26,000 on a phone; if it drops
   frames, lower the count. If the contact shade is what slows it, set `AO_STRENGTH` to 0.
## Hardware (from Nick, 2026-11-27)

- Wood gates hang on **butterfly hinges** and close on **post-mount latches**. Both are
  Nationwide Industries parts.
- **Two hinges** on a 6 ft single gate (Nick). The maker's sheet says three on 6 ft and up;
  GFS fits two.
- **The hardware goes on the side the gate swings to**, so it depends on the job (Nick). The
  Lab shows a gate that swings to the picket side. The app's model has the same rule
  (`gSwing`).
- Sources for the shapes and sizes, all checked by eye against the product itself:
  - Butterfly hinge NW38943: the maker's two tape-measure photos. About 5¼ in wide open and
    7 in tall at the outer corners, a 5 in barrel, two kite cut-outs and three lag holes per leaf.
  - Standard post latch NW38308: the maker's dimensioned drawing (`NW38308Q-specs.pdf`), its
    instructions and product photos. The receiver (5.47 in tall, 2.72 in flanges, 4.53 in
    front plate, with the arm turning between the two) is lagged to the side of the latch post that faces the gate, so it sits **in the
    gap** with its arm square to the fence. The arm is 10.63 in long: the hooked end stands
    out on the swing side, the tail comes out the other side so the gate opens from both. The
    striker rod (0.71 in round, 6.42 in long, pressed flat with two square holes) is lagged to
    the gate's face and reaches across the gap into the hook. A spring holds the hook down.
  - Pull handle: `public/assets/img/work/pt-shadowbox-gate-detail.jpg`, where the rod passes
    under the handle. In that photo the latch is seen edge-on between the two leaves.
- **How much sag the latch takes** now comes from the latch itself instead of a guessed ¾ in:
  the 0.71 in rod comes into the receiver over a lip about 0.6 in below the middle of the
  hook, so the rod can be about ¼ in low and still go straight in. Lower than that it has to
  ride up over the lip (latches with a push, needs adjusting). Once the rod's centre is below
  the lip, 0.6 in low, it won't latch. The lip's height is scaled off the maker's drawing,
  which doesn't dimension it: good to about 1/16 in.
  Nick confirmed about ¼ in as the point a gate needs a fix. The ⅝ in "won't latch" point
  still rests on the drawing alone.
- Still to draw better: the receiver's back side and the spring are simple; the lag heads are
  plain hex.

## App model issues found from the Lab (for the Executive App)

- **Wood grain direction on gate frames.** The app's wood material reads each part's box
  (`boxHook` in `real-surfaces.mjs`) to run the grain along the part's longest side, and asks
  for the new box to be sent to the graphics card with `material.uniformsNeedUpdate`. In
  three.js r160 that flag is only honoured for `ShaderMaterial`. So when parts that share one
  material are drawn one after another (a gate's rails, stiles and brace), they all get the
  first part's grain direction. Fix in the app: give such parts their own material, or pass
  the box per object another way (per-instance attribute, or `onBeforeRender` writing to the
  program's uniforms directly). The Lab works around it with `woodLike()`.
- **Diagonal braces** get their grain along the longest side of an upright box, not along
  the brace. Build the brace lying flat and turn the mesh.
- Rails and gate frames a different colour from the pickets; black ⅜ in nail heads; sharp
  edges on framing lumber; single-wing hinge and box latch on wood gates; three hinges where
  GFS fits two.

## Settled with Nick

- **Rails and gate frames** are the pickets' colour, a little darker (`RAIL_TONE` in
  `lab3d.mjs`, 2026-11-27).
- **A gate needs a fix once it has sagged about ¼ in** (Nick wrote "1-4 in", read as ¼ in,
  2026-11-27; check with him if he meant 1 to 4 in). That matches the latch: the rod has about
  ¼ in of room before it has to ride up over the lip. Past that the tool says the gate needs
  adjusting.

- **Line posts** are 2½ in nominal, 2.375 in actual (2026-11-27). The Lab and the app's models
  already draw 2.375 in, and the customer copy says "2⅜ in across". The brochure calls the same
  post 2½ in. Both are right; nothing to change.

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
