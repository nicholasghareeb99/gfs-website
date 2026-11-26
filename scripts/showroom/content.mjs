// GFS Showroom — hand-written content: style tiles and local fence rules.
// Everything here is customer-facing. Keep it plain-spoken and only state
// facts that are in the brochure, the supplier CAD sheets, or the verified
// rules research. No prices ever go in this file.
//
// photoTags: [material, tag] pairs from the website photo archive
// (data-photo-tag on /fences/<material>/ pages, or categoryLabel in
// site-photo-library.json). models: exact 3D style names from settings/public;
// the first one is the default model for the tile.

const WOOD_POSTS = [
  ['Posts in clay', '8 ft galvanized steel, 2⅜" OD, driven 4 ft. No concrete'],
  ['Posts in sand', 'PT wood set in concrete (steel in concrete as an upgrade)'],
  ['Gate posts', '3" steel'],
  ['Built', 'Board by board on site, following the ground'],
  ['Nails', 'Galvanized: 3" on the frame, 1¾" coil on pickets'],
  ['Warranty', '3-year written workmanship']
];
const LUMBER = ['Pressure-treated pine', 'Western Red Cedar', 'Northern White Cedar'];
const HOMELAND = [
  ['Brand', 'Homeland vinyl, made in the USA'],
  ['Posts', '5" × 5", .150" wall'],
  ['Pickets', '.050" wall'],
  ['Sections', '8 ft. Rails pass through the posts, so the fence follows the ground'],
  ['Gates', 'Aluminum inside the gate frame'],
  ['Warranty', 'Homeland limited lifetime + our 3-year workmanship']
];
const ELITE = [
  ['Brand', 'Elite aluminum, made in Michigan'],
  ['Posts', '2" aluminum'],
  ['Finish', 'Factory powder coat, 7 colors'],
  ['On slopes', 'Panels rack with the ground. Not stepped'],
  ['Warranty', 'Elite lifetime (covers peeling and cracking) + our 3-year workmanship']
];
const SPLIT = [
  ['Posts', 'Mortised. No nails hold the rails in'],
  ['Sections', '10 ft'],
  ['Pet wire', '2" × 4" welded wire, stapled to the flat side of the rails (inside the yard)'],
  ['Warranty', '3-year written workmanship']
];
const CHAIN = [
  ['Top rail', 'Standard'],
  ['Bottom', 'Tension wire if you want it'],
  ['Line posts', 'Set to the ASTM F567 footing schedule'],
  ['Warranty', '3-year written workmanship']
];

export const FAMILIES = [
  { id: 'wood', name: 'Wood & Cedar', short: 'Wood', line: 'Western Red Cedar as standard, Northern White Cedar as the premium, and pressure-treated pine. Built board by board in your yard.', pages: [7, 28], tone: '#C98A4B' },
  { id: 'vinyl', name: 'Vinyl', short: 'Vinyl', line: 'Homeland vinyl, made in the USA. No painting or staining.', pages: [29, 48], tone: '#E9EEF2' },
  { id: 'aluminum', name: 'Aluminum', short: 'Aluminum', line: 'Elite ornamental aluminum, made in Michigan. Six styles, seven colors.', pages: [49, 62], tone: '#2B2F36' },
  { id: 'split-rail', name: 'Split Rail', short: 'Split rail', line: 'Northern White Cedar or pressure-treated, both mortised. Pet wire if you need it.', pages: [63, 70], tone: '#B79A6B' },
  { id: 'chainlink', name: 'Chain Link', short: 'Chain link', line: 'Galvanized or black vinyl-coated. The budget option, built right.', pages: [71, 78], tone: '#9AA5B1' }
];

