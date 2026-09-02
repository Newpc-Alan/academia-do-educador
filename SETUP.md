# Academia do Educador — Guia de implantação

Plataforma de formação continuada do Portal do Educador (NEWPC Tecnologia).
Front-end estático + Firebase Auth + Firestore + Storage + Cloud Functions.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Aplicação do professor: catálogo, aulas com vídeo e material, avaliação, certificado |
| `admin.html` | Painel administrativo: cadastro de cursos, upload, banco de questões, publicação |
| `validar.html` | Validação pública de certificado (sem login) |
| `functions/` | Cloud Functions: correção de quiz, emissão e revogação de certificado, papéis, relatório |
| `firestore.rules` | Regras de segurança do banco |
| `storage.rules` | Regras de segurança dos arquivos |
| `scripts/importar.mjs` | Importa os 10 cursos e 4 trilhas iniciais |
| `scripts/definir-admin.mjs` | Define o primeiro administrador |
| `PROCESSO-EDITORIAL.md` | Como a equipe publica um curso |
| `PUBLICAR.md` | Roteiro passo a passo para colocar tudo no ar |
| `firestore.indexes.json` | Índices compostos do banco — sem eles o catálogo abre com erro |
| `assets/` | Logotipo do Portal do Educador: ícones, cartão social e versões animadas |
| `CNAME`, `robots.txt`, `sitemap.xml`, `.nojekyll` | Hospedagem e indexação |

### Sobre o logotipo

O logotipo estático está **embutido dentro dos três HTML** como variável CSS (`--logo-pe`), em WebP com
transparência real. Os arquivos continuam autocontidos: a imagem aparece uma única vez por arquivo e
todos os usos apenas referenciam a variável.

A pasta `assets/` guarda o que precisa de URL própria:

| Arquivo | Para que serve |
|---|---|
| `pe-og.png` | Cartão 1200×630 que aparece ao compartilhar o link no WhatsApp, LinkedIn e Facebook |
| `apple-touch-icon.png` | Ícone quando o professor salva a Academia na tela inicial do celular |
| `pe-logo.png` / `pe-logo-192.png` | Logotipo em PNG transparente, para uso em documentos e propostas |
| `pe-animado-transparente.webp` | Versão animada com fundo transparente, para páginas web |
| `pe-animado-fundo-escuro.gif` | Versão animada sobre o azul NEWPC, para PowerPoint e e-mail |
| `pe-animado.mp4` / `.webm` | Versão em vídeo, para redes sociais e WhatsApp |

**Por que a animação não entrou na interface:** a versão animada mais enxuta pesa cerca de 300 KB —
mais do que toda a aplicação. Numa escola com internet instável, isso é meio segundo de espera em cada
acesso em troca de decoração. O logotipo estático transmite a mesma identidade e carrega junto com a
página. A animação rende muito mais em apresentação comercial, vídeo institucional e redes sociais,
que é onde ela está guardada.

---

## Passo 0 — Preencher os dados do emissor

Antes de qualquer coisa técnica, abra `index.html` e preencha o bloco `EMISSOR`, logo no início do
`<script type="module">`:

```js
const EMISSOR = {
  razaoSocial: "NEWPC TECNOLOGIA LTDA",
  nomeFantasia: "Portal do Educador",
  cnpj:      "00.000.000/0001-00",   // ← PREENCHER
  endereco:  "Campo Grande — MS",
  site:      "portaldoeducador.com.br",
  responsavel: "Alan Valerio Pires Ramos",
  cargo:       "Diretor",
  assinatura: ""                     // data URI da assinatura digitalizada
};
```

Repita o CNPJ e a razão social no bloco `EMISSOR` do `validar.html`.

Esse bloco alimenta o certificado, a página de validação, a Política de Privacidade e a página
Sobre — não há outro lugar para editar.

### Por que isso não é detalhe

Certificado de curso livre se apoia na **LDB (Lei 9.394/96, arts. 7º e 39)** e no
**Decreto 5.154/2004**. Não exige autorização do MEC, mas exige identificar juridicamente quem
emitiu. Sem CNPJ no documento, o RH da prefeitura não tem como comprovar que a instituição existe —
e certificado sem emissor identificável costuma voltar.

### A assinatura

Digitalize a assinatura em papel branco, recorte o fundo deixando transparente, salve como PNG de
uns 400×130 px e converta para data URI:

