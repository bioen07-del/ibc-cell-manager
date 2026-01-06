// @ts-nocheck
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef, useMemo } from 'react';

// ===== ТИПЫ ДАННЫХ =====
export interface Donor {
  id: number;
  code: string;
  full_name?: string;
  birth_date?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  rh_factor?: string;
  phone?: string;
  email?: string;
  diagnosis?: string;
  health_notes?: string;
  contract_number?: string;
  contract_date?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: number;
  donor_id: number;
  date: string;
  material_type?: string;
  tissue_type?: string;
  volume?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Culture {
  id: number;
  donor_id?: number;
  donation_id?: number;
  name?: string;
  cell_type?: string;
  passage: number;
  status: string;
  location?: string;
  viability?: number;
  cell_count?: number;
  container_type?: string;
  container_count?: number;
  parent_culture_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: string;
  status: string;
  due_date: string;
  assigned_to?: string;
  culture_id?: number;
  sop_id?: number;
  sop_execution_id?: number;
  created_at: string;
}

export interface SOP {
  id: number;
  code: string;
  name: string;
  category?: string;
  manipulation_type?: string;
  version: string;
  description?: string;
  duration_minutes?: number;
  steps: SOPStep[];
  safety_notes?: string;
  status: string;
  is_latest: boolean;
  parent_version_id?: number;
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SOPStep {
  step: number;
  title: string;
  description: string;
  duration: number;
  checkpoint: boolean;
}

export interface SOPExecution {
  id: number;
  sop_id: number;
  culture_id?: number;
  task_id?: number;
  executor?: string;
  status: string;
  started_at: string;
  completed_at?: string;
  step_results?: boolean[];
  notes?: string;
}

export interface Equipment {
  id: number;
  name: string;
  type?: string;
  serial_number?: string;
  status: string;
  location?: string;
  last_validation?: string;
  next_validation?: string;
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: number;
  name: string;
  manufacturer?: string;
  lot_number?: string;
  category?: string;
  volume?: number;
  remaining_volume?: number;
  unit?: string;
  expiry_date?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ContainerType {
  id: number;
  name: string;
  area?: number;
  volume_min?: number;
  volume_max?: number;
  volume_recommended?: number;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MasterBank {
  id: number;
  culture_id?: number;
  donor_id?: number;
  cell_type?: string;
  passage_number?: number;
  vials_count: number;
  storage_location?: string;
  freezing_date?: string;
  viability?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id?: string;
  user_name?: string;
  details?: any;
  created_at: string;
}

export interface AutoTaskRule {
  id: number;
  name: string;
  description?: string;
  trigger: string;
  action: string;
  delay_days: number;
  priority: string;
  is_active: boolean;
  sop_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: number;
  user_id?: string;
  user_name?: string;
  type: 'bug' | 'feature' | 'improvement';
  title: string;
  description?: string;
  screenshot_url?: string;
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'rejected';
  admin_comment?: string;
  created_at: string;
  updated_at: string;
}

// ===== ЛОКАЛЬНОЕ ХРАНИЛИЩЕ =====
const STORAGE_KEY = 'ibc_cell_manager_data';

interface StorageData {
  donors: Donor[];
  donations: Donation[];
  cultures: Culture[];
  tasks: Task[];
  sops: SOP[];
  sopExecutions: SOPExecution[];
  equipment: Equipment[];
  media: Media[];
  containerTypes: ContainerType[];
  masterBanks: MasterBank[];
  auditLogs: AuditLog[];
  autoTaskRules: AutoTaskRule[];
  feedbacks: Feedback[];
  nextIds: { [key: string]: number };
}

const now = () => new Date().toISOString();

const getDefaultData = (): StorageData => ({
  donors: [],
  donations: [],
  cultures: [],
  tasks: [],
  sops: [
    {
      id: 1,
      code: 'SOP-001',
      name: 'Размораживание клеточной культуры',
      category: 'thawing',
      manipulation_type: 'thawing',
      version: '1.0',
      description: 'Стандартный протокол размораживания криоконсервированных клеток',
      duration_minutes: 45,
      steps: [
        { step: 1, title: 'Подготовка рабочего места', description: 'Обработать ламинарный шкаф, подготовить среду и расходники', duration: 10, checkpoint: false },
        { step: 2, title: 'Размораживание криопробирки', description: 'Извлечь криопробирку и разморозить на водяной бане при 37°C', duration: 5, checkpoint: true },
        { step: 3, title: 'Перенос в среду', description: 'Перенести клеточную суспензию в пробирку с подогретой средой', duration: 5, checkpoint: false },
        { step: 4, title: 'Центрифугирование', description: 'Центрифугировать 5 минут при 300g', duration: 10, checkpoint: false },
        { step: 5, title: 'Ресуспендирование', description: 'Удалить супернатант, ресуспендировать осадок в свежей среде', duration: 5, checkpoint: true },
        { step: 6, title: 'Посев', description: 'Перенести клетки в культуральный флакон', duration: 10, checkpoint: false }
      ],
      safety_notes: 'Работать в перчатках. Использовать защитные очки при работе с жидким азотом.',
      status: 'active',
      is_latest: true,
      created_at: now(),
      updated_at: now()
    },
    {
      id: 2,
      code: 'SOP-002',
      name: 'Пассирование клеточной культуры',
      category: 'passaging',
      manipulation_type: 'passaging',
      version: '1.0',
      description: 'Протокол субкультивирования адгезивных клеток',
      duration_minutes: 60,
      steps: [
        { step: 1, title: 'Оценка культуры', description: 'Оценить конфлюентность и состояние клеток под микроскопом', duration: 5, checkpoint: true },
        { step: 2, title: 'Промывка PBS', description: 'Удалить старую среду, промыть монослой PBS', duration: 5, checkpoint: false },
        { step: 3, title: 'Трипсинизация', description: 'Добавить трипсин-ЭДТА, инкубировать до открепления клеток', duration: 10, checkpoint: true },
        { step: 4, title: 'Нейтрализация трипсина', description: 'Добавить среду с сывороткой для остановки действия трипсина', duration: 5, checkpoint: false },
        { step: 5, title: 'Подсчёт клеток', description: 'Отобрать аликвоту и подсчитать клетки', duration: 10, checkpoint: true },
        { step: 6, title: 'Посев', description: 'Рассеять клетки в новые флаконы с заданной плотностью', duration: 15, checkpoint: false },
        { step: 7, title: 'Документирование', description: 'Записать данные пассажа в журнал', duration: 10, checkpoint: false }
      ],
      safety_notes: 'Работать в ламинарном шкафу. Контролировать время трипсинизации.',
      status: 'active',
      is_latest: true,
      created_at: now(),
      updated_at: now()
    },
    {
      id: 3,
      code: 'SOP-003',
      name: 'Криоконсервация клеток',
      category: 'freezing',
      manipulation_type: 'freezing',
      version: '1.0',
      description: 'Протокол заморозки клеточной культуры для долгосрочного хранения',
      duration_minutes: 90,
      steps: [
        { step: 1, title: 'Подготовка криосреды', description: 'Приготовить криопротекторную среду (10% ДМСО)', duration: 10, checkpoint: true },
        { step: 2, title: 'Сбор клеток', description: 'Снять клетки с флакона как при пассировании', duration: 20, checkpoint: false },
        { step: 3, title: 'Подсчёт и оценка', description: 'Подсчитать клетки, оценить жизнеспособность', duration: 15, checkpoint: true },
        { step: 4, title: 'Ресуспендирование', description: 'Ресуспендировать клетки в криосреде', duration: 10, checkpoint: false },
        { step: 5, title: 'Аликвотирование', description: 'Разлить суспензию по криопробиркам', duration: 15, checkpoint: true },
        { step: 6, title: 'Заморозка', description: 'Поместить в контейнер для контролируемого замораживания', duration: 10, checkpoint: false },
        { step: 7, title: 'Перенос в хранилище', description: 'Через 24ч перенести в жидкий азот', duration: 10, checkpoint: true }
      ],
      safety_notes: 'ДМСО токсичен — работать быстро. Использовать защиту при работе с жидким азотом.',
      status: 'active',
      is_latest: true,
      created_at: now(),
      updated_at: now()
    },
    {
      id: 4,
      code: 'SOP-004',
      name: 'Выделение мононуклеаров на градиенте фиколла',
      category: 'isolation',
      manipulation_type: 'primary_processing',
      version: '1.0',
      description: 'Протокол выделения мононуклеарных клеток (PBMC) из периферической крови методом градиентного центрифугирования на Ficoll-Paque',
      duration_minutes: 120,
      steps: [
        { step: 1, title: 'Подготовка материалов', description: 'Подготовить фиколл (плотность 1.077), PBS, пробирки 50мл, пипетки', duration: 10, checkpoint: false },
        { step: 2, title: 'Разведение крови', description: 'Развести кровь PBS в соотношении 1:1', duration: 5, checkpoint: true },
        { step: 3, title: 'Наслоение на фиколл', description: 'Аккуратно наслоить разведённую кровь на фиколл (соотношение кровь:фиколл = 2:1)', duration: 10, checkpoint: true },
        { step: 4, title: 'Центрифугирование', description: 'Центрифугировать 30 мин при 400g без торможения', duration: 35, checkpoint: true },
        { step: 5, title: 'Сбор интерфейса', description: 'Собрать кольцо мононуклеаров на границе фаз', duration: 10, checkpoint: true },
        { step: 6, title: 'Отмывка 1', description: 'Добавить PBS, центрифугировать 10 мин при 300g', duration: 15, checkpoint: false },
        { step: 7, title: 'Отмывка 2', description: 'Повторная отмывка PBS, центрифугирование 10 мин при 200g', duration: 15, checkpoint: false },
        { step: 8, title: 'Подсчёт клеток', description: 'Ресуспендировать в PBS, подсчитать клетки, оценить жизнеспособность', duration: 15, checkpoint: true },
        { step: 9, title: 'Документирование', description: 'Записать выход клеток, жизнеспособность, примечания', duration: 5, checkpoint: false }
      ],
      safety_notes: 'Работать с кровью в защитных перчатках и очках. Соблюдать правила биобезопасности.',
      status: 'active',
      is_latest: true,
      created_at: now(),
      updated_at: now()
    },
    {
      id: 5,
      code: 'SOP-005',
      name: 'Получение макрофагов из мононуклеаров',
      category: 'differentiation',
      manipulation_type: 'primary_processing',
      version: '1.0',
      description: 'Протокол дифференцировки моноцитов в макрофаги методом адгезии и стимуляции M-CSF',
      duration_minutes: 180,
      steps: [
        { step: 1, title: 'Подготовка среды', description: 'Приготовить полную среду RPMI-1640 с 10% FBS, L-глутамином и антибиотиками', duration: 10, checkpoint: true },
        { step: 2, title: 'Посев мононуклеаров', description: 'Посеять PBMC в концентрации 2×10⁶/мл на культуральные чашки', duration: 15, checkpoint: true },
        { step: 3, title: 'Адгезия моноцитов', description: 'Инкубировать 2-3 часа при 37°C для прикрепления моноцитов', duration: 180, checkpoint: true },
        { step: 4, title: 'Удаление неприлипших', description: 'Осторожно удалить суспензию с неприлипшими клетками, промыть PBS', duration: 10, checkpoint: false },
        { step: 5, title: 'Добавление дифференцировочной среды', description: 'Добавить среду с M-CSF (50 нг/мл) или GM-CSF', duration: 5, checkpoint: true },
        { step: 6, title: 'Культивирование', description: 'Инкубировать 5-7 дней, меняя среду каждые 2-3 дня', duration: 10, checkpoint: false },
        { step: 7, title: 'Оценка дифференцировки', description: 'Оценить морфологию макрофагов под микроскопом, при необходимости провести фенотипирование', duration: 20, checkpoint: true },
        { step: 8, title: 'Документирование', description: 'Записать характеристики полученных макрофагов', duration: 10, checkpoint: false }
      ],
      safety_notes: 'Цитокины хранить согласно инструкции. Работать в стерильных условиях.',
      status: 'active',
      is_latest: true,
      created_at: now(),
      updated_at: now()
    },
    {
      id: 6,
      code: 'SOP-006',
      name: 'Первичная обработка жировой ткани (SVF)',
      category: 'isolation',
      manipulation_type: 'primary_processing',
      version: '1.0',
      description: 'Протокол получения стромально-васкулярной фракции (SVF) из липоаспирата ферментативным методом',
      duration_minutes: 150,
      steps: [
        { step: 1, title: 'Промывка липоаспирата', description: 'Промыть липоаспират PBS 3-5 раз до прозрачного супернатанта', duration: 20, checkpoint: true },
        { step: 2, title: 'Приготовление коллагеназы', description: 'Приготовить раствор коллагеназы I типа (0.1-0.2%)', duration: 10, checkpoint: true },
        { step: 3, title: 'Ферментация', description: 'Добавить коллагеназу к жировой ткани (1:1), инкубировать 30-60 мин при 37°C с перемешиванием', duration: 60, checkpoint: true },
        { step: 4, title: 'Нейтрализация', description: 'Добавить равный объём среды с сывороткой', duration: 5, checkpoint: false },
        { step: 5, title: 'Центрифугирование', description: 'Центрифугировать 10 мин при 300g', duration: 15, checkpoint: true },
        { step: 6, title: 'Сбор SVF', description: 'Удалить жир и супернатант, собрать клеточный осадок (SVF)', duration: 10, checkpoint: true },
        { step: 7, title: 'Фильтрация', description: 'Профильтровать через сито 100 мкм', duration: 5, checkpoint: false },
        { step: 8, title: 'Отмывка', description: 'Отмыть PBS, центрифугировать', duration: 10, checkpoint: false },
        { step: 9, title: 'Подсчёт и посев', description: 'Подсчитать клетки, оценить жизнеспособность, посеять в культуральную посуду', duration: 15, checkpoint: true }
      ],
      safety_notes: 'Коллагеназа — раздражитель. Работать в перчатках. Соблюдать температурный режим инкубации.',
      status: 'active',
      is_latest: true,
      created_at: now(),
      updated_at: now()
    }
  ],
  sopExecutions: [],
  equipment: [
    { id: 1, name: 'Инкубатор CO2 Thermo Scientific', type: 'incubator', serial_number: 'INC-001', status: 'active', location: 'Лаборатория 1', last_validation: '2025-12-01', next_validation: '2026-06-01', created_at: now(), updated_at: now() },
    { id: 2, name: 'Ламинарный шкаф БАВ-1', type: 'laminar_cabinet', serial_number: 'LAM-001', status: 'active', location: 'Лаборатория 1', last_validation: '2025-11-15', next_validation: '2026-05-15', created_at: now(), updated_at: now() },
    { id: 3, name: 'Центрифуга Eppendorf 5810R', type: 'centrifuge', serial_number: 'CEN-001', status: 'active', location: 'Лаборатория 1', last_validation: '2025-10-20', next_validation: '2026-04-20', created_at: now(), updated_at: now() },
    { id: 4, name: 'Микроскоп инвертированный Olympus', type: 'microscope', serial_number: 'MIC-001', status: 'active', location: 'Лаборатория 1', last_validation: '2025-09-10', next_validation: '2026-03-10', created_at: now(), updated_at: now() },
    { id: 5, name: 'Криохранилище MVE', type: 'cryostorage', serial_number: 'CRY-001', status: 'active', location: 'Криобанк', last_validation: '2025-12-15', next_validation: '2026-06-15', created_at: now(), updated_at: now() },
  ],
  media: [
    { id: 1, name: 'DMEM/F12', manufacturer: 'Gibco', lot_number: 'LOT-2026-001', category: 'base', volume: 500, remaining_volume: 500, unit: 'мл', expiry_date: '2026-12-31', status: 'approved', created_at: now(), updated_at: now() },
    { id: 2, name: 'FBS (сыворотка)', manufacturer: 'HyClone', lot_number: 'LOT-2026-002', category: 'additive', volume: 100, remaining_volume: 100, unit: 'мл', expiry_date: '2026-06-30', status: 'approved', created_at: now(), updated_at: now() },
    { id: 3, name: 'Пенициллин-Стрептомицин', manufacturer: 'Gibco', lot_number: 'LOT-2026-003', category: 'additive', volume: 100, remaining_volume: 100, unit: 'мл', expiry_date: '2026-09-30', status: 'approved', created_at: now(), updated_at: now() },
    { id: 4, name: 'Трипсин-ЭДТА 0.25%', manufacturer: 'Gibco', lot_number: 'LOT-2026-004', category: 'enzyme', volume: 100, remaining_volume: 100, unit: 'мл', expiry_date: '2026-08-31', status: 'approved', created_at: now(), updated_at: now() },
    { id: 5, name: 'PBS (фосфатный буфер)', manufacturer: 'Gibco', lot_number: 'LOT-2026-005', category: 'other', volume: 500, remaining_volume: 500, unit: 'мл', expiry_date: '2027-01-31', status: 'approved', created_at: now(), updated_at: now() },
  ],
  containerTypes: [
    { id: 1, name: 'Флакон T25', area: 25, volume_min: 3, volume_max: 5, volume_recommended: 4, category: 'flask', is_active: true, created_at: now(), updated_at: now() },
    { id: 2, name: 'Флакон T75', area: 75, volume_min: 8, volume_max: 15, volume_recommended: 12, category: 'flask', is_active: true, created_at: now(), updated_at: now() },
    { id: 3, name: 'Флакон T175', area: 175, volume_min: 25, volume_max: 50, volume_recommended: 35, category: 'flask', is_active: true, created_at: now(), updated_at: now() },
    { id: 4, name: 'Чашка Петри 35мм', area: 9.6, volume_min: 1, volume_max: 2, volume_recommended: 1.5, category: 'dish', is_active: true, created_at: now(), updated_at: now() },
    { id: 5, name: 'Чашка Петри 60мм', area: 21, volume_min: 2, volume_max: 4, volume_recommended: 3, category: 'dish', is_active: true, created_at: now(), updated_at: now() },
    { id: 6, name: 'Чашка Петри 100мм', area: 56, volume_min: 8, volume_max: 12, volume_recommended: 10, category: 'dish', is_active: true, created_at: now(), updated_at: now() },
    { id: 7, name: '6-луночный планшет', area: 9.5, volume_min: 1, volume_max: 3, volume_recommended: 2, category: 'plate', is_active: true, created_at: now(), updated_at: now() },
    { id: 8, name: '12-луночный планшет', area: 3.8, volume_min: 0.5, volume_max: 1.5, volume_recommended: 1, category: 'plate', is_active: true, created_at: now(), updated_at: now() },
    { id: 9, name: '24-луночный планшет', area: 1.9, volume_min: 0.3, volume_max: 1, volume_recommended: 0.5, category: 'plate', is_active: true, created_at: now(), updated_at: now() },
    { id: 10, name: 'Криопробирка 1.8мл', area: 0, volume_min: 0.5, volume_max: 1.8, volume_recommended: 1, category: 'cryotube', is_active: true, created_at: now(), updated_at: now() },
  ],
  masterBanks: [],
  auditLogs: [],
  autoTaskRules: [],
  feedbacks: [],
  nextIds: {
    donors: 1, donations: 1, cultures: 1, tasks: 1, sops: 7, sopExecutions: 1,
    equipment: 6, media: 6, containerTypes: 11, masterBanks: 1, auditLogs: 1, autoTaskRules: 1, feedbacks: 1
  }
});

const loadFromStorage = (): StorageData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const defaults = getDefaultData();
      return {
        ...defaults,
        ...parsed,
        sops: (parsed.sops && parsed.sops.length > 0) ? parsed.sops : defaults.sops,
        sopExecutions: parsed.sopExecutions || [],
        equipment: (parsed.equipment && parsed.equipment.length > 0) ? parsed.equipment : defaults.equipment,
        media: (parsed.media && parsed.media.length > 0) ? parsed.media : defaults.media,
        containerTypes: (parsed.containerTypes && parsed.containerTypes.length > 0) ? parsed.containerTypes : defaults.containerTypes,
        nextIds: {
          ...defaults.nextIds,
          ...parsed.nextIds,
          sops: Math.max(parsed.nextIds?.sops || 1, defaults.nextIds.sops),
          sopExecutions: Math.max(parsed.nextIds?.sopExecutions || 1, 1),
          equipment: Math.max(parsed.nextIds?.equipment || 1, defaults.nextIds.equipment),
          media: Math.max(parsed.nextIds?.media || 1, defaults.nextIds.media),
          containerTypes: Math.max(parsed.nextIds?.containerTypes || 1, defaults.nextIds.containerTypes),
        }
      };
    }
  } catch (e) {
    console.error('Error loading from localStorage:', e);
  }
  return getDefaultData();
};

const saveToStorage = (data: StorageData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
};

// ===== КОНТЕКСТ =====
interface AppContextType {
  donors: Donor[];
  donations: Donation[];
  cultures: Culture[];
  tasks: Task[];
  sops: SOP[];
  sopExecutions: SOPExecution[];
  equipment: Equipment[];
  media: Media[];
  containerTypes: ContainerType[];
  masterBanks: MasterBank[];
  auditLogs: AuditLog[];
  autoTaskRules: AutoTaskRule[];
  loading: boolean;
  
