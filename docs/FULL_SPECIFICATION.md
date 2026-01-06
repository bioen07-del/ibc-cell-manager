# Техническое задание: IBC Cell Manager v0.05

## 1. Общие сведения

**Название:** IBC Cell Manager — Информационная система управления банком клеточных продуктов  
**Версия:** 0.05  
**Технологический стек:**
- Frontend: React 18 + TypeScript + Vite
- UI: Tailwind CSS
- Хранение: localStorage (браузер)
- Маршрутизация: React Router DOM

---

## 2. Архитектура системы

### 2.1 Структура проекта
```
src/
├── App.tsx              # Главный компонент с маршрутизацией
├── main.tsx             # Точка входа
├── index.css            # Глобальные стили
├── context/
│   ├── AppContext.tsx   # Глобальное состояние данных
│   └── AuthContext.tsx  # Авторизация и управление пользователями
├── components/
│   ├── Layout.tsx       # Основной макет с сайдбаром
│   ├── LoginPage.tsx    # Страница входа
│   ├── FeedbackButton.tsx # Кнопка обратной связи
│   ├── HelpSystem.tsx   # Система справки
│   ├── QRScanner.tsx    # QR-сканер
│   └── UI.tsx           # Переиспользуемые UI-компоненты
├── modules/             # Функциональные модули
└── utils/               # Утилиты (pdf, dataMapper)
```

### 2.2 Контекст данных (AppContext)
Централизованное хранилище всех данных приложения с CRUD-операциями для каждой сущности.

---

## 3. Модель данных

### 3.1 Donor (Донор)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| code | string | Код донора (DON-YYYY-XXX) |
| full_name | string | ФИО |
| birth_date | string | Дата рождения |
| age | number | Возраст |
| gender | string | Пол |
| blood_type | string | Группа крови |
| rh_factor | string | Резус-фактор |
| phone | string | Телефон |
| email | string | Email |
| diagnosis | string | Диагноз |
| health_notes | string | Медицинские заметки |
| contract_number | string | Номер договора |
| contract_date | string | Дата договора |
| customer_name | string | ФИО заказчика |
| customer_phone | string | Телефон заказчика |
| customer_email | string | Email заказчика |
| status | string | Статус (active/inactive) |
| notes | string | Примечания |
| created_at | string | Дата создания |
| updated_at | string | Дата обновления |

### 3.2 Donation (Донация)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| donor_id | number | ID донора |
| date | string | Дата донации |
| material_type | string | Тип материала |
| tissue_type | string | Тип ткани |
| volume | number | Объём |
| status | string | Статус (quarantine/approved/rejected) |
| notes | string | Примечания |
| created_at | string | Дата создания |
| updated_at | string | Дата обновления |

### 3.3 Culture (Культура)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| donor_id | number | ID донора |
| donation_id | number | ID донации |
| name | string | Название |
| cell_type | string | Тип клеток |
| passage | number | Номер пассажа |
| status | string | Статус (in_work/frozen/disposed) |
| location | string | Местоположение |
| viability | number | Жизнеспособность (%) |
| cell_count | number | Количество клеток |
| container_type | string | Тип контейнера |
| container_count | number | Количество контейнеров |
| parent_culture_id | number | ID родительской культуры |
| sop_id | number | ID связанного SOP |
| created_at | string | Дата создания |
| updated_at | string | Дата обновления |

### 3.4 Task (Задача)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| title | string | Название |
| description | string | Описание |
| priority | string | Приоритет (low/medium/high/urgent) |
| status | string | Статус (new/in_progress/done/cancelled) |
| due_date | string | Срок выполнения |
| assigned_to | string | Исполнитель |
| culture_id | number | ID связанной культуры |
| sop_id | number | ID связанного SOP |
| sop_execution_id | number | ID выполнения SOP |
| created_at | string | Дата создания |