```bash
# gera o data URI pronto para colar em EMISSOR.assinatura
echo "data:image/png;base64,$(base64 -w0 assinatura.png)"
```

Enquanto o campo estiver vazio, o certificado imprime a linha de assinatura com nome e cargo —
correto, só menos institucional.

---

## Modo demonstração

Abra `index.html` e `admin.html` no navegador **antes de configurar qualquer coisa**. Os dois rodam com dados de exemplo em memória: você navega, marca aulas, faz a avaliação, emite certificado, cadastra curso, adiciona vídeo e monta questão. Nada é salvo.

Serve para avaliar a experiência com a equipe antes de mexer em infraestrutura. Quando `FIREBASE_CONFIG` for preenchido, os dois entram em modo produção sozinhos.

---

## Arquitetura em uma imagem

```
NAVEGADOR                          SERVIDOR (Admin SDK)
─────────────────────────          ────────────────────────────
index.html   ── lê ──►  Firestore
admin.html   ── escreve ►  cursos, aulas, questões
                                   Cloud Functions
             ── chama ──────────►  corrigirQuiz      lê o GABARITO
                                   emitirCertificado confere e grava
                                   revogarCertificado
                                   definirPapel
                                   relatorioAdesao
                                   obterGabarito     (só editor)
```

O que o navegador **nunca** consegue fazer, por regra de segurança:

- ler a coleção `gabarito` (as respostas certas)
- escrever em `certificados`
- escrever em `tentativas` (a nota da avaliação)

Essa separação é o que dá fé ao certificado. Sem ela, qualquer pessoa com o console do navegador aberto emitiria um certificado de 40 horas em dez segundos.

---

## Passo 1 — Criar o projeto

1. `console.firebase.google.com` com a conta **suporte@portaldoeducador.com.br**
2. **Adicionar projeto** → `portal-educador-academia`

> **Por que separado do `portal-do-educador-interno`:** o Hub Interno guarda dado de colaborador da NEWPC; a Academia guarda dado de professor da rede pública. Misturar significa que um erro de regra em um expõe o outro.

### Ativar o plano Blaze

Necessário para **Storage** (upload de materiais) e **Cloud Functions** (correção de quiz e emissão de certificado). Exige cartão cadastrado.

Cotas gratuitas mensais que continuam valendo no Blaze:

| Recurso | Grátis por mês | Estimativa no seu cenário |
|---|---|---|
| Storage | 5 GB armazenados, 1 GB/dia de download | 200 materiais ≈ 1 GB |
| Cloud Functions | 2.000.000 invocações | ~2 por professor certificado |
| Firestore | 50 mil leituras/dia, 20 mil escritas/dia | ~15 leituras por professor ativo/dia |

Na prática, alguns milhares de professores ativos por dia antes de a fatura sair de zero. Configure um **alerta de orçamento de R$ 50** no Google Cloud assim que ativar — é o cinto de segurança.

### Autenticação

**Authentication → Sign-in method**: ative **Google** e **E-mail/senha → Link de e-mail (login sem senha)**.

**Authentication → Settings → Authorized domains**, adicione:

```
academia.portaldoeducador.com.br
newpc-alan.github.io
localhost
```

### Banco e arquivos

- **Firestore Database → Criar** — modo produção, local **southamerica-east1 (São Paulo)**
- **Storage → Começar** — mesmo local

---

## Passo 2 — Colar a configuração

**Configurações do projeto → Seus apps → Web (`</>`)** → registre como `academia-web`.

Cole os valores em **três lugares**: `index.html`, `admin.html` e `validar.html`, na constante `FIREBASE_CONFIG`. Descomente as linhas.

> A `apiKey` ficar visível no código é normal e não é falha. Ela identifica o projeto; quem protege os dados são as regras e a lista de domínios autorizados.

---

## Passo 3 — Publicar regras e Functions

```bash
npm install -g firebase-tools
firebase login
firebase use portal-educador-academia-a1b2c

firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage

cd functions && npm install && cd ..
firebase deploy --only functions
```

**Sobre os índices:** o catálogo do professor filtra por `status` e ordena por `ordem`. Quando o
filtro e a ordenação são de campos diferentes, o Firestore exige um índice composto — sem ele a
Academia abre com erro de consulta no primeiro acesso. O `firestore.indexes.json` já traz os quatro
necessários. Depois do deploy eles levam de 1 a 5 minutos para ficar *Ativado*; enquanto isso o
catálogo aparece vazio.

