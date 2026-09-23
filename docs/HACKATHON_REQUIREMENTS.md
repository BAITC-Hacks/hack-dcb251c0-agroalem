# HackAlem Voice Router — Requirements

## Goal

Create a voice AI bot with a web simulation interface where an LLM replaces the legacy intent-classifier decision layer and routes live conversation to the correct scenario while preserving context.

## Input

- browser microphone speech;
- text as fallback;
- Russian;
- Kazakh;
- mixed-language dialogue;
- up to 10 dialogue turns.

## Output

Customer:
- response;
- voice response.

Supervisor:
- transcript;
- selected scenario;
- concise explanation;
- alternatives;
- latency by stage.

## Dataset / starter kit

Expected official assets:
- 40 scenarios;
- annotated sample dialogues;
- knowledge base;
- mock backend;
- development utterances;
- evaluation script.

The jury has hidden test utterances, so the implementation must generalize.

## Mandatory

### 1. Voice web interaction
The jury must be able to speak into a microphone and hear a spoken response.

### 2. LLM scenario selection
The meaningful routing decision must be made by an LLM layer.

### 3. Routing correctness
The system must cope with:
- easy utterances;
- topic shifts;
- scenario-boundary utterances;
- Kazakh;
- Russian;
- mixed speech.

### 4. Trace panel
After every utterance show:
- chosen scenario;
- rationale;
- alternatives;
- timing.

### 5. Bilingual behavior
Support RU and KK, including intra-dialogue switching.

## Optional / bonus directions

- hybrid architecture with measurable latency improvement;
- ~500 ms route-selection target;
- retain context and return to interrupted topic;
- clarification instead of guessing;
- operator handoff with context;
- parameter extraction;
- streaming processing;
- emotion detection / tone adaptation;
- supervisor error analytics;
- scenario catalog editing without developers.

## Forbidden

- final scenario selection using an off-the-shelf encoder intent classifier;
- hardcoded mapping of test utterances;
- real call recordings;
- one-script prerecorded demo;
- fake processing;
- unexplained black-box routing.

## Safety / privacy

- synthetic data only;
- external LLM/STT/TTS APIs are allowed;
- do not send real PII;
- no irreversible actions without customer confirmation;
- hand off to a human when the system cannot cope.

## Infrastructure

- launch with one command;
- repository required;
- README required;
- real latency must be measured and displayed.

## Scoring

| Criterion | Points |
|---|---:|
| Task compliance and functionality | 25 |
| Technical implementation | 25 |
| README and reproducibility | 25 |
| Value and applicability | 15 |
| Development potential and originality | 10 |
| Total | 100 |

## Engineering interpretation

The project should maximize the first 75 points before chasing optional polish.

Priority:
1. working end-to-end voice flow;
2. correct LLM routing;
3. reproducible setup;
4. traceability;
5. bilingual/context robustness;
6. measurable latency;
7. optional enhancements.
