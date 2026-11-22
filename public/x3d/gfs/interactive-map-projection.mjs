const number=value=>typeof value==='number'&&Number.isFinite(value);
// V3-120 More than one aerial photo. Next to the Esri imagery there are the two states' own
// photo services, read with no account and no key: Michigan's 2024 flight and Ohio's newest
// statewide flight. Both draw a picture for any square asked for, so each tile is asked for
// by its corners. covers() is a generous yes near the state line (their photos overlap it);
// sourceCovers() asks the service itself whether it has a photo at the spot.
const WORLD=20037508.342787,MI_PHOTO='https://imagery.michigan.gov/server/rest/services/Michigan_imagery_2024/ImageServer',OH_PHOTO='https://maps.ohio.gov/image/rest/services/osip_most_current/ImageServer';
const exportTile=(root,z,x,y)=>{const s=2*WORLD/2**z;return `${root}/exportImage?bbox=${-WORLD+x*s},${WORLD-(y+1)*s},${-WORLD+(x+1)*s},${WORLD-y*s}&bboxSR=3857&imageSR=3857&size=256,256&format=jpgpng&f=image`;};
const stateLine=lng=>lng>-82.4?43:41.6961+(Math.min(-83.4547,Math.max(-84.8061,lng))+84.8061)*.02716;
export const nearOhio=(lat,lng)=>lng>-84.83&&lng<-80.5&&lat>38.38&&lat<stateLine(lng)+.008;
export const nearMichigan=(lat,lng)=>lng>-90.5&&lng<-82.4&&lat<48.4&&lat>(lng<-84.8061?41.75:stateLine(lng)-.008);
export const MAP_SOURCES=Object.freeze({
 'esri-world-imagery':Object.freeze({label:'Aerial',available:true,credit:'Imagery © Esri, Maxar',maxZoom:20,url:(z,x,y)=>`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}?blankTile=false`}),
 'mi-2024':Object.freeze({label:'Michigan state photo (spring 2024, loads slower)',available:true,credit:'Imagery: State of Michigan, 2024',maxZoom:20,dynamic:true,covers:nearMichigan,coverage:MI_PHOTO,url:(z,x,y)=>exportTile(MI_PHOTO,z,x,y)}),
 'oh-osip':Object.freeze({label:'Ohio state photo (newest flight)',available:true,credit:'Imagery: State of Ohio, OGRIP (OSIP)',maxZoom:20,dynamic:true,covers:nearOhio,coverage:OH_PHOTO,url:(z,x,y)=>exportTile(OH_PHOTO,z,x,y)}),
 'esri-streets':Object.freeze({label:'Street map',available:true,photo:false,credit:'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors',maxZoom:19,url:(z,x,y)=>`https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`}),
 'carto-voyager':Object.freeze({label:'Street map (CARTO, retired)',retired:true,photo:false,available:false,unavailableReason:'Street map requires a verified CARTO API key. Aerial imagery is available.',credit:'© OpenStreetMap contributors © CARTO',maxZoom:19,url:(z,x,y)=>`https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`})
});
// Does this source have a photo at this spot? The state services are asked (their catalogue
// answers with a count); the Esri imagery covers everywhere. Throws when the service does not answer.
export async function sourceCovers(sourceId,lat,lng,{fetcher,signal}={}){
 const source=MAP_SOURCES[sourceId];if(!source?.available||![lat,lng].every(number))return false;
 if(source.covers&&!source.covers(lat,lng))return false;if(!source.coverage)return true;
 const response=await fetcher(`${source.coverage}/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&where=Category%3D1&returnCountOnly=true&f=json`,{signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',mode:'cors'});
 const body=response.ok?await response.json():null;if(!Number.isInteger(body?.count))throw Error('The photo source did not say whether it covers this property.');
 return body.count>0;
}
export function mercatorPoint(lat,lng){
 if(![lat,lng].every(number)||Math.abs(lat)>=85||Math.abs(lng)>180)throw Error('Choose a map view within supported geographic bounds.');
 const a=lat*Math.PI/180;return{x:(lng+180)/360,y:(1-Math.log(Math.tan(a)+1/Math.cos(a))/Math.PI)/2};
}
export function validateAffine(value){
 if(!Array.isArray(value)||value.length!==6||!value.every(number)||Math.abs(value[0]*value[3]-value[1]*value[2])<1e-12)throw Error('The map alignment is unavailable. Choose and place a map again.');
 return value.slice();
}
export function affinePoint([a,b,c,d,e,f],{x,y}){return{x:a*x+c*y+e,y:b*x+d*y+f};}
export function inversePoint(matrix,point){const[a,b,c,d,e,f]=validateAffine(matrix),det=a*d-b*c,x=point.x-e,y=point.y-f;return{x:(d*x-c*y)/det,y:(-b*x+a*y)/det};}
export function boxAffine(box){
 if(!box||![box.x,box.y,box.w,box.h,box.rotation??0].every(number)||box.w<=0||box.h<=0)throw Error('The map placement is unavailable.');
 const r=(box.rotation||0)*Math.PI/180,co=Math.cos(r),si=Math.sin(r),cx=box.x+box.w/2,cy=box.y+box.h/2;
 return[co*box.w,si*box.w,-si*box.h,co*box.h,cx-co*box.w/2+si*box.h/2,cy-si*box.w/2-co*box.h/2];
}
export function multiplyAffine(left,right){const[a,b,c,d,e,f]=validateAffine(left),[g,h,i,j,k,l]=validateAffine(right);return[a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f];}
export function inverseAffine(matrix){const[a,b,c,d,e,f]=validateAffine(matrix),det=a*d-b*c;return[d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det];}
export function mapReference(box,sourceId){
 if(!MAP_SOURCES[sourceId])throw Error('Choose Aerial or Street map.');
 return{version:1,sourceId,worldFromMercator:placementFromBox(box),referenceBox:{x:box.x,y:box.y,w:box.w,h:box.h,rotation:box.rotation||0}};
}
export function currentMapAffine(box){
 const ref=box?.geoReference?.interactiveMap;
 if(ref?.version!==1||!MAP_SOURCES[ref.sourceId])throw Error('Choose and place a live map for this drawing.');
 return multiplyAffine(multiplyAffine(boxAffine(box),inverseAffine(boxAffine(ref.referenceBox))),validateAffine(ref.worldFromMercator));
}
export function placementFromBox(box){
 const bounds=box?.geoReference?.bounds;
 if(!Array.isArray(bounds)||bounds.length!==2||bounds.some(p=>!Array.isArray(p)||p.length!==2||!p.every(number))||bounds[0][0]>=bounds[1][0]||bounds[0][1]>=bounds[1][1]||bounds[1][1]-bounds[0][1]>=180||![box.x,box.y,box.w,box.h,box.rotation??0].every(number)||box.w<=0||box.h<=0)throw Error('Place a geographically referenced map before enabling live imagery.');
 const nw=mercatorPoint(bounds[1][0],bounds[0][1]),se=mercatorPoint(bounds[0][0],bounds[1][1]);
 const a=box.w/(se.x-nw.x),d=box.h/(se.y-nw.y),e=box.x-a*nw.x,f=box.y-d*nw.y,angle=(box.rotation||0)*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle),cx=box.x+box.w/2,cy=box.y+box.h/2;
 return validateAffine([co*a,si*a,-si*d,co*d,cx+co*(e-cx)-si*(f-cy),cy+si*(e-cx)+co*(f-cy)]);
}
export function cameraAffine(view,matrix){
 if(!view||![view.width,view.height,view.zoom,view.panX,view.panY].every(number)||view.width<=0||view.height<=0||view.zoom<.01||view.zoom>5)throw Error('The drawing viewport is unavailable.');
 const[a,b,c,d,e,f]=validateAffine(matrix),z=view.zoom;return[a*z,b*z,c*z,d*z,(e-view.width/2)*z+view.width/2+view.panX,(f-view.height/2)*z+view.height/2+view.panY];
}
export function visibleTilePlan(view,matrix,sourceId,{maxTiles=96,pixelRatio=1}={}){
 const source=MAP_SOURCES[sourceId];if(!source)throw Error('Choose Aerial or Street map.');if(!source.available)throw Error(source.unavailableReason);
 const screen=cameraAffine(view,matrix),points=[[0,0],[view.width,0],[view.width,view.height],[0,view.height]].map(([x,y])=>inversePoint(screen,{x,y}));
 const loX=Math.min(...points.map(p=>p.x)),hiX=Math.max(...points.map(p=>p.x)),loY=Math.min(...points.map(p=>p.y)),hiY=Math.max(...points.map(p=>p.y));
 if(loX<0||hiX>1||loY<0||hiY>1)throw Error('Pan back to the selected property or choose a smaller map view.');
 const scale=Math.max(Math.hypot(screen[0],screen[1]),Math.hypot(screen[2],screen[3])),ratio=Math.min(2,Math.max(1,Number(pixelRatio)||1)),level=r=>Math.max(2,Math.min(source.maxZoom,Math.ceil(Math.log2(scale*r/256)))),base=level(1);
 let z=level(ratio),n,firstX,lastX,firstY,lastY,count;
 for(;;){n=2**z;firstX=Math.max(0,Math.floor(loX*n));lastX=Math.min(n-1,Math.floor(hiX*n));firstY=Math.max(0,Math.floor(loY*n));lastY=Math.min(n-1,Math.floor(hiY*n));count=(lastX-firstX+1)*(lastY-firstY+1);if(z<=base||Number.isSafeInteger(count)&&count>=1&&count<=maxTiles)break;z--;}
 if(!Number.isSafeInteger(count)||count<1||count>maxTiles)throw Error('This map view needs too many tiles. Zoom in or choose a smaller view.');
 const tiles=[];for(let y=firstY;y<=lastY;y++)for(let x=firstX;x<=lastX;x++)tiles.push({z,x,y,key:`${sourceId}/${z}/${x}/${y}`,url:source.url(z,x,y)});
 return{sourceId,credit:source.credit,screen,z,n,tiles,bounds:{loX,hiX,loY,hiY}};
}
export function snapshotDrawingBox(view){cameraAffine(view,[1,0,0,1,0,0]);return{x:view.width/2+(-view.width/2-view.panX)/view.zoom,y:view.height/2+(-view.height/2-view.panY)/view.zoom,w:view.width/view.zoom,h:view.height/view.zoom,rotation:0};}
export function tileScreenPoint(plan,tile,pixel){return affinePoint(plan.screen,{x:(tile.x+pixel.x/256)/plan.n,y:(tile.y+pixel.y/256)/plan.n});}
