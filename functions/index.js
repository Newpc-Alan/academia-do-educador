/* ============================================================================
   ACADEMIA DO EDUCADOR — Cloud Functions
   Portal do Educador · NEWPC Tecnologia

   POR QUE ESTE ARQUIVO EXISTE

   Tudo que roda no navegador o usuário consegue ler e alterar. Se o gabarito
   do quiz fosse baixado para corrigir no cliente, bastaria abrir o inspetor
   para ver as respostas. Se o certificado fosse criado pelo cliente, bastaria
   uma chamada no console para forjar um.

   Estas funções rodam no servidor com o Admin SDK, que ignora as regras do
   Firestore. São elas — e só elas — que leem gabarito e criam certificado.

   Publicar:  firebase deploy --only functions
   ========================================================================== */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions }   from "firebase-functions/v2";
import { initializeApp }      from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth }            from "firebase-admin/auth";

initializeApp();
const db = getFirestore();

// São Paulo: menor latência para as redes do Centro-Oeste e Sudeste.
setGlobalOptions({ region: "southamerica-east1", maxInstances: 10 });

/* ---------------------------------------------------------------------------
   AUXILIARES
--------------------------------------------------------------------------- */
const exigirLogin = req => {
  if (!req.auth) throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  return req.auth.uid;
};

const exigirAdmin = req => {
  exigirLogin(req);
  if (req.auth.token.papel !== "admin")
    throw new HttpsError("permission-denied", "Ação restrita a administradores.");
  return req.auth.uid;
};

// CPF — validado também no servidor. Validação só no cliente não vale nada:
// basta chamar a Function direto para burlar.
const soDigitos = v => String(v ?? "").replace(/\D/g, "");

function cpfValido(v) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = n => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

const mascararCPF = v => {
  const c = soDigitos(v);
  return c.length === 11 ? `***.${c.slice(3, 6)}.${c.slice(6, 9)}-**` : "";
};

// Alfabeto sem caracteres ambíguos — alguém vai digitar isso a partir de papel.
const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const sortear = n => Array.from({ length: n }, () => ABC[Math.floor(Math.random() * ABC.length)]).join("");

async function codigoInedito() {
  for (let i = 0; i < 8; i++) {
    const codigo = `AE-${new Date().getFullYear()}-${sortear(6)}`;
    const existe = await db.doc(`certificados/${codigo}`).get();
    if (!existe.exists) return codigo;
  }
  throw new HttpsError("internal", "Não foi possível gerar um código único. Tente novamente.");
}

