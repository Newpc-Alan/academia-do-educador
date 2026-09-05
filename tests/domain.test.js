import test from 'node:test';
import assert from 'node:assert/strict';
import {videoAtualizado,unirTrechos,segundosTrechos,projecaoPublica,pendenciasPublicacao,idValido} from '../functions/domain.js';
test('saltos até o fim não contam como reprodução',()=>{
 const a=videoAtualizado({}, {posicao:0,duracao:120,tocando:true},15);
 assert.equal(videoAtualizado(a,{posicao:119,duracao:120,tocando:false},15).assistido,0);
});
test('trechos repetidos não duplicam crédito',()=>{
 assert.equal(segundosTrechos(unirTrechos([[0,10],[5,20],[0,10],[30,40]])),30);
 assert.equal(videoAtualizado({posicao:0,tocando:true},{posicao:15,duracao:100,tocando:true},15).assistido,15);
});
test('ausência longa não credita horas',()=>{
 assert.equal(videoAtualizado({posicao:0,tocando:true},{posicao:500,duracao:900,tocando:true},1000).assistido,0);
});
test('projeção pública remove dados privados',()=>{
 assert.deepEqual(projecaoPublica({nome:'Ana',cpf:'123',email:'segredo',uid:'u',municipio:'X',escola:'Y',motivoRevogacao:'privado',ativo:true}),{nome:'Ana',ativo:true});
});
test('publicação incompleta e identificadores inválidos são rejeitados',()=>{
 assert.ok(pendenciasPublicacao({quizAtivo:true},[],[],[],{}).length>=4);assert.equal(idValido('../users/u'),false);
});
