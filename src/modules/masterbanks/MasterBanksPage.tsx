// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, Textarea, StatusBadge, EmptyState } from '../../components/UI';
import { Database, Plus, Search, FileText, Printer, Snowflake, Send, Trash2 } from 'lucide-react';
import { MasterBank } from '../../types';
import { formatDateTime } from '../../utils';
import { generateMasterBankReport, printCryotubeLabel } from '../../utils/pdf';


const statusLabels: Record<string, string> = {
  stored: 'Хранится',
  partially_used: 'Частично использован',
  fully_used: 'Полностью использован',
  disposed: 'Утилизирован'
};

const statusColors: Record<string, string> = {
  stored: 'green',
  partially_used: 'yellow',
  fully_used: 'blue',
  disposed: 'red'
};

export const MasterBanksPage: React.FC = () => {
  const { masterBanks, cultures, donors, equipment, media, containerTypes, manipulations, addMasterBank, addStorage, updateCulture, addManipulation, updateMasterBank, addCulture, updateMedia, addDisposal, addRelease } = useApp();
  const safeCultures = cultures || [];
  const safeMedia = media || [];
  const safeDonors = donors || [];
  const { canEdit } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedMasterBank, setSelectedMasterBank] = useState<MasterBank | null>(null);
  const [actionType, setActionType] = useState<'thaw' | 'release' | 'dispose'>('thaw');
  const [actionFormData, setActionFormData] = useState({
    tubeCount: '1',
    thawMethod: 'water_bath_37',
    washCount: '2',
    washMediaId: '',
    washVolume: '', // Объём раствора для отмывки
    cellCount: '',
    viability: '',
    thawContainers: [{ type: 'Флакон T-25', count: 1, mediaId: '', volume: '' }] as { type: string; count: number; mediaId: string; volume: string }[],
    recipient: '',
    purpose: 'clinical' as 'clinical' | 'research' | 'scientific',
    reason: '',
    notes: ''
  });

  // Площади культуральной посуды (см²)
  const CONTAINER_AREAS: Record<string, number> = {
    'Флакон T-25': 25,
    'Флакон T-75': 75,
    'Флакон T-175': 175,
    'Чашка Петри 35мм': 9.6,
    'Чашка Петри 60мм': 21,
    'Чашка Петри 100мм': 56,
    '6-лунка': 9.5,
    '12-лунка': 3.8,
    '24-лунка': 1.9
  };

  // Расчёт плотности клеток при рассеивании
  const calculateCellDensity = () => {
    const totalCells = parseInt(actionFormData.cellCount) || 0;
    const containers = actionFormData.thawContainers;
    const totalContainers = containers.reduce((sum, c) => sum + c.count, 0);
    const totalArea = containers.reduce((sum, c) => sum + (CONTAINER_AREAS[c.type] || 25) * c.count, 0);
    
    return {
      cellsPerContainer: totalContainers > 0 ? Math.round(totalCells / totalContainers) : 0,
      cellsPerCm2: totalArea > 0 ? Math.round(totalCells / totalArea) : 0
    };
  };
  
  const approvedMedia = (media || []).filter((m: any) => m.status === 'approved' && (m.remainingVolume || m.remaining_ml) > 0);
  const [formData, setFormData] = useState({
    sourceCultureId: '',
    cellType: 'МСК',
    cellCountAtFreeze: '',
    viabilityAtFreeze: '',
    cryoprotectant: 'DMSO 10%',
    freezeProtocol: 'Контролируемое замораживание',
    tubeCount: '',
    cellsPerTube: '',
    storageConditions: '-196°C жидкий азот',
    safetyTestResults: '',
    storageEquipment: '',
    storageShelf: '',
    storageRack: '',
    storageBox: '',
    storagePosition: ''
  });

  // Автозаполнение при выборе культуры
  const handleCultureSelect = (cultureId: string) => {
    const culture = (cultures || []).find((c: any) => c.id === cultureId);
    setFormData(prev => ({
      ...prev,
      sourceCultureId: cultureId,
      cellType: culture?.cellType || culture?.cell_type || 'МСК'
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const culture = (cultures || []).find((c: any) => c.id === formData.sourceCultureId);
    if (!culture) return;
    
    // 1. Создаём мастер-банк
    const newMasterBank = addMasterBank({
      donationId: culture.donationId,
      donorId: culture.donorId,
      sourceCultureId: formData.sourceCultureId,
      cellType: formData.cellType,
      cellCountAtFreeze: parseInt(formData.cellCountAtFreeze) || 0,
      viabilityAtFreeze: parseFloat(formData.viabilityAtFreeze) || 0,
      cryoprotectant: formData.cryoprotectant,
      freezeProtocol: formData.freezeProtocol,
      tubeCount: parseInt(formData.tubeCount) || 0,
      cellsPerTube: parseInt(formData.cellsPerTube) || 0,
      storageConditions: formData.storageConditions,
      safetyTestResults: formData.safetyTestResults,
      status: 'stored'
    });

    // 2. Создаём запись хранения для мастер-банка
    addStorage({
      masterBankId: newMasterBank.id,
      donorId: culture.donorId,
      cellType: formData.cellType,
      tubeCount: parseInt(formData.tubeCount) || 0,
      cellsPerTube: parseInt(formData.cellsPerTube) || 0,
      location: {
        equipment: formData.storageEquipment,
        shelf: formData.storageShelf,
        rack: formData.storageRack,
        box: formData.storageBox,
        position: formData.storagePosition
      },
      storageDate: new Date().toISOString(),
      temperature: formData.storageConditions,
      nitrogenPhase: 'liquid',
      status: 'stored'
    });

    // 3. Регистрируем манипуляцию заморозки
    addManipulation({
      type: 'freezing',
      targetId: culture.id,
      targetType: 'culture',
      operatorName: 'Оператор',
      dateTime: new Date().toISOString(),
      notes: `Создан мастер-банк ${newMasterBank.id}`
    });

    // 4. Обновляем статус исходной культуры
    updateCulture(culture.id, { status: 'frozen' });

    setIsModalOpen(false);
    // Сбрасываем форму
    setFormData({
      sourceCultureId: '',
      cellType: 'МСК',
      cellCountAtFreeze: '',
      viabilityAtFreeze: '',
      cryoprotectant: 'DMSO 10%',
      freezeProtocol: 'Контролируемое замораживание',
      tubeCount: '',
      cellsPerTube: '',
      storageConditions: '-196°C жидкий азот',
      safetyTestResults: '',
      storageEquipment: '',
      storageShelf: '',
      storageRack: '',
      storageBox: '',
      storagePosition: ''
    });
  };

  const filteredBanks = (masterBanks || []).filter(mb =>
    String(mb.id).includes(searchQuery.toLowerCase()) ||
    mb.cellType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Для мастер-банка подходят ПЕРВИЧНЫЕ культуры в работе (P0)
  const eligibleCultures = (cultures || []).filter(c => c.status === 'in_work' && c.passageNumber === 0);

  const handleOpenAction = (mb: MasterBank, type: 'thaw' | 'release' | 'dispose') => {
    setSelectedMasterBank(mb);
    setActionType(type);
    setActionFormData({
      tubeCount: type === 'dispose' ? String(mb.tubeCount) : '1',
      thawMethod: 'water_bath_37',
      washCount: '2',
      washMediaId: '',
      cellCount: '',
      viability: '',
      thawContainers: [{ type: 'Флакон T-25', count: 1, mediaId: '', volume: '' }],
      washVolume: '',
      recipient: '',
      purpose: 'clinical',
      reason: '',
      notes: ''
    });
    setIsActionModalOpen(true);
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMasterBank) return;

    const tubesUsed = parseInt(actionFormData.tubeCount) || 0;
    const remainingTubes = selectedMasterBank.tubeCount - tubesUsed;

    // Регистрируем манипуляцию
    addManipulation({
      type: actionType === 'thaw' ? 'thawing' : actionType === 'release' ? 'release' : 'disposal',
      targetId: selectedMasterBank.id,
      targetType: 'masterbank',
      operatorName: 'Оператор',
      dateTime: new Date().toISOString(),
      notes: actionFormData.notes,
      parameters: {
        tubesUsed,
        remainingTubes,
        thawMethod: actionFormData.thawMethod,
        washCount: parseInt(actionFormData.washCount),
        washMediaId: actionFormData.washMediaId,
        washVolume: parseFloat(actionFormData.washVolume) || 0,
        cellCount: parseInt(actionFormData.cellCount),
        viability: parseFloat(actionFormData.viability),
        thawContainers: actionFormData.thawContainers,
        recipient: actionFormData.recipient,
        purpose: actionFormData.purpose,
        reason: actionFormData.reason
      }
    });

    // Обновляем статус мастер-банка
    if (remainingTubes <= 0) {
      updateMasterBank(selectedMasterBank.id, { 
        status: actionType === 'dispose' ? 'disposed' : 'fully_used',
        tubeCount: 0
      });
    } else {
      updateMasterBank(selectedMasterBank.id, { 
        status: 'partially_used',
        tubeCount: remainingTubes
      });
    }

    // Регистрируем в журнале утилизации
    if (actionType === 'dispose') {
      addDisposal({
        objectType: 'masterbank',
        objectId: selectedMasterBank.id,
        donorId: selectedMasterBank.donorId,
        cellType: selectedMasterBank.cellType,
        reason: 'other',
        reasonDetails: actionFormData.reason || actionFormData.notes,
        quantity: `${tubesUsed} пробирок`,
        tubeCount: tubesUsed,
        disposalDate: new Date().toISOString(),
        operatorName: 'Оператор'
      });
    }

    // Регистрируем в журнале выдачи
    if (actionType === 'release') {
      addRelease({
        sourceType: 'masterbank',
        sourceId: selectedMasterBank.id,
        donorId: selectedMasterBank.donorId,
        cellType: selectedMasterBank.cellType,
        applicationType: actionFormData.purpose,
        recipientName: actionFormData.recipient,
        recipientOrg: '',
        recipientContact: '',
        quantity: `${tubesUsed} пробирок`,
        tubeCount: tubesUsed,
        releaseDate: new Date().toISOString(),
        operatorName: 'Оператор',
        status: 'pending',
        notes: actionFormData.notes
      });
    }

    // При размораживании создаём новую культуру с наследованием данных
    if (actionType === 'thaw') {
      const cellCount = parseInt(actionFormData.cellCount) || 0;
      const viability = parseFloat(actionFormData.viability) || 0;
      const containers = actionFormData.thawContainers.map(c => ({ type: c.type, count: c.count, mediaId: c.mediaId, volume: parseFloat(c.volume) || 0 }));
      const totalContainerCount = containers.reduce((sum, c) => sum + c.count, 0);
      
      // Получаем материнскую культуру для наследования данных
      const sourceCulture = safeCultures.find(c => c.id === selectedMasterBank.sourceCultureId);
      const passageFromMB = selectedMasterBank.passageNumber ?? sourceCulture?.passageNumber ?? 0;
      
      // Наследуем историю конфлюэнтности
      const inheritedConfluencyHistory = sourceCulture?.confluencyHistory || [];
      
      addCulture({
        donorId: selectedMasterBank.donorId,
        donationId: selectedMasterBank.donationId,
        cellType: selectedMasterBank.cellType,
        passageNumber: passageFromMB + 1, // Пассаж из мастер-банка + 1
        status: 'in_work',
        containerType: containers[0]?.type || 'Флакон T-25',
        containerCount: totalContainerCount,
        containers: containers,
        cellCount: cellCount,
        viability: viability,
        isSterile: true,
        parentCultureId: selectedMasterBank.sourceCultureId,
        rootCultureId: sourceCulture?.rootCultureId || sourceCulture?.id,
        totalDoublings: sourceCulture?.totalDoublings || 0,
        growthRate: sourceCulture?.growthRate,
        lastCellCount: cellCount || undefined,
        lastCellCountDate: new Date().toISOString(),
        confluencyHistory: inheritedConfluencyHistory
      });
      
      // Списать среды для рассева
      for (const container of actionFormData.thawContainers) {
        if (container.mediaId && container.volume) {
          const usedMedia = safeMedia.find(m => m.id === container.mediaId);
          if (usedMedia) {
            const vol = parseFloat(container.volume) * container.count;
            updateMedia(usedMedia.id, { 
              remainingVolume: Math.max(0, usedMedia.remainingVolume - vol)
            });
          }
        }
      }
    }

    setIsActionModalOpen(false);
  };
  
  // Криохранилища для выбора места
  const cryoStorages = (equipment || []).filter((e: any) => (e.equipmentType || e.type) === 'cryostorage' && e.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Мастер-банк</h1>
          <p className="text-slate-500">Управление криоконсервированным материалом</p>
        </div>
{canEdit() && <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> Создать мастер-банк
        </Button>}
      </div>

      <Card>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg"
          />
        </div>
      </Card>

      {filteredBanks.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredBanks.map(mb => {
            const donor = safeDonors.find(d => d.id === mb.donorId);
            // Подсчёт размороженных пробирок
            const thawedManips = manipulations.filter(m => m.targetId === mb.id && m.type === 'thawing');
            const thawedTubes = thawedManips.reduce((sum, m) => sum + (Number(m.parameters?.tubesUsed) || 0), 0);
            const totalCells = (mb.cellsPerTube || 0) * (mb.tubeCount + thawedTubes);
            const remainingCells = (mb.cellsPerTube || 0) * mb.tubeCount;
            return (
              <Card key={mb.id}>
                <div className="flex justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{mb.id}</h3>
                    <p className="text-slate-600">{mb.cellType}</p>
                  </div>
                  <StatusBadge status={mb.status} label={statusLabels[mb.status]} color={statusColors[mb.status]} />
                </div>
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
                  <div><p className="text-xs text-slate-500">Донор</p><p className="text-sm font-medium">{donor?.fullName || '—'}</p></div>
                  <div><p className="text-xs text-slate-500">Пассаж</p><p className="text-sm font-medium">P{mb.passageNumber ?? 0}</p></div>
                  <div>
                    <p className="text-xs text-slate-500">Пробирок (всего/осталось)</p>
                    <p className="text-sm font-medium">{mb.tubeCount + thawedTubes} / <span className={mb.tubeCount === 0 ? 'text-red-600' : 'text-green-600'}>{mb.tubeCount}</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Разморожено</p>
                    <p className="text-sm font-medium">{thawedTubes > 0 ? `${thawedTubes} проб.` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Клеток всего</p>
                    <p className="text-sm font-medium">{totalCells.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Клеток осталось</p>
                    <p className="text-sm font-medium">{remainingCells.toLocaleString()}</p>
                  </div>
                  <div><p className="text-xs text-slate-500">Жизнеспособность</p><p className="text-sm font-medium">{mb.viabilityAtFreeze}%</p></div>
                  <div><p className="text-xs text-slate-500">Криопротектор</p><p className="text-sm font-medium">{mb.cryoprotectant}</p></div>
                  <div><p className="text-xs text-slate-500">Создан</p><p className="text-sm font-medium">{formatDateTime(mb.createdAt)}</p></div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                  <Button size="sm" variant="secondary" onClick={() => {
                    const donation = { id: mb.donationId, materialType: mb.cellType, dateTime: mb.createdAt } as any;
                    const sourceCulture = safeCultures.find(c => c.id === mb.sourceCultureId);
                    generateMasterBankReport(mb, donor!, donation, sourceCulture);
                  }}>
                    <FileText className="w-3 h-3" /> Паспорт PDF
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => {
                    for (let i = 1; i <= mb.tubeCount; i++) {
                      printCryotubeLabel(mb, i, donor?.fullName || '', donor?.id, mb.donationId, mb.createdAt);
                    }
                  }}>
                    <Printer className="w-3 h-3" /> Этикетки ({mb.tubeCount})
                  </Button>
                </div>
                {canEdit() && (mb.status === 'stored' || mb.status === 'partially_used') && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                    <Button size="sm" variant="secondary" onClick={() => handleOpenAction(mb, 'thaw')}>
                      <Snowflake className="w-3 h-3" /> Разморозить
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenAction(mb, 'release')}>
                      <Send className="w-3 h-3" /> Выдать
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleOpenAction(mb, 'dispose')}>
                      <Trash2 className="w-3 h-3" /> Утилизация
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><EmptyState icon={Database} title="Мастер-банки не найдены" description="Создайте мастер-банк из замороженной культуры" /></Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Создание мастер-банка" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Исходная культура" value={formData.sourceCultureId} onChange={(e) => handleCultureSelect(e.target.value)} options={[{value: '', label: 'Выберите культуру'}, ...eligibleCultures.map(c => ({value: c.id, label: `${c.id} - ${c.cellType} (P${c.passageNumber})`}))]} required />
          <Input label="Тип клеток" value={formData.cellType} onChange={(e) => setFormData({...formData, cellType: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Кол-во клеток при заморозке" type="number" value={formData.cellCountAtFreeze} onChange={(e) => setFormData({...formData, cellCountAtFreeze: e.target.value})} required />
            <Input label="Жизнеспособность (%)" type="number" value={formData.viabilityAtFreeze} onChange={(e) => setFormData({...formData, viabilityAtFreeze: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Кол-во пробирок" type="number" value={formData.tubeCount} onChange={(e) => setFormData({...formData, tubeCount: e.target.value})} required />
            <Input label="Клеток в пробирке" type="number" value={formData.cellsPerTube} onChange={(e) => setFormData({...formData, cellsPerTube: e.target.value})} required />
          </div>
          <Input label="Криопротектор" value={formData.cryoprotectant} onChange={(e) => setFormData({...formData, cryoprotectant: e.target.value})} />
          <Input label="Протокол заморозки" value={formData.freezeProtocol} onChange={(e) => setFormData({...formData, freezeProtocol: e.target.value})} />
          <Input label="Условия хранения" value={formData.storageConditions} onChange={(e) => setFormData({...formData, storageConditions: e.target.value})} />
          <Textarea label="Результаты тестов безопасности" value={formData.safetyTestResults} onChange={(e) => setFormData({...formData, safetyTestResults: e.target.value})} />
          
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-slate-700 mb-3">Место хранения</h4>
            <Select label="Криохранилище" value={formData.storageEquipment} onChange={(e) => setFormData({...formData, storageEquipment: e.target.value})} options={[{value: '', label: 'Выберите криохранилище'}, ...cryoStorages.map(eq => ({value: eq.name, label: `${eq.name} (${eq.manufacturer})`}))]} required />
            <div className="grid grid-cols-4 gap-3 mt-3">
              <Input label="Полка" value={formData.storageShelf} onChange={(e) => setFormData({...formData, storageShelf: e.target.value})} required />
              <Input label="Штатив" value={formData.storageRack} onChange={(e) => setFormData({...formData, storageRack: e.target.value})} required />
              <Input label="Коробка" value={formData.storageBox} onChange={(e) => setFormData({...formData, storageBox: e.target.value})} required />
              <Input label="Позиция" value={formData.storagePosition} onChange={(e) => setFormData({...formData, storagePosition: e.target.value})} placeholder="A1" required />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">Создать</Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно действий */}
      <Modal 
        isOpen={isActionModalOpen} 
        onClose={() => setIsActionModalOpen(false)} 
        title={actionType === 'thaw' ? 'Размораживание из мастер-банка' : actionType === 'release' ? 'Выдача' : 'Утилизация'}
        size="lg"
      >
        <form onSubmit={handleActionSubmit} className="space-y-4">
          {selectedMasterBank && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p><strong>Мастер-банк:</strong> {selectedMasterBank.id}</p>
              <p><strong>Тип клеток:</strong> {selectedMasterBank.cellType}</p>
              <p><strong>Доступно пробирок:</strong> {selectedMasterBank.tubeCount}</p>
              {actionType === 'thaw' && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="font-medium text-slate-700 mb-1">Данные при заморозке:</p>
                  <p><strong>Клеток в пробирке:</strong> {selectedMasterBank.cellsPerTube?.toLocaleString()}</p>
                  <p><strong>Жизнеспособность:</strong> {selectedMasterBank.viabilityAtFreeze}%</p>
                  <p><strong>Криопротектор:</strong> {selectedMasterBank.cryoprotectant}</p>
                </div>
              )}
            </div>
          )}
          
          <Input 
            label="Количество пробирок" 
            type="number" 
            value={actionFormData.tubeCount} 
            onChange={(e) => setActionFormData({...actionFormData, tubeCount: e.target.value})}
            max={selectedMasterBank?.tubeCount}
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
                <div className="grid grid-cols-2 gap-4">
                  <Select 
                    label="Среда для очистки" 
                    value={actionFormData.washMediaId} 
                    onChange={(e) => setActionFormData({...actionFormData, washMediaId: e.target.value})}
                    options={[
                      {value: '', label: 'Выберите среду'},
                      ...approvedMedia.map(m => ({value: m.id, label: `${m.name} (${m.remainingVolume} ${m.unit})`}))
                    ]}
                  />
                  <Input 
                    label="Объём отмывки (мл)" 
                    type="number" 
                    step="0.1"
                    value={actionFormData.washVolume} 
                    onChange={(e) => setActionFormData({...actionFormData, washVolume: e.target.value})}
                    placeholder="напр. 10"
                  />
                </div>
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
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Посуда и среды для рассева *</span>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setActionFormData({
                      ...actionFormData, 
                      thawContainers: [...actionFormData.thawContainers, { type: 'Флакон T-25', count: 1, mediaId: '', volume: '' }]
                    })}>
                      + Тип посуды
                    </Button>
                  </div>
                  {actionFormData.thawContainers.map((container, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg mb-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Тип #{idx + 1}</span>
                        {actionFormData.thawContainers.length > 1 && (
                          <button type="button" onClick={() => setActionFormData({
                            ...actionFormData,
                            thawContainers: actionFormData.thawContainers.filter((_, i) => i !== idx)
                          })} className="text-red-500 text-xs">Удалить</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={container.type} onChange={(e) => {
                          const updated = [...actionFormData.thawContainers];
                          updated[idx] = { ...updated[idx], type: e.target.value };
                          setActionFormData({ ...actionFormData, thawContainers: updated });
                        }} options={(containerTypes || []).filter(c => c.is_active).map(c => ({value: c.name, label: c.name}))} />
                        <Input type="number" value={container.count.toString()} onChange={(e) => {
                          const updated = [...actionFormData.thawContainers];
                          updated[idx] = { ...updated[idx], count: parseInt(e.target.value) || 1 };
                          setActionFormData({ ...actionFormData, thawContainers: updated });
                        }} placeholder="Кол-во" min={1} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Select value={container.mediaId} onChange={(e) => {
                          const updated = [...actionFormData.thawContainers];
                          updated[idx] = { ...updated[idx], mediaId: e.target.value };
                          setActionFormData({ ...actionFormData, thawContainers: updated });
                        }} options={[
                          {value: '', label: 'Среда'},
                          ...approvedMedia.map(m => ({value: m.id, label: `${m.name} (${m.remainingVolume})`}))
                        ]} />
                        <Input type="number" step="0.1" value={container.volume} onChange={(e) => {
                          const updated = [...actionFormData.thawContainers];
                          updated[idx] = { ...updated[idx], volume: e.target.value };
                          setActionFormData({ ...actionFormData, thawContainers: updated });
                        }} placeholder="Объём (мл)" />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">Итого: {actionFormData.thawContainers.reduce((sum, c) => sum + c.count, 0)} ед. посуды</p>
                  {actionFormData.cellCount && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                      <p><strong>Расчёт плотности:</strong></p>
                      <p>≈ {calculateCellDensity().cellsPerContainer.toLocaleString()} клеток на 1 ед. посуды</p>
                      <p>≈ {calculateCellDensity().cellsPerCm2.toLocaleString()} клеток/см²</p>
                    </div>
                  )}
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
                required
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
