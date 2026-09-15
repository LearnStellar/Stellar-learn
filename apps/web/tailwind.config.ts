import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Stellar Learn brand palette
        brand: {
          purple:         '#7b5ea7',
          'purple-light': '#9b7ec7',
          'purple-dark':  '#4a3a66',
          gold:           '#e8d5b7',
          'gold-bright':  '#ffd700',
          dark:           '#0d0d2b',
          'dark-2':       '#1a1a2e',
          'dark-3':       '#16213e',
          'dark-4':       '#0f3460',
          // derived shades from the design system (kept inside the palette family)
          'space-2':      '#141436',
          'panel-2':      '#242444',
          'panel-line':   '#34345e',
          ink:            '#07071a',
          green:          '#2d5a1b',
          'green-dark':   '#1c3a11',
          stone:          '#6b7280',
          brown:          '#8b4513',
        },
        stellar: {
          blue:      '#3d5afe',
          teal:      '#00bcd4',
          green:     '#4caf50',
        },
      },
      // Families resolve through the CSS variables next/font defines in
      // layout.tsx, so the self-hosted files are used and the literal family
      // name stays as the fallback.
      fontFamily: {
        pixel: ['var(--font-pixel)', '"Press Start 2P"', 'monospace'],
        // VT323 is the readable pixel font used for lesson body / quiz copy
        read:  ['var(--font-read)', 'VT323', '"Press Start 2P"', 'monospace'],
        mono:  ['var(--font-mono)', '"JetBrains Mono"', 'monospace'],
        sans:  ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'star-field':      'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d2b 100%)',
      },
      animation: {
        'float':        'float 3s ease-in-out infinite',
        'pulse-glow':   'pulse-glow 2s ease-in-out infinite',
        'slide-up':     'slide-up 0.3s ease-out',
        'xp-flash':     'xp-flash 0.6s ease-out',
        // ---- design-system pixel animations ----
        'twinkle':      'twinkle 2.2s ease-in-out infinite',
        'drift':        'drift 12s linear infinite',
        'coinspin':     'coinspin 1.1s steps(8) infinite',
        'bob':          'bob 1.4s ease-in-out infinite',
        'nodepulse':    'nodepulse 1.8s ease-in-out infinite',
        'titlepulse':   'titlepulse 3s ease-in-out infinite',
        'flow':         'flow 1s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px #7b5ea7' },
          '50%':      { boxShadow: '0 0 25px #7b5ea7, 0 0 50px #7b5ea7' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'xp-flash': {
          '0%':   { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-40px) scale(1.3)' },
        },
        // ---- design-system pixel animations ----
        twinkle: {
          '0%, 100%': { opacity: '0.15' },
          '50%':      { opacity: '1' },
        },
        drift: {
          from: { transform: 'translateY(0)' },
          to:   { transform: 'translateY(-720px)' },
        },
        coinspin: {
          '0%':   { transform: 'scaleX(1)' },
          '45%':  { transform: 'scaleX(0.12)' },
          '50%':  { transform: 'scaleX(0.12)' },
          '95%':  { transform: 'scaleX(1)' },
        },
        bob: {
          '0%, 100%': { transform: 'translate(-50%, 0)' },
          '50%':      { transform: 'translate(-50%, -4px)' },
        },
        nodepulse: {
          '0%, 100%': {
            boxShadow:
              '0 0 0 3px #9b7ec7, 0 0 18px rgba(155,126,199,.6), 0 5px 0 #07071a',
          },
          '50%': {
            boxShadow:
              '0 0 0 3px #ffd700, 0 0 30px rgba(255,215,0,.6), 0 5px 0 #07071a',
          },
        },
        titlepulse: {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%':      { filter: 'brightness(1.18)' },
        },
        flow: {
          to: { backgroundPosition: '18px 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
