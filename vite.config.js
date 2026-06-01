import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' -> relative asset URLs, works under a custom domain or any GH Pages subpath.
// Routing uses HashRouter, so deep links never 404 on GH Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
})
