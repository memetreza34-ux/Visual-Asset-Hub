import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const manifestPath=path.join(root,'.local-storage','inbox-analysis','manifest.json');
if(!fs.existsSync(manifestPath)){console.error('Kein Inbox-Manifest gefunden. Zuerst: npm run inbox:scan');process.exit(1)}
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
console.log(`\nVisual Asset Hub – Review Queue\n${manifest.ready.length} bereit, ${manifest.failed.length} fehlgeschlagen\n`);
manifest.ready.forEach((a,i)=>{const t=a.technical||{};console.log(`[${i+1}] ${a.file}\n    ${t.width||'?'}x${t.height||'?'} | ${t.durationSeconds??'?'}s | ${t.fps??'?'} fps | ${a.orientation||'?'} | ${t.codec||'?'}\n    Preview: ${a.previewPath||'keine'}\n`)});
if(manifest.failed.length){console.log('Fehler:');manifest.failed.forEach(x=>console.log(`- ${x.file}: ${x.error}`));}
console.log('Nächster Schritt pro Asset: npm run asset:add -- --file <datei> ...');