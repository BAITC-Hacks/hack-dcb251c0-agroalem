# OpenAI audio transport: integration handoff

Added by Tim's integration agent after reviewing Danil commits 1b41b22 and fcb9efbe4fa5d4b37ec0ef37f9469b26c1ff4b9f. All Danil UI, tests, lockfile, package settings and reference work from those commits are preserved. An initial fast-forward publication attempt was rejected because Danil had pushed his reference UI; this target was rebuilt on top of that commit without force.

Backend commit ef2a710492a5af46ccda01b5eb51b64173b62f6b publishes the exact audio contract at .codex/INTEGRATION_CONTRACT.md on origin/tim/backend.

New transport-only client: src/shared/turn-client/audio.ts. Methods: transcribe(Blob), synthesize(text), submitVoice(sessionId, Blob). Routes go only to the team's backend. No provider credentials belong in browser code.

Text request shape is unchanged. Its default wait is now 120 seconds because the backend can make two sequential OpenAI calls: routing and grounded response. The fetchImpl injection added by Danil is preserved.

Danil's published evidence at 1b41b22 reports 21 Vitest, 23 transport, four intercepted browser tests, one live browser smoke and a successful build against backend ce761bd. These are historical results for that source pair, NOT verification of the new audio/answer pipeline.

This integration session separately executed 16 audio transport fixture tests and standalone strict TypeScript checking. It did not execute full pnpm check or a live audio request. Keep those acceptance gates open.

Run from frontend/ after normal dependency installation:

```bash
node --test scripts/audio.check.mjs
```

Next: keep your reference-driven layout, connect recording/playback to AudioApiClient, validate the voice envelope with the existing turnResultSchema, render AI voice disclosure and test successful/failed audio requests. Do not rerun a whole turn merely because TTS failed. Preserve transcript/text/trace; retry only synthesis on explicit request.

DANIL_STATE.md is deliberately left under Danil's ownership in this integration commit. Update it with the actual local verification and UI work, not the integration agent's fixture results as if they ran on your machine.