  refreshData: () => void;
  
  addDonor: (data: Partial<Donor>) => Donor;
  updateDonor: (id: number, data: Partial<Donor>) => void;
  deleteDonor: (id: number) => void;
  getDonorById: (id: number) => Donor | undefined;
  
  addDonation: (data: Partial<Donation>) => Donation;
  updateDonation: (id: number, data: Partial<Donation>) => void;
  deleteDonation: (id: number) => void;
  
  addCulture: (data: Partial<Culture>) => Culture;
  updateCulture: (id: number, data: Partial<Culture>) => void;
  getCultureById: (id: number) => Culture | undefined;
  passageCulture: (cultureId: number) => Culture;
  
  addTask: (data: Partial<Task>) => Task;
  updateTask: (id: number, data: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  
  addSOP: (data: Partial<SOP>) => SOP;
  updateSOP: (id: number, data: Partial<SOP>) => void;
  deleteSOP: (id: number) => void;
  createSOPVersion: (sopId: number, changes?: Partial<SOP>) => SOP;
  startSOPExecution: (sopId: number, cultureId?: number, taskId?: number) => SOPExecution;
  completeSOPExecution: (executionId: number, results: { steps: boolean[] }) => void;
  
  addEquipment: (data: Partial<Equipment>) => Equipment;
  updateEquipment: (id: number, data: Partial<Equipment>) => void;
  
  addMedia: (data: Partial<Media>) => Media;
  updateMedia: (id: number, data: Partial<Media>) => void;
  
  addContainerType: (data: Partial<ContainerType>) => ContainerType;
  updateContainerType: (id: number, data: Partial<ContainerType>) => void;
  deleteContainerType: (id: number) => void;
  
  addMasterBank: (data: Partial<MasterBank>) => MasterBank;
  updateMasterBank: (id: number, data: Partial<MasterBank>) => void;
  
  addAutoTaskRule: (data: Partial<AutoTaskRule>) => AutoTaskRule;
  updateAutoTaskRule: (id: number, data: Partial<AutoTaskRule>) => void;
  deleteAutoTaskRule: (id: number) => void;
  triggerAutoTasks: (trigger: string, cultureId: number) => void;
  
  addAuditLog: (action: string, entityType: string, entityId?: string, details?: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<StorageData>(getDefaultData());
  const [loading, setLoading] = useState(true);
  
  const nextIdsRef = useRef<{ [key: string]: number }>({
    donors: 1, donations: 1, cultures: 1, tasks: 1, sops: 4, sopExecutions: 1,
    equipment: 1, media: 1, containerTypes: 1, masterBanks: 1, auditLogs: 1, autoTaskRules: 1
  });

  const getNextId = (entity: string): number => {
    const id = nextIdsRef.current[entity] || 1;
    nextIdsRef.current[entity] = id + 1;
    return id;
  };

  useEffect(() => {
    const loaded = loadFromStorage();
    setData(loaded);
    nextIdsRef.current = { ...loaded.nextIds };
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      const toSave = { ...data, nextIds: nextIdsRef.current };
      saveToStorage(toSave);
    }
  }, [data, loading]);

  const refreshData = useCallback(() => {
    const loaded = loadFromStorage();
    setData(loaded);
    nextIdsRef.current = { ...loaded.nextIds };
  }, []);

  // ===== DONORS =====
  const addDonor = useCallback((donorData: Partial<Donor>): Donor => {
    const id = getNextId('donors');
    const newDonor: Donor = {
      ...donorData,
      id,
      code: donorData.code || `DON-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`,
      status: donorData.status || 'active',
      created_at: now(),
      updated_at: now()
    } as Donor;
    setData(prev => ({ ...prev, donors: [newDonor, ...prev.donors] }));
    return newDonor;
  }, []);

  const updateDonor = useCallback((id: number, updates: Partial<Donor>) => {
    setData(prev => ({
      ...prev,
      donors: prev.donors.map(d => d.id === id ? { ...d, ...updates, updated_at: now() } : d)
    }));
  }, []);

  const deleteDonor = useCallback((id: number) => {
    setData(prev => ({ ...prev, donors: prev.donors.filter(d => d.id !== id) }));
  }, []);

  const getDonorById = useCallback((id: number) => data.donors.find(d => d.id === id), [data.donors]);

  // ===== DONATIONS =====
  const addDonation = useCallback((donationData: Partial<Donation>): Donation => {
    const id = getNextId('donations');
    const newDonation: Donation = {
      ...donationData,
      id,
      status: donationData.status || 'quarantine',
      created_at: now(),
      updated_at: now()
    } as Donation;
    setData(prev => ({ ...prev, donations: [newDonation, ...prev.donations] }));
    return newDonation;
  }, []);

  const updateDonation = useCallback((id: number, updates: Partial<Donation>) => {
    setData(prev => ({
      ...prev,
      donations: prev.donations.map(d => d.id === id ? { ...d, ...updates, updated_at: now() } : d)
    }));
  }, []);

  const deleteDonation = useCallback((id: number) => {
    setData(prev => ({ ...prev, donations: prev.donations.filter(d => d.id !== id) }));
  }, []);

  // ===== CULTURES =====
  const addCulture = useCallback((cultureData: Partial<Culture>): Culture => {
    const id = getNextId('cultures');
    const newCulture: Culture = {
      ...cultureData,
      id,
      passage: cultureData.passage || 0,
      status: cultureData.status || 'in_work',
      created_at: now(),
      updated_at: now()
    } as Culture;
    setData(prev => ({ ...prev, cultures: [newCulture, ...prev.cultures] }));
    return newCulture;
  }, []);

  const updateCulture = useCallback((id: number, updates: Partial<Culture>) => {
    setData(prev => ({
      ...prev,
      cultures: prev.cultures.map(c => c.id === id ? { ...c, ...updates, updated_at: now() } : c)
    }));
  }, []);

  const getCultureById = useCallback((id: number) => data.cultures.find(c => c.id === id), [data.cultures]);

  const passageCulture = useCallback((cultureId: number): Culture => {
    const parent = data.cultures.find(c => c.id === cultureId);
    if (!parent) throw new Error('Culture not found');
    const id = getNextId('cultures');
    const newCulture: Culture = {
      donor_id: parent.donor_id,
      donation_id: parent.donation_id,
      cell_type: parent.cell_type,
      passage: (parent.passage || 0) + 1,
      parent_culture_id: cultureId,
      status: 'in_work',
      id,
      created_at: now(),
      updated_at: now()
    } as Culture;
    setData(prev => ({ ...prev, cultures: [newCulture, ...prev.cultures] }));
    return newCulture;
  }, [data.cultures]);

  // ===== TASKS =====
  const addTask = useCallback((taskData: Partial<Task>): Task => {
    const id = getNextId('tasks');
    const newTask: Task = {
      ...taskData,
      id,
      status: taskData.status || 'new',
      priority: taskData.priority || 'medium',
      created_at: now()
    } as Task;
    setData(prev => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
    return newTask;
  }, []);

  const updateTask = useCallback((id: number, updates: Partial<Task>) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  }, []);

  const deleteTask = useCallback((id: number) => {
    setData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  }, []);

  // ===== SOPs =====
  const addSOP = useCallback((sopData: Partial<SOP>): SOP => {
    const id = getNextId('sops');
    const newSOP: SOP = {
      ...sopData,
      id,
      code: sopData.code || `SOP-${String(id).padStart(3, '0')}`,
      version: sopData.version || '1.0',
      status: sopData.status || 'draft',
      is_latest: true,
      steps: sopData.steps || [],
      created_at: now(),
      updated_at: now()
    } as SOP;
    setData(prev => ({ ...prev, sops: [newSOP, ...prev.sops] }));
    return newSOP;
  }, []);

  const updateSOP = useCallback((id: number, updates: Partial<SOP>) => {
    setData(prev => ({
      ...prev,
      sops: prev.sops.map(s => s.id === id ? { ...s, ...updates, updated_at: now() } : s)
    }));
  }, []);

  const deleteSOP = useCallback((id: number) => {
    setData(prev => ({ ...prev, sops: prev.sops.filter(s => s.id !== id) }));
  }, []);

  const createSOPVersion = useCallback((sopId: number, changes?: Partial<SOP>): SOP => {
    const parent = data.sops.find(s => s.id === sopId);
    if (!parent) throw new Error('SOP not found');
    
    // Mark old version as not latest
    setData(prev => ({
      ...prev,
      sops: prev.sops.map(s => s.id === sopId ? { ...s, is_latest: false } : s)
    }));
    
    const id = getNextId('sops');
    const versionParts = parent.version.split('.');
    const newVersion = `${versionParts[0]}.${parseInt(versionParts[1] || '0') + 1}`;
    
    const newSOP: SOP = {
      ...parent,
      ...changes,
      id,
      version: newVersion,
      parent_version_id: sopId,
      is_latest: true,
      created_at: now(),
      updated_at: now()
    };
    setData(prev => ({ ...prev, sops: [newSOP, ...prev.sops] }));
    return newSOP;
  }, [data.sops]);

  const startSOPExecution = useCallback((sopId: number, cultureId?: number, taskId?: number): SOPExecution => {
    const id = getNextId('sopExecutions');
    const newExec: SOPExecution = {
      id,
      sop_id: sopId,
      culture_id: cultureId,
      task_id: taskId,
      status: 'in_progress',
      started_at: now(),
      step_results: []
    };
    setData(prev => ({ ...prev, sopExecutions: [newExec, ...prev.sopExecutions] }));
    return newExec;
  }, []);

  const completeSOPExecution = useCallback((executionId: number, results: { steps: boolean[] }) => {
    setData(prev => ({
      ...prev,
      sopExecutions: prev.sopExecutions.map(e => 
        e.id === executionId 
          ? { ...e, status: 'completed', completed_at: now(), step_results: results.steps }
          : e
      )
    }));
  }, []);

  // ===== EQUIPMENT =====
  const addEquipment = useCallback((eqData: Partial<Equipment>): Equipment => {
    const id = getNextId('equipment');
    const newEq: Equipment = {
      ...eqData,
      id,
      status: eqData.status || 'active',
      created_at: now(),
      updated_at: now()
    } as Equipment;
    setData(prev => ({ ...prev, equipment: [newEq, ...prev.equipment] }));
    return newEq;
  }, []);

  const updateEquipment = useCallback((id: number, updates: Partial<Equipment>) => {
    setData(prev => ({
      ...prev,
      equipment: prev.equipment.map(e => e.id === id ? { ...e, ...updates, updated_at: now() } : e)
    }));
  }, []);

  // ===== MEDIA =====
  const addMedia = useCallback((mediaData: Partial<Media>): Media => {
    const id = getNextId('media');
    const newMedia: Media = {
      ...mediaData,
      id,
      status: mediaData.status || 'quarantine',
      created_at: now(),
      updated_at: now()
    } as Media;
    setData(prev => ({ ...prev, media: [newMedia, ...prev.media] }));
    return newMedia;
  }, []);

  const updateMedia = useCallback((id: number, updates: Partial<Media>) => {
    setData(prev => ({
      ...prev,
      media: prev.media.map(m => m.id === id ? { ...m, ...updates, updated_at: now() } : m)
    }));
  }, []);

  // ===== CONTAINER TYPES =====
  const addContainerType = useCallback((ctData: Partial<ContainerType>): ContainerType => {
    const id = getNextId('containerTypes');
    const newCt: ContainerType = {
      ...ctData,
      id,
      is_active: ctData.is_active ?? true,
      created_at: now(),
      updated_at: now()
    } as ContainerType;
    setData(prev => ({ ...prev, containerTypes: [newCt, ...prev.containerTypes] }));
    return newCt;
  }, []);

  const updateContainerType = useCallback((id: number, updates: Partial<ContainerType>) => {
    setData(prev => ({
      ...prev,
      containerTypes: prev.containerTypes.map(c => c.id === id ? { ...c, ...updates, updated_at: now() } : c)
    }));
  }, []);

  const deleteContainerType = useCallback((id: number) => {
    setData(prev => ({ ...prev, containerTypes: prev.containerTypes.filter(c => c.id !== id) }));
  }, []);

  // ===== MASTER BANKS =====
  const addMasterBank = useCallback((mbData: Partial<MasterBank>): MasterBank => {
    const id = getNextId('masterBanks');
    const newMb: MasterBank = {
      ...mbData,
      id,
      status: mbData.status || 'active',
      created_at: now(),
      updated_at: now()
    } as MasterBank;
    setData(prev => ({ ...prev, masterBanks: [newMb, ...prev.masterBanks] }));
    return newMb;
  }, []);

  const updateMasterBank = useCallback((id: number, updates: Partial<MasterBank>) => {
    setData(prev => ({
      ...prev,
      masterBanks: prev.masterBanks.map(m => m.id === id ? { ...m, ...updates, updated_at: now() } : m)
    }));
  }, []);

  // ===== AUTO TASK RULES =====
  const addAutoTaskRule = useCallback((ruleData: Partial<AutoTaskRule>): AutoTaskRule => {
    const id = getNextId('autoTaskRules');
    const newRule: AutoTaskRule = {
      ...ruleData,
      id,
      is_active: ruleData.is_active ?? true,
      delay_days: ruleData.delay_days || 0,
      priority: ruleData.priority || 'medium',
      created_at: now(),
      updated_at: now()
    } as AutoTaskRule;
    setData(prev => ({ ...prev, autoTaskRules: [newRule, ...prev.autoTaskRules] }));
    return newRule;
  }, []);

  const updateAutoTaskRule = useCallback((id: number, updates: Partial<AutoTaskRule>) => {
    setData(prev => ({
      ...prev,
      autoTaskRules: prev.autoTaskRules.map(r => r.id === id ? { ...r, ...updates, updated_at: now() } : r)
    }));
  }, []);

  const deleteAutoTaskRule = useCallback((id: number) => {
    setData(prev => ({ ...prev, autoTaskRules: prev.autoTaskRules.filter(r => r.id !== id) }));
  }, []);

  const triggerAutoTasks = useCallback((trigger: string, cultureId: number) => {
    const activeRules = data.autoTaskRules.filter(r => r.is_active && r.trigger === trigger);
    activeRules.forEach(rule => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + rule.delay_days);
      addTask({
        title: `${rule.name} - Культура #${cultureId}`,
        description: rule.description,
        priority: rule.priority,
        status: 'new',
        culture_id: cultureId,
        sop_id: rule.sop_id,
        due_date: dueDate.toISOString().split('T')[0]
      });
    });
  }, [data.autoTaskRules, addTask]);

