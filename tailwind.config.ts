import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#005F9E',
          light: '#0072BE',
          dark: '#004B7E'
        },
        secondary: {
          DEFAULT: '#0072CE',
          light: '#0088f5',
          dark: '#005ba5'
        },
        accent: {
          DEFAULT: '#84BD00',
          light: '#96d600',
          dark: '#729f00'
        },
        background: '#F7F9FA',
        text: {
          DEFAULT: '#1A1A1A',
          secondary: '#2E2E2E'
        },
        lightBlue: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB'
        },
        lightBlueDark: {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
          dark: '#60A5FA'
        }
      }
    },
  },
  plugins: [],
}

export default config 