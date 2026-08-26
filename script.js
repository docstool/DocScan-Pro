import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
const {PDFDocument, degrees}=window.PDFLib;
const $=id=>document.getElementById(id);
let pages=[],current=-1,ocrText="",tool="none",stream=null,selectedPdf=new Set();

const page=()=>pages[current];
const toast=t=>{$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)};
function addImageFile(file){const im=new Image();im.onload=()=>{pages.push({img:im,rotation:0,filter:"none",brightness:0,contrast:0,saturation:0,points:[],marks:[]});current=pages.length-1;showDoc();render();thumbs();};im.src=URL.createObjectURL(file)}
async function importPDF(file){
  toast("Opening PDF…"); const data=new Uint8Array(await file.arrayBuffer()); const pdf=await pdfjsLib.getDocument({data}).promise;
  for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),vp=pg.getViewport({scale:1.5});const c=document.createElement("canvas");c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;const im=new Image();await new Promise(r=>{im.onload=r;im.src=c.toDataURL("image/jpeg",.9)});pages.push({img:im,rotation:0,filter:"none",brightness:0,contrast:0,saturation:0,points:[],marks:[]})}
  current=pages.length-1;showDoc();render();thumbs();toast(`Imported ${pdf.numPages} PDF page(s)`);
}
async function importFiles(files){for(const f of files){if(f.type==="application/pdf"||f.name.toLowerCase().endsWith(".pdf"))await importPDF(f);else if(f.type.startsWith("image/"))addImageFile(f)}}
function showDoc(){$("empty").classList.add("hidden");$("scanEditor").classList.remove("hidden");$("addImages").disabled=false;$("deletePage").disabled=false;$("jpg").disabled=false;$("png").disabled=false;$("compressCurrent").disabled=false;$("title").textContent="Document Scan"}
function thumbs(){let box=$("thumbs");box.innerHTML="";pages.forEach((p,i)=>{let d=document.createElement("div");d.className="thumb "+(i===current?"active":"");d.innerHTML=`<img src="${p.img.src}"><small>Page ${i+1}</small>`;d.onclick=()=>{current=i;thumbs();render()};box.appendChild(d)});$("count").textContent=`${pages.length} page${pages.length===1?"":"s"}`;$("savePdf").disabled=!pages.length}
function filter(p){let f=`brightness(${1+p.brightness/100}) contrast(${1+p.contrast/100}) saturate(${1+p.saturation/100})`;if(p.filter==="gray")f+=" grayscale(1)";if(p.filter==="document")f+=" grayscale(1) contrast(1.35)";if(p.filter==="sepia")f+=" sepia(1)";if(p.filter==="photo")f+=" saturate(1.25) contrast(1.05)";return f}
function render(){
 let p=page();if(!p)return;let w=p.img.naturalWidth,h=p.img.naturalHeight;if(p.rotation%180)[w,h]=[h,w];$("canvas").width=w;$("canvas").height=h;$("overlay").width=w;$("overlay").height=h;
 ctx.save();ctx.clearRect(0,0,w,h);ctx.translate(w/2,h/2);ctx.rotate(p.rotation*Math.PI/180);ctx.filter=filter(p);let sc=Math.min(w/p.img.naturalWidth,h/p.img.naturalHeight);ctx.drawImage(p.img,-p.img.naturalWidth*sc/2,-p.img.naturalHeight*sc/2,p.img.naturalWidth*sc,p.img.naturalHeight*sc);ctx.restore();ctx.filter="none";
 octx.clearRect(0,0,w,h);if(tool==="crop"&&p.points.length)drawPoints(p.points);p.marks.forEach(m=>{octx.strokeStyle=m.color;octx.lineWidth=m.width;octx.beginPath();m.path.forEach((q,i)=>i?octx.lineTo(q.x,q.y):octx.moveTo(q.x,q.y));octx.stroke()});
}
const canvas=$("canvas"),ctx=canvas.getContext("2d"),overlay=$("overlay"),octx=overlay.getContext("2d");
function drawPoints(pt){octx.strokeStyle="#5fe4ff";octx.lineWidth=Math.max(4,canvas.width/250);octx.beginPath();pt.forEach((q,i)=>i?octx.lineTo(q.x,q.y):octx.moveTo(q.x,q.y));octx.closePath();octx.stroke();octx.fillStyle="#5fe4ff";pt.forEach(q=>{octx.beginPath();octx.arc(q.x,q.y,9,0,7);octx.fill()})}

