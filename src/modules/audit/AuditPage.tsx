// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase, DbAuditLog } from '../../lib/supabase';
import { Card } from '../../components/UI';
import { History, Search, Filter, RefreshCw, User, Clock, FileText } from 'lucide-react';

const actionLabels: Record<string, string> = {
  'create': 'Создание',
  'update': 'Изменение',
  'delete': 'Удаление',
  'view': 'Просмотр',
  'export': 'Экспорт',
  'login': 'Вход',
  'logout': 'Выход',
};

const entityLabels: Record<string, string> = {
  'donor': 'Донор',
  'donation': 'Донация',
  'culture': 'Культура',
  'task': 'Задача',
  'sop': 'Протокол',
  'equipment': 'Оборудование',
  'media': 'Среда',
  'storage': 'Хранилище',
};

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<DbAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filterAction) {
      query = query.eq('action', filterAction);
    }
    if (filterEntity) {
      query = query.eq('entity_type', filterEntity);
    }

    const { data, error } = await query;
    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterEntity]);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(search) ||
      log.entity_type?.toLowerCase().includes(search) ||
      log.user_name?.toLowerCase().includes(search) ||
      log.entity_id?.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-700';
      case 'update': return 'bg-blue-100 text-blue-700';
      case 'delete': return 'bg-red-100 text-red-700';
      case 'login': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-6 h-6" />
            Журнал аудита
          </h1>
          <p className="text-slate-500">История всех действий в системе</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по логам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Все действия</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Все сущности</option>
            {Object.entries(entityLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-slate-800">{logs.length}</p>
          <p className="text-sm text-slate-500">Всего записей</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-green-600">{logs.filter(l => l.action === 'create').length}</p>
          <p className="text-sm text-slate-500">Создано</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-blue-600">{logs.filter(l => l.action === 'update').length}</p>
          <p className="text-sm text-slate-500">Изменено</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-red-600">{logs.filter(l => l.action === 'delete').length}</p>
          <p className="text-sm text-slate-500">Удалено</p>
        </div>
      </div>

      {/* Список логов */}
      <Card title={`Записи (${filteredLogs.length})`}>
        {loading ? (
          <div className="py-8 text-center text-slate-500">Загрузка...</div>
        ) : filteredLogs.length > 0 ? (
          <div className="divide-y">
            {filteredLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start gap-4">
                <div className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                  {actionLabels[log.action] || log.action}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-700">
                      {entityLabels[log.entity_type] || log.entity_type}
                    </span>
                    {log.entity_id && (
                      <span className="text-slate-500">#{log.entity_id.slice(0, 8)}</span>
                    )}
                  </div>
                  {log.details && (
                    <p className="text-sm text-slate-500 mt-1 truncate">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-slate-500 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {log.user_name || 'Система'}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(log.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500">Нет записей</div>
        )}
      </Card>
    </div>
  );
};

export default AuditPage;
