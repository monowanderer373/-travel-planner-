import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // For GitHub Pages: use your repo name with slashes. Your repo "-travel-planner-" → base: '/-travel-planner-/'
  base: '/-travel-planner-/',
})
