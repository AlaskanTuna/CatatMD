import { z } from 'zod'
import { InterpretedLanguageSchema } from './transcript.js'

// ─── Live ASR (ambient capture) ──────────────────────────────────────────────

/**
 * Where the ambient provider processes audio, and therefore which host the
 * browser opens a socket to.
 *
 * An enum rather than a URL because the browser, not the API, makes this call:
 * the socket address travels from our server to the client and back out to a
 * third party, so it must be a value the client can check against a closed set
 * rather than a string it is asked to trust. Soniox fixes the region when the
 * project is created, so this names the project the key belongs to; a mismatch
 * surfaces as the mint failing closed, never as audio reaching another region.
 *
 * None of the four is Malaysia or Singapore. That is a real cost, recorded in
 * docs/DPIA.md rather than softened here.
 */
export const LiveAsrRegionSchema = z.enum(['us', 'eu', 'jp', 'in'])

/**
 * Which live recogniser the deployment uses (`LIVE_ASR_PROVIDER`, #487).
 *
 * - `soniox`: the browser holds a socket straight to Soniox under a key the API minted (#268).
 * - `qwen`: the browser streams 16 kHz mono PCM to the API's own relay (`LIVE_ASR_RELAY_PATH`), which holds the
 *   upstream socket to Qwen3-ASR realtime on Alibaba Cloud Model Studio. A browser cannot set `Authorization` on a
 *   WebSocket, so the key stays on the API and the relay authorises the browser with a short-lived token instead.
 */
export const LiveAsrProviderSchema = z.enum(['soniox', 'qwen'])

/** Where the relay's upstream processes audio: Alibaba Cloud Model Studio's international region, Singapore. */
export const LiveAsrRelayRegionSchema = z.enum(['sg'])

/**
 * What the doctor is about to say, which decides the recognition settings, the
 * vocabulary and the session cap the API will mint.
 *
 * **A closed enum, and that is the whole control.** The settings it selects
 * cross the audio egress in the socket's first frame, where nothing can be
 * de-identified. A caller picks *which* of two module constants is sent and can
 * never influence *what* is in either, which is why this is an enum rather than
 * a shape the request supplies. `liveSessionConfig()` in
 * `backend/src/lib/asr/soniox.ts` reads it as a table lookup and throws on
 * anything else, rather than falling back to a default: a silent fallback would
 * egress one mode's config while the caller believed it had asked for the
 * other's.
 *
 * `ambient` is a consultation, two voices, up to thirty minutes.
 * `dictation` is one doctor reading out a prescription, in seconds.
 *
 * Translation is a second closed enum on the same request rather than a third
 * mode (`LiveSessionRequestSchema.translation`, #392): a translated
 * consultation is still an ambient one, with ambient's consent rule, session
 * cap and rate-limit bucket, and only its recognition config differs.
 */
export const LiveAsrModeSchema = z.enum(['ambient', 'dictation'])

/**
 * The only socket addresses the browser may open.
 *
 * The client validates the URL our own API handed it, which is deliberate
 * belt-and-braces: this is the one field in the system that tells a browser
 * where to send patient audio, and a compromised or misconfigured API answering
 * with a different host would otherwise be obeyed. The CSP `connect-src` in
 * `vercel.json` pins the same host at the platform layer, so redirecting this
 * egress takes both a bad response and a CSP change.
 */
export const LIVE_ASR_WEBSOCKET_URL =
  /^wss:\/\/stt-rt(?:\.(?:eu|jp|in))?\.soniox\.com\/transcribe-websocket$/

/** The relay's path on the API (#487). */
export const LIVE_ASR_RELAY_PATH = '/api/asr/live-relay'

/**
 * The relay address the API may hand out: `wss://` on any host, or `ws://` on loopback for local development, and
 * always this exact path. The host is not pinned here because it is the API's own; the SPA additionally requires it
 * to equal the API origin it already talks to, so a tampered response cannot point audio anywhere else.
 */
export const LIVE_ASR_RELAY_URL =
  /^(?:wss:\/\/[a-z0-9.-]+(?::\d{2,5})?|ws:\/\/(?:localhost|127\.0\.0\.1)(?::\d{2,5})?)\/api\/asr\/live-relay$/

/**
 * How many vocabulary terms may ride in the session context.
 *
 * The vendor's ceiling is the whole context at 8,000 tokens, roughly 10,000
 * characters, shared with `general`. This bound is far below it and is about a
 * different risk: the list crosses the audio egress, so it is one of the few
 * values in the system that cannot be de-identified on the way out. A small
 * cap keeps it reviewable by eye, which is the only review it can get.
 */
export const MAX_ASR_CONTEXT_TERMS = 120

