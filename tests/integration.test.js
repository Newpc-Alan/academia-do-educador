import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {ref,uploadBytes,deleteObject} from 'firebase/storage';
import {doc,getDoc,getDocs,collection,query,where,setDoc,updateDoc,serverTimestamp} from 'firebase/firestore';
process.env.GCLOUD_PROJECT='demo-academia';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Execute somente com npm run test:emulator.');
let env,fn,db;
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-academia',firestore:{rules:readFileSync('firestore.rules','utf8')},storage:{rules:readFileSync('storage.rules','utf8')}});
 fn=await import('../functions/index.js');
 const {getFirestore}=await import('../functions/node_modules/firebase-admin/lib/firestore/index.js');db=getFirestore();
});
after(async()=>{await env?.cleanup();await db?.terminate();});
beforeEach(async()=>{await env.clearFirestore();});
const req=(data,uid='aluno',papel)=>({data,auth:uid?{uid,token:{email:uid+'@example.com',...(papel?{papel}:{})}}:undefined});
async function curso(){
 await db.doc('cursos/curso').set({titulo:'Curso teste',resumo:'Resumo',status:'publicado',horas:2,quizAtivo:true,quizPorProva:3,quizNotaCorte:70,quizTentativasMax:3,totalAulas:1});
 await db.doc('cursos/curso/modulos/m1').set({titulo:'Módulo',ordem:1});
 await db.doc('cursos/curso/aulas/a1').set({titulo:'Aula',texto:'Texto da aula',moduloId:'m1',duracaoMin:1,ordem:1});
 for(let i=1;i<=3;i++){await db.doc('cursos/curso/questoes/q'+i).set({enunciado:'Questão '+i,alternativas:['Sim','Não']});await db.doc('cursos/curso/gabarito/q'+i).set({correta:0,explicacao:'Explicação'});}
 await db.doc('users/aluno').set({nome:'Ana Teste',cpf:'52998224725',email:'aluno@example.com'});
}
async function concluido(){await db.doc('users/aluno/progresso/curso').set({aulas:['a1'],aulasVerificadas:['a1'],progressoVersao:2,concluido:true,iniciadoServidorISO:'2026-09-05T08:00:00Z',concluidoEmISO:'2026-09-05T09:00:00Z'});}
test('certificados: anônimo e outro aluno bloqueados; titular e admin autorizados; projeção segura',async()=>{
 await db.doc('certificados/AE-2026-ABC123').set({uid:'aluno',cursoId:'curso',cpf:'52998224725',email:'aluno@example.com',nome:'Ana',ativo:true});
 const anon=env.unauthenticatedContext().firestore(),a=env.authenticatedContext('aluno').firestore(),outro=env.authenticatedContext('outro').firestore(),adm=env.authenticatedContext('adm',{papel:'admin'}).firestore();
 await assertFails(getDoc(doc(anon,'certificados/AE-2026-ABC123')));await assertFails(getDocs(collection(anon,'certificados')));
 await assertFails(getDoc(doc(outro,'certificados/AE-2026-ABC123')));await assertSucceeds(getDoc(doc(a,'certificados/AE-2026-ABC123')));
 await assertSucceeds(getDocs(query(collection(a,'certificados'),where('uid','==','aluno'))));await assertSucceeds(getDoc(doc(adm,'certificados/AE-2026-ABC123')));
 const r=await fn.consultarCertificado.run(req({codigo:'AE-2026-ABC123'},null));assert.equal(r.encontrado,true);assert.equal(r.certificado.cpf,undefined);assert.equal(r.certificado.email,undefined);
});
test('aluno não altera progresso, nota, certificado ou papel; anotações permitidas',async()=>{
 const a=env.authenticatedContext('aluno',{email:'aluno@example.com'}).firestore();
 for(const path of ['users/aluno/progresso/curso','users/aluno/tentativas/curso','certificados/falso','equipe/aluno'])await assertFails(setDoc(doc(a,path),{aprovado:true}));
 await assertFails(setDoc(doc(a,'users/aluno'),{email:'aluno@example.com',papel:'admin'}));
 await assertSucceeds(setDoc(doc(a,'users/aluno'),{email:'aluno@example.com',nome:'Ana Teste'}));
 await assertSucceeds(setDoc(doc(a,'users/aluno/anotacoes/curso_a1'),{texto:'Anotação',atualizadoEm:serverTimestamp()}));
});
test('editor não cria curso publicado nem altera versão publicada',async()=>{
 await curso();const e=env.authenticatedContext('editor',{papel:'editor'}).firestore();
 await assertFails(setDoc(doc(e,'cursos/burla'),{status:'publicado'}));await assertFails(updateDoc(doc(e,'cursos/curso'),{quizAtivo:false}));
 await assertFails(updateDoc(doc(e,'cursos/curso/aulas/a1'),{texto:'Alterado'}));await assertSucceeds(setDoc(doc(e,'cursos/rascunho'),{status:'rascunho',titulo:'Novo'}));
 await assert.rejects(fn.publicarCurso.run(req({cursoId:'curso',status:'publicado'},'editor','editor')));
});
test('publicação valida conteúdo e cópia cria versão independente',async()=>{
 await curso();await db.doc('cursos/vazio').set({status:'rascunho'});
 await assert.rejects(fn.publicarCurso.run(req({cursoId:'vazio',status:'publicado'},'adm','admin')),/Preencha/);
 const r=await fn.duplicarCurso.run(req({cursoId:'curso'},'adm','admin'));
 assert.equal((await db.doc('cursos/'+r.id).get()).data().status,'rascunho');assert.equal((await db.doc('cursos/'+r.id+'/aulas/a1').get()).exists,true);
 await fn.publicarCurso.run(req({cursoId:r.id,status:'publicado'},'adm','admin'));assert.equal((await db.doc('cursos/'+r.id).get()).data().historicoPublicado,true);
 await assert.rejects(fn.excluirCurso.run(req({cursoId:r.id},'adm','admin')),/histórico/);
});
test('conclusão exige sessão e tempo; token de outra aba é rejeitado',async()=>{
 await curso();await db.doc('users/aluno/progresso/curso').set({aulas:['a1'],concluido:true,concluidoEmISO:'2000-01-01T00:00:00Z'});const s=await fn.iniciarAula.run(req({cursoId:'curso',aulaId:'a1'}));
 await assert.rejects(fn.acompanharAula.run(req({cursoId:'curso',aulaId:'a1',token:'falso',concluir:true})),/outra aba/);
 let r;for(let i=0;i<4;i++){await db.doc('users/aluno/sessoes/curso').update({ultimoMs:Date.now()-16000});r=await fn.acompanharAula.run(req({cursoId:'curso',aulaId:'a1',token:s.token,ativo:true,concluir:true}));if(i===0)assert.equal(r.concluida,false);}
 assert.equal(r.concluida,true);assert.deepEqual(r.progresso.aulasVerificadas,['a1']);assert.notEqual(r.progresso.concluidoEmISO,'2000-01-01T00:00:00Z');
 const s2=await fn.iniciarAula.run(req({cursoId:'curso',aulaId:'a1'}));assert.notEqual(s.token,s2.token);
});
test('progresso legado não libera nova prova ou certificação sem revalidação',async()=>{
 await curso();await db.doc('users/aluno/progresso/curso').set({aulas:['a1'],concluido:true});
 await assert.rejects(fn.sortearProva.run(req({cursoId:'curso'})),/acompanhamento atualizado/);
 await assert.rejects(fn.emitirCertificado.run(req({cursoId:'curso'})),/acompanhamento atualizado/);
});
test('sorteio, correção e emissão simultâneos são idempotentes; gabarito congelado',async()=>{
 await curso();await concluido();const provas=await Promise.all(Array.from({length:3},()=>fn.sortearProva.run(req({cursoId:'curso'}))));
 assert.equal(new Set(provas.map(p=>p.provaId)).size,1);const p=provas[0],secreto=(await db.doc('users/aluno/provas/'+p.provaId).get()).data();
 const respostas=Object.fromEntries(secreto.itens.map(i=>[i.questaoId,i.ordem.indexOf(i.correta)]));
 await fn.salvarRespostas.run(req({provaId:p.provaId,respostas}));assert.deepEqual((await fn.sortearProva.run(req({cursoId:'curso'}))).respostas,respostas);
 await db.doc('cursos/curso/gabarito/q1').update({correta:1});
 const resultados=await Promise.all(Array.from({length:3},()=>fn.corrigirQuiz.run(req({provaId:p.provaId,respostas}))));assert.ok(resultados.every(r=>r.nota===100&&r.tentativasUsadas===1));
 assert.equal((await db.doc('users/aluno/tentativas/curso').get()).data().tentativas,1);
 const certs=await Promise.all(Array.from({length:3},()=>fn.emitirCertificado.run(req({cursoId:'curso'}))));assert.equal(new Set(certs.map(c=>c.codigo)).size,1);assert.equal((await db.collection('certificados').get()).size,1);
 const codigo=certs[0].codigo;await fn.revogarCertificado.run(req({codigo,motivo:'Teste de revogação'},'adm','admin'));await assert.rejects(fn.emitirCertificado.run(req({cursoId:'curso'})),/revogado/);
});
test('relatório pagina e exclui revogados dos totais',async()=>{
 const batch=db.batch();for(let i=0;i<102;i++)batch.set(db.doc('users/u'+String(i).padStart(3,'0')),{nome:'Pessoa '+i,municipio:'Cidade'});
 batch.set(db.doc('certificados/ativo'),{uid:'u000',ativo:true,cargaHoraria:10});batch.set(db.doc('certificados/revogado'),{uid:'u000',ativo:false,cargaHoraria:50});await batch.commit();
 const a=await fn.relatorioAdesao.run(req({municipio:'Cidade'},'adm','admin'));assert.equal(a.totalProfessores,100);assert.equal(a.totalHoras,10);assert.ok(a.proximoCursor);
 const b=await fn.relatorioAdesao.run(req({municipio:'Cidade',cursor:a.proximoCursor},'adm','admin'));assert.equal(b.totalProfessores,2);assert.equal(b.proximoCursor,null);
});
test('vídeo: saltos não concluem e trechos contínuos são persistidos no Firestore',async()=>{
 await curso();await db.doc('cursos/curso/aulas/a1').update({videos:[{youtubeId:'abcdefghijk'}]});
 const s=await fn.iniciarAula.run(req({cursoId:'curso',aulaId:'a1'}));
 const chamada=async posicao=>{await db.doc('users/aluno/sessoes/curso').update({ultimoMs:Date.now()-16000});return fn.acompanharAula.run(req({cursoId:'curso',aulaId:'a1',token:s.token,ativo:true,concluir:true,video:{id:'abcdefghijk',posicao,duracao:120,tocando:true}}));};
 await chamada(0);const salto=await chamada(119);assert.equal(salto.concluida,false);assert.equal(salto.segundos,0);
 await chamada(0);let r;for(let i=15;i<=120;i+=15)r=await chamada(i);
 assert.equal(r.concluida,true);
 const registro=(await db.doc('users/aluno/sessoes/curso').get()).data();assert.ok(registro.videos.abcdefghijk.trechos[0].fim>=108);
});
test('Storage aceita criação autorizada e impede sobrescrita, exclusão e SVG',async()=>{
 const storage=env.authenticatedContext('editor',{papel:'editor'}).storage();
 const arquivo=ref(storage,'capas/novo-'+Date.now()+'.png');
 await assertSucceeds(uploadBytes(arquivo,new Uint8Array([1,2,3]),{contentType:'image/png'}));
 await assertFails(uploadBytes(arquivo,new Uint8Array([4,5,6]),{contentType:'image/png'}));
 await assertFails(deleteObject(arquivo));
 await assertFails(uploadBytes(ref(storage,'capas/novo.svg'),new Uint8Array([1]),{contentType:'image/svg+xml'}));
 await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(),'capas/anon.png'),new Uint8Array([1]),{contentType:'image/png'}));
});
