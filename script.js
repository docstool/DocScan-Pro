(() => {
"use strict";
const $=id=>document.getElementById(id);
const state={pages:[],current:-1,tool:"select",history:[],future:[],camera:null,ocr:"",pdfQuality:.78,autoEnhance:true};
const canvas=$("mainCanvas"),ctx=canvas.getContext("2d",{alpha:false}),draw=$("drawCanvas"),dctx=draw.getContext("2d");
const toast=m=>{const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2200)};
const page=()=>state.pages[state.current];
const snapshot=()=>JSON.stringify(state.pages.map(p=>({src:p.src,rotation:p.rotation,filter:p.filter,brightness:p.brightness,contrast:p.contrast,saturation:p.saturation,crop:p.crop,marks:p.marks,texts:p.texts})));
function pushHistory(){state.history.push(snapshot());if(state.history.length>25)state.history.shift();state.future=[];updateUndo()}
function restore(s){const arr=JSON.parse(s);state.pages=arr.map(p=>({...p,img:null}));let n=0;state.pages.forEach(p=>{const im=new Image();im.onload=()=>{p.img=im;if(++n===state.pages.length){state.current=Math.min(state.current,state.pages.length-1);refreshAll()}};im.src=p.src})}
function updateUndo(){$("undoBtn").disabled=!state.history.length;$("redoBtn").disabled=!state.future.length}
$("undoBtn").onclick=()=>{if(!state.history.length)return;state.future.push(snapshot());restore(state.history.pop());updateUndo()};
$("redoBtn").onclick=()=>{if(!state.future.length)return;state.history.push(snapshot());restore(state.future.pop());updateUndo()};

function makePage(src,img){return{src,img,rotation:0,filter:"none",brightness:0,contrast:0,saturation:0,crop:null,marks:[],texts:[]}}
async function imageFile(file){
 return new Promise((resolve,reject)=>{const im=new Image();const url=URL.createObjectURL(file);im.onload=()=>{im.decode?.().catch(()=>{}).finally(()=>resolve(makePage(url,im)))};im.onerror=reject;im.src=url})
}
async function importFiles(files){
 for(const f of files){
  try{if(f.type==="application/pdf"||/\.pdf$/i.test(f.name))await importPdf(f);else if(f.type.startsWith("image/")){const p=await imageFile(f);state.pages.push(p)}}catch(e){toast("Could not import "+f.name)}
 }
 if(state.pages.length){state.current=state.pages.length-1;refreshAll();toast("Imported successfully")}
}
async function loadPdfLib(){if(window.PDFLib)return window.PDFLib;await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js");return window.PDFLib}
async function loadPdfJs(){if(window.pdfjsLib)return window.pdfjsLib;const s=document.createElement("script");s.type="module";s.textContent=`import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdfjs-dist/4.10.38/pdf.min.mjs";window.pdfjsLib=pdfjsLib;pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdfjs-dist/4.10.38/pdf.worker.min.mjs";`;document.head.appendChild(s);for(let i=0;i<80&&!window.pdfjsLib;i++)await new Promise(r=>setTimeout(r,100));return window.pdfjsLib}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
async function importPdf(file){
 toast("Loading PDF…");const lib=await loadPdfJs();const data=new Uint8Array(await file.arrayBuffer());const pdf=await lib.getDocument({data}).promise;
 for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),vp=pg.getViewport({scale:1.35}),c=document.createElement("canvas");c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await pg.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.9));const p=await imageFile(new File([blob],`pdf-page-${i}.jpg`,{type:"image/jpeg"}));state.pages.push(p)}
 toast(`Imported ${pdf.numPages} PDF page${pdf.numPages===1?"":"s"}`)
}