/**
 * The recognition settings the browser sends as the socket's first frame.
 *
 * Served by the API rather than hardcoded in the bundle so hints and the model
 * can be tuned without a frontend deploy. camelCase here and everywhere in this
 * file; the provider's snake_case wire names exist in exactly one module,
 * `frontend/src/audio/live/soniox-stream.ts`, which maps them.
 */
export const LiveSessionConfigSchema = z.object({
  model: z.string().min(1).max(64),
  /**
   * Languages to bias toward, not restrict to. The set is constrained and
   * excludes Indonesian, because Malay is tagged Indonesian often enough to
   * matter and every vendor supporting code-switching advises naming the
   * languages expected (issue #218, docs/TRD.md 20.7.1).
   */
  languageHints: z
    .array(z.string().regex(/^[a-z]{2,3}$/))
    .min(1)
    .max(8),
  languageIdentification: z.boolean(),
  speakerDiarization: z.boolean(),
  endpointDetection: z.boolean(),
  /**
   * Static domain hints, which the provider documents as helping it "more
   * reliably separate voices" when the `general` section names the speakers.
   *
   * **Never patient data, and never derived from a request.** This crosses the
   * audio egress with the rest of the first frame, and audio cannot be
   * de-identified. `liveSessionConfig()` in `backend/src/lib/asr/soniox.ts`
   * takes no arguments, which is what structurally keeps a consultation out of
   * it; the bounds below are the second half of that guarantee.
   */
  context: z.object({
    general: z
      .array(z.object({ key: z.string().min(1).max(32), value: z.string().min(1).max(128) }))
      .min(1)
      .max(8),
    /**
     * Clinical vocabulary to prime recognition toward, in the language of the
     * consultation (issue #307).
     *
     * **This is the accuracy layer, not a refinement.** docs/TRD.md 20.7.1
     * measured the same Malay clip going from "Dr. Sayyabah Taksudali Maharaj"
     * with no context to one word wrong with a clinical Malay vocabulary that
     * contained none of the sentence's content words. The effect is domain and
     * language priming rather than keyword injection, which is why the list is
     * a vocabulary rather than a list of expected answers.
     *
     * **One language, and the target one.** The same measurement scored English
     * context *worse than no context at all* on Malay audio, so this is never a
     * multilingual superset even though `languageHints` names four.
     *
     * **Optional, and that is a rollout property rather than a nicety.** Vercel
     * and Render deploy independently from one merge, so a required field would
     * black out ambient capture for the length of the slower build.
     */
    terms: z.array(z.string().min(1).max(64)).max(MAX_ASR_CONTEXT_TERMS).optional(),
  }),
  /**
   * Two-way translation between English and one other language, asked of the
   * recogniser in the socket's first frame (docs/TRD.md §20.12).
   *
   * Closed literals and a closed enum only, because this crosses the audio
   * egress like everything else here. Absent on every config except the
   * translated ambient ones, so the plain ambient and dictation frames are
   * byte-identical to what they were before this existed.
   */
  translation: z
    .object({
      type: z.literal('two_way'),
      languageA: InterpretedLanguageSchema,
      languageB: z.literal('en'),
    })
    .optional(),
  /**
   * What the client sends after the config frame (#487). Absent or `auto`: the recorder's own container, forwarded
   * as produced (Soniox). `pcm_s16le`: raw 16-bit little-endian mono PCM at `sampleRate`, which the relay forwards to
   * a recogniser that takes PCM only (Qwen).
   */
  audioFormat: z.enum(['auto', 'pcm_s16le']).optional(),
  sampleRate: z.literal(16000).optional(),
})

/**
 * What `GET /api/asr/live-sessions/config` returns: everything the consent copy
 * needs before anything is minted.
 *
 * Split from the mint so the capture surface can state where the audio would go
 * and in which languages, without spending a key on a doctor who is only
 * reading. A key is minted when the patient has agreed and the microphone is
 * open, never before.
 */
const LiveAsrConfigObject = z.object({
  provider: LiveAsrProviderSchema,
  region: z.union([LiveAsrRegionSchema, LiveAsrRelayRegionSchema]),
  websocketUrl: z
    .string()
    .refine(
      (url) => LIVE_ASR_WEBSOCKET_URL.test(url) || LIVE_ASR_RELAY_URL.test(url),
      'Not a live ASR address',
    ),
  config: LiveSessionConfigSchema,
  /**
   * The languages this deployment can pair with English on ambient capture.
   *
   * Optional because Vercel and Render deploy independently: an SPA reading an
   * older API sees it absent and offers no translation, rather than failing
   * the probe and losing ambient capture altogether.
   */
  availableTranslations: z.array(InterpretedLanguageSchema).optional(),
  /**
   * Whether this deployment can refine an untranslated ambient transcript after
   * Stop (#436, docs/TRD.md §20.14).
   *
   * Set only on the untranslated ambient config, and only when the API holds a
   * batch key, so the dictation and translated configs are byte-identical to
   * what they were. Absent reads as unavailable: an SPA reading an older API
   * never uploads.
   */
  batchRefinement: z.boolean().optional(),
})

