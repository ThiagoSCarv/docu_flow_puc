import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function loadCerts() {
  const certsDir = fileURLToPath(new URL('../certs/', import.meta.url))
  const keyPath = `${certsDir}key.pem`
  const certPath = `${certsDir}cert.pem`

  if (!existsSync(keyPath) || !existsSync(certPath)) {
    throw new Error('Certificados não encontrados. Rode `npm run certs` na raiz do repositório.')
  }

  return { key: readFileSync(keyPath), cert: readFileSync(certPath) }
}

const apiTarget = process.env.API_URL ?? 'https://localhost:3333'

export default defineConfig(({ command }) => {
  if (command === 'build') return { plugins: [react()] }

  const https = loadCerts()
  return {
    plugins: [react()],
    server: {
      port: 5173,
      https,
      proxy: {
        '/api': { target: apiTarget, secure: false },
      },
    },
    preview: { https },
  }
})
