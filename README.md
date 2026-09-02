<div align="center">

<img src="assets/pe-logo-192.png" width="110" alt="Portal do Educador">

# Academia do Educador

**Formação continuada para quem transforma a educação**

Plataforma de cursos livres para professores da rede pública, com certificado auditável
e emissão verificada no servidor.

[**academia.portaldoeducador.com.br**](https://academia.portaldoeducador.com.br)

</div>

---

## O que é

A Academia do Educador é a frente de formação continuada do **Portal do Educador**,
desenvolvida pela **NEWPC Tecnologia** (Campo Grande/MS).

São cursos objetivos, construídos a partir da realidade concreta da escola pública brasileira:
turmas grandes, internet instável, tempo curto de planejamento e a necessidade de comprovar
resultado em prestação de contas.

O acesso é gratuito e o certificado tem código de autenticidade verificável publicamente.

---

## Para quem chegou pelo código

Esta é uma aplicação web estática servida pelo GitHub Pages, com backend no Firebase.
Sem framework, sem build, sem dependência de runtime — três arquivos HTML autocontidos.

### Arquitetura

```
NAVEGADOR                          SERVIDOR (Admin SDK)
─────────────────────────          ────────────────────────────
index.html    ── lê ──►  Firestore
admin.html    ── escreve ►  cursos, aulas, questões
validar.html  ── lê ──►  certificados (público)
                                   Cloud Functions
              ── chama ─────────►  corrigirQuiz       lê o gabarito
                                   emitirCertificado  confere e grava
                                   revogarCertificado
                                   definirPapel
                                   obterGabarito
                                   relatorioAdesao
```

### A decisão de projeto que sustenta o certificado

Três coisas o navegador **nunca** consegue fazer, por regra de segurança do Firestore:

- **ler a coleção `gabarito`** — as respostas certas da avaliação
- **escrever em `certificados`** — a emissão acontece só no servidor
- **escrever em `tentativas`** — a nota da avaliação

Sem essa separação, qualquer pessoa com o console do navegador aberto emitiria um certificado de
40 horas em dez segundos. Com ela, o documento tem fé.

O conteúdo programático é **congelado dentro do certificado** no momento da emissão. Se a equipe
reeditar o curso depois, o documento já emitido continua descrevendo o curso como ele era — é isso
que o torna auditável.

---

## Estrutura

| Arquivo | O que faz |
|---|---|
| `index.html` | Aplicação do professor: catálogo, videoaulas, materiais, avaliação, certificado |
| `admin.html` | Painel editorial: cursos, módulos, aulas, upload, banco de questões, publicação |
| `validar.html` | Validação pública de certificado, sem login |
| `functions/` | Cloud Functions em Node 22, região `southamerica-east1` |
| `firestore.rules` · `storage.rules` | Regras de segurança |
| `firestore.indexes.json` | Índices compostos do banco |
| `scripts/` | Importação do conteúdo inicial e definição do primeiro administrador |

---

## Documentação

| Documento | Para quem |
|---|---|
| [`SETUP.md`](SETUP.md) | Arquitetura, modelo de dados, custos e limites conhecidos |
| [`PUBLICAR.md`](PUBLICAR.md) | Roteiro de implantação do zero, passo a passo |
| [`PROCESSO-EDITORIAL.md`](PROCESSO-EDITORIAL.md) | Como a equipe pedagógica publica um curso |

---

## Modo demonstração

Abra `index.html` ou `admin.html` sem preencher o `FIREBASE_CONFIG` e a aplicação roda com dados de
exemplo em memória — navegação, progresso, avaliação, emissão de certificado e cadastro de curso.
Nada é salvo.

Serve para avaliar a experiência antes de configurar qualquer infraestrutura.

---

## Certificação

Os cursos são livres de formação continuada, nos termos da **Lei nº 9.394/1996** (LDB, arts. 7º e 39)
e do **Decreto nº 5.154/2004**.

Cada certificado traz identificação completa do emissor com CNPJ, nome e CPF do participante,
carga horária, período de realização, assinatura do responsável, código de autenticidade com QR Code
e o conteúdo programático no verso.

O aproveitamento para progressão funcional segue os critérios do plano de carreira de cada rede de
ensino.

---

## Para secretarias de educação

Redes parceiras recebem relatório de adesão e conclusão por escola e por servidor, permitindo
comprovar a execução de formação continuada em prestação de contas.

Contato institucional: **suporte@portaldoeducador.com.br**

---

<div align="center">

**NEWPC TECNOLOGIA LTDA** · CNPJ 20.892.343/0001-15 · Campo Grande — MS

</div>
