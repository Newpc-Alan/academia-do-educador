/* ============================================================================
   CONTEÚDO INICIAL — 10 cursos, 4 trilhas, 44 horas
   Usado uma única vez pelo script `importar.mjs` para popular o Firestore.
   Depois disso, TODO o conteúdo é editado pelo painel administrativo.
   ========================================================================== */

export const CURSOS = [
  {
    id:"primeiros-passos", titulo:"Primeiros Passos no Portal do Educador",
    nivel:"iniciante", horas:2, ordem:1,
    resumo:"Domine a plataforma que vai organizar seu planejamento, suas turmas e seus materiais em um só lugar.",
    modulos:[
      {t:"Conhecendo a plataforma", a:["Visão geral e primeiro acesso","Organizando turmas e disciplinas","Onde ficam seus materiais"]},
      {t:"Colocando em prática",    a:["Criando seu primeiro plano de aula","Compartilhando com a coordenação","Rotina semanal sugerida"]}
    ]
  },
  {
    id:"ia-transparencia", titulo:"Inteligência Artificial com Transparência e Propósito",
    nivel:"iniciante", horas:4, ordem:2,
    resumo:"O que a IA faz, o que ela não faz e como usá-la sem abrir mão da sua autoria pedagógica.",
    modulos:[
      {t:"Fundamentos",              a:["O que é e o que não é inteligência artificial","Como um modelo de linguagem realmente funciona","Limites, erros e alucinações"]},
      {t:"Ética e responsabilidade", a:["Viés algorítmico na sala de aula","LGPD: dados de alunos e o que nunca inserir","Autoria docente e uso responsável"]},
      {t:"Uso consciente",           a:["Checagem de informação gerada por IA","Conversando com alunos sobre IA","Política de uso de IA na escola"]}
    ]
  },
  {
    id:"atividades-ia", titulo:"Como Criar Atividades Pedagógicas com IA",
    nivel:"intermediario", horas:4, ordem:3,
    resumo:"Da folha em branco à atividade pronta: prompts que funcionam para exercícios, textos e projetos.",
    modulos:[
      {t:"Estrutura de um bom pedido", a:["Anatomia de um prompt pedagógico","Contexto, público e objetivo de aprendizagem","Refinando o resultado em camadas"]},
      {t:"Tipos de atividade",         a:["Exercícios com gabarito comentado","Textos, leituras e interpretação","Projetos e situações-problema","Adaptação para diferentes níveis"]},
      {t:"Qualidade",                  a:["Revisão crítica antes de aplicar","Ajuste ao seu contexto e à sua turma"]}
    ]
  },
  {
    id:"planejamento-ia", titulo:"Planejamento de Aulas com Inteligência Artificial",
    nivel:"intermediario", horas:5, ordem:4,
    resumo:"Reduza o tempo de planejamento sem perder qualidade: do plano bimestral à aula de amanhã.",
    modulos:[
      {t:"Do currículo ao plano",   a:["Partindo da habilidade da BNCC","Sequência didática em etapas","Distribuindo a carga do bimestre"]},
      {t:"Plano de aula na prática",a:["Objetivos, metodologia e recursos","Diferenciação para alunos com ritmos distintos","Plano B para quando a internet cai"]},
      {t:"Ganho de tempo",          a:["Modelos reutilizáveis","Rotina de replanejamento semanal","Registro para a coordenação"]}
    ]
  },
  {
    id:"avaliacoes-simulados", titulo:"Criação de Avaliações e Simulados",
    nivel:"intermediario", horas:5, ordem:5,
    resumo:"Itens bem construídos, alinhados à habilidade avaliada e com correção que gera informação útil.",
    modulos:[
      {t:"Construção de itens", a:["Matriz de referência e alinhamento","Enunciado, comando e distratores","Erros clássicos que invalidam a questão"]},
      {t:"Formatos",            a:["Prova objetiva e discursiva","Simulado no modelo SAEB/ENEM","Avaliação formativa e diagnóstica"]},
      {t:"Depois da prova",     a:["Lendo os resultados por habilidade","Devolutiva que o aluno entende","Replanejando a partir do que a turma errou"]}
    ]
  },
  {
    id:"bncc-planejamento", titulo:"BNCC Aplicada ao Planejamento",
    nivel:"iniciante", horas:4, ordem:6,
    resumo:"Sair do documento e chegar na aula: como transformar habilidades da BNCC em prática real.",
    modulos:[
      {t:"Entendendo a Base", a:["Estrutura, competências e códigos","Lendo uma habilidade corretamente","Currículo nacional, estadual e municipal"]},
      {t:"Aplicando",         a:["Da habilidade ao objetivo de aula","Progressão ao longo do ano","Integrando componentes curriculares"]},
      {t:"Comprovando",       a:["Registro alinhado à Base","Diálogo com a coordenação pedagógica"]}
    ]
  },
  {
    id:"metodologias-ativas", titulo:"Metodologias Ativas na Prática",
    nivel:"intermediario", horas:5, ordem:7,
    resumo:"Sala de aula invertida, aprendizagem por projetos e rotação por estações — com o que a escola pública tem.",
    modulos:[
      {t:"Fundamentos",              a:["O que muda no papel do professor","Escolhendo a metodologia certa para o objetivo","Gerindo o tempo da aula ativa"]},
      {t:"Modelos",                  a:["Sala de aula invertida","Aprendizagem baseada em projetos","Rotação por estações","Aprendizagem entre pares"]},
      {t:"Realidade da rede pública",a:["Turmas grandes e recursos limitados","Avaliando aprendizagem em metodologia ativa"]}
    ]
  },
  {
    id:"gestao-sala-engajamento", titulo:"Gestão de Sala de Aula e Engajamento",
    nivel:"intermediario", horas:6, ordem:8,
    resumo:"Clima de sala, combinados e estratégias práticas para recuperar a atenção da turma.",
    modulos:[
      {t:"Clima e combinados", a:["Construindo acordos com a turma","Rotinas que reduzem conflito","Comunicação assertiva com adolescentes"]},
      {t:"Engajamento",        a:["Início de aula que prende atenção","Gamificação sem virar bagunça","Protagonismo e escuta do aluno"]},
      {t:"Situações difíceis", a:["Mediação de conflitos","Aluno desmotivado: o que fazer","Parceria com família e coordenação"]}
    ]
  },
  {
    id:"gestao-dados", titulo:"Gestão Escolar Orientada por Dados",
    nivel:"avancado", horas:5, ordem:9,
    resumo:"Para coordenação e direção: transformar frequência, notas e indicadores em decisão pedagógica.",
    modulos:[
      {t:"Que dado importa", a:["Frequência, fluxo e aprendizagem","IDEB, SAEB e avaliações da rede","Indicadores internos da escola"]},
      {t:"Análise",          a:["Montando o painel da escola","Identificando turmas e alunos em risco","Comparando bimestres com honestidade"]},
      {t:"Decisão",          a:["Do dado ao plano de ação","Apresentando resultados ao conselho","Prestação de contas à secretaria"]}
    ]
  },
  {
    id:"tecnologia-sala", titulo:"Tecnologia na Rotina Escolar: Chromebooks, Lousas e Rede",
    nivel:"iniciante", horas:4, ordem:10,
    resumo:"Tirar o equipamento do armário e colocar na aula: uso pedagógico real do que a escola já tem.",
    modulos:[
      {t:"Equipamento",   a:["Chromebook: o essencial para o professor","Lousa digital sem medo","Quando a internet está ruim: trabalhando offline"]},
      {t:"Uso pedagógico",a:["Atividade que só faz sentido com tecnologia","Gerenciando 30 alunos com 30 telas","Cuidados com segurança e privacidade"]},
      {t:"Sustentação",   a:["Rotina de conservação e guarda","Quando e como acionar o suporte"]}
    ]
  }
];

