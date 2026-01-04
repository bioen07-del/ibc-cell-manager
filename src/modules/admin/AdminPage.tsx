// @ts-nocheck
import React, { useState } from 'react';
import { useAuth, UserRole, User } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, StatusBadge, EmptyState } from '../../components/UI';
import { Users, Shield, Plus, Search, Edit2, Trash2, Activity, Clock, User as UserIcon, Send, Check, X, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../utils';

const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  operator: 'Оператор',
  customer: 'Заказчик',
  doctor: 'Врач'
};

const roleColors: Record<UserRole, string> = {
  admin: 'red',
  operator: 'green',
  customer: 'blue',
  doctor: 'purple'
};

const roleOptions = [
  { value: 'operator', label: 'Оператор' },
  { value: 'customer', label: 'Заказчик' },
  { value: 'doctor', label: 'Врач' }
];

export const AdminPage: React.FC = () => {
  const { users, activityLogs, addUser, updateUser, deleteUser, isAdmin, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'telegram'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [tgUsers, setTgUsers] = useState<any[]>([]);
  const [tgLoading, setTgLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    role: 'operator' as UserRole,
    password: '',
    isActive: true
  });

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <div className="text-center p-8">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Доступ запрещён</h2>
            <p className="text-slate-500">Этот раздел доступен только администраторам</p>
          </div>
        </Card>
      </div>
    );
  }

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        name: user.name,
        role: user.role,
        password: '',
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        name: '',
        role: 'operator',
        password: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUser(editingUser.id, {
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive
      });
    } else {
      addUser({
        username: formData.username,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive
      }, formData.password);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (userId: string) => {
    if (userId === currentUser?.id) {
      alert('Нельзя удалить свою учётную запись');
      return;
    }
    if (confirm('Удалить пользователя?')) {
      deleteUser(userId);
    }
  };

  const safeUsers = users || [];
  const safeActivityLogs = activityLogs || [];

  const filteredUsers = safeUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredLogs = safeActivityLogs.filter(log => {
    if (logFilter === 'all') return true;
    return log.userId === logFilter;
  });

  const operators = safeUsers.filter(u => u.role === 'operator');

  const loadTgUsers = async () => {
    setTgLoading(true);
    const { data } = await supabase.from('telegram_users').select('*').order('created_at', { ascending: false });
    if (data) setTgUsers(data);
    setTgLoading(false);
  };

  const verifyTgUser = async (id: number, verified: boolean) => {
    await supabase.from('telegram_users').update({ verified }).eq('id', id);
    setTgUsers(prev => prev.map(u => u.id === id ? { ...u, verified } : u));
  };

  const deleteTgUser = async (id: number) => {
    if (!confirm('Удалить Telegram пользователя?')) return;
    await supabase.from('telegram_users').delete().eq('id', id);
    setTgUsers(prev => prev.filter(u => u.id !== id));
  };

  React.useEffect(() => {
    if (activeTab === 'telegram') loadTgUsers();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Администрирование</h1>
          <p className="text-slate-500">Управление пользователями и журнал действий</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'users' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Пользователи ({safeUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'logs' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          Журнал действий ({safeActivityLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('telegram')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'telegram' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Send className="w-4 h-4" />
          Telegram
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{safeUsers.filter(u => u.role === 'admin').length}</p>
                  <p className="text-xs text-slate-500">Администраторы</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{safeUsers.filter(u => u.role === 'operator').length}</p>
                  <p className="text-xs text-slate-500">Операторы</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{safeUsers.filter(u => u.role === 'customer').length}</p>
                  <p className="text-xs text-slate-500">Заказчики</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{safeUsers.filter(u => u.role === 'doctor').length}</p>
                  <p className="text-xs text-slate-500">Врачи</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Поиск пользователей..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Все роли' },
                  { value: 'admin', label: 'Администраторы' },
                  ...roleOptions
                ]}
              />
              <Button onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4" /> Добавить
              </Button>
            </div>
          </Card>

          {/* Users List */}
          <Card>
            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-500 border-b">
                      <th className="pb-3 font-medium">ID</th>
                      <th className="pb-3 font-medium">Логин</th>
                      <th className="pb-3 font-medium">ФИО</th>
                      <th className="pb-3 font-medium">Роль</th>
                      <th className="pb-3 font-medium">Статус</th>
                      <th className="pb-3 font-medium">Создан</th>
                      <th className="pb-3 font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono text-sm text-slate-500">{u.id}</td>
                        <td className="py-3 font-medium">{u.username}</td>
                        <td className="py-3">{u.name}</td>
                        <td className="py-3">
                          <StatusBadge status={u.role} label={roleLabels[u.role]} color={roleColors[u.role]} />
                        </td>
                        <td className="py-3">
                          <StatusBadge 
                            status={u.isActive ? 'active' : 'inactive'} 
                            label={u.isActive ? 'Активен' : 'Заблокирован'} 
                            color={u.isActive ? 'green' : 'red'} 
                          />
                        </td>
                        <td className="py-3 text-sm text-slate-500">{formatDateTime(u.createdAt)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleOpenModal(u)}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-primary"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {u.role !== 'admin' && (
                              <button 
                                onClick={() => handleDelete(u.id)}
                                className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Пользователи не найдены"
                description="Измените фильтры или добавьте нового пользователя"
              />
            )}
          </Card>
        </>
      )}

      {activeTab === 'logs' && (
        <>
          {/* Log Filters */}
          <Card>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Select
                  label="Фильтр по оператору"
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'Все пользователи' },
                    ...operators.map(op => ({ value: op.id, label: op.name }))
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Activity Logs */}
          <Card>
            {filteredLogs.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-auto">
                {filteredLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800">{log.userName}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-sm text-slate-600">{log.action}</span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded">{log.module}</span>
                      </div>
                      {log.details && (
                        <p className="text-sm text-slate-500 mt-1">{log.details}</p>
                      )}
                      {log.targetId && (
                        <p className="text-xs text-slate-400 mt-1">ID объекта: {log.targetId}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="Нет записей"
                description="Журнал действий пуст"
              />
            )}
          </Card>
        </>
      )}

      {activeTab === 'telegram' && (
        <>
          <Card>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">Telegram пользователи</h2>
                <p className="text-sm text-slate-500">Управление аутентификацией через Telegram бот</p>
              </div>
              <Button variant="secondary" onClick={loadTgUsers} disabled={tgLoading}>
                <RefreshCw className={`w-4 h-4 ${tgLoading ? 'animate-spin' : ''}`} /> Обновить
              </Button>
            </div>

            {tgLoading ? (
              <div className="text-center py-8 text-slate-500">Загрузка...</div>
            ) : tgUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-500 border-b">
                      <th className="pb-3 font-medium">TG ID</th>
                      <th className="pb-3 font-medium">Имя</th>
                      <th className="pb-3 font-medium">Телефон</th>
                      <th className="pb-3 font-medium">Роль</th>
                      <th className="pb-3 font-medium">Верификация</th>
                      <th className="pb-3 font-medium">Уведомления</th>
                      <th className="pb-3 font-medium">Дата</th>
                      <th className="pb-3 font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tgUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono text-sm">{u.telegram_id}</td>
                        <td className="py-3">{u.name || '—'}</td>
                        <td className="py-3 text-sm">{u.phone || '—'}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{u.role || 'user'}</span>
                        </td>
                        <td className="py-3">
                          {u.verified ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm"><Check className="w-4 h-4" /> Да</span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-600 text-sm"><Clock className="w-4 h-4" /> Ожидает</span>
                          )}
                        </td>
                        <td className="py-3 text-xs">
                          {u.notify_tasks && <span className="mr-1 px-1 bg-slate-100 rounded">Задачи</span>}
                          {u.notify_cultures && <span className="px-1 bg-slate-100 rounded">Культуры</span>}
                        </td>
                        <td className="py-3 text-sm text-slate-500">{formatDateTime(u.created_at)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            {!u.verified && (
                              <button
                                onClick={() => verifyTgUser(u.id, true)}
                                className="p-1.5 hover:bg-green-50 rounded text-green-600"
                                title="Подтвердить"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {u.verified && (
                              <button
                                onClick={() => verifyTgUser(u.id, false)}
                                className="p-1.5 hover:bg-yellow-50 rounded text-yellow-600"
                                title="Отозвать доступ"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteTgUser(u.id)}
                              className="p-1.5 hover:bg-red-50 rounded text-red-600"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Send}
                title="Нет Telegram пользователей"
                description="Пользователи появятся после регистрации через бот"
              />
            )}
          </Card>
        </>
      )}

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Редактирование пользователя' : 'Новый пользователь'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingUser && (
            <Input
              label="Логин *"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Латиницей, без пробелов"
              required
            />
          )}
          <Input
            label="ФИО *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Фамилия Имя Отчество"
            required
          />
          <Select
            label="Роль *"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            options={roleOptions}
          />
          {!editingUser && (
            <Input
              label="Пароль *"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Минимум 6 символов"
              required
            />
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">Активен</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {editingUser ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