### 3.5 SOP (Стандартная операционная процедура)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| code | string | Код SOP (SOP-XXX) |
| name | string | Название |
| category | string | Категория (thawing/passaging/freezing/isolation/differentiation) |
| manipulation_type | string | Тип манипуляции |
| version | string | Версия (X.Y) |
| description | string | Описание |
| duration_minutes | number | Длительность (мин) |
| steps | SOPStep[] | Шаги протокола |
| safety_notes | string | Правила безопасности |
| status | string | Статус (draft/active/archived) |
| is_latest | boolean | Последняя версия |
| parent_version_id | number | ID предыдущей версии |
| created_by | string | Автор |
| approved_by | string | Кем утверждён |
| created_at | string | Дата создания |
| updated_at | string | Дата обновления |

### 3.6 SOPStep (Шаг SOP)
| Поле | Тип | Описание |
|------|-----|----------|
| step | number | Номер шага |
| title | string | Название |
| description | string | Описание |
| duration | number | Длительность (мин) |
| checkpoint | boolean | Критическая точка |

### 3.7 SOPExecution (Выполнение SOP)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| sop_id | number | ID SOP |
| culture_id | number | ID культуры |
| task_id | number | ID задачи |
| executor | string | Исполнитель |
| status | string | Статус (in_progress/completed) |
| started_at | string | Время начала |
| completed_at | string | Время завершения |
| step_results | boolean[] | Результаты шагов |
| notes | string | Примечания |

### 3.8 Equipment (Оборудование)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| name | string | Название |
| type | string | Тип (incubator/laminar_cabinet/centrifuge/microscope/cryostorage) |
| serial_number | string | Серийный номер |
| status | string | Статус (active/maintenance/inactive) |
| location | string | Местоположение |
| last_validation | string | Дата последней валидации |
| next_validation | string | Дата следующей валидации |
| created_at | string | Дата создания |
| updated_at | string | Дата обновления |

### 3.9 Media (Среды и реактивы)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| name | string | Название |
| manufacturer | string | Производитель |
| lot_number | string | Номер партии |
| category | string | Категория (base/additive/enzyme/other) |
| volume | number | Исходный объём |
| remaining_volume | number | Остаток |
| unit | string | Единица измерения |
| expiry_date | string | Срок годности |
| status | string | Статус (quarantine/approved/rejected/expired) |
| created_at | string | Дата создания |
| updated_at | string | Дата обновления |

### 3.10 ContainerType (Тип контейнера)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| name | string | Название |
| area | number | Площадь (см²) |
| volume_min | number | Мин. объём среды |
| volume_max | number | Макс. объём среды |
| volume_recommended | number | Рекомендуемый объём |
| category | string | Категория (flask/dish/plate/cryotube) |
| is_active | boolean | Активен |
| created_at | string | Дата создания |
| updated_at | string | Дата обновления |

### 3.11 MasterBank (Мастер-банк)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| culture_id | number | ID исходной культуры |
| donor_id | number | ID донора |
| cell_type | string | Тип клеток |
| passage_number | number | Номер пассажа |
| vials_count | number | Количество криопробирок |
| storage_location | string | Место хранения |
| freezing_date | string | Дата заморозки |
| viability | number | Жизнеспособность (%) |
| status | string | Статус (active/released/disposed) |
| created_at | string | Дата создания |
| updated_at | string | Дата обновления |

### 3.12 AutoTaskRule (Правило автозадач)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| name | string | Название правила |
| description | string | Описание |
| trigger | string | Триггер (culture_created/passage_done/freezing_done) |
| action | string | Действие |
| delay_days | number | Задержка (дни) |
| priority | string | Приоритет задачи |
| is_active | boolean | Активно |
| sop_id | number | ID связанного SOP |
| created_at | string | Дата создания |
| updated_at | string | Дата обновления |

### 3.13 Feedback (Обратная связь)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| user_id | string | ID пользователя |
| user_name | string | Имя пользователя |
| type | string | Тип (bug/feature/improvement) |
| title | string | Заголовок |
| description | string | Описание |
| screenshot_url | string | URL скриншота |
| status | string | Статус (new/reviewed/in_progress/resolved/rejected) |
| admin_comment | string | Комментарий админа |
| created_at | string | Дата создания |
| updated_at | string | Дата обновления |

### 3.14 AuditLog (Журнал аудита)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный ID |
| action | string | Действие |
| entity_type | string | Тип сущности |
| entity_id | string | ID сущности |
| user_name | string | Имя пользователя |
| details | any | Детали |
| created_at | string | Дата создания |

