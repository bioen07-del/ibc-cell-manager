// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, EmptyState } from '../../components/UI';
import { Package, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { CONTAINER_CATEGORY_LABELS } from '../../types';

const getCategoryLabel = (cat: string) => CONTAINER_CATEGORY_LABELS[cat] || cat;

export const ContainersPage: React.FC = () => {
  const { containerTypes, addContainerType, updateContainerType, deleteContainerType } = useApp();
  const { canEdit } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    volume_min: '',
    volume_max: '',
    volume_recommended: '',
    category: 'flask',
    is_active: true
  });

  const resetForm = () => {
    setFormData({
      name: '', area: '', volume_min: '', volume_max: '', volume_recommended: '',
      category: 'flask', is_active: true
    });
    setEditingItem(null);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      area: String(item.area || ''),
      volume_min: String(item.volume_min || ''),
      volume_max: String(item.volume_max || ''),
      volume_recommended: String(item.volume_recommended || ''),
      category: item.category || 'flask',
      is_active: item.is_active ?? true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      area: parseFloat(formData.area) || 0,
      volume_min: parseFloat(formData.volume_min) || 0,
      volume_max: parseFloat(formData.volume_max) || 0,
      volume_recommended: parseFloat(formData.volume_recommended) || 0,
      category: formData.category,
      is_active: formData.is_active
    };
    
    if (editingItem) {
      updateContainerType(editingItem.id, data);
    } else {
      addContainerType(data);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const safeContainerTypes = containerTypes || [];
  
  const filteredItems = safeContainerTypes.filter((item: any) => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: safeContainerTypes.length,
    active: safeContainerTypes.filter((c: any) => c.is_active).length,
    flasks: safeContainerTypes.filter((c: any) => c.category === 'flask').length,
    plates: safeContainerTypes.filter((c: any) => c.category === 'plate').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Справочник посуды</h1>
          <p className="text-slate-500">Культуральная посуда и её параметры</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Добавить посуду
          </Button>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
          <div className="text-sm text-slate-500">Всего типов</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          <div className="text-sm text-slate-500">Активных</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.flasks}</div>
          <div className="text-sm text-slate-500">Флаконов</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.plates}</div>
          <div className="text-sm text-slate-500">Планшетов</div>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Поиск..." value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg" />
          </div>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Все категории' },
              { value: 'flask', label: 'Флаконы' },
              { value: 'dish', label: 'Чашки Петри' },
              { value: 'plate', label: 'Планшеты' },
              { value: 'cryotube', label: 'Криопосуда' },
              { value: 'other', label: 'Другое' }
            ]}
          />
        </div>
      </Card>

      {/* Таблица */}
      {filteredItems.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Название</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Категория</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Площадь (см²)</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Объём (мл)</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Статус</th>
                  {canEdit() && <th className="text-right py-3 px-4 font-medium text-slate-600">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-slate-600">{getCategoryLabel(item.category)}</td>
                    <td className="py-3 px-4 text-right">{item.area}</td>
                    <td className="py-3 px-4 text-right text-sm text-slate-500">
                      {item.volume_min}-{item.volume_max} (рек. {item.volume_recommended})
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => canEdit() && updateContainerType(item.id, { is_active: !item.is_active })}
                        disabled={!canEdit()}
                        className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${item.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} ${!canEdit() ? 'cursor-not-allowed' : ''}`}
                      >
                        {item.is_active ? 'Активно' : 'Неактивно'}
                      </button>
                    </td>
                    {canEdit() && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(item)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => deleteContainerType(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={Package} title="Посуда не найдена" description="Добавьте типы культуральной посуды" />
        </Card>
      )}

      {/* Модальное окно */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} 
        title={editingItem ? 'Редактирование посуды' : 'Добавление посуды'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Название *" value={formData.name} 
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
            placeholder="напр. Флакон T75" required />
          
          <Select label="Категория" value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            options={[
              { value: 'flask', label: 'Флакон' },
              { value: 'dish', label: 'Чашка Петри' },
              { value: 'plate', label: 'Планшет' },
              { value: 'cryotube', label: 'Криопробирка' },
              { value: 'other', label: 'Другое' }
            ]}
          />
          
          <Input label="Площадь (см²) *" type="number" step="0.01" value={formData.area}
            onChange={(e) => setFormData({...formData, area: e.target.value})} required />
          
          <div className="grid grid-cols-3 gap-4">
            <Input label="Мин. объём (мл)" type="number" step="0.1" value={formData.volume_min}
              onChange={(e) => setFormData({...formData, volume_min: e.target.value})} />
            <Input label="Макс. объём (мл)" type="number" step="0.1" value={formData.volume_max}
              onChange={(e) => setFormData({...formData, volume_max: e.target.value})} />
            <Input label="Рекоменд. объём" type="number" step="0.1" value={formData.volume_recommended}
              onChange={(e) => setFormData({...formData, volume_recommended: e.target.value})} />
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4 rounded border-slate-300" />
            <span className="text-sm text-slate-700">Активно (доступно для выбора)</span>
          </label>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>Отмена</Button>
            <Button type="submit">{editingItem ? 'Сохранить' : 'Добавить'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
