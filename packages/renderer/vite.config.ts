import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5001,
    host: true,
  },
  resolve: {
    alias: {
      '@mvp-vue/schema': path.resolve(__dirname, '../schema/src/index.ts'),
    },
  },
})
