// Model exports must not quietly omit a gate that the customer requested.
const modelReviews=new WeakMap();
export function setGateModelReview(model,review){if(model&&typeof review==="function")modelReviews.set(model,review);}
export function captureGateModelReview(model){
 const checks=[];model?.traverseVisible?.(part=>{const review=modelReviews.get(part);if(review){review();checks.push([part,review]);}});
 return()=>{for(const[part,review]of checks){if(modelReviews.get(part)!==review)throw Error('The model changed during export. Prepare the current model again.');review();}};
}
export function requireCompleteGateModel(model){
 const warnings=new Set();let blocked=null;
 model?.traverseVisible?.(part=>{
  modelReviews.get(part)?.();
  for(const issue of part.userData?.gateIssues||[]){
   if(issue.code==='grade-needs-review')warnings.add(issue.message);
   else blocked??=issue;
  }
 });
 if(blocked)throw Error('Fix the gate placement before exporting. '+blocked.message);
 return [...warnings];
}