  // ===== AUDIT LOG =====
  const addAuditLog = useCallback((action: string, entityType: string, entityId?: string, details?: any) => {
    const id = getNextId('auditLogs');
    const newLog: AuditLog = {
      id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_name: 'system',
      details,
      created_at: now()
    };
    setData(prev => ({ ...prev, auditLogs: [newLog, ...prev.auditLogs].slice(0, 100) }));
  }, []);

  // ===== FEEDBACK =====
  const addFeedback = useCallback((feedbackData: Partial<Feedback>) => {
    const id = getNextId('feedbacks');
    const newFeedback: Feedback = {
      id,
      type: feedbackData.type || 'bug',
      title: feedbackData.title || '',
      description: feedbackData.description,
      screenshot_url: feedbackData.screenshot_url,
      user_id: feedbackData.user_id,
      user_name: feedbackData.user_name,
      status: 'new',
      created_at: now(),
      updated_at: now()
    };
    setData(prev => ({ ...prev, feedbacks: [newFeedback, ...prev.feedbacks] }));
    return newFeedback;
  }, []);

  const updateFeedback = useCallback((id: number, updates: Partial<Feedback>) => {
    setData(prev => ({
      ...prev,
      feedbacks: prev.feedbacks.map(f => f.id === id ? { ...f, ...updates, updated_at: now() } : f)
    }));
  }, []);

