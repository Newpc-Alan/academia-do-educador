# Implantação da atualização v2 — Firebase + GitHub Pages

Este é o guia atual. Use o projeto que já existe; não crie outro Firebase e não rode `firebase init`.

O pacote mantém o projeto `portal-educador-academia-a1b2c`, a região `southamerica-east1` e o domínio configurado no ZIP original. Não acessei seu console nem publiquei mudanças na sua conta.

## 1. O que muda para os alunos

- Certificados existentes continuam armazenados e seus códigos continuam consultáveis, inclusive códigos antigos de seis caracteres. A consulta pública passa por uma função que devolve apenas os campos permitidos. CPF completo e e-mail ficam privados.
- O histórico antigo de aulas não é apagado. Para uma nova certificação, as aulas precisam ser concluídas novamente com o acompanhamento v2. O percentual exibido usa as aulas verificadas pelo novo mecanismo; isso pode aparecer como progresso menor após a atualização. Certificados já emitidos continuam em Meus certificados.
- Avaliações antigas ainda abertas precisam ser reabertas para receber o formato v2. Avaliações já corrigidas e certificados não são apagados. Uma aprovação antiga, sem certificado, não dispensa a revalidação das aulas.
- Curso publicado fica protegido contra edição. Para alterar conteúdo, abra Publicação → Criar nova versão. A cópia tem outro identificador, começa em rascunho e não herda matrículas, progresso ou certificados.
- Não retire do ar a versão antiga enquanto houver alunos nela. Mudar seu status para rascunho/revisão retira o acesso. As duas versões podem ficar publicadas ao mesmo tempo.

Faça a implantação em um período sem avaliações em andamento. Entre a atualização das regras e a publicação dos HTML, o site antigo pode apresentar erros de salvamento ou validação. Atualize os dois lados na mesma janela.

## 2. Preparar o computador

Use **Node.js 22**, Git e PowerShell. O script usa `npm.cmd` e `npx.cmd`, evitando a restrição comum a arquivos `npm.ps1` no Windows.

```powershell
node -v
git --version
```

Se Node não mostrar `v22...`, instale a versão 22 e reabra o PowerShell. A versão das Functions está definida como Node 22.

Não é necessário instalar Firebase CLI globalmente. `npm ci` instalará a versão fixada no pacote.

## 3. Fazer backup do repositório atual

Extraia o ZIP atualizado em uma pasta separada. Nos exemplos abaixo, altere **somente os dois caminhos** para as pastas reais do seu computador.

```powershell
$repoAcademia = 'C:\Projetos\academia-do-educador'
$novaAcademia = 'C:\Downloads\academia-do-educador'
Set-Location $repoAcademia
git status --short
git remote -v
```

Confirme que é o repositório correto. Se `git status` listar arquivos modificados, salve seu trabalho antes de prosseguir. O backup por Git abaixo inclui arquivos já registrados no repositório; não inclui arquivos locais não versionados.

```powershell
$marcaAcademia = 'backup-antes-v2-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
git tag $marcaAcademia
$zipBackupAcademia = Join-Path (Split-Path $repoAcademia -Parent) ($marcaAcademia + '.zip')
git archive --format=zip --output=$zipBackupAcademia HEAD
```

Guarde também a configuração do projeto Firebase. Se já usa exportação/backup do Firestore, faça um ponto de recuperação antes de atualizar. Esta versão não executa migração destrutiva nem exclui alunos, cursos ou certificados.

**Nunca coloque chave de conta de serviço no GitHub.** Este deploy usa `firebase login`; não pede download de chave privada.

## 4. Copiar a atualização para o repositório

O arquivo `arquivos-v2.json` lista exatamente o que deve ser copiado. O comando não remove sua pasta `.git` nem copia `node_modules`.

```powershell
$arquivosAcademia = Get-Content (Join-Path $novaAcademia 'arquivos-v2.json') -Raw | ConvertFrom-Json
foreach ($arquivoAcademia in $arquivosAcademia) {
    $origemAcademia = Join-Path $novaAcademia $arquivoAcademia
    $destinoAcademia = Join-Path $repoAcademia $arquivoAcademia
    New-Item -ItemType Directory -Force -Path (Split-Path $destinoAcademia -Parent) | Out-Null
    Copy-Item -LiteralPath $origemAcademia -Destination $destinoAcademia -Force
}
Set-Location $repoAcademia
git diff --stat
```

