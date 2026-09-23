# Danil: закрыть голосовой интерфейс поверх проверенного text MVP

Автор задания: Tim / интегратор. Дата: 2026-09-23. Это согласованный исполняемый срез, не новый этап brainstorming. Сохранить референсы, текстовый интерфейс, lockfile и тесты Данила.

## Сначала сверить, не перезаписать

Работать на `danil/frontend`. До изменений выполнить `git status --short --branch` и `git fetch origin --prune`. При неизвестных локальных правках сначала прочитать diff; не удалять и не делать force/reset. Если есть новые remote commits, сверить и интегрировать их безопасно перед своей работой.

Прочитать свою фактическую память и новые входящие инструкции:

```bash
git show origin/tim/backend:.codex/INTEGRATION_CONTRACT.md
git show origin/tim/backend:prompts/DANIL_VOICE_FINISH.md
git show origin/tim/backend:.codex/TIM_STATE.md
```

Также прочитать `.codex/DANIL_STATE.md`, `.codex/DANIL_TO_TIM.md`, `frontend/AUDIO_HANDOFF.md` и `frontend/src/shared/turn-client/audio.ts` в своей ветке. Входящие frontend helpers уже опубликованы как `b3f0982` поверх `fcb9efb`. Старое утверждение «voice endpoint UNKNOWN» относится к прежней ревизии; обновить его после чтения текущего кода, не раньше.

Не merge/rebase весь `tim/backend` в frontend ради чтения файлов. Для реального прогона использовать текущий backend в отдельном checkout/worktree на том же ПК. Адрес 127.0.0.1:5173 не означает доступ к ПК второго участника.

## Что уже определено backend

- `POST /v1/turn/audio`: FormData `session_id`, `file`, `include_audio=true`.
- `POST /v1/audio/transcriptions`: только транскрипция файла, без хода диалога.
- `POST /v1/audio/speech`: JSON `{text}` до 2000 символов, binary MP3.
- Голосовой ход возвращает существующие поля текста/trace, `assistant_audio={mime_type,base64,ai_generated}` или null и `audio_error`.
- При TTS failure HTTP 200 сохраняет текст/trace: повторять только synthesize, НЕ submitVoice и НЕ router.
- Файл до 20 MiB. MIME-базы WebM, MP4/M4A, MPEG/MP3/MPGA, WAV указаны полностью в контракте; Ogg не обещать. Проверить `MediaRecorder.isTypeSupported` и выбрать пересечение браузера с backend.
- Все provider keys только на сервере. Не обращаться из браузера к OpenAI/NVIDIA и не создавать public-prefixed секреты.

## Реализация одного законченного среза

1. Подключить «Записать», «Остановить и отправить», «Отменить» к `getUserMedia`/`MediaRecorder` и существующему AudioApiClient. Максимум 60 секунд записи; отклонять пустой Blob. При отсутствии формата/микрофона оставить text fallback и понятную ошибку.
2. Останавливать все media tracks при stop/cancel/error/unmount. Освобождать Object URL. Не отправлять отменённую запись.
3. Привязать ответ к исходной реплике, проверить session_id и `turnResultSchema` до отображения. Никаких прошлых trace на failed/pending turn и автоматических fixture-success.
4. Преобразовать полученный base64 MP3 в воспроизводимое аудио. Дать явный play/replay; autoplay не гарантировать. Показать «Голос создан ИИ». Text/trace сохраняются при отказе воспроизведения.
5. Показать ошибки 413/415/422/429/502/503/504, permission denied, отсутствие устройства и TTS failure. Cancel прекращает ожидание клиента, но не утверждает отмену provider processing. Не делать автоматический повтор всего хода.
6. Не менять сценарии, confidence, `not_this_if`, backend, labels или дизайн по собственной инициативе. `actions=[]` не обозначает выполненные операции. `tts_first_audio=null` выводить как «—»; optional `tts` только отображать, не придумывать измерение.

## Проверить и передать

Выполнить реальные существующие scripts `frontend/package.json`: format:check, lint, typecheck, unit/transport, e2e, build. Использовать `pnpm install --frozen-lockfile`; не менять версии библиотек ради нового плана. Добавить целевые тесты разрешений/cleanup, пустой записи, voice success, TTS failure и сохранения текста/trace.

С текущим backend на том же ПК выполнить живой текстовый запрос, живую голосовую реплику, прослушивание и один настоящий сбой. Проверить RU/KK/mixed по возможности; не объявлять непроверенную языковую группу пройденной. Не использовать ранее опубликованный smoke на `ce761bd` как доказательство новой версии. Если квота, ключ или сеть блокируют прогон, записать blocker, а не рисовать pass.

Обновить только свой DANIL_STATE и исходящий DANIL_TO_TIM: оба source SHA, команды, фактические результаты, известные ограничения, следующий шаг. Секреты/реальные персональные данные в отчёт не включать. Один законченный срез: diff → добавить конкретные файлы → staged diff → atomic commit → обычный push в `danil/frontend`. При отклонённом push сначала перечитать remote changes, без force.

Сообщение коммита: `frontend(voice): connect recording and playback to OpenAI backend`.

Финальный merge в main выполняет Tim после совместной приёмки и разрешения конфликтов. Не обещать готовый голосовой MVP до живого полного прогона. Параллельный baseline/tuning остаётся backend-задачей.
