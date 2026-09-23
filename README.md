# Voice Router

Гибридный голосовой AI-робот с LLM-слоем выбора сценария для кейса Halyk Bank на HackAlem AI.

> Главная задача проекта — не «сделать красивого голосового ассистента», а повысить качество маршрутизации живой речи: смена темы, соседние сценарии, русский/казахский и смешанная речь.

## Что строим

Пользователь говорит в микрофон браузера. Система:

1. распознаёт речь;
2. учитывает контекст диалога;
3. передаёт содержательное решение LLM-router;
4. выбирает один из сценариев;
5. при низкой уверенности уточняет запрос или передаёт разговор оператору;
6. выполняет разрешённую логику сценария на синтетических данных;
7. формирует ответ;
8. озвучивает его;
9. показывает супервизору трассировку решения и latency по этапам.

## Почему LLM

Кейс специально направлен на отказ от классического intent-классификатора как финального слоя маршрутизации.

LLM должна принимать содержательное решение на основании:
- текущей реплики;
- контекста диалога;
- описаний сценариев;
- границ между близкими сценариями;
- доступных параметров и действий.

Encoder intent-classifier не используется как финальный decision layer.

## Must-have

- голосовое взаимодействие в вебе;
- микрофон → распознавание → голосовой ответ;
- LLM-слой выбора сценария;
- корректная маршрутизация на 40 исходных сценариях;
- русский и казахский;
- смешение языков;
- трассировка после каждой реплики;
- выбранный сценарий;
- краткое обоснование;
- альтернативы;
- latency по этапам;
- uncertainty / clarification;
- handoff оператору, когда система не справляется;
- подтверждение клиента перед необратимым действием;
- запуск проекта одной командой.

## Что не допускается

- готовый intent-классификатор как слой принятия решения;
- hardcode соответствия тестовых фраз сценариям;
- демо только на одном заранее подготовленном диалоге;
- fake data processing;
- скрытый black box без объяснения;
- реальные записи разговоров;
- реальные персональные данные;
- необратимые действия без подтверждения.

## Данные

Официальный starter kit находится в [`starter-kit/`](starter-kit/) и содержит:

```text
scenarios.json
dialogs_sample.json
knowledge_base.json
mock_backend.json
dev_utterances.json
evaluate.py
```

Перед реализацией необходимо проверить фактическую структуру файлов и использовать её как source of truth.

## Командная работа

Проект разделён между двумя компьютерами: Tim отвечает за backend и LLM-routing, Danil — за frontend, голосовой UX и supervisor panel. Ветки, master prompts, Git-память и правила handoff описаны в [`README_TEAM_SETUP.md`](README_TEAM_SETUP.md).

Ключевые файлы:

- [`docs/TEAM_SPLIT.md`](docs/TEAM_SPLIT.md) — границы ответственности;
- [`docs/CASCADE_GOALS.md`](docs/CASCADE_GOALS.md) — порядок общих и ролевых этапов;
- [`prompts/TIM_MASTER_PROMPT.md`](prompts/TIM_MASTER_PROMPT.md) — управляющая инструкция backend-компьютера;
- [`prompts/DANIL_MASTER_PROMPT.md`](prompts/DANIL_MASTER_PROMPT.md) — управляющая инструкция frontend-компьютера;
- [`.codex/PROJECT_TRUTH.md`](.codex/PROJECT_TRUTH.md) — проверенные факты и anti-hallucination protocol;
- [`.codex/INTEGRATION_CONTRACT.md`](.codex/INTEGRATION_CONTRACT.md) — общий domain contract без выдуманного endpoint.

## Архитектура

```text
Browser microphone
        |
        v
       STT
        |
        v
 Dialogue State
        |
        v
Candidate Preparation
        |
        v
    LLM Router
        |
        v
Confidence / Safety Policy
    |           |
    |           +--> Clarification / Operator
    v
Scenario Executor
    |
    +--> Knowledge Base
    |
    +--> Mock Backend
    |
    v
Response
    |
    v
TTS
    |
    v
Browser playback

All stages
    |
    v
Trace / Telemetry
    |
    v
Supervisor Panel
```