Se você ainda não tem uma cópia local do repositório, use o endereço real mostrado pelo botão **Code** no GitHub para cloná-lo primeiro. Não substitua o endereço do repositório por um exemplo inventado.

Confira `.firebaserc` e o bloco `FIREBASE_CONFIG` dos três HTML. Eles mantêm os valores do arquivo recebido. Não altere o projeto se o site atual usa esses mesmos dados.

## 5. Verificar antes de publicar

```powershell
.\implantar.ps1 -Etapa Verificar
```

Essa etapa instala as dependências fixadas, verifica a sintaxe e executa os testes locais. Não publica nada.

Se o Windows bloquear **o próprio implantar.ps1**, leia o script e libere apenas o arquivo baixado:

```powershell
Unblock-File .\implantar.ps1
.\implantar.ps1 -Etapa Verificar
```

Se a política corporativa ainda impedir scripts, execute manualmente os comandos equivalentes abaixo. Não altere a política da máquina:

```powershell
npm.cmd ci
npm.cmd ci --prefix functions
npm.cmd run check
npm.cmd test
```

Teste adicional recomendado para a equipe técnica, com Java 17 ou superior instalado:

```powershell
java -version
npm.cmd run test:emulator
```

Os testes usam **demo-academia** no emulador local; não gravam no seu projeto real. Os avisos `PERMISSION_DENIED` fazem parte dos testes de bloqueio; o resultado final deve mostrar todos os testes aprovados.

## 6. Publicar o Firebase

```powershell
.\implantar.ps1 -Etapa Firebase
```

O navegador abrirá para login. Entre com a conta que já administra o projeto. A ordem aplicada é:

1. Regras privadas do Firestore, índices e regras de arquivos.
2. Cloud Functions atualizadas e novas funções.
3. GitHub Pages, na etapa seguinte.

Se preferir comandos manuais, após os testes:

```powershell
npx.cmd firebase login
npx.cmd firebase deploy --project portal-educador-academia-a1b2c --only 'firestore:rules,firestore:indexes,storage'
npx.cmd firebase deploy --project portal-educador-academia-a1b2c --only 'functions'
```

As aspas em `--only` são importantes no PowerShell quando há vírgulas.

**Pare se qualquer comando falhar.** Não considere a implantação concluída apenas porque uma parte apareceu como concluída. Não execute os antigos scripts `importar.mjs` ou `conteudo-inicial.js`: eles são de instalação inicial, não desta atualização.

O projeto precisa ter faturamento e APIs necessários às Cloud Functions já habilitados. Acompanhe os custos no console: agora o acompanhamento de aula faz chamadas periódicas ao servidor. `maxInstances` limita concorrência, não é um teto de gastos.

## 7. Conferir no console.firebase.google.com

Abra o **mesmo projeto** e confira:

- **Firestore → Regras:** em `certificados`, leitura permitida apenas para o titular e administrador; não pode existir `allow read: if true` nessa coleção.
- **Firestore → Índices:** aguarde os índices terminarem de criar, se houver algum pendente.
- **Functions:** devem existir as 14 funções abaixo, em São Paulo (`southamerica-east1`).
- **Authentication → Configurações → Domínios autorizados:** mantenha o domínio usado pelo site e pelo login.
- **Storage → Regras:** arquivos novos são aceitos nos tipos permitidos; sobrescrita e exclusão pelo navegador estão bloqueadas.

Funções esperadas:

```text
iniciarAula
acompanharAula
sortearProva
salvarRespostas
corrigirQuiz
emitirCertificado
consultarCertificado
revogarCertificado
obterGabarito
definirPapel
publicarCurso
duplicarCurso
excluirCurso
relatorioAdesao
```

A lista contém **14 funções**. Use os nomes como conferência; o número do painel pode incluir outras funções já existentes no projeto.

Não cole trechos das regras antigas por cima das novas. Publique os arquivos completos do pacote.

## 8. Publicar os arquivos no GitHub

Na pasta do repositório, revise e envie somente a lista da atualização:

```powershell
Set-Location $repoAcademia
git diff --stat
$arquivosAcademia = Get-Content '.\arquivos-v2.json' -Raw | ConvertFrom-Json
git add -- $arquivosAcademia
git diff --cached --stat
git commit -m 'Atualiza academia: seguranca, progresso, avaliacoes e interface'
git push
```

