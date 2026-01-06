// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, Textarea, StatusBadge, EmptyState } from '../../components/UI';
import { Truck, Plus, Search, CheckCircle, XCircle } from 'lucide-react';
import { formatDateTime } from '../../utils';

const statusLabels: Record<string, string> = { pending: 'Ожидает', confirmed: 'Подтверждён', cancelled: 'Отменён' };
const statusColors: Record<string, string> = { pending: 'yellow', confirmed: 'green', cancelled: 'red' };
const appTypeLabels: Record<string, string> = { clinical: 'Клиническое', research: 'Исследовательское', scientific: 'Научное' };

export const ReleasesPage: React.FC = () => {
  const { releases, donors, cultures, storages, masterBanks, addRelease, updateRelease, updateCulture, updateStorage, addManipulation } = useApp();
  const { canEdit } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    sourceType: 'storage' as 'culture' | 'storage' | 'masterbank',
    sourceId: '',
    applicationType: 'clinical' as 'clinical' | 'research' | 'scientific',
    recipientName: '',
    recipientOrg: '',
    recipientContact: '',
    quantity: '',
    tubeCount: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let donorId = '';
    let cellType = '';
    const safeCultures = cultures || [];
    const safeStorages = storages || [];
    const safeMasterBanks = masterBanks || [];
    
    if (formData.sourceType === 'culture') {
      const culture = safeCultures.find(c => c.id === formData.sourceId);
      donorId = culture?.donorId || '';
      cellType = culture?.cellType || '';
    } else if (formData.sourceType === 'storage') {
      const storage = safeStorages.find(s => s.id === formData.sourceId);
      donorId = storage?.donorId || '';
      cellType = storage?.cellType || '';
    } else if (formData.sourceType === 'masterbank') {
      const mb = safeMasterBanks.find(m => m.id === formData.sourceId);
      donorId = mb?.donorId || '';
      cellType = mb?.cellType || '';
    }
    
    addRelease({
      sourceType: formData.sourceType,
      sourceId: formData.sourceId,
      donorId,
      cellType,
      applicationType: formData.applicationType,
      recipientName: formData.recipientName,
      recipientOrg: formData.recipientOrg,
      recipientContact: formData.recipientContact,
      quantity: formData.quantity,
      tubeCount: parseInt(formData.tubeCount) || 0,
      releaseDate: new Date().toISOString(),
      operatorName: 'Оператор',
      status: 'pending',
      notes: formData.notes
    });

    // Регистрируем манипуляцию
    addManipulation({
      type: 'release',
      targetId: formData.sourceId,
      targetType: formData.sourceType,
      operatorName: 'Оператор',
      dateTime: new Date().toISOString(),
      notes: `Выдача: ${formData.recipientName}, ${appTypeLabels[formData.applicationType]}`
    });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      sourceType: 'storage',
      sourceId: '',
      applicationType: 'clinical',
      recipientName: '',
      recipientOrg: '',
      recipientContact: '',
      quantity: '',
      tubeCount: '',
      notes: ''
    });
  };

  const handleConfirm = (releaseId: string, sourceType: string, sourceId: string) => {
    updateRelease(releaseId, { status: 'confirmed' });
    
    // Обновляем статус источника
    if (sourceType === 'culture') {
      updateCulture(sourceId, { status: 'released' });
    } else if (sourceType === 'storage') {
      updateStorage(sourceId, { status: 'released' });
    }
  };

  const filteredReleases = (releases || []).filter(r => {
    const matchesSearch = String(r.id).includes(searchQuery.toLowerCase()) ||
      (r.recipientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.sourceId).includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const availableCultures = (cultures || []).filter(c => c.status === 'in_work' || c.status === 'frozen');
  const availableStorages = (storages || []).filter(s => s.status === 'stored' || s.status === 'partially_retrieved');
  const availableMasterBanks = (masterBanks || []).filter(m => m.status === 'stored' || m.status === 'partially_used');

  // Статистика
  const safeReleases = releases || [];
  const safeDonors = donors || [];
  const stats = {
    total: safeReleases.length,
    pending: safeReleases.filter(r => r.status === 'pending').length,
    confirmed: safeReleases.filter(r => r.status === 'confirmed').length,
    clinical: safeReleases.filter(r => r.applicationType === 'clinical' && r.status === 'confirmed').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Выдача</h1>
          <p className="text-slate-500">Регистрация выдачи клеточного материала</p>
        </div>
        {canEdit() && <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4" /> Оформить выдачу</Button>}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
          <div className="text-sm text-slate-500">Всего выдач</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-sm text-slate-500">Ожидают подтверждения</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-emerald-600">{stats.confirmed}</div>
          <div className="text-sm text-slate-500">Подтверждено</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.clinical}</div>
          <div className="text-sm text-slate-500">Клинических</div>
        </Card>
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
              { value: 'pending', label: 'Ожидает' },
              { value: 'confirmed', label: 'Подтверждён' },
              { value: 'cancelled', label: 'Отменён' }
            ]}
          />
        </div>
      </Card>

      {filteredReleases.length > 0 ? (
        <div className="space-y-4">
          {filteredReleases.map(r => {
            const donor = safeDonors.find(d => d.id === r.donorId);
            return (
              <Card key={r.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold">{r.id}</h3>
                      <StatusBadge status={r.status} label={statusLabels[r.status]} color={statusColors[r.status]} />
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{appTypeLabels[r.applicationType]}</span>
                    </div>
                    <p className="text-slate-600">Получатель: <strong>{r.recipientName}</strong> {r.recipientOrg && `(${r.recipientOrg})`}</p>
                    {r.recipientContact && <p className="text-sm text-slate-500">Контакт: {r.recipientContact}</p>}
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p className="font-medium text-slate-700">Источник: {r.sourceId}</p>
                    <p>Донор: {donor?.fullName || '—'}</p>
                    <p>Количество: {r.quantity || `${r.tubeCount || 0} пробирок`}</p>
                    <p>{formatDateTime(r.releaseDate)}</p>
                  </div>
                </div>
                {r.notes && (
                  <div className="mt-3 p-2 bg-slate-50 rounded text-sm text-slate-600">{r.notes}</div>
                )}
                {canEdit() && r.status === 'pending' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button size="sm" variant="success" onClick={() => handleConfirm(r.id, r.sourceType, r.sourceId)}>
                      <CheckCircle className="w-3 h-3" /> Подтвердить
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => updateRelease(r.id, { status: 'cancelled' })}>
                      <XCircle className="w-3 h-3" /> Отменить
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><EmptyState icon={Truck} title="Выдачи не найдены" description="Оформите выдачу клеточного материала" /></Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Оформление выдачи" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select 
            label="Тип источника" 
            value={formData.sourceType} 
            onChange={(e) => setFormData({...formData, sourceType: e.target.value as typeof formData.sourceType, sourceId: ''})} 
            options={[
              {value: 'storage', label: 'Из хранилища'},
              {value: 'masterbank', label: 'Из мастер-банка'},
              {value: 'culture', label: 'Активная культура'}
            ]} 
          />
          <Select 
            label="Источник" 
            value={formData.sourceId} 
            onChange={(e) => setFormData({...formData, sourceId: e.target.value})} 
            options={[
              {value: '', label: 'Выберите...'}, 
              ...(formData.sourceType === 'culture' 
                ? availableCultures.map(c => ({value: c.id, label: `${c.id} - ${c.cellType} (P${c.passageNumber})`})) 
                : formData.sourceType === 'masterbank'
                ? availableMasterBanks.map(m => ({value: m.id, label: `${m.id} - ${m.cellType} (${m.tubeCount} пробирок)`}))
                : availableStorages.map(s => ({value: s.id, label: `${s.id} - ${s.cellType} (${s.tubeCount} пробирок)`})))
            ]} 
            required 
          />
          <Select 
            label="Назначение" 
            value={formData.applicationType} 
            onChange={(e) => setFormData({...formData, applicationType: e.target.value as typeof formData.applicationType})} 
            options={[
              {value: 'clinical', label: 'Клиническое применение'},
              {value: 'research', label: 'Исследование'},
              {value: 'scientific', label: 'Научная работа'}
            ]} 
          />
          
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-700 mb-3">Получатель</h4>
            <Input label="ФИО получателя *" value={formData.recipientName} onChange={(e) => setFormData({...formData, recipientName: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Input label="Организация" value={formData.recipientOrg} onChange={(e) => setFormData({...formData, recipientOrg: e.target.value})} />
              <Input label="Контакт *" value={formData.recipientContact} onChange={(e) => setFormData({...formData, recipientContact: e.target.value})} placeholder="Телефон или email" required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Кол-во пробирок" type="number" value={formData.tubeCount} onChange={(e) => setFormData({...formData, tubeCount: e.target.value})} />
            <Input label="Описание количества" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} placeholder="напр. 5 млн клеток" />
          </div>
          <Textarea label="Примечания" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">Оформить выдачу</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