function render(){
 const p=page();if(!p||!p.img)return;
 const iw=p.img.naturalWidth,ih=p.img.naturalHeight,rot=(p.rotation%180)!==0,w=rot?ih:iw,h=rot?iw:ih;
 canvas.width=w;canvas.height=h;draw.width=w;draw.height=h;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(w/2,h/2);ctx.rotate((p.rotation||0)*Math.PI/180);ctx.drawImage(p.img,-iw/2,-ih/2,iw,ih);ctx.restore();
 if(p.filter!=="none"||p.brightness||p.contrast||p.saturation){
   const temp=document.createElement("canvas");temp.width=w;temp.height=h;const tx=temp.getContext("2d");
   tx.filter=cssFilter(p);tx.drawImage(canvas,0,0);ctx.clearRect(0,0,w,h);ctx.drawImage(temp,0,0)
 }
 dctx.clearRect(0,0,w,h);
 drawMarks(p);drawCrop(p);
}
function cssFilter(p){let f=`brightness(${1+p.brightness/100}) contrast(${1+p.contrast/100}) saturate(${1+p.saturation/100})`;if(p.filter==="bw")f+=" grayscale(1) contrast(1.3)";if(p.filter==="doc")f+=" grayscale(1) contrast(1.5) brightness(1.06)";if(p.filter==="sepia")f+=" sepia(1)";if(p.filter==="vivid")f+=" saturate(1.35) contrast(1.08)";return f}
function drawMarks(p){for(const m of p.marks){dctx.strokeStyle=m.color;dctx.lineWidth=m.width;dctx.lineCap="round";dctx.lineJoin="round";dctx.beginPath();m.path.forEach((q,i)=>i?dctx.lineTo(q.x,q.y):dctx.moveTo(q.x,q.y));dctx.stroke()}for(const t of p.texts){dctx.fillStyle=t.color;dctx.font=`${t.size}px Arial`;dctx.fillText(t.text,t.x,t.y)}}
function drawCrop(p){if(state.tool!=="crop"||!p.crop?.length)return;dctx.strokeStyle="#5ee7ff";dctx.lineWidth=Math.max(4,canvas.width/300);dctx.beginPath();p.crop.forEach((q,i)=>i?dctx.lineTo(q.x,q.y):dctx.moveTo(q.x,q.y));if(p.crop.length===4)dctx.closePath();dctx.stroke();dctx.fillStyle="#5ee7ff";p.crop.forEach(q=>{dctx.beginPath();dctx.arc(q.x,q.y,10,0,Math.PI*2);dctx.fill()})}

function thumbUrl(p,max=260){const c=document.createElement("canvas"),sc=Math.min(1,max/Math.max(p.img.naturalWidth,p.img.naturalHeight));c.width=Math.max(1,Math.round(p.img.naturalWidth*sc));c.height=Math.max(1,Math.round(p.img.naturalHeight*sc));const x=c.getContext("2d");x.drawImage(p.img,0,0,c.width,c.height);return c.toDataURL("image/jpeg",.72)}
function refreshPages(){
 const strip=$("pageStrip");strip.innerHTML="";
 state.pages.forEach((p,i)=>{const d=document.createElement("div");d.className="thumb "+(i===state.current?"active":"");d.innerHTML=`<img src="${thumbUrl(p)}"><div class="num">${i+1}</div>`;d.onclick=()=>{state.current=i;refreshPages();render();buildToolbar()};strip.appendChild(d)});
 $("pageGrid").innerHTML="";state.pages.forEach((p,i)=>{const d=document.createElement("div");d.className="page-item";d.draggable=true;d.dataset.i=i;d.innerHTML=`<img src="${thumbUrl(p,420)}"><div class="meta"><span>Page ${i+1}</span><button class="btn small" data-del="${i}">Delete</button></div>`;d.onclick=e=>{if(e.target.dataset.del!=null)return;state.current=i;switchPanel("scanner");refreshAll()};d.ondragstart=e=>e.dataTransfer.setData("text/plain",i);d.ondragover=e=>e.preventDefault();d.ondrop=e=>{e.preventDefault();const from=+e.dataTransfer.getData("text/plain"),to=+d.dataset.i;if(from===to)return;pushHistory();const [x]=state.pages.splice(from,1);state.pages.splice(to,0,x);state.current=to;refreshAll()};$("pageGrid").appendChild(d)});
 document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{pushHistory();state.pages.splice(+b.dataset.del,1);state.current=Math.min(state.current,state.pages.length-1);refreshAll()})
}
function refreshAll(){
 const has=state.pages.length>0;$("welcome").classList.toggle("hidden",has);$("editor").classList.toggle("hidden",!has);$("toolBar").classList.toggle("hidden",!has);
 $("exportBtn").disabled=!has;$("addMore").disabled=false;$("compressImage").disabled=!has;$("compressDocument").disabled=!has;
 $("docName").textContent=has?`Document • ${state.pages.length} page${state.pages.length===1?"":"s"}`:"Untitled document";
 refreshPages();if(has){render();buildToolbar()}updateUndo()
}

