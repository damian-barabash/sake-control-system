// i18n core. Plain JS (no React) so format.js can import the dictionary too.
// Language preference is persisted per-user in profiles.language (backend),
// not in localStorage — localStorage is only a pre-login cache to avoid a flash.

export const DEFAULT_LANG = 'ru'

export const LANGUAGES = [
  { code: 'ru', label: 'RU', name: 'Русский' },
  { code: 'pl', label: 'PL', name: 'Polski' },
  { code: 'en', label: 'EN', name: 'English' },
]

export const LANG_CODES = LANGUAGES.map((l) => l.code)

export function normalizeLang(code) {
  return LANG_CODES.includes(code) ? code : DEFAULT_LANG
}

const DICT = {
  ru: {
    enum: {
      mstatus: { up: 'Работает', degraded: 'Деградация', down: 'Не работает', unknown: 'Нет данных' },
      mtype: { http: 'HTTP(S)', tcp: 'TCP-порт', ssl: 'SSL-сертификат', keyword: 'Ключевое слово', ping: 'Ping (ICMP)', supabase: 'Supabase' },
      executor: { cloud: 'Облако', mac: 'Mac-агент' },
    },
    common: {
      email: 'Email', password: 'Пароль', cancel: 'Отмена', save: 'Сохранить', create: 'Создать',
      add: 'Добавить', edit: 'Изменить', delete: 'Удалить', close: 'Закрыть', back: 'Назад',
      search: 'Поиск…', loading: 'Загрузка…', none: 'нет', optional: 'необязательно',
      yes: 'Да', no: 'Нет', name: 'Название', saving: 'Сохранение…', removing: 'Удаление…',
    },
    login: {
      tagline: 'Мониторинг состояния проектов',
      subtitle: 'Вход в панель управления',
      submit: 'Войти', signingIn: 'Вход…',
      errInvalid: 'Неверный логин или пароль', errGeneric: 'Не удалось войти',
      hint: 'Доступ только по приглашению администратора',
    },
    topbar: { lang: 'Язык', signout: 'Выйти', admin: 'admin', projects: 'Проекты', users: 'Пользователи', menu: 'Меню' },
    projects: {
      title: 'Проекты', refreshNote: 'проверка каждые 5 мин', empty: 'Пока нет проектов',
      emptyHint: 'Добавьте проект и привяжите к нему мониторы — сайт, базу, сервер.',
      newProject: 'Новый проект', monitors: '{n} монит.', allUp: 'всё работает',
      issues: '{n} с проблемой', noMonitors: 'нет мониторов', updated: 'обновлено',
    },
    project: {
      back: '← К проектам', monitors: 'Мониторы', addMonitor: 'Добавить монитор',
      editProject: 'Настройки проекта', members: 'Доступ', settings: 'Настройки',
      deleteProject: 'Удалить проект', deleteConfirm: 'Удалить проект «{name}» со всеми мониторами?',
      noMonitors: 'В проекте пока нет мониторов', noMonitorsHint: 'Добавьте первый монитор, чтобы начать проверки.',
      lastCheck: 'посл. проверка', uptime: 'аптайм', latency: 'задержка', never: 'ещё не проверялся',
      incidents: 'Инциденты', noIncidents: 'Инцидентов не было', ongoing: 'идёт сейчас',
      downFor: 'лежит {dur}', resolvedIn: 'восстановлен за {dur}',
      runNow: 'Проверить сейчас', checking: 'Проверка…',
    },
    monitorForm: {
      newTitle: 'Новый монитор', editTitle: 'Монитор', name: 'Название', type: 'Тип проверки',
      target: 'Адрес / хост', targetHintHttp: 'https://example.com', targetHintTcp: 'host.example.com',
      port: 'Порт', method: 'HTTP-метод', expectedStatus: 'Ожидаемый код', keyword: 'Искомое слово в ответе',
      interval: 'Интервал (сек)', timeout: 'Таймаут (мс)', sslWarnDays: 'Предупредить за N дней до истечения SSL',
      executor: 'Где проверять', enabled: 'Включён',
      deleteConfirm: 'Удалить монитор «{name}»?',
    },
    projectForm: {
      newTitle: 'Новый проект', editTitle: 'Настройки проекта', name: 'Название проекта',
      description: 'Описание', notifyEmails: 'Почты для алертов',
      notifyEmailsHint: 'Через запятую. Письма приходят при падении и восстановлении.',
      alertMembers: 'Также слать на почту привязанных аккаунтов',
    },
    members: {
      title: 'Доступ к проекту', hint: 'Отметьте аккаунты, которые видят этот проект.',
      noUsers: 'Нет других аккаунтов — создайте их в разделе «Пользователи».',
    },
    admin: {
      title: 'Пользователи', newUser: 'Новый аккаунт', fullName: 'Имя', email: 'Email',
      password: 'Пароль', role: 'Роль', alertEmail: 'Почта для алертов', projects: 'Проекты',
      create: 'Создать аккаунт', creating: 'Создание…', delete: 'Удалить', resetPassword: 'Сбросить пароль',
      newPassword: 'Новый пароль', deleteConfirm: 'Удалить аккаунт {email}?',
      roles: { admin: 'Администратор', member: 'Участник' }, empty: 'Пока только администратор',
      assign: 'Доступ к проектам', you: 'вы',
    },
    settings: { title: 'Настройки', alertEmail: 'Моя почта для алертов', alertEmailHint: 'Куда слать алерты по проектам, где я участник.', language: 'Язык интерфейса' },
    relTime: { now: 'только что', min: '{n} мин назад', hour: '{n} ч назад', day: '{n} дн назад' },
    dur: { sec: '{n} сек', min: '{n} мин', hour: '{n} ч', day: '{n} дн' },
    units: ['Б', 'КБ', 'МБ', 'ГБ'],
    months: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  },

  pl: {
    enum: {
      mstatus: { up: 'Działa', degraded: 'Spowolnienie', down: 'Nie działa', unknown: 'Brak danych' },
      mtype: { http: 'HTTP(S)', tcp: 'Port TCP', ssl: 'Certyfikat SSL', keyword: 'Słowo kluczowe', ping: 'Ping (ICMP)', supabase: 'Supabase' },
      executor: { cloud: 'Chmura', mac: 'Agent Mac' },
    },
    common: {
      email: 'Email', password: 'Hasło', cancel: 'Anuluj', save: 'Zapisz', create: 'Utwórz',
      add: 'Dodaj', edit: 'Edytuj', delete: 'Usuń', close: 'Zamknij', back: 'Wstecz',
      search: 'Szukaj…', loading: 'Ładowanie…', none: 'brak', optional: 'opcjonalne',
      yes: 'Tak', no: 'Nie', name: 'Nazwa', saving: 'Zapisywanie…', removing: 'Usuwanie…',
    },
    login: {
      tagline: 'Monitoring stanu projektów', subtitle: 'Logowanie do panelu',
      submit: 'Zaloguj', signingIn: 'Logowanie…',
      errInvalid: 'Błędny login lub hasło', errGeneric: 'Nie udało się zalogować',
      hint: 'Dostęp tylko na zaproszenie administratora',
    },
    topbar: { lang: 'Język', signout: 'Wyloguj', admin: 'admin', projects: 'Projekty', users: 'Użytkownicy', menu: 'Menu' },
    projects: {
      title: 'Projekty', refreshNote: 'sprawdzanie co 5 min', empty: 'Brak projektów',
      emptyHint: 'Dodaj projekt i przypisz monitory — stronę, bazę, serwer.',
      newProject: 'Nowy projekt', monitors: '{n} mon.', allUp: 'wszystko działa',
      issues: '{n} z problemem', noMonitors: 'brak monitorów', updated: 'zaktualizowano',
    },
    project: {
      back: '← Do projektów', monitors: 'Monitory', addMonitor: 'Dodaj monitor',
      editProject: 'Ustawienia projektu', members: 'Dostęp', settings: 'Ustawienia',
      deleteProject: 'Usuń projekt', deleteConfirm: 'Usunąć projekt „{name}” ze wszystkimi monitorami?',
      noMonitors: 'Projekt nie ma jeszcze monitorów', noMonitorsHint: 'Dodaj pierwszy monitor, aby zacząć sprawdzanie.',
      lastCheck: 'ost. sprawdzenie', uptime: 'dostępność', latency: 'opóźnienie', never: 'nie sprawdzano',
      incidents: 'Incydenty', noIncidents: 'Brak incydentów', ongoing: 'trwa teraz',
      downFor: 'nie działa {dur}', resolvedIn: 'przywrócono w {dur}',
      runNow: 'Sprawdź teraz', checking: 'Sprawdzanie…',
    },
    monitorForm: {
      newTitle: 'Nowy monitor', editTitle: 'Monitor', name: 'Nazwa', type: 'Typ sprawdzenia',
      target: 'Adres / host', targetHintHttp: 'https://example.com', targetHintTcp: 'host.example.com',
      port: 'Port', method: 'Metoda HTTP', expectedStatus: 'Oczekiwany kod', keyword: 'Szukane słowo w odpowiedzi',
      interval: 'Interwał (s)', timeout: 'Timeout (ms)', sslWarnDays: 'Ostrzeż na N dni przed wygaśnięciem SSL',
      executor: 'Gdzie sprawdzać', enabled: 'Włączony',
      deleteConfirm: 'Usunąć monitor „{name}”?',
    },
    projectForm: {
      newTitle: 'Nowy projekt', editTitle: 'Ustawienia projektu', name: 'Nazwa projektu',
      description: 'Opis', notifyEmails: 'Adresy do alertów',
      notifyEmailsHint: 'Po przecinku. Maile przychodzą przy awarii i przywróceniu.',
      alertMembers: 'Wysyłaj też na maile przypisanych kont',
    },
    members: {
      title: 'Dostęp do projektu', hint: 'Zaznacz konta, które widzą ten projekt.',
      noUsers: 'Brak innych kont — utwórz je w sekcji „Użytkownicy”.',
    },
    admin: {
      title: 'Użytkownicy', newUser: 'Nowe konto', fullName: 'Imię', email: 'Email',
      password: 'Hasło', role: 'Rola', alertEmail: 'Adres do alertów', projects: 'Projekty',
      create: 'Utwórz konto', creating: 'Tworzenie…', delete: 'Usuń', resetPassword: 'Zresetuj hasło',
      newPassword: 'Nowe hasło', deleteConfirm: 'Usunąć konto {email}?',
      roles: { admin: 'Administrator', member: 'Uczestnik' }, empty: 'Na razie tylko administrator',
      assign: 'Dostęp do projektów', you: 'ty',
    },
    settings: { title: 'Ustawienia', alertEmail: 'Mój adres do alertów', alertEmailHint: 'Gdzie wysyłać alerty z projektów, w których uczestniczę.', language: 'Język interfejsu' },
    relTime: { now: 'przed chwilą', min: '{n} min temu', hour: '{n} godz temu', day: '{n} dni temu' },
    dur: { sec: '{n} s', min: '{n} min', hour: '{n} godz', day: '{n} dni' },
    units: ['B', 'KB', 'MB', 'GB'],
    months: ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'],
  },

  en: {
    enum: {
      mstatus: { up: 'Up', degraded: 'Degraded', down: 'Down', unknown: 'No data' },
      mtype: { http: 'HTTP(S)', tcp: 'TCP port', ssl: 'SSL cert', keyword: 'Keyword', ping: 'Ping (ICMP)', supabase: 'Supabase' },
      executor: { cloud: 'Cloud', mac: 'Mac agent' },
    },
    common: {
      email: 'Email', password: 'Password', cancel: 'Cancel', save: 'Save', create: 'Create',
      add: 'Add', edit: 'Edit', delete: 'Delete', close: 'Close', back: 'Back',
      search: 'Search…', loading: 'Loading…', none: 'none', optional: 'optional',
      yes: 'Yes', no: 'No', name: 'Name', saving: 'Saving…', removing: 'Removing…',
    },
    login: {
      tagline: 'Project health monitoring', subtitle: 'Sign in to the dashboard',
      submit: 'Sign in', signingIn: 'Signing in…',
      errInvalid: 'Invalid login or password', errGeneric: 'Could not sign in',
      hint: 'Access by administrator invitation only',
    },
    topbar: { lang: 'Language', signout: 'Sign out', admin: 'admin', projects: 'Projects', users: 'Users', menu: 'Menu' },
    projects: {
      title: 'Projects', refreshNote: 'checked every 5 min', empty: 'No projects yet',
      emptyHint: 'Add a project and attach monitors — site, database, server.',
      newProject: 'New project', monitors: '{n} mon.', allUp: 'all up',
      issues: '{n} with issues', noMonitors: 'no monitors', updated: 'updated',
    },
    project: {
      back: '← To projects', monitors: 'Monitors', addMonitor: 'Add monitor',
      editProject: 'Project settings', members: 'Access', settings: 'Settings',
      deleteProject: 'Delete project', deleteConfirm: 'Delete project “{name}” with all monitors?',
      noMonitors: 'No monitors in this project yet', noMonitorsHint: 'Add the first monitor to start checks.',
      lastCheck: 'last check', uptime: 'uptime', latency: 'latency', never: 'never checked',
      incidents: 'Incidents', noIncidents: 'No incidents', ongoing: 'ongoing',
      downFor: 'down for {dur}', resolvedIn: 'resolved in {dur}',
      runNow: 'Check now', checking: 'Checking…',
    },
    monitorForm: {
      newTitle: 'New monitor', editTitle: 'Monitor', name: 'Name', type: 'Check type',
      target: 'Address / host', targetHintHttp: 'https://example.com', targetHintTcp: 'host.example.com',
      port: 'Port', method: 'HTTP method', expectedStatus: 'Expected code', keyword: 'Keyword in response',
      interval: 'Interval (s)', timeout: 'Timeout (ms)', sslWarnDays: 'Warn N days before SSL expiry',
      executor: 'Run from', enabled: 'Enabled',
      deleteConfirm: 'Delete monitor “{name}”?',
    },
    projectForm: {
      newTitle: 'New project', editTitle: 'Project settings', name: 'Project name',
      description: 'Description', notifyEmails: 'Alert emails',
      notifyEmailsHint: 'Comma-separated. Emails sent on down and recovery.',
      alertMembers: 'Also send to attached accounts’ emails',
    },
    members: {
      title: 'Project access', hint: 'Check the accounts that can see this project.',
      noUsers: 'No other accounts — create them in “Users”.',
    },
    admin: {
      title: 'Users', newUser: 'New account', fullName: 'Name', email: 'Email',
      password: 'Password', role: 'Role', alertEmail: 'Alert email', projects: 'Projects',
      create: 'Create account', creating: 'Creating…', delete: 'Delete', resetPassword: 'Reset password',
      newPassword: 'New password', deleteConfirm: 'Delete account {email}?',
      roles: { admin: 'Administrator', member: 'Member' }, empty: 'Only the administrator so far',
      assign: 'Project access', you: 'you',
    },
    settings: { title: 'Settings', alertEmail: 'My alert email', alertEmailHint: 'Where to send alerts for projects I am a member of.', language: 'Interface language' },
    relTime: { now: 'just now', min: '{n} min ago', hour: '{n} h ago', day: '{n} d ago' },
    dur: { sec: '{n} s', min: '{n} min', hour: '{n} h', day: '{n} d' },
    units: ['B', 'KB', 'MB', 'GB'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
}

function walk(tree, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), tree)
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

export function translate(lang, key, vars) {
  const l = normalizeLang(lang)
  let val = walk(DICT[l], key)
  if (val == null) val = walk(DICT[DEFAULT_LANG], key)
  if (val == null) return key
  return interpolate(val, vars)
}

export function dict(lang) {
  return DICT[normalizeLang(lang)]
}

export function makeT(lang) {
  return (key, vars) => translate(lang, key, vars)
}
