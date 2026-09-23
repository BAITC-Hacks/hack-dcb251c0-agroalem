# Demo Plan

## Objective

Show the exact properties the case evaluates within a few minutes.

## Screen layout

Recommended:
- left: customer conversation;
- right: supervisor trace.

The routing decision must be visible without opening dev tools.

## Demo 1 — straightforward voice route

1. Click microphone.
2. Speak a natural Russian request.
3. Show live transcript.
4. Show selected scenario.
5. Show concise rationale + alternatives.
6. Show latency.
7. Hear the voice response.

What this proves:
- microphone path;
- STT;
- LLM routing;
- traceability;
- TTS.

## Demo 2 — topic change

Continue the same conversation with a new topic.

Show:
- context is preserved;
- scenario switches;
- previous topic remains visible in history;
- new trace is produced.

What this proves:
- contextual routing;
- multi-turn behavior.

## Demo 3 — Kazakh / mixed language

Speak a Kazakh or mixed RU/KK utterance.

Show:
- transcript;
- correct scenario selection;
- detected language if implemented;
- normal voice response.

What this proves:
- bilingual robustness.

## Demo 4 — ambiguity

Use an utterance near two scenarios.

Expected behavior:
- alternatives are visible;
- confidence is lower;
- the bot asks a clarification question instead of guessing.

What this proves:
- explainability;
- uncertainty handling;
- product safety.

## Demo 5 — handoff

Use a request the bot cannot safely resolve.

Expected:
- handoff to operator;
- operator receives context;
- trace explains why.

## Demo 6 — irreversible action

Trigger an action that requires confirmation.

Expected:
- bot summarizes the action;
- waits for explicit confirmation;
- only then executes against the mock backend.

## What not to do on stage

- do not start by explaining architecture for five minutes;
- do not show a prerecorded conversation;
- do not hide the supervisor panel;
- do not use only text input;
- do not claim benchmark numbers that are not reproducible.

Start with the working product, then explain the architecture after the judge has seen it route real speech.