  const value: AppContextType = useMemo(() => ({
    donors: data.donors,
    donations: data.donations,
    cultures: data.cultures,
    tasks: data.tasks,
    sops: data.sops,
    sopExecutions: data.sopExecutions,
    equipment: data.equipment,
    media: data.media,
    containerTypes: data.containerTypes,
    masterBanks: data.masterBanks,
    auditLogs: data.auditLogs,
    autoTaskRules: data.autoTaskRules,
    feedbacks: data.feedbacks,
    loading,
    refreshData,
    addDonor, updateDonor, deleteDonor, getDonorById,
    addDonation, updateDonation, deleteDonation,
    addCulture, updateCulture, getCultureById, passageCulture,
    addTask, updateTask, deleteTask,
    addSOP, updateSOP, deleteSOP, createSOPVersion, startSOPExecution, completeSOPExecution,
    addEquipment, updateEquipment,
    addMedia, updateMedia,
    addContainerType, updateContainerType, deleteContainerType,
    addMasterBank, updateMasterBank,
    addAutoTaskRule, updateAutoTaskRule, deleteAutoTaskRule, triggerAutoTasks,
    addAuditLog,
    addFeedback, updateFeedback
  }), [data, loading, refreshData, addDonor, updateDonor, deleteDonor, getDonorById,
    addDonation, updateDonation, deleteDonation,
    addCulture, updateCulture, getCultureById, passageCulture,
    addTask, updateTask, deleteTask,
    addSOP, updateSOP, deleteSOP, createSOPVersion, startSOPExecution, completeSOPExecution,
    addEquipment, updateEquipment,
    addMedia, updateMedia,
    addContainerType, updateContainerType, deleteContainerType,
    addMasterBank, updateMasterBank,
    addAutoTaskRule, updateAutoTaskRule, deleteAutoTaskRule, triggerAutoTasks,
    addAuditLog, addFeedback, updateFeedback]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
