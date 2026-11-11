import * as T from './vendor/three.module.js';
import {requireCompleteGateModel} from './model-review.mjs';
import {withCompleteFence} from './fence-layers.mjs';
export const METRES_PER_FOOT=.3048;
// Export the rendered fence, expanding instance transforms so caps, rails and
// pickets all survive USDZ. Environment and editor handles are deliberately excluded.
export function prepareARModel(fence,{maxParts=12000}={}) {
  if(!fence)throw new Error('Choose a fence model first.');
  fence.updateWorldMatrix(true,true);
  const scene=new T.Scene(),materials=new Map(),ownedGeometry=[],doubleGeometry=new Map(),warnings=new Set(requireCompleteGateModel(fence));let count=0;
  const bounds=new T.Box3().setFromObject(fence);
  if(bounds.isEmpty()||![...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite))throw new Error('The fence has no valid geometry to export.');
  const center=bounds.getCenter(new T.Vector3());
  const normalise=new T.Matrix4().makeScale(METRES_PER_FOOT,METRES_PER_FOOT,METRES_PER_FOOT).multiply(new T.Matrix4().makeTranslation(-center.x,0,-center.z));
  function materialFor(original,mesh,index){
    if(!original?.isMeshStandardMaterial&&!original?.isMeshBasicMaterial)throw new Error('This model contains a material that cannot be exported to AR yet.');
    const tint=new T.Color(1,1,1);
    if(mesh.isInstancedMesh&&mesh.instanceColor)mesh.getColorAt(index,tint);
    const color=mesh.geometry.attributes.color;
    if(original.vertexColors&&color){tint.multiply(new T.Color(color.getX(0),color.getY(0),color.getZ(0)));warnings.add('Vertex shading is simplified in AR.');}
    const key=original.uuid+':'+tint.toArray().join(',');
    if(!materials.has(key)){
      const m=original.isMeshStandardMaterial?original.clone():new T.MeshStandardMaterial({color:original.color,map:original.map,alphaMap:original.alphaMap,opacity:original.opacity,transparent:original.transparent,alphaTest:original.alphaTest,roughness:1,metalness:0});
      m.color.multiply(tint);m.vertexColors=false;m.side=T.FrontSide;materials.set(key,m);
    }
    return materials.get(key);
  }
  function bothSides(geometry){
    if(doubleGeometry.has(geometry.uuid))return doubleGeometry.get(geometry.uuid);
    const flat=geometry.index?geometry.toNonIndexed():geometry,n=flat.attributes.position.count,out=new T.BufferGeometry();
    for(const [name,a]of Object.entries(flat.attributes)){
      const data=new a.array.constructor(n*2*a.itemSize);
      for(let v=0;v<n;v++)for(let k=0;k<a.itemSize;k++){
        const read=(index)=>a[['getX','getY','getZ','getW'][k]](index);
        data[v*a.itemSize+k]=read(v);
        const reverse=Math.floor(v/3)*3+2-v%3;
        data[(n+v)*a.itemSize+k]=read(reverse)*(name==='normal'?-1:1);
      }
      out.setAttribute(name,new T.BufferAttribute(data,a.itemSize,a.normalized));
    }
    if(flat!==geometry)flat.dispose();ownedGeometry.push(out);doubleGeometry.set(geometry.uuid,out);return out;
  }
  try {
    fence.traverseVisible(o=>{
      if(!o.isMesh)return;
      if(Array.isArray(o.material))throw new Error('Use a single style model for AR export.');
      for(let i=0,n=o.isInstancedMesh?o.count:1;i<n;i++){
        if(++count>maxParts)throw new Error('This layout is too large for phone AR. Choose a single panel or shorter run.');
        const matrix=normalise.clone().multiply(o.matrixWorld);
        if(o.isInstancedMesh){const instance=new T.Matrix4();o.getMatrixAt(i,instance);matrix.multiply(instance);}
        if(!matrix.elements.every(Number.isFinite))throw new Error('A fence part has an invalid position. Rebuild the model and retry.');
        let geo=o.material.side===T.DoubleSide?bothSides(o.geometry):o.geometry;
        if(matrix.determinant()<0){
          geo=geo.clone();ownedGeometry.push(geo);geo.applyMatrix4(matrix);
          if(!geo.index)geo.setIndex(Array.from({length:geo.attributes.position.count},(_,i)=>i));
          const ix=geo.index;for(let k=0;k<ix.count;k+=3){const a=ix.getX(k);ix.setX(k,ix.getX(k+2));ix.setX(k+2,a);}matrix.identity();
        }
        const mesh=new T.Mesh(geo,materialFor(o.material,o,i));mesh.matrixAutoUpdate=false;mesh.matrix.copy(matrix);scene.add(mesh);
      }
    });
    if(!count)throw new Error('No visible fence parts are selected.');
    scene.updateMatrixWorld(true);
    const dimensions=new T.Box3().setFromObject(scene).getSize(new T.Vector3());
    return {scene,count,dimensionsFt:dimensions.clone().divideScalar(METRES_PER_FOOT).toArray(),warnings:[...warnings],dispose(){materials.forEach(m=>m.dispose());ownedGeometry.forEach(g=>g.dispose());scene.clear();}};
  }catch(e){materials.forEach(m=>m.dispose());ownedGeometry.forEach(g=>g.dispose());throw e;}
}
export async function exportARModel(fence,options={}) {
  // Copy the complete fence synchronously, then immediately restore inspection
  // visibility before texture conversion and asynchronous archive encoding.
  const model=withCompleteFence(fence,()=>prepareARModel(fence,options));
  const textures=new Map();
  try {
    // Normalize generated textures and canvases from embedded viewers into this
    // document. USDZExporter uses realm-specific canvas checks.
    for(const mesh of model.scene.children){
      const material=mesh.material;
      for(const key of ['map','alphaMap','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap']){
        const original=material[key];if(!original)continue;
        if(!textures.has(original.uuid)){
          const image=original.image;
          if(!image?.width||!image?.height)throw new Error('A fence texture has not loaded. Wait for the model and try again.');
          const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
          const ctx=canvas.getContext('2d');
          if(image.data){
            const pixels=ctx.createImageData(image.width,image.height),channels=image.data.length/(image.width*image.height);
            if(![1,3,4].includes(channels))throw new Error('This texture format needs conversion before AR export.');
            const value=v=>original.type===T.FloatType?Math.round(Math.max(0,Math.min(1,v))*255):v;
            for(let i=0;i<image.width*image.height;i++){for(let c=0;c<3;c++)pixels.data[i*4+c]=value(image.data[i*channels+(channels===1?0:c)]);pixels.data[i*4+3]=channels===4?value(image.data[i*channels+3]):255;}
            ctx.putImageData(pixels,0,0);
          }else ctx.drawImage(image,0,0);
          const texture=original.clone();texture.image=canvas;textures.set(original.uuid,texture);
        }
        material[key]=textures.get(original.uuid);
      }
    }
    const {USDZExporter}=await import('./vendor/USDZExporter.js');
    const data=await new USDZExporter().parse(model.scene,{quickLookCompatible:true});
    if(data.byteLength>80*1024*1024)throw new Error('This model is too large for phone AR. Export a shorter run.');
    return {blob:new Blob([data],{type:'model/vnd.usdz+zip'}),count:model.count,dimensionsFt:model.dimensionsFt,warnings:model.warnings};
  }finally{textures.forEach(t=>t.dispose());model.dispose();}
}