$("fileInput").onchange=e=>importFiles([...e.target.files]);$("emptyInput").onchange=e=>importFiles([...e.target.files]);$("pdfInput").onchange=e=>importFiles([...e.target.files]);$("addImages").onclick=()=>$("fileInput").click();$("startCamera").onclick=()=>$("cameraBtn").click();$("cameraBtn").onclick=openCamera;$("closeCamera").onclick=closeCamera;$("capture").onclick=capture;
$("newDoc")?.addEventListener("click",()=>{pages=[];current=-1;ocrText="";$("empty").classList.remove("hidden");$("scanEditor").classList.add("hidden");thumbs()});
$("deletePage").onclick=()=>{if(current<0)return;pages.splice(current,1);current=Math.min(current,pages.length-1);if(current<0){$("empty").classList.remove("hidden");$("scanEditor").classList.add("hidden")}else render();thumbs()};
document.querySelectorAll(".side[data-view]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".side[data-view]").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$(b.dataset.view+"View").classList.add("active")});
document.querySelectorAll(".tool").forEach(b=>b.onclick=()=>{tool=b.dataset.tool;document.querySelectorAll(".tool").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()});

async function openCamera(){try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});$("video").srcObject=stream;$("cameraModal").classList.remove("hidden");$("camStatus").textContent="Camera ready"}catch(e){toast("Camera permission unavailable")}}
function closeCamera(){stream?.getTracks().forEach(t=>t.stop());$("cameraModal").classList.add("hidden")}
function capture(){let v=$("video"),c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);c.toBlob(b=>{addImageFile(new File([b],"camera.jpg",{type:"image/jpeg"}));closeCamera()},"image/jpeg",.95)}

async function makePDF(pageIndexes=pages.map((_,i)=>i),quality=.86){
 const pdf=await PDFDocument.create();
 for(const i of pageIndexes){current=i;render();const img=await pdf.embedJpg(canvas.toDataURL("image/jpeg",quality));const pw=595,ph=842;let sc=Math.min(pw/img.width,ph/img.height);const p=pdf.addPage([pw,ph]);p.drawImage(img,{x:(pw-img.width*sc)/2,y:(ph-img.height*sc)/2,width:img.width*sc,height:img.height*sc})}
 return pdf.save();
}
$("savePdf").onclick=async()=>{let b=await makePDF();downloadBlob(b,"document-scan.pdf","application/pdf")};
function downloadBlob(data,name,type){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click()}
function currentBlob(type,quality=.92){return new Promise(r=>canvas.toBlob(r,type,quality))}
$("jpg").onclick=async()=>downloadBlob(await (await currentBlob("image/jpeg")).arrayBuffer(),"scan.jpg","image/jpeg");
$("png").onclick=async()=>downloadBlob(await (await currentBlob("image/png")).arrayBuffer(),"scan.png","image/png");
$("txt").onclick=()=>downloadBlob(new TextEncoder().encode(ocrText),"ocr.txt","text/plain");

$("runOCR").onclick=async()=>{if(!page())return;let st=$("ocrStatus");st.textContent=" OCR running…";let r=await Tesseract.recognize(canvas.toDataURL("image/png"),"eng",{logger:m=>{if(m.progress)st.textContent=` ${Math.round(m.progress*100)}%`}});ocrText=r.data.text;$("ocrText").value=ocrText;st.textContent=" Done";$("txt").disabled=false;toast("OCR complete")};
$("copyOCR").onclick=()=>navigator.clipboard?.writeText($("ocrText").value||ocrText);
$("downloadSearchable").onclick=()=>downloadBlob(new TextEncoder().encode($("ocrText").value||ocrText),"ocr.txt","text/plain");

