// The No-dig vs dug install day: which model, and when each step happens, as fractions of the day
// (0 = morning, 1 = done). Not to scale: the 48 hour concrete wait would be most of it.
// GFS's two 6 ft dog-ear privacy models in the Executive App: set in concrete, and no-dig (King Plus)
export const STYLE = 'Standard Privacy 6ft (PT)', STYLE_ND = "6'No-Dig P/t Dog Ear Privacy";
export const DUR = 22000;                              // ms for the whole day when played
export const DUG = { dig: [[.04, .16], [.19, .31]], exit: [.31, .34], lower: [[.35, .38], [.43, .46]], pour: [[.38, .43], [.46, .51]], cure: [.52, .74], rails: [.75, .81], pickets: [.81, .95], clean: [.95, .995] };
export const ND = { drive: [[.04, .12], [.14, .22]], box: [[.23, .27], [.27, .31]], rails: [.32, .38], pickets: [.38, .52] };
