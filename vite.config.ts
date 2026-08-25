import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Pont de capture d'écran, actif uniquement en développement.
 * La page envoie une image en base64 sur /__shot, le serveur l'écrit sur disque.
 * Sert à vérifier le rendu 3D sans ouvrir de fenêtre.
 */
function screenshotBridge(outDir: string): Plugin {
  return {
    name: 'screenshot-bridge',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('POST only')
        }
        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(c as Buffer))
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8')
            const b64 = body.replace(/^data:image\/\w+;base64,/, '')
            const url = new URL(req.url ?? '/', 'http://x')
            const name = (url.searchParams.get('name') ?? 'shot').replace(/[^a-z0-9_-]/gi, '')
            fs.mkdirSync(outDir, { recursive: true })
            const file = path.join(outDir, `${name}.png`)
            fs.writeFileSync(file, Buffer.from(b64, 'base64'))
            res.setHeader('content-type', 'text/plain')
            res.end(file)
          } catch (e) {
            res.statusCode = 500
            res.end(String(e))
          }
        })
      })
    },
  }
}

// Dossier de sortie des captures de mise au point (voir screenshotBridge).
const SHOT_DIR = process.env.LEPC_SHOT_DIR ?? path.resolve(import.meta.dirname, '.dev-shots')

// Deux sorties possibles :
//  - `npm run build`          -> dist/        (site statique, GitHub Pages)
//  - `npm run build:offline`  -> dist-offline/ (UN seul fichier HTML autonome, double-clic)
export default defineConfig(({ mode }) => {
  const offline = mode === 'offline'
  return {
    base: './',
    plugins: [react(), screenshotBridge(SHOT_DIR), ...(offline ? [viteSingleFile()] : [])],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
      // une seule copie de three.js dans tout le bundle
      dedupe: ['three', 'react', 'react-dom'],
    },
    build: {
      outDir: offline ? 'dist-offline' : 'dist',
      emptyOutDir: true,
      target: 'es2022',
      chunkSizeWarningLimit: 2000,
      assetsInlineLimit: offline ? 100_000_000 : 4096,
    },
    server: { port: 5173, open: false, host: '127.0.0.1' },
  }
})
