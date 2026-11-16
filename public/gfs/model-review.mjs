// Model exports must not quietly omit a gate that the customer requested.
export function requireCompleteGateModel(model){
 const warnings=new Set();let blocked=null;
 model?.traverseVisible?.(part=>{
  for(const issue of part.userData?.gateIssues||[]){
   if(issue.code==='grade-needs-review')warnings.add(issue.message);
   else blocked??=issue;
  }
 });
 if(blocked)throw Error('Fix the gate placement before exporting. '+blocked.message);
 return [...warnings];
}
