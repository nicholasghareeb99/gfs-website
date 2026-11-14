// Local owner instruction, 2026-09-20: "72\" lattice should be 12\" and have trim".
// The public catalog remains untouched. Only this exact style receives a local
// correction after public/fallback settings are sanitized.
export const OWNER_LATTICE_STYLE='Pressure Treated Lattice Top shadowbox';
export const OWNER_LATTICE_DIMENSIONS=Object.freeze({overallIn:72,latticeBandIn:12,bodyIn:60});
export function ownerModelHeight(name){return name===OWNER_LATTICE_STYLE?6:null;}
export function ownerModelNote(name){
  return name===OWNER_LATTICE_STYLE?'72 in overall, with a 12 in lattice band and trim. Post height and trim proportions are illustrative.':'';
}
export function applyOwnerModelCorrection(name,spec={}){
  if(name!==OWNER_LATTICE_STYLE)return spec;
  return {...spec,mode:'shadowbox',wood:true,h:6,editH:6,topper:'lattice',topBandIn:12,pkHIn:60,
    latticeTrim:true,
    // These display proportions reuse existing generator stock defaults. They
    // are not additional owner-confirmed product or structural dimensions.
    topRailHIn:2,topRailTIn:2,capTrimIn:3.5,
    // Align the drawn post with the confirmed fence top; no structural inference.
    postHIn:72,postHeightMode:'custom'};
}
