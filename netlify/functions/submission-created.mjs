// Reserved Netlify event filename: Netlify runs this when a form is submitted and refuses outside callers.
// Netlify verifies event signatures before invoking this event-only function.
// No admin credentials. Existing Firestore create rules still apply.
//
// The default export MUST be a function. Netlify reaches this file in one of two ways:
//  - a Netlify build registers the formSubmitted handler and passes event.data;
//  - a CLI or API deploy has no such registration, so Netlify falls back to the reserved file name and
//    calls the default export with a Request whose JSON body is {payload:{data:{...}}}.
// 16-18 Nov 2026: the default export was an object ({formSubmitted}), the site was deployed through the
// API, and every submission failed with "e.default is not a function": leads stayed in Netlify Forms and
// never reached the office. The function below, with formSubmitted attached, works both ways.
const text=(v,n)=>String(v??'').trim().slice(0,n);
const number=(v,max=100000)=>{const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=max?n:0;};
export function intakeRecord(data,now=new Date()){
 if(!data||data.gfs_contract!=='gfs-intake-v1')return null;
 if(!['estimate','ballpark','booking'].includes(data.intake_kind))throw Error('Invalid intake type');
 if(!/^[a-zA-Z0-9_-]{16,80}$/.test(data.submission_id||''))throw Error('Invalid intake reference');
 // Do not turn a truncated click, ad or parent-receipt ID into a different ID.
 // Failed event delivery retains the complete original in Netlify Forms.
 const rawMeta=String(data.meta??'');
 if(rawMeta.length>30000)throw Error('Intake metadata too large; original submission remains in Netlify Forms for recovery.');
 const record={name:text(data.name,200),phone:text(data.phone,51),email:String(data.email??'').trim().toLowerCase(),address:text(data.address,500),notes:text(data.notes,2000),source:text(data.source,100),createdAt:now.toISOString(),createdAtMs:now.getTime()};
 const phone=record.phone.replace(/[^\d+]/g,'');
 if(record.name.length<2||record.phone.length>50||!/^\+?[\d().\s-]+$/.test(record.phone)||!/^(?:\d{10}|\+?1\d{10}|\+[2-9]\d{9,14})$/.test(phone))throw Error('Invalid contact fields');
 if(record.email&&(record.email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)))throw Error('Invalid email');
 const booking=data.intake_kind==='booking';
 if(booking){
  record.meta=text(data.meta,30000);
  record.date=text(data.date,30);record.time=text(data.time,30);
  const requestedDate=/^\d{4}-\d{2}-\d{2}$/.test(record.date)?new Date(record.date+'T12:00:00Z'):null;
  if(!requestedDate||!Number.isFinite(requestedDate.getTime())||requestedDate.toISOString().slice(0,10)!==record.date||!record.time)throw Error('Invalid requested appointment');
 }else{
  Object.assign(record,{status:'new',fenceType:text(data.fenceType,200),fenceStyle:text(data.fenceStyle,200),linearFeet:number(data.linearFeet)||null,height:text(data.height,30),singleGates:number(data.singleGates,100),doubleGates:number(data.doubleGates,100),timeline:text(data.timeline,200),geometry:'',meta:text(data.meta,30000)});
  if(data.geometry){if(String(data.geometry).length>45000)throw Error('Drawing too large');const g=JSON.parse(data.geometry);const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;if(!g||!Array.isArray(g.lines)||g.lines.length>100||g.lines.some(line=>!Array.isArray(line)||line.length<2||!line.every(valid))||g.lines.flat().length>3000||(g.gates!==undefined&&(!Array.isArray(g.gates)||g.gates.length>200||g.gates.some(gate=>!valid(gate)||(gate.type!==undefined&&!['walk','drive'].includes(gate.type))))))throw Error('Invalid drawing');record.geometry=JSON.stringify(g);}
  if(data.photo){const receipt=data.photo;const photo=typeof receipt==='string'?receipt:receipt&&typeof receipt==='object'&&typeof receipt.url==='string'?receipt.url:null;if(!photo||photo.length>4000)throw Error('Invalid uploaded photo receipt');let url;try{url=new URL(photo);}catch{throw Error('Invalid uploaded photo receipt');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid uploaded photo receipt');record.photo=url.href;}
 }
 return{id:'web_'+data.submission_id,collection:booking?'bookings':'websiteLeads',record};
}
export function firestoreFields(record){return Object.fromEntries(Object.entries(record).map(([k,v])=>[k,v===null?{nullValue:null}:typeof v==='number'?{doubleValue:v}:{stringValue:String(v)}]));}
export async function deliverIntake(data,{fetcher=fetch,project=process.env.GFS_FIREBASE_PROJECT_ID,now=new Date()}={}){
 const intake=intakeRecord(data,now);if(!intake)return{ignored:true};
 if(!project||!/^[a-z][a-z0-9-]{4,62}$/.test(project))throw Error('Set GFS_FIREBASE_PROJECT_ID for this deployment');
 const url='https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)/documents/'+intake.collection+'?documentId='+encodeURIComponent(intake.id);
 const response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:firestoreFields(intake.record)}),signal:AbortSignal.timeout(15000),redirect:'error'});
 if(response.status===409)return{id:intake.id,duplicate:true};
 if(!response.ok)throw Error('Intake '+intake.id+' could not sync to Firestore (HTTP '+response.status+'). It remains in Netlify Forms for recovery.');
 return{id:intake.id,duplicate:false};
}
const report=result=>{if(!result.ignored)console.info('GFS intake synced',result.id,result.duplicate?'already present':'created');};
// File-name call (CLI or API deploy): the submission is the JSON body's payload.data.
async function handler(request){
 let body;try{body=await request.json();}catch{return new Response('Bad request',{status:400});}
 const payload=body&&typeof body.payload==='object'&&body.payload?body.payload:null;
 const data=payload?(payload.data&&typeof payload.data==='object'?payload.data:payload.gfs_contract?payload:null):body&&body.data;
 if(!data||typeof data!=='object'){console.warn('GFS intake: unexpected request shape, keys:',Object.keys(body||{}).join(','),'payload keys:',Object.keys(payload||{}).join(','));return new Response('Bad request',{status:400});}
 report(await deliverIntake(data));
 return new Response(null,{status:204});
}
// Registered-handler call (Netlify build): the submission is event.data.
handler.formSubmitted=async event=>{report(await deliverIntake(event.data));};
export default handler;
