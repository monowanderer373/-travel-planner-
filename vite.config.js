import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

// Copy index.html → 404.html so GitHub Pages serves the SPA on refresh/direct links
function githubPages404() {
  return {
    name: 'github-pages-404',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist')
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), githubPages404()],
  // For GitHub Pages: use your repo name with slashes. Your repo "-travel-planner-" → base: '/-travel-planner-/'
  base: '/-travel-planner-/',
})
