# Voice Router · Saqta Insurance

Веб-симулятор контакт-центра для кейса HackAlem AI / Halyk Bank. Клиент обращается в вымышленную страховую компанию Saqta, а LLM выбирает подходящий сценарий из официального каталога. Супервизор видит, что распознано, какой сценарий выбран, почему и сколько заняли этапы обработки.

## Что требует задание

Основной путь для жюри: **микрофон → распознавание речи → LLM-маршрутизация → ответ → озвучка**. Текст — дополнительный канал, не замена голосового MVP.

- 40 бизнес-сценариев `SC01`–`SC40` и 3 системных intent из исходного starter kit.
- Русский, казахский и смешанная речь; контекст до 10 ходов, смена темы и близкие сценарии.
- После каждой реплики: transcript, сценарии, краткая причина, confidence, alternatives, slots/actions и измеренное время этапов.
- При неопределённости — уточнение или необходимость оператора. Необратимые действия — только после подтверждения.
- Воспроизводимый запуск, тесты и официальный routing evaluation.

LLM принимает содержательное решение о сценарии. Готовый intent-классификатор, соответствия «тестовая фраза → ответ», вымышленные результаты и latency недопустимы. Данные Saqta синтетические, не реальные страховые рекомендации.

## Готовность на 23 сентября 2026

Этот README находится в **`danil/frontend`**. Backend опубликован отдельно в **`tim/backend`**; наличие backend-функции там не означает, что она уже подключена в React здесь.

| Часть | Реальное состояние |
| --- | --- |
| Интерфейс по референсам | React/TypeScript/Vite: переписка клиента, отдельный supervisor trace, светлый Saqta-дизайн; desktop и мобильный экран. |
| Текстовый диалог | `HttpTurnClient`, постоянный `session_id`, история, ожидание, отмена, ошибки и повтор. Нет автоматического перехода на fixtures. |
| Trace | Свой trace у каждой реплики; причина и confidence внутри карточки каждого сценария; transcript, `unknown`, состояния уточнения/оператора/подтверждения/продолжения; `null` отображается как `—`. |
| Мобильная доступность | Trace прокручивается целиком над полем ввода; проверены 320/360 px и 200% текста. Пустая отправка заблокирована. |
| Backend текста | В `origin/tim/backend@14346a1`: FastAPI, LLM-router, история, policy и ответ по официальной базе знаний. Новый answer pipeline ещё требует отдельной живой приёмки. |
| Backend аудио | В ветке Тима опубликованы transcriptions, speech и audio turn; это больше не неизвестный контракт. Живой полный голосовой прогон здесь пока не подтверждён. |
| Аудиотранспорт frontend | `AudioApiClient` добавлен в `b3f0982`; локально пройдены 16 тестов с контролируемыми ответами. Микрофон и плеер в React ещё не подключены. |
| Страховые операции | Не исполняются: `actions=[]`. `requires_confirmation` — требование сценария, а не выполненное действие. `handoff` не означает реальное соединение с оператором. |
| Ссылка для жюри | Пока не опубликована. `127.0.0.1` доступен только на компьютере, где запущено приложение. Нужен отдельный HTTPS-хостинг frontend и backend. |

**Итог: проверен текстовый интерфейс; полный голосовой MVP и публичная песочница ещё не приняты.**

### Что действительно проверено

На frontend `fcb9efb`:

- форматирование, ESLint, TypeScript и production build;
- 21 Vitest, 23 транспортных и 11 браузерных тестов с тестовыми ответами;
- отдельно: настоящий успешный браузерный текстовый запрос через backend `ce761bd` и OpenAI;
- отдельно: настоящий backend `503` без настроенного провайдера, без подмены ответом из fixture.

На принятом обновлении frontend `b3f0982`:

- `node --test scripts/audio.check.mjs`: **16 passed** на машине Данила;
- `pnpm check` пока останавливается на Prettier в четырёх добавленных/изменённых аудиотранспортом файлах. Это зафиксированный остаток, а не зелёная проверка новой сборки.