document.querySelectorAll(".tool").forEach(b=>b.onclick=()=>{tool=b.dataset.tool;render()});
canvas.onclick=e=>{if(tool!=="crop")return;let r=canvas.getBoundingClientRect(),p=page();if(p.points.length<4)p.points.push({x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height});render()};
$("rotatePage").onclick=()=>{if(current>=0){page().rotation=(page().rotation+90)%360;render();thumbs()}};
$("removeSelected").onclick=()=>{let ids=[...selectedPdf].sort((a,b)=>b-a);ids.forEach(i=>pages.splice(i,1));selectedPdf.clear();current=Math.min(current,pages.length-1);thumbs();if(current>=0)render()};
$("duplicatePage").onclick=()=>{if(current<0)return;let p=page();pages.splice(current+1,0,{...p});current++;thumbs();render()};
$("mergeFiles").onclick=()=>{if(!pages.length)toast("Import files first");else toast("All imported pages are already merged into the document")};
$("splitPdf").onclick=async()=>{if(!pages.length)return;let ids=selectedPdf.size?[...selectedPdf]:[...pages.keys()];let b=await makePDF(ids,.9);downloadBlob(b,"selected-pages.pdf","application/pdf")};

function buildPdfCards(){let box=$("pdfPages");box.innerHTML="";pages.forEach((p,i)=>{let d=document.createElement("div");d.className="pdf-card "+(selectedPdf.has(i)?"selected":"");d.innerHTML=`<img src="${p.img.src}"><div class="meta">Page ${i+1} • click to select</div>`;d.onclick=()=>{selectedPdf.has(i)?selectedPdf.delete(i):selectedPdf.add(i);buildPdfCards()};box.appendChild(d)})}
new MutationObserver(buildPdfCards).observe($("pdfPages"),{childList:true});

$("quality").oninput=e=>$("qualityOut").textContent=e.target.value+"%";
$("compressCurrent").onclick=async()=>{let target=Number($("target").value),max=Number($("maxDim").value)||1800;let p=page();let c=document.createElement("canvas"),sc=Math.min(1,max/Math.max(p.img.naturalWidth,p.img.naturalHeight));c.width=Math.round(p.img.naturalWidth*sc);c.height=Math.round(p.img.naturalHeight*sc);let x=c.getContext("2d");x.filter=filter(p);x.drawImage(p.img,0,0,c.width,c.height);let q=Number($("quality").value)/100,blob=await new Promise(r=>c.toBlob(r,"image/jpeg",q));if(target>0){for(let i=0;i<18&&blob.size>target;i++){q=Math.max(.08,q*.82);blob=await new Promise(r=>c.toBlob(r,"image/jpeg",q))}}$("compressResult").textContent=`Result: ${(blob.size/1024).toFixed(1)} KB${target&&blob.size<=target?" — target reached.":" — target may be below the practical readable limit."}`;downloadBlob(await blob.arrayBuffer(),"compressed-scan.jpg","image/jpeg")};
$("compressPdf").onclick=async()=>{if(!pages.length)return;let target=Number($("target").value),q=Number($("quality").value)/100;let b=await makePDF(pages.map((_,i)=>i),q);if(target>0&&b.length>target)toast(`PDF is ${(b.length/1024).toFixed(0)} KB; a readable PDF cannot always be reduced below ${target/1024} KB.`);downloadBlob(b,"compressed-document.pdf","application/pdf")};

let drawing=false,last=null;
canvas.onpointerdown=e=>{if(!["annotate","sign"].includes(tool))return;drawing=true;last=pt(e);page().marks.push({color:tool==="sign"?"#153bdd":"#e21f49",width:Math.max(4,canvas.width/250),path:[last]})};
canvas.onpointermove=e=>{if(!drawing)return;let q=pt(e),m=page().marks.at(-1);m.path.push(q);last=q;render()};
canvas.onpointerup=canvas.onpointerleave=()=>drawing=false;
function pt(e){let r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}

$("pdfInput").addEventListener("change",e=>{selectedPdf.clear();setTimeout(buildPdfCards,300)});
