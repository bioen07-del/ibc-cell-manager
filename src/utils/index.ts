import { differenceInYears, format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

// Генерация уникальных ID
let donorCounter = 1;
let donationCounter = 1;
let cultureCounter = 1;
let taskCounter = 1;
let manipulationCounter = 1;
let masterBankCounter = 1;
let storageCounter = 1;
let releaseCounter = 1;
let disposalCounter = 1;
let equipmentCounter = 1;
let mediaCounter = 1;

export const generateDonorId = (): string => {
  const year = new Date().getFullYear();
  return `D-${year}-${String(donorCounter++).padStart(4, '0')}`;
};

export const generateDonationId = (): string => {
  return `DN-${String(donationCounter++).padStart(4, '0')}`;
};

export const generateCultureId = (): string => {
  return `CL-${String(cultureCounter++).padStart(4, '0')}`;
};

export const generateTaskId = (): string => {
  return `T-${String(taskCounter++).padStart(4, '0')}`;
};

export const generateManipulationId = (): string => {
  return `M-${String(manipulationCounter++).padStart(5, '0')}`;
};

export const generateMasterBankId = (): string => {
  return `MB-${String(masterBankCounter++).padStart(4, '0')}`;
};

export const generateStorageId = (): string => {
  return `ST-${String(storageCounter++).padStart(4, '0')}`;
};

export const generateReleaseId = (): string => {
  return `RL-${String(releaseCounter++).padStart(4, '0')}`;
};

export const generateDisposalId = (): string => {
  return `DP-${String(disposalCounter++).padStart(4, '0')}`;
};

export const generateEquipmentId = (): string => {
  return `EQ-${String(equipmentCounter++).padStart(4, '0')}`;
};

export const generateMediaId = (): string => {
  return `MD-${String(mediaCounter++).padStart(4, '0')}`;
};

// Расчет возраста
export const calculateAge = (birthDate: string | undefined | null): number => {
  if (!birthDate) return 0;
  try {
    return differenceInYears(new Date(), parseISO(birthDate));
  } catch {
    return 0;
  }
};

// Форматирование даты
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '—';
  try {
    return format(parseISO(dateString), 'dd.MM.yyyy', { locale: ru });
  } catch {
    return '—';
  }
};

export const formatDateTime = (dateString: string | undefined | null): string => {
  if (!dateString) return '—';
  try {
    return format(parseISO(dateString), 'dd.MM.yyyy HH:mm', { locale: ru });
  } catch {
    return '—';
  }
};

// Статусы на русском
export const donorStatusLabels: Record<string, string> = {
  active: 'Активный',
  quarantine: 'Карантин',
  archived: 'Архивный'
};

export const donationStatusLabels: Record<string, string> = {
  quarantine: 'Карантин',
  processed: 'Обработан',
  disposed: 'Утилизирован'
};

export const cultureStatusLabels: Record<string, string> = {
  in_work: 'В работе',
  frozen: 'Заморожен',
  released: 'Выдан',
  disposed: 'Утилизирован',
  passaged: 'Пассирован'
};

export const taskStatusLabels: Record<string, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  completed: 'Выполнена',
  overdue: 'Просрочена'
};

export const taskPriorityLabels: Record<string, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий'
};

export const manipulationTypeLabels: Record<string, string> = {
  observation: 'Наблюдение',
  feeding: 'Подкормка',
  passage: 'Пассаж',
  freezing: 'Замораживание',
  thawing: 'Размораживание',
  disposal: 'Утилизация',
  release: 'Выдача'
};

export const masterBankStatusLabels: Record<string, string> = {
  stored: 'На хранении',
  partially_used: 'Частично использован',
  fully_used: 'Полностью использован',
  disposed: 'Утилизирован'
};

export const storageStatusLabels: Record<string, string> = {
  stored: 'На хранении',
  partially_retrieved: 'Частично извлечено',
  released: 'Выдано',
  disposed: 'Утилизировано'
};

export const equipmentStatusLabels: Record<string, string> = {
  active: 'В работе',
  validation: 'На валидации',
  blocked: 'Заблокировано',
  decommissioned: 'Выведено из эксплуатации'
};

export const mediaStatusLabels: Record<string, string> = {
  approved: 'Одобрено',
  quarantine: 'Карантин',
  disposed: 'Утилизировано',
  exhausted: 'Израсходовано'
};

export const releaseStatusLabels: Record<string, string> = {
  pending: 'Оформлена',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена'
};

export const disposalReasonLabels: Record<string, string> = {
  contamination: 'Контаминация',
  expired: 'Истёк срок годности',
  quality_failure: 'Не прошло контроль качества',
  no_demand: 'Отсутствие потребности',
  other: 'Другое'
};

export const applicationTypeLabels: Record<string, string> = {
  clinical: 'Клиническое применение',
  research: 'Исследование',
  scientific: 'Научные цели'
};

// Цвета статусов
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    active: 'bg-success',
    quarantine: 'bg-warning',
    archived: 'bg-secondary',
    processed: 'bg-success',
    disposed: 'bg-danger',
    in_work: 'bg-primary',
    frozen: 'bg-blue-400',
    released: 'bg-success',
    passaged: 'bg-purple-500',
    new: 'bg-primary',
    in_progress: 'bg-warning',
    completed: 'bg-success',
    overdue: 'bg-danger',
    stored: 'bg-blue-400',
    partially_used: 'bg-warning',
    fully_used: 'bg-secondary',
    partially_retrieved: 'bg-warning',
    validation: 'bg-warning',
    blocked: 'bg-danger',
    decommissioned: 'bg-secondary',
    approved: 'bg-success',
    exhausted: 'bg-secondary',
    pending: 'bg-warning',
    confirmed: 'bg-success',
    cancelled: 'bg-danger'
  };
  return colors[status] || 'bg-gray-400';
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    high: 'bg-danger',
    medium: 'bg-warning',
    low: 'bg-success'
  };
  return colors[priority] || 'bg-gray-400';
};
