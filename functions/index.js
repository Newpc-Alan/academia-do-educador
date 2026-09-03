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

/* Embaralhamento Fisher-Yates. Roda no servidor de propósito: se a ordem fosse
   sorteada no navegador, bastaria olhar o código para saber qual índice virou
   qual alternativa. */
function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Toda prova nasce com prazo. Sem isso a pessoa abre a avaliação, some por dois
// dias pesquisando cada questão com calma, e volta para responder.
const VALIDADE_PROVA_MIN = 90;

/* Confere no servidor se o professor concluiu todas as aulas do curso.
   O navegador escreve o próprio progresso, então essa checagem não pode ficar
   só nas regras: aqui ela é conferida contra a lista real de aulas. */
async function exigirCursoConcluido(uid, cursoId) {
  const [progSnap, aulasSnap] = await Promise.all([
    db.doc(`users/${uid}/progresso/${cursoId}`).get(),
    db.collection(`cursos/${cursoId}/aulas`).get()
  ]);
  const idsAulas = aulasSnap.docs.map(d => d.id);
  if (idsAulas.length === 0)
    throw new HttpsError("failed-precondition", "Curso sem aulas cadastradas.");

  const feitas = new Set((progSnap.exists ? progSnap.data().aulas : []) || []);
  const faltando = idsAulas.filter(id => !feitas.has(id));
  if (faltando.length > 0)
    throw new HttpsError("failed-precondition",
      `Faltam ${faltando.length} aula(s) para liberar a avaliação.`);
  return idsAulas.length;
}