/* ---------------------------------------------------------------------------
   1. CORRIGIR QUIZ
   Recebe as respostas, lê o gabarito no servidor, calcula a nota e grava a
   tentativa. Devolve o resultado com a explicação de cada questão — o aluno
   aprende com o erro, mas nunca recebe o gabarito antes de responder.
--------------------------------------------------------------------------- */
export const corrigirQuiz = onCall(async req => {
  const uid = exigirLogin(req);
  const { cursoId, respostas } = req.data || {};

  if (!cursoId || typeof respostas !== "object" || respostas === null)
    throw new HttpsError("invalid-argument", "Informe cursoId e respostas.");

  const cursoSnap = await db.doc(`cursos/${cursoId}`).get();
  if (!cursoSnap.exists)                     throw new HttpsError("not-found", "Curso não encontrado.");
  const curso = cursoSnap.data();
  if (curso.status !== "publicado")          throw new HttpsError("failed-precondition", "Curso não está publicado.");
  if (!curso.quizAtivo)                      throw new HttpsError("failed-precondition", "Este curso não possui avaliação.");

  const notaCorte    = Number(curso.quizNotaCorte ?? 70);
  const tentativasMax = Number(curso.quizTentativasMax ?? 3);

  // Limite de tentativas: sem isso o aluno acerta por eliminação repetindo.
  const refTent = db.doc(`users/${uid}/tentativas/${cursoId}`);
  const tentSnap = await refTent.get();
  const anterior = tentSnap.exists ? tentSnap.data() : { tentativas: 0, melhorNota: 0, aprovado: false };

  if (anterior.aprovado)
    throw new HttpsError("already-exists", "Você já foi aprovado nesta avaliação.");
  if (tentativasMax > 0 && anterior.tentativas >= tentativasMax)
    throw new HttpsError("resource-exhausted",
      `Você já usou as ${tentativasMax} tentativas permitidas. Fale com o suporte para liberar uma nova.`);

  // Gabarito: leitura só acontece aqui.
  const [qSnap, gSnap] = await Promise.all([
    db.collection(`cursos/${cursoId}/questoes`).get(),
    db.collection(`cursos/${cursoId}/gabarito`).get()
  ]);
  if (qSnap.empty) throw new HttpsError("failed-precondition", "Este curso não tem questões cadastradas.");

  const gabarito = {};
  gSnap.forEach(d => gabarito[d.id] = d.data());

  let acertos = 0;
  const detalhes = [];
  qSnap.forEach(d => {
    const g          = gabarito[d.id] || {};
    const respondida = respostas[d.id];
    const acertou    = respondida !== undefined && Number(respondida) === Number(g.correta);
    if (acertou) acertos++;
    detalhes.push({
      questaoId: d.id,
      acertou,
      correta: Number(g.correta),
      explicacao: g.explicacao || ""
    });
  });

  const total    = qSnap.size;
  const nota     = Math.round(acertos / total * 100);
  const aprovado = nota >= notaCorte;

  await refTent.set({
    cursoId,
    tentativas: FieldValue.increment(1),
    ultimaNota: nota,
    melhorNota: Math.max(anterior.melhorNota || 0, nota),
    aprovado,
    aprovadoEmISO: aprovado ? new Date().toISOString() : (anterior.aprovadoEmISO || null),
    ultimaEm: FieldValue.serverTimestamp()
  }, { merge: true });

  return {
    nota, acertos, total, aprovado, notaCorte,
    tentativasUsadas: (anterior.tentativas || 0) + 1,
    tentativasMax,
    detalhes
  };
});

