import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'

export default tseslint.config(
  // 1. Pastas que o ESLint deve ignorar totalmente
  { ignores: ['dist', 'node_modules', 'coverage'] },

  // 2. Extender as configurações recomendadas (JS e TS)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. Configuração Principal
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2020,
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Integração: Erro de formatação do Prettier vira erro de Lint
      'prettier/prettier': 'error',

      // Regras de Qualidade (Enterprise)
      'no-console': ['warn', { allow: ['info', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // 4. Desativa regras de formatação do ESLint (Prettier assume daqui)
  prettierConfig,
)
