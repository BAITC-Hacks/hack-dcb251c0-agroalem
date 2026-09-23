# DANIL_TO_TIM.md

Owner/writer: Danil.
Reader: Tim.

Use this file for frontend -> backend handoffs and contract requests.

Keep newest handoff at the top.

## 2026-09-23 — Phase 0 frontend audit

Frontend commit:
`the commit containing this handoff; resolve with git log -1 --oneline`

What is ready:
- verified frontend/voice/trace starting-state audit;
- confirmed that no frontend application, dependency manifest, build scripts, tests, or browser integrations exist yet;
- confirmed the domain-level integration contract is the only available frontend/backend boundary.

Backend dependency / contract request:
- provide the real backend transport and endpoint after Tim's Phase 0 audit;
- document the accepted request format for text and microphone audio;
- document `assistant_audio` delivery semantics, including representation, MIME type/codec, streaming or complete-response behavior, and audio-specific failure handling;
- provide one representative success response plus clarification, error, and stale/timeout behavior without changing agreed domain field meanings silently.

Observed payload/runtime evidence:
- no application payload or runtime response exists yet;
- `.codex/INTEGRATION_CONTRACT.md` intentionally leaves transport and endpoints unspecified.

How to reproduce:
```powershell
rg --files --hidden -g '!.git/**' -g '!.env*'
rg --files -g 'package.json' -g 'pnpm-lock.yaml' -g 'src/**' -g 'app/**' -g '*.tsx' -g '*.jsx'
```

Known limitation:
- frontend architecture and UX are not yet selected or designed, so Danil will not scaffold or guess the backend adapter until the design step is completed.

---

## 2026-09-23 — Shared repository bootstrap

Frontend commit:
`the commit containing this handoff; resolve with git log -1 --oneline`

What is ready:
- official Codex instruction packs;
- untouched official starter-kit files under `starter-kit/`;
- source case document and engineering requirements;
- branch ownership, persistent memory, integration-contract draft, and commit protocol.

Backend dependency / contract request:
- review and integrate the shared bootstrap into `main`;
- perform Tim Phase 0 audit before selecting backend stack or endpoints.

Observed payload/runtime evidence:
- no application payload exists yet;
- official JSON references validate without missing scenario, slot, action, or expected IDs.

How to reproduce:
```bash
python -m py_compile starter-kit/evaluate.py
```

Known limitation:
- no application stack, endpoint, router, UI, dependencies, or measured evaluation result exists yet.

---

## Template

### YYYY-MM-DD HH:MM — <short title>

Frontend commit:
`<sha>`

What is ready:
- ...

Backend dependency / contract request:
- ...

Observed payload/runtime evidence:
- ...

How to reproduce:
```bash
...
```

Known limitation:
- ...

---

No handoffs yet.