function buildToolbar(){
 const p=page();if(!p)return;const bar=$("toolBar");let h="";
 if(state.tool==="select")h=`<div class="tool-options"><span>Quick actions:</span><button class="chip" data-a="auto">Auto enhance</button><button class="chip" data-a="bw">B&W</button><button class="chip" data-a="rotate">Rotate</button><button class="chip" data-a="delete">Delete</button></div>`;
 if(state.tool==="enhance")h=`<div class="tool-options"><button class="chip" data-f="none">Original</button><button class="chip" data-f="doc">Document</button><button class="chip" data-f="bw">B&W</button><button class="chip" data-f="vivid">Vivid</button><span class="range">Brightness <input id="bright" type="range" min="-50" max="50" value="${p.brightness}"></span><span class="range">Contrast <input id="cont" type="range" min="-50" max="80" value="${p.contrast}"></span></div>`;
 if(state.tool==="filters")h=`<div class="tool-options">${["none","doc","bw","sepia","vivid"].map(x=>`<button class="chip ${p.filter===x?"active":""}" data-f="${x}">${x==="none"?"Original":x}</button>`).join("")}</div>`;
 if(state.tool==="rotate")h=`<div class="tool-options"><button class="chip" data-a="left">↶ 90° left</button><button class="chip" data-a="right">↷ 90° right</button><button class="chip" data-a="180">180°</button></div>`;
 if(state.tool==="crop")h=`<div class="tool-options"><span>Click four corners in order.</span><button class="chip" data-a="clearCrop">Clear</button><button class="chip" data-a="applyCrop">Apply crop</button></div>`;
 if(state.tool==="annotate")h=`<div class="tool-options"><span>Draw with mouse or finger.</span><input id="penColor" class="color" type="color" value="#e13b52"><button class="chip" data-a="clearMarks">Clear marks</button></div>`;
 if(state.tool==="signature")h=`<div class="tool-options"><span>Draw your signature on the page.</span><input id="sigColor" class="color" type="color" value="#173fd5"><button class="chip" data-a="clearMarks">Clear</button></div>`;
 if(state.tool==="text")h=`<div class="tool-options"><input id="textInput" placeholder="Text to add" style="background:#182337;color:#fff;border:1px solid #34445e;padding:7px;border-radius:7px"><button class="chip" data-a="addText">Add text</button></div>`;
 bar.innerHTML=h;
 bar.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{pushHistory();p.filter=b.dataset.f;render();buildToolbar()});
 bar.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>action(b.dataset.a));
 $("bright")?.addEventListener("input",e=>{p.brightness=+e.target.value;render()});$("cont")?.addEventListener("input",e=>{p.contrast=+e.target.value;render()});
}
function action(a){
 const p=page();if(!p)return;
 if(a==="auto"){pushHistory();p.filter="doc";p.contrast=20;p.brightness=7}
 if(a==="bw"){pushHistory();p.filter="bw"}
 if(a==="rotate"||a==="right"){pushHistory();p.rotation=(p.rotation+90)%360}
 if(a==="left"){pushHistory();p.rotation=(p.rotation+270)%360}
 if(a==="180"){pushHistory();p.rotation=(p.rotation+180)%360}
 if(a==="delete"){pushHistory();state.pages.splice(state.current,1);state.current=Math.min(state.current,state.pages.length-1)}
 if(a==="clearCrop")p.crop=[];
 if(a==="applyCrop")applyCrop();
 if(a==="clearMarks"){pushHistory();p.marks=[];p.texts=[]}
 if(a==="addText"){const t=$("textInput")?.value.trim();if(t){pushHistory();p.texts.push({text:t,x:80,y:120,size:48,color:"#111827"})}}
 render();refreshPages();buildToolbar()
}