/* ---------------------------------------------------------------------------
   2. EMITIR CERTIFICADO
   Confere no servidor: curso publicado, todas as aulas concluídas e, quando
   houver avaliação, aprovação registrada. Só então cria o documento.
   O cliente não tem permissão de escrita nesta coleção.
--------------------------------------------------------------------------- */
export const emitirCertificado = onCall(async req => {
  const uid = exigirLogin(req);
  const { cursoId } = req.data || {};
  if (!cursoId) throw new HttpsError("invalid-argument", "Informe o cursoId.");

  // Já emitido? Devolve o existente em vez de duplicar.
  const jaTem = await db.collection("certificados")
    .where("uid", "==", uid).where("cursoId", "==", cursoId).limit(1).get();
  if (!jaTem.empty) return { codigo: jaTem.docs[0].id, ...jaTem.docs[0].data(), reaproveitado: true };

  const [cursoSnap, userSnap, progSnap, aulasSnap] = await Promise.all([
    db.doc(`cursos/${cursoId}`).get(),
    db.doc(`users/${uid}`).get(),
    db.doc(`users/${uid}/progresso/${cursoId}`).get(),
    db.collection(`cursos/${cursoId}/aulas`).get()
  ]);

  if (!cursoSnap.exists) throw new HttpsError("not-found", "Curso não encontrado.");
  const curso = cursoSnap.data();
  if (curso.status !== "publicado") throw new HttpsError("failed-precondition", "Curso não está publicado.");

  const perfil = userSnap.exists ? userSnap.data() : {};
  const nome = (perfil.nome || "").trim();
  if (nome.length < 3 || !nome.includes(" "))
    throw new HttpsError("failed-precondition", "Preencha seu nome completo antes de emitir o certificado.");

  const cpf = soDigitos(perfil.cpf);
  if (!cpfValido(cpf))
    throw new HttpsError("failed-precondition",
      "Informe um CPF válido no seu cadastro. Sem ele o certificado não serve para progressão funcional.");

  // Conclusão de TODAS as aulas — conferido contra a lista real do curso.
  const idsAulas = aulasSnap.docs.map(d => d.id);
  const feitas   = new Set((progSnap.exists ? progSnap.data().aulas : []) || []);
  const faltando = idsAulas.filter(id => !feitas.has(id));
  if (idsAulas.length === 0)
    throw new HttpsError("failed-precondition", "Curso sem aulas cadastradas.");
  if (faltando.length > 0)
    throw new HttpsError("failed-precondition", `Faltam ${faltando.length} aula(s) para concluir o curso.`);

  // Aprovação na avaliação, quando o curso exige.
  if (curso.quizAtivo) {
    const t = await db.doc(`users/${uid}/tentativas/${cursoId}`).get();
    if (!t.exists || !t.data().aprovado)
      throw new HttpsError("failed-precondition",
        `É preciso ser aprovado na avaliação final (nota mínima ${curso.quizNotaCorte ?? 70}%) para emitir o certificado.`);
  }

  // Conteúdo programático congelado dentro do certificado. Não é lido do curso
  // na hora de exibir: se a equipe reeditar o conteúdo depois, o documento já
  // emitido continua descrevendo o curso como ele era. É o que o torna auditável.
  const modulosSnap = await db.collection(`cursos/${cursoId}/modulos`).get();
  const modulos = modulosSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const aulas = aulasSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const programa = modulos
    .map(m => ({
      modulo: m.titulo || "",
      aulas: aulas.filter(a => a.moduloId === m.id).map(a => a.titulo || "")
    }))
    .filter(x => x.aulas.length);

  const prog = progSnap.data() || {};
  const codigo = await codigoInedito();
  const emitidoEmISO = new Date().toISOString();

  const cert = {
    uid,
    nome,
    cpf,
    cpfMascarado: mascararCPF(cpf),
    email: perfil.email || "",
    cursoId,
    cursoTitulo: curso.titulo,
    cargaHoraria: Number(curso.horas || 0),
    municipio: perfil.municipio || "",
    escola: perfil.escola || "",
    notaFinal: curso.quizAtivo
      ? (await db.doc(`users/${uid}/tentativas/${cursoId}`).get()).data().melhorNota
      : null,
    // Período de realização: exigido por boa parte dos planos de carreira.
    periodoInicioISO: prog.iniciadoEmISO || null,
    periodoFimISO: prog.concluidoEmISO || null,
    programa,
    totalAulas: aulas.length,
    emitidoEmISO,
    emitidoEm: FieldValue.serverTimestamp(),
    ativo: true
  };

  await db.doc(`certificados/${codigo}`).set(cert);
  return { codigo, ...cert, reaproveitado: false };
});

/* ---------------------------------------------------------------------------
   3. REVOGAR CERTIFICADO  (admin)
   Não apaga: marca como inativo. A página de validação passa a mostrar
   "revogado" em vez de "não encontrado" — a diferença importa, porque some
   com o registro é o mesmo que admitir que ele nunca existiu.
--------------------------------------------------------------------------- */
export const revogarCertificado = onCall(async req => {
  const uid = exigirAdmin(req);
  const { codigo, motivo } = req.data || {};
  if (!codigo) throw new HttpsError("invalid-argument", "Informe o código do certificado.");

  const ref = db.doc(`certificados/${codigo}`);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "Certificado não encontrado.");

  await ref.set({
    ativo: false,
    revogadoEm: FieldValue.serverTimestamp(),
    revogadoPor: uid,
    motivoRevogacao: motivo || ""
  }, { merge: true });

  return { ok: true };
});

