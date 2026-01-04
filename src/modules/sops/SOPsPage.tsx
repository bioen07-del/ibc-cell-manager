// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Play, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Plus, Edit, Copy, History, Link2, X, Trash2, Shield } from 'lucide-react';

interface SOPStep {
  step: number;
  title: string;
  description: string;
  duration: number;
  checkpoint: boolean;
}

const SOPsPage: React.FC = () => {
  const { sops, sopExecutions, tasks, cultures, addSOP, updateSOP, deleteSOP, createSOPVersion, startSOPExecution, completeSOPExecution, loading } = useApp();
  const safeTasks = tasks || [];
  const { canManageSOP } = useAuth();
  
  const [expandedSOP, setExpandedSOP] = useState<number | null>(null);
  const [execution, setExecution] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState<number | null>(null);
  const [showLinkTaskModal, setShowLinkTaskModal] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [stepResults, setStepResults] = useState<boolean[]>([]);

  // Форма создания СОП
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'general',
    manipulation_type: '',
    description: '',
    duration_minutes: 30,
    safety_notes: '',
    steps: [{ step: 1, title: '', description: '', duration: 5, checkpoint: false }] as SOPStep[]
  });

  const categories = [
    { value: 'thawing', label: 'Размораживание', icon: '🧊' },
    { value: 'passaging', label: 'Пассирование', icon: '🔬' },
    { value: 'freezing', label: 'Заморозка', icon: '❄️' },
    { value: 'quality', label: 'Контроль качества', icon: '✅' },
    { value: 'general', label: 'Общее', icon: '📋' }
  ];

  const manipulationTypes = [
    { value: '', label: '— Не связано —' },
    { value: 'thawing', label: 'Размораживание' },
    { value: 'passaging', label: 'Пассирование' },
    { value: 'freezing', label: 'Криоконсервация' },
    { value: 'medium_change', label: 'Смена среды' },
    { value: 'cell_count', label: 'Подсчёт клеток' },
    { value: 'viability_test', label: 'Тест жизнеспособности' },
    { value: 'contamination_check', label: 'Проверка контаминации' },
    { value: 'harvest', label: 'Сбор клеток' },
    { value: 'seeding', label: 'Посев' }
  ];

  const getCategoryInfo = (cat: string) => categories.find(c => c.value === cat) || categories[4];

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { step: formData.steps.length + 1, title: '', description: '', duration: 5, checkpoint: false }]
    });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step: i + 1 }));
    setFormData({ ...formData, steps: newSteps });
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleCreateSOP = async () => {
    if (!formData.name.trim()) {
      setSaveError('Введите название СОП');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await addSOP({
        code: formData.code || `SOP-${Date.now()}`,
        name: formData.name,
        category: formData.category,
        manipulation_type: formData.manipulation_type || null,
        description: formData.description,
        duration_minutes: formData.duration_minutes,
        safety_notes: formData.safety_notes,
        steps: formData.steps,
        status: 'draft'
      });
      setShowCreateModal(false);
      setFormData({
        code: '', name: '', category: 'general', manipulation_type: '', description: '', duration_minutes: 30, safety_notes: '',
        steps: [{ step: 1, title: '', description: '', duration: 5, checkpoint: false }]
      });
    } catch (err: any) {
      console.error('Error creating SOP:', err);
      setSaveError(err?.message || 'Ошибка сохранения. Проверьте данные.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVersion = async (sopId: number) => {
    const sop = sops.find(s => s.id === sopId);
    if (!sop) return;
    
    try {
      await createSOPVersion(sopId, {
        // Можно передать изменения
      });
      setShowVersionModal(null);
      alert('Новая версия СОП создана!');
    } catch (err) {
      console.error('Error creating version:', err);
    }
  };

  const handleDeleteSOP = async (sopId: number) => {
    try {
      await deleteSOP(sopId);
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting SOP:', err);
      alert('Ошибка удаления СОП');
    }
  };

  const handleStartExecution = async (sop: any, cultureId?: number, taskId?: number) => {
    try {
      const exec = await startSOPExecution(sop.id, cultureId, taskId);
      setExecution({ ...exec, sop });
      setStepResults(new Array(sop.steps?.length || 0).fill(false));
      setExpandedSOP(sop.id);
    } catch (err) {
      console.error('Error starting execution:', err);
    }
  };

  const handleCompleteStep = (index: number) => {
    const newResults = [...stepResults];
    newResults[index] = true;
    setStepResults(newResults);
  };

  const handleFinishExecution = async () => {
    if (!execution) return;
    try {
      await completeSOPExecution(execution.id, { steps: stepResults });
      setExecution(null);
      setStepResults([]);
      alert('Протокол успешно выполнен!');
    } catch (err) {
      console.error('Error finishing execution:', err);
    }
  };

  // Связанные с СОП задачи
  const getLinkedTasks = (sopId: number) => safeTasks.filter(t => t.sop_id === sopId);

  // История версий
  const getVersionHistory = (sopId: number) => {
    const versions: any[] = [];
    let current = sops.find(s => s.id === sopId);
    while (current) {
      versions.push(current);
      current = current.parent_version_id ? sops.find(s => s.id === current.parent_version_id) : null;
    }
    return versions;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  // Фильтруем только последние версии для отображения
  const latestSOPs = (sops || []).filter(s => s.is_latest !== false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Стандартные операционные процедуры</h1>
          <p className="text-gray-500">Протоколы работы с клеточными культурами</p>
        </div>
        {canManageSOP() ? (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Создать SOP
          </button>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Shield className="w-4 h-4" />
            Только администратор может управлять СОПами
          </div>
        )}
      </div>

      {execution && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <Play className="w-5 h-5" />
              Выполняется: {execution.sop?.name}
            </div>
            <button onClick={() => setExecution(null)} className="text-green-600 hover:text-green-800">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2 text-sm text-green-600">
            Шаг {stepResults.filter(Boolean).length + 1} из {stepResults.length}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {latestSOPs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Нет СОПов. Создайте первый протокол.
          </div>
        ) : latestSOPs.map((sop) => {
          const catInfo = getCategoryInfo(sop.category);
          const linkedTasks = getLinkedTasks(sop.id);
          const steps = sop.steps || [];
          
          return (
            <div key={sop.id} className="bg-white rounded-lg shadow border">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedSOP(expandedSOP === sop.id ? null : sop.id)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{catInfo.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-500">{sop.code}</span>
                      <h3 className="font-semibold text-gray-900">{sop.name}</h3>
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">v{sop.version}</span>
                      {sop.status === 'draft' && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">Черновик</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 rounded">{catInfo.label}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {sop.duration_minutes} мин
                      </span>
                      <span>{steps.length} шагов</span>
                      {linkedTasks.length > 0 && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Link2 className="w-4 h-4" />
                          {linkedTasks.length} задач
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageSOP() && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(sop.id); }}
                        className="p-2 hover:bg-red-50 rounded"
                        title="Удалить СОП"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowVersionModal(sop.id); }}
                        className="p-2 hover:bg-gray-100 rounded"
                        title="Создать версию"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartExecution(sop); }}
                    className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                  >
                    <Play className="w-4 h-4" />
                    Начать
                  </button>
                  {expandedSOP === sop.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              {expandedSOP === sop.id && (
                <div className="border-t p-4">
                  <p className="text-gray-600 mb-4">{sop.description}</p>
                  
                  {/* Связь с задачами */}
                  {linkedTasks.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="font-medium text-blue-800 mb-2">Связанные задачи:</div>
                      <div className="space-y-1">
                        {linkedTasks.map(task => (
                          <div key={task.id} className="text-sm text-blue-700 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                            {task.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {sop.safety_notes && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-yellow-800">Меры безопасности</div>
                        <div className="text-sm text-yellow-700">{sop.safety_notes}</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Шаги выполнения:</h4>
                    {steps.map((step: SOPStep, index: number) => {
                      const isActive = execution?.sop?.id === sop.id && stepResults.filter(Boolean).length === index;
                      const isCompleted = execution?.sop?.id === sop.id && stepResults[index];
                      
                      return (
                        <div 
                          key={step.step}
                          className={`p-3 rounded-lg border ${
                            isActive ? 'border-blue-500 bg-blue-50' : 
                            isCompleted ? 'border-green-300 bg-green-50' : 
                            'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCompleted ? 'bg-green-500 text-white' :
                                isActive ? 'bg-blue-500 text-white' :
                                'bg-gray-200 text-gray-600'
                              }`}>
                                {isCompleted ? <CheckCircle className="w-5 h-5" /> : step.step}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                  {step.title}
                                  {step.checkpoint && (
                                    <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                                      Контрольная точка
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">{step.description}</div>
                                <div className="text-xs text-gray-400 mt-1">~{step.duration} мин</div>
                              </div>
                            </div>
                            {isActive && !isCompleted && (
                              <button
                                onClick={() => handleCompleteStep(index)}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                Готово
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {execution?.sop?.id === sop.id && stepResults.every(Boolean) && (
                    <div className="mt-4">
                      <button
                        onClick={handleFinishExecution}
                        className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Завершить и сохранить протокол
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Модальное окно создания СОП */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Создание нового СОП</h2>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Код</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="SOP-XXX"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Категория</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    {categories.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Связь с манипуляцией</label>
                <select
                  value={formData.manipulation_type}
                  onChange={(e) => setFormData({ ...formData, manipulation_type: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  {manipulationTypes.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">При выполнении этой манипуляции будет предложен данный СОП</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Длительность (мин)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Меры безопасности</label>
                <textarea
                  value={formData.safety_notes}
                  onChange={(e) => setFormData({ ...formData, safety_notes: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={2}
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Шаги</label>
                  <button onClick={addStep} className="text-sm text-blue-600 hover:underline">+ Добавить шаг</button>
                </div>
                <div className="space-y-2">
                  {formData.steps.map((step, index) => (
                    <div key={index} className="p-3 border rounded bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm">{step.step}</span>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(index, 'title', e.target.value)}
                          placeholder="Название шага"
                          className="flex-1 p-1 border rounded text-sm"
                        />
                        <input
                          type="number"
                          value={step.duration}
                          onChange={(e) => updateStep(index, 'duration', parseInt(e.target.value))}
                          className="w-16 p-1 border rounded text-sm"
                          title="Мин"
                        />
                        <label className="flex items-center gap-1 text-sm" title="Контрольная точка — шаг требует проверки">
                          <input
                            type="checkbox"
                            checked={step.checkpoint}
                            onChange={(e) => updateStep(index, 'checkpoint', e.target.checked)}
                          />
                          ✓ Проверка
                        </label>
                        {formData.steps.length > 1 && (
                          <button onClick={() => removeStep(index)} className="text-red-500 hover:text-red-700">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <textarea
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        placeholder="Описание шага"
                        className="w-full p-1 border rounded text-sm"
                        rows={1}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t">
              {saveError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                  {saveError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">
                  Отмена
                </button>
                <button
                  onClick={handleCreateSOP}
                  disabled={!formData.name.trim() || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно версионирования */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Создать новую версию?</h2>
            <p className="text-gray-600 mb-4">
              Будет создана новая версия СОП. Текущая версия останется в истории.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowVersionModal(null)} className="px-4 py-2 border rounded">
                Отмена
              </button>
              <button
                onClick={() => handleCreateVersion(showVersionModal)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Создать версию
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-red-600">Удалить СОП?</h2>
            <p className="text-gray-600 mb-4">
              Это действие нельзя отменить. СОП будет удалён безвозвратно.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 border rounded">
                Отмена
              </button>
              <button
                onClick={() => handleDeleteSOP(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOPsPage;
