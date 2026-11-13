# Прогноз отгрузок

Дашборд показывает сохранённый прогноз, мониторинг и 3D-маршруты. Запуск обученной модели из интерфейса пока не подключён.

## Запуск

В `data/raw/` нужны `test_solo_track.parquet` и `best_score.csv` с колонками `id,y_pred`. Для ИИ помощника добавьте в `.env` ключ из кабинета Polza:

```text
POLZA_API_KEY=ваш_ключ
POLZA_MODEL=deepseek/deepseek-v4.1-flash-1017
```

Выполните `docker compose up -d --build` и откройте http://localhost:8080. После изменения ключа перезапустите контейнеры той же командой. Остановить приложение: `docker compose down`. Без ключа остальные разделы работают. `.env` и данные не входят в Git.

Прогноз относится к предыдущему часу; соседние временные точки пересекаются и не суммируются. Маршруты и их связь со складами демонстрационные: исходные данные не содержат координат и GPS. Вместимость транспорта задаётся условно.

## Проверка

```bash
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
```