async function applyCrop(){
 const p=page();if(!p.crop||p.crop.length!==4){toast("Choose four corners first");return}
 // High-quality client-side perspective crop using a small interpolation routine.
 const q=orderPoints(p.crop), top=Math.hypot(q[1].x-q[0].x,q[1].y-q[0].y),bot=Math.hypot(q[2].x-q[3].x,q[2].y-q[3].y),left=Math.hypot(q[3].x-q[0].x,q[3].y-q[0].y),right=Math.hypot(q[2].x-q[1].x,q[2].y-q[1].y);
 const W=Math.max(100,Math.round(Math.max(top,bot))),H=Math.max(100,Math.round(Math.max(left,right)));
 const src=document.createElement("canvas");src.width=canvas.width;src.height=canvas.height;src.getContext("2d").drawImage(canvas,0,0);
 const out=document.createElement("canvas");out.width=W;out.height=H;const ox=out.getContext("2d"),tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;
 // Use triangular affine mapping with drawImage is not available directly; approximate by clipping scanlines.
 const sctx=src.getContext("2d"),img=sctx.getImageData(0,0,src.width,src.height),dst=ox.createImageData(W,H);
 const bilinear=(u,v)=>{const x=(1-u)*(1-v)*q[0].x+u*(1-v)*q[1].x+u*v*q[2].x+(1-u)*v*q[3].x;const y=(1-u)*(1-v)*q[0].y+u*(1-v)*q[1].y+u*v*q[2].y+(1-u)*v*q[3].y;const ix=Math.max(0,Math.min(src.width-1,Math.round(x))),iy=Math.max(0,Math.min(src.height-1,Math.round(y)));const k=(iy*src.width+ix)*4;return[k,k+1,k+2,k+3]};
 for(let y=0;y<H;y++){const v=y/(H-1);for(let x=0;x<W;x++){const u=x/(W-1),k=(y*W+x)*4,r=bilinear(u,v);dst.data[k]=img.data[r[0]];dst.data[k+1]=img.data[r[1]];dst.data[k+2]=img.data[r[2]];dst.data[k+3]=255}}
 ox.putImageData(dst,0,0);const blob=await new Promise(r=>out.toBlob(r,"image/jpeg",.94));const np=await imageFile(new File([blob],"cropped.jpg",{type:"image/jpeg"}));pushHistory();state.pages[state.current]=np;toast("Perspective crop applied");refreshAll()
}
function orderPoints(a){const s=a.map(p=>p.x+p.y),d=a.map(p=>p.x-p.y);return[a[s.indexOf(Math.min(...s))],a[d.indexOf(Math.max(...d))],a[s.indexOf(Math.max(...s))],a[d.indexOf(Math.min(...d))]]}

canvas.addEventListener("pointerdown",e=>{
 const p=page();if(!p)return;
 if(state.tool==="crop"){const q=canvasPoint(e);p.crop=p.crop||[];if(p.crop.length<4)p.crop.push(q);render();buildToolbar();return}
 if(state.tool==="annotate"||state.tool==="signature"){pushHistory();p.marks.push({color:state.tool==="signature"?($("sigColor")?.value||"#173fd5"):($("penColor")?.value||"#e13b52"),width:Math.max(5,canvas.width/250),path:[canvasPoint(e)]});canvas.setPointerCapture?.(e.pointerId)}
});
canvas.addEventListener("pointermove",e=>{const p=page();if(!p||!p.marks.length)return;if(!canvas.hasPointerCapture?.(e.pointerId))return;const m=p.marks[p.marks.length-1];m.path.push(canvasPoint(e));render()});
canvas.addEventListener("pointerup",e=>canvas.releasePointerCapture?.(e.pointerId));
function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}

function switchPanel(name){document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));$(`${name}Panel`).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.panel===name))}
document.querySelectorAll(".nav[data-panel]").forEach(b=>b.onclick=()=>switchPanel(b.dataset.panel));
$("scanNow").onclick=()=>openCamera();$("cameraBtn").onclick=openCamera;$("closeCamera").onclick=closeCamera;$("captureBtn").onclick=capture;
$("importInput").onchange=e=>importFiles([...e.target.files]);$("welcomeInput").onchange=e=>importFiles([...e.target.files]);$("addMore").onclick=()=>$("importInput").click();$("goPages").onclick=()=>switchPanel("pages");
async function openCamera(){try{state.camera=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920}},audio:false});$("cameraVideo").srcObject=state.camera;$("cameraModal").classList.remove("hidden")}catch(e){toast("Camera permission was denied or unavailable.")}}
function closeCamera(){state.camera?.getTracks().forEach(t=>t.stop());state.camera=null;$("cameraModal").classList.add("hidden")}
function capture(){const v=$("cameraVideo"),c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);c.toBlob(async b=>{state.pages.push(await imageFile(new File([b],"camera-scan.jpg",{type:"image/jpeg"})));state.current=state.pages.length-1;closeCamera();refreshAll();toast("Page captured")}, "image/jpeg",.94)}

