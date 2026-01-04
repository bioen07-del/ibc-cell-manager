import { 
  Donor, Donation, Culture, Task, Manipulation,
  MasterBank, Storage, Release, Disposal, Equipment, Media, AutoTaskRule, ContainerTypeItem
} from '../types';

export const initialDonors: Donor[] = [];
export const initialDonations: Donation[] = [];
export const initialCultures: Culture[] = [];
export const initialTasks: Task[] = [];
export const initialManipulations: Manipulation[] = [];
export const initialMasterBanks: MasterBank[] = [];
export const initialStorages: Storage[] = [];
export const initialReleases: Release[] = [];
export const initialDisposals: Disposal[] = [];
export const initialEquipment: Equipment[] = [];
export const initialMedia: Media[] = [];

// Дефолтные правила автозадач (пустой - пользователи добавляют сами)
export const initialAutoTaskRules: AutoTaskRule[] = [];


// Справочник культуральной посуды
export const initialContainerTypes: ContainerTypeItem[] = [
  { id: 'CT-001', name: 'Флакон T25', area: 25, volumeMin: 3, volumeMax: 7, volumeRecommended: 5, category: 'flask', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-002', name: 'Флакон T75', area: 75, volumeMin: 8, volumeMax: 20, volumeRecommended: 15, category: 'flask', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-003', name: 'Флакон T175', area: 175, volumeMin: 25, volumeMax: 50, volumeRecommended: 35, category: 'flask', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-004', name: 'Чашка Петри 35мм', area: 9.6, volumeMin: 1, volumeMax: 3, volumeRecommended: 2, category: 'dish', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-005', name: 'Чашка Петри 60мм', area: 21, volumeMin: 2, volumeMax: 5, volumeRecommended: 3, category: 'dish', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-006', name: 'Чашка Петри 100мм', area: 56, volumeMin: 6, volumeMax: 15, volumeRecommended: 10, category: 'dish', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-007', name: '6-луночный планшет', area: 9.5, volumeMin: 1, volumeMax: 3, volumeRecommended: 2, category: 'plate', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-008', name: '12-луночный планшет', area: 3.8, volumeMin: 0.5, volumeMax: 1.5, volumeRecommended: 1, category: 'plate', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-009', name: '24-луночный планшет', area: 1.9, volumeMin: 0.3, volumeMax: 1, volumeRecommended: 0.5, category: 'plate', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-010', name: '96-луночный планшет', area: 0.32, volumeMin: 0.05, volumeMax: 0.2, volumeRecommended: 0.1, category: 'plate', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  // Криопробирки
  { id: 'CT-011', name: 'Криопробирка 1 мл', area: 0, volumeMin: 0.5, volumeMax: 1, volumeRecommended: 1, category: 'cryotube', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-012', name: 'Криопробирка 1.5 мл', area: 0, volumeMin: 0.5, volumeMax: 1.5, volumeRecommended: 1.5, category: 'cryotube', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-013', name: 'Криопробирка 2 мл', area: 0, volumeMin: 1, volumeMax: 2, volumeRecommended: 2, category: 'cryotube', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-014', name: 'Криопробирка 4 мл', area: 0, volumeMin: 2, volumeMax: 4, volumeRecommended: 4, category: 'cryotube', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'CT-015', name: 'Криопробирка 5 мл', area: 0, volumeMin: 2.5, volumeMax: 5, volumeRecommended: 5, category: 'cryotube', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];