As Functions rodam em `southamerica-east1`. O primeiro deploy demora alguns minutos e ativa APIs do Google Cloud automaticamente.

Confira em **Functions** no console que as seis apareceram: `corrigirQuiz`, `emitirCertificado`, `revogarCertificado`, `definirPapel`, `obterGabarito`, `relatorioAdesao`.

---

## Passo 4 — Importar o conteúdo e criar o primeiro admin

**Configurações do projeto → Contas de serviço → Gerar nova chave privada.** Salve como `scripts/chave-servico.json`.

> Esse arquivo dá acesso total ao projeto. Nunca versione. Já está no `.gitignore`.

```bash
cd scripts
npm install firebase-admin
node importar.mjs
```

Importa 10 cursos, 4 trilhas, 30 aulas e 44 horas. Pode rodar de novo sem duplicar (`--limpar` apaga antes).

Depois, **entre uma vez na Academia** com sua conta Google — é o primeiro login que cria o usuário. Então:

```bash
node definir-admin.mjs alan@newpc.com.br
```

Saia e entre de novo. Agora `admin.html` abre para você, e a partir daí os demais acessos são concedidos pela aba **Equipe** do painel.

---

## Passo 5 — Publicar no GitHub Pages

```bash
git init
git add .
git commit -m "Academia do Educador — CMS, videoaulas, materiais, avaliação e certificado auditável"
git branch -M main
git remote add origin https://github.com/Newpc-Alan/academia-do-educador.git
git push -u origin main
```

**Settings → Pages** → Source: `main` / `/ (root)`.

DNS:

| Tipo | Nome | Valor |
|---|---|---|
| CNAME | `academia` | `newpc-alan.github.io` |

Volte em Pages, informe `academia.portaldoeducador.com.br` e marque **Enforce HTTPS**.

---

## Passo 6 — Testar antes de divulgar

**Professor**

- [ ] Login com Google e por link de e-mail (aba anônima)
- [ ] Assistir aula com vídeo, alternar entre partes, baixar material
- [ ] Marcar aulas, fechar o navegador, entrar de outro dispositivo e ver o progresso preservado
- [ ] Tentar a avaliação sem concluir o curso — deve bloquear
- [ ] Errar de propósito e conferir se a explicação aparece
- [ ] Ser aprovado e emitir o certificado
- [ ] Ler o QR Code com o celular e validar em `validar.html`
- [ ] Validar um código inventado — deve dar "não encontrado"

**Equipe**

- [ ] Criar curso, módulo e aula pelo painel
- [ ] Subir um PDF e um PPTX
- [ ] Adicionar dois vídeos na mesma aula
- [ ] Cadastrar questão e conferir que ela é corrigida certo no lado do professor
- [ ] Conceder papel de editor a outra pessoa e confirmar que ela não consegue publicar

**Segurança** (vale fazer uma vez, com o console do navegador aberto)

- [ ] Tentar ler `cursos/{id}/gabarito` pelo cliente — deve dar permissão negada
- [ ] Tentar criar documento em `certificados` — deve dar permissão negada

**Ambiente real**

- [ ] Testar em Chromebook, que é o equipamento do professor na escola
- [ ] Testar em celular com 4G fraco

---

## Estrutura de dados

```
equipe/{uid}                     papel: admin | editor   (espelho legível)

cursos/{cursoId}
  titulo, resumo, descricao, nivel, horas, ordem, status,
  trilhas[], totalAulas, quizAtivo, quizNotaCorte, quizTentativasMax

cursos/{cursoId}/modulos/{mN}          titulo, ordem
cursos/{cursoId}/aulas/{mNaM}          moduloId, titulo, ordem, duracaoMin, texto,
                                       videos[{titulo, youtubeId}],
                                       materiais[{titulo, tipo, url, path, bytes}]
cursos/{cursoId}/questoes/{qN}         enunciado, alternativas[4], ordem
cursos/{cursoId}/gabarito/{qN}         correta, explicacao      ← ILEGÍVEL no cliente

trilhas/{trilhaId}                     nome, resumo, ordem, cursos[], horas, status

users/{uid}                            nome, email, municipio, escola, cargo
users/{uid}/progresso/{cursoId}        aulas[], percentual, concluido
users/{uid}/tentativas/{cursoId}       tentativas, melhorNota, aprovado   ← só a Function escreve

certificados/{codigo}                  uid, nome, cursoTitulo, cargaHoraria,
                                       notaFinal, municipio, escola,
                                       emitidoEmISO, ativo                ← só a Function escreve
```