Старые живые текстовые проверки нельзя переносить на новый backend/audio pipeline. Полный живой RU/KK/mixed voice smoke, свежий клон и routing baseline остаются открытыми. Accuracy и выполнение latency SLA не заявляются без измерений.

## Запуск текущего React-интерфейса

Используются два отдельных checkout. Слияние веток для разработки frontend не требуется.

### 1. Backend в отдельной папке

Нужны Git, Python 3.10+ и интернет для зависимостей и API. Для нового checkout выберите свободную папку:

```powershell
git clone --single-branch --branch tim/backend https://github.com/BAITC-Hacks/hack-dcb251c0-agroalem.git voice-router-backend
cd voice-router-backend
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
```

В `.env.local` задайте разрешённый серверный `OPENAI_API_KEY`, затем:

```powershell
py run_mvp.py
```

Скрипт из **ветки Тима** создаёт Python environment, устанавливает `backend/requirements.txt` и запускает сервер на `http://127.0.0.1:8000`. В этой ветке frontend файла `run_mvp.py` нет. На `/` backend есть самостоятельная функциональная страница для проверки — это не React-интерфейс по референсам.

### 2. Frontend в другом терминале

Нужны Node.js и pnpm. На машине разработки проверены Node `24.19.0` и pnpm `11.19.0`; точный package manager закреплён в `frontend/package.json`.

Для нового checkout:

```powershell
git clone --single-branch --branch danil/frontend https://github.com/BAITC-Hacks/hack-dcb251c0-agroalem.git voice-router-frontend
cd voice-router-frontend/frontend
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 5173 --strictPort
```

Откройте **http://127.0.0.1:5173/**. Если папка проекта уже существует, используйте её `frontend/`, не выполняя повторное клонирование поверх файлов.

Vite отправляет `/api/*` на `http://127.0.0.1:8000/*`. Поэтому оба процесса в этом примере работают на одном компьютере. Ключ не передаётся frontend. `VITE_API_BASE_URL` — только несекретный адрес API; для другого origin потребуется соответствующий CORS и HTTPS.

Текущий `pnpm dev` использует **настоящий HTTP adapter**, не demo-ответы. Без backend или доступного API появится ошибка. Наличие `/health` означает доступность сервера/каталога, а не успешный вызов модели.

Запуск всей React-сборки одной командой и постоянный адрес для жюри ещё нужно подготовить. `py run_mvp.py` запускает встроенное демо Тима, не объединяет автоматически две ветки.

## Модели и ключи

Текущий backend Тима использует OpenAI; имена ниже взяты из `backend/app/config.py`, это не результаты сравнения качества:

