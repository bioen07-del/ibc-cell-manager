# Техническая спецификация IBC Cell Manager v0.04

## 1. Общая информация

**Название:** IBC Cell Manager  
**Версия:** 0.04  
**Назначение:** Система управления клеточными культурами, донорами, оборудованием и стандартными операционными процедурами (СОП)

### Технологический стек
- React 18 + TypeScript
- Vite (сборка)
- TailwindCSS (стилизация)
- localStorage (хранение данных)

---

## 2. Модели данных

### 2.1 Donor (Донор)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор |
| code | string | Код донора |
| fullName | string | ФИО |
| birthDate | string | Дата рождения |
| gender | string | Пол (male/female) |
| bloodType | string | Группа крови |
| rhFactor | string | Резус-фактор |
| status | string | Статус (active/inactive/archived) |
| medicalHistory | string | Медицинская история |
| createdAt | string | Дата создания |

**Связи:** Donor → Donation (1:N)

### 2.2 Donation (Донация)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор |
| donorId | number | ID донора |
| date | string | Дата донации |
| materialType | string | Тип материала |
| volume | number | Объём (мл) |
| status | string | Статус |
| notes | string | Примечания |

**Связи:** Donation → Donor (N:1), Donation → Culture (1:N)

### 2.3 Culture (Культура)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор |
| code | string | Код культуры |
| name | string | Название |
| donationId | number | ID донации |
| cellLine | string | Клеточная линия |
| passage | number | Номер пассажа |
| confluency | number | Конфлюэнтность (%) |
| viability | number | Жизнеспособность (%) |
| status | string | Статус |
| storageId | number | ID места хранения |
| createdAt | string | Дата создания |
| updatedAt | string | Дата обновления |

**Связи:** Culture → Donation (N:1), Culture → Storage (N:1), Culture → Task (1:N), Culture → Manipulation (1:N)

### 2.4 Task (Задача) — расширено в v0.04
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор |
| title | string | Заголовок |
| description | string | Описание |
| type | string | Тип задачи |
| priority | string | Приоритет (low/medium/high/urgent) |
| status | string | Статус (pending/in_progress/completed/cancelled) |
| dueDate | string | Срок выполнения |
| assignee | string | Исполнитель |
| cultureId | number | ID культуры (опц.) |
| equipmentId | number | ID оборудования (опц.) |
| **sopId** | number | **ID связанного СОП (новое в v0.04)** |
| **sopExecutionId** | number | **ID выполнения СОП (новое в v0.04)** |
| createdAt | string | Дата создания |
| completedAt | string | Дата завершения |

**Связи:** Task → Culture (N:1), Task → Equipment (N:1), Task → SOP (N:1), Task → SOPExecution (N:1)

### 2.5 SOP (Стандартная операционная процедура) — новое в v0.04
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор |
| code | string | Код СОП (SOP-XXX) |
| name | string | Название |
| category | string | Категория (thawing/passaging/freezing/quality/general) |
| manipulationType | string | Связь с типом манипуляции |
| description | string | Описание |
| durationMinutes | number | Длительность (мин) |
| safetyNotes | string | Меры безопасности |
| steps | SOPStep[] | Массив шагов |
| version | number | Версия СОП |
| parentVersionId | number | ID предыдущей версии |
| isLatest | boolean | Является последней версией |
| status | string | Статус (draft/active/archived) |
| createdAt | string | Дата создания |

**Структура SOPStep:**
| Поле | Тип | Описание |
|------|-----|----------|
| step | number | Номер шага |
| title | string | Название |
| description | string | Описание |
| duration | number | Длительность (мин) |
| checkpoint | boolean | Контрольная точка |

**Связи:** SOP → Task (1:N), SOP → SOPExecution (1:N)

### 2.6 SOPExecution (Выполнение СОП) — новое в v0.04
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор |
| sopId | number | ID СОП |
| cultureId | number | ID культуры |
| taskId | number | ID задачи |
| executor | string | Исполнитель |
| status | string | Статус (in_progress/completed/aborted) |
| startedAt | string | Время начала |
| completedAt | string | Время завершения |
| stepResults | boolean[] | Результаты шагов |
| notes | string | Примечания |

**Связи:** SOPExecution → SOP (N:1), SOPExecution → Culture (N:1), SOPExecution → Task (N:1)

### 2.7 Остальные модели (без изменений)
- **Storage** — места хранения
- **Equipment** — оборудование
- **Media** — питательные среды
- **Manipulation** — манипуляции с культурами
- **AuditLog** — журнал аудита
- **MasterBank** — мастер-банки
- **ContainerType** — типы контейнеров

---

## 3. Модули приложения

### Основные модули
| Модуль | Путь | Описание |
|--------|------|----------|
| Dashboard | / | Главная панель со статистикой |
| Donors | /donors | Управление донорами |
| Donations | /donations | Управление донациями |
| Cultures | /cultures | Управление культурами |
| Tasks | /tasks | Управление задачами |
| **SOPs** | **/sops** | **Управление СОП (новое в v0.04)** |
| Storage | /storage | Управление хранилищем |
| Equipment | /equipment | Управление оборудованием |
| Media | /media | Питательные среды |
| Calendar | /calendar | Календарь событий |
| Audit | /audit | Журнал аудита |

### Функционал модуля SOPs
- Создание и редактирование СОП
- Пошаговое выполнение протоколов
- Версионирование СОП
- Связь СОП с задачами и культурами
- Категоризация по типам работ
- Контрольные точки на шагах

---

## 4. Архитектура

### Хранение данных
Все данные хранятся в localStorage браузера в формате JSON. При первой загрузке инициализируются моковыми данными.

### Управление состоянием
Глобальное состояние управляется через React Context (AppContext). Используются хуки:
- useState — локальное состояние
- useCallback — мемоизация функций
- useMemo — оптимизация вычислений
- useRef — избежание лишних ре-рендеров

### Утилиты
- **dataMapper.ts** — конвертация ключей между snake_case и camelCase

---

## 5. Запуск проекта

```bash
cd v0.04
npm install
npm run dev
```

Сборка для продакшена:
```bash
npm run build
```

---

## 6. История версий

| Версия | Изменения |
|--------|-----------|
| 0.01 | Базовая версия с Supabase |
| 0.02 | Добавлены SOP, фидбек, улучшения |
| 0.03 | Переход на localStorage, удаление Supabase |
| **0.04** | **Возврат SOP + расширение Task** |