/**
 * Provider, address and region agree: a Soniox session points at Soniox in a Soniox region, and a Qwen session at
 * the API's relay in `sg`. Without this, a response could pair one provider's disclosure with another's socket.
 */
const consistentProvider = (c: { provider: string; region: string; websocketUrl: string }) =>
  c.provider === 'soniox'
    ? LIVE_ASR_WEBSOCKET_URL.test(c.websocketUrl) && LiveAsrRegionSchema.safeParse(c.region).success
    : LIVE_ASR_RELAY_URL.test(c.websocketUrl) && c.region === 'sg'
const INCONSISTENT = { message: 'Provider, address and region disagree', path: ['provider'] }

export const LiveAsrConfigSchema = LiveAsrConfigObject.refine(consistentProvider, INCONSISTENT)

/**
 * Body of `POST /api/asr/live-sessions`.
 *
 * **`consent` is required on ambient and absent on dictation, and the split is
 * the point.** It was `z.literal(true)` for both until 10/09/26 (#365), when
 * the per-consultation tick was removed from prescription dictation. A client
 * that no longer asks anybody cannot honestly assert anything, and leaving the
 * literal in place would have made every dictation mint record a patient
 * agreement nobody gave. Ambient still refuses a body without `consent: true`,
 * byte for byte as before: defaults apply before `refine`, so a bare `{}` still
 * resolves to ambient and still fails.
 *
 * On ambient it remains a client assertion the API cannot verify, exactly like
 * `Transcript.labelsReviewed`, and it is recorded in the audit row as what the
 * client said rather than as proof.
 *
 * **`mode` defaults rather than being required, and that is a rollout property
 * rather than a nicety.** Vercel and Render deploy independently from one
 * merge, so a required field would refuse every request an unchanged SPA sends
 * for the length of the slower build, which on this route means ambient capture
 * black for that window. The default is the mode that already shipped, so a
 * client that names nothing gets today's behaviour byte for byte.
 */
export const LiveSessionRequestSchema = z
  .object({
    consent: z.boolean().optional(),
    mode: LiveAsrModeSchema.default('ambient'),
    /**
     * Pair this language with English in both directions (docs/TRD.md §20.12).
     * Ambient only: dictation is one doctor reading out a prescription, and the
     * second refine refuses the pair rather than quietly dropping the field.
     */
    translation: InterpretedLanguageSchema.optional(),
  })
  .refine((body) => body.mode !== 'ambient' || body.consent === true, {
    message: 'Consent for this consultation is required.',
    path: ['consent'],
  })
  .refine((body) => body.translation === undefined || body.mode === 'ambient', {
    message: 'Translation is available on ambient capture only.',
    path: ['translation'],
  })

/**
 * What `POST /api/asr/live-sessions` returns.
 *
 * `apiKey` is a temporary provider credential that authenticates one connect
 * within a short window and caps the session it opens. It is deliberately not
 * the account key: the browser holds it for the length of one consultation and
 * never stores it. The config fields are repeated rather than referenced so the
 * client needs one response to open a socket.
 */
export const LiveSessionSchema = LiveAsrConfigObject.extend({
  apiKey: z.string().min(1),
  expiresAt: z.string().min(1),
  /**
   * How long the session may stream. The client bounds a reconnected capture by
   * it (#256), so reopening a dropped socket cannot outlast the cap the API set.
   * Optional so a client and an API on either side of a deploy still agree.
   */
  maxSessionSeconds: z.number().int().positive().optional(),
}).refine(consistentProvider, INCONSISTENT)
// ─── Inferred types ──────────────────────────────────────────────────────────

export type LiveAsrRegion = z.infer<typeof LiveAsrRegionSchema>
export type LiveAsrProvider = z.infer<typeof LiveAsrProviderSchema>
export type LiveAsrMode = z.infer<typeof LiveAsrModeSchema>
export type LiveSessionConfig = z.infer<typeof LiveSessionConfigSchema>
export type LiveAsrConfig = z.infer<typeof LiveAsrConfigSchema>
export type LiveSessionRequest = z.infer<typeof LiveSessionRequestSchema>
export type LiveSession = z.infer<typeof LiveSessionSchema>
