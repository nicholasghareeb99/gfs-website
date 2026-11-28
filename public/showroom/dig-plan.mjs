// The No-dig vs dug install day: which model, and when each step happens, as fractions of the day
// (0 = morning, 1 = done). Both fences go up the same day; the dug one takes longer.
// GFS's two 6 ft dog-ear privacy models in the Executive App: set in concrete, and no-dig (King Plus)
export const STYLE = 'Standard Privacy 6ft (PT)', STYLE_ND = "6'No-Dig P/t Dog Ear Privacy";
export const DUR = 22000;                              // ms for the whole day when played
export const DUG = { dig: [[.04, .16], [.19, .31]], exit: [.31, .34], lower: [[.35, .38], [.45, .48]], pour: [[.38, .42], [.48, .52]], tamp: [[.42, .45], [.52, .55]], rails: [.57, .66], pickets: [.66, .88], clean: [.9, .995] };
export const ND = { drive: [[.04, .12], [.14, .22]], box: [[.23, .27], [.27, .31]], rails: [.32, .38], pickets: [.38, .52] };
