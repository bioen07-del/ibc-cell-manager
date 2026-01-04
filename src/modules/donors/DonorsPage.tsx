// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, Textarea, StatusBadge, EmptyState } from '../../components/UI';
import { Plus, Users, Search, Edit2, Droplets, Eye, FlaskConical, FileText, Trash2 } from 'lucide-react';
import { calculateAge, donorStatusLabels, getStatusColor, formatDateTime } from '../../utils';
import { generateDonorReport, generateDonationsListReport, generateDonorsListReport } from '../../utils/pdf';
import { useNavigate } from 'react-router-dom';

type BloodGroup = 'A' | 'B' | 'AB' | 'O' | '';
type RhFactor = 'positive' | 'negative' | '';
type Gender = 'male' | 'female';
type DonorStatus = 'active' | 'quarantine' | 'archived';

interface Donor {
  id: number;
  code?: string;
  full_name?: string;
  birth_date?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  rh_factor?: string;
  phone?: string;
  email?: string;
  diagnosis?: string;
  health_notes?: string;
  contract_number?: string;
  contract_date?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  status: string;
  notes?: string;
  created_at?: string;
}

export const DonorsPage: React.FC = () => {
  const { donors, addDonor, updateDonor, deleteDonor, cultures, donations } = useApp();
  const { canEdit, isAdmin } = useAuth();
  const navigate = useNavigate();

  const getDonationsByDonorId = (donorId: number) => {
    return (donations || []).filter((d: any) => d.donor_id === donorId);
  };

  const getDonorCultures = (donorId: number) => {
    return (cultures || []).filter((c: any) => c.donor_id === donorId);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewDonor, setViewDonor] = useState<Donor | null>(null);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    code: '',
    fullName: '',
    birthDate: '',
    gender: 'male' as Gender,
    bloodGroup: '' as BloodGroup,
    rhFactor: '' as RhFactor,
    phone: '',
    email: '',
    diagnosis: '',
    healthNotes: '',
    contractNumber: '',
    contractDate: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    status: 'active' as DonorStatus
  });

  const resetForm = () => {
    setFormData({
      code: '', fullName: '', birthDate: '', gender: 'male', bloodGroup: '', rhFactor: '',
      phone: '', email: '', diagnosis: '', healthNotes: '', contractNumber: '', contractDate: '',
      customerName: '', customerPhone: '', customerEmail: '', status: 'active'
    });
    setEditingDonor(null);
  };

  const formatBloodType = (group: string | undefined, rh: string | undefined) => {
    if (!group) return undefined;
    const rhSign = rh === 'positive' ? '+' : rh === 'negative' ? '-' : '';
    return `${group}${rhSign}`;
  };

  const parseBloodType = (bt: string | undefined): { group: BloodGroup, rh: RhFactor } => {
    if (!bt) return { group: '', rh: '' };
    const match = bt.match(/^(A|B|AB|O)(\+|-)?$/);
    if (!match) return { group: '', rh: '' };
    return {
      group: match[1] as BloodGroup,
      rh: match[2] === '+' ? 'positive' : match[2] === '-' ? 'negative' : ''
    };
  };

  // Генерация кода донора
  const generateDonorCode = () => {
    const year = new Date().getFullYear();
    const safeDonors = donors || [];
    const thisYearDonors = safeDonors.filter((d: any) => d.code?.startsWith(`DON-${year}`));
    const nextNum = thisYearDonors.length + 1;
    return `DON-${year}-${String(nextNum).padStart(3, '0')}`;
  };

  const handleOpenModal = (donor?: Donor) => {
    if (donor) {
      setEditingDonor(donor);
      const { group, rh } = parseBloodType(donor.blood_type);
      setFormData({
        code: donor.code || '',
        fullName: donor.full_name || '',
        birthDate: donor.birth_date || '',
        gender: (donor.gender as Gender) || 'male',
        bloodGroup: group,
        rhFactor: (donor.rh_factor as RhFactor) || rh,
        phone: donor.phone || '',
        email: donor.email || '',
        diagnosis: donor.diagnosis || '',
        healthNotes: donor.health_notes || '',
        contractNumber: donor.contract_number || '',
        contractDate: donor.contract_date || '',
        customerName: donor.customer_name || '',
        customerPhone: donor.customer_phone || '',
        customerEmail: donor.customer_email || '',
        status: (donor.status as DonorStatus) || 'active'
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const donorData = {
      code: editingDonor ? (formData.code || generateDonorCode()) : generateDonorCode(),
      full_name: formData.fullName || null,
      birth_date: formData.birthDate || null,
      age: formData.birthDate ? calculateAge(formData.birthDate) : null,
      gender: formData.gender,
      blood_type: formatBloodType(formData.bloodGroup, formData.rhFactor) || null,
      rh_factor: formData.rhFactor || null,
      phone: formData.phone || null,
      email: formData.email || null,
      diagnosis: formData.diagnosis || null,
      health_notes: formData.healthNotes || null,
      contract_number: formData.contractNumber || null,
      contract_date: formData.contractDate || null,
      customer_name: formData.customerName || null,
      customer_phone: formData.customerPhone || null,
      customer_email: formData.customerEmail || null,
      status: formData.status
    };
    if (editingDonor) {
      await updateDonor(editingDonor.id, donorData);
    } else {
      await addDonor(donorData);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleNewDonation = (donorId: number) => {
    navigate(`/donations?donorId=${donorId}&action=new`);
  };

  const bloodGroupOptions = [
    { value: '', label: 'Не указана' },
    { value: 'A', label: 'A (II)' },
    { value: 'B', label: 'B (III)' },
    { value: 'AB', label: 'AB (IV)' },
    { value: 'O', label: 'O (I)' }
  ];

  const rhFactorOptions = [
    { value: '', label: 'Не указан' },
    { value: 'positive', label: 'Rh+ (положительный)' },
    { value: 'negative', label: 'Rh- (отрицательный)' }
  ];

  const genderOptions = [
    { value: 'male', label: 'Мужской' },
    { value: 'female', label: 'Женский' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Активный' },
    { value: 'quarantine', label: 'Карантин' },
    { value: 'archived', label: 'Архивный' }
  ];

  const filteredDonors = (donors || []).filter((donor: Donor) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (donor.full_name || '').toLowerCase().includes(searchLower) ||
      (donor.code || '').toLowerCase().includes(searchLower) ||
      String(donor.id).includes(searchQuery) ||
      (donor.phone || '').includes(searchQuery) ||
      (donor.diagnosis || '').toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || donor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatBloodDisplay = (donor: Donor): string => {
    return donor.blood_type || '—';
  };

  const getDisplayAge = (donor: Donor): string => {
    if (donor.birth_date) {
      return `${calculateAge(donor.birth_date)} лет`;
    }
    if (donor.age) {
      return `${donor.age} лет`;
    }
    return '—';
  };

  const getDisplayName = (donor: Donor): string => {
    return donor.full_name || donor.code || `#${donor.id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Доноры</h1>
          <p className="text-slate-500">Управление информацией о донорах ({(donors || []).length})</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => generateDonorsListReport(donors || [], donations || [], cultures || [])}>
            <Users className="w-4 h-4" /> Журнал доноров
          </Button>
          <Button variant="secondary" onClick={() => generateDonationsListReport(donations || [], donors || [], cultures || [])}>
            <FileText className="w-4 h-4" /> Журнал донаций
          </Button>
          {canEdit() && (
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4" /> Добавить донора
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по имени, коду, ID или телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: 'all', label: 'Все статусы' }, ...statusOptions]}
          />
        </div>
      </Card>

      <Card>
        {filteredDonors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Код</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">ФИО</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Возраст</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Группа/Rh</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Телефон</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Донаций</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Статус</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonors.map((donor: Donor) => {
                  const donationsCount = getDonationsByDonorId(donor.id).length;
                  return (
                    <tr key={donor.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-sm text-primary">{donor.id}</td>
                      <td className="py-3 px-4 font-mono text-sm">{donor.code || '—'}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{donor.full_name || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{getDisplayAge(donor)}</td>
                      <td className="py-3 px-4 text-slate-600">{formatBloodDisplay(donor)}</td>
                      <td className="py-3 px-4 text-slate-600">{donor.phone || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{donationsCount}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={donor.status} label={donorStatusLabels[donor.status] || donor.status} color={getStatusColor(donor.status)} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewDonor(donor)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Просмотр">
                            <Eye className="w-4 h-4 text-slate-500" />
                          </button>
                          {canEdit() && (
                            <button onClick={() => handleOpenModal(donor)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Редактировать">
                              <Edit2 className="w-4 h-4 text-slate-500" />
                            </button>
                          )}
                          {canEdit() && donor.status === 'active' && (
                            <button onClick={() => handleNewDonation(donor.id)} className="p-1.5 hover:bg-blue-100 rounded-lg" title="Новая донация">
                              <Droplets className="w-4 h-4 text-blue-500" />
                            </button>
                          )}
                          {isAdmin() && (
                            <button onClick={() => { if(confirm('Удалить донора ' + (donor.full_name || donor.code) + '?')) deleteDonor(donor.id); }} className="p-1.5 hover:bg-red-100 rounded-lg" title="Удалить">
                              <Trash2 className="w-4 h-4 text-red-500" />
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
          <EmptyState icon={Users} title="Доноры не найдены" description={searchQuery ? 'Попробуйте изменить параметры поиска' : 'Добавьте первого донора'} />
        )}
      </Card>

      {/* Просмотр донора */}
      <Modal isOpen={!!viewDonor} onClose={() => setViewDonor(null)} title={viewDonor ? getDisplayName(viewDonor) : ''} size="lg">
        {viewDonor && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-slate-500 text-sm">ID</p><p className="font-medium font-mono">{viewDonor.id}</p></div>
              <div><p className="text-slate-500 text-sm">Статус</p><StatusBadge status={viewDonor.status} label={donorStatusLabels[viewDonor.status] || viewDonor.status} color={getStatusColor(viewDonor.status)} /></div>
              {viewDonor.code && <div><p className="text-slate-500 text-sm">Код</p><p className="font-medium font-mono">{viewDonor.code}</p></div>}
              {viewDonor.full_name && <div><p className="text-slate-500 text-sm">ФИО</p><p className="font-medium">{viewDonor.full_name}</p></div>}
              {viewDonor.birth_date && <div><p className="text-slate-500 text-sm">Дата рождения</p><p className="font-medium">{new Date(viewDonor.birth_date).toLocaleDateString('ru-RU')} ({calculateAge(viewDonor.birth_date)} лет)</p></div>}
              {!viewDonor.birth_date && viewDonor.age && <div><p className="text-slate-500 text-sm">Возраст</p><p className="font-medium">{viewDonor.age} лет</p></div>}
              <div><p className="text-slate-500 text-sm">Пол</p><p className="font-medium">{viewDonor.gender === 'male' ? 'Мужской' : viewDonor.gender === 'female' ? 'Женский' : '—'}</p></div>
              <div><p className="text-slate-500 text-sm">Группа крови / Rh</p><p className="font-medium">{formatBloodDisplay(viewDonor)}</p></div>
              {viewDonor.phone && <div><p className="text-slate-500 text-sm">Телефон</p><p className="font-medium">{viewDonor.phone}</p></div>}
              {viewDonor.email && <div><p className="text-slate-500 text-sm">Email</p><p className="font-medium">{viewDonor.email}</p></div>}
              {viewDonor.contract_number && <div><p className="text-slate-500 text-sm">Договор</p><p className="font-medium">{viewDonor.contract_number} {viewDonor.contract_date ? `от ${new Date(viewDonor.contract_date).toLocaleDateString('ru-RU')}` : ''}</p></div>}
            </div>

            {viewDonor.diagnosis && (
              <div className="border-t pt-4">
                <p className="text-slate-500 text-sm mb-1">Диагноз</p>
                <p className="text-slate-700">{viewDonor.diagnosis}</p>
              </div>
            )}

            {viewDonor.health_notes && (
              <div className="border-t pt-4">
                <p className="text-slate-500 text-sm mb-1">Заметки о здоровье</p>
                <p className="text-slate-700">{viewDonor.health_notes}</p>
              </div>
            )}

            {viewDonor.customer_name && (
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Заказчик</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-slate-500">ФИО</p><p>{viewDonor.customer_name}</p></div>
                  {viewDonor.customer_phone && <div><p className="text-slate-500">Телефон</p><p>{viewDonor.customer_phone}</p></div>}
                  {viewDonor.customer_email && <div><p className="text-slate-500">Email</p><p>{viewDonor.customer_email}</p></div>}
                </div>
              </div>
            )}

            {/* Связанные донации */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Донации ({getDonationsByDonorId(viewDonor.id).length})</p>
                {canEdit() && viewDonor.status === 'active' && <Button size="sm" onClick={() => handleNewDonation(viewDonor.id)}><Plus className="w-3 h-3" /> Новая</Button>}
              </div>
              {getDonationsByDonorId(viewDonor.id).length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getDonationsByDonorId(viewDonor.id).map((d: any) => (
                    <div key={d.id} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                      <span className="font-mono text-primary">{d.id}</span>
                      <span>{d.material_type || '—'}</span>
                      <span>{formatDateTime(d.created_at)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">Нет донаций</p>}
            </div>

            {/* Связанные культуры */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="w-4 h-4" />
                <p className="font-medium">Культуры ({getDonorCultures(viewDonor.id).length})</p>
              </div>
              {getDonorCultures(viewDonor.id).length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getDonorCultures(viewDonor.id).map((c: any) => (
                    <div key={c.id} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                      <span className="font-mono text-primary">{c.id}</span>
                      <span>{c.cell_type || '—'}</span>
                      <span>P{c.passage || 0}</span>
                      <StatusBadge status={c.status} label={c.status} color={c.status === 'in_work' ? 'green' : 'slate'} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">Нет культур</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t flex-wrap">
              <Button variant="secondary" onClick={() => generateDonorReport(viewDonor, getDonationsByDonorId(viewDonor.id))}>
                <FileText className="w-4 h-4" /> Отчет
              </Button>
              <Button variant="secondary" onClick={() => setViewDonor(null)}>Закрыть</Button>
              {canEdit() && <Button onClick={() => { setViewDonor(null); handleOpenModal(viewDonor); }}>Редактировать</Button>}
            </div>
          </div>
        )}
      </Modal>

      {/* Добавление/Редактирование */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingDonor ? 'Редактирование донора' : 'Новый донор'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editingDonor && (
              <Input label="Код донора" value={formData.code} disabled className="bg-slate-100" />
            )}
            {!editingDonor && (
              <div className="flex items-end pb-2">
                <span className="text-slate-600">Код: <strong className="font-mono">{generateDonorCode()}</strong> <span className="text-xs text-slate-400">(автоматически)</span></span>
              </div>
            )}
            <div></div>
            <div className="md:col-span-2">
              <Input label="ФИО *" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
            </div>
            <Input label="Дата рождения *" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} required />
            {formData.birthDate && (
              <div className="flex items-end pb-2">
                <span className="text-slate-600">Возраст: <strong>{calculateAge(formData.birthDate)}</strong> лет</span>
              </div>
            )}
            <Select label="Пол *" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })} options={genderOptions} />
            <div className="grid grid-cols-2 gap-2">
              <Select label="Группа крови" value={formData.bloodGroup} onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value as BloodGroup })} options={bloodGroupOptions} />
              <Select label="Резус-фактор" value={formData.rhFactor} onChange={(e) => setFormData({ ...formData, rhFactor: e.target.value as RhFactor })} options={rhFactorOptions} />
            </div>
            <Input label="Телефон *" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
            <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <Input label="Номер договора" value={formData.contractNumber} onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })} />
            <Input label="Дата договора" type="date" value={formData.contractDate} onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })} />
            <div className="md:col-span-2">
              <Input label="Диагноз" value={formData.diagnosis} onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Textarea label="Комментарии о здоровье" value={formData.healthNotes} onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })} />
            </div>
            
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <p className="text-sm font-medium text-slate-700 mb-3">Заказчик (если отличается от донора)</p>
            </div>
            <Input label="ФИО заказчика" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
            <Input label="Телефон заказчика" type="tel" value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} />
            <Input label="Email заказчика" type="email" value={formData.customerEmail} onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} />
            <Select label="Статус" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as DonorStatus })} options={statusOptions} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>Отмена</Button>
            <Button type="submit">{editingDonor ? 'Сохранить' : 'Добавить'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