Se o branch ainda não tiver destino configurado, confira seu nome e publique esse mesmo branch:

```powershell
$ramoAcademia = git branch --show-current
git push -u origin $ramoAcademia
```

No GitHub, acompanhe **Actions** até o deploy do Pages ficar verde. Em **Settings → Pages**, mantenha a origem de publicação que o site já usa. Não troque o branch sem necessidade. Se Pages usa outro branch/pasta ou um fluxo próprio, incorpore essa atualização à origem configurada antes de esperar mudanças no site.

Mantenha `CNAME` e `.nojekyll`. Os três HTML são autocontidos: não há CSS externo para subir junto.

## 9. Testar o site publicado

Use uma conta de professor de teste, sem papel administrativo:

1. Recarregue com **Ctrl+F5** e entre na conta.
2. Abra um curso, inicie uma aula e confira a mensagem de acompanhamento conectado.
3. Em uma aula com vídeo, avance para o final: isso não deve concluir a aula. Assista de forma contínua; saltos e trechos repetidos não devem aumentar indevidamente o crédito.
4. Em aula de texto, acompanhe o tempo mínimo. Navegar/rolar mantém o sinal de atividade; após inatividade, o tempo não deve continuar acumulando indefinidamente.
5. Salve uma anotação, saia da aula e retorne.
6. Conclua uma aula e recarregue: o progresso salvo precisa permanecer.
7. Abra uma avaliação, responda parte, recarregue e confira as respostas recuperadas e o prazo.
8. Envie a avaliação e confira a nota. Uma nova tentativa exige nova ação; repetir uma solicitação já corrigida não deve consumir outra tentativa.
9. Emita um certificado e repita a emissão: o código deve ser o mesmo.
10. Em uma janela anônima, consulte o código na página de validação. CPF completo e e-mail não devem aparecer na resposta da função.
11. No admin, abra Publicação → Criar nova versão e confira que surgiu um rascunho independente. Não edite nem exclua o curso original para fazer esse teste.
12. Confira desktop e celular, incluindo navegação, notas, lista de módulos e impressão do certificado. Esta revisão visual final não foi possível no navegador remoto da preparação.

## 10. Falhas comuns

| Sintoma | O que conferir |
|---|---|
| `node` não reconhecido | Instalação do Node 22 e reabertura do terminal |
| `npm.ps1` bloqueado | Use `npm.cmd` e `npx.cmd` como nos exemplos |
| `permission-denied` ao concluir aula | Confirme que publicou Functions e os HTML v2; a versão antiga não grava mais progresso diretamente |
| Função não encontrada | Deploy incompleto, região incorreta ou HTML apontando para outro projeto |
| Curso não publica | Confira duração de cada aula, módulos, conteúdo, vídeos, tamanho da prova e gabarito |
| Botão de editar desabilitado | Curso já publicado: crie nova versão na aba Publicação |
| Progresso ficou menor | A interface mostra aulas verificadas v2; histórico legado não foi apagado |
| Vídeo não conclui | São necessários 90% dos trechos de cada vídeo e o tempo mínimo da aula; confira também a duração cadastrada |
| Token de outra aba | Feche a segunda aba do mesmo curso e reabra a aula na aba desejada |
| Certificado antigo não valida | Publique `consultarCertificado` e o novo `validar.html` |
| Relatório parcial | Clique em carregar mais até aparecer “Todas as páginas”; CSV informa quando é parcial |

## 11. Recuperação sem reabrir a exposição de dados

O backup Git permite recuperar o código anterior. Porém, **não restaure as regras públicas antigas dos certificados**. Se houver erro após o deploy, mantenha as novas regras privadas, restrinja temporariamente o uso da formação e corrija a parte que falhou. Voltar apenas os HTML antigos não restaura compatibilidade com o acompanhamento v2.

Não apague coleções para “reiniciar”. Preserve o banco e os certificados. Uma reversão completa exige adaptação compatível das funções e da interface, mantendo a proteção dos dados.

## Referências técnicas

- [Implantação com Firebase CLI](https://firebase.google.com/docs/cli)
- [Runtime Node.js das Functions](https://firebase.google.com/docs/functions/manage-functions)
- [Transações do Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Leitura por documento e separação de dados privados](https://firebase.google.com/docs/firestore/security/rules-fields)
