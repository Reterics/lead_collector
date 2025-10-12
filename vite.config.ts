import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    base: mode === 'development' ? './' : (env.VITE_BASENAME || '/'),
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    publicDir: 'public',
    assetsInclude: './src/assets/*.*',
    build: {
      rollupOptions: {
        input: 'index.html',
        external: ['**/*.php'],
      },
    }
  }
})
