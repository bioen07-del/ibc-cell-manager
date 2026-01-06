// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, StatusBadge, EmptyState } from '../../components/UI';
import { Beaker, Plus, Search, AlertTriangle, FileDown, Trash2, FlaskConical, CheckCircle, Shield, ShieldOff } from 'lucide-react';
import { Media, MediaCategory, MEDIA_CATEGORY_LABELS } from '../../types';
import { generateMediaReport } from '../../utils/pdf';

// Справочник стандартных культуральных сред (без фирм в названиях)
const STANDARD_MEDIA: { name: string; category: MediaCategory; purpose: string; storageConditions: string }[] = [
  // Основные среды
  { name: 'DMEM High Glucose', category: 'base', purpose: 'Культивирование фибробластов, МСК', storageConditions: '2-8°C' },
  { name: 'DMEM Low Glucose', category: 'base', purpose: 'Культивирование МСК', storageConditions: '2-8°C' },
  { name: 'DMEM/F-12', category: 'base', purpose: 'Культивирование эпителиальных клеток', storageConditions: '2-8°C' },
  { name: 'RPMI-1640', category: 'base', purpose: 'Культивирование лимфоцитов', storageConditions: '2-8°C' },
  { name: 'MEM Alpha', category: 'base', purpose: 'Культивирование МСК', storageConditions: '2-8°C' },
  { name: 'KGM (кератиноцитарная)', category: 'base', purpose: 'Культивирование кератиноцитов', storageConditions: '2-8°C' },
  { name: 'EGM-2 (эндотелиальная)', category: 'base', purpose: 'Культивирование эндотелиоцитов', storageConditions: '2-8°C' },
  { name: 'PBS', category: 'base', purpose: 'Промывка клеток', storageConditions: '15-25°C' },
  // Добавки
  { name: 'FBS (эмбриональная сыворотка)', category: 'additive', purpose: 'Добавка к среде (5-20%)', storageConditions: '-20°C' },
  { name: 'Пенициллин-Стрептомицин', category: 'additive', purpose: 'Антибиотик (1%)', storageConditions: '-20°C' },
  { name: 'L-Глутамин', category: 'additive', purpose: 'Добавка к среде (1-2%)', storageConditions: '-20°C' },
  { name: 'Фунгизон', category: 'additive', purpose: 'Антимикотик', storageConditions: '-20°C' },
  { name: 'Гентамицин', category: 'additive', purpose: 'Антибиотик', storageConditions: '2-8°C' },
  // Ферменты
  { name: 'Трипсин-ЭДТА 0.25%', category: 'enzyme', purpose: 'Диссоциация клеток', storageConditions: '-20°C' },
  { name: 'Трипсин-ЭДТА 0.05%', category: 'enzyme', purpose: 'Диссоциация клеток', storageConditions: '-20°C' },
  { name: 'Коллагеназа I', category: 'enzyme', purpose: 'Ферментативная обработка тканей', storageConditions: '-20°C' },
  { name: 'Коллагеназа II', category: 'enzyme', purpose: 'Обработка жировой ткани', storageConditions: '-20°C' },
  { name: 'Диспаза', category: 'enzyme', purpose: 'Ферментативная обработка тканей', storageConditions: '-20°C' },
  // Другое
  { name: 'Фиколл-Пак', category: 'other', purpose: 'Выделение мононуклеаров', storageConditions: '15-25°C' },
  { name: 'ДМСО криопротектор', category: 'other', purpose: 'Криоконсервация', storageConditions: '15-25°C' },
];

const statusLabels: Record<string, string> = { approved: 'Одобрено', quarantine: 'Карантин', disposed: 'Утилизировано', exhausted: 'Израсходовано' };
const statusColors: Record<string, string> = { approved: 'green', quarantine: 'yellow', disposed: 'red', exhausted: 'slate' };
const categoryColors: Record<MediaCategory, string> = { base: 'blue', additive: 'purple', enzyme: 'orange', other: 'slate' };

