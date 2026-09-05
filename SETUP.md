# Arquitetura e operação — v2

## Componentes

- `index.html`: catálogo, formação, avaliações, perfil e certificados do titular.
- `admin.html`: conteúdo editorial, versões, publicação, equipe, certificados e relatórios.
- `validar.html`: chama `consultarCertificado`; não lê a coleção privada.
- `functions/index.js`: autorização e operações do servidor.
- `functions/domain.js`: critérios puros de reprodução, publicação e projeção pública.
- `firestore.rules` e `storage.rules`: permissões efetivas.

Os três HTML são autocontidos: estilo e script vão dentro do arquivo, sem CSS externo.

A área do aluno e admin são estáticas; os dados continuam no Firebase existente. Não é necessário mudar para outro framework ou provedor para usar esta entrega.

## Proteção de dados

O certificado completo fica em `certificados/{codigo}`, acessível somente ao titular e ao administrador. `consultarCertificado` lê pelo Admin SDK e devolve exclusivamente nome, CPF mascarado, curso, carga horária, emissão, período, programa, total de aulas e situação. E-mail, CPF inteiro, UID, escola, município e motivo interno de revogação não saem pela função pública.

Códigos têm seis caracteres sorteados criptograficamente, de um alfabeto sem I, O, 0 e 1: o certificado é digitado a partir de papel impresso, e caractere ambíguo vira chamado de suporte. A unicidade é garantida na gravação, que falha se o código já existir. Não existe endpoint para listar certificados publicamente.

Papéis de acesso vêm de custom claims; campos de perfil não promovem usuários. Remoção de papel preserva outras claims. Tokens existentes podem permanecer válidos até renovação: para saída urgente de um colaborador, a administração deve desabilitar a conta e tratar a revogação de sessões na infraestrutura de identidade.

## Progresso

`iniciarAula` valida curso e pré-requisitos, gera token de sessão e registra a última aula. Uma segunda abertura do mesmo curso invalida o token anterior. `acompanharAula` recebe amostras a cada 45 segundos, compara tempo do servidor e acumula trechos sem duplicação. O botão pede conclusão; só o servidor grava aulas verificadas, porcentagem e datas.

Há no máximo 60 segundos de crédito por amostra, teto alinhado ao intervalo de 45 segundos. Tempo mínimo de aula: 40% da duração cadastrada, piso de 60 segundos e teto de duas horas. Vídeos exigem também 90% de cobertura dos trechos de cada vídeo. O player informa a duração real; a duração total da aula vem do cadastro editorial. Confira ambos na revisão do curso.

O mecanismo reduz saltos casuais e manipulação simples. **Não prova atenção, identidade física, nem impede um cliente deliberadamente modificado de simular telemetria ao longo do tempo.** Avaliação e atividades pedagógicas continuam essenciais. Não há vigilância por câmera, bloqueio de ferramentas externas ou promessa de impedir cópia.

Sessões guardam o contexto da aula publicada para evitar reler todo o curso em cada amostra. Cada amostra ainda faz leituras e gravação no Firestore, além de chamada de função; monitorar custo e volume é necessário. Consultas de relatório têm 100 professores por página.

O progresso legado é preservado, mas não é automaticamente declarado como verificado. Certificados existentes não são revogados por esta atualização.

## Avaliações

Uma prova ativa v2 por curso/aluno. Sorteios e contagem são transacionais. As questões, alternativas, gabarito e nota mínima ficam congelados na prova. Ela expira em 90 minutos. Reenvio da mesma correção devolve o resultado já registrado sem consumir tentativa extra.

As respostas ficam no servidor e em rascunho local identificado por usuário/prova. O rascunho local ajuda a recuperar quedas antes da sincronização; usar outro aparelho pode não recuperar a última alteração ainda não enviada. Se duas abas editarem a mesma prova, a última gravação de rascunho prevalece; a correção continua única.

Aprovados recebem explicações. Reprovados veem os itens errados; a próxima tentativa pode repetir algumas questões. Consulta à internet não é impedida.

## Conteúdo e arquivos

A publicação exige título, resumo, carga horária, módulos, aulas com conteúdo e duração, vídeos válidos e banco/gabarito suficientes quando há prova. Vincular uma trilha é opcional. Cursos já publicados ficam imutáveis pelo cliente, mesmo se forem retirados do catálogo depois. Alterações são feitas em uma nova cópia.

A nova versão é outro curso: não migra progresso nem trilhas automaticamente para o novo identificador. Na trilha, a equipe pode substituir/adicionar a nova versão, preservando acesso independente ao curso anterior enquanto necessário.

Uploads aceitam imagens JPEG/PNG/WebP/GIF e documentos listados nas regras. Arquivos são criados com outro nome em cada envio; não podem ser sobrescritos ou apagados pelo cliente. Excluir um material na edição remove o vínculo do rascunho, não o arquivo físico. Essa retenção exige limpeza administrativa futura com verificação de referências. Arquivos antigos públicos e vídeos YouTube não listados não se tornam conteúdo pago/protegido por esta atualização.

## Administração e limites

- Auditoria disponível na coleção privada `auditoria` para administrador; ainda não há tela dedicada de histórico.
- Relatório distingue resultados parciais e completos. Conclusões contam somente progresso v2; certificados antigos ativos continuam contados. Vínculo de escola e município vem do cadastro do professor e não é validação institucional da rede.
- Não foi implementado pagamento, matrícula por contrato, correção de trabalho dissertativo, SCORM ou envio automático de lembretes.
- App Check, MFA do administrador, backups automáticos, alertas e limites por IP dependem de configuração/operação da infraestrutura e não estão automaticamente ativados. `maxInstances` não substitui controle de abuso nem orçamento.
- O HTML ainda usa o SDK web já existente na base. As dependências têm versões fixadas por lockfile para reprodução; uma atualização de SDK/CLI deve passar pelos testes, não por `npm audit fix --force` sem revisão.
- Documento PDF é impressão do navegador. A verificação de autenticidade é o registro consultado pelo código; não há assinatura digital ICP-Brasil adicionada nesta versão.

## Implantação

Use [PUBLICAR.md](PUBLICAR.md). Não use os roteiros antigos de instalação inicial para atualizar o banco existente.
