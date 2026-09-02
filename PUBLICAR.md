# Roteiro de publicação — Academia do Educador

Da pasta no seu computador até `academia.portaldoeducador.com.br` no ar.
**Tempo estimado: 1h30 a 2h** na primeira vez, quase tudo esperando propagação.

Faça na ordem. Vários passos dependem do anterior — pular ordem é o que faz travar.

---

## Antes de começar, tenha em mãos

- [ ] Acesso à conta Google **suporte@portaldoeducador.com.br**
- [ ] **CNPJ e razão social** da NEWPC
- [ ] Um **cartão de crédito** (para ativar o plano Blaze — não será cobrado no seu volume)
- [ ] Acesso ao **painel de DNS** do domínio `portaldoeducador.com.br`
- [ ] Acesso ao **GitHub** da conta `Newpc-Alan`
- [ ] **Node.js** instalado (`node -v` deve responder algo como v20 ou superior)

---

## ETAPA 1 — Dados do emissor  ·  10 min  ·  no seu computador

Abra `index.html` em um editor de texto e localize o bloco `EMISSOR`, logo no começo do
`<script type="module">`. Preencha:

```js
const EMISSOR = {
  razaoSocial: "NEWPC TECNOLOGIA LTDA",     // razão social exata do cartão CNPJ
  nomeFantasia: "Portal do Educador",
  cnpj:      "00.000.000/0001-00",          // ← O SEU CNPJ
  endereco:  "Campo Grande — MS",
  site:      "portaldoeducador.com.br",
  responsavel: "Alan Valerio Pires Ramos",
  cargo:       "Diretor",
  assinatura: ""                            // deixe vazio por enquanto
};
```

Abra o `validar.html` e repita **razaoSocial, cnpj e endereco** no bloco `EMISSOR` de lá.

> **Confere:** abra o `index.html` no navegador, conclua um curso qualquer e emita o certificado.
> O CNPJ tem que aparecer no cabeçalho do documento.

---

## ETAPA 2 — Criar o projeto Firebase  ·  15 min  ·  no navegador

1. Acesse **console.firebase.google.com** com a conta suporte@portaldoeducador.com.br
2. **Adicionar projeto** → nome `portal-educador-academia` → avançar até criar

### 2.1 Ativar o plano Blaze

Menu lateral → engrenagem → **Uso e faturamento** → **Detalhes e configurações** → **Modificar plano**
→ **Blaze**. Cadastre o cartão.

Ainda nessa tela, crie um **alerta de orçamento de R$ 50**. Não é medo — é higiene: qualquer coisa
fora do previsto te avisa antes de virar fatura.

### 2.2 Autenticação

**Criação → Authentication → Vamos começar**

- Ative **Google** → escolha o e-mail de suporte do projeto → Salvar
- Ative **E-mail/senha** → dentro dele, ligue também **Link de e-mail (login sem senha)** → Salvar

Vá em **Authentication → Configurações → Domínios autorizados** e adicione:

```
academia.portaldoeducador.com.br
newpc-alan.github.io
```

> Sem isso o login retorna `auth/unauthorized-domain` e nada funciona.

### 2.3 Banco de dados

**Criação → Firestore Database → Criar banco de dados**

- Local: **southamerica-east1 (São Paulo)** ← escolha errado aqui não tem como desfazer depois
- Modo: **produção**

### 2.4 Arquivos

**Criação → Storage → Vamos começar** → mesmo local **southamerica-east1**

---

## ETAPA 3 — Conectar o código ao projeto  ·  10 min

No console: **engrenagem → Configurações do projeto → Seus apps → ícone `</>`**
Registre o app como `academia-web`. O Firebase mostra um bloco assim:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "portal-educador-academia-a1b2c.firebaseapp.com",
  projectId: "portal-educador-academia-a1b2c",
  storageBucket: "portal-educador-academia-a1b2c.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:abc123"
};
```

Cole esses valores na constante `FIREBASE_CONFIG` de **três arquivos**: `index.html`, `admin.html` e
`validar.html`. **Descomente as linhas** (tire as `//`).

> A `apiKey` ficar visível no código é normal e não é falha de segurança. Ela só identifica o
> projeto. Quem protege os dados são as regras que vamos publicar agora e a lista de domínios
> autorizados que você já configurou.

---

## ETAPA 4 — Publicar regras, índices e Functions  ·  20 min  ·  no terminal

Abra o terminal na pasta do projeto:

```bash
npm install -g firebase-tools
firebase login
firebase use portal-educador-academia-a1b2c
```

Agora, **nesta ordem**:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage

