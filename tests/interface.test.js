import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
async function abrir(nome,extra=''){
 const html=readFileSync(nome,'utf8'),script=[...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)][0][1];
 const dom=new JSDOM(html,{url:'https://academia.example/'+nome+'?rapido',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:false});
 const codigo=script.replace(/apiKey:\s*"[^"]*"/,'apiKey:""');
 w.eval(codigo+'\n'+extra);await new Promise(r=>setTimeout(r,50));return dom;
}
test('aluno: catálogo, aula, notas e navegação sem erros de execução',async()=>{
 const dom=await abrir('index.html','window.testApp={E,T,Dados,renderizar,ligarAulaSegura};');const w=dom.window,d=w.document;
 try{
  assert.match(d.querySelector('#main').textContent,/Cursos em destaque/);
  const a=d.querySelector('a[href^="#/curso/"]');assert.ok(a);
  w.location.hash=a.hash;await new Promise(r=>setTimeout(r,30));assert.match(d.querySelector('#main').textContent,/aulas/i);
  const aula=d.querySelector('a[href^="#/aula/"]');assert.ok(aula);w.location.hash=aula.hash;await new Promise(r=>setTimeout(r,30));
  assert.ok(d.querySelector('#anotacaoAula'));assert.ok(d.querySelector('.modulos-mobile'));assert.ok(d.querySelector('#estadoProgresso'));
  d.querySelector('#anotacaoAula').value='Aplicar atividade na escola';d.querySelector('#salvarAnotacao').click();
  await new Promise(r=>setTimeout(r,10));assert.match(d.querySelector('#estadoAnotacao').textContent,/Demonstração/);
 }finally{w.close();}
});
test('admin: versão publicada protegida, publicação e relatório continuam acessíveis',async()=>{
 const dom=await abrir('admin.html');const w=dom.window,d=w.document;
 try{
  w.location.hash='#/curso/planejamento-ia/dados';await new Promise(r=>setTimeout(r,30));
  assert.match(d.querySelector('#tela').textContent,/protegida contra alterações/);
  w.location.hash='#/curso/planejamento-ia/publicar';await new Promise(r=>setTimeout(r,30));assert.equal(d.querySelector('#duplicarCurso').disabled,false);
  d.querySelector('#duplicarCurso').click();await new Promise(r=>setTimeout(r,40));assert.match(w.location.hash,/-v/);
  w.location.hash='#/relatorio';await new Promise(r=>setTimeout(r,30));assert.equal(d.querySelector('#btnRel').disabled,false);
  d.querySelector('#btnRel').click();await new Promise(r=>setTimeout(r,20));assert.match(d.querySelector('#resRel').textContent,/Todas as páginas/);
 }finally{w.close();}
});
test('validação pública aceita código legado e novo sem ler coleção diretamente',async()=>{
 const dom=await abrir('validar.html');const w=dom.window,d=w.document;
 try{
  d.querySelector('#codigo').value='AE-2026-ABCDEF123456';d.querySelector('#btn').click();await new Promise(r=>setTimeout(r,20));
  assert.match(d.querySelector('#resultado').textContent,/ainda não ativada/);
 }finally{w.close();}
});
