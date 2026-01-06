// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, StatusBadge, EmptyState } from '../../components/UI';
import { Wrench, Plus, Search, AlertTriangle, Eye } from 'lucide-react';
import { formatDateTime } from '../../utils';
import { generateEquipmentReport } from '../../utils/pdf';
import { EQUIPMENT_TYPE_LABELS, EQUIPMENT_STATUS_LABELS, EQUIPMENT_PARAMS_CONFIG, EquipmentType, EquipmentStatus, Equipment, EquipmentParameters } from '../../types';

const statusColors: Record<EquipmentStatus, string> = { 
  active: 'green', 
  maintenance: 'yellow', 
  repair: 'red', 
  decommissioned: 'slate' 
};

const equipmentTypeOptions = Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const statusOptions = Object.entries(EQUIPMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }));

// Параметры по умолчанию для каждого типа оборудования
const DEFAULT_PARAMS: Record<EquipmentType, Partial<Record<string, string>>> = {
  microscope: { magnification: '4x, 10x, 40x, 100x' },
  incubator: { tempMin: '36.5', tempMax: '37.5', tempUnit: '°C', co2Min: '4.8', co2Max: '5.2', humidityMin: '90', humidityMax: '95' },
  laminar_cabinet: { airflowMin: '0.3', airflowMax: '0.5' },
  refrigerator: { tempMin: '2', tempMax: '8', tempUnit: '°C' },
  freezer: { tempMin: '-25', tempMax: '-15', tempUnit: '°C' },
  centrifuge: { rpmMin: '100', rpmMax: '15000', tempMin: '4', tempMax: '40', tempUnit: '°C' },
  autoclave: { sterilizationTemp: '121', sterilizationTime: '20', pressureMin: '1', pressureMax: '2' },
  water_bath: { tempMin: '20', tempMax: '100', tempUnit: '°C' },
  cell_counter: { cellCounterType: 'Автоматический' },
  cryostorage: { tempMin: '-196', tempMax: '-150', tempUnit: '°C', nitrogenMin: '50', nitrogenMax: '100' },
  other: {}
};