/* ---------------------------------------------------------------------------
   1. SORTEAR PROVA
   O navegador NÃO tem permissão para ler a coleção de questões. Quem monta a
   prova é esta função: sorteia um subconjunto do banco, embaralha as
   alternativas de cada questão e devolve só o que o professor precisa ver.
   A ordem embaralhada fica guardada no servidor, porque é ela que traduz a
   resposta marcada de volta para o índice original na hora de corrigir.

   Consequência prática: duas pessoas fazendo a mesma avaliação recebem provas
   diferentes, e a mesma pessoa em uma nova tentativa também.
--------------------------------------------------------------------------- */
export const sortearProva = onCall(async req => {
  const uid = exigirLogin(req);
  const { cursoId } = req.data || {};
  if (!cursoId) throw new HttpsError("invalid-argument", "Informe o cursoId.");

  const cursoSnap = await db.doc(`cursos/${cursoId}`).get();
  if (!cursoSnap.exists)            throw new HttpsError("not-found", "Curso não encontrado.");
  const curso = cursoSnap.data();
  if (curso.status !== "publicado") throw new HttpsError("failed-precondition", "Curso não está publicado.");
  if (!curso.quizAtivo)             throw new HttpsError("failed-precondition", "Este curso não possui avaliação.");

  await exigirCursoConcluido(uid, cursoId);

  const notaCorte     = Number(curso.quizNotaCorte ?? 70);
  const tentativasMax = Number(curso.quizTentativasMax ?? 3);

  const refTent  = db.doc(`users/${uid}/tentativas/${cursoId}`);
  const tentSnap = await refTent.get();
  const anterior = tentSnap.exists ? tentSnap.data()
                 : { tentativas: 0, sorteios: 0, melhorNota: 0, aprovado: false };

  if (anterior.aprovado)
    throw new HttpsError("already-exists", "Você já foi aprovado nesta avaliação.");
  if (tentativasMax > 0 && (anterior.tentativas || 0) >= tentativasMax)
    throw new HttpsError("resource-exhausted",
      `Você já usou as ${tentativasMax} tentativas permitidas. Fale com o suporte para liberar uma nova.`);

  const agora = Date.now();

  // Prova já aberta e no prazo? Devolve a mesma. Sem isso bastaria recarregar a
  // página várias vezes para ir vendo o banco inteiro, uma prova por vez.
  const abertas = await db.collection(`users/${uid}/provas`)
    .where("cursoId", "==", cursoId).where("respondida", "==", false)
    .orderBy("criadaEm", "desc").limit(1).get();

  if (!abertas.empty) {
    const p = abertas.docs[0];
    const d = p.data();
    if (new Date(d.expiraEmISO).getTime() > agora) {
      return {
        provaId: p.id, questoes: d.questoesExibidas, notaCorte,
        tentativasUsadas: anterior.tentativas || 0, tentativasMax,
        expiraEmISO: d.expiraEmISO, reaberta: true
      };
    }
    await p.ref.set({ respondida: true, expirada: true }, { merge: true });
  }

  // Teto de sorteios: mesmo com prova expirando, ninguém fica sorteando à
  // vontade só para enxergar o banco.
  const tetoSorteios = (tentativasMax > 0 ? tentativasMax : 5) + 2;
  if ((anterior.sorteios || 0) >= tetoSorteios)
    throw new HttpsError("resource-exhausted",
      "Limite de aberturas da avaliação atingido. Fale com o suporte.");

  const qSnap = await db.collection(`cursos/${cursoId}/questoes`).get();
  if (qSnap.empty) throw new HttpsError("failed-precondition", "Este curso não tem questões cadastradas.");

  const banco = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const quantas = Math.min(Number(curso.quizPorProva ?? 10) || 10, banco.length);
  const escolhidas = embaralhar(banco).slice(0, quantas);

  const itens = [];              // fica no servidor: id da questão e a ordem sorteada
  const questoesExibidas = [];   // vai para o navegador: sem correta, sem explicação

  for (const q of escolhidas) {
    const alternativas = q.alternativas || [];
    const posicoes = embaralhar(alternativas.map((_, i) => i));
    itens.push({ questaoId: q.id, ordem: posicoes });
    questoesExibidas.push({
      id: q.id,
      enunciado: q.enunciado || "",
      alternativas: posicoes.map(i => alternativas[i])
    });
  }

  const expiraEmISO = new Date(agora + VALIDADE_PROVA_MIN * 60000).toISOString();
  const prova = await db.collection(`users/${uid}/provas`).add({
    uid, cursoId, itens, questoesExibidas,
    respondida: false, expirada: false,
    criadaEmISO: new Date(agora).toISOString(),
    expiraEmISO,
    criadaEm: FieldValue.serverTimestamp()
  });

  await refTent.set({
    cursoId,
    sorteios: FieldValue.increment(1),
    tentativas: anterior.tentativas || 0,
    melhorNota: anterior.melhorNota || 0,
    aprovado: false
  }, { merge: true });

  return {
    provaId: prova.id, questoes: questoesExibidas, notaCorte,
    tentativasUsadas: anterior.tentativas || 0, tentativasMax,
    expiraEmISO, reaberta: false
  };
});