export const MediaPage: React.FC = () => {
  const { media, addMedia, updateMedia, addTask, tasks } = useApp();
  const safeTasks = tasks || [];
  const safeMedia = media || [];
  const { canEdit } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCombinedModalOpen, setIsCombinedModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    lotNumber: '',
    catalogNumber: '',
    category: 'base' as MediaCategory,
    purpose: '',
    volume: '',
    unit: 'мл',
    expiryDate: '',
    storageConditions: '',
    lowStockThreshold: '100',
    isSterile: true,
    sterilizationMethod: 'factory' as 'filter_0.22' | 'filter_0.1' | 'autoclave' | 'gamma' | 'uv' | 'factory' | 'none'
  });

  // Для комбинированной среды
  const [combinedForm, setCombinedForm] = useState({
    name: '',
    components: [] as { mediaId: string; volumeUsed: string }[],
    isSterile: true,
    sterilizationMethod: 'filter_0.22' as 'filter_0.22' | 'filter_0.1' | 'autoclave' | 'gamma' | 'uv' | 'factory' | 'none'
  });

  // Справочник методов стерилизации
  const STERILIZATION_METHODS = [
    { value: 'factory', label: 'Заводская стерильность' },
    { value: 'filter_0.22', label: 'Фильтрация 0.22 мкм' },
    { value: 'filter_0.1', label: 'Фильтрация 0.1 мкм' },
    { value: 'autoclave', label: 'Автоклавирование' },
    { value: 'gamma', label: 'Гамма-облучение' },
    { value: 'uv', label: 'УФ-облучение' },
    { value: 'none', label: 'Не стерилизовано' }
  ];

  // Авторасчёт объёма комбинированной среды
  const calculatedTotalVolume = useMemo(() => {
    return combinedForm.components.reduce((sum, c) => sum + (parseFloat(c.volumeUsed) || 0), 0);
  }, [combinedForm.components]);

  const resetForm = () => {
    setFormData({
      name: '', manufacturer: '', lotNumber: '', catalogNumber: '',
      category: 'base', purpose: '', volume: '', unit: 'мл',
      expiryDate: '', storageConditions: '', lowStockThreshold: '100',
      isSterile: true, sterilizationMethod: 'factory'
    });
    setSelectedTemplate('');
  };

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(templateName);
    if (templateName === '') {
      resetForm();
    } else {
      const template = STANDARD_MEDIA.find(m => m.name === templateName);
      if (template) {
        setFormData({
          ...formData,
          name: template.name,
          category: template.category,
          purpose: template.purpose,
          storageConditions: template.storageConditions,
          manufacturer: '',
          lotNumber: '',
          catalogNumber: '',
          volume: '',
          expiryDate: ''
        });
      }
    }
  };

  const checkAndCreateTasks = (mediaItem: Media) => {
    const threshold = mediaItem.lowStockThreshold || 100;
    const daysUntilExpiry = Math.ceil((new Date(mediaItem.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    // Проверка на малый остаток
    if (mediaItem.remainingVolume <= threshold && mediaItem.remainingVolume > 0) {
      const existingTask = safeTasks.find(t => 
        t.relatedEntityId === mediaItem.id && 
        t.title.includes('Малый остаток') && 
        t.status !== 'completed'
      );
      if (!existingTask) {
        addTask({
          title: `Малый остаток: ${mediaItem.name}`,
          description: `Остаток ${mediaItem.remainingVolume} ${mediaItem.unit} (порог: ${threshold}). Рассмотреть приобретение.`,
          priority: 'medium',
          status: 'new',
          relatedEntityId: mediaItem.id,
          relatedEntityType: 'media',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }
    
    // Проверка на истекающий срок (менее 14 дней)
    if (daysUntilExpiry <= 14 && daysUntilExpiry > 0) {
      const existingTask = safeTasks.find(t => 
        t.relatedEntityId === mediaItem.id && 
        t.title.includes('Истекает срок') && 
        t.status !== 'completed'
      );
      if (!existingTask) {
        addTask({
          title: `Истекает срок: ${mediaItem.name}`,
          description: `Срок годности истекает через ${daysUntilExpiry} дней. Проверить необходимость использования или утилизации.`,
          priority: 'high',
          status: 'new',
          relatedEntityId: mediaItem.id,
          relatedEntityType: 'media',
          dueDate: new Date(mediaItem.expiryDate).toISOString()
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vol = parseFloat(formData.volume) || 0;
    const newMedia = {
      name: formData.name,
      manufacturer: formData.manufacturer,
      lotNumber: formData.lotNumber,
      catalogNumber: formData.catalogNumber,
      mediaType: 'original' as const,
      category: formData.category,
      purpose: formData.purpose,
      volume: vol,
      remainingVolume: vol,
      unit: formData.unit,
      expiryDate: formData.expiryDate,
      storageConditions: formData.storageConditions,
      lowStockThreshold: parseFloat(formData.lowStockThreshold) || 100,
      status: 'quarantine' as const,
      isSterile: formData.isSterile,
      sterilizationMethod: formData.isSterile ? formData.sterilizationMethod : 'none'
    };
    addMedia(newMedia);
    setIsModalOpen(false);
    resetForm();
  };

  const handleCreateCombined = (e: React.FormEvent) => {
    e.preventDefault();
    const totalVol = calculatedTotalVolume;
    const components = combinedForm.components.map(c => {
      const srcMedia = safeMedia.find(m => m.id === c.mediaId);
      return {
        mediaId: c.mediaId,
        mediaName: srcMedia?.name || '',
        lotNumber: srcMedia?.lotNumber || '',
        volumeUsed: parseFloat(c.volumeUsed) || 0
      };
    });
    
    // Списать компоненты
    components.forEach(c => {
      const srcMedia = safeMedia.find(m => m.id === c.mediaId);
      if (srcMedia) {
        const newRemaining = Math.max(0, srcMedia.remainingVolume - c.volumeUsed);
        updateMedia(srcMedia.id, { 
          remainingVolume: newRemaining,
          status: newRemaining === 0 ? 'exhausted' : srcMedia.status
        });
        checkAndCreateTasks({ ...srcMedia, remainingVolume: newRemaining });
      }
    });
    
    // Создать комбинированную среду
    const earliestExpiry = components.reduce((min, c) => {
      const src = safeMedia.find(m => m.id === c.mediaId);
      if (src && (!min || new Date(src.expiryDate) < new Date(min))) return src.expiryDate;
      return min;
    }, '');
    
    addMedia({
      name: combinedForm.name,
      manufacturer: 'Комбинированная',
      lotNumber: `COMB-${Date.now()}`,
      catalogNumber: '',
      mediaType: 'combined',
      category: 'base',
      purpose: 'Готовая культуральная среда',
      volume: totalVol,
      remainingVolume: totalVol,
      unit: 'мл',
      expiryDate: earliestExpiry || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      storageConditions: '2-8°C',
      lowStockThreshold: 50,
      status: 'approved',
      components,
      isSterile: combinedForm.isSterile,
      sterilizationMethod: combinedForm.isSterile ? combinedForm.sterilizationMethod : 'none',
      sterilizationDate: new Date().toISOString()
    });
    
    setIsCombinedModalOpen(false);
    setCombinedForm({ name: '', components: [], isSterile: true, sterilizationMethod: 'filter_0.22' });
  };

  const addComponent = () => {
    setCombinedForm(prev => ({
      ...prev,
      components: [...prev.components, { mediaId: '', volumeUsed: '' }]
    }));
  };

  const updateComponent = (idx: number, field: 'mediaId' | 'volumeUsed', value: string) => {
    setCombinedForm(prev => ({
      ...prev,
      components: prev.components.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    }));
  };

  const removeComponent = (idx: number) => {
    setCombinedForm(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== idx)
    }));
  };

  // Доступные для комбинирования среды
  const availableForCombining = (media || []).filter(m => 
    m.status === 'approved' && m.remainingVolume > 0 && new Date(m.expiryDate) > new Date()
  );

  const filteredMedia = useMemo(() => {
    return (media || []).filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(m.id).includes(searchQuery.toLowerCase()) ||
        m.lotNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && (m.status === 'approved' || m.status === 'quarantine')) ||
        m.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [media, searchQuery, categoryFilter, statusFilter]);

  const isExpiringSoon = (m: Media) => {
    const expiry = new Date(m.expiryDate);
    const daysUntil = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  };

  const isExpired = (m: Media) => new Date(m.expiryDate) < new Date();
  const isLowStock = (m: Media) => m.remainingVolume <= (m.lowStockThreshold || 100) && m.remainingVolume > 0;

  const categoryOptions = [
    { value: 'all', label: 'Все категории' },
    { value: 'base', label: 'Основные среды' },
    { value: 'additive', label: 'Добавки' },
    { value: 'enzyme', label: 'Ферменты' },
    { value: 'other', label: 'Другое' }
  ];

  const statusOptions = [
    { value: 'all', label: 'Все статусы' },
    { value: 'active', label: 'Активные' },
    { value: 'approved', label: 'Одобренные' },
    { value: 'quarantine', label: 'Карантин' },
    { value: 'exhausted', label: 'Израсходованные' },
    { value: 'disposed', label: 'Утилизированные' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Среды и реактивы</h1>
          <p className="text-slate-500">Учёт питательных сред, добавок и ферментов</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => generateMediaReport(media)}><FileDown className="w-4 h-4" /> Отчёт PDF</Button>
          {canEdit() && <Button variant="secondary" onClick={() => { setCombinedForm({ name: '', components: [{ mediaId: '', volumeUsed: '' }], isSterile: true, sterilizationMethod: 'filter_0.22' }); setIsCombinedModalOpen(true); }}>
            <FlaskConical className="w-4 h-4" /> Комбинированная
          </Button>}
          {canEdit() && <Button onClick={() => { resetForm(); setIsModalOpen(true); }}><Plus className="w-4 h-4" /> Добавить</Button>}
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg" />
            </div>
          </div>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={categoryOptions} />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusOptions} />
        </div>
      </Card>

      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMedia.map(m => (
            <Card key={m.id} className={`${isExpired(m) ? 'border-l-4 border-l-red-500' : isExpiringSoon(m) ? 'border-l-4 border-l-yellow-500' : isLowStock(m) ? 'border-l-4 border-l-orange-500' : ''}`}>
              <div className="flex justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{m.name}</h3>
                    {(isExpired(m) || isExpiringSoon(m) || isLowStock(m)) && (
                      <AlertTriangle className={`w-4 h-4 ${isExpired(m) ? 'text-red-500' : isExpiringSoon(m) ? 'text-yellow-500' : 'text-orange-500'}`} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={m.category} label={MEDIA_CATEGORY_LABELS[m.category]} color={categoryColors[m.category]} />
                    {m.mediaType === 'combined' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Комбинированная</span>}
                  </div>
                </div>
                <StatusBadge status={m.status} label={statusLabels[m.status]} color={statusColors[m.status]} />
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">ID:</span><span className="font-medium font-mono">{m.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Лот:</span><span className="font-medium">{m.lotNumber}</span></div>
                {m.manufacturer && m.manufacturer !== 'Комбинированная' && (
                  <div className="flex justify-between"><span className="text-slate-500">Производитель:</span><span className="font-medium">{m.manufacturer}</span></div>
                )}
                <div className="flex justify-between"><span className="text-slate-500">Остаток:</span>
                  <span className={`font-medium ${isLowStock(m) ? 'text-orange-600' : ''}`}>{m.remainingVolume}/{m.volume} {m.unit}</span>
                </div>
                <div className="flex justify-between"><span className="text-slate-500">Хранение:</span><span className="font-medium">{m.storageConditions}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Стерильность:</span>
                  <span className={`flex items-center gap-1 font-medium ${m.isSterile ? 'text-green-600' : 'text-red-600'}`}>
                    {m.isSterile ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                    {m.isSterile ? (
                      m.sterilizationMethod === 'filter_0.22' ? 'Фильтр 0.22' :
                      m.sterilizationMethod === 'filter_0.1' ? 'Фильтр 0.1' :
                      m.sterilizationMethod === 'autoclave' ? 'Автоклав' :
                      m.sterilizationMethod === 'gamma' ? 'Гамма' :
                      m.sterilizationMethod === 'uv' ? 'УФ' :
                      m.sterilizationMethod === 'factory' ? 'Заводская' : 'Да'
                    ) : 'Нет'}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-slate-500">Срок годности:</span>
                  <span className={`font-medium ${isExpired(m) ? 'text-red-600' : isExpiringSoon(m) ? 'text-yellow-600' : ''}`}>
                    {new Date(m.expiryDate).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                {m.components && m.components.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-slate-500 text-xs mb-1">Состав:</p>
                    {m.components.map((c, i) => (
                      <div key={i} className="text-xs text-slate-600">• {c.mediaName} ({c.volumeUsed} мл)</div>
                    ))}
                  </div>
                )}
              </div>
              {canEdit() && <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
                {m.status === 'quarantine' && (
                  <Button size="sm" variant="success" onClick={() => { updateMedia(m.id, { status: 'approved' }); checkAndCreateTasks(m); }}>
                    <CheckCircle className="w-3 h-3" /> Одобрить
                  </Button>
                )}
                {m.status === 'approved' && m.remainingVolume > 0 && (
                  <Button size="sm" variant="secondary" onClick={() => {
                    const used = parseFloat(prompt(`Использовано (${m.unit}):`) || '0');
                    if (used > 0) {
                      const remaining = Math.max(0, m.remainingVolume - used);
                      updateMedia(m.id, { remainingVolume: remaining, status: remaining === 0 ? 'exhausted' : 'approved' });
                      checkAndCreateTasks({ ...m, remainingVolume: remaining });
                    }
                  }}>Списать</Button>
                )}
                {m.status !== 'disposed' && (
                  <Button size="sm" variant="danger" onClick={() => updateMedia(m.id, { status: 'disposed' })}>
                    <Trash2 className="w-3 h-3" /> Утилизировать
                  </Button>
                )}
              </div>}
            </Card>
          ))}
        </div>
      ) : (
        <Card><EmptyState icon={Beaker} title="Среды не найдены" description="Добавьте питательные среды и реактивы" /></Card>
      )}

      {/* Модал добавления оригинальной среды */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Добавление среды/реактива" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <label className="block text-sm font-medium text-blue-800 mb-2">Выбрать из справочника</label>
            <select value={selectedTemplate} onChange={(e) => handleTemplateSelect(e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white">
              <option value="">-- Ручной ввод --</option>
              <optgroup label="Основные среды">
                {STANDARD_MEDIA.filter(m => m.category === 'base').map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </optgroup>
              <optgroup label="Добавки">
                {STANDARD_MEDIA.filter(m => m.category === 'additive').map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </optgroup>
              <optgroup label="Ферменты">
                {STANDARD_MEDIA.filter(m => m.category === 'enzyme').map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </optgroup>
              <optgroup label="Другое">
                {STANDARD_MEDIA.filter(m => m.category === 'other').map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <Input label="Название" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Производитель" value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} required />
            <Select label="Категория" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as MediaCategory})} 
              options={[{value: 'base', label: 'Основная среда'}, {value: 'additive', label: 'Добавка'}, {value: 'enzyme', label: 'Фермент'}, {value: 'other', label: 'Другое'}]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Номер лота" value={formData.lotNumber} onChange={(e) => setFormData({...formData, lotNumber: e.target.value})} required />
            <Input label="Каталожный номер" value={formData.catalogNumber} onChange={(e) => setFormData({...formData, catalogNumber: e.target.value})} />
          </div>
          <Input label="Назначение" value={formData.purpose} onChange={(e) => setFormData({...formData, purpose: e.target.value})} />
          <div className="grid grid-cols-4 gap-4">
            <Input label="Объём" type="number" value={formData.volume} onChange={(e) => setFormData({...formData, volume: e.target.value})} required />
            <Select label="Единица" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} options={[{value: 'мл', label: 'мл'}, {value: 'л', label: 'л'}, {value: 'г', label: 'г'}]} />
            <Input label="Срок годности" type="date" value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} required />
            <Input label="Мин. остаток" type="number" value={formData.lowStockThreshold} onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value})} placeholder="100" />
          </div>
          <Input label="Условия хранения" value={formData.storageConditions} onChange={(e) => setFormData({...formData, storageConditions: e.target.value})} />
          
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.isSterile} onChange={(e) => setFormData({...formData, isSterile: e.target.checked})} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-green-800">Стерильно</span>
              </label>
            </div>
            {formData.isSterile && (
              <Select label="Метод стерилизации" value={formData.sterilizationMethod} 
                onChange={(e) => setFormData({...formData, sterilizationMethod: e.target.value as typeof formData.sterilizationMethod})} 
                options={STERILIZATION_METHODS} />
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">Добавить</Button>
          </div>
        </form>
      </Modal>

      {/* Модал комбинированной среды */}
      <Modal isOpen={isCombinedModalOpen} onClose={() => setIsCombinedModalOpen(false)} title="Приготовление комбинированной среды" size="lg">
        <form onSubmit={handleCreateCombined} className="space-y-4">
          <div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
            Комбинированная среда создаётся из имеющихся компонентов. Объёмы будут списаны автоматически.
          </div>
          
          <Input label="Название готовой среды" value={combinedForm.name} onChange={(e) => setCombinedForm({...combinedForm, name: e.target.value})} required placeholder="напр. DMEM + 10% FBS + Глутамин" />
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Компоненты</label>
              <Button type="button" size="sm" variant="secondary" onClick={addComponent}><Plus className="w-3 h-3" /> Добавить</Button>
            </div>
            <div className="space-y-2">
              {combinedForm.components.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select className="flex-1" value={comp.mediaId} onChange={(e) => updateComponent(idx, 'mediaId', e.target.value)}
                    options={[{ value: '', label: 'Выберите компонент' }, ...availableForCombining.map(m => ({ 
                      value: m.id, 
                      label: `${m.name} (${m.lotNumber}) — ${m.remainingVolume} ${m.unit}` 
                    }))]} />
                  <Input className="w-28" type="number" placeholder="Объём" value={comp.volumeUsed} onChange={(e) => updateComponent(idx, 'volumeUsed', e.target.value)} />
                  <span className="text-sm text-slate-500">мл</span>
                  {combinedForm.components.length > 1 && (
                    <button type="button" onClick={() => removeComponent(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-800">Общий объём:</span>
              <span className="text-lg font-bold text-blue-900">{calculatedTotalVolume} мл</span>
            </div>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={combinedForm.isSterile} onChange={(e) => setCombinedForm({...combinedForm, isSterile: e.target.checked})} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-green-800">Стерильно</span>
              </label>
            </div>
            {combinedForm.isSterile && (
              <Select label="Метод стерилизации" value={combinedForm.sterilizationMethod} 
                onChange={(e) => setCombinedForm({...combinedForm, sterilizationMethod: e.target.value as typeof combinedForm.sterilizationMethod})} 
                options={STERILIZATION_METHODS} />
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsCombinedModalOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={combinedForm.components.length === 0 || !combinedForm.name || calculatedTotalVolume === 0}>
              <FlaskConical className="w-4 h-4" /> Создать среду
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
