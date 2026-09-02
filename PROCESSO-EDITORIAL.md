# Processo editorial — Academia do Educador

Como um curso sai da ideia e chega ao ar. Este é o documento que a equipe pedagógica segue.

---

## Papéis

| Papel | Pode | Não pode |
|---|---|---|
| **Editor** | Criar cursos, editar conteúdo, subir vídeo e material, montar avaliação, enviar para revisão | Publicar, excluir curso, gerir equipe, revogar certificado |
| **Administrador** | Tudo do editor, mais publicar, excluir, gerir equipe, revogar certificado e gerar relatório de adesão | — |

O papel viaja dentro do token de acesso. Quem recebe um papel novo **precisa sair e entrar de novo** para que ele valha. Isso não é bug: é o que impede alguém de forjar permissão no navegador.

---

## O fluxo, em sete passos

### 1. Rascunho

**Cursos → Novo curso.** Informe título, resumo, nível e carga horária. O curso nasce como rascunho e é invisível para os professores.

A carga horária é o número que vai impresso no certificado e é o que a secretaria vai somar na prestação de contas. Defina pelo tempo real de estudo — vídeo, leitura, atividade e avaliação —, não pela duração dos vídeos.

### 2. Estrutura

Na aba **Conteúdo**, crie os módulos e, dentro deles, as aulas. Só os títulos.

Ver o esqueleto inteiro antes de produzir qualquer coisa é o que evita descobrir na semana da gravação que faltou um tema. Um bom módulo tem de 3 a 5 aulas; um bom curso, de 2 a 4 módulos.

### 3. Conteúdo de cada aula

Abra cada aula e preencha:

- **Texto de apoio** — resumo, roteiro ou instrução de atividade. Aparece abaixo do vídeo.
- **Vídeos do YouTube** — quantos a aula precisar. Cole a URL completa, o link curto `youtu.be` ou apenas o ID: o painel identifica sozinho. Com mais de um vídeo, o professor vê botões para alternar entre as partes.
- **Materiais** — PDF, Word, PowerPoint, planilhas e imagens, até 40 MB por arquivo. Arraste para a área de upload.

**Sobre os vídeos:** marque como **não listados** no YouTube. Funcionam normalmente aqui e não aparecem na busca nem no seu canal. Eles são exibidos pelo domínio `youtube-nocookie.com`, que não instala cookie de rastreamento antes da reprodução — detalhe pequeno que faz diferença numa auditoria de LGPD.

**Sobre os materiais:** o nome do arquivo vira o título exibido. Suba `Modelo de plano de aula.docx`, não `plano_v3_final_REVISADO.docx`.

### 4. Avaliação

Na aba **Avaliação**:

- Ative a avaliação obrigatória, defina a nota mínima (padrão 70%) e o número de tentativas (padrão 3).
- Cadastre as questões: enunciado, quatro alternativas, a resposta correta e uma explicação.

**Mínimo recomendado:** 3 questões por curso, com ao menos uma por módulo. Para cursos de 5 horas ou mais, 5 a 8 questões.

A **explicação** não é opcional na prática. Ela aparece depois da correção, tanto para quem acertou quanto para quem errou, e é o que transforma a avaliação em aprendizagem em vez de só uma nota. Escreva a explicação como se estivesse respondendo à pergunta "por quê?" de um professor curioso.

**Como escrever alternativas erradas:** um distrator bom é uma resposta que uma pessoa razoável daria por um motivo compreensível. Alternativa absurda não avalia nada — só ajuda a acertar por eliminação.

### 5. Revisão

Envie para **revisão** na aba Publicação.

Outra pessoa da equipe abre a Academia como professor comum e faz o curso inteiro: confere se os vídeos tocam, se os arquivos baixam, se o texto está sem erro e se as questões fazem sentido depois de ver o conteúdo. Revisar lendo o painel não conta — o painel mostra o que você cadastrou, não o que o professor vê.

### 6. Publicação

Um administrador confere a lista de verificação da aba **Publicação** e coloca o curso no ar. A partir daí ele aparece no catálogo e passa a contar para certificação.

A lista de verificação não trava a publicação — cada item pendente é apenas algo que o professor vai sentir falta.

### 7. Trilha

Em **Trilhas**, encaixe o curso na sequência a que ele pertence.

Curso solto no catálogo é encontrado. Curso dentro de trilha é *cursado até o fim* — a trilha cria a expectativa de continuidade, e é ela que faz o professor concluir três cursos em vez de um.

---

## Regras que evitam dor de cabeça

**Acrescente aulas no fim do módulo.** O progresso é gravado pelo identificador da aula (`m2a3`), então inserir uma aula nova não mexe no progresso de quem já estava cursando. Mas **excluir** uma aula recalcula o percentual de todo mundo — quem estava em 100% pode voltar a 100% com menos aulas, e quem estava em 80% muda de posição. Se precisar remover conteúdo de curso publicado, avalie esvaziar a aula em vez de excluí-la.

**Não mude a carga horária depois de publicar.** Certificados já emitidos guardam a carga horária no próprio registro e continuam corretos, mas você passa a ter dois grupos de professores com certificados diferentes do mesmo curso. Se precisar mesmo mudar, é mais limpo criar uma versão nova do curso.

**Curso com avaliação exige aprovação.** Se você ativar a avaliação em um curso que já tem gente concluindo, quem ainda não emitiu certificado passará a precisar da nota mínima. Ative avaliação preferencialmente antes de publicar.

---

## Checklist rápido antes de publicar

- [ ] Título claro e resumo que diz o que o professor ganha
- [ ] Carga horária definida pelo tempo real de estudo
- [ ] Todos os vídeos tocam (testado fora do painel)
- [ ] Todos os materiais baixam e abrem
- [ ] Texto de apoio revisado
- [ ] Avaliação com no mínimo 3 questões e explicação em todas
- [ ] Curso percorrido inteiro por alguém que não o produziu
- [ ] Vinculado a pelo menos uma trilha

---

## Ritmo sugerido de produção

Para uma equipe de duas pessoas, um curso de 4 a 5 horas leva em torno de duas semanas:

| Semana | Etapa |
|---|---|
| 1 — início | Estrutura de módulos e aulas, definição da carga horária |
| 1 — meio | Roteiro e gravação dos vídeos |
| 1 — fim | Upload, texto de apoio e materiais |
| 2 — início | Banco de questões e explicações |
| 2 — meio | Revisão por outra pessoa |
| 2 — fim | Ajustes, publicação e vínculo com a trilha |

Publicar um curso por quinzena mantém a Academia viva sem sobrecarregar a equipe — e dá um argumento comercial concreto: conteúdo novo todo mês, não catálogo parado.
