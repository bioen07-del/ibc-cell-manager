// Типы для системы управления БМКП

export type DonorStatus = 'active' | 'quarantine' | 'archived';
export type DonationStatus = 'quarantine' | 'processed' | 'disposed';
export type CultureStatus = 'in_work' | 'frozen' | 'released' | 'disposed' | 'passaged';
export type TaskStatus = 'new' | 'in_progress' | 'completed' | 'overdue';
export type TaskPriority = 'high' | 'medium' | 'low';
export type Gender = 'male' | 'female';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type ManipulationType = 'observation' | 'feeding' | 'passage' | 'freezing' | 'thawing' | 'disposal' | 'release';

// Новые статусы
export type MasterBankStatus = 'stored' | 'partially_used' | 'fully_used' | 'disposed';
export type StorageStatus = 'stored' | 'partially_retrieved' | 'released' | 'disposed';
export type EquipmentStatus = 'active' | 'maintenance' | 'repair' | 'decommissioned';

// Справочник типов оборудования
export type EquipmentType = 
  | 'microscope'
  | 'incubator'
  | 'laminar_cabinet'
  | 'refrigerator'
  | 'freezer'
  | 'centrifuge'
  | 'autoclave'
  | 'water_bath'
  | 'cell_counter'
  | 'cryostorage'
  | 'other';

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  microscope: 'Микроскоп',
  incubator: 'Инкубатор',
  laminar_cabinet: 'Ламинарный шкаф',
  refrigerator: 'Холодильник',
  freezer: 'Морозильник',
  centrifuge: 'Центрифуга',
  autoclave: 'Автоклав',
  water_bath: 'Водяная баня',
  cell_counter: 'Счётчик клеток',
  cryostorage: 'Криохранилище',
  other: 'Другое'
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  active: 'Активное',
  maintenance: 'На обслуживании',
  repair: 'На ремонте',
  decommissioned: 'Списано'
};
export type MediaStatus = 'approved' | 'quarantine' | 'disposed' | 'exhausted';
export type MediaCategory = 'base' | 'additive' | 'enzyme' | 'other'; // Категория среды

export const MEDIA_CATEGORY_LABELS: Record<MediaCategory, string> = {
  base: 'Основная среда',
  additive: 'Добавка',
  enzyme: 'Фермент',
  other: 'Другое'
};
export type ReleaseStatus = 'pending' | 'confirmed' | 'cancelled';
export type DisposalReason = 'contamination' | 'expired' | 'quality_failure' | 'no_demand' | 'damage' | 'other';

export type RhFactor = 'positive' | 'negative';