Storage:

```
materiais/{cursoId}/{arquivo}    leitura pública, escrita só de editor
capas/{arquivo}                  idem
```

---

## Relatório de adesão

Painel → **Relatório de adesão** → informe o município (ou deixe vazio) → **Gerar** → **Exportar CSV**.

Traz por servidor: cursos iniciados, concluídos, certificados e horas certificadas. É o anexo que a secretaria coloca na prestação de contas — e o argumento que diferencia a proposta da NEWPC de qualquer concorrente que entrega equipamento sem comprovação de formação.

---

## O certificado

Sai em **duas páginas**, pensadas para o setor de recursos humanos da rede, não só para a parede:

**Frente** — logotipo e identificação completa do emissor (razão social, CNPJ, sede), nome e **CPF**
do participante, curso, carga horária, número de módulos e aulas, aproveitamento na avaliação,
**período de realização**, data de emissão, rede de ensino e unidade escolar, assinatura do
responsável, código de autenticidade com QR Code e a citação da base legal.

**Verso** — **conteúdo programático** com todos os módulos e aulas, gerado automaticamente do que a
equipe cadastrou no painel.

### Três decisões que sustentam esse documento

**O CPF é obrigatório para emitir.** Validado nos dois lados — no navegador, para dar retorno
imediato, e na Cloud Function, porque validação só no cliente não vale nada (basta chamar a função
direto para burlar). Na página pública de validação ele aparece como `***.456.789-**`: o RH confere
pelos dígitos visíveis sem que o número completo fique exposto a quem tiver o código.

**O conteúdo programático é congelado dentro do certificado.** Não é lido do curso na hora de
exibir. Se a equipe reeditar o curso no ano que vem, o certificado emitido hoje continua descrevendo
o curso como ele era — é isso que o torna auditável.

**O período de realização vem do progresso real.** A data de início é gravada quando o professor
marca a primeira aula e nunca é sobrescrita; a de conclusão, quando fecha a última. Além de ser
exigência de vários planos de carreira, demonstra que houve tempo de estudo — argumento útil se
alguém questionar a seriedade da formação.

---

## Limites conhecidos

**O professor marca a própria aula como concluída.** Não há controle de tempo assistido. A avaliação obrigatória com nota mínima compensa isso na prática: dá para pular o vídeo, mas não dá para acertar a prova sem saber. Se alguma rede exigir controle de tempo, é uma evolução do player, não uma mudança de arquitetura.

**O certificado é emitido no servidor**, após conferência automática de conclusão e aprovação. Não pode ser criado, alterado nem apagado pelo navegador. Revogação é ato administrativo, feito no painel por um administrador, e a página de validação passa a mostrar "revogado" — nunca "não encontrado", porque sumir com o registro equivaleria a dizer que ele nunca existiu.

**Busca por nome no painel de certificados é por prefixo** (limitação do Firestore). Buscar pelo código de autenticidade sempre funciona.

**A assinatura é uma imagem, não uma assinatura digital.** Dá aparência institucional e é o padrão
do mercado de cursos livres, mas não tem validade jurídica própria — quem sustenta a autenticidade é
o registro no servidor e a página pública de validação. Se alguma rede exigir assinatura com
validade jurídica plena, o caminho é assinar o PDF com certificado ICP-Brasil (A1 da NEWPC) numa
Cloud Function, verificável em `validar.iti.gov.br`. É um projeto à parte, não um ajuste — e a
arquitetura atual já comporta, porque o certificado é gerado no servidor.

---

## Pendências antes do go-live

1. **CNPJ e razão social da NEWPC** no bloco `EMISSOR` do `index.html` e do `validar.html`
2. **Assinatura digitalizada** do responsável, em data URI, no `EMISSOR.assinatura`
3. Confirmar o **e-mail do encarregado de dados (DPO)** — hoje `suporte@portaldoeducador.com.br`
4. **Gravar os vídeos** e anexar os materiais dos 10 cursos pelo painel
5. **Escrever o banco de questões** de cada curso (mínimo 3 por curso)
6. Configurar **alerta de orçamento** no Google Cloud
