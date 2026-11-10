import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'

const projectRoot = process.cwd()
const backendScript = path.join(projectRoot, 'scripts', 'dev-backend.mjs')
const viteScript = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const children = new Set()
let stopping = false
let backendProcess = null
let frontendProcess = null
let restartTimer = null
let backendStableTimer = null
let restartDelay = 1000

function stop(code) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  if (restartTimer) clearTimeout(restartTimer)
  if (backendStableTimer) clearTimeout(backendStableTimer)
  for (const child of children) child.kill()
}

function startFrontend() {
  const child = spawn(process.execPath, [viteScript], {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: false,
  })
  frontendProcess = child
  children.add(child)
  child.on('error', (error) => {
    console.error(`Could not start Vite: ${error.message}`)
    stop(1)
  })
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (frontendProcess === child) frontendProcess = null
    if (stopping) return
    if (signal) console.error(`Vite stopped after receiving ${signal}.`)
    stop(code ?? 1)
  })
}

function scheduleBackendRestart() {
  if (stopping || restartTimer) return
  const delay = restartDelay
  restartDelay = Math.min(restartDelay * 2, 15000)
  console.warn(`Restarting the local API server in ${Math.ceil(delay / 1000)} second(s).`)
  restartTimer = setTimeout(() => {
    restartTimer = null
    startBackend()
  }, delay)
}

function startBackend() {
  if (stopping || backendProcess) return
  const child = spawn(process.execPath, [backendScript], {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: false,
  })
  backendProcess = child
  children.add(child)
  backendStableTimer = setTimeout(() => {
    if (backendProcess === child) restartDelay = 1000
    backendStableTimer = null
  }, 30000)
  child.on('error', (error) => {
    console.error(`Could not start the Laravel API: ${error.message}`)
    if (backendStableTimer) clearTimeout(backendStableTimer)
    backendStableTimer = null
    if (backendProcess === child) backendProcess = null
    scheduleBackendRestart()
  })
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (backendStableTimer) clearTimeout(backendStableTimer)
    backendStableTimer = null
    if (backendProcess === child) backendProcess = null
    if (stopping) return
    if (signal) console.warn(`Laravel API stopped after receiving ${signal}.`)
    else console.warn(`Laravel API exited with code ${code ?? 1}.`)
    scheduleBackendRestart()
  })
}

function portIsOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(1000, () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

async function backendIsHealthy() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500)
  try {
    const response = await fetch('http://127.0.0.1:8000/up', { signal: controller.signal })
    await response.body?.cancel()
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function start() {
  if (stopping) return
  if (await portIsOpen(8000)) {
    if (await backendIsHealthy()) {
      console.log('Using the existing Laravel API at http://127.0.0.1:8000.')
    } else {
      console.error('Port 8000 is occupied, but the Laravel health check failed. Stop the conflicting process to enable the API.')
    }
  } else {
    startBackend()
  }
  if (!stopping) startFrontend()
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

start().catch((error) => {
  console.error(`Could not start the development servers: ${error.message}`)
  stop(1)
})
