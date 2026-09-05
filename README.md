# Academia do Educador — versão 2

Atualização da aplicação existente, mantendo Firebase e GitHub Pages.

**Para implantar no Windows: leia [PUBLICAR.md](PUBLICAR.md).** O script `implantar.ps1` organiza verificação e publicação no Firebase. O envio ao GitHub é feito depois, no repositório existente.

## Entregue nesta versão

- Certificados completos privados; consulta pública mínima por código, compatível com registros antigos.
- Sessões de estudo validadas no servidor, posição de retomada e acompanhamento de trechos de vídeo.
- Provas e critérios congelados por tentativa; correção e emissão idempotentes com transações.
- Respostas de avaliação recuperáveis, prazo visível e anotações privadas por aula.
- Painel inicial personalizado, retomada da última aula e ajustes da sala de aula para celular.
- Publicação validada no servidor e versões publicadas imutáveis; criação de cópia editável.
- Relatórios paginados; certificados revogados excluídos dos totais; CSV protegido contra fórmulas.
- Registro de auditoria de publicação, versões, emissão, revogação e alteração de papéis.
- Arquivos imutáveis para preservar os materiais de versões já publicadas.

## Compatibilidade

Os cursos e certificados não são excluídos. Novas certificações exigem revalidação das aulas no acompanhamento v2. Certificados já emitidos permanecem acessíveis. Não rode os scripts de importação inicial ao atualizar.

## Validação local

```powershell
npm.cmd ci
npm.cmd ci --prefix functions
npm.cmd run check
npm.cmd test
npm.cmd run test:emulator
```

O último comando usa Firestore Emulator e requer Java. O ambiente de produção usa Node 22.

Veja [VALIDACAO.md](VALIDACAO.md) para resultados e limites; [SETUP.md](SETUP.md) para arquitetura e operação.
