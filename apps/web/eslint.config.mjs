// ESLint 9 flat config. Next.js 16 removed `next lint`, so `npm run lint`
// calls the ESLint CLI directly with Next's official presets.
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // New React Compiler rules (eslint-plugin-react-hooks 7). Existing code
      // trips them (Math.random in StarField/QuestModal, setState in effects),
      // so they warn for now. Don't add new violations; fix old ones as you go.
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'playwright-report/**'] },
]

export default config
