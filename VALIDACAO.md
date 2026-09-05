# Validação da versão 2

Verificação realizada em 5 de setembro de 2026, em ambiente local isolado.

**Resultado: 18 testes aprovados**, além das verificações de sintaxe e JSON.

## Testes incluídos

- **5 testes de regras de negócio:** saltos de vídeo, repetição de trechos, ausência prolongada, projeção pública e configuração inválida de curso.
- **3 testes de interface em DOM simulado:** catálogo/aula/notas, administração/versionamento/relatório e formato de código de certificado.
- **10 testes de integração com emuladores Firestore e Storage:** privacidade, titularidade, papéis, publicação, sessão e tempo, progresso legado, concorrência, emissão, revogação, paginação, telemetria persistida e imutabilidade de arquivos.
- Sintaxe dos scripts dos três HTML e leitura das configurações JSON.

Os testes de concorrência fazem três solicitações simultâneas de sorteio, correção e emissão, verificando uma prova, uma tentativa contabilizada e um certificado. Os testes não acessam o Firebase real do usuário.

O teste de sessão altera somente o relógio registrado em documentos do **emulador** para simular a passagem do tempo. Não existe função administrativa de acelerar aulas ou bypass correspondente na aplicação entregue.

## Como reproduzir

Node 22, Java 17 ou superior:

```powershell
npm.cmd ci
npm.cmd ci --prefix functions
npm.cmd run check
npm.cmd test
npm.cmd run test:emulator
```

## Limites da validação

- Interface verificada por execução em DOM simulado; não houve inspeção visual de pixels. O navegador remoto bloqueou o acesso à prévia local.
- Google Login, link por e-mail, integração com o player YouTube real, rede móvel e impressão devem ser conferidos no ambiente publicado. Os testes de telemetria usam amostras controladas e não automação do YouTube.
- As funções foram chamadas pelo método de teste `run` com requisições controladas e Firestore real do emulador. O transporte HTTPS, configuração de região, IAM e autenticação da produção dependem do deploy.
- Não houve execução do script PowerShell em Windows neste ambiente Linux. Os comandos e parâmetros foram preparados para PowerShell 5.1/7, com parada em erro de comandos nativos.
- Nenhum deploy no Firebase ou GitHub foi realizado nesta preparação.
- Esta entrega não é um teste de invasão completo nem uma certificação de segurança.

O roteiro de conferência após publicar está em `PUBLICAR.md`.
