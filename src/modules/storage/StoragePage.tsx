// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, StatusBadge, EmptyState, Textarea } from '../../components/UI';
import { Package, Plus, Search, Snowflake, Send, Trash2, MapPin, FileText, Printer } from 'lucide-react';
import { formatDateTime } from '../../utils';
import { Storage } from '../../types';
import { generateStoragePassport, printStorageLabels } from '../../utils/pdf';

const statusLabels: Record<string, string> = {
  stored: 'Хранится',
  partially_retrieved: 'Частично извлечён',
  released: 'Выдан',
  disposed: 'Утилизирован'
};

const statusColors: Record<string, string> = {
  stored: 'green',
  partially_retrieved: 'yellow',
  released: 'blue',
  disposed: 'red'
};

export const StoragePage: React.FC = () => {
  const { storages, donors, cultures, masterBanks, equipment, media, containerTypes, addStorage, updateStorage, addManipulation, addCulture, updateMedia, addDisposal, addRelease } = useApp();
  const safeCultures = cultures || [];
  const safeMasterBanks = masterBanks || [];
  const safeMedia = media || [];
  const safeDonors = donors || [];
  const approvedMedia = (media || []).filter((m: any) => m.status === 'approved' && (m.remainingVolume || m.remaining_ml) > 0);
  const { canEdit } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('stored');
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState<Storage | null>(null);
  const [actionType, setActionType] = useState<'thaw' | 'release' | 'dispose'>('thaw');
  
  const cryoStorages = (equipment || []).filter((e: any) => (e.equipmentType || e.type) === 'cryostorage' && e.status === 'active');
  
  const [formData, setFormData] = useState({
    sourceType: 'culture',
    sourceId: '',
    cellType: 'МСК',
    tubeCount: '',
    cellsPerTube: '',
    equipment: '',
    shelf: '',
    rack: '',
    box: '',
    position: '',
    temperature: '-196°C',
    nitrogenPhase: 'liquid' as 'liquid' | 'vapor',
    expiryDate: ''
  });

  const [actionFormData, setActionFormData] = useState({
    tubeCount: '',
    notes: '',
    recipient: '',
    purpose: 'clinical' as 'clinical' | 'research' | 'scientific',
    reason: '',
    // Поля для размораживания
    thawMethod: 'water_bath_37',
    washCount: '2',
    washMediaId: '',
    cellCount: '',
    viability: '',
    containerType: 'T-25',
    containerCount: '1',
    seedingMediaId: '',
    seedingMediaVolume: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let donorId = '';
    if (formData.sourceType === 'culture') {
      const culture = safeCultures.find(c => c.id === formData.sourceId);
      donorId = culture?.donorId || '';
    } else {
      const mb = safeMasterBanks.find(m => m.id === formData.sourceId);
      donorId = mb?.donorId || '';
    }
    
    addStorage({
      sourceCultureId: formData.sourceType === 'culture' ? formData.sourceId : undefined,
      masterBankId: formData.sourceType === 'masterbank' ? formData.sourceId : undefined,
      donorId,
      cellType: formData.cellType,
      tubeCount: parseInt(formData.tubeCount) || 0,
      cellsPerTube: parseInt(formData.cellsPerTube) || 0,
      location: {
        equipment: formData.equipment,
        shelf: formData.shelf,
        rack: formData.rack,
        box: formData.box,
        position: formData.position
      },
      storageDate: new Date().toISOString(),
      expiryDate: formData.expiryDate || undefined,
      temperature: formData.temperature,
      nitrogenPhase: formData.nitrogenPhase,
      status: 'stored'
    });
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      sourceType: 'culture',
      sourceId: '',
      cellType: 'МСК',
      tubeCount: '',
      cellsPerTube: '',
      equipment: '',
      shelf: '',
      rack: '',
      box: '',
      position: '',
      temperature: '-196°C',
      nitrogenPhase: 'liquid',
      expiryDate: ''
    });
  };

  const handleOpenAction = (storage: Storage, type: 'thaw' | 'release' | 'dispose') => {
    setSelectedStorage(storage);
    setActionType(type);
    setActionFormData({
      tubeCount: type === 'dispose' ? String(storage.tubeCount) : '1',
      notes: '',
      recipient: '',
      purpose: 'clinical',
      reason: '',
      thawMethod: 'water_bath_37',
      washCount: '2',
      washMediaId: '',
      cellCount: '',
      viability: '',
      containerType: 'T-25',
      containerCount: '1',
      seedingMediaId: '',
      seedingMediaVolume: ''
    });
    setIsActionModalOpen(true);
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStorage) return;

    const tubesUsed = parseInt(actionFormData.tubeCount) || 0;
    const remainingTubes = selectedStorage.tubeCount - tubesUsed;

    // Регистрируем манипуляцию
    addManipulation({
      type: actionType === 'thaw' ? 'thawing' : actionType === 'release' ? 'release' : 'disposal',
      targetId: selectedStorage.id,
      targetType: 'storage',
      operatorName: 'Оператор',
      dateTime: new Date().toISOString(),
      notes: actionFormData.notes,
      parameters: {
        tubesUsed,
        remainingTubes,
        recipient: actionFormData.recipient,
        purpose: actionFormData.purpose,
        reason: actionFormData.reason,
        thawMethod: actionFormData.thawMethod,
        washCount: parseInt(actionFormData.washCount),
        washMediaId: actionFormData.washMediaId,
        cellCount: parseInt(actionFormData.cellCount),
        viability: parseFloat(actionFormData.viability),
        containerType: actionFormData.containerType,
        containerCount: parseInt(actionFormData.containerCount),
        seedingMediaId: actionFormData.seedingMediaId,
        seedingMediaVolume: parseFloat(actionFormData.seedingMediaVolume)
      }
    });

    // Логирование утилизации в журнал
    if (actionType === 'dispose') {
      addDisposal({
        objectType: 'storage',
        objectId: selectedStorage.id,
        donorId: selectedStorage.donorId,
        cellType: selectedStorage.cellType,
        tubeCount: tubesUsed,
        reason: (actionFormData.reason as 'contamination' | 'expired' | 'quality_failure' | 'no_demand' | 'damage' | 'other') || 'other',
        reasonDetails: actionFormData.notes,
        quantity: `${tubesUsed} пробирок`,
        disposalDate: new Date().toISOString(),
        operatorName: 'Оператор'
      });
    }

    // Логирование выдачи в журнал
    if (actionType === 'release') {
      addRelease({
        sourceType: 'storage',
        sourceId: selectedStorage.id,
        donorId: selectedStorage.donorId,
        cellType: selectedStorage.cellType,
        applicationType: (actionFormData.purpose as 'clinical' | 'research' | 'scientific') || 'research',
        recipientName: actionFormData.recipient,
        recipientContact: '',
        quantity: `${tubesUsed} пробирок`,
        releaseDate: new Date().toISOString(),
        operatorName: 'Оператор',
        status: 'confirmed'
      });
    }

    // Обновляем статус хранения
    if (remainingTubes <= 0) {
      updateStorage(selectedStorage.id, { 
        status: actionType === 'dispose' ? 'disposed' : 'released',
        tubeCount: 0
      });
    } else {
      updateStorage(selectedStorage.id, { 
        status: 'partially_retrieved',
        tubeCount: remainingTubes
      });
    }

    // При размораживании создаём рабочую культуру
    if (actionType === 'thaw') {
      const cellCount = parseInt(actionFormData.cellCount) || 0;
      const viability = parseFloat(actionFormData.viability) || 0;
      const containerCount = parseInt(actionFormData.containerCount) || 1;
      
      addCulture({
        donorId: selectedStorage.donorId,
        donationId: '',
        cellType: selectedStorage.cellType,
        passageNumber: 1,
        status: 'in_work',
        containerType: actionFormData.containerType,
        containerCount: containerCount,
        containers: [{ type: actionFormData.containerType, count: containerCount }],
        cellCount: cellCount,
        viability: viability,
        isSterile: true
      });
      
      // Списать среду для рассева
      if (actionFormData.seedingMediaId && actionFormData.seedingMediaVolume) {
        const usedMedia = safeMedia.find(m => m.id === actionFormData.seedingMediaId);
        if (usedMedia) {
          const vol = parseFloat(actionFormData.seedingMediaVolume) || 0;
          updateMedia(usedMedia.id, { 
            remainingVolume: Math.max(0, usedMedia.remainingVolume - vol)
          });
        }
      }
    }

    setIsActionModalOpen(false);
  };

  const filteredStorages = (storages || []).filter(s => {
    const matchesSearch = String(s.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cellType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const frozenCultures = (cultures || []).filter(c => c.status === 'frozen');
  const availableMasterBanks = (masterBanks || []).filter(m => m.status === 'stored' || m.status === 'partially_used');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Хранение</h1>
          <p className="text-slate-500">Управление криохранилищем</p>
        </div>
        {canEdit() && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" /> Добавить в хранилище
          </Button>
        )}
      </div>

      <Card>
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg" />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Все статусы' },
              { value: 'stored', label: 'Хранится' },
              { value: 'partially_retrieved', label: 'Частично извлечён' },
              { value: 'released', label: 'Выдан' },
              { value: 'disposed', label: 'Утилизирован' }
            ]}
          />
        </div>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-emerald-600">{(storages || []).filter(s => s.status === 'stored').length}</div>
          <div className="text-sm text-slate-500">На хранении</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-amber-600">{(storages || []).filter(s => s.status === 'partially_retrieved').length}</div>
          <div className="text-sm text-slate-500">Частично извлечено</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-blue-600">{(storages || []).reduce((sum, s) => sum + (s.status === 'stored' || s.status === 'partially_retrieved' ? s.tubeCount : 0), 0)}</div>
          <div className="text-sm text-slate-500">Всего пробирок</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-slate-600">{cryoStorages.length}</div>
          <div className="text-sm text-slate-500">Криохранилищ</div>
        </Card>
      </div>

      {filteredStorages.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStorages.map(s => {
            const donor = safeDonors.find(d => d.id === s.donorId);
            const isActive = s.status === 'stored' || s.status === 'partially_retrieved';
            return (
              <Card key={s.id}>
                <div className="flex justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{s.id}</h3>
                    <p className="text-slate-600">{s.cellType}</p>
                  </div>
                  <StatusBadge status={s.status} label={statusLabels[s.status]} color={statusColors[s.status]} />
                </div>
                <div className="space-y-2 p-3 bg-slate-50 rounded-lg text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Донор:</span><span className="font-medium">{donor?.fullName || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Пробирок:</span><span className="font-medium">{s.tubeCount}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Клеток/пробирка:</span><span className="font-medium">{s.cellsPerTube?.toLocaleString() || '—'}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Позиция:</span>
                    <span className="font-medium text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {s.location.equipment} / {s.location.shelf} / {s.location.box} / {s.location.position}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-slate-500">Температура:</span><span className="font-medium">{s.temperature}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Дата:</span><span className="font-medium">{formatDateTime(s.storageDate)}</span></div>
                  {s.expiryDate && (
                    <div className="flex justify-between"><span className="text-slate-500">Годен до:</span><span className="font-medium">{new Date(s.expiryDate).toLocaleDateString('ru-RU')}</span></div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => generateStoragePassport(s, donor!, safeMasterBanks.find(m => m.id === s.masterBankId), safeCultures.find(c => c.id === s.sourceCultureId))}>
                    <FileText className="w-3 h-3" /> Паспорт
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => printStorageLabels(s, donor?.fullName || '', donor?.id || '', s.masterBankId || s.sourceCultureId)}>
                    <Printer className="w-3 h-3" /> Этикетки
                  </Button>
                </div>
                {isActive && canEdit() && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="secondary" onClick={() => handleOpenAction(s, 'thaw')}>
                      <Snowflake className="w-3 h-3" /> Разморозить
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenAction(s, 'release')}>
                      <Send className="w-3 h-3" /> Выдать
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleOpenAction(s, 'dispose')}>
                      <Trash2 className="w-3 h-3" /> Утиль
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><EmptyState icon={Package} title="Хранилище пусто" description="Добавьте материал в криохранилище" /></Card>
      )}

      {/* Модальное окно добавления */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Добавление в хранилище" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Тип источника" value={formData.sourceType} onChange={(e) => setFormData({...formData, sourceType: e.target.value, sourceId: ''})} options={[{value: 'culture', label: 'Культура'}, {value: 'masterbank', label: 'Мастер-банк'}]} />
          <Select label="Источник" value={formData.sourceId} onChange={(e) => setFormData({...formData, sourceId: e.target.value})} options={[{value: '', label: 'Выберите...'}, ...(formData.sourceType === 'culture' ? frozenCultures.map(c => ({value: c.id, label: `${c.id} - ${c.cellType}`})) : availableMasterBanks.map(m => ({value: m.id, label: `${m.id} - ${m.cellType}`})))]} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Тип клеток" value={formData.cellType} onChange={(e) => setFormData({...formData, cellType: e.target.value})} required />
            <Input label="Кол-во пробирок" type="number" value={formData.tubeCount} onChange={(e) => setFormData({...formData, tubeCount: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Клеток в пробирке" type="number" value={formData.cellsPerTube} onChange={(e) => setFormData({...formData, cellsPerTube: e.target.value})} />
            <Select label="Фаза азота" value={formData.nitrogenPhase} onChange={(e) => setFormData({...formData, nitrogenPhase: e.target.value as 'liquid' | 'vapor'})} options={[{value: 'liquid', label: 'Жидкая фаза'}, {value: 'vapor', label: 'Паровая фаза'}]} />
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-700 mb-3">Расположение</h4>
            <Select 
              label="Криохранилище" 
              value={formData.equipment} 
              onChange={(e) => setFormData({...formData, equipment: e.target.value})} 
              options={[
                {value: '', label: 'Выберите криохранилище'},
                ...cryoStorages.map(eq => ({value: eq.name, label: `${eq.name} (${eq.manufacturer})`}))
              ]} 
              required 
            />
            <div className="grid grid-cols-4 gap-3 mt-3">
              <Input label="Полка" value={formData.shelf} onChange={(e) => setFormData({...formData, shelf: e.target.value})} required />
              <Input label="Штатив" value={formData.rack} onChange={(e) => setFormData({...formData, rack: e.target.value})} required />
              <Input label="Коробка" value={formData.box} onChange={(e) => setFormData({...formData, box: e.target.value})} required />
              <Input label="Позиция" value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} placeholder="A1" required />
            </div>
          </div>
          
          <Input label="Срок годности" type="date" value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">Добавить</Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно действия */}
      <Modal 
        isOpen={isActionModalOpen} 
        onClose={() => setIsActionModalOpen(false)} 
        title={actionType === 'thaw' ? 'Размораживание' : actionType === 'release' ? 'Выдача' : 'Утилизация'}
      >
        <form onSubmit={handleActionSubmit} className="space-y-4">
          {selectedStorage && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p><strong>Образец:</strong> {selectedStorage.id}</p>
              <p><strong>Доступно пробирок:</strong> {selectedStorage.tubeCount}</p>
            </div>
          )}
          
          <Input 
            label="Количество пробирок" 
            type="number" 
            value={actionFormData.tubeCount} 
            onChange={(e) => setActionFormData({...actionFormData, tubeCount: e.target.value})}
            max={selectedStorage?.tubeCount}
            required 
          />
          
          {actionType === 'thaw' && (
            <>
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-slate-700 mb-3">Параметры размораживания</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Select 
                    label="Метод размораживания" 
                    value={actionFormData.thawMethod} 
                    onChange={(e) => setActionFormData({...actionFormData, thawMethod: e.target.value})}
                    options={[
                      {value: 'water_bath_37', label: 'Водяная баня 37°C'},
                      {value: 'water_bath_40', label: 'Водяная баня 40°C'},
                      {value: 'dry_bath_37', label: 'Сухая баня 37°C'},
                      {value: 'hands', label: 'В руках'},
                      {value: 'other', label: 'Другой'}
                    ]}
                  />
                  <Input 
                    label="Количество очисток" 
                    type="number" 
                    value={actionFormData.washCount} 
                    onChange={(e) => setActionFormData({...actionFormData, washCount: e.target.value})}
                    placeholder="напр. 2"
                  />
                </div>
                <Select 
                  label="Среда для очистки" 
                  value={actionFormData.washMediaId} 
                  onChange={(e) => setActionFormData({...actionFormData, washMediaId: e.target.value})}
                  options={[
                    {value: '', label: 'Выберите среду'},
                    ...approvedMedia.map(m => ({value: m.id, label: `${m.name} (${m.remainingVolume} ${m.unit})`}))
                  ]}
                />
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-slate-700 mb-3">Параметры культуры</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Количество клеток *" 
                    type="number" 
                    value={actionFormData.cellCount} 
                    onChange={(e) => setActionFormData({...actionFormData, cellCount: e.target.value})}
                    placeholder="напр. 1000000"
                    required
                  />
                  <Input 
                    label="Жизнеспособность (%) *" 
                    type="number" 
                    value={actionFormData.viability} 
                    onChange={(e) => setActionFormData({...actionFormData, viability: e.target.value})}
                    placeholder="напр. 85"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <Select 
                    label="Тип посуды" 
                    value={actionFormData.containerType} 
                    onChange={(e) => setActionFormData({...actionFormData, containerType: e.target.value})}
                    options={(containerTypes || []).filter(c => c.is_active).map(c => ({value: c.name, label: c.name}))}
                  />
                  <Input 
                    label="Количество посуды *" 
                    type="number" 
                    value={actionFormData.containerCount} 
                    onChange={(e) => setActionFormData({...actionFormData, containerCount: e.target.value})}
                    placeholder="напр. 2"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <Select 
                    label="Среда для рассева" 
                    value={actionFormData.seedingMediaId} 
                    onChange={(e) => setActionFormData({...actionFormData, seedingMediaId: e.target.value})}
                    options={[
                      {value: '', label: 'Выберите среду'},
                      ...approvedMedia.map(m => ({value: m.id, label: `${m.name} (${m.remainingVolume} ${m.unit})`}))
                    ]}
                  />
                  <Input 
                    label="Объём среды (мл)" 
                    type="number" 
                    value={actionFormData.seedingMediaVolume} 
                    onChange={(e) => setActionFormData({...actionFormData, seedingMediaVolume: e.target.value})}
                    placeholder="напр. 5"
                  />
                </div>
              </div>
            </>
          )}
          
          {actionType === 'release' && (
            <>
              <Select 
                label="Цель выдачи" 
                value={actionFormData.purpose} 
                onChange={(e) => setActionFormData({...actionFormData, purpose: e.target.value as 'clinical' | 'research' | 'scientific'})}
                options={[
                  {value: 'clinical', label: 'Клиническое применение'},
                  {value: 'research', label: 'Исследование'},
                  {value: 'scientific', label: 'Научная работа'}
                ]}
              />
              <Input 
                label="Получатель" 
                value={actionFormData.recipient} 
                onChange={(e) => setActionFormData({...actionFormData, recipient: e.target.value})}
                placeholder="ФИО или организация"
              />
            </>
          )}
          
          {actionType === 'dispose' && (
            <Select 
              label="Причина утилизации" 
              value={actionFormData.reason} 
              onChange={(e) => setActionFormData({...actionFormData, reason: e.target.value})}
              options={[
                {value: '', label: 'Выберите причину'},
                {value: 'expired', label: 'Истёк срок годности'},
                {value: 'contamination', label: 'Контаминация'},
                {value: 'quality', label: 'Низкое качество'},
                {value: 'damage', label: 'Повреждение'},
                {value: 'other', label: 'Другое'}
              ]}
              required
            />
          )}
          
          <Textarea 
            label="Примечания" 
            value={actionFormData.notes} 
            onChange={(e) => setActionFormData({...actionFormData, notes: e.target.value})}
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsActionModalOpen(false)}>Отмена</Button>
            <Button type="submit" variant={actionType === 'dispose' ? 'danger' : 'primary'}>
              {actionType === 'thaw' ? 'Разморозить' : actionType === 'release' ? 'Выдать' : 'Утилизировать'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