export interface Donor {
  id: number;
  code: string;
  age?: number;
  gender?: string;
  diagnosis?: string;
  status: string;
  doctor_id?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type TissueCategory = 'liquid' | 'solid';

export interface Donation {
  id: number;
  donor_id: number;
  date: string;
  material_type?: string;
  volume_ml?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PhStatus = 'acidic' | 'alkaline' | 'normal';
export type SterilityStatus = 'sterile' | 'suspected' | 'contaminated';
export type MorphologyType = 'typical' | 'atypical' | 'differentiating';

// Контейнер для культуры (множественная посуда)
export interface CultureContainer {
  type: string;        // Флакон T25, Чашка Петри 35мм и т.д.
  count: number;       // количество
  confluency?: number; // плотность для этого контейнера
  notes?: string;
}

// Методы выделения клеток
export type IsolationMethod = 
  | 'enzymatic'      // Ферментативная обработка
  | 'explant'        // Эксплантная методика
  | 'ficoll'         // Фиколл (для жидких тканей)
  | 'gradient'       // Градиентное центрифугирование
  | 'magnetic'       // Магнитная сепарация
  | 'other';

export const ISOLATION_METHOD_LABELS: Record<IsolationMethod, string> = {
  enzymatic: 'Ферментативная обработка',
  explant: 'Эксплантная методика',
  ficoll: 'Фиколл',
  gradient: 'Градиентное центрифугирование',
  magnetic: 'Магнитная сепарация',
  other: 'Другой метод'
};

export interface Culture {
  id: string;
  donationId: string;
  donorId: string;
  cellType: string;
  tissueType?: string;          // Тип ткани из донации
  passageNumber: number;
  // Поддержка множественной посуды
  containerType: string;        // Основной тип (для обратной совместимости)
  containerCount: number;       // Общее количество
  containers?: CultureContainer[]; // Детальный список посуды
  incubatorId?: string;
  cellCount?: number;
  viability?: number;
  confluency?: number;
  currentConfluency?: number; // Текущая конфлюэнтность (из последнего наблюдения)
  isSterile?: boolean; // Признак стерильности
  phStatus?: PhStatus;
  sterilityStatus?: SterilityStatus;
  morphology?: MorphologyType;
  // Метод выделения и протокол
  isolationMethod?: IsolationMethod;
  protocolId?: string;
  protocolName?: string;
  status: CultureStatus;
  parentCultureId?: string;
  suggestedForMasterBank?: boolean; // Пункт 4: рекомендована для мастер-банка
  // Наследование данных роста
  rootCultureId?: string;       // ID первичной культуры в цепочке
  totalDoublings?: number;      // Общее количество удвоений с первого пассажа
  growthRate?: number;          // Скорость роста (удвоений в день)
  lastCellCount?: number;       // Последний подсчёт клеток
  lastCellCountDate?: string;   // Дата последнего подсчёта
  // История конфлюэнтности
  confluencyHistory?: { date: string; value: number; containerId?: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface Manipulation {
  id: string;
  type: ManipulationType;
  targetId: string;
  targetType: 'culture' | 'donation' | 'masterbank' | 'storage' | 'media';
  operatorName: string;
  dateTime: string;
  notes?: string;
  // Явные связи с ресурсами
  equipmentId?: string;
  mediaId?: string;
  mediaVolumeUsed?: number; // объём использованной среды (мл)
  parameters?: Record<string, unknown>;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  relatedEntityId: string;
  relatedEntityType: 'donor' | 'donation' | 'culture' | 'equipment' | 'media';
  assignee?: string;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  completionNotes?: string; // информация о выполнении
  completionData?: Record<string, unknown>; // данные введённые при выполнении
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  userId: string;
  timestamp: string;
}

// === НОВЫЕ СУЩНОСТИ ===

// Мастер-банк (4.5)
export interface MasterBank {
  id: string;
  donationId: string;
  donorId: string;
  sourceCultureId: string;
  cellType: string;
  passageNumber?: number;
  cellCountAtFreeze: number;
  viabilityAtFreeze: number;
  cryoprotectant: string;
  freezeProtocol: string;
  tubeCount: number;
  cellsPerTube: number;
  storageConditions: string;
  safetyTestResults?: string;
  location?: {
    equipment: string;
    shelf: string;
    rack: string;
    box: string;
    position: string;
  };
  status: MasterBankStatus;
  createdAt: string;
  updatedAt: string;
}

// Хранение (4.6)
export interface StorageLocation {
  equipment: string;
  shelf: string;
  rack: string;
  box: string;
  position: string;
}

export type NitrogenPhase = 'liquid' | 'vapor';

export interface Storage {
  id: string;
  sourceCultureId?: string;
  masterBankId?: string;
  donorId: string;
  cellType: string;
  tubeCount: number;
  cellsPerTube: number;
  location: StorageLocation;
  storageDate: string;
  expiryDate?: string;
  temperature: string;
  nitrogenPhase?: NitrogenPhase; // фаза азота
  status: StorageStatus;
  createdAt: string;
  updatedAt: string;
}

// Выдача (4.8)
export interface Release {
  id: string;
  sourceType: 'culture' | 'storage' | 'masterbank';
  sourceId: string;
  donorId: string;
  cellType?: string;
  tubeCount?: number;
  applicationType: 'clinical' | 'research' | 'scientific';
  recipientName: string;
  recipientOrg?: string;
  recipientContact: string;
  quantity: string;
  releaseDate: string;
  operatorName: string;
  status: ReleaseStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Утилизация (4.9)
export interface Disposal {
  id: string;
  objectType: 'culture' | 'storage' | 'masterbank' | 'donation' | 'media';
  objectId: string;
  donorId?: string;
  cellType?: string;
  tubeCount?: number;
  reason: DisposalReason;
  reasonDetails?: string;
  quantity?: string;
  disposalDate: string;
  operatorName: string;
  createdAt: string;
}

// Оборудование (4.10)
export interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  inventoryNumber: string;
  equipmentType: EquipmentType;
  location: string;
  // Критические параметры оборудования
  criticalParameters?: EquipmentParameters;
  requiresValidation: boolean;
  validationPeriodDays?: number;
  lastValidationDate?: string;
  nextValidationDate?: string;
  status: EquipmentStatus;
  createdAt: string;
  updatedAt: string;
}

// Критические параметры по типам оборудования
export interface EquipmentParameters {
  temperature?: { min: number; max: number; unit: string };
  co2Level?: { min: number; max: number };
  humidity?: { min: number; max: number };
  pressure?: { min: number; max: number };
  // Центрифуга
  rpm?: { min: number; max: number };
  // Микроскоп
  magnification?: string;
  // Ламинарный шкаф
  airflowSpeed?: { min: number; max: number };
  // Автоклав
  sterilizationTemp?: number;
  sterilizationTime?: number;
  // Водяная баня
  // (использует temperature)
  // Счётчик клеток
  cellCounterType?: string;
  // Криохранилище
  nitrogenLevel?: { min: number; max: number };
  notes?: string;
}

// Конфигурация параметров для каждого типа оборудования
export const EQUIPMENT_PARAMS_CONFIG: Record<EquipmentType, string[]> = {
  microscope: ['magnification', 'notes'],
  incubator: ['temperature', 'co2Level', 'humidity', 'notes'],
  laminar_cabinet: ['airflowSpeed', 'notes'],
  refrigerator: ['temperature', 'notes'],
  freezer: ['temperature', 'notes'],
  centrifuge: ['rpm', 'temperature', 'notes'],
  autoclave: ['sterilizationTemp', 'sterilizationTime', 'pressure', 'notes'],
  water_bath: ['temperature', 'notes'],
  cell_counter: ['cellCounterType', 'notes'],
  cryostorage: ['temperature', 'nitrogenLevel', 'notes'],
  other: ['notes']
};

// Среды и реактивы (4.11)
export interface Media {
  id: string;
  name: string;
  manufacturer: string;
  lotNumber: string;
  catalogNumber?: string;
  mediaType: 'original' | 'combined';
  category: MediaCategory; // base, additive, enzyme, other
  purpose: string;
  volume: number;
  remainingVolume: number;
  unit: string;
  expiryDate: string;
  storageConditions: string;
  status: MediaStatus;
  lowStockThreshold?: number; // порог для задачи на закупку (по умолч. 100 мл)
  // Стерильность
  isSterile?: boolean;
  sterilizationMethod?: 'filter_0.22' | 'filter_0.1' | 'autoclave' | 'gamma' | 'uv' | 'factory' | 'none';
  sterilizationDate?: string;
  // Для комбинированных сред
  components?: MediaComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaComponent {
  mediaId: string;
  mediaName: string;
  lotNumber: string;
  volumeUsed: number; // объём использованный для комбинированной среды
}

// Параметры наблюдения для отдельной посуды
export interface ContainerObservation {
  containerId: number; // индекс посуды
  containerType: string;
  hasCells: boolean; // наличие клеток
  confluency: number; // % конфлюентности
  hasBacteria: boolean; // признаки бактерий
  hasFungi: boolean; // признаки грибов
  morphology: MorphologyType;
  notes?: string;
  action?: 'none' | 'dispose' | 'bacteriology'; // действие: утилизация или бак. исследование
}

// Полные данные наблюдения
export interface ObservationData {
  observationType: 'all' | 'individual'; // для всех посуд или индивидуально
  containers: ContainerObservation[];
  overallNotes?: string;
}

// === АВТОЗАДАЧИ ===

export type AutoTaskTrigger = 
  | 'culture_created'      // Создание культуры
  | 'observation_done'     // После наблюдения
  | 'feeding_done'         // После подкормки
  | 'passage_done'         // После пассажа
  | 'thawing_done'         // После размораживания
  | 'masterbank_created';  // Создание мастер-банка

export type AutoTaskAction = 
  | 'observation'          // Задача на наблюдение
  | 'feeding'              // Задача на подкормку
  | 'passage_check'        // Проверка на пассаж
  | 'quality_control';     // Контроль качества

export const AUTO_TASK_TRIGGER_LABELS: Record<AutoTaskTrigger, string> = {
  culture_created: 'Создание культуры',
  observation_done: 'После наблюдения',
  feeding_done: 'После подкормки',
  passage_done: 'После пассажа',
  thawing_done: 'После размораживания',
  masterbank_created: 'Создание мастер-банка'
};

export const AUTO_TASK_ACTION_LABELS: Record<AutoTaskAction, string> = {
  observation: 'Наблюдение',
  feeding: 'Подкормка',
  passage_check: 'Проверка на пассаж',
  quality_control: 'Контроль качества'
};

export interface AutoTaskRule {
  id: string;
  name: string;
  trigger: AutoTaskTrigger;
  action: AutoTaskAction;
  delayDays: number;           // Через сколько дней создать задачу
  priority: TaskPriority;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}


// === СПРАВОЧНИК КУЛЬТУРАЛЬНОЙ ПОСУДЫ ===

export interface ContainerTypeItem {
  id: string;
  name: string;           // Название (напр. "Флакон T75")
  area: number;           // Площадь в см²
  volumeMin: number;      // Мин. объём среды (мл)
  volumeMax: number;      // Макс. объём среды (мл)
  volumeRecommended: number; // Рекомендуемый объём (мл)
  category: 'flask' | 'dish' | 'plate' | 'cryotube' | 'other';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CONTAINER_CATEGORY_LABELS: Record<string, string> = {
  flask: 'Флакон',
  dish: 'Чашка Петри',
  plate: 'Планшет',
  cryotube: 'Криопробирка',
  other: 'Другое'
};