---

## 4. Система авторизации

### 4.1 Роли пользователей

| Роль | Описание | Права |
|------|----------|-------|
| admin | Администратор | Полный доступ, управление пользователями, управление SOP |
| operator | Оператор | Работа со всеми модулями, без управления пользователями |
| customer | Заказчик | Только просмотр своих данных (доноры, донации, культуры, хранилище) |
| doctor | Врач | Только просмотр (донации, мастер-банк, хранилище) |

### 4.2 Матрица доступа к модулям

| Модуль | admin | operator | customer | doctor |
|--------|-------|----------|----------|--------|
| dashboard | ✅ | ✅ | ✅ | ✅ |
| donors | ✅ | ✅ | ✅ | ❌ |
| donations | ✅ | ✅ | ✅ | ✅ |
| cultures | ✅ | ✅ | ✅ | ❌ |
| masterbanks | ✅ | ✅ | ✅ | ✅ |
| storage | ✅ | ✅ | ✅ | ✅ |
| releases | ✅ | ✅ | ❌ | ❌ |
| disposals | ✅ | ✅ | ❌ | ❌ |
| equipment | ✅ | ✅ | ❌ | ❌ |
| media | ✅ | ✅ | ❌ | ❌ |
| tasks | ✅ | ✅ | ❌ | ❌ |
| autotasks | ✅ | ✅ | ❌ | ❌ |
| sops | ✅ | ✅ | ❌ | ❌ |
| calendar | ✅ | ✅ | ❌ | ❌ |
| containers | ✅ | ✅ | ❌ | ❌ |
| audit | ✅ | ❌ | ❌ | ❌ |
| admin | ✅ | ❌ | ❌ | ❌ |

### 4.3 Тестовые пользователи

| Логин | Пароль | Роль |
|-------|--------|------|
| admin | admin123 | Администратор |
| operator | 123456 | Оператор |
| operator2 | 123456 | Оператор |
| customer1 | 123456 | Заказчик |
| doctor | 123456 | Врач |

---

## 5. Функциональные модули

### 5.1 Dashboard (Главная)
- Общая статистика: количество доноров, культур, задач
- Графики: жизнеспособность культур, конфлюентность
- Виджет срочных задач
- Уведомления о сроках валидации оборудования

### 5.2 Donors (Доноры)
- CRUD операции с донорами
- Карточка донора с полной информацией
- Связь с заказчиком (договор)
- История донаций

### 5.3 Donations (Донации)
- Регистрация донаций от доноров
- Статусы: карантин → одобрено/отклонено
- Создание первичной культуры из донации
- Списание среды при создании культуры
- **Выбор SOP при создании культуры** → запуск записи производства

### 5.4 Cultures (Культуры)
- Управление клеточными культурами
- Пассирование (создание дочерней культуры с увеличением номера пассажа)
- Привязка к контейнерам
- Статусы: в работе, заморожено, утилизировано
- Создание записи в мастер-банк

### 5.5 Master Banks (Мастер-банк)
- Криохранилище клеточных культур
- Учёт криопробирок
- Выдача и утилизация
- Разделение банка (для мастер-банка выбор культуры)

### 5.6 Storage (Хранение)
- Карта криохранилища
- Поиск по локации
- Учёт занятости ячеек

### 5.7 Releases (Выдача)
- Оформление выдачи материала
- Привязка к заказчику

### 5.8 Disposals (Утилизация)
- Учёт утилизированного материала
- Причины утилизации

### 5.9 Equipment (Оборудование)
- Учёт лабораторного оборудования
- Типы: инкубаторы, ламинары, центрифуги, микроскопы, криохранилища
- Контроль валидации (даты)
- Статусы: активно, на обслуживании, выведено

### 5.10 Media (Среды и реактивы)
- Учёт культуральных сред и добавок
- Контроль остатков
- Контроль сроков годности
- Статусы: карантин, одобрено, отклонено, истёк срок

### 5.11 Resources (Ресурсы)
- Объединённый вид оборудования и сред
- Фильтрация и поиск

### 5.12 Tasks (Задачи)
- Управление задачами
- Приоритеты: низкий, средний, высокий, срочный
- Статусы: новая, в работе, выполнена, отменена
- Привязка к культуре и SOP