Подробнее: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Основной demo-flow

### Клиент
1. Нажимает кнопку микрофона.
2. Говорит естественную реплику.
3. Получает голосовой ответ.
4. Может сменить тему или язык.
5. При неоднозначности получает уточняющий вопрос.
6. При невозможности решить вопрос получает handoff к оператору.

### Супервизор
После каждой реплики видит:
- transcript;
- scenario;
- rationale;
- alternatives;
- confidence;
- stage latency;
- clarification / handoff state.

Подробнее: [`docs/DEMO.md`](docs/DEMO.md)

## Routing contract

LLM-router должен возвращать структурированный результат.

Пример концептуальной схемы:

```json
{
  "selected_scenario_id": "SCENARIO_ID",
  "confidence": 0.91,
  "alternatives": [
    {
      "scenario_id": "OTHER_SCENARIO",
      "confidence": 0.07,
      "reason": "short reason"
    }
  ],
  "rationale": "short operational explanation",
  "needs_clarification": false,
  "clarification_question": null,
  "needs_operator": false,
  "detected_language": "ru",
  "extracted_parameters": {}
}
```

Реальная схема должна быть согласована с кодовой базой и starter kit.

## Производительность

Целевые ориентиры кейса:

- выбор сценария: около **500 ms**;
- конец реплики → начало ответа: около **1.5 s**.

В интерфейсе показываются реальные замеры. Значения нельзя подменять или захардкодить.

Измеряем как минимум:

```text
STT
router preparation
LLM routing
backend/scenario execution
response generation
TTS start
total
```

## Evaluation

Routing changes нельзя принимать «на глаз».

Используем:
- `dev_utterances.json`;
- `dialogs_sample.json`;
- `evaluate.py`;
- собственные regression tests.

Перед submission:

```text
1. run unit/integration tests
2. run official local evaluation
3. record real accuracy
4. inspect failures
5. verify RU / KK / mixed cases
6. verify topic changes
7. verify close-scenario boundaries
8. verify low-confidence behavior
```

Подробнее: [`docs/EVALUATION.md`](docs/EVALUATION.md)

## Запуск

> Codex: заменить этот раздел реальными командами после выбора стека. Не оставлять placeholder к submission.

### Prerequisites

```text
TODO: actual prerequisites
```

### Environment

```bash
cp .env.example .env
```

Заполнить только реально используемые переменные.

### Start

Проект должен запускаться одной командой:

```bash
TODO: one canonical command
```

### Evaluation

```bash
TODO: actual evaluation command
```

## Структура репозитория

Рекомендуемая, а не обязательная:

```text
.
├── AGENTS.md
├── README.md
├── docs/
│   ├── HACKATHON_REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── EVALUATION.md
│   └── DEMO.md
├── ...
└── starter-kit / data / app
```

Codex должен адаптировать документацию под фактическую структуру проекта, а не наоборот.

## Scoring focus

| Критерий | Баллы |
|---|---:|
| Соответствие задаче и работоспособность | 25 |
| Техническая реализация | 25 |
| README и воспроизводимость | 25 |
| Ценность и применимость | 15 |
| Потенциал развития и оригинальность | 10 |
| **Итого** | **100** |

## Приоритет разработки

```text
P0
Voice input
LLM routing
40 scenarios
RU / KK / mixed language
trace panel
real evaluation
one-command launch

P1
dialogue context
clarification
operator handoff
confirmation before irreversible actions
boundary handling
latency optimization

P2
hybrid fast/complex route
interrupted-topic return
parameter extraction
streaming
emotion/tone
supervisor statistics
catalog editing UI
```

## Документация

- [`AGENTS.md`](AGENTS.md) — правила для Codex
- [`docs/HACKATHON_REQUIREMENTS.md`](docs/HACKATHON_REQUIREMENTS.md) — требования кейса
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — технический design
- [`docs/EVALUATION.md`](docs/EVALUATION.md) — проверка качества
- [`docs/DEMO.md`](docs/DEMO.md) — сценарий показа жюри
- [`CODEX_START.md`](CODEX_START.md) — первый prompt для Codex
- [`TASKS.md`](TASKS.md) — backlog
