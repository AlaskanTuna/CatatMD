import { env } from '../../config/env.js'
import { OpenAICompatibleClient } from './openai-compatible.js'
import type { LLMClient, LLMProvider } from './types.js'

export {
  EMBEDDING_DIMENSIONS,
  type EmbeddingClient,
  getEmbeddingClient,
} from './embeddings.js'
export type { GenerateRequest, LLMClient, LLMProvider } from './types.js'
export { LLMResponseError } from './types.js'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'

/**
 * The reasoning `qwen3.7-flash` may spend on one copilot turn before answering (#479).
 *
 * Measured 10/11/26 on one copilot question asked 8 times: 7 turns reasoned for 470 to 1,483 tokens and answered in
 * 5 to 18 s, and the eighth reasoned for 81,920 tokens over 491 s before writing a word. In the browser that turn is
 * a panel showing one word and then nothing, because the reasoning never reaches the stream. 2,048 sits above every
 * normal turn measured, so it bounds the runaway without trimming an ordinary answer.
 */
const QWEN_STREAM_REASONING_BUDGET = 2_048

function build(): LLMClient {
  switch (env.LLM_PROVIDER) {
    case 'qwen': {
      if (!env.QWEN_API_KEY) throw new Error('QWEN_API_KEY is required when LLM_PROVIDER=qwen')
      return new OpenAICompatibleClient('qwen', env.QWEN_MODEL, {
        apiKey: env.QWEN_API_KEY,
        baseURL: env.QWEN_BASE_URL,
        resolvesSchemaRefs: true,
        streamReasoningBudget: QWEN_STREAM_REASONING_BUDGET,
      })
    }
    case 'gemini': {
      if (!env.GEMINI_API_KEY)
        throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER=gemini')
      return new OpenAICompatibleClient('gemini', env.GEMINI_MODEL, {
        apiKey: env.GEMINI_API_KEY,
        baseURL: GEMINI_BASE_URL,
        // The only provider here that will not resolve a `$ref`. Measured
        // 15/08/26 against the live endpoint: the referencing form of
        // `clinical_facts` returns a bodiless HTTP 400, so this pays the full
        // 14,240 B rather than 3,558 B (issue #109). Local dev only, so the
        // cost falls where it matters least.
        resolvesSchemaRefs: false,
      })
    }
    case 'deepseek': {
      if (!env.DEEPSEEK_API_KEY)
        throw new Error('DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek')
      return new OpenAICompatibleClient('deepseek', env.DEEPSEEK_MODEL, {
        apiKey: env.DEEPSEEK_API_KEY,
        baseURL: env.DEEPSEEK_BASE_URL,
        // Deliberately unverified rather than assumed. The 15/08/26 sweep that
        // settled the other two could not reach DeepSeek: the configured key
        // returns 401 on every request, schema-independent. `false` is the
        // form this provider has always been sent, so it keeps behaviour
        // identical until someone with a working key measures it (issue #109).
        resolvesSchemaRefs: false,
      })
    }
  }
}

let cached: LLMClient | undefined

export function getLLMClient(): LLMClient {
  cached ??= build()
  return cached
}

/**
 * Provider and model identity for audit stamps, read from the environment
 * without constructing a client.
 *
 * `getLLMClient()` throws when the matching provider's API key is missing,
 * which is correct at the egress point and wrong everywhere else — an audit
 * write that only wants two strings must not be able to fail, least of all
 * after the analysis it is recording has already been persisted.
 */
export function getLLMDescriptor(): { provider: LLMProvider; model: string } {
  switch (env.LLM_PROVIDER) {
    case 'qwen':
      return { provider: 'qwen', model: env.QWEN_MODEL }
    case 'gemini':
      return { provider: 'gemini', model: env.GEMINI_MODEL }
    case 'deepseek':
      return { provider: 'deepseek', model: env.DEEPSEEK_MODEL }
  }
}
