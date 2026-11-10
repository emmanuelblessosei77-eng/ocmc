import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const projectRoot = process.cwd()
const backendRoot = path.join(projectRoot, 'backend')
const extensionNames = process.platform === 'win32'
  ? ['php_mbstring.dll', 'php_fileinfo.dll', 'php_pdo_pgsql.dll', 'php_pgsql.dll']
  : ['mbstring', 'fileinfo', 'pdo_pgsql', 'pgsql']

function findPhp() {
  const configured = process.env.PHP_BINARY
  if (configured && existsSync(configured)) return configured

  if (process.platform === 'win32') {
    try {
      const pathFromPath = execFileSync('where.exe', ['php.exe'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .split(/\r?\n/)
        .find((candidate) => candidate.trim() && existsSync(candidate.trim()))
      if (pathFromPath) return pathFromPath.trim()
    } catch {
      // Fall through to the standard WinGet installation location.
    }

    const packageRoot = path.join(process.env.LOCALAPPDATA ?? path.join(homedir(), 'AppData', 'Local'), 'Microsoft', 'WinGet', 'Packages')
    if (existsSync(packageRoot)) {
      const installations = readdirSync(packageRoot)
        .filter((name) => name.startsWith('PHP.PHP.'))
        .sort()
        .reverse()

      for (const installation of installations) {
        const executable = path.join(packageRoot, installation, 'php.exe')
        if (existsSync(executable)) return executable
      }
    }
  }

  return process.platform === 'win32' ? 'php.exe' : 'php'
}

const php = findPhp()
const extensionDirectory = path.join(path.dirname(php), 'ext')
const phpArguments = []

if (existsSync(extensionDirectory)) {
  phpArguments.push('-d', `extension_dir=${extensionDirectory}`)
}

phpArguments.push('-d', 'upload_max_filesize=12M', '-d', 'post_max_size=13M')

for (const extension of extensionNames) {
  phpArguments.push('-d', `extension=${extension}`)
}

phpArguments.push('-S', '127.0.0.1:8000', '-t', 'public')

const server = spawn(php, phpArguments, {
  cwd: backendRoot,
  stdio: 'inherit',
  windowsHide: false,
})

let stopping = false

function stop(signal) {
  if (stopping) return
  stopping = true
  server.kill(signal)
}

server.on('error', (error) => {
  console.error(`Could not start the Laravel API with PHP at "${php}": ${error.message}`)
  process.exitCode = 1
})

server.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Laravel API stopped after receiving ${signal}.`)
    process.exitCode = 1
  } else {
    process.exitCode = code ?? 1
  }
})

process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))
