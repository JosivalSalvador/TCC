import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Permite usar describe, it, expect sem importar em cada arquivo (se quiser)
    globals: true,
    // Define que estamos testando um ambiente Node.js
    environment: 'node',
    // --- AQUI ESTÁ A CORREÇÃO ---
    // Adicionei 'src/**/*.spec.ts' para ele ler os arquivos que criamos
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    // Ignora pastas de build
    exclude: ['node_modules', 'dist'],

    // Tempo limite para cada teste
    testTimeout: 10000,
  },
})