cd functions
npm install
cd ..
firebase deploy --only functions
```

O deploy das Functions demora alguns minutos na primeira vez e ativa APIs do Google Cloud
automaticamente. Se ele pedir para habilitar alguma API, aceite.

> **Confere:** no console, em **Functions**, devem aparecer seis:
> `corrigirQuiz`, `emitirCertificado`, `revogarCertificado`, `definirPapel`, `obterGabarito`,
> `relatorioAdesao` — todas em `southamerica-east1`.
>
> Em **Firestore → Índices**, quatro índices devem estar como *Ativado*. Enquanto estiverem
> "Criando", o catálogo abre vazio. Leva de 1 a 5 minutos.

---

## ETAPA 5 — Importar o conteúdo  ·  10 min

No console: **Configurações do projeto → Contas de serviço → Gerar nova chave privada**.
Salve o arquivo baixado como `scripts/chave-servico.json`.

> Esse arquivo dá acesso total ao projeto. Nunca versione, nunca mande por WhatsApp.
> Já está protegido no `.gitignore`.

```bash
cd scripts
npm install firebase-admin
node importar.mjs
```

Deve listar os 10 cursos e as 4 trilhas. Confira no console, em **Firestore**, que a coleção
`cursos` apareceu.

---

## ETAPA 6 — Criar o primeiro administrador  ·  5 min

**Ordem importa aqui.**

1. Abra o `index.html` no navegador (ainda local mesmo) e **entre com o Google**. É esse primeiro
   login que cria sua conta no Firebase — antes dele, o passo seguinte não tem em quem aplicar.

2. No terminal:

```bash
node definir-admin.mjs alan@newpc.com.br
```

3. **Saia da conta e entre de novo.** O papel viaja dentro do token de acesso, e o token só é
   reemitido no login. Sem isso o painel continua dizendo que você não tem permissão.

4. Abra o `admin.html`. Os 10 cursos devem estar lá.

---

## ETAPA 7 — Publicar no GitHub Pages  ·  15 min

```bash
cd ..                      # volte para a raiz do projeto
git init
git add .
git commit -m "Academia do Educador 1.0"
git branch -M main
git remote add origin https://github.com/Newpc-Alan/academia-do-educador.git
git push -u origin main
```

Se o repositório ainda não existe, crie em **github.com/new** com o nome `academia-do-educador`,
**público**, sem README.

No repositório: **Settings → Pages → Source: Deploy from a branch → main → / (root) → Save**.

### DNS

No painel do domínio `portaldoeducador.com.br`, crie:

| Tipo | Nome | Valor |
|---|---|---|
| CNAME | `academia` | `newpc-alan.github.io` |

Volte em **Settings → Pages**, digite `academia.portaldoeducador.com.br` em *Custom domain* e salve.

Aguarde o certificado SSL ser emitido (de 10 minutos a algumas horas) e então marque
**Enforce HTTPS**.

---

## ETAPA 8 — Ajustes finais  ·  10 min

### Download dos materiais

Por padrão, clicar num PDF abre em outra aba em vez de baixar. Para resolver, com o `gsutil`
instalado (vem com o Google Cloud SDK):

```bash
gsutil cors set storage-cors.json gs://portal-educador-academia-a1b2c.firebasestorage.app
```

Não é impeditivo — o professor consegue salvar pelo visualizador. Deixe para depois se travar.

### Indexação no Google

Em **search.google.com/search-console**, adicione a propriedade
`academia.portaldoeducador.com.br` e envie o sitemap `sitemap.xml`.

---

## Checklist de aceite — só divulgue depois de passar em tudo

**Como professor**, em uma janela anônima:

- [ ] `academia.portaldoeducador.com.br` abre com cadeado de HTTPS
- [ ] Os 10 cursos aparecem no catálogo
- [ ] Entrar com Google funciona
- [ ] Entrar por link de e-mail funciona (o e-mail chega — confira o spam)
- [ ] Uma aula abre, o vídeo toca, o material baixa
- [ ] Marcar aula, fechar o navegador, entrar de outro aparelho: **o progresso continua lá**
- [ ] A avaliação bloqueia antes de concluir o curso
- [ ] Errar de propósito mostra a explicação
- [ ] Emitir certificado exige CPF e recusa CPF inválido
- [ ] O certificado sai com CNPJ, CPF, período e assinatura
- [ ] O verso sai com o conteúdo programático
- [ ] O QR Code do certificado abre a validação e mostra "autêntico"
- [ ] Validar um código inventado retorna "não encontrado"

**Como equipe**, em `academia.portaldoeducador.com.br/admin.html`:

- [ ] O painel abre para você e recusa quem não tem papel
- [ ] Criar curso, módulo e aula funciona
- [ ] Subir um PDF e um PPTX funciona
- [ ] Adicionar dois vídeos na mesma aula funciona
- [ ] Cadastrar questão e ela corrigir certo do lado do professor

**Segurança**, uma vez, com o console do navegador aberto (F12):

- [ ] Tentar ler `cursos/{id}/gabarito` → deve dar permissão negada
- [ ] Tentar criar documento em `certificados` → deve dar permissão negada

**No aparelho real:**

- [ ] Testar em um Chromebook de escola
- [ ] Testar no celular com 4G fraco

---

## Se der errado

| Sintoma | Causa quase sempre | Solução |
|---|---|---|
| `auth/unauthorized-domain` | Domínio não autorizado | Etapa 2.2 — adicione o domínio |
| Catálogo abre vazio, sem erro | Índices ainda criando | Espere 5 min e recarregue |
| `The query requires an index` | Índices não publicados | `firebase deploy --only firestore:indexes` |
| `permission-denied` ao ler cursos | Regras não publicadas | `firebase deploy --only firestore:rules` |
| Painel diz que você não tem permissão | Token antigo | Saia e entre de novo |
| `functions/not-found` ao corrigir quiz | Functions não publicadas ou região errada | `firebase deploy --only functions` |
| Upload de material falha | Storage sem regras, ou papel não aplicado | `firebase deploy --only storage` e relogar |
| Página do GitHub dá 404 | Pages ainda propagando | Espere 10 min |
| HTTPS não aparece | Certificado do GitHub sendo emitido | Espere e então marque *Enforce HTTPS* |

---

## Depois de publicar

O caminho crítico deixa de ser técnico e passa a ser de produção: **gravar os vídeos e escrever o
banco de questões** dos 10 cursos. A plataforma está pronta esperando conteúdo.

Sugestão de sequência para não travar tudo de uma vez: publique primeiro **um** curso completo, com
vídeo, material e avaliação. Use ele para validar a experiência com uns 5 professores de confiança.
O que eles reclamarem, corrija antes de produzir os outros nove.
