// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, StatusBadge, EmptyState } from '../../components/UI';
import { Plus, Settings, Zap, Clock, Trash2, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { 
  AutoTaskRule, AutoTaskTrigger, AutoTaskAction, TaskPriority,
  AUTO_TASK_TRIGGER_LABELS, AUTO_TASK_ACTION_LABELS 
} from '../../types';
import { taskPriorityLabels, getPriorityColor } from '../../utils';

export const AutoTasksSettingsPage: React.FC = () => {
  const { autoTaskRules, addAutoTaskRule, updateAutoTaskRule, deleteAutoTaskRule } = useApp();
  const { canEdit } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoTaskRule | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    trigger: 'observation_done' as AutoTaskTrigger,
    action: 'feeding' as AutoTaskAction,
    delayDays: 3,
    priority: 'medium' as TaskPriority,
    description: '',
    isActive: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      trigger: 'observation_done',
      action: 'feeding',
      delayDays: 3,
      priority: 'medium',
      description: '',
      isActive: true
    });
    setEditingRule(null);
  };

  const openEditModal = (rule: AutoTaskRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      trigger: rule.trigger,
      action: rule.action,
      delayDays: rule.delayDays,
      priority: rule.priority,
      description: rule.description || '',
      isActive: rule.isActive
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      updateAutoTaskRule(editingRule.id, formData);
    } else {
      addAutoTaskRule(formData);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleToggleActive = (rule: AutoTaskRule) => {
    updateAutoTaskRule(rule.id, { isActive: !rule.isActive });
  };

  const handleDelete = (ruleId: string) => {
    if (confirm('Удалить правило автозадачи?')) {
      deleteAutoTaskRule(ruleId);
    }
  };

  const triggerOptions = Object.entries(AUTO_TASK_TRIGGER_LABELS).map(([value, label]) => ({
    value, label
  }));

  const actionOptions = Object.entries(AUTO_TASK_ACTION_LABELS).map(([value, label]) => ({
    value, label
  }));

  const priorityOptions = [
    { value: 'high', label: 'Высокий' },
    { value: 'medium', label: 'Средний' },
    { value: 'low', label: 'Низкий' }
  ];

  // Группируем правила по триггеру
  const rulesByTrigger = autoTaskRules.reduce((acc, rule) => {
    if (!acc[rule.trigger]) acc[rule.trigger] = [];
    acc[rule.trigger].push(rule);
    return acc;
  }, {} as Record<string, AutoTaskRule[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            Настройка автозадач
          </h1>
          <p className="text-slate-500 mt-1">
            Правила автоматического создания задач после манипуляций
          </p>
        </div>
        {canEdit() && (
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Новое правило
          </Button>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{autoTaskRules.length}</p>
              <p className="text-xs text-slate-500">Всего правил</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <ToggleRight className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{autoTaskRules.filter(r => r.isActive).length}</p>
              <p className="text-xs text-slate-500">Активных</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{autoTaskRules.filter(r => !r.isActive).length}</p>
              <p className="text-xs text-slate-500">Отключённых</p>
            </div>
          </div>
        </div>
      </div>

      {/* Информационный блок */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <div className="text-blue-500 text-xl">💡</div>
          <div>
            <p className="font-medium text-blue-800">Как работают автозадачи</p>
            <p className="text-sm text-blue-700 mt-1">
              При выполнении манипуляции (наблюдение, подкормка, пассаж) система автоматически создаёт 
              следующую задачу согласно настроенным правилам. Если задача выполнена раньше срока, 
              следующая автозадача будет создана относительно даты <strong>фактического выполнения</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* Список правил по триггерам */}
      {autoTaskRules.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(rulesByTrigger).map(([trigger, rules]) => (
            <Card key={trigger}>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Zap className="w-5 h-5 text-warning" />
                <h3 className="font-semibold text-slate-800">
                  {AUTO_TASK_TRIGGER_LABELS[trigger as AutoTaskTrigger]}
                </h3>
                <span className="text-sm text-slate-400">({rules.length} правил)</span>
              </div>
              
              <div className="space-y-3">
                {rules.map(rule => (
                  <div 
                    key={rule.id} 
                    className={`p-4 rounded-lg border ${rule.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-800">{rule.name}</span>
                          <StatusBadge 
                            status={rule.priority} 
                            label={taskPriorityLabels[rule.priority]} 
                            color={getPriorityColor(rule.priority)} 
                          />
                          {!rule.isActive && (
                            <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                              Отключено
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Через {rule.delayDays} {rule.delayDays === 1 ? 'день' : rule.delayDays < 5 ? 'дня' : 'дней'}
                          </span>
                          <span>→</span>
                          <span className="font-medium text-primary">
                            {AUTO_TASK_ACTION_LABELS[rule.action]}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-slate-500 mt-1">{rule.description}</p>
                        )}
                      </div>
                      
                      {canEdit() && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(rule)}
                            className={`p-2 rounded-lg transition-colors ${rule.isActive ? 'text-success hover:bg-success/10' : 'text-slate-400 hover:bg-slate-100'}`}
                            title={rule.isActive ? 'Отключить' : 'Включить'}
                          >
                            {rule.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => openEditModal(rule)}
                            className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Settings}
            title="Правила не настроены"
            description="Добавьте правила для автоматического создания задач после манипуляций"
            action={canEdit() ? (
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
                <Plus className="w-4 h-4" /> Добавить правило
              </Button>
            ) : undefined}
          />
        </Card>
      )}

      {/* Модальное окно */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingRule ? 'Редактировать правило' : 'Новое правило автозадачи'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Название правила *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="напр. Подкормка после наблюдения"
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Триггер (когда создавать)"
              value={formData.trigger}
              onChange={(e) => setFormData({ ...formData, trigger: e.target.value as AutoTaskTrigger })}
              options={triggerOptions}
            />
            <Select
              label="Действие (какую задачу)"
              value={formData.action}
              onChange={(e) => setFormData({ ...formData, action: e.target.value as AutoTaskAction })}
              options={actionOptions}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Через сколько дней *"
              type="number"
              min={1}
              max={365}
              value={formData.delayDays.toString()}
              onChange={(e) => setFormData({ ...formData, delayDays: parseInt(e.target.value) || 1 })}
            />
            <Select
              label="Приоритет задачи"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
              options={priorityOptions}
            />
          </div>
          
          <Input
            label="Описание (опционально)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Дополнительная информация о правиле"
          />
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-slate-700">Правило активно</span>
          </label>
          
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            <strong>Пример:</strong> После "{AUTO_TASK_TRIGGER_LABELS[formData.trigger]}" 
            будет создана задача "{AUTO_TASK_ACTION_LABELS[formData.action]}" 
            через {formData.delayDays} {formData.delayDays === 1 ? 'день' : formData.delayDays < 5 ? 'дня' : 'дней'}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Отмена
            </Button>
            <Button type="submit">
              {editingRule ? 'Сохранить' : 'Создать правило'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
