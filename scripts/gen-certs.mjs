// Script de infraestrutura: gera o certificado autoassinado usado no HTTPS local (RNF06).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { generate } from 'selfsigned'

// Caminhos de certs/ na raiz do monorepo, compartilhados por Fastify, Vite e PostgreSQL.
const dir = new URL('../certs/', import.meta.url)
const keyPath = new URL('key.pem', dir)
const certPath = new URL('cert.pem', dir)

// Não sobrescreve certificados já confiados pelo navegador, a menos que se peça --force.
if (existsSync(keyPath) && existsSync(certPath) && !process.argv.includes('--force')) {
  console.log('Certificados já existem em certs/. Use --force para gerar de novo.')
  process.exit(0)
}

// Validade de um ano, suficiente para o período do projeto.
const notAfterDate = new Date()
notAfterDate.setFullYear(notAfterDate.getFullYear() + 1)

// Certificado de servidor para localhost; o SAN cobre o nome e os IPs IPv4 e IPv6 de loopback.
const pems = await generate([{ name: 'commonName', value: 'localhost' }], {
  keySize: 2048,
  algorithm: 'sha256',
  notAfterDate,
  extensions: [
    { name: 'basicConstraints', cA: false, critical: true },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
    { name: 'extKeyUsage', serverAuth: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: '::1' },
      ],
    },
  ],
})

// Grava chave e certificado em PEM; certs/ fica fora do git.
mkdirSync(dir, { recursive: true })
writeFileSync(keyPath, pems.private)
writeFileSync(certPath, pems.cert)
console.log('Certificados gerados em certs/ (key.pem, cert.pem).')
