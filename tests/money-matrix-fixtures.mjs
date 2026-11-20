// Synthetic settings rows. No production data or lender rates live here.
// Columns: published style, selected height, panel feet (0 = exact feet),
// fixture dollars per linear foot, per walk gate and per double drive gate.
export const styles = [
  ['Cedar Privacy 4 ft Dug', 4, 8, 30, 240, 510],
  ['Cedar Privacy 4 ft Driven', 4, 8, 32, 250, 530],
  ['Cedar Privacy 6 ft Dug', 6, 8, 40, 300, 630],
  ['Cedar Privacy 6 ft Driven', 6, 8, 42, 310, 650],
  ['Cedar Privacy 8 ft Dug', 8, 8, 50, 370, 760],
  ['Cedar Privacy 8 ft Driven', 8, 8, 52, 385, 790],
  ['Pressure-Treated Wood Privacy 4 ft Dug', 4, 8, 23, 200, 440],
  ['Pressure-Treated Wood Privacy 4 ft Driven', 4, 8, 25, 215, 460],
  ['Pressure-Treated Wood Privacy 6 ft Dug', 6, 8, 28, 230, 475],
  ['Pressure-Treated Wood Privacy 6 ft Driven', 6, 8, 30, 245, 500],
  ['Pressure-Treated Wood Privacy 8 ft Dug', 8, 8, 35, 270, 550],
  ['Pressure-Treated Wood Privacy 8 ft Driven', 8, 8, 38, 285, 575],
  ['Cedar Picket 4 ft', 4, 8, 28, 210, 455],
  ['Cedar Shadowbox 6 ft', 6, 8, 45, 325, 665],
  ['Pressure-Treated Wood Shadowbox 6 ft', 6, 8, 33, 260, 540],
  ['Cedar Horizontal 6 ft', 6, 8, 53, 400, 835],
  ['Pressure-Treated Wood Horizontal 6 ft', 6, 8, 36, 275, 565],
  ['Cedar Split Rail 3 ft', 3, 10, 16, 140, 305],
  ['Cedar Split Rail 4 ft', 4, 10, 19, 160, 340],
  ['Pressure-Treated Split Rail 3 ft', 3, 10, 13, 120, 260],
  ['Pressure-Treated Split Rail 4 ft', 4, 10, 15, 135, 290],
  ['Ranch Rail', 4, 0, 12.5, 100, 230],
  ['Vinyl Privacy 6 ft', 6, 8, 50, 390, 835],
  ['Vinyl Picket 4 ft', 4, 8, 35, 270, 585],
  ['Black Aluminum 4 ft', 4, 6, 31, 360, 750],
  ['Galvanized Chain Link 4 ft', 4, 10, 15, 150, 320],
  ['Vinyl-Coated Chain Link 5 ft', 5, 10, 18, 160, 335],
  ['Galvanized Chain Link 6 ft', 6, 10, 19, 175, 360],
];

export const lengths = [0, 1, 7, 50, 150, 151, 400, 2000];
export const factors = { remWood: 5.5, remChain: 3.25, remOther: 6.75 };
export const pricing = styles.map(([name, , , perFoot, walk, drive]) => [name, perFoot, walk, drive].join(' : ')).join('\n');