/* ---------------------------------------------------------------------------
   2. CORRIGIR QUIZ
   Recebe o identificador da prova e as respostas na ordem em que foram
   exibidas. Traduz de volta para a ordem original, confere contra o gabarito
   e grava a tentativa.

   Regra de devolutiva: quem reprova recebe a nota e a lista do que errou, mas
   NÃO recebe a alternativa correta nem a explicação. Entregar o gabarito na
   reprovação é entregar a próxima tentativa de bandeja. Aprovado recebe tudo,
   porque aí a explicação vira aprendizado e não atalho.
--------------------------------------------------------------------------- */
export const corrigirQuiz = onCall(async req => {
  const uid = exigirLogin(req);
  const { provaId, respostas } = req.data || {};

  if (!provaId || typeof respostas !== "object" || respostas === null)
    throw new HttpsError("invalid-argument", "Informe provaId e respostas.");

  const refProva  = db.doc(`users/${uid}/provas/${provaId}`);
  const provaSnap = await refProva.get();
  if (!provaSnap.exists)          throw new HttpsError("not-found", "Prova não encontrada.");
  const prova = provaSnap.data();
  if (prova.uid !== uid)          throw new HttpsError("permission-denied", "Esta prova não é sua.");
  if (prova.respondida)           throw new HttpsError("failed-precondition", "Esta prova já foi respondida.");
  if (new Date(prova.expiraEmISO).getTime() < Date.now()) {
    await refProva.set({ respondida: true, expirada: true }, { merge: true });
    throw new HttpsError("deadline-exceeded", "O prazo desta prova venceu. Abra a avaliação de novo para receber novas questões.");
  }

  const cursoId   = prova.cursoId;
  const cursoSnap = await db.doc(`cursos/${cursoId}`).get();
  if (!cursoSnap.exists) throw new HttpsError("not-found", "Curso não encontrado.");
  const curso = cursoSnap.data();

  const notaCorte     = Number(curso.quizNotaCorte ?? 70);
  const tentativasMax = Number(curso.quizTentativasMax ?? 3);

  const refTent  = db.doc(`users/${uid}/tentativas/${cursoId}`);
  const tentSnap = await refTent.get();
  const anterior = tentSnap.exists ? tentSnap.data() : { tentativas: 0, melhorNota: 0, aprovado: false };

  if (anterior.aprovado)
    throw new HttpsError("already-exists", "Você já foi aprovado nesta avaliação.");
  if (tentativasMax > 0 && (anterior.tentativas || 0) >= tentativasMax)
    throw new HttpsError("resource-exhausted",
      `Você já usou as ${tentativasMax} tentativas permitidas. Fale com o suporte para liberar uma nova.`);

  const gSnap = await db.collection(`cursos/${cursoId}/gabarito`).get();
  const gabarito = {};
  gSnap.forEach(d => gabarito[d.id] = d.data());

  let acertos = 0;
  const detalhes = [];

  for (const item of prova.itens) {
    const g = gabarito[item.questaoId] || {};
    const marcada = respostas[item.questaoId];
    // A pessoa marca a posição que viu na tela. A ordem sorteada traduz de volta.
    const original = (marcada === undefined || marcada === null || marcada === "")
      ? null : item.ordem[Number(marcada)];
    const acertou = original !== null && original !== undefined && Number(original) === Number(g.correta);
    if (acertou) acertos++;

    detalhes.push({
      questaoId: item.questaoId,
      acertou,
      // Posição da alternativa correta na ordem EXIBIDA para esta pessoa.
      // Só é preenchida quando ela é aprovada.
      corretaExibida: item.ordem.indexOf(Number(g.correta)),
      explicacao: g.explicacao || ""
    });
  }

  const total    = prova.itens.length;
  const nota     = total ? Math.round(acertos / total * 100) : 0;
  const aprovado = nota >= notaCorte;
  const usadas   = (anterior.tentativas || 0) + 1;
  const quandoISO = new Date().toISOString();

  await refProva.set({
    respondida: true, respondidaEmISO: quandoISO,
    nota, acertos, total, aprovado,
    resultado: detalhes.map(d => ({ questaoId: d.questaoId, acertou: d.acertou }))
  }, { merge: true });

  await refTent.set({
    cursoId,
    tentativas: usadas,
    ultimaNota: nota,
    melhorNota: Math.max(anterior.melhorNota || 0, nota),
    aprovado,
    aprovadoEmISO: aprovado ? quandoISO : (anterior.aprovadoEmISO || null),
    ultimaEmISO: quandoISO,
    ultimaEm: FieldValue.serverTimestamp(),
    // Histórico curto de tudo que aconteceu, para prestação de contas.
    registros: FieldValue.arrayUnion({ provaId, nota, acertos, total, aprovado, quandoISO })
  }, { merge: true });

  return {
    nota, acertos, total, aprovado, notaCorte,
    tentativasUsadas: usadas,
    tentativasMax,
    tentativasRestantes: tentativasMax > 0 ? Math.max(0, tentativasMax - usadas) : null,
    // Reprovado sabe ONDE errou, mas não qual era a resposta.
    detalhes: aprovado
      ? detalhes
      : detalhes.map(d => ({ questaoId: d.questaoId, acertou: d.acertou }))
  };
});

/* ---------------------------------------------------------------------------
   3. EMITIR CERTIFICADO
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
   4. REVOGAR CERTIFICADO  (admin)
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
   5. DEFINIR PAPEL DA EQUIPE  (admin)
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
   6. LER GABARITO  (equipe editorial)
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
   7. RELATÓRIO DE ADESÃO POR REDE DE ENSINO  (admin)
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