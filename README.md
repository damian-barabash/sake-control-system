# Sake Control System

Личный uptime/health-монитор для проектов. Заводишь проект → привязываешь мониторы
(сайт / Supabase / Hetzner IP / любой сервер), сервис каждые ~5 минут проверяет
health + latency и при падении/восстановлении шлёт письмо. Multi-tenant: админ создаёт
аккаунты и привязывает к проектам, участник видит только свои.

- **Фронт:** React + Vite + Tailwind, HashRouter → GitHub Pages
- **Бэк:** Supabase `qnznezdhgfoxfkktzznw` (Postgres + Auth + RLS + Edge Functions + pg_cron)
- **Алерты:** Resend (email), отправитель `office@barabashflow.pl`
- **Языки:** RU / PL / EN (хранится в `profiles.language`)

## Локально

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
```

Supabase URL + anon-ключ зашиты в `src/lib/supabase.js` (anon-ключ публичный по
дизайну — доступ ограничивает RLS).

## Деплой на GitHub Pages

1. Создай репозиторий и запушь в ветку `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Pages → Custom domain: `sake.barabashflow.pl` (файл `public/CNAME`
   уже есть, домен сохранится между деплоями).
4. DNS: CNAME `sake` → `<user>.github.io` (как для `tickets.barabashflow.pl`).
5. Любой push в `main` → workflow `.github/workflows/deploy.yml` соберёт и выложит.

## Бэкенд (уже развёрнут)

- Схема + RLS + триггеры — миграции `sake_initial_schema`, `revoke_trigger_fn_execute`.
- Edge Functions: `run-checks` (ядро проверок + инциденты + письма), `create-user`
  (админ создаёт/удаляет аккаунты, сброс пароля).
- pg_cron `sake-run-checks` — каждую минуту дёргает `run-checks`; `sake-checks-retention`
  чистит историю старше 30 дней.

### Секреты Edge Functions (Supabase → Functions → Secrets)

- `RESEND_API_KEY` — ✅ уже задан.
- `NOTIFY_FROM` *(опц.)* — по умолчанию `Sake Control <office@barabashflow.pl>`.
- `APP_URL` *(опц.)* — по умолчанию `https://sake.barabashflow.pl` (ссылка в письме).
- `CRON_KEY` *(опц.)* — если задать, scheduler-путь `run-checks` потребует заголовок
  `x-cron-key` (доп. защита; тогда добавь его и в cron-job).

## Типы мониторов

| Тип | Что проверяет |
|---|---|
| `http` | HTTP(S) статус-код + latency (опц. ожидаемый код) |
| `keyword` | как http + наличие слова в теле ответа |
| `ssl` | TLS-handshake (падает на истёкшем/невалидном сертификате) |
| `tcp` | TCP-коннект к host:port |
| `supabase` | `/auth/v1/health` проекта Supabase |
| `ping` | ICMP — требует Mac-агента (`executor=mac`, Phase 2) |