async function makePdf(indices=state.pages.map((_,i)=>i),quality=state.pdfQuality){
 const PDF=await loadPdfLib(),pdf=await PDF.PDFDocument.create();
 for(const i of indices){const old=state.current;state.current=i;render();const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",quality));const bytes=new Uint8Array(await blob.arrayBuffer());const img=await pdf.embedJpg(bytes);const page=pdf.addPage([595,842]);const sc=Math.min(555/img.width,802/img.height);page.drawImage(img,{x:(595-img.width*sc)/2,y:(842-img.height*sc)/2,width:img.width*sc,height:img.height*sc});state.current=old}
 return pdf.save()
}
function saveBytes(bytes,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([bytes],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
$("exportBtn").onclick=async()=>{if(!state.pages.length)return;toast("Creating PDF…");saveBytes(await makePdf(), "document.pdf","application/pdf");toast("PDF exported")};
$("mergePdf").onclick=async()=>{if(state.pages.length)saveBytes(await makePdf(),"merged-document.pdf","application/pdf")};
$("extractPdf").onclick=async()=>{const nums=prompt("Enter page numbers to extract, e.g. 1,3,4");if(!nums)return;const ids=nums.split(",").map(x=>+x.trim()-1).filter(x=>x>=0&&x<state.pages.length);if(ids.length)saveBytes(await makePdf(ids),"extracted-pages.pdf","application/pdf")};
$("pdfQuality").onchange=e=>state.pdfQuality=+e.target.value;

async function loadOcr(){if(window.Tesseract)return;await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js")}
$("runOcr").onclick=async()=>{if(!page())return;switchPanel("ocr");$("ocrPreview").innerHTML="";const pc=document.createElement("canvas");pc.width=canvas.width;pc.height=canvas.height;pc.getContext("2d").drawImage(canvas,0,0);$("ocrPreview").appendChild(pc);$("ocrStatus").textContent="Loading OCR…";await loadOcr();const result=await Tesseract.recognize(canvas.toDataURL("image/png"),"eng",{logger:m=>{if(m.progress)$("ocrStatus").textContent=`${Math.round(m.progress*100)}%`}});state.ocr=result.data.text;$("ocrText").value=state.ocr;$("ocrStatus").textContent="Complete"};
$("copyOcr").onclick=()=>navigator.clipboard?.writeText($("ocrText").value);$("downloadOcr").onclick=()=>saveBytes(new TextEncoder().encode($("ocrText").value),"ocr.txt","text/plain");

$("compressQuality").oninput=e=>$("qualityValue").textContent=e.target.value+"%";
$("compressImage").onclick=async()=>{if(!page())return;const target=+$("targetSize").value,max=+$("maxPixels").value,q0=+$("compressQuality").value/100;const p=page(),c=document.createElement("canvas"),sc=Math.min(1,max/Math.max(p.img.naturalWidth,p.img.naturalHeight));c.width=Math.max(1,Math.round(p.img.naturalWidth*sc));c.height=Math.max(1,Math.round(p.img.naturalHeight*sc));const x=c.getContext("2d");x.filter=cssFilter(p);x.drawImage(p.img,0,0,c.width,c.height);let q=q0,blob=await new Promise(r=>c.toBlob(r,"image/jpeg",q));if(target){for(let i=0;i<24&&blob.size>target;i++){q=Math.max(.03,q*.82);blob=await new Promise(r=>c.toBlob(r,"image/jpeg",q))}}$("compressionResult").textContent=`Result: ${(blob.size/1024).toFixed(1)} KB${target?(blob.size<=target?" — target reached.":" — target not reached at this quality/resolution."):""}`;saveBytes(await blob.arrayBuffer(),"compressed-image.jpg","image/jpeg")};
$("compressDocument").onclick=async()=>{if(!state.pages.length)return;const q=+$("compressQuality").value/100,b=await makePdf(state.pages.map((_,i)=>i),q),target=+$("targetSize").value;$("compressionResult").textContent=`PDF result: ${(b.length/1024).toFixed(1)} KB${target?(b.length<=target?" — target reached.":" — target not reached; further reduction may harm readability."):""}`;saveBytes(b,"compressed-document.pdf","application/pdf")};

$("newDoc")?.addEventListener("click",()=>{state.pages=[];state.current=-1;refreshAll()});
refreshAll();
})();