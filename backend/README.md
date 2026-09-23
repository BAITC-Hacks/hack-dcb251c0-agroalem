# Backend Voice Router

Основная инструкция для пользователя и жюри находится в корневом [README.md](../README.md).

Запуск полного клона с локальным `.env.local`:

```powershell
py run_mvp.py
```

Адрес: http://127.0.0.1:8000 . Node/React для встроенной страницы не нужны.

Сервер: FastAPI, Pydantic, HTTPX, python-multipart, python-dotenv. Все AI-вызовы идут в OpenAI; ключ только на сервере. Текстовое демо имеет read-only ответ по исходной базе знаний, а не исполнение страховых операций.

Проверки:

```powershell
py run_mvp.py --check
.venv\Scripts\python.exe -m backend.scripts.run_baseline
```

Последняя команда выполняет платные живые запросы и официальный evaluator. До реального запуска не заявляйте routing baseline измеренным. Документированные 46 новых unit/regression проверок используют контролируемого провайдера.
