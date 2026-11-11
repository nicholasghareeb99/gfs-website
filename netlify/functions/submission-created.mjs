// Reserved Netlify event filename also supports direct CLI deployments.
// Netlify verifies event signatures before invoking this event-only function.
// No general HTTP handler and no admin credentials. Existing Firestore create rules still apply.
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
 const record={name:text(data.name,200),phone:text(data.phone,50),email:text(data.email,200).toLowerCase(),address:text(data.address,500),notes:text(data.notes,2000),source:text(data.source,100),createdAt:now.toISOString(),createdAtMs:now.getTime()};
 if(record.name.length<2||record.phone.replace(/\D/g,'').length<10)throw Error('Invalid contact fields');
 if(record.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email))throw Error('Invalid email');
 const booking=data.intake_kind==='booking';
 if(booking){
  record.meta=text(data.meta,30000);
  record.date=text(data.date,30);record.time=text(data.time,30);
  const requestedDate=/^\d{4}-\d{2}-\d{2}$/.test(record.date)?new Date(record.date+'T12:00:00Z'):null;
  if(!requestedDate||!Number.isFinite(requestedDate.getTime())||requestedDate.toISOString().slice(0,10)!==record.date||!record.time)throw Error('Invalid requested appointment');
 }else{
  Object.assign(record,{status:'new',fenceType:text(data.fenceType,200),fenceStyle:text(data.fenceStyle,200),linearFeet:number(data.linearFeet)||null,height:text(data.height,30),singleGates:number(data.singleGates,100),doubleGates:number(data.doubleGates,100),timeline:text(data.timeline,200),geometry:'',meta:text(data.meta,30000)});
  if(data.geometry){if(String(data.geometry).length>45000)throw Error('Drawing too large');const g=JSON.parse(data.geometry);const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;if(!g||!Array.isArray(g.lines)||g.lines.length>100||g.lines.some(line=>!Array.isArray(line)||line.length<2||!line.every(valid))||g.lines.flat().length>3000||(g.gates!==undefined&&(!Array.isArray(g.gates)||g.gates.length>200||g.gates.some(gate=>!valid(gate)||(gate.type!==undefined&&!['walk','drive'].includes(gate.type))))))throw Error('Invalid drawing');record.geometry=JSON.stringify(g);}
  if(data.photo){const receipt=data.photo;const photo=typeof receipt==='string'?receipt:receipt&&receipt.type==='file'&&typeof receipt.url==='string'?receipt.url:null;if(!photo||photo.length>4000)throw Error('Invalid uploaded photo receipt');let url;try{url=new URL(photo);}catch{throw Error('Invalid uploaded photo receipt');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid uploaded photo receipt');record.photo=url.href;}
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
export default{async formSubmitted(event){const result=await deliverIntake(event.data);if(!result.ignored)console.info('GFS intake synced',result.id,result.duplicate?'already present':'created');}};
