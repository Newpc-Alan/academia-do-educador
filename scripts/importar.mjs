/* ============================================================================
   IMPORTAÇÃO DO CONTEÚDO INICIAL
   Roda UMA VEZ para popular o Firestore com os 10 cursos e 4 trilhas.
   Depois disso todo o conteúdo passa a ser editado pelo painel administrativo.

   COMO RODAR
     1. Console do Firebase > Configurações > Contas de serviço
        > Gerar nova chave privada  →  salve como scripts/chave-servico.json
     2. cd scripts && npm install firebase-admin
     3. node importar.mjs

   É seguro rodar de novo: usa merge e não duplica nada.
   Rode com --limpar para apagar o conteúdo anterior antes de importar.

   ATENÇÃO: nunca versione o arquivo chave-servico.json. Ele dá acesso total
   ao projeto. Já está no .gitignore.
   ========================================================================== */

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { CURSOS, TRILHAS, QUESTOES_EXEMPLO } from "./conteudo-inicial.js";

const chave = JSON.parse(readFileSync(new URL("./chave-servico.json", import.meta.url)));
initializeApp({ credential: cert(chave) });
const db = getFirestore();

const LIMPAR = process.argv.includes("--limpar");
const log = (...a) => console.log(...a);

async function apagarColecao(caminho) {
  const snap = await db.collection(caminho).get();
  await Promise.all(snap.docs.map(d => d.ref.delete()));
  return snap.size;
}

async function apagarCursoInteiro(cursoId) {
  for (const sub of ["modulos", "aulas", "questoes", "gabarito"]) {
    await apagarColecao(`cursos/${cursoId}/${sub}`);
  }
  await db.doc(`cursos/${cursoId}`).delete();
}

async function importar() {
  log("\n=== Academia do Educador — importação de conteúdo ===\n");

  if (LIMPAR) {
    log("Limpando conteúdo anterior…");
    for (const c of CURSOS) await apagarCursoInteiro(c.id);
    await apagarColecao("trilhas");
    log("  conteúdo anterior removido\n");
  }

  // ---------- CURSOS ----------
  for (const c of CURSOS) {
    const trilhasDoCurso = TRILHAS.filter(t => t.cursos.includes(c.id)).map(t => t.id);
    const temQuiz = Boolean(QUESTOES_EXEMPLO[c.id]);

    // Conta as aulas antes de gravar — o app do aluno usa esse número para
    // calcular percentual sem precisar ler a subcoleção inteira.
    const totalAulas = c.modulos.reduce((s, m) => s + m.a.length, 0);

    await db.doc(`cursos/${c.id}`).set({
      titulo: c.titulo,
      resumo: c.resumo,
      descricao: "",
      nivel: c.nivel,
      horas: c.horas,
      ordem: c.ordem,
      status: "publicado",
      capaURL: "",
      capaPath: "",
      trilhas: trilhasDoCurso,
      totalAulas,
      quizAtivo: temQuiz,
      quizNotaCorte: 70,
      quizTentativasMax: 3,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
      publicadoEm: FieldValue.serverTimestamp(),
      origem: "importacao-inicial"
    }, { merge: true });

    // ---------- MÓDULOS E AULAS ----------
    // IDs estáveis e legíveis (m1, m1a2). Diferente do modelo antigo, que
    // gravava progresso por posição, aqui inserir uma aula no meio do módulo
    // não desloca o progresso de ninguém.
    let ordemAula = 0;
    for (let iM = 0; iM < c.modulos.length; iM++) {
      const m = c.modulos[iM];
      const moduloId = `m${iM + 1}`;

      await db.doc(`cursos/${c.id}/modulos/${moduloId}`).set({
        titulo: m.t, ordem: iM + 1
      }, { merge: true });

      for (let iA = 0; iA < m.a.length; iA++) {
        ordemAula++;
        await db.doc(`cursos/${c.id}/aulas/${moduloId}a${iA + 1}`).set({
          moduloId,
          titulo: m.a[iA],
          ordem: ordemAula,
          duracaoMin: 0,
          texto: "",
          videos: [],      // [{ titulo, youtubeId }]
          materiais: []    // [{ titulo, tipo, url, path, bytes }]
        }, { merge: true });
      }
    }

    // ---------- QUESTÕES E GABARITO ----------
    const questoes = QUESTOES_EXEMPLO[c.id];
    if (questoes) {
      for (let i = 0; i < questoes.length; i++) {
        const q = questoes[i];
        const qid = `q${i + 1}`;
        // Enunciado e alternativas: leitura pública
        await db.doc(`cursos/${c.id}/questoes/${qid}`).set({
          enunciado: q.enunciado, alternativas: q.alternativas, ordem: i + 1
        }, { merge: true });
        // Resposta certa: coleção separada, ilegível para o cliente
        await db.doc(`cursos/${c.id}/gabarito/${qid}`).set({
          correta: q.correta, explicacao: q.explicacao
        }, { merge: true });
      }
    }

    log(`  ✓ ${c.titulo}`);
    log(`      ${c.modulos.length} módulos · ${totalAulas} aulas · ${c.horas}h${questoes ? ` · ${questoes.length} questões` : " · sem quiz"}`);
  }

  // ---------- TRILHAS ----------
  log("");
  for (const t of TRILHAS) {
    const horas = t.cursos.reduce((s, id) => s + (CURSOS.find(c => c.id === id)?.horas || 0), 0);
    await db.doc(`trilhas/${t.id}`).set({
      nome: t.nome, resumo: t.resumo, ordem: t.ordem,
      cursos: t.cursos, horas, status: "publicado",
      atualizadoEm: FieldValue.serverTimestamp()
    }, { merge: true });
    log(`  ✓ Trilha: ${t.nome} (${t.cursos.length} cursos · ${horas}h)`);
  }

  const totalHoras = CURSOS.reduce((s, c) => s + c.horas, 0);
  const totalAulas = CURSOS.reduce((s, c) => s + c.modulos.reduce((x, m) => x + m.a.length, 0), 0);

  log(`\n=== Concluído ===`);
  log(`${CURSOS.length} cursos · ${TRILHAS.length} trilhas · ${totalAulas} aulas · ${totalHoras} horas`);
  log(`\nPróximo passo: abra o painel em admin.html e comece a anexar vídeos e materiais.\n`);
}

importar().catch(e => { console.error("\nFalha na importação:", e); process.exit(1); });
