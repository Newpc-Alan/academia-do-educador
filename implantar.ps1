# Academia do Educador v2 — executar na raiz do projeto (PowerShell 5.1 ou 7).
[CmdletBinding()]
param(
  [ValidateSet('Verificar','Firebase')][string]$Etapa = 'Verificar',
  [string]$Projeto = 'portal-educador-academia-a1b2c'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot
function Executar {
  param([string]$Programa, [string[]]$CommandArgs)
  & $Programa @CommandArgs
  if ($LASTEXITCODE -ne 0) { throw "Falha em $Programa. Pare aqui, confira a mensagem acima e corrija antes de continuar." }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instale Node.js 22 e reabra o PowerShell.' }
$VersaoNode = & node -p 'process.versions.node'
if (-not $VersaoNode.StartsWith('22.')) { throw "Este pacote usa Node.js 22. Versao encontrada: $VersaoNode. Instale a versao 22 antes de implantar." }
$Configuracao = Get-Content '.firebaserc' -Raw | ConvertFrom-Json
if ($Configuracao.projects.default -ne $Projeto) { throw 'O projeto informado difere de .firebaserc. Confira os tres HTML e .firebaserc antes de prosseguir.' }
Write-Host "Projeto Firebase: $Projeto" -ForegroundColor Cyan
Executar 'npm.cmd' @('ci','--no-audit','--no-fund')
Executar 'npm.cmd' @('ci','--prefix','functions','--no-audit','--no-fund')
Executar 'npm.cmd' @('run','check')
Executar 'npm.cmd' @('test')
if ($Etapa -eq 'Verificar') {
  Write-Host 'Verificacao local concluida. Nenhum arquivo foi publicado.' -ForegroundColor Green
  Write-Host 'Teste completo do Firestore: npm.cmd run test:emulator (requer Java 17 ou superior).'
  exit 0
}
Write-Host 'Entre na conta que administra este projeto. Nao execute firebase init nem scripts de importacao.' -ForegroundColor Cyan
Executar 'npx.cmd' @('firebase','login')
# As regras privadas entram primeiro. A interface antiga pode ficar temporariamente
# indisponivel para salvar ou validar ate que Functions e GitHub Pages sejam atualizados.
Executar 'npx.cmd' @('firebase','deploy','--project',$Projeto,'--only','firestore:rules,firestore:indexes,storage')
Executar 'npx.cmd' @('firebase','deploy','--project',$Projeto,'--only','functions')
Write-Host 'Backend publicado. Agora publique os arquivos atualizados no GitHub seguindo PUBLICAR.md.' -ForegroundColor Green
Write-Host 'Confirme o termino do deploy do GitHub Pages antes de liberar o uso aos alunos.'
