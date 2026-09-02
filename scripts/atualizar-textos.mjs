/* ============================================================================
   ATUALIZAR SOMENTE OS TEXTOS

   Reescreve título e resumo dos cursos e das trilhas no Firestore, sem tocar
   em mais nada. Diferente do `importar.mjs`, este script NÃO mexe em capa,
   situação de publicação, módulos, aulas, questões nem gabarito.

   Use quando quiser corrigir a redação do catálogo sem perder o trabalho que
   a equipe já fez em cima dele.

   COMO RODAR
     cd scripts
     node atualizar-textos.mjs

   Precisa do scripts/chave-servico.json, o mesmo usado na importação.
   ========================================================================== */

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { CURSOS, TRILHAS } from "./conteudo-inicial.js";

const chave = JSON.parse(readFileSync(new URL("./chave-servico.json", import.meta.url)));
initializeApp({ credential: cert(chave) });
const db = getFirestore();

console.log("\n=== Atualizando textos do catálogo ===\n");

let alterados = 0, ausentes = 0;

for (const c of CURSOS) {
  const ref = db.doc(`cursos/${c.id}`);
  const snap = await ref.get();

  if (!snap.exists) {
    console.log(`  ! ${c.id} não existe mais no banco, pulando`);
    ausentes++;
    continue;
  }

  const atual = snap.data();
  if (atual.titulo === c.titulo && atual.resumo === c.resumo) {
    console.log(`  · ${c.titulo} (já estava atualizado)`);
    continue;
  }

  await ref.set({
    titulo: c.titulo,
    resumo: c.resumo,
    atualizadoEm: FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(`  ✓ ${c.titulo}`);
  if (atual.resumo !== c.resumo) console.log(`      ${c.resumo}`);
  alterados++;
}

console.log("");

for (const t of TRILHAS) {
  const ref = db.doc(`trilhas/${t.id}`);
  if (!(await ref.get()).exists) { console.log(`  ! trilha ${t.id} não existe`); ausentes++; continue; }
  await ref.set({ nome: t.nome, resumo: t.resumo, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`  ✓ Trilha: ${t.nome}`);
  alterados++;
}

console.log(`\n=== Concluído ===`);
console.log(`${alterados} registros atualizados${ausentes ? `, ${ausentes} não encontrados` : ""}`);
console.log(`\nCapas, módulos, aulas e questões ficaram intactos.\n`);
