import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

// Self-hosted variable fonts, the same files the frontend ships (@fontsource-variable, OFL).
export const fontsReady = Promise.all([
  loadFont({ family: 'Outfit', url: staticFile('fonts/outfit.woff2'), weight: '100 900' }),
  loadFont({ family: 'Work Sans', url: staticFile('fonts/work-sans.woff2'), weight: '100 900' }),
])
