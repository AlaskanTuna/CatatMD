import { createApp } from './app.js'
import { env } from './config/env.js'
import { attachLiveRelay } from './lib/asr/live-relay.js'

const server = createApp().listen(env.PORT, () => {
  // biome-ignore lint/suspicious/noConsole: startup banner
  console.log(`API listening on :${env.PORT} (${env.NODE_ENV}, llm=${env.LLM_PROVIDER})`)
})

attachLiveRelay(server)