| Переменная | По умолчанию |
| --- | --- |
| `OPENAI_ROUTER_MODEL` | `gpt-4.1-mini` |
| `OPENAI_RESPONSE_MODEL` | `gpt-4.1-mini` |
| `OPENAI_STT_MODEL` | `gpt-4o-mini-transcribe` |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` |
| `OPENAI_TTS_VOICE` | `coral` |
| `OPENAI_TIMEOUT_SECONDS` | `45` на запрос провайдеру |

`OPENAI_API_KEY` хранится только в игнорируемом серверном `.env.local` или секретах хостинга. Не помещайте ключи в Git, README, frontend и `VITE_*`. Переменные процесса имеют приоритет над локальным env-файлом. Ключ, опубликованный в чате, следует заменить; в репозитории его копий быть не должно.

NVIDIA STT/TTS в этой сборке не подключены. Их пригодность для RU/KK/mixed нужно оценить отдельно до смены провайдера.

### HackAlem Sandbox и проверка жюри

Согласно переданной инструкции организаторов, HackAlem Sandbox предоставляет рабочее пространство ChatGPT/Codex и отдельный API-проект команды. Вход в Codex не настраивает `OPENAI_API_KEY` нашего сервера автоматически. Доступ и бюджет конкретного API-проекта нужно проверить отдельно.

В этой инструкции нет адреса сервера для размещения Voice Router. Workspace/API-проект не является готовой ссылкой на наше приложение. Цель команды — доступное жюри **онлайн-демо**, не автономный offline-режим. Для него нужны HTTPS-адрес, запущенный backend, серверные секреты, ограничение доступа/расходов и проверка микрофона. Сейчас такой адрес не заявляется опубликованным.

## Опубликованный API

Источник истины — `.codex/INTEGRATION_CONTRACT.md` в **`origin/tim/backend`**, а не старая копия в frontend-ветке:

```powershell
git fetch origin tim/backend:refs/remotes/origin/tim/backend
git show origin/tim/backend:.codex/INTEGRATION_CONTRACT.md
```

| Endpoint | Назначение |
| --- | --- |
| `POST /v1/turn/text` | JSON `session_id`, `text` → ответ и trace. |
| `POST /v1/audio/transcriptions` | Multipart `file` → transcript и измеренное время. |
| `POST /v1/audio/speech` | JSON `text` → MP3. |
| `POST /v1/turn/audio` | Multipart `session_id`, `file`, `include_audio` → текстовый результат и необязательное MP3 base64. |

Форматы: WebM, MP4/M4A, MP3, WAV; до 20 MiB. Точный список MIME и ошибки приведены в контракте. Если TTS завершился ошибкой после успешного текстового хода, сохраняются transcript, ответ и trace; повторяется только синтез, не весь диалоговый ход.

Дополнительное `tts` — длительность полной генерации. `tts_first_audio=null` не заменяется этим значением: время до реально услышанного звука не измерено. Память backend локальна одному процессу; перезапуск сбрасывает сессии.

## Проверки и evaluation

Frontend:

```powershell
cd frontend
pnpm check
node --test scripts/audio.check.mjs
pnpm exec playwright install chromium
pnpm test:e2e
```

Обычные frontend-тесты используют явно тестовые ответы и не расходуют API-квоту. Настоящие backend-проверки включаются отдельно; команды и ограничения описаны в [frontend/README.md](frontend/README.md).

В отдельном checkout backend:

```powershell
py run_mvp.py --check
.venv\Scripts\python.exe -m backend.scripts.run_baseline
```

Baseline выполняет реальные запросы и расходует API-квоту. Официальный evaluator для уже подготовленных predictions:

```powershell
.venv\Scripts\python.exe starter-kit/evaluate.py predictions.json starter-kit/dev_utterances.json
```

Исходный dev-набор содержит 104 реплики. В отчёте должны быть реальные primary accuracy, full match, multi-intent recall, разбивки RU/KK/mixed и SHA проверенного кода. Тестовые fixtures не являются routing baseline.

## Осталось до сдачи

1. Подключить запись/стоп/отмену микрофона и плеер к опубликованному аудиотранспорту, проверить разрешения, cleanup и ошибки.
2. Провести живые проверки нового backend: текст, голос, RU/KK/mixed, смена темы, уточнение и handoff. Отдельно проверить отказ TTS без потери текста/trace.
3. Запустить evaluation и зафиксировать измерения, не выдумывая показатели.
4. Подготовить единый воспроизводимый запуск React + backend, HTTPS-песочницу для жюри и защиту серверной API-квоты.
5. Провести свежий клон и финальную интеграционную проверку. Не выдавать read-only консультацию за исполнение страховых операций.

## Файлы проекта

- [Требования хакатона](docs/HACKATHON_REQUIREMENTS.md), [исходные данные](starter-kit/README.ru.md), [архитектура](docs/ARCHITECTURE.md).
- [Frontend](frontend/README.md), [аудио-handoff](frontend/AUDIO_HANDOFF.md), [состояние Данила](.codex/DANIL_STATE.md).
- [Разделение ролей](docs/TEAM_SPLIT.md), [план этапов](docs/CASCADE_GOALS.md), [TASKS](TASKS.md).

Данил работает в `danil/frontend`, Тим — в `tim/backend`. Финальная интеграция в `main` отдельна от публикации ролевых коммитов. Backend-ветка не сливалась в frontend для обновления этого README.
