import type { Config } from 'tailwindcss';
import { colors } from './tokens/colors';

const config: Config = {
  content: [
    '../../apps/web/src/**/*.{ts,tsx}',
    '../../apps/operator-portal/src/**/*.{ts,tsx}',
    '../../apps/admin-portal/src/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        info: colors.info,
        live: {
          active: colors.liveActive,
          unavailable: colors.liveUnavailable,
        },
      },
      fontFamily: {
        sans: ['Noto Sans', 'system-ui', '-apple-system', 'sans-serif'],
        sinhala: ['Noto Sans Sinhala', 'Noto Sans', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'Noto Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
