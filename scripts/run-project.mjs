import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const windowsShell = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe'

process.chdir(repoRoot)

const requestedCommand = process.argv[2] ?? 'dev'
const currentNode = process.versions.node

if (!/^20\./.test(currentNode)) {
  console.warn(
    `[cdt] Aviso: o projeto foi configurado para Node 20.x (atual: ${currentNode}). ` +
      'Vou tentar iniciar mesmo assim.',
  )
}

function runNpmScript({ cwd, scriptName }) {
  if (process.platform === 'win32') {
    return spawn(windowsShell, ['/d', '/s', '/c', `${npmCommand} run ${scriptName}`], {
      cwd,
      stdio: 'inherit',
      env: process.env,
      shell: false,
      windowsHide: false,
    })
  }

  return spawn(npmCommand, ['run', scriptName], {
    cwd,
    stdio: 'inherit',
    env: process.env,
    shell: false,
    windowsHide: false,
  })
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      resolve({ code: code ?? 0, signal: signal ?? null })
    })
  })
}

async function runSequential(steps) {
  for (const step of steps) {
    const child = runNpmScript(step)
    const result = await waitForExit(child)
    if (result.code !== 0) {
      process.exit(result.code)
    }
  }
}

async function runParallel(steps) {
  const children = steps.map(runNpmScript)
  let finished = false

  function stopOthers(origin) {
    for (const child of children) {
      if (child !== origin && !child.killed) {
        child.kill('SIGINT')
      }
    }
  }

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      if (finished) {
        return
      }
      finished = true
      stopOthers(null)
    })
  }

  await Promise.race(
    children.map(
      (child) =>
        new Promise((resolve, reject) => {
          child.once('error', reject)
          child.once('exit', (code, signal) => {
            if (!finished) {
              finished = true
              stopOthers(child)
              process.exitCode = code ?? (signal ? 1 : 0)
            }
            resolve({ code, signal })
          })
        }),
    ),
  )
}

const backendDir = path.join(repoRoot, 'backend')
const frontendDir = path.join(repoRoot, 'frontend')

switch (requestedCommand) {
  case 'dev':
    await runParallel([
      { cwd: backendDir, scriptName: 'dev' },
      { cwd: frontendDir, scriptName: 'dev' },
    ])
    break
  case 'dev:server':
    await runParallel([
      { cwd: backendDir, scriptName: 'dev' },
      { cwd: frontendDir, scriptName: 'dev:server' },
    ])
    break
  case 'build':
    await runSequential([
      { cwd: frontendDir, scriptName: 'build' },
      { cwd: backendDir, scriptName: 'build' },
    ])
    break
  case 'lint':
    await runSequential([{ cwd: frontendDir, scriptName: 'lint' }])
    break
  case 'start':
    await runSequential([{ cwd: backendDir, scriptName: 'start' }])
    break
  default:
    console.error(`[cdt] Comando nao suportado: ${requestedCommand}`)
    process.exit(1)
}
