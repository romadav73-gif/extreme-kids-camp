'use strict';
// Reproducible candidate only. Do NOT publish until server authorization,
// controlled data migration and final release gates are implemented.
const fs=require('node:fs');const crypto=require('node:crypto');
const out='audit-output/build';fs.mkdirSync(out,{recursive:true});
const basePath='growth-os/index.html',patches=['growth-os/sofa-cabinet-v4.patch.js','growth-os/sofa-cabinet-v4.1.patch.js','growth-os/audit65-fixes.patch.js'];
let html=fs.readFileSync(basePath,'utf8');const marker="document.addEventListener('click',handleClick);";
if(html.split(marker).length!==2)throw Error('Unexpected app bootstrap; build stopped');
const mobile=`\n(function(){const s=document.createElement('style');s.id='audit65-mobile-header';s.textContent=\`
.top-title>div{min-width:0;overflow:hidden}.top-title .crumb{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mobile-menu-btn{flex-shrink:0}
@media(max-width:560px){.topbar{gap:10px}.top-actions{gap:6px}.top-title{gap:9px;flex:1;min-width:0}.top-title h1{font-size:20px}.topbar [data-action="quickAdd"]{font-size:0;width:36px;height:40px;padding:0;flex-shrink:0}.topbar [data-action="quickAdd"]:after{content:"+";font-size:23px;line-height:1}.topbar .role-button{padding:6px}.topbar .role-button svg{width:12px}.top-actions>.btn-ghost{padding:8px}}
\`;document.head.appendChild(s)})();\n`;
html=html.replace(marker,patches.map(p=>fs.readFileSync(p,'utf8')).join('\n')+mobile+marker);
// Club workdays must not switch at UTC midnight. Freeze this source change in
// the build manifest and exercise its Moscow midnight boundary in regression.
const dateSource='const today=()=>new Date().toISOString().slice(0,10);';
if(html.split(dateSource).length!==2)throw Error('Unexpected club date helper');
html=html.replace(dateSource,"const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());");
if(html.includes('window.__qa65'))throw Error('Test instrumentation must never enter a distributable build');
fs.writeFileSync(out+'/index.html',html);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const manifest={version:'6.5',candidate:'2026.09.07-audit-r2',sourceCommit:process.env.GITHUB_SHA||null,status:'BLOCKED_NOT_DEPLOYED',reason:'Shared-key client roles are not server authorization; no atomic server compare-and-swap; no controlled production-data migration.',files:[basePath,...patches].map(p=>({path:p,sha256:sha(fs.readFileSync(p))})),outputSha256:sha(html),changes:['Header flex/min-width at mobile widths','Moscow club date instead of UTC date']};
fs.writeFileSync(out+'/manifest.json',JSON.stringify(manifest,null,2));
console.log('CANDIDATE_BUILD '+JSON.stringify(manifest));