### 5.13 AutoTasks (Автозадачи)
- Настройка правил автоматического создания задач
- Триггеры: создание культуры, пассирование, заморозка
- Задержка выполнения (дни)
- Привязка к SOP

### 5.14 SOPs (Протоколы)
- Создание и редактирование стандартных операционных процедур
- Пошаговое описание с временем выполнения
- Критические точки (checkpoint)
- Версионирование
- Категории: размораживание, пассирование, заморозка, выделение, дифференцировка
- Выполнение протокола с фиксацией результатов

#### Предустановленные SOPы:
1. **SOP-001** — Размораживание клеточной культуры (45 мин)
2. **SOP-002** — Пассирование клеточной культуры (60 мин)
3. **SOP-003** — Криоконсервация клеток (90 мин)
4. **SOP-004** — Выделение мононуклеаров на градиенте фиколла (120 мин)
5. **SOP-005** — Получение макрофагов из мононуклеаров (180 мин)
6. **SOP-006** — Первичная обработка жировой ткани SVF (150 мин)

### 5.15 Calendar (Календарь)
- Календарный вид задач
- Фильтрация по приоритету и статусу

### 5.16 Containers (Контейнеры)
- Справочник типов культуральной посуды
- Флаконы: T25, T75, T175
- Чашки Петри: 35, 60, 100 мм
- Планшеты: 6, 12, 24 лунки
- Криопробирки

### 5.17 Audit (Журнал аудита)
- Логирование всех действий пользователей
- Фильтрация по модулю, действию, пользователю

### 5.18 Admin (Администрирование)
- Управление пользователями
- Создание/редактирование/блокировка пользователей
- Журнал активности

### 5.19 Feedback (Обратная связь)
- Кнопка обратной связи в интерфейсе
- Типы: баг, предложение, улучшение
- Скриншот (опционально)
- Админ-панель для просмотра и обработки

---

## 6. UI/UX требования

### 6.1 Общие принципы
- Адаптивный дизайн (desktop-first)
- Единый стиль через Tailwind CSS
- Цветовая схема: синий (#3B82F6) как primary
- Иконки: Lucide React

### 6.2 Компоненты Layout
- **Сайдбар** — навигация по модулям (сворачиваемый)
- **Header** — поиск, профиль пользователя, уведомления
- **Версия** — отображение номера версии и даты сборки в сайдбаре

### 6.3 Страница входа
- Форма логин/пароль
- **Быстрые кнопки входа** для всех тестовых пользователей
- Обработка ошибок

### 6.4 Таблицы
- Сортировка по столбцам
- Фильтрация
- Пагинация
- Inline-редактирование

### 6.5 Модальные окна
- Создание/редактирование сущностей
- Подтверждение опасных действий

---

## 7. Технические требования

### 7.1 Хранение данных
- localStorage как основное хранилище
- Ключ: `ibc_cell_manager_data`
- Автосохранение при изменениях
- Дефолтные данные при первом запуске (SOPы, оборудование, среды, контейнеры)

### 7.2 Авторизация
- localStorage для сессии пользователя
- Ключи: `ibc_user`, `ibc_users`, `ibc_passwords`, `ibc_activity_logs`

### 7.3 Генерация ID
- Автоинкремент для каждой сущности
- Хранение nextIds в общем объекте данных

### 7.4 Производительность
- useMemo для оптимизации ререндеров
- useCallback для функций контекста

---

## 8. Деплой

### 8.1 Сборка
```bash
npm install
npx tsc && npx vite build
```

### 8.2 Результат
- Директория `dist/` с готовым SPA
- Статический хостинг (без серверной части)

---

## 9. Git-репозиторий

**URL:** https://github.com/bioen07-del/ibc-cell-manager

---

## 10. Текущий URL приложения

https://coovq0gkxljh.space.minimax.io

---

## 11. История версий

| Версия | Дата | Изменения |
|--------|------|-----------|
| 0.03 | — | Базовые модули, localStorage |
| 0.04 | — | Модуль SOP, связь SOP-задачи |
| 0.05 | 06.01.2026 | Быстрый вход, обратная связь, SOPы выделения, связь SOP-культуры, исправления багов |