export const STYLES = [
  // ── Wood & cedar ───────────────────────────────────────────────
  { id: 'wood-dogear', family: 'wood', name: 'Dog-Ear Privacy', line: 'The classic backyard privacy fence, built one board at a time.',
    privacy: '90–95%', heights: [4, 6, 7, 8], options: LUMBER, specs: [['Pickets', '1×6 (¾" × 5½" actual). True 1" × 6" on request'], ...WOOD_POSTS],
    models: ['Standard Privacy 6ft (PT)', 'Standard Privacy 4ft (PT)', '7’P/T dog ear privacy', '8’P/t dog ear privacy', 'Cedar Privacy 6ft (PT/Cedar)', 'Full Cedar Privacy 6ft', "6'No-Dig P/t Dog Ear Privacy", "6' No-dig Cedar dog ear privacy", 'Cedartone prestained Dog Ear privacy'],
    photoTags: [['wood', 'Privacy'], ['cedar', 'Privacy'], ['wood', 'Rail-side view'], ['wood', 'Height transition'], ['library', 'Wood privacy']], pages: [14, 15, 18, 22], keywords: 'privacy dog ear dogear standard pine cedar no-dig king plus' },
  { id: 'wood-bob', family: 'wood', name: 'Board-on-Board', line: 'Boards overlap, so no gaps open up as the wood dries. Finished on both sides.',
    privacy: '100%', heights: [4, 6], options: LUMBER, specs: [['Look', 'Solid and layered, same on both sides'], ...WOOD_POSTS],
    models: ['Board on Board 6ft (PT)', 'Board on Board 4ft (PT)', 'Board on Board 6ft (PT/Cedar)', 'Full Cedar Board on Board 6ft'],
    photoTags: [['wood', 'Board-on-board'], ['library', 'Board-on-board']], pages: [14, 15, 18], keywords: 'board on board bob overlap privacy' },
  { id: 'wood-shadowbox', family: 'wood', name: 'Shadowbox', line: 'Boards alternate sides of the rail. Your neighbor sees the same fence you do.',
    privacy: '70–85%', heights: [4, 6], options: LUMBER, specs: [['Airflow', 'Good. Easier on the fence in wind'], ['Pickets', 'Never cut: they sit beside the post'], ...WOOD_POSTS],
    models: ['Shadowbox 6ft (PT)', 'Shadowbox 4ft (PT)', 'Shadowbox 6ft (PT/Cedar)', 'Full Cedar Shadowbox 6ft', 'Cedar shadowbox', "6' cedar shadowbox with trim", "4' Cedar shadowbox with trim"],
    photoTags: [['wood', 'Shadowbox'], ['wood', 'Shadowbox gate'], ['library', 'Shadowbox'], ['library', 'Shadowbox gate']], pages: [15, 19], keywords: 'shadowbox shadow box alternating good neighbor both sides' },
  { id: 'wood-captrim', family: 'wood', name: 'Cap & Trim', line: 'A cap board and trim across the top for a finished look.',
    privacy: '100%', heights: [6], options: LUMBER, specs: WOOD_POSTS,
    models: ["6' Cedar Cap and trim", "6' P/t cap and trim board on board", 'Cedar Board on Board cap and trim', "6' P/T Capped Shadowbox", "6' Cedar Capped Shadowbox"],
    photoTags: [['cedar', 'Capped privacy'], ['library', 'Capped privacy']], pages: [19], keywords: 'cap trim capped top board finished' },
  { id: 'wood-lattice', family: 'wood', name: 'Lattice Top', line: 'Privacy boards with a 12-inch lattice band on top.',
    privacy: 'About 75%', heights: [6], options: LUMBER, specs: [['Lattice band', '12"'], ...WOOD_POSTS],
    models: ['Full Cedar Shadowbox Lattice Top 6ft', 'Lattice Top', 'Pressure Treated Lattice Top shadowbox'],
    photoTags: [['cedar', 'Lattice top'], ['library', 'Lattice top']], pages: [12, 20], keywords: 'lattice top trellis decorative' },
  { id: 'wood-semi', family: 'wood', name: 'Semi-Privacy', line: 'Spaced boards that block most of the view and let air through.',
    privacy: 'Partial', heights: [6], options: LUMBER, specs: [['Spacing', '4" or 6" pickets, or mixed'], ...WOOD_POSTS],
    models: ["6' Cedar Semi Privacy 4in /6in pickets", "6' Cedar Semi Privacy 6in pickets", "6' Cedar semi privacy 2 rail", "6' spaced 4in/w pickets P/T", "6' spaced cedar 4in picket"],
    photoTags: [], pages: [20], keywords: 'semi privacy spaced gap airflow' },
  { id: 'wood-horizontal', family: 'wood', name: 'Horizontal', line: 'Boards run sideways for a modern look.',
    privacy: 'Full or spaced', heights: [6], options: ['Cedar', 'Cedar-tone PT', 'Slipfence (aluminum posts)'], specs: [['Slipfence posts', '76" aluminum posts for a 6 ft fence'], ...WOOD_POSTS.slice(0, 3), WOOD_POSTS[5]],
    models: ['cedar horizontal', "6' p/t Cedar-tone horizontal fence", 'slip fence'],
    photoTags: [], pages: [21], keywords: 'horizontal modern slip fence slipfence sideways' },
  { id: 'wood-picket', family: 'wood', name: 'Wood Picket', line: 'A 3 to 4 ft picket fence for the front yard. Spaced, tight or scallop-cut.',
    privacy: 'Open', heights: [3, 4], options: LUMBER, specs: WOOD_POSTS,
    models: ["3'/4' wood spaced picket", "PT/CEDAR spaced picket 4'", "4' Cedar Tight spaced picket", "4'scallop cut privacy fence P/t"],
    photoTags: [['cedar', 'Picket'], ['wood', 'Shaped top'], ['cedar', 'Shaped top'], ['library', 'Picket'], ['library', 'Shaped top']], pages: [21, 22], keywords: 'picket front yard scallop scalloped spaced' },
  { id: 'wood-ranch', family: 'wood', name: 'Ranch Rail', line: 'Boards face out. Black welded wire goes on the inside if you have a dog.',
    privacy: 'Open', heights: [4.5], options: LUMBER, specs: [['Boards', '4-board'], ['Wire', 'Black welded wire on the inside (optional)'], ...WOOD_POSTS.slice(0, 3), WOOD_POSTS[5]],
    models: ['4.5\' 4 Board Ranch Rail'],
    photoTags: [['library', 'Ranch rail + mesh']], pages: [17, 21], keywords: 'ranch rail board horse farm wire dog' },
  { id: 'wood-tng', family: 'wood', name: 'Tongue & Groove 8 ft', line: 'Tall boards that lock together. No see-through.',
    privacy: '100%', heights: [8], options: ['Pressure-treated pine', 'Cedar'], specs: WOOD_POSTS,
    models: ["8' Tounge and groove wood fence"],
    photoTags: [], pages: [21], keywords: 'tongue groove 8 ft tall solid' },
  { id: 'wood-steelgate', family: 'wood', name: 'Steel-Frame Gate', line: 'A welded steel frame inside a wood gate, so it holds square and doesn’t sag.',
    privacy: 'Matches the fence', heights: [], options: ['Walk gates', 'Double drive gates'], specs: [['Frame', '1½" square steel tube'], ['Joints', '100% welded'], ['Finish', 'Rust-preventive primer'], ['Size', 'Built to your opening'], ['Best for', 'Gates 5 ft and wider, drive gates, gates used every day']],
    models: [],
    photoTags: [['wood', 'Double gate'], ['wood', 'Privacy gate'], ['cedar', 'Privacy gate'], ['cedar', 'Gate detail'], ['cedar', 'Double gate'], ['library', 'Double gate'], ['library', 'Driveway gate']], pages: [23], keywords: 'gate steel frame sag drive double welded' },

  // ── Vinyl ──────────────────────────────────────────────────────
  { id: 'vinyl-kingston', family: 'vinyl', name: 'Kingston Privacy', line: 'Solid tongue-and-groove privacy panels.',
    privacy: '100%', heights: [4, 5, 6], colors: ['White', 'Tan', 'Adobe', 'White/Tan'], specs: [['Panel height', '46" · 58" · 70" (4, 5, 6 ft)'], ...HOMELAND],
    models: ['Kingston - White 6ft', 'Kingston - Tan 6ft', 'Kingston - Adobe 6ft', 'Kingston - White/tan 6ft', 'Kingston - White 5ft', 'Kingston - White 4ft'],
    photoTags: [['vinyl', 'White privacy'], ['vinyl', 'Tan privacy'], ['vinyl', 'Two-tone privacy'], ['vinyl', 'Privacy gate'], ['library', 'White privacy'], ['library', 'Tan privacy']], pages: [31, 36], keywords: 'kingston privacy solid vinyl white tan adobe' },
  { id: 'vinyl-toppers', family: 'vinyl', name: 'Privacy with a Topper', line: 'Lattice, spindle or picket band on top. Same 70-inch finish height.',
    privacy: 'About 80%', heights: [4, 5, 6], colors: ['White', 'Tan', 'Adobe'], options: ['Lattice', 'Hartford', 'Bedford', 'Concave', 'Traditional', 'Victorian', 'Windsor'], specs: [['Finish height', '70" with or without a topper'], ...HOMELAND],
    models: ['Kingston-Lattice Top - White 6ft', 'Kingston-Hartford Top - White 6ft', 'Kingston-Bedford Top - White 6ft', 'Kingston-Concave Top - White 6ft', 'Kingston-Traditional Top - White 6ft', 'Kingston-Victorian Top - White 6ft', 'Kingston-Windsor Top - White 6ft', 'Kingston-Lattice Top - Tan 6ft', 'Rockport-Lattice Top - White 6ft'],
    photoTags: [['vinyl', 'Lattice top']], pages: [37, 38], keywords: 'topper lattice spindle hartford bedford concave victorian windsor traditional' },
  { id: 'vinyl-rockport', family: 'vinyl', name: 'Rockport Privacy', line: 'Privacy panels, plus 7 and 8 ft Midrail for the tallest builds.',
    privacy: '100%', heights: [4, 5, 6, 7, 8], colors: ['White', 'Tan', 'Adobe'], specs: [['Midrail', '7 and 8 ft'], ...HOMELAND],
    models: ['Rockport - White 6ft', 'Rockport - Tan 6ft', 'Rockport - Adobe 6ft', 'Rockport-Midrail - White 8ft', 'Rockport-Midrail - White 7ft', 'Rockport- white post/rail tan picket'],
    photoTags: [['vinyl', 'White privacy'], ['vinyl', 'Following grade']], pages: [34, 36], keywords: 'rockport midrail tall 7 8 privacy' },
  { id: 'vinyl-woodgrain', family: 'vinyl', name: 'Homewood Woodgrain', line: 'The look of stained wood with the upkeep of vinyl.',
    privacy: '100%', heights: [4, 5, 6], colors: ['Aspen Latte', 'Chai Gray', 'Dark Gray', 'Mocha Walnut'], specs: HOMELAND,
    models: ['Rockport Privacy - Mocha Walnut 6ft', 'Rockport Privacy - Chai Gray 6ft', 'Rockport Privacy - Aspen Latte 6ft', 'Rockport Privacy - Dark Gray 6ft', 'HW Rockport-Hartford Top - Mocha Walnut 6ft', 'HW Rockport-Bedford Top - Mocha Walnut 6ft'],
    photoTags: [['vinyl', 'Woodgrain privacy'], ['vinyl', 'Gray privacy']], pages: [37], keywords: 'woodgrain homewood mocha walnut chai gray aspen latte wood look' },
  { id: 'vinyl-semi', family: 'vinyl', name: 'Wellington & Montgomery', line: 'Semi-privacy. Blocks most of the view without catching every gust.',
    privacy: 'Partial', heights: [4, 5, 6], colors: ['White', 'Tan', 'Adobe'], specs: HOMELAND,
    models: ['Wellington - White 6ft', 'Montgomery - White 6ft', 'Wellington-Lattice Top - White 6ft', 'Wellington-Hartford Top - White 6ft', 'Wellington-Windsor Top - White 6ft', 'Wellington - Tan 6ft'],
    photoTags: [], pages: [39], keywords: 'semi privacy wellington montgomery spaced' },
  { id: 'vinyl-shadowbox', family: 'vinyl', name: 'Shadowbox & Whitney', line: 'Same on both sides. Your neighbor sees the same fence you do.',
    privacy: 'Partial', heights: [4, 5, 6], colors: ['White', 'Tan', 'Adobe'], specs: HOMELAND,
    models: ['Shadowbox - White 6ft', 'Whitney - White 6ft', 'Shadowbox - Tan 6ft', 'Whitney - Tan 6ft'],
    photoTags: [], pages: [40], keywords: 'shadowbox whitney both sides vinyl' },
  { id: 'vinyl-windsor', family: 'vinyl', name: 'Windsor', line: 'Homeland Windsor in white, tan or adobe.',
    privacy: 'Partial', heights: [4, 5, 6], colors: ['White', 'Tan', 'Adobe'], specs: HOMELAND,
    models: ['Windsor - White 6ft', 'Windsor - Tan 6ft', 'Windsor - Adobe 6ft', 'Windsor - White 4ft'],
    photoTags: [], pages: [37], keywords: 'windsor vinyl' },
  { id: 'vinyl-square-picket', family: 'vinyl', name: 'Hartford & Bedford Picket', line: 'Square pickets. Hartford is flat on top. Bedford stands above the rail.',
    privacy: 'Open', heights: [3, 4, 5, 6], colors: ['White', 'Tan', 'Adobe', 'Mocha Walnut'], specs: [['Panel height', '34" to 70" (3 to 6 ft)'], ...HOMELAND],
    models: ['Hartford - White 4ft', 'Bedford - White 4ft', 'Bedford Concave - White 4ft', 'Hartford - White 5ft', 'Bedford - Tan 4ft', 'HW Hartford - Mocha Walnut 4ft'],
    photoTags: [['vinyl', 'Picket'], ['vinyl', 'Closed-top picket'], ['vinyl', 'Picket gate'], ['library', 'Closed-top picket']], pages: [35, 41, 42], keywords: 'picket front yard hartford bedford concave square' },
  { id: 'vinyl-cascade', family: 'vinyl', name: 'Cascade Picket', line: 'Pointed pickets. Traditional runs straight. Victorian dips between posts.',
    privacy: 'Open', heights: [3, 4, 5], colors: ['White', 'Tan', 'Adobe'], specs: HOMELAND,
    models: ['Cascade Traditional - White 4ft', 'Cascade Victorian - White 4ft', 'Cascade Traditional - Tan 4ft', 'Cascade Victorian - White 5ft'],
    photoTags: [['vinyl', 'Picket']], pages: [43], keywords: 'cascade traditional victorian pointed picket' },
  { id: 'vinyl-midland', family: 'vinyl', name: 'Midland Ranch Rail', line: 'Two, three or four ribbed rails through routed posts.',
    privacy: 'Open', heights: [3, 4, 5], colors: ['White', 'Tan', 'Adobe'], specs: [['Rails', '2-rail at 3 ft, 3-rail at 4 ft, 4-rail at 5 ft'], ...HOMELAND.slice(0, 2), HOMELAND[5]],
    models: ['Midland Ranch 3-Rail - White 4ft', 'Midland Ranch 2-Rail - White 3ft', 'Midland Ranch 4-Rail - White 5ft', 'Midland Ranch 3-Rail - Tan 4ft'],
    photoTags: [['vinyl', 'Ranch rail'], ['vinyl', 'Ranch rail + mesh']], pages: [44], keywords: 'ranch rail midland horse farm' },

  // ── Aluminum ───────────────────────────────────────────────────
  { id: 'alu-flat', family: 'aluminum', name: 'Flat Top', line: 'A clean flat top rail. Elite EFF-20.',
    privacy: 'Open', heights: [4, 5, 6], colors: ['Black', 'Bronze', 'and 5 more'], specs: [['Model', 'Elite EFF-20'], ...ELITE],
    models: ['Aluminum 3-Rail 4ft', 'Aluminum uas-101  4\' Black', "5' Bronze ornamental aluminum"],
    photoTags: [['aluminum', 'Flat top'], ['aluminum', 'Gate detail'], ['library', 'Flat top']], pages: [50, 56], keywords: 'aluminum flat top ornamental black bronze eff-20' },
  { id: 'alu-spear', family: 'aluminum', name: 'Spear Top', line: 'Pickets run past the top rail to a spear point. EFS-15 staggers them.',
    privacy: 'Open', heights: [4, 5, 6], colors: ['Black', 'Bronze', 'and 5 more'], specs: [['Models', 'Elite EFS-10 · EFS-15 (staggered)'], ...ELITE],
    models: [],
    photoTags: [['aluminum', 'Spear top'], ['aluminum', 'Arched gate'], ['library', 'Spear top']], pages: [57], keywords: 'spear top staggered pointed efs' },
  { id: 'alu-flatspear', family: 'aluminum', name: 'Flat Top with Spear', line: 'A flat top rail with spears above it. Elite EFF-25.',
    privacy: 'Open', heights: [4, 5, 6], colors: ['Black', 'Bronze', 'and 5 more'], specs: [['Model', 'Elite EFF-25'], ...ELITE],
    models: [],
    photoTags: [['aluminum', 'Spear top']], pages: [58], keywords: 'flat spear eff-25' },
  { id: 'alu-lifegard', family: 'aluminum', name: 'LifeGard 2-Rail', line: 'A two-rail panel. One of our two options for homes with kids and dogs.',
    privacy: 'Open', heights: [4], colors: ['Black', 'Bronze', 'and 5 more'], specs: [['Model', 'Elite LifeGard'], ...ELITE],
    models: ['Aluminum 2-Rail LifeGard 4ft'],
    photoTags: [], pages: [60], keywords: 'lifegard 2 rail kids' },
  { id: 'alu-pet', family: 'aluminum', name: 'Pet Panel', line: 'Closes the gap between pickets to 1⅝ inches.',
    privacy: 'Open', heights: [4, 5], colors: ['Black', 'Bronze', 'and 5 more'], specs: [['Picket gap', '1⅝"'], ...ELITE],
    models: [],
    photoTags: [], pages: [60], keywords: 'pet panel dog puppy small gap' },

  // ── Split rail ─────────────────────────────────────────────────
  { id: 'split-cedar', family: 'split-rail', name: 'Cedar Split Rail', line: 'Round Northern White Cedar from Michigan mills. The lighter look.',
    privacy: 'Open', heights: [3, 4], specs: [['Wood', 'Northern White Cedar, round posts'], ...SPLIT],
    models: ['4’ cedar split rail', "3' cedar split rail", 'split rail'],
    photoTags: [['split-rail', 'Open rail'], ['split-rail', 'Walk gate'], ['split-rail', 'Double gate']], pages: [63, 64, 65, 67], keywords: 'split rail cedar round rustic farm' },
  { id: 'split-pt', family: 'split-rail', name: 'Pressure-Treated Split Rail', line: 'Sawn PT rails. The darker look.',
    privacy: 'Open', heights: [3, 4], specs: [['Posts', 'Rectangular line posts; square at corners, ends and gates'], ...SPLIT.slice(1)],
    models: ["4' P/T Split Rail", "3' P/T Split Rail"],
    photoTags: [['split-rail', 'Open rail'], ['split-rail', 'Walk gate']], pages: [64, 65, 67], keywords: 'split rail pressure treated pt sawn' },
  { id: 'split-wire', family: 'split-rail', name: 'Split Rail with Pet Wire', line: 'Keeps the dog in. Still looks like split rail from the street.',
    privacy: 'Open', heights: [3, 4], specs: [['Wire', '2" × 4" welded, on the yard side'], ['Diggers', 'Ask for a bottom board'], ...SPLIT.slice(0, 2), SPLIT[3]],
    models: ['4’ cedar split rail', "4' P/T Split Rail"],
    photoTags: [['split-rail', 'Rail + mesh'], ['library', 'Rail + mesh']], pages: [66, 67, 69], keywords: 'split rail wire mesh dog pet' },

  // ── Chain link ─────────────────────────────────────────────────
  { id: 'chain-galv', family: 'chainlink', name: 'Galvanized Chain Link', line: 'Silver galvanized. The budget fence, built right.',
    privacy: 'Open', heights: [4, 5, 6], specs: CHAIN,
    models: ['Galv Chain Link 4ft', 'Galv Chain Link 5ft', 'Galv Chain Link 6ft', 'Chain Link 4ft Galvanized'],
    photoTags: [['chainlink', 'Silver chain link'], ['chainlink', 'Walk gate'], ['chainlink', 'Double gate'], ['library', 'Silver chain link']], pages: [72, 74], keywords: 'chain link galvanized silver budget' },
  { id: 'chain-black', family: 'chainlink', name: 'Black Vinyl-Coated Chain Link', line: 'Black coated fabric that disappears into the yard.',
    privacy: 'Open', heights: [4, 5, 6], specs: CHAIN,
    models: ['BLK Chain Link 4ft', 'BLK Chain Link 5ft', 'BLK Chain Link 6ft', 'Chain Link 4ft Black'],
    photoTags: [['chainlink', 'Black chain link'], ['library', 'Black chain link']], pages: [72, 73, 74], keywords: 'chain link black vinyl coated' }
];

