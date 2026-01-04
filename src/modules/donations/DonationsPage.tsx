// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, StatusBadge, EmptyState } from '../../components/UI';
import { Plus, Droplets, Search, Edit2, FlaskConical, Eye, Trash2, FileText } from 'lucide-react';
import { formatDateTime, donationStatusLabels, getStatusColor } from '../../utils';
// Типы соответствуют структуре Supabase
interface Donation {
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
import { generateDonationsListReport } from '../../utils/pdf';
import { useSearchParams } from 'react-router-dom';

// Справочник типов материалов по типам донаций
const DONATION_TYPES: Record<string, { category: 'liquid' | 'solid'; materials: string[]; cellTypes: string[] }> = {
  'Жировая ткань (липоаспират)': {
    category: 'liquid',
    materials: ['Липоаспират', 'SVF (стромально-васкулярная фракция)'],
    cellTypes: ['МСК (мезенхимальные стволовые клетки)', 'Преадипоциты']
  },
  'Костный мозг': {
    category: 'liquid',
    materials: ['Костный мозг', 'Аспират костного мозга'],
    cellTypes: ['МСК', 'Гемопоэтические клетки']
  },
  'Пуповинная кровь': {
    category: 'liquid',
    materials: ['Пуповинная кровь'],
    cellTypes: ['Гемопоэтические стволовые клетки', 'МСК']
  },
  'Периферическая кровь': {
    category: 'liquid',
    materials: ['Периферическая кровь', 'Мононуклеары'],
    cellTypes: ['Лимфоциты', 'Моноциты', 'PBMC']
  },
  'Биоптат кожи': {
    category: 'solid',
    materials: ['Биоптат кожи', 'Фрагмент дермы', 'Эпидермис'],
    cellTypes: ['Фибробласты', 'Кератиноциты']
  },
  'Биоптат жировой ткани': {
    category: 'solid',
    materials: ['Биоптат жировой ткани'],
    cellTypes: ['МСК', 'Преадипоциты']
  },
  'Зуб (пульпа)': {
    category: 'solid',
    materials: ['Пульпа зуба', 'Молочный зуб', 'Зуб мудрости'],
    cellTypes: ['МСК пульпы зуба (DPSC)']
  },
  'Плацента': {
    category: 'solid',
    materials: ['Плацентарная ткань', 'Амниотическая мембрана'],
    cellTypes: ['МСК', 'Амниоциты']
  },
  'Пуповина': {
    category: 'solid',
    materials: ['Ткань пуповины', 'Вартонов студень'],
    cellTypes: ['МСК пуповины', 'Эндотелиоциты']
  },
  'Хрящевая ткань': {
    category: 'solid',
    materials: ['Хрящевой биоптат'],
    cellTypes: ['Хондроциты']
  },
  'Костная ткань': {
    category: 'solid',
    materials: ['Костный фрагмент'],
    cellTypes: ['Остеобласты', 'МСК']
  },
  'Другое': {
    category: 'solid',
    materials: ['Другой материал'],
    cellTypes: ['Другой тип клеток']
  }
};

export const DonationsPage: React.FC = () => {
  const { donors, donations, equipment, media, updateMedia, addDonation, updateDonation, deleteDonation, addCulture, cultures, containerTypes } = useApp();
  const safeDonors = donors || [];
  const safeMedia = media || [];
  
  const approvedMedia = (media || []).filter((m: any) => m.status === 'approved' && (m.remainingVolume || m.remaining_ml) > 0 && new Date(m.expiryDate || m.expiry_date) > new Date());
  const { canEdit, isAdmin } = useAuth();
  
  const incubators = (equipment || []).filter((e: any) => (e.equipmentType || e.type) === 'incubator' && e.status === 'active');
  const [searchParams] = useSearchParams();
  const initialDonorId = searchParams.get('donorId') || '';
  const actionParam = searchParams.get('action');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCultureModalOpen, setIsCultureModalOpen] = useState(false);
  const [viewDonation, setViewDonation] = useState<Donation | null>(null);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [donorSearchQuery, setDonorSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [donorFilter] = useState<string>(initialDonorId);

  const [formData, setFormData] = useState({
    donorId: initialDonorId,
    dateTime: new Date().toISOString().slice(0, 16),
    location: 'Клиника IBC, каб. 105',
    donationType: 'Жировая ткань (липоаспират)',
    materialType: 'Липоаспират',
    quantity: '',
    weightGrams: '',
    appearance: 'Нормальный',
    packagingIntegrity: true,
    hasDocumentation: true,
    status: 'quarantine' as DonationStatus
  });

  const [cultureFormData, setCultureFormData] = useState({
    cellType: 'МСК (мезенхимальные стволовые клетки)',
    containers: [{ type: 'Флакон T25', count: 1, mediaId: '', volume: '' }],
    isolationProtocol: '',
    incubatorId: '',
    cellCount: '',
    viability: ''
  });

  const ISOLATION_PROTOCOLS = [
    { value: '', label: 'Не указан' },
    { value: 'enzymatic', label: 'Ферментативный (коллагеназа)' },
    { value: 'explant', label: 'Эксплантный метод' },
    { value: 'mechanical', label: 'Механическая диссоциация' },
    { value: 'gradient', label: 'Градиентное центрифугирование' },
    { value: 'immunomagnetic', label: 'Иммуномагнитная сепарация' }
  ];

  const addContainer = () => {
    setCultureFormData(prev => ({
      ...prev,
      containers: [...prev.containers, { type: 'Флакон T25', count: 1, mediaId: '', volume: '' }]
    }));
  };

  const removeContainer = (index: number) => {
    setCultureFormData(prev => ({
      ...prev,
      containers: prev.containers.filter((_, i) => i !== index)
    }));
  };

  const updateContainer = (index: number, field: 'type' | 'count' | 'mediaId' | 'volume', value: string | number) => {
    setCultureFormData(prev => ({
      ...prev,
      containers: prev.containers.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  // Автооткрытие формы если пришли с action=new
  useEffect(() => {
    if (actionParam === 'new' && initialDonorId) {
      setFormData(prev => ({ ...prev, donorId: initialDonorId }));
      setIsModalOpen(true);
    }
  }, [actionParam, initialDonorId]);

  // Фильтрация доноров для поиска
  const filteredDonors = useMemo(() => {
    const query = donorSearchQuery.toLowerCase();
    return (donors || []).filter((d: any) => 
      d.status === 'active' && 
      ((d.code || '').toLowerCase().includes(query) ||
       (d.full_name || '').toLowerCase().includes(query) ||
       (d.phone || '').includes(donorSearchQuery) ||
       String(d.id).includes(donorSearchQuery))
    );
  }, [donors, donorSearchQuery]);

  const resetForm = () => {
    setFormData({
      donorId: '',
      dateTime: new Date().toISOString().slice(0, 16),
      location: 'Клиника IBC, каб. 105',
      donationType: 'Жировая ткань (липоаспират)',
      materialType: 'Липоаспират',
      quantity: '',
      weightGrams: '',
      appearance: 'Нормальный',
      packagingIntegrity: true,
      hasDocumentation: true,
      status: 'quarantine'
    });
    setEditingDonation(null);
    setDonorSearchQuery('');
  };

  const handleDonationTypeChange = (donationType: string) => {
    const typeInfo = DONATION_TYPES[donationType];
    setFormData({
      ...formData,
      donationType,
      materialType: typeInfo?.materials[0] || ''
    });
    // Обновляем тип клеток в форме культуры
    setCultureFormData(prev => ({
      ...prev,
      cellType: typeInfo?.cellTypes[0] || 'МСК'
    }));
  };

  const handleOpenModal = (donation?: Donation) => {
    if (donation) {
      setEditingDonation(donation);
      // Извлекаем данные из notes если есть
      const notes = donation.notes || '';
      const donationType = getDonationTypeFromMaterial(donation) || 'Жировая ткань (липоаспират)';
      const locationMatch = notes.match(/Место:\s*([^.]+)/);
      const appearanceMatch = notes.match(/Внешний вид:\s*([^.]+)/);
      const weightMatch = notes.match(/Вес:\s*([\d.]+)/);
      
      setFormData({
        donorId: String(donation.donorId || donation.donor_id || ''),
        dateTime: (donation.date || donation.created_at || new Date().toISOString()).slice(0, 16),
        location: locationMatch?.[1]?.trim() || 'Клиника IBC, каб. 105',
        donationType: donationType,
        materialType: donation.material_type || donation.materialType || '',
        quantity: String(donation.volume || donation.volume_ml || ''),
        weightGrams: weightMatch?.[1] || '',
        appearance: appearanceMatch?.[1]?.trim() || 'Нормальный',
        packagingIntegrity: true,
        hasDocumentation: true,
        status: donation.status || 'quarantine'
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const isSolidTissue = (donationType: string) => {
    return DONATION_TYPES[donationType]?.category === 'solid';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Преобразуем camelCase в snake_case для Supabase
    const submitData = {
      donor_id: parseInt(formData.donorId) || null,
      date: formData.dateTime.split('T')[0], // Только дата YYYY-MM-DD
      material_type: formData.materialType,
      volume: formData.quantity ? parseFloat(formData.quantity) : null,
      status: formData.status || 'quarantine',
      notes: `Тип: ${formData.donationType}. Место: ${formData.location}. Внешний вид: ${formData.appearance}. ${formData.weightGrams ? `Вес: ${formData.weightGrams}г` : ''}`
    };
    try {
      if (editingDonation) {
        await updateDonation(editingDonation.id, submitData);
      } else {
        await addDonation(submitData);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Ошибка сохранения донации:', err);
      alert('Ошибка сохранения донации');
    }
  };

  const handleCreateCulture = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDonation) {
      // Списать среды
      const mediaUsage: Record<string, number> = {};
      cultureFormData.containers.forEach(c => {
        if (c.mediaId && c.volume) {
          mediaUsage[c.mediaId] = (mediaUsage[c.mediaId] || 0) + parseFloat(c.volume) * c.count;
        }
      });
      Object.entries(mediaUsage).forEach(([mId, vol]) => {
        const usedMedia = safeMedia.find(m => m.id === mId);
        if (usedMedia) {
          const newRemaining = Math.max(0, usedMedia.remainingVolume - vol);
          updateMedia(usedMedia.id, { 
            remainingVolume: newRemaining,
            status: newRemaining === 0 ? 'exhausted' : usedMedia.status
          });
        }
      });
      
      addCulture({
        donationId: selectedDonation.id,
        donorId: selectedDonation.donorId,
        cellType: cultureFormData.cellType,
        passageNumber: 0,
        containers: cultureFormData.containers.map(c => ({ type: c.type, count: c.count })),
        initialMedia: cultureFormData.containers.map(c => ({ mediaId: c.mediaId, volume: parseFloat(c.volume) || 0 })),
        isolationProtocolId: cultureFormData.isolationProtocol || undefined,
        isolationProtocolName: ISOLATION_PROTOCOLS.find(p => p.value === cultureFormData.isolationProtocol)?.label,
        incubatorId: cultureFormData.incubatorId || undefined,
        cellCount: cultureFormData.cellCount ? parseInt(cultureFormData.cellCount) : undefined,
        viability: cultureFormData.viability ? parseFloat(cultureFormData.viability) : undefined,
        status: 'in_work'
      } as any);
      
      // Сбрасываем форму для возможного создания следующей культуры
      setCultureFormData({
        cellType: (detectedDonationType ? DONATION_TYPES[detectedDonationType]?.cellTypes[0] : null) || 'МСК (мезенхимальные стволовые клетки)',
        containers: [{ type: 'Флакон T25', count: 1, mediaId: '', volume: '' }],
        isolationProtocol: '',
        incubatorId: '',
        cellCount: '',
        viability: ''
      });
      
      // Спрашиваем пользователя о создании ещё одной культуры
      const createAnother = window.confirm('Культура успешно создана. Хотите выделить еще одну культуру из этой донации?');
      
      if (!createAnother) {
        // Завершаем работу с донацией
        updateDonation(selectedDonation.id, { status: 'processed' });
        setIsCultureModalOpen(false);
        setSelectedDonation(null);
      }
      // Если createAnother = true, модалка остаётся открытой для создания следующей культуры
    }
  };

  const getDonationCultures = (donationId: number) => (cultures || []).filter((c: any) => c.donation_id === donationId);

  const filteredDonations = (donations || []).filter((donation: any) => {
    const donor = (donors || []).find((d: any) => d.id === donation.donor_id);
    const matchesSearch = String(donation.id).includes(searchQuery) ||
                         (donor?.code || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter;
    const matchesDonor = !donorFilter || String(donation.donorId || donation.donor_id) === donorFilter;
    return matchesSearch && matchesStatus && matchesDonor;
  });

  const selectedDonor = safeDonors.find(d => String(d.id) === String(formData.donorId));

  const donationTypeOptions = Object.keys(DONATION_TYPES).map(k => ({ value: k, label: k }));
  const materialOptions = DONATION_TYPES[formData.donationType]?.materials.map(m => ({ value: m, label: m })) || [];
  // Определяем тип донации из material_type или notes
const getDonationTypeFromMaterial = (donation: any) => {
  if (!donation) return null;
  // Сначала ищем в material_type
  for (const [dtype, info] of Object.entries(DONATION_TYPES)) {
    if (info.materials.includes(donation.material_type)) return dtype;
  }
  // Если не нашли, пробуем найти в notes
  if (donation.notes) {
    for (const dtype of Object.keys(DONATION_TYPES)) {
      if (donation.notes.includes(dtype)) return dtype;
    }
  }
  return 'Другое';
};

const detectedDonationType = selectedDonation ? getDonationTypeFromMaterial(selectedDonation) : null;
const cellTypeOptions = detectedDonationType ? 
    (DONATION_TYPES[detectedDonationType]?.cellTypes.map(c => ({ value: c, label: c })) || [{ value: 'МСК', label: 'МСК' }]) :
    [{ value: 'МСК', label: 'МСК' }];

  const statusOptions = [
    { value: 'quarantine', label: 'Карантин' },
    { value: 'processed', label: 'Обработан' },
    { value: 'disposed', label: 'Утилизирован' }
  ];

  const containerTypeOptions = (containerTypes || []).filter(c => c.is_active).map(c => ({ value: c.name, label: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Донации</h1>
          <p className="text-slate-500">Учёт получения биоматериала ({(donations || []).length})</p>
        </div>
<div className="flex gap-2">
          <Button variant="secondary" onClick={() => generateDonationsListReport(donations, donors, cultures)}>
            <FileText className="w-4 h-4" /> Журнал донаций
          </Button>
          {canEdit() && <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" /> Новая донация
          </Button>}
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Поиск по ID или донору..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg" />
            </div>
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: 'all', label: 'Все статусы' }, ...statusOptions]} />
        </div>
      </Card>

      <Card>
        {filteredDonations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Донор</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Дата</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Тип</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Кол-во</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Статус</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map(donation => {
                  const donor = safeDonors.find(d => d.id === (donation.donorId || donation.donor_id));
                  return (
                    <tr key={donation.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-sm text-primary">{donation.id}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{donor?.fullName || donor?.full_name || donor?.code || '—'}</p>
                        <p className="text-xs text-slate-500">{donor?.code || donation.donorId || donation.donor_id}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">{formatDateTime(donation.date || donation.created_at)}</td>
                      <td className="py-3 px-4 text-slate-600 text-sm">{donation.material_type || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{donation.volume ? `${donation.volume} мл` : '—'}</td>
                      <td className="py-3 px-4"><StatusBadge status={donation.status} label={donationStatusLabels[donation.status]} color={getStatusColor(donation.status)} /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewDonation(donation)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Просмотр"><Eye className="w-4 h-4 text-slate-500" /></button>
                          {canEdit() && <button onClick={() => handleOpenModal(donation)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Редактировать"><Edit2 className="w-4 h-4 text-slate-500" /></button>}
                          {isAdmin() && <button onClick={() => { if(confirm('Удалить донацию #' + donation.id + '?')) deleteDonation(donation.id); }} className="p-1.5 hover:bg-red-100 rounded-lg" title="Удалить"><Trash2 className="w-4 h-4 text-red-500" /></button>}
                          {canEdit() && donation.status === 'quarantine' && (
                            <button onClick={() => { setSelectedDonation(donation); setIsCultureModalOpen(true); }} className="p-1.5 hover:bg-green-100 rounded-lg" title="Создать культуру">
                              <FlaskConical className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Droplets} title="Донации не найдены" description="Зарегистрируйте первую донацию" />
        )}
      </Card>

      {/* Просмотр донации */}
      <Modal isOpen={!!viewDonation} onClose={() => setViewDonation(null)} title={`Донация ${viewDonation?.id}`} size="lg">
        {viewDonation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-slate-500 text-sm">Донор</p><p className="font-medium">{safeDonors.find(d => d.id === viewDonation.donor_id)?.full_name || '—'}</p></div>
              <div><p className="text-slate-500 text-sm">Статус</p><StatusBadge status={viewDonation.status} label={donationStatusLabels[viewDonation.status]} color={getStatusColor(viewDonation.status)} /></div>
              <div><p className="text-slate-500 text-sm">Дата/время</p><p>{formatDateTime(viewDonation.date || viewDonation.created_at)}</p></div>
              <div><p className="text-slate-500 text-sm">Тип материала</p><p>{viewDonation.material_type || '—'}</p></div>
              <div><p className="text-slate-500 text-sm">Объём</p><p>{viewDonation.volume ? `${viewDonation.volume} мл` : '—'}</p></div>
              {viewDonation.notes && <div className="col-span-2"><p className="text-slate-500 text-sm">Примечания</p><p>{viewDonation.notes}</p></div>}
            </div>
            <div className="border-t pt-4">
              <p className="font-medium mb-2">Связанные культуры ({getDonationCultures(viewDonation.id).length})</p>
              {getDonationCultures(viewDonation.id).length > 0 ? (
                <div className="space-y-2">
                  {getDonationCultures(viewDonation.id).map(c => (
                    <div key={c.id} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                      <span className="font-mono text-primary">{c.id}</span>
                      <span>{c.cell_type || '—'}</span>
                      <span>P{c.passage || 0}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">Нет культур</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* Форма донации */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingDonation ? 'Редактирование донации' : 'Новая донация'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Поиск донора */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Донор *</label>
            {selectedDonor ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-green-800">{selectedDonor.full_name || selectedDonor.code || `#${selectedDonor.id}`}</p>
                  <p className="text-sm text-green-600">{selectedDonor.code || selectedDonor.id} • {selectedDonor.phone || '—'}</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setFormData({ ...formData, donorId: '' })}>Изменить</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Поиск донора по имени, ID или телефону..." value={donorSearchQuery} onChange={(e) => setDonorSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg" />
                </div>
                {donorSearchQuery && (
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
                    {filteredDonors.length > 0 ? filteredDonors.slice(0, 10).map(d => (
                      <button key={d.id} type="button" onClick={() => { setFormData({ ...formData, donorId: String(d.id) }); setDonorSearchQuery(''); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0">
                        <p className="font-medium">{d.full_name || d.code || `#${d.id}`}</p>
                        <p className="text-xs text-slate-500">{d.code || d.id} • {d.phone || '—'}</p>
                      </button>
                    )) : <p className="p-3 text-slate-500 text-sm">Доноры не найдены</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Дата и время *" type="datetime-local" value={formData.dateTime} onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })} required />
            <Input label="Место" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Тип донации" value={formData.donationType} onChange={(e) => handleDonationTypeChange(e.target.value)} options={donationTypeOptions} />
            <Select label="Тип материала" value={formData.materialType} onChange={(e) => setFormData({ ...formData, materialType: e.target.value })} options={materialOptions} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {isSolidTissue(formData.donationType) ? (
              <Input label="Вес (г)" type="number" step="0.1" value={formData.weightGrams} onChange={(e) => setFormData({ ...formData, weightGrams: e.target.value })} placeholder="напр. 2.5" />
            ) : (
              <Input label="Объём (мл)" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="напр. 50" />
            )}
            <Input label="Внешний вид" value={formData.appearance} onChange={(e) => setFormData({ ...formData, appearance: e.target.value })} />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.packagingIntegrity} onChange={(e) => setFormData({ ...formData, packagingIntegrity: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm">Упаковка цела</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.hasDocumentation} onChange={(e) => setFormData({ ...formData, hasDocumentation: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm">Документы в наличии</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>Отмена</Button>
            <Button type="submit" disabled={!formData.donorId}>{editingDonation ? 'Сохранить' : 'Зарегистрировать'}</Button>
          </div>
        </form>
      </Modal>

      {/* Создание культуры */}
      <Modal isOpen={isCultureModalOpen} onClose={() => { setIsCultureModalOpen(false); setSelectedDonation(null); }} title="Создание первичной культуры" size="md">
        <form onSubmit={handleCreateCulture} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm"><strong>Донация:</strong> {selectedDonation?.id}</p>
            <p className="text-sm"><strong>Тип:</strong> {detectedDonationType || selectedDonation?.material_type}</p>
            <p className="text-sm"><strong>Материал:</strong> {selectedDonation?.material_type}</p>
          </div>

          <Select label="Тип клеток" value={cultureFormData.cellType} onChange={(e) => setCultureFormData({ ...cultureFormData, cellType: e.target.value })} options={cellTypeOptions} />

          <Select label="Протокол выделения" value={cultureFormData.isolationProtocol} onChange={(e) => setCultureFormData({ ...cultureFormData, isolationProtocol: e.target.value })} options={ISOLATION_PROTOCOLS} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Посуда для культивирования</label>
              <Button type="button" size="sm" variant="secondary" onClick={addContainer}><Plus className="w-3 h-3" /> Добавить</Button>
            </div>
            <div className="space-y-3">
              {cultureFormData.containers.map((container, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Select className="flex-1" value={container.type} onChange={(e) => updateContainer(idx, 'type', e.target.value)} options={containerTypeOptions} />
                    <Input className="w-20" type="number" min="1" value={container.count} onChange={(e) => updateContainer(idx, 'count', parseInt(e.target.value) || 1)} placeholder="Кол-во" />
                    {cultureFormData.containers.length > 1 && (
                      <button type="button" onClick={() => removeContainer(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select 
                      value={container.mediaId || ''} 
                      onChange={(e) => updateContainer(idx, 'mediaId', e.target.value)} 
                      options={[
                        { value: '', label: 'Выберите среду' },
                        ...approvedMedia.map(m => ({ value: m.id, label: `${m.name} (${m.remainingVolume} ${m.unit})` }))
                      ]} 
                    />
                    <Input 
                      type="number" 
                      step="0.1"
                      value={container.volume || ''} 
                      onChange={(e) => updateContainer(idx, 'volume', e.target.value)} 
                      placeholder="Объём среды (мл)" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Select label="Инкубатор" value={cultureFormData.incubatorId} onChange={(e) => setCultureFormData({ ...cultureFormData, incubatorId: e.target.value })} options={[{ value: '', label: 'Выберите инкубатор' }, ...incubators.map(eq => ({ value: eq.id, label: `${eq.name} (${eq.id})` }))]} />

          <p className="text-sm text-slate-500">Примечание: Для первичной культуры (P0) количество клеток обычно определяется после первого пассажа.</p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setIsCultureModalOpen(false); setSelectedDonation(null); }}>Отмена</Button>
            <Button type="submit" variant="success"><FlaskConical className="w-4 h-4" /> Создать культуру</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
