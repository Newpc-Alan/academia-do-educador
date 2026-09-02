/* ============================================================================
   DEFINIR O PRIMEIRO ADMINISTRADOR

   Problema do ovo e da galinha: a Function `definirPapel` exige que quem chama
   já seja admin. Então o primeiro admin precisa ser criado por fora, com a
   chave de serviço. Deste ponto em diante, tudo é feito pelo painel.

   COMO RODAR
     1. A pessoa precisa ter entrado na Academia pelo menos UMA VEZ
        (é isso que cria a conta no Firebase Authentication)
     2. node definir-admin.mjs alan@newpc.com.br
     3. A pessoa sai da conta e entra de novo — o token só recebe o novo
        papel quando é reemitido

   Também aceita o papel como segundo argumento:
     node definir-admin.mjs maria@newpc.com.br editor
   ========================================================================== */

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const email = process.argv[2];
const papel = process.argv[3] || "admin";

if (!email) {
  console.error("\nUso: node definir-admin.mjs <email> [admin|editor]\n");
  process.exit(1);
}
if (!["admin", "editor"].includes(papel)) {
  console.error("\nPapel inválido. Use 'admin' ou 'editor'.\n");
  process.exit(1);
}

const chave = JSON.parse(readFileSync(new URL("./chave-servico.json", import.meta.url)));
initializeApp({ credential: cert(chave) });

try {
  const u = await getAuth().getUserByEmail(email);
  await getAuth().setCustomUserClaims(u.uid, { papel });
  await getFirestore().doc(`equipe/${u.uid}`).set({
    email, papel, nome: u.displayName || "", atualizadoEm: FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(`\n✓ ${email} agora é ${papel}.`);
  console.log(`  uid: ${u.uid}`);
  console.log(`\n  IMPORTANTE: peça para sair da conta e entrar de novo.`);
  console.log(`  O papel viaja dentro do token, e o token só é reemitido no login.\n`);
} catch (e) {
  if (e.code === "auth/user-not-found") {
    console.error(`\n✗ Nenhuma conta com o e-mail ${email}.`);
    console.error(`  A pessoa precisa entrar na Academia uma vez antes — é o login que cria a conta.\n`);
  } else {
    console.error("\n✗ Erro:", e.message, "\n");
  }
  process.exit(1);
}