// Local fence rules. Researched and checked Nov 19, 2026 (GFS reference notes).
// A summary, not legal advice: the zoning office has the final word.
// Heights in feet. null = not verified yet (the app offers the AI lookup).
export const RULES = [
  { id: 'toledo', name: 'Toledo', state: 'OH', county: 'Lucas', match: ['toledo'], front: 3.5, side: 6, rear: 6, cornerTwoFronts: true,
    permit: 'Zoning compliance certificate for every fence (repairs of 100 sq ft or less in matching material are exempt).',
    notes: ['Nothing in the right-of-way.', 'Finished side faces the neighbor or street.', 'Wood posts must be treated.', 'No pallets, doors, tires, corrugated metal, barbed, razor or electric wire.'],
    source: 'Toledo Municipal Code 1105.0301', frost: '36"' },
  { id: 'sylvania-city', name: 'Sylvania (city)', state: 'OH', county: 'Lucas', match: ['sylvania'], notMatch: ['township'], front: 3.5, side: 7, rear: 7, sideForward: 4,
    permit: 'Check with the city zoning office.',
    notes: ['4 ft in a side yard forward of the house.', 'No fence within 80 ft of an intersection centerline (as written in the code).', 'Code copy on file is from 2014; confirm it is current.'],
    source: 'Sylvania Codified Ordinances 1117.08', frost: '36"' },
  { id: 'sylvania-twp', name: 'Sylvania Township', state: 'OH', county: 'Lucas', match: ['sylvania township', 'sylvania twp'], front: null, side: null, rear: null,
    permit: 'Zoning permit required.', notes: ['Height limits are in Zoning Resolution 1307 and have not been verified yet. Call 419-885-5276.'], source: 'Sylvania Township Zoning Resolution', frost: '36"' },
  { id: 'perrysburg', name: 'Perrysburg', state: 'OH', county: 'Wood', match: ['perrysburg'], notMatch: ['township'], front: 4, side: 4, rear: 6, sight: { ft: 25, max: 3 },
    permit: 'Permit required for every fence.',
    notes: ['Side yards 4 ft (6 ft needs a BZA variance).', 'Set 4" off the line up to 6 ft tall, 12" if taller.', 'Posts face inward.', 'No chain link in front yards.', 'Historic district needs design review.', 'Posts no more than 4" above the fence.'],
    source: 'Perrysburg Codified Ordinances 1250.42, 1250.54', frost: 'Wood County: not verified' },
  { id: 'maumee', name: 'Maumee', state: 'OH', county: 'Lucas', match: ['maumee'], front: null, side: null, rear: null,
    permit: 'Fences 2.5 ft or lower need no permit. Anything taller needs Zoning Administrator approval.', notes: ['Height limits not verified yet.'], source: 'Maumee Ord. 093-2020', frost: '36"' },
  { id: 'oregon', name: 'Oregon', state: 'OH', county: 'Lucas', match: ['oregon'], front: 4, side: 6, rear: 6, sight: { ft: 20, max: 3 },
    permit: 'Check with the city zoning office.', notes: ['May sit on the property line.', 'No barbed, razor or electric wire.'], source: 'Oregon Codified Ordinances 1155.02', frost: '36"' },
  { id: 'springfield-twp', name: 'Springfield Township', state: 'OH', county: 'Lucas', match: ['springfield township', 'springfield twp'], front: 4, side: 6, rear: 6, cornerTwoFronts: true,
    permit: 'Zoning certificate for any fence.', notes: ['48" between the house and the street (both streets on a corner lot).', 'On the line but not past it.', '1 ft back from a public sidewalk.'], source: 'Springfield Township Zoning Resolution 1904', frost: '36"' },
  { id: 'monroe-mi', name: 'Monroe', state: 'MI', county: 'Monroe', match: ['monroe'], notMatch: ['township', 'county'], front: null, side: 6.5, rear: 6.5,
    permit: 'Check with the city.', notes: ['Front yard is decided case by case.', 'Corner lot secondary front: 3 ft ahead of the house, 6.5 ft behind.'], source: 'City of Monroe code (2024)', frost: '42" (Michigan)' },
  { id: 'bedford-mi', name: 'Bedford Township', state: 'MI', county: 'Monroe', match: ['bedford township', 'bedford twp', 'temperance', 'lambertville'], front: 3.5, side: 6, rear: 6, sight: { ft: 35, max: 2 }, cornerTwoFronts: true,
    permit: 'No permit required.', notes: ['Front and corner side yards: 3.5 ft, decorative only (chain link does not count as decorative).', '6 ft at the side and rear, behind the front building line.', 'Posts go on the inside.', 'No building up the grade under a fence.'], source: 'Bedford Township Zoning 400.1912, 400.1910', frost: '42" (Michigan)' },
  { id: 'trenton-mi', name: 'Trenton', state: 'MI', county: 'Wayne', match: ['trenton'], front: null, side: null, rear: null, sight: { ft: 25, max: 3 },
    permit: 'Check with the city.', notes: ['3 ft max within 25 ft of an intersection.', 'Other height limits not verified yet.'], source: 'Trenton Code 110-634', frost: '42" (Michigan)' }
];

export const DIG_RULES = {
  OH: 'OHIO811: call at least 2 working days before digging. Dig within 16 calendar days or call again.',
  MI: 'MISS DIG: 3 business days notice. Start within 14 days, finish within 21. Hand-dig within 4 ft of marks.'
};
