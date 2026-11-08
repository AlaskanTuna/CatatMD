<a id="readme-top"></a>

# lib

Provides backend infrastructure for authentication, ownership checks, persistence, safe logging, LLM egress and ASR adapters.

## Owns

- Root helpers: auth, authorization, HTTP errors, the Prisma client and privacy-safe logging.
- llm/: the LLM port, provider adapter and embedding client.
- asr/: hosted speech adapters and controlled recognition vocabulary.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [auth.ts](auth.ts): auth. [authz.ts](authz.ts): assertOwnedConsultation and assertOwnedPatient.
- [http-error.ts](http-error.ts): HttpError. [prisma.ts](prisma.ts): prisma.
- [logger.ts](logger.ts): logger, timeStage and withRequestContext.
- [llm/index.ts](llm/index.ts): getLLMClient, getLLMDescriptor and LLMResponseError. [llm/embeddings.ts](llm/embeddings.ts): getEmbeddingClient.
- [llm/types.ts](llm/types.ts): StreamTool and StreamTurn types used by copilot.
- [asr/ilmu.ts](asr/ilmu.ts): transcribeWithIlmu, getAsrDescriptor and IlmuRelayError.
- [asr/soniox.ts](asr/soniox.ts): mintSonioxSession, getLiveAsrDescriptor, liveSessionConfig, sonioxHosts and SonioxMintError.
- [asr/elevenlabs.ts](asr/elevenlabs.ts): mintBatchToken, getBatchAsrDescriptor, batchRefinementConfig and ElevenLabsMintError.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- Routes and middleware use auth, ownership checks, errors, logging and Prisma.
- Analysis, copilot, draft-turns, retrieval, suggestions, transcript-cleanup, audio, audit and scripts use shared infrastructure.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Provider SDK calls stay inside llm/. Hosted ASR fetch calls stay inside asr/.
- ASR audio is a direct egress path; keep provider hosts and regions fixed in the adapters.
- Log only allowlisted operational fields. Never log transcript text, note content or vault entries.
- Keep ownership checks scoped to the authenticated doctor.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for egress, logging and authorization.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [authz.test.ts](authz.test.ts) checks ownership with mocked Prisma. [logger.test.ts](logger.test.ts) and [logger.leak.test.ts](logger.leak.test.ts) cover field filtering and content redaction.
- asr/ tests cover adapter hosts, wire formats, vocabulary and the fetch boundary. llm/ tests cover provider boundaries and request timeouts.
- Postgres is not required; database access is mocked and provider calls are not needed.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §6, LLM Port and Adapter](../../../docs/architecture/06-llm-port-and-adapter.md), [TRD §14, Auth Model](../../../docs/architecture/14-auth-model.md), [TRD §16, Security Controls](../../../docs/architecture/16-security-controls.md), [TRD §20, ASR Contract](../../../docs/architecture/20-asr-contract.md) and [TRD §22, Observability and Privacy-Safe Logging](../../../docs/architecture/22-observability-and-privacy-safe-logging.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>
