import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const temp=mkdtempSync(join(tmpdir(),'academia-check-'));
try{
 for(const nome of ['index.html','admin.html','validar.html']){
  const html=readFileSync(nome,'utf8');let i=0;
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   if(/application\/ld\+json/.test(m[1])){JSON.parse(m[2]);continue;}
   const file=join(temp,`${nome}-${i++}.mjs`);writeFileSync(file,m[2]);
   const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0)throw new Error(nome+'\n'+r.stderr);
  }
  console.log(nome+': sintaxe válida');
 }
 for(const f of ['firebase.json','firestore.indexes.json','functions/package.json'])JSON.parse(readFileSync(f,'utf8'));
 console.log('Configurações JSON válidas.');
}finally{rmSync(temp,{recursive:true,force:true});}
