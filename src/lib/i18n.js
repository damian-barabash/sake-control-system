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
      hint: 'Нет аккаунта? Создайте свой воркспейс за минуту.',
      toLanding: '← На главную', noAccount: 'Ещё нет аккаунта?', signup: 'Зарегистрироваться',
    },
    register: {
      toLanding: '← На главную', badge: 'Регистрация', title: 'Создать аккаунт',
      sub: 'Свой воркспейс для мониторинга всех ваших проектов.',
      name: 'Имя', namePlaceholder: 'Как к вам обращаться',
      email: 'Email', password: 'Пароль', passwordHint: 'Минимум 6 символов', confirm: 'Повторите пароль',
      submit: 'Создать аккаунт', haveAccount: 'Уже есть аккаунт?', signin: 'Войти',
      errMismatch: 'Пароли не совпадают', errWeak: 'Пароль слишком короткий (мин. 6 символов)',
      errExists: 'Такой email уже зарегистрирован', errGeneric: 'Не удалось зарегистрироваться: ',
      successTitle: 'Почти готово', checkEmail: 'Подтвердите адрес по ссылке в письме.', successCta: 'К входу',
    },
    landing: {
      nav: { features: 'Возможности', how: 'Как работает', app: 'Приложение', keepalive: 'Keep-alive', pricing: 'Цены', faq: 'Вопросы', login: 'Войти', signup: 'Начать бесплатно' },
      loader: 'Собираем облако…',
      hero: {
        badge: 'Uptime-мониторинг нового поколения',
        titleA: 'Все ваши проекты —', titleB: 'под нашим контролем.',
        sub: 'SAKE следит за сайтами, базами данных и серверами в real-time. Мгновенное решение проблем для тебя, твоих работников и клиентов.',
        ctaPrimary: 'Попробовать бесплатно', ctaSecondary: 'Возможности Sake',
        note: '7 дней бесплатно без привязки карты. Потом $7/мес.',
        statusOk: 'Все системы в норме', statusDown: 'Обнаружен сбой · barabashflow.pl', statusUp: 'Восстановлено за 2 мин 14 с',
      },
      stats: { a: 'проверок в минуту', b: 'среднее время реакции', c: 'видимость аптайма' },
      why: {
        label: 'Почему SAKE',
        title: 'Сторож, который надёжнее того, что он сторожит',
        sub: 'Большинство «мониторов» падают вместе с вашим сервером. SAKE живёт в облаке — он успеет заметить сбой и позвать на помощь.',
        points: [
          { title: 'Проверки в облаке', body: 'Планировщик в облаке дёргает ваши сервисы независимо от вашей инфраструктуры. Пропал офис — мониторинг продолжает работать.' },
          { title: 'Письмо за секунды', body: 'Сервис не ответил N раз подряд — летит письмо. Восстановился — летит ещё одно. Анти-флаппинг отсекает ложные тревоги.' },
          { title: 'Одна панель на всё', body: 'Сайты, Supabase, Hetzner, любой TCP-порт и SSL — статус, аптайм и задержка всех проектов на одном экране.' },
        ],
      },
      inbox: {
        label: 'Алерты 24/7 — мы следим безостановочно',
        title: 'Экстренные оповещения за мгновения',
        sub: 'Пример входящего потока в случае проблем. Наблюдение в реальном времени — незамедлительная реакция.',
        live: 'в реальном времени', now: 'только что',
        items: [
          { tag: 'down', subject: '🔴 barabashflow.pl не отвечает', body: 'HTTP-таймаут после 3 проверок подряд. Задержка превысила 10 000 мс.' },
          { tag: 'ssl', subject: '🟡 SSL истекает через 14 дней', body: 'Сертификат api.вашпроект.pl истекает 1 июля. Пора продлить.' },
          { tag: 'up', subject: '🟢 barabashflow.pl снова в строю', body: 'Сервис восстановлен. Простой составил 2 мин 14 сек.' },
        ],
      },
      incident: {
        label: 'Сбой в прямом эфире',
        title: 'Вот что происходит, когда что-то падает',
        sub: 'SAKE ловит сбой за секунды и зовёт на помощь. Смотрите — туча краснеет, как только сервис перестаёт отвечать.',
        operational: 'Работает', outage: 'СБОЙ', recovering: 'Восстановление…', recovered: 'Восстановлено за 2:14',
        monitor: 'barabashflow.pl', reason: 'HTTP-таймаут · 3 фейла подряд', sent: 'Письмо ушло на office@barabashflow.pl', downtime: 'Простой',
        steps: ['Обнаружено', 'Письмо отправлено', 'Восстановлено'],
      },
      pulse: {
        label: 'Живые проверки',
        title: 'Пульс ваших сервисов',
        sub: 'Каждую минуту — новая точка. Аптайм и задержка считаются на лету.',
        uptime: 'аптайм 30 дней', latency: 'задержка сейчас',
      },
      features: {
        label: 'Возможности',
        title: 'Контролируем всё',
        items: [
          { title: 'HTTP(S)', body: 'Код ответа, задержка и ключевое слово в теле страницы.' },
          { title: 'TCP-порт', body: 'Жив ли сервис на 22, 5432 или любом вашем порту.' },
          { title: 'SSL-сертификат', body: 'Предупреждение за N дней до истечения сертификата.' },
          { title: 'Supabase', body: 'Health-проверка шлюза по сценарию «reachable».' },
          { title: 'Аптайм и latency', body: 'Процент аптайма за 24ч / 7д / 30д и спарклайн задержки.' },
          { title: 'Инциденты', body: 'Когда упал, сколько лежал, когда восстановился — полный таймлайн.' },
        ],
      },
      how: {
        label: 'Как это работает',
        title: 'Три шага до спокойствия',
        steps: [
          { n: '01', title: 'Заведите проект', body: 'Создайте проект и добавьте мониторы: сайт, базу, сервер, порт.' },
          { n: '02', title: 'Облако проверяет', body: 'Каждую минуту облачный планировщик пингует сервисы и копит историю.' },
          { n: '03', title: 'Письмо при сбое', body: 'Падение или восстановление — письмо летит на нужный адрес.' },
        ],
      },
      app: {
        label: 'Мобильное приложение',
        title: 'Мониторь как удобно — Sake теперь в кармане!',
        sub: 'Нативное приложение для iOS и Android. Мультиплатформенность позволяет отслеживать всё в одном месте: статусы проектов в реальном времени, инциденты, проверка по тапу и уведомления о падениях.',
        features: [
          'Статус всех проектов с агрегатом',
          'Спарклайн latency и таймлайн инцидентов',
          'Проверка по тапу и pull-to-refresh',
          'Выбор темы приложения',
          'Поддержка трёх языков RU / PL / EN',
        ],
        ios: 'Загрузить в', iosName: 'App Store',
        android: 'Доступно в', androidName: 'Google Play',
        soon: 'Скоро',
        phoneTitle: 'Мои проекты',
        rows: [
          { name: 'barabashflow.pl', kind: 'HTTP · 84 мс', status: 'up' },
          { name: 'Supabase · REST', kind: 'health · 96 мс', status: 'up' },
          { name: 'api.cert · SSL', kind: 'осталось 14 дней', status: 'degraded' },
          { name: 'hetzner · :5432', kind: 'таймаут', status: 'down' },
        ],
      },
      keepalive: {
        label: 'Supabase keep-alive',
        title: 'Бесплатный Supabase больше не засыпает',
        sub: 'Supabase ставит free-проекты на паузу после 7 дней без активности. SAKE раз в 3 дня делает настоящий API-запрос с anon-ключом вашего проекта — это честная активность, и пауза просто не наступает.',
        features: [
          'Вставьте anon / publishable key в монитор — это вся настройка',
          'Настоящий запрос к базе раз в 3 дня — с двойным запасом',
          'Без нагрузки: остальные проверки — лёгкий пинг каждые 5 минут',
          'Ключ отозван — монитор сразу подсветится жёлтым',
        ],
        note: 'Нужен только публичный anon-ключ (он и так виден в коде вашего сайта). Секретные ключи (service_role) не используются и не хранятся.',
        card: {
          plan: 'Supabase · Free план',
          active: 'Активен',
          timeline: 'API-запрос раз в 3 дня',
          window: '7 дней',
          ok: '200 OK',
          pause: 'Пауза за неактивность (7 дней)',
          never: 'не наступит',
        },
      },
      pricing: {
        label: 'Цены',
        title: 'Один простой тариф',
        sub: '7 дней бесплатно. Карта не нужна. Потом — один понятный план.',
        monthly: 'Помесячно', yearly: 'Год', save: '2 месяца в подарок', perMonth: '/мес', perYear: '/год',
        trial: '7 дней бесплатно', trialNote: 'Полный доступ 7 дней, без карты. Отмена в любой момент.',
        pro: { name: 'Pro', badge: 'Всё включено', features: ['Безлимит проектов', 'Безлимит мониторов', 'проверки от 1 минуты', 'SSL и keyword-чеки', 'мультиаккаунт и роли', 'email-алерты', 'приоритетная поддержка'], cta: 'Начать 7 дней бесплатно' },
      },
      faq: {
        label: 'Вопросы',
        title: 'Коротко о главном',
        items: [
          { q: 'Что именно умеет проверять SAKE?', a: 'HTTP(S), TCP-порт, SSL-сертификат, наличие ключевого слова и health Supabase. Скоро — ICMP-ping через агента.' },
          { q: 'Как часто идут проверки?', a: 'По умолчанию каждые 5 минут, на Pro — от 1 минуты на монитор.' },
          { q: 'А если упадёт сам SAKE?', a: 'Проверки и письма живут в облаке, независимо от вашей и нашей офисной инфраструктуры — это и есть принцип «сторож надёжнее сторожимого».' },
          { q: 'Кому приходят письма?', a: 'На почту, привязанную к проекту, и на адреса аккаунтов с доступом — список редактируется.' },
          { q: 'Как работает бесплатный период?', a: '7 дней полного доступа бесплатно и без карты. Дальше — $7/мес или $75/год. Отменить можно в любой момент.' },
        ],
      },
      finalCta: { title: 'Перестаньте узнавать о сбоях от клиентов', sub: 'Поднимите свой первый монитор за пару минут.', button: 'Создать аккаунт' },
      footer: { tagline: 'Облако, которое не спит.', rights: 'Часть экосистемы barabashflow.pl' },
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
      anonKey: 'Anon / publishable key (опционально)',
      anonKeyHint: 'С ключом монитор раз в 3 дня делает настоящий API-запрос в базу — Supabase считает это активностью, и бесплатный проект не ставится на паузу (keep-alive). Где взять ключ: supabase.com/dashboard → ваш проект → ⚙ Project Settings → API Keys → скопируйте «anon public» (или Publishable key).',
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
      roles: { moderator: 'Модератор', admin: 'Администратор', member: 'Клиент' },
      roleHint: 'Модератор видит всё, администратор — свои проекты, клиент — только привязанные.',
      empty: 'Пока только администратор', assign: 'Доступ к проектам', you: 'вы',
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
      hint: 'Nie masz konta? Załóż własny workspace w minutę.',
      toLanding: '← Strona główna', noAccount: 'Nie masz jeszcze konta?', signup: 'Zarejestruj się',
    },
    register: {
      toLanding: '← Strona główna', badge: 'Rejestracja', title: 'Utwórz konto',
      sub: 'Własny workspace do monitoringu wszystkich projektów.',
      name: 'Imię', namePlaceholder: 'Jak się do Ciebie zwracać',
      email: 'Email', password: 'Hasło', passwordHint: 'Minimum 6 znaków', confirm: 'Powtórz hasło',
      submit: 'Utwórz konto', haveAccount: 'Masz już konto?', signin: 'Zaloguj się',
      errMismatch: 'Hasła nie są zgodne', errWeak: 'Hasło za krótkie (min. 6 znaków)',
      errExists: 'Ten email jest już zarejestrowany', errGeneric: 'Nie udało się zarejestrować: ',
      successTitle: 'Prawie gotowe', checkEmail: 'Potwierdź adres linkiem z maila.', successCta: 'Do logowania',
    },
    landing: {
      nav: { features: 'Funkcje', how: 'Jak działa', app: 'Aplikacja', keepalive: 'Keep-alive', pricing: 'Cennik', faq: 'Pytania', login: 'Zaloguj', signup: 'Zacznij za darmo' },
      loader: 'Tworzymy chmurę…',
      hero: {
        badge: 'Monitoring uptime nowej generacji',
        titleA: 'Wszystkie projekty —', titleB: 'pod naszą kontrolą.',
        sub: 'SAKE pilnuje stron, baz danych i serwerów w czasie rzeczywistym. Błyskawiczne rozwiązanie problemów dla Ciebie, Twoich pracowników i klientów.',
        ctaPrimary: 'Wypróbuj za darmo', ctaSecondary: 'Funkcje Sake',
        note: '7 dni za darmo bez podawania karty. Potem $7/mies.',
        statusOk: 'Wszystkie systemy sprawne', statusDown: 'Wykryto awarię · barabashflow.pl', statusUp: 'Przywrócono w 2 min 14 s',
      },
      stats: { a: 'sprawdzeń na minutę', b: 'średni czas reakcji', c: 'widoczność uptime' },
      why: {
        label: 'Dlaczego SAKE',
        title: 'Stróż pewniejszy niż to, czego pilnuje',
        sub: 'Większość „monitorów” pada razem z Twoim serwerem. SAKE żyje w chmurze — zdąży zauważyć awarię i wezwać pomoc.',
        points: [
          { title: 'Sprawdzenia w chmurze', body: 'Harmonogram w chmurze odpytuje Twoje usługi niezależnie od Twojej infrastruktury. Padło biuro — monitoring działa dalej.' },
          { title: 'Mail w kilka sekund', body: 'Usługa nie odpowiada N razy z rzędu — leci mail. Wróciła — leci kolejny. Anti-flapping odcina fałszywe alarmy.' },
          { title: 'Jeden panel na wszystko', body: 'Strony, Supabase, Hetzner, dowolny port TCP i SSL — status, uptime i opóźnienie wszystkich projektów na jednym ekranie.' },
        ],
      },
      inbox: {
        label: 'Alerty 24/7 — czuwamy bez przerwy',
        title: 'Awaryjne powiadomienia w mgnieniu oka',
        sub: 'Przykład strumienia wiadomości w razie problemów. Obserwacja w czasie rzeczywistym — natychmiastowa reakcja.',
        live: 'na żywo', now: 'przed chwilą',
        items: [
          { tag: 'down', subject: '🔴 barabashflow.pl nie odpowiada', body: 'Timeout HTTP po 3 sprawdzeniach z rzędu. Opóźnienie przekroczyło 10 000 ms.' },
          { tag: 'ssl', subject: '🟡 SSL wygasa za 14 dni', body: 'Certyfikat api.twojprojekt.pl wygasa 1 lipca. Czas odnowić.' },
          { tag: 'up', subject: '🟢 barabashflow.pl znów działa', body: 'Usługa przywrócona. Przestój wyniósł 2 min 14 s.' },
        ],
      },
      incident: {
        label: 'Awaria na żywo',
        title: 'Oto co się dzieje, gdy coś pada',
        sub: 'SAKE łapie awarię w sekundy i wzywa pomoc. Patrz — chmura czerwienieje, gdy tylko usługa przestaje odpowiadać.',
        operational: 'Działa', outage: 'AWARIA', recovering: 'Przywracanie…', recovered: 'Przywrócono w 2:14',
        monitor: 'barabashflow.pl', reason: 'Timeout HTTP · 3 błędy z rzędu', sent: 'Mail poszedł na office@barabashflow.pl', downtime: 'Przestój',
        steps: ['Wykryto', 'Mail wysłany', 'Przywrócono'],
      },
      pulse: {
        label: 'Sprawdzenia na żywo',
        title: 'Puls Twoich usług',
        sub: 'Co minutę — nowy punkt. Uptime i opóźnienie liczone na bieżąco.',
        uptime: 'uptime 30 dni', latency: 'opóźnienie teraz',
      },
      features: {
        label: 'Funkcje',
        title: 'Kontrolujemy wszystko',
        items: [
          { title: 'HTTP(S)', body: 'Kod odpowiedzi, opóźnienie i słowo kluczowe w treści strony.' },
          { title: 'Port TCP', body: 'Czy usługa żyje na 22, 5432 lub dowolnym Twoim porcie.' },
          { title: 'Certyfikat SSL', body: 'Ostrzeżenie na N dni przed wygaśnięciem certyfikatu.' },
          { title: 'Supabase', body: 'Sprawdzenie health bramki w trybie „reachable”.' },
          { title: 'Uptime i latency', body: 'Procent uptime za 24h / 7d / 30d i sparkline opóźnienia.' },
          { title: 'Incydenty', body: 'Kiedy padło, jak długo, kiedy wróciło — pełna oś czasu.' },
        ],
      },
      how: {
        label: 'Jak to działa',
        title: 'Trzy kroki do spokoju',
        steps: [
          { n: '01', title: 'Załóż projekt', body: 'Utwórz projekt i dodaj monitory: stronę, bazę, serwer, port.' },
          { n: '02', title: 'Chmura sprawdza', body: 'Co minutę harmonogram w chmurze pinguje usługi i zbiera historię.' },
          { n: '03', title: 'Mail przy awarii', body: 'Awaria lub przywrócenie — mail leci na właściwy adres.' },
        ],
      },
      app: {
        label: 'Aplikacja mobilna',
        title: 'Monitoruj jak wygodnie — Sake teraz w kieszeni!',
        sub: 'Natywna aplikacja na iOS i Androida. Wieloplatformowość pozwala śledzić wszystko w jednym miejscu: statusy projektów w czasie rzeczywistym, awarie, sprawdzenie jednym tapnięciem i powiadomienia o awariach.',
        features: [
          'Status wszystkich projektów ze zbiorczym widokiem',
          'Sparkline latency i oś czasu awarii',
          'Sprawdzenie jednym tapnięciem i pull-to-refresh',
          'Wybór motywu aplikacji',
          'Obsługa trzech języków RU / PL / EN',
        ],
        ios: 'Pobierz z', iosName: 'App Store',
        android: 'Pobierz z', androidName: 'Google Play',
        soon: 'Wkrótce',
        phoneTitle: 'Moje projekty',
        rows: [
          { name: 'barabashflow.pl', kind: 'HTTP · 84 ms', status: 'up' },
          { name: 'Supabase · REST', kind: 'health · 96 ms', status: 'up' },
          { name: 'api.cert · SSL', kind: 'zostało 14 dni', status: 'degraded' },
          { name: 'hetzner · :5432', kind: 'timeout', status: 'down' },
        ],
      },
      keepalive: {
        label: 'Supabase keep-alive',
        title: 'Darmowy Supabase już nie zasypia',
        sub: 'Supabase pauzuje darmowe projekty po 7 dniach bez aktywności. SAKE co 3 dni wykonuje prawdziwe zapytanie API z kluczem anon twojego projektu — to realna aktywność, więc pauza po prostu nie następuje.',
        features: [
          'Wklej anon / publishable key do monitora — to cała konfiguracja',
          'Prawdziwe zapytanie do bazy co 3 dni — z podwójnym zapasem',
          'Bez obciążenia: pozostałe sprawdzenia to lekki ping co 5 minut',
          'Klucz odwołany — monitor od razu zaświeci się na żółto',
        ],
        note: 'Potrzebny jest tylko publiczny klucz anon (i tak widoczny w kodzie twojej strony). Klucze sekretne (service_role) nie są używane ani przechowywane.',
        card: {
          plan: 'Supabase · Plan Free',
          active: 'Aktywny',
          timeline: 'Zapytanie API co 3 dni',
          window: '7 dni',
          ok: '200 OK',
          pause: 'Pauza za brak aktywności (7 dni)',
          never: 'nie nastąpi',
        },
      },
      pricing: {
        label: 'Cennik',
        title: 'Jeden prosty plan',
        sub: '7 dni za darmo. Bez karty. Potem — jeden zrozumiały plan.',
        monthly: 'Miesięcznie', yearly: 'Rok', save: '2 miesiące gratis', perMonth: '/mies', perYear: '/rok',
        trial: '7 dni za darmo', trialNote: 'Pełny dostęp przez 7 dni, bez karty. Anuluj w każdej chwili.',
        pro: { name: 'Pro', badge: 'Wszystko w cenie', features: ['Bez limitu projektów', 'Bez limitu monitorów', 'sprawdzenia od 1 minuty', 'testy SSL i keyword', 'multikonto i role', 'alerty email', 'priorytetowe wsparcie'], cta: 'Rozpocznij 7 dni za darmo' },
      },
      faq: {
        label: 'Pytania',
        title: 'Najważniejsze w skrócie',
        items: [
          { q: 'Co dokładnie sprawdza SAKE?', a: 'HTTP(S), port TCP, certyfikat SSL, obecność słowa kluczowego i health Supabase. Wkrótce — ping ICMP przez agenta.' },
          { q: 'Jak często idą sprawdzenia?', a: 'Domyślnie co 5 minut, w Pro — od 1 minuty na monitor.' },
          { q: 'A jeśli padnie samo SAKE?', a: 'Sprawdzenia i maile żyją w chmurze, niezależnie od Twojej i naszej infrastruktury biurowej — to zasada „stróż pewniejszy niż pilnowane”.' },
          { q: 'Do kogo trafiają maile?', a: 'Na adres przypisany do projektu i adresy kont z dostępem — lista jest edytowalna.' },
          { q: 'Jak działa okres próbny?', a: '7 dni pełnego dostępu za darmo i bez karty. Potem $7/mies lub $75/rok. Możesz anulować w każdej chwili.' },
        ],
      },
      finalCta: { title: 'Przestań dowiadywać się o awariach od klientów', sub: 'Postaw pierwszy monitor w kilka minut.', button: 'Utwórz konto' },
      footer: { tagline: 'Chmura, która nie śpi.', rights: 'Część ekosystemu barabashflow.pl' },
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
      anonKey: 'Anon / publishable key (opcjonalnie)',
      anonKeyHint: 'Z kluczem monitor co 3 dni wykonuje prawdziwe zapytanie API do bazy — Supabase liczy to jako aktywność i darmowy projekt nie jest pauzowany (keep-alive). Gdzie znaleźć klucz: supabase.com/dashboard → twój projekt → ⚙ Project Settings → API Keys → skopiuj „anon public” (lub Publishable key).',
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
      roles: { moderator: 'Moderator', admin: 'Administrator', member: 'Klient' },
      roleHint: 'Moderator widzi wszystko, administrator — swoje projekty, klient — tylko przypisane.',
      empty: 'Na razie tylko administrator', assign: 'Dostęp do projektów', you: 'ty',
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
      hint: 'No account? Spin up your own workspace in a minute.',
      toLanding: '← Home', noAccount: 'No account yet?', signup: 'Sign up',
    },
    register: {
      toLanding: '← Home', badge: 'Sign up', title: 'Create an account',
      sub: 'Your own workspace to monitor all your projects.',
      name: 'Name', namePlaceholder: 'What should we call you',
      email: 'Email', password: 'Password', passwordHint: 'At least 6 characters', confirm: 'Repeat password',
      submit: 'Create account', haveAccount: 'Already have an account?', signin: 'Sign in',
      errMismatch: 'Passwords do not match', errWeak: 'Password too short (min. 6 characters)',
      errExists: 'This email is already registered', errGeneric: 'Could not register: ',
      successTitle: 'Almost there', checkEmail: 'Confirm your address via the link in the email.', successCta: 'To sign in',
    },
    landing: {
      nav: { features: 'Features', how: 'How it works', app: 'App', keepalive: 'Keep-alive', pricing: 'Pricing', faq: 'FAQ', login: 'Sign in', signup: 'Start free' },
      loader: 'Forming the cloud…',
      hero: {
        badge: 'Next-gen uptime monitoring',
        titleA: 'All your projects —', titleB: 'under our control.',
        sub: 'SAKE watches your sites, databases and servers in real time. Instant problem-solving for you, your team and your clients.',
        ctaPrimary: 'Try it free', ctaSecondary: 'Sake features',
        note: '7 days free, no card required. Then $7/mo.',
        statusOk: 'All systems operational', statusDown: 'Outage detected · barabashflow.pl', statusUp: 'Recovered in 2 min 14 s',
      },
      stats: { a: 'checks per minute', b: 'average time to alert', c: 'uptime visibility' },
      why: {
        label: 'Why SAKE',
        title: 'A watchman more reliable than what it watches',
        sub: 'Most “monitors” go down together with your server. SAKE lives in the cloud — it spots the failure and calls for help in time.',
        points: [
          { title: 'Checks in the cloud', body: 'A cloud scheduler probes your services independently of your infrastructure. Office down — monitoring keeps running.' },
          { title: 'Email in seconds', body: 'A service fails N times in a row — an email flies out. It recovers — another one follows. Anti-flapping kills false alarms.' },
          { title: 'One panel for everything', body: 'Sites, Supabase, Hetzner, any TCP port and SSL — status, uptime and latency of every project on one screen.' },
        ],
      },
      inbox: {
        label: 'Alerts 24/7 — we watch non-stop',
        title: 'Emergency alerts in an instant',
        sub: 'An example of the incoming stream when something goes wrong. Real-time monitoring — instant reaction.',
        live: 'live', now: 'just now',
        items: [
          { tag: 'down', subject: '🔴 barabashflow.pl is not responding', body: 'HTTP timeout after 3 checks in a row. Latency exceeded 10,000 ms.' },
          { tag: 'ssl', subject: '🟡 SSL expires in 14 days', body: 'The certificate for api.yourproject.pl expires on July 1. Time to renew.' },
          { tag: 'up', subject: '🟢 barabashflow.pl is back up', body: 'Service recovered. Downtime was 2 min 14 sec.' },
        ],
      },
      incident: {
        label: 'Live outage',
        title: 'Here is what happens when something breaks',
        sub: 'SAKE catches the failure in seconds and calls for help. Watch — the cloud turns red the moment a service stops responding.',
        operational: 'Operational', outage: 'OUTAGE', recovering: 'Recovering…', recovered: 'Recovered in 2:14',
        monitor: 'barabashflow.pl', reason: 'HTTP timeout · 3 fails in a row', sent: 'Email sent to office@barabashflow.pl', downtime: 'Downtime',
        steps: ['Detected', 'Email sent', 'Recovered'],
      },
      pulse: {
        label: 'Live checks',
        title: 'The pulse of your services',
        sub: 'Every minute, a new point. Uptime and latency computed on the fly.',
        uptime: 'uptime 30d', latency: 'latency now',
      },
      features: {
        label: 'Features',
        title: 'We control everything',
        items: [
          { title: 'HTTP(S)', body: 'Response code, latency and a keyword in the page body.' },
          { title: 'TCP port', body: 'Whether the service is alive on 22, 5432 or any port you use.' },
          { title: 'SSL certificate', body: 'A heads-up N days before the certificate expires.' },
          { title: 'Supabase', body: 'Gateway health check in “reachable” mode.' },
          { title: 'Uptime & latency', body: 'Uptime % over 24h / 7d / 30d and a latency sparkline.' },
          { title: 'Incidents', body: 'When it went down, how long, when it recovered — a full timeline.' },
        ],
      },
      how: {
        label: 'How it works',
        title: 'Three steps to peace of mind',
        steps: [
          { n: '01', title: 'Add a project', body: 'Create a project and attach monitors: site, database, server, port.' },
          { n: '02', title: 'The cloud checks', body: 'Every minute a cloud scheduler pings your services and builds history.' },
          { n: '03', title: 'Email on failure', body: 'Down or recovered — an email flies to the right address.' },
        ],
      },
      app: {
        label: 'Mobile app',
        title: 'Monitor on your terms — Sake is now in your pocket!',
        sub: 'A native app for iOS and Android. Cross-platform, so you can track everything in one place: project statuses in real time, incidents, tap-to-check and outage notifications.',
        features: [
          'Status of every project with a roll-up',
          'Latency sparkline and incident timeline',
          'Tap to check and pull-to-refresh',
          'App theme of your choice',
          'Support for three languages RU / PL / EN',
        ],
        ios: 'Download on the', iosName: 'App Store',
        android: 'Get it on', androidName: 'Google Play',
        soon: 'Soon',
        phoneTitle: 'My projects',
        rows: [
          { name: 'barabashflow.pl', kind: 'HTTP · 84 ms', status: 'up' },
          { name: 'Supabase · REST', kind: 'health · 96 ms', status: 'up' },
          { name: 'api.cert · SSL', kind: '14 days left', status: 'degraded' },
          { name: 'hetzner · :5432', kind: 'timeout', status: 'down' },
        ],
      },
      keepalive: {
        label: 'Supabase keep-alive',
        title: 'Free Supabase never falls asleep',
        sub: 'Supabase pauses free projects after 7 days of inactivity. Every 3 days SAKE makes a real API request with your project’s anon key — genuine activity, so the pause simply never happens.',
        features: [
          'Paste the anon / publishable key into a monitor — that’s the whole setup',
          'A real database request every 3 days — with a 2x margin',
          'No load: all other checks stay a light ping every 5 minutes',
          'Key revoked? The monitor turns yellow right away',
        ],
        note: 'Only the public anon key is needed (it’s already visible in your site’s code). Secret keys (service_role) are never used or stored.',
        card: {
          plan: 'Supabase · Free plan',
          active: 'Active',
          timeline: 'API request every 3 days',
          window: '7 days',
          ok: '200 OK',
          pause: 'Inactivity pause (7 days)',
          never: 'won’t happen',
        },
      },
      pricing: {
        label: 'Pricing',
        title: 'One simple plan',
        sub: '7 days free. No card. Then one plan that just makes sense.',
        monthly: 'Monthly', yearly: 'Yearly', save: '2 months free', perMonth: '/mo', perYear: '/yr',
        trial: '7 days free', trialNote: 'Full access for 7 days, no card. Cancel anytime.',
        pro: { name: 'Pro', badge: 'Everything included', features: ['Unlimited projects', 'Unlimited monitors', 'checks from 1 minute', 'SSL & keyword checks', 'multi-account & roles', 'email alerts', 'priority support'], cta: 'Start 7 days free' },
      },
      faq: {
        label: 'FAQ',
        title: 'The essentials, in short',
        items: [
          { q: 'What exactly can SAKE check?', a: 'HTTP(S), TCP port, SSL certificate, keyword presence and Supabase health. Soon — ICMP ping via an agent.' },
          { q: 'How often do checks run?', a: 'Every 5 minutes by default, from 1 minute per monitor on Pro.' },
          { q: 'What if SAKE itself goes down?', a: 'Checks and emails live in the cloud, independent of your and our office infrastructure — that is the “watchman more reliable than the watched” principle.' },
          { q: 'Who receives the emails?', a: 'The address attached to the project plus the emails of accounts with access — the list is editable.' },
          { q: 'How does the free trial work?', a: '7 days of full access, free and with no card. After that $7/mo or $75/yr. Cancel anytime.' },
        ],
      },
      finalCta: { title: 'Stop hearing about outages from your customers', sub: 'Bring up your first monitor in a couple of minutes.', button: 'Create account' },
      footer: { tagline: 'A cloud that never sleeps.', rights: 'Part of the barabashflow.pl ecosystem' },
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
      anonKey: 'Anon / publishable key (optional)',
      anonKeyHint: 'With a key the monitor makes a real API request to the database every 3 days — Supabase counts it as activity, so a free project is never auto-paused (keep-alive). Where to find the key: supabase.com/dashboard → your project → ⚙ Project Settings → API Keys → copy “anon public” (or the Publishable key).',
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
      roles: { moderator: 'Moderator', admin: 'Administrator', member: 'Client' },
      roleHint: 'Moderator sees everything, administrator — their own projects, client — only assigned ones.',
      empty: 'Only the administrator so far', assign: 'Project access', you: 'you',
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