export const EquipmentPage: React.FC = () => {
  const { equipment, addEquipment, updateEquipment, tasks, updateTask } = useApp();
  const { canEdit } = useAuth();
  
  const safeEquipment = equipment || [];
  const safeTasks = tasks || [];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewEquipment, setViewEquipment] = useState<Equipment | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    inventoryNumber: '',
    equipmentType: 'incubator' as EquipmentType,
    location: '',
    requiresValidation: true,
    validationPeriodDays: '365',
    lastValidationDate: '',
    // Критические параметры (универсальные поля)
    tempMin: '', tempMax: '', tempUnit: '°C',
    co2Min: '', co2Max: '',
    humidityMin: '', humidityMax: '',
    rpmMin: '', rpmMax: '',
    pressureMin: '', pressureMax: '',
    airflowMin: '', airflowMax: '',
    sterilizationTemp: '', sterilizationTime: '',
    magnification: '',
    cellCounterType: '',
    nitrogenMin: '', nitrogenMax: '',
    paramNotes: ''
  });

  // При смене типа оборудования - заполнить значения по умолчанию
  const handleTypeChange = (newType: EquipmentType) => {
    const defaults = DEFAULT_PARAMS[newType] || {};
    setFormData(prev => ({
      ...prev,
      equipmentType: newType,
      tempMin: defaults.tempMin || '',
      tempMax: defaults.tempMax || '',
      tempUnit: defaults.tempUnit || '°C',
      co2Min: defaults.co2Min || '',
      co2Max: defaults.co2Max || '',
      humidityMin: defaults.humidityMin || '',
      humidityMax: defaults.humidityMax || '',
      rpmMin: defaults.rpmMin || '',
      rpmMax: defaults.rpmMax || '',
      pressureMin: defaults.pressureMin || '',
      pressureMax: defaults.pressureMax || '',
      airflowMin: defaults.airflowMin || '',
      airflowMax: defaults.airflowMax || '',
      sterilizationTemp: defaults.sterilizationTemp || '',
      sterilizationTime: defaults.sterilizationTime || '',
      magnification: defaults.magnification || '',
      cellCounterType: defaults.cellCounterType || '',
      nitrogenMin: defaults.nitrogenMin || '',
      nitrogenMax: defaults.nitrogenMax || ''
    }));
  };

  const buildCriticalParams = (): EquipmentParameters | undefined => {
    const params: EquipmentParameters = {};
    const config = EQUIPMENT_PARAMS_CONFIG[formData.equipmentType] || [];
    
    if (config.includes('temperature') && (formData.tempMin || formData.tempMax)) {
      params.temperature = { min: parseFloat(formData.tempMin) || 0, max: parseFloat(formData.tempMax) || 0, unit: formData.tempUnit };
    }
    if (config.includes('co2Level') && (formData.co2Min || formData.co2Max)) {
      params.co2Level = { min: parseFloat(formData.co2Min) || 0, max: parseFloat(formData.co2Max) || 0 };
    }
    if (config.includes('humidity') && (formData.humidityMin || formData.humidityMax)) {
      params.humidity = { min: parseFloat(formData.humidityMin) || 0, max: parseFloat(formData.humidityMax) || 0 };
    }
    if (config.includes('rpm') && (formData.rpmMin || formData.rpmMax)) {
      params.rpm = { min: parseFloat(formData.rpmMin) || 0, max: parseFloat(formData.rpmMax) || 0 };
    }
    if (config.includes('pressure') && (formData.pressureMin || formData.pressureMax)) {
      params.pressure = { min: parseFloat(formData.pressureMin) || 0, max: parseFloat(formData.pressureMax) || 0 };
    }
    if (config.includes('airflowSpeed') && (formData.airflowMin || formData.airflowMax)) {
      params.airflowSpeed = { min: parseFloat(formData.airflowMin) || 0, max: parseFloat(formData.airflowMax) || 0 };
    }
    if (config.includes('sterilizationTemp') && formData.sterilizationTemp) {
      params.sterilizationTemp = parseFloat(formData.sterilizationTemp) || 0;
    }
    if (config.includes('sterilizationTime') && formData.sterilizationTime) {
      params.sterilizationTime = parseFloat(formData.sterilizationTime) || 0;
    }
    if (config.includes('magnification') && formData.magnification) {
      params.magnification = formData.magnification;
    }
    if (config.includes('cellCounterType') && formData.cellCounterType) {
      params.cellCounterType = formData.cellCounterType;
    }
    if (config.includes('nitrogenLevel') && (formData.nitrogenMin || formData.nitrogenMax)) {
      params.nitrogenLevel = { min: parseFloat(formData.nitrogenMin) || 0, max: parseFloat(formData.nitrogenMax) || 0 };
    }
    if (formData.paramNotes) params.notes = formData.paramNotes;
    
    return Object.keys(params).length > 0 ? params : undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lastDate = formData.lastValidationDate ? new Date(formData.lastValidationDate) : new Date();
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + parseInt(formData.validationPeriodDays));
    
    addEquipment({
      name: formData.name,
      manufacturer: formData.manufacturer,
      model: formData.model,
      serialNumber: formData.serialNumber,
      inventoryNumber: formData.inventoryNumber,
      equipmentType: formData.equipmentType,
      location: formData.location,
      criticalParameters: buildCriticalParams(),
      requiresValidation: formData.requiresValidation,
      validationPeriodDays: parseInt(formData.validationPeriodDays),
      lastValidationDate: formData.lastValidationDate || new Date().toISOString(),
      nextValidationDate: nextDate.toISOString(),
      status: 'active'
    });
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '', manufacturer: '', model: '', serialNumber: '', inventoryNumber: '',
      equipmentType: 'incubator', location: '', requiresValidation: true,
      validationPeriodDays: '365', lastValidationDate: '',
      tempMin: '', tempMax: '', tempUnit: '°C', co2Min: '', co2Max: '',
      humidityMin: '', humidityMax: '', rpmMin: '', rpmMax: '',
      pressureMin: '', pressureMax: '', airflowMin: '', airflowMax: '',
      sterilizationTemp: '', sterilizationTime: '', magnification: '',
      cellCounterType: '', nitrogenMin: '', nitrogenMax: '', paramNotes: ''
    });
  };

  const handleValidationComplete = (eq: Equipment) => {
    const next = new Date();
    next.setDate(next.getDate() + (eq.validationPeriodDays || 365));
    updateEquipment(eq.id, { status: 'active', lastValidationDate: new Date().toISOString(), nextValidationDate: next.toISOString() });
    safeTasks.filter(t => t.relatedEntityType === 'equipment' && t.relatedEntityId === eq.id && t.title.toLowerCase().includes('валидац') && t.status !== 'completed')
      .forEach(t => updateTask(t.id, { status: 'completed', completedAt: new Date().toISOString() }));
  };

  const handleStatusChange = (eq: Equipment, newStatus: EquipmentStatus) => {
    updateEquipment(eq.id, { status: newStatus });
  };

  const filteredEquipment = (equipment || []).filter(e => {
    const matchesSearch = (e.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || String(e.id).includes(searchQuery.toLowerCase()) || (e.serialNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeEquipment = (equipment || []).filter(e => e.status === 'active');

  const isValidationDue = (eq: Equipment) => {
    if (!eq.nextValidationDate) return false;
    const daysUntil = Math.ceil((new Date(eq.nextValidationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30;
  };

  const formatParams = (params?: EquipmentParameters) => {
    if (!params) return '-';
    const parts = [];
    if (params.temperature) parts.push(`T: ${params.temperature.min}–${params.temperature.max}${params.temperature.unit}`);
    if (params.co2Level) parts.push(`CO₂: ${params.co2Level.min}–${params.co2Level.max}%`);
    if (params.humidity) parts.push(`Влаж.: ${params.humidity.min}–${params.humidity.max}%`);
    if (params.rpm) parts.push(`Обор.: ${params.rpm.min}–${params.rpm.max} об/мин`);
    if (params.airflowSpeed) parts.push(`Поток: ${params.airflowSpeed.min}–${params.airflowSpeed.max} м/с`);
    if (params.sterilizationTemp) parts.push(`Стер.: ${params.sterilizationTemp}°C`);
    if (params.sterilizationTime) parts.push(`${params.sterilizationTime} мин`);
    if (params.magnification) parts.push(`Увелич.: ${params.magnification}`);
    if (params.cellCounterType) parts.push(`Тип: ${params.cellCounterType}`);
    if (params.nitrogenLevel) parts.push(`N₂: ${params.nitrogenLevel.min}–${params.nitrogenLevel.max}%`);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  // Определяем какие поля показывать для текущего типа
  const currentConfig = EQUIPMENT_PARAMS_CONFIG[formData.equipmentType] || [];

  // Рендер полей параметров в зависимости от типа
  const renderParamFields = () => {
    const fields = [];
    
    if (currentConfig.includes('temperature')) {
      fields.push(
        <div key="temp" className="grid grid-cols-3 gap-3">
          <Input label="Темп. мин" type="number" step="0.1" value={formData.tempMin} onChange={(e) => setFormData({...formData, tempMin: e.target.value})} />
          <Input label="Темп. макс" type="number" step="0.1" value={formData.tempMax} onChange={(e) => setFormData({...formData, tempMax: e.target.value})} />
          <Select label="Ед." value={formData.tempUnit} onChange={(e) => setFormData({...formData, tempUnit: e.target.value})} options={[{value: '°C', label: '°C'}, {value: '°F', label: '°F'}]} />
        </div>
      );
    }
    
    if (currentConfig.includes('co2Level')) {
      fields.push(
        <div key="co2" className="grid grid-cols-2 gap-3">
          <Input label="CO₂ мин (%)" type="number" step="0.1" value={formData.co2Min} onChange={(e) => setFormData({...formData, co2Min: e.target.value})} />
          <Input label="CO₂ макс (%)" type="number" step="0.1" value={formData.co2Max} onChange={(e) => setFormData({...formData, co2Max: e.target.value})} />
        </div>
      );
    }
    
    if (currentConfig.includes('humidity')) {
      fields.push(
        <div key="humidity" className="grid grid-cols-2 gap-3">
          <Input label="Влажность мин (%)" type="number" value={formData.humidityMin} onChange={(e) => setFormData({...formData, humidityMin: e.target.value})} />
          <Input label="Влажность макс (%)" type="number" value={formData.humidityMax} onChange={(e) => setFormData({...formData, humidityMax: e.target.value})} />
        </div>
      );
    }
    
    if (currentConfig.includes('rpm')) {
      fields.push(
        <div key="rpm" className="grid grid-cols-2 gap-3">
          <Input label="Обороты мин (об/мин)" type="number" value={formData.rpmMin} onChange={(e) => setFormData({...formData, rpmMin: e.target.value})} />
          <Input label="Обороты макс (об/мин)" type="number" value={formData.rpmMax} onChange={(e) => setFormData({...formData, rpmMax: e.target.value})} />
        </div>
      );
    }
    
    if (currentConfig.includes('airflowSpeed')) {
      fields.push(
        <div key="airflow" className="grid grid-cols-2 gap-3">
          <Input label="Скорость потока мин (м/с)" type="number" step="0.01" value={formData.airflowMin} onChange={(e) => setFormData({...formData, airflowMin: e.target.value})} />
          <Input label="Скорость потока макс (м/с)" type="number" step="0.01" value={formData.airflowMax} onChange={(e) => setFormData({...formData, airflowMax: e.target.value})} />
        </div>
      );
    }
    
    if (currentConfig.includes('sterilizationTemp') || currentConfig.includes('sterilizationTime')) {
      fields.push(
        <div key="sterilization" className="grid grid-cols-2 gap-3">
          {currentConfig.includes('sterilizationTemp') && <Input label="Темп. стерилизации (°C)" type="number" value={formData.sterilizationTemp} onChange={(e) => setFormData({...formData, sterilizationTemp: e.target.value})} />}
          {currentConfig.includes('sterilizationTime') && <Input label="Время стерилизации (мин)" type="number" value={formData.sterilizationTime} onChange={(e) => setFormData({...formData, sterilizationTime: e.target.value})} />}
        </div>
      );
    }
    
    if (currentConfig.includes('pressure')) {
      fields.push(
        <div key="pressure" className="grid grid-cols-2 gap-3">
          <Input label="Давление мин (атм)" type="number" step="0.1" value={formData.pressureMin} onChange={(e) => setFormData({...formData, pressureMin: e.target.value})} />
          <Input label="Давление макс (атм)" type="number" step="0.1" value={formData.pressureMax} onChange={(e) => setFormData({...formData, pressureMax: e.target.value})} />
        </div>
      );
    }
    
    if (currentConfig.includes('magnification')) {
      fields.push(
        <div key="magnification">
          <Input label="Увеличение (объективы)" value={formData.magnification} onChange={(e) => setFormData({...formData, magnification: e.target.value})} placeholder="напр. 4x, 10x, 40x, 100x" />
        </div>
      );
    }
    
    if (currentConfig.includes('cellCounterType')) {
      fields.push(
        <div key="cellCounter">
          <Select label="Тип счётчика" value={formData.cellCounterType} onChange={(e) => setFormData({...formData, cellCounterType: e.target.value})} 
            options={[{value: '', label: 'Выберите'}, {value: 'Автоматический', label: 'Автоматический'}, {value: 'Полуавтоматический', label: 'Полуавтоматический'}, {value: 'Камера Горяева', label: 'Камера Горяева'}]} />
        </div>
      );
    }
    
    if (currentConfig.includes('nitrogenLevel')) {
      fields.push(
        <div key="nitrogen" className="grid grid-cols-2 gap-3">
          <Input label="Уровень N₂ мин (%)" type="number" value={formData.nitrogenMin} onChange={(e) => setFormData({...formData, nitrogenMin: e.target.value})} />
          <Input label="Уровень N₂ макс (%)" type="number" value={formData.nitrogenMax} onChange={(e) => setFormData({...formData, nitrogenMax: e.target.value})} />
        </div>
      );
    }
    
    if (currentConfig.includes('notes')) {
      fields.push(
        <div key="notes">
          <Input label="Примечания" value={formData.paramNotes} onChange={(e) => setFormData({...formData, paramNotes: e.target.value})} />
        </div>
      );
    }
    
    return fields.length > 0 ? <div className="space-y-3">{fields}</div> : <p className="text-sm text-slate-500">Нет специфических параметров</p>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Оборудование</h1>
          <p className="text-slate-500">Учёт и валидация ({activeEquipment.length} активных)</p>
        </div>
        <Button variant="secondary" onClick={() => generateEquipmentReport(equipment)}>📄 Отчёт</Button>
        {canEdit() && <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4" /> Добавить</Button>}
      </div>

      <Card>
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg" />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{value: 'all', label: 'Все статусы'}, ...statusOptions]} />
        </div>
      </Card>

      {filteredEquipment.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEquipment.map(eq => (
            <Card key={eq.id} className={isValidationDue(eq) ? 'border-l-4 border-l-yellow-500' : ''}>
              <div className="flex justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{eq.name}</h3>
                    {isValidationDue(eq) && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <p className="text-slate-600">{eq.manufacturer} {eq.model}</p>
                  <p className="text-sm text-slate-500">{EQUIPMENT_TYPE_LABELS[eq.equipmentType]}</p>
                </div>
                <StatusBadge status={eq.status} label={EQUIPMENT_STATUS_LABELS[eq.status]} color={statusColors[eq.status]} />
              </div>
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg text-sm">
                <div><p className="text-slate-500">ID</p><p className="font-medium">{eq.id}</p></div>
                <div><p className="text-slate-500">Серийный номер</p><p className="font-medium">{eq.serialNumber}</p></div>
                <div><p className="text-slate-500">Инв. номер</p><p className="font-medium">{eq.inventoryNumber}</p></div>
                <div><p className="text-slate-500">Расположение</p><p className="font-medium">{eq.location}</p></div>
                <div className="col-span-2"><p className="text-slate-500">Параметры</p><p className="font-medium text-xs">{formatParams(eq.criticalParameters)}</p></div>
                {eq.nextValidationDate && (
                  <div className="col-span-2"><p className="text-slate-500">Следующая валидация</p><p className={`font-medium ${isValidationDue(eq) ? 'text-yellow-600' : ''}`}>{formatDateTime(eq.nextValidationDate)}</p></div>
                )}
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t flex-wrap">
                <Button size="sm" variant="secondary" onClick={() => setViewEquipment(eq)}><Eye className="w-3 h-3" /> Детали</Button>
                {canEdit() && eq.status === 'active' && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => handleStatusChange(eq, 'maintenance')}>На обслуживание</Button>
                    <Button size="sm" variant="danger" onClick={() => handleStatusChange(eq, 'repair')}>На ремонт</Button>
                  </>
                )}
                {canEdit() && (eq.status === 'maintenance' || eq.status === 'repair') && (
                  <Button size="sm" variant="success" onClick={() => handleValidationComplete(eq)}>Валидация → Активно</Button>
                )}
                {canEdit() && eq.status !== 'decommissioned' && (
                  <Button size="sm" variant="danger" onClick={() => handleStatusChange(eq, 'decommissioned')}>Списать</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card><EmptyState icon={Wrench} title="Оборудование не найдено" description="Добавьте оборудование в систему" /></Card>
      )}

      {/* Модальное окно добавления */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Добавление оборудования" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Название" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="напр. CO2 инкубатор Binder" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Производитель" value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} required />
            <Input label="Модель" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Серийный номер" value={formData.serialNumber} onChange={(e) => setFormData({...formData, serialNumber: e.target.value})} required />
            <Input label="Инвентарный номер" value={formData.inventoryNumber} onChange={(e) => setFormData({...formData, inventoryNumber: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Тип оборудования" value={formData.equipmentType} onChange={(e) => handleTypeChange(e.target.value as EquipmentType)} options={equipmentTypeOptions} />
            <Input label="Расположение" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Лаборатория 101" />
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Критические параметры: {EQUIPMENT_TYPE_LABELS[formData.equipmentType]}</h4>
            {renderParamFields()}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <Input label="Период валидации (дней)" type="number" value={formData.validationPeriodDays} onChange={(e) => setFormData({...formData, validationPeriodDays: e.target.value})} />
            <Input label="Дата последней валидации" type="date" value={formData.lastValidationDate} onChange={(e) => setFormData({...formData, lastValidationDate: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">Добавить</Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно просмотра */}
      <Modal isOpen={!!viewEquipment} onClose={() => setViewEquipment(null)} title={viewEquipment?.name || 'Детали'} size="lg">
        {viewEquipment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-slate-500 text-sm">Тип</p><p className="font-medium">{EQUIPMENT_TYPE_LABELS[viewEquipment.equipmentType]}</p></div>
              <div><p className="text-slate-500 text-sm">Статус</p><StatusBadge status={viewEquipment.status} label={EQUIPMENT_STATUS_LABELS[viewEquipment.status]} color={statusColors[viewEquipment.status]} /></div>
              <div><p className="text-slate-500 text-sm">Производитель</p><p className="font-medium">{viewEquipment.manufacturer}</p></div>
              <div><p className="text-slate-500 text-sm">Модель</p><p className="font-medium">{viewEquipment.model}</p></div>
              <div><p className="text-slate-500 text-sm">Серийный номер</p><p className="font-medium">{viewEquipment.serialNumber}</p></div>
              <div><p className="text-slate-500 text-sm">Инв. номер</p><p className="font-medium">{viewEquipment.inventoryNumber}</p></div>
              <div><p className="text-slate-500 text-sm">Расположение</p><p className="font-medium">{viewEquipment.location}</p></div>
              <div><p className="text-slate-500 text-sm">Добавлено</p><p className="font-medium">{formatDateTime(viewEquipment.createdAt)}</p></div>
            </div>
            {viewEquipment.criticalParameters && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Критические параметры</h4>
                <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-sm">
                  {viewEquipment.criticalParameters.temperature && <p>Температура: {viewEquipment.criticalParameters.temperature.min} – {viewEquipment.criticalParameters.temperature.max} {viewEquipment.criticalParameters.temperature.unit}</p>}
                  {viewEquipment.criticalParameters.co2Level && <p>CO₂: {viewEquipment.criticalParameters.co2Level.min} – {viewEquipment.criticalParameters.co2Level.max}%</p>}
                  {viewEquipment.criticalParameters.humidity && <p>Влажность: {viewEquipment.criticalParameters.humidity.min} – {viewEquipment.criticalParameters.humidity.max}%</p>}
                  {viewEquipment.criticalParameters.rpm && <p>Обороты: {viewEquipment.criticalParameters.rpm.min} – {viewEquipment.criticalParameters.rpm.max} об/мин</p>}
                  {viewEquipment.criticalParameters.airflowSpeed && <p>Скорость потока: {viewEquipment.criticalParameters.airflowSpeed.min} – {viewEquipment.criticalParameters.airflowSpeed.max} м/с</p>}
                  {viewEquipment.criticalParameters.sterilizationTemp && <p>Температура стерилизации: {viewEquipment.criticalParameters.sterilizationTemp}°C</p>}
                  {viewEquipment.criticalParameters.sterilizationTime && <p>Время стерилизации: {viewEquipment.criticalParameters.sterilizationTime} мин</p>}
                  {viewEquipment.criticalParameters.pressure && <p>Давление: {viewEquipment.criticalParameters.pressure.min} – {viewEquipment.criticalParameters.pressure.max} атм</p>}
                  {viewEquipment.criticalParameters.magnification && <p>Увеличение: {viewEquipment.criticalParameters.magnification}</p>}
                  {viewEquipment.criticalParameters.cellCounterType && <p>Тип счётчика: {viewEquipment.criticalParameters.cellCounterType}</p>}
                  {viewEquipment.criticalParameters.nitrogenLevel && <p>Уровень N₂: {viewEquipment.criticalParameters.nitrogenLevel.min} – {viewEquipment.criticalParameters.nitrogenLevel.max}%</p>}
                  {viewEquipment.criticalParameters.notes && <p className="text-slate-600">{viewEquipment.criticalParameters.notes}</p>}
                </div>
              </div>
            )}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Валидация</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-slate-500">Период</p><p>{viewEquipment.validationPeriodDays || 365} дней</p></div>
                <div><p className="text-slate-500">Последняя</p><p>{viewEquipment.lastValidationDate ? formatDateTime(viewEquipment.lastValidationDate) : '-'}</p></div>
                <div className="col-span-2"><p className="text-slate-500">Следующая</p><p className={isValidationDue(viewEquipment) ? 'text-yellow-600 font-medium' : ''}>{viewEquipment.nextValidationDate ? formatDateTime(viewEquipment.nextValidationDate) : '-'}</p></div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
