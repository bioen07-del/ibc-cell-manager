// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, Textarea, EmptyState } from '../../components/UI';
import { Trash2, Plus, Search, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '../../utils';

const reasonLabels: Record<string, string> = {
  contamination: 'Контаминация',
  expired: 'Истёк срок годности',
  quality_failure: 'Не прошёл контроль качества',
  no_demand: 'Нет востребованности',
  damage: 'Повреждение',
  other: 'Другое'
};

const objectTypeLabels: Record<string, string> = {
  culture: 'Культура',
  storage: 'Хранилище',
  masterbank: 'Мастер-банк',
  media: 'Среда/реактив'
};

export const DisposalsPage: React.FC = () => {
  const { disposals, cultures, storages, masterBanks, media, donors, addDisposal, updateCulture, updateStorage, updateMasterBank, updateMedia, addManipulation } = useApp();
  const { canEdit } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    objectType: 'culture' as 'culture' | 'storage' | 'masterbank' | 'donation' | 'media',
    objectId: '',
    reason: 'contamination' as 'contamination' | 'expired' | 'quality_failure' | 'no_demand' | 'damage' | 'other',
    reasonDetails: '',
    quantity: '',
    tubeCount: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Получаем информацию о доноре
    let donorId = '';
    let cellType = '';
    const safeCultures = cultures || [];
    const safeStorages = storages || [];
    const safeMasterBanks = masterBanks || [];
    if (formData.objectType === 'culture') {
      const culture = safeCultures.find(c => c.id === formData.objectId);
      donorId = culture?.donorId || '';
      cellType = culture?.cellType || '';
    } else if (formData.objectType === 'storage') {
      const storage = safeStorages.find(s => s.id === formData.objectId);
      donorId = storage?.donorId || '';
      cellType = storage?.cellType || '';
    } else if (formData.objectType === 'masterbank') {
      const mb = safeMasterBanks.find(m => m.id === formData.objectId);
      donorId = mb?.donorId || '';
      cellType = mb?.cellType || '';
    }
    
    addDisposal({
      objectType: formData.objectType,
      objectId: formData.objectId,
      donorId,
      cellType,
      reason: formData.reason,
      reasonDetails: formData.reasonDetails,
      quantity: formData.quantity,
      tubeCount: parseInt(formData.tubeCount) || 0,
      disposalDate: new Date().toISOString(),
      operatorName: 'Оператор'
    });
    
    // Регистрируем манипуляцию
    addManipulation({
      type: 'disposal',
      targetId: formData.objectId,
      targetType: formData.objectType,
      operatorName: 'Оператор',
      dateTime: new Date().toISOString(),
      notes: `Утилизация: ${reasonLabels[formData.reason]}. ${formData.reasonDetails}`
    });
    
    // Обновляем статус объекта
    if (formData.objectType === 'culture') {
      updateCulture(formData.objectId, { status: 'disposed' });
    } else if (formData.objectType === 'storage') {
      updateStorage(formData.objectId, { status: 'disposed' });
    } else if (formData.objectType === 'masterbank') {
      updateMasterBank(formData.objectId, { status: 'disposed' });
    } else if (formData.objectType === 'media') {
      updateMedia(formData.objectId, { status: 'disposed' });
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      objectType: 'culture',
      objectId: '',
      reason: 'contamination',
      reasonDetails: '',
      quantity: '',
      tubeCount: ''
    });
  };

  const filteredDisposals = (disposals || []).filter(d => {
    const matchesSearch = String(d.id).includes(searchQuery.toLowerCase()) ||
      String(d.objectId).includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || d.objectType === typeFilter;
    return matchesSearch && matchesType;
  });

  const availableCultures = (cultures || []).filter(c => c.status !== 'disposed' && c.status !== 'released');
  const availableStorages = (storages || []).filter(s => s.status !== 'disposed' && s.status !== 'released');
  const availableMasterBanks = (masterBanks || []).filter(m => m.status !== 'disposed');
  const availableMedia = (media || []).filter(m => m.status !== 'disposed' && m.status !== 'exhausted');

  // Статистика
  const safeDisposals = disposals || [];
  const safeDonors = donors || [];
  const stats = {
    total: safeDisposals.length,
    contamination: safeDisposals.filter(d => d.reason === 'contamination').length,
    expired: safeDisposals.filter(d => d.reason === 'expired').length,
    cultures: safeDisposals.filter(d => d.objectType === 'culture').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Утилизация</h1>
          <p className="text-slate-500">Регистрация утилизации материалов</p>
        </div>
        {canEdit() && <Button onClick={() => setIsModalOpen(true)} variant="danger"><Plus className="w-4 h-4" /> Регистрация утилизации</Button>}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center border-l-4 border-l-red-500">
          <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
          <div className="text-sm text-slate-500">Всего утилизаций</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.contamination}</div>
          <div className="text-sm text-slate-500">Контаминация</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.expired}</div>
          <div className="text-sm text-slate-500">Истёк срок</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-slate-600">{stats.cultures}</div>
          <div className="text-sm text-slate-500">Культур</div>
        </Card>
      </div>

      <Card>
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg" />
          </div>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Все типы' },
              { value: 'culture', label: 'Культуры' },
              { value: 'storage', label: 'Хранилище' },
              { value: 'masterbank', label: 'Мастер-банк' },
              { value: 'media', label: 'Среды' }
            ]}
          />
        </div>
      </Card>

      {filteredDisposals.length > 0 ? (
        <div className="space-y-4">
          {filteredDisposals.map(d => {
            const donor = safeDonors.find(don => don.id === d.donorId);
            return (
              <Card key={d.id} className="border-l-4 border-l-red-500">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-slate-800">{d.id}</h3>
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded">{objectTypeLabels[d.objectType]}</span>
                    </div>
                    <p className="text-slate-600">Объект: <strong>{d.objectId}</strong></p>
                    {d.cellType && <p className="text-sm text-slate-500">Тип клеток: {d.cellType}</p>}
                    {donor && <p className="text-sm text-slate-500">Донор: {donor.fullName}</p>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-red-600 font-medium mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      {reasonLabels[d.reason]}
                    </div>
                    <p className="text-sm text-slate-500">Оператор: {d.operatorName}</p>
                    <p className="text-sm text-slate-500">{formatDateTime(d.disposalDate)}</p>
                    {(d.quantity || d.tubeCount) && (
                      <p className="text-sm text-slate-500">Кол-во: {d.quantity || `${d.tubeCount} пробирок`}</p>
                    )}
                  </div>
                </div>
                {d.reasonDetails && (
                  <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">{d.reasonDetails}</div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><EmptyState icon={Trash2} title="Записей об утилизации нет" description="Здесь будут отображаться утилизированные материалы" /></Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Регистрация утилизации" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select 
            label="Тип объекта" 
            value={formData.objectType} 
            onChange={(e) => setFormData({...formData, objectType: e.target.value as typeof formData.objectType, objectId: ''})} 
            options={[
              {value: 'culture', label: 'Культура'},
              {value: 'storage', label: 'Хранилище'},
              {value: 'masterbank', label: 'Мастер-банк'},
              {value: 'media', label: 'Среда/реактив'}
            ]} 
          />
          <Select 
            label="Объект" 
            value={formData.objectId} 
            onChange={(e) => setFormData({...formData, objectId: e.target.value})} 
            options={[
              {value: '', label: 'Выберите...'}, 
              ...(formData.objectType === 'culture' 
                ? availableCultures.map(c => ({value: c.id, label: `${c.id} - ${c.cellType} (P${c.passageNumber})`})) 
                : formData.objectType === 'storage' 
                ? availableStorages.map(s => ({value: s.id, label: `${s.id} - ${s.cellType} (${s.tubeCount} пробирок)`}))
                : formData.objectType === 'masterbank'
                ? availableMasterBanks.map(m => ({value: m.id, label: `${m.id} - ${m.cellType}`}))
                : availableMedia.map(m => ({value: m.id, label: `${m.id} - ${m.name}`})))
            ]} 
            required 
          />
          <Select 
            label="Причина утилизации" 
            value={formData.reason} 
            onChange={(e) => setFormData({...formData, reason: e.target.value as typeof formData.reason})} 
            options={Object.entries(reasonLabels).map(([value, label]) => ({value, label}))} 
          />
          <Textarea 
            label="Подробности" 
            value={formData.reasonDetails} 
            onChange={(e) => setFormData({...formData, reasonDetails: e.target.value})} 
            placeholder="Подробное описание причины утилизации..."
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Кол-во пробирок" type="number" value={formData.tubeCount} onChange={(e) => setFormData({...formData, tubeCount: e.target.value})} />
            <Input label="Описание количества" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} placeholder="напр. весь объём, 3 флакона" />
          </div>
          
          <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Внимание! После утилизации статус объекта будет изменён на "Утилизирован" и его нельзя будет восстановить.
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit" variant="danger">Утилизировать</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
