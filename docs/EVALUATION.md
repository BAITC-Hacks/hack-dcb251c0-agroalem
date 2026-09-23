# Evaluation

## Goal

Treat routing as a measurable system, not a subjective demo.

## Official development assets

Use the starter-kit development utterances and evaluation script when present.

Never alter the official expected labels to increase the score.

## Main metrics

### Routing accuracy
Primary metric for scenario selection.

Track:
- overall accuracy;
- per-scenario failures;
- confusing scenario pairs.

### Robustness slices
Review separately:
- Russian;
- Kazakh;
- mixed language;
- topic switches;
- close scenario boundaries;
- context-dependent follow-ups.

### Latency
Track:
- routing latency;
- end-of-utterance → response start;
- per-stage latency.

Targets:
- routing around 500 ms;
- utterance end → response start around 1.5 s.

These are optimization targets; report real values.

## Regression workflow

After every meaningful router change:

```text
1. run unit tests
2. run starter-kit evaluation
3. save real result
4. compare with previous result
5. inspect new failures
6. inspect recovered failures
7. keep or revert based on evidence
```

## Minimum acceptance matrix

| Test | Expected |
|---|---|
| RU straightforward utterance | correct scenario |
| KK straightforward utterance | correct scenario |
| Mixed RU/KK utterance | correct/defensible scenario |
| Topic change | context-aware route |
| Close scenario pair | correct route or clarification |
| Ambiguous utterance | uncertainty visible |
| Unsupported request | clarification/handoff |
| Malformed LLM JSON | graceful recovery |
| Unknown scenario ID from model | rejected |
| Irreversible action | confirmation required |
| Text fallback | works |
| Microphone path | works |
| Trace panel | updates every turn |
| Latency | real measurements visible |

## Confidence calibration

Do not choose confidence thresholds from intuition.

Use the dev set:
1. collect model confidence/result;
2. compare confidence with actual correctness;
3. choose thresholds that reduce harmful confident mistakes;
4. document the threshold and dataset used.

If the model's raw self-reported confidence is not calibrated, compute a product-level uncertainty signal from:
- margin between top alternatives;
- router consistency;
- boundary conditions;
- validation rules.

The LLM must remain the substantive scenario selector.

## Hidden test discipline

The jury has hidden utterances.

Do not:
- guess hidden phrases;
- hardcode likely examples;
- write special cases for the visible task statement.

Generalize from:
- scenario definitions;
- scenario boundaries;
- dialogue context;
- dev data.