export const TRILHAS = [
  { id:"educador-digital",     nome:"Educador Digital",     ordem:1, resumo:"Para quem está começando: plataforma, IA e equipamento da escola.",             cursos:["primeiros-passos","ia-transparencia","tecnologia-sala"] },
  { id:"planejamento-ia",      nome:"Planejamento com IA",  ordem:2, resumo:"Da habilidade da BNCC à aula pronta, usando IA com critério.",                 cursos:["bncc-planejamento","planejamento-ia","atividades-ia"] },
  { id:"praticas-pedagogicas", nome:"Práticas Pedagógicas", ordem:3, resumo:"Metodologias ativas, engajamento e avaliação que gera informação.",            cursos:["metodologias-ativas","gestao-sala-engajamento","avaliacoes-simulados"] },
  { id:"gestao-educacional",   nome:"Gestão Educacional",   ordem:4, resumo:"Para coordenação e direção: dados, alinhamento curricular e uso ético de IA.", cursos:["gestao-dados","ia-transparencia","bncc-planejamento"] }
];

/* Questões de exemplo — servem para o curso já nascer com avaliação funcional.
   A equipe pedagógica substitui pelo banco real através do painel.          */
export const QUESTOES_EXEMPLO = {
  "ia-transparencia": [
    {
      enunciado:"Um professor pede a um assistente de IA a biografia de um autor e recebe uma data de nascimento incorreta, apresentada com total segurança. Como se chama esse comportamento?",
      alternativas:["Viés algorítmico","Alucinação","Sobreajuste","Falha de conexão"],
      correta:1,
      explicacao:"Alucinação é quando o modelo gera informação plausível, porém falsa, com aparência de certeza. Por isso toda informação factual gerada por IA precisa ser conferida antes de chegar ao aluno."
    },
    {
      enunciado:"Segundo a LGPD, qual destas práticas o professor deve evitar ao usar ferramentas de IA?",
      alternativas:["Pedir sugestões de atividade sobre um tema","Inserir nome completo e notas de alunos identificáveis","Solicitar exemplos de questões de múltipla escolha","Pedir revisão de texto do próprio plano de aula"],
      correta:1,
      explicacao:"Dados que identificam alunos são dados pessoais, e parte deles é dado de criança e adolescente — com proteção reforçada. Anonimize sempre antes de usar qualquer ferramenta externa."
    },
    {
      enunciado:"Qual afirmação melhor descreve a autoria docente no uso de IA?",
      alternativas:["A IA substitui o professor no planejamento","O professor é responsável pelo material que aplica, tendo usado IA ou não","O uso de IA dispensa revisão pedagógica","Material gerado por IA não pode ser usado em sala"],
      correta:1,
      explicacao:"A ferramenta é meio, não autor. A responsabilidade pedagógica pelo que entra em sala permanece integralmente do professor."
    }
  ]
};