/* ---------------------------------------------------------------------------
   4. DEFINIR PAPEL DA EQUIPE  (admin)
   Grava o papel como custom claim no token. Regras do Firestore e do Storage
   leem daí — não gasta leitura de banco e o cliente não consegue adulterar.
   Quem for promovido precisa sair e entrar de novo para o token atualizar.
--------------------------------------------------------------------------- */
export const definirPapel = onCall(async req => {
  exigirAdmin(req);
  const { email, papel } = req.data || {};
  if (!email) throw new HttpsError("invalid-argument", "Informe o e-mail.");
  if (!["admin", "editor", "nenhum"].includes(papel))
    throw new HttpsError("invalid-argument", "Papel inválido. Use admin, editor ou nenhum.");

  let usuario;
  try { usuario = await getAuth().getUserByEmail(email); }
  catch { throw new HttpsError("not-found", "Nenhuma conta encontrada com este e-mail. Peça para a pessoa entrar na Academia uma vez antes."); }

  if (papel === "nenhum") {
    await getAuth().setCustomUserClaims(usuario.uid, {});
    await db.doc(`equipe/${usuario.uid}`).delete();
  } else {
    await getAuth().setCustomUserClaims(usuario.uid, { papel });
    await db.doc(`equipe/${usuario.uid}`).set({
      email, papel,
      nome: usuario.displayName || "",
      atualizadoEm: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  return { ok: true, uid: usuario.uid, papel };
});

/* ---------------------------------------------------------------------------
   5. LER GABARITO  (equipe editorial)
   As regras do Firestore negam leitura do gabarito para TODO cliente — senão
   bastaria abrir o console para ver as respostas. Mas o editor precisa
   enxergar a resposta certa para corrigir uma questão. Esta função é a única
   porta: exige papel de editor ou admin e devolve o gabarito de um curso.
--------------------------------------------------------------------------- */
export const obterGabarito = onCall(async req => {
  exigirLogin(req);
  const papel = req.auth.token.papel;
  if (papel !== "admin" && papel !== "editor")
    throw new HttpsError("permission-denied", "Ação restrita à equipe editorial.");

  const { cursoId } = req.data || {};
  if (!cursoId) throw new HttpsError("invalid-argument", "Informe o cursoId.");

  const snap = await db.collection(`cursos/${cursoId}/gabarito`).get();
  const gabarito = {};
  snap.forEach(d => gabarito[d.id] = d.data());
  return { gabarito };
});

/* ---------------------------------------------------------------------------
   6. RELATÓRIO DE ADESÃO POR REDE DE ENSINO  (admin)
   O entregável contratual: quantos servidores da rede iniciaram, concluíram
   e se certificaram. É este número que a secretaria coloca na prestação
   de contas.
--------------------------------------------------------------------------- */
export const relatorioAdesao = onCall(async req => {
  exigirAdmin(req);
  const { municipio } = req.data || {};

  let consulta = db.collection("users");
  if (municipio) consulta = consulta.where("municipio", "==", municipio);
  const usuarios = await consulta.limit(3000).get();

  const linhas = [];
  for (const u of usuarios.docs) {
    const d = u.data();
    const [prog, certs] = await Promise.all([
      db.collection(`users/${u.id}/progresso`).get(),
      db.collection("certificados").where("uid", "==", u.id).get()
    ]);
    let concluidos = 0;
    prog.forEach(p => { if (p.data().concluido) concluidos++; });

    linhas.push({
      nome: d.nome || "", email: d.email || "",
      municipio: d.municipio || "", escola: d.escola || "", cargo: d.cargo || "",
      cursosIniciados: prog.size,
      cursosConcluidos: concluidos,
      certificados: certs.size,
      horasCertificadas: certs.docs.reduce((s, c) => s + Number(c.data().cargaHoraria || 0), 0)
    });
  }

  return {
    geradoEmISO: new Date().toISOString(),
    municipio: municipio || "todas as redes",
    totalProfessores: linhas.length,
    totalCertificados: linhas.reduce((s, l) => s + l.certificados, 0),
    totalHoras: linhas.reduce((s, l) => s + l.horasCertificadas, 0),
    linhas
  };
});
