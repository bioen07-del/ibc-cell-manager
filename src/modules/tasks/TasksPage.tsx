// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, Textarea, StatusBadge, EmptyState } from '../../components/UI';
import { Plus, ClipboardList, Search, CheckCircle, Clock, AlertTriangle, Play } from 'lucide-react';
import { formatDateTime, taskStatusLabels, taskPriorityLabels, getStatusColor, getPriorityColor } from '../../utils';
import { Task, TaskStatus, TaskPriority, ContainerObservation, MorphologyType } from '../../types';

export const TasksPage: React.FC = () => {
  const { tasks, donors, donations, cultures, media, addTask, updateTask, updateCulture, addManipulation } = useApp();
  
  const safeTasks = tasks || [];
  const safeDonations = donations || [];
  const safeDonors = donors || [];
  const safeCultures = cultures || [];
  
  const approvedMedia = (media || []).filter(m => m.status === 'approved' && m.remainingVolume > 0 && new Date(m.expiryDate) > new Date());
  const { canEdit } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // По умолчанию только активные
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'created'>('dueDate');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionData, setCompletionData] = useState({
    cellCount: '',
    viability: '',
    confluency: '',
    morphology: '' as MorphologyType | '',
    mediaVolume: '',
    phStatus: 'normal',
    sterilityStatus: 'sterile',
    observationType: 'all' as 'all' | 'individual',
    containerObservations: [] as ContainerObservation[],
    hasBacteria: false,
    hasFungi: false,
    photos: [] as string[],
    // Данные для подкормки
    feedingType: 'all' as 'all' | 'individual',
    mediaId: '',
    volume: '',
    feedingContainers: [] as { containerId: number; containerType: string; volume: string; mediaId: string }[]
  });
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [taskScope, setTaskScope] = useState<'operational' | 'longterm'>('operational');
  
  // Разделение задач: оперативные (< 2 месяцев) и долгосрочные (>= 2 месяцев)
  const twoMonthsLater = new Date();
  twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    relatedEntityId: '',
    relatedEntityType: 'culture' as 'donor' | 'donation' | 'culture',
    assignee: '',
    dueDate: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      relatedEntityId: '',
      relatedEntityType: 'culture',
      assignee: '',
      dueDate: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTask({
      ...formData,
      status: 'new',
      dueDate: new Date(formData.dueDate).toISOString()
    });
    setIsModalOpen(false);
    resetForm();
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === 'completed') {
      // Открыть модальное окно для внесения информации о выполнении
      const task = safeTasks.find(t => t.id === taskId);
      if (task) {
        setCompletingTask(task);
        setCompletionNotes('');
        
        // Инициализировать containerObservations для культуры
        if (task.relatedEntityType === 'culture') {
          const culture = safeCultures.find(c => c.id === task.relatedEntityId);
          if (culture) {
            const containers = culture.containers || [{ type: culture.containerType, count: culture.containerCount }];
            const observations: ContainerObservation[] = [];
            containers.forEach((c) => {
              for (let i = 0; i < c.count; i++) {
                observations.push({
                  containerId: observations.length,
                  containerType: c.type,
                  hasCells: true,
                  confluency: 0,
                  hasBacteria: false,
                  hasFungi: false,
                  morphology: 'typical',
                  action: 'none'
                });
              }
            });
            // Инициализировать feedingContainers для подкормки
            const feedingCont = observations.map((obs, idx) => ({
              containerId: idx,
              containerType: obs.containerType,
              volume: '',
              mediaId: ''
            }));
            setCompletionData(prev => ({ ...prev, containerObservations: observations, feedingContainers: feedingCont }));
          }
        }
        
        setIsCompleteModalOpen(true);
      }
    } else {
      updateTask(taskId, { status: newStatus });
    }
  };

  const handleCompleteTask = () => {
    if (completingTask) {
      const dataToSave: Record<string, unknown> = {};
      dataToSave.observationType = completionData.observationType;
      if (completionData.confluency) dataToSave.confluency = parseFloat(completionData.confluency);
      if (completionData.morphology) dataToSave.morphology = completionData.morphology;
      if (completionData.photos.length > 0) dataToSave.photos = completionData.photos;
      
      if (completionData.observationType === 'all') {
        dataToSave.hasBacteria = completionData.hasBacteria;
        dataToSave.hasFungi = completionData.hasFungi;
      } else {
        dataToSave.containerObservations = completionData.containerObservations;
      }
      
      // Обновить культуру на основе данных наблюдения
      if (completingTask.relatedEntityType === 'culture') {
        const hasContamination = completionData.observationType === 'all' 
          ? (completionData.hasBacteria || completionData.hasFungi)
          : completionData.containerObservations.some(c => c.hasBacteria || c.hasFungi || c.action === 'dispose');
        
        if (completionData.observationType === 'all') {
          updateCulture(completingTask.relatedEntityId, {
            currentConfluency: parseFloat(completionData.confluency) || undefined,
            isSterile: !hasContamination,
            morphology: completionData.morphology as MorphologyType || undefined
          });
        } else {
          // Индивидуальное наблюдение
          const disposedContainers = completionData.containerObservations.filter(
            c => c.action === 'dispose' || c.action === 'bacteriology' || c.hasBacteria || c.hasFungi
          );
          const remainingContainers = completionData.containerObservations.filter(
            c => c.action !== 'dispose' && c.action !== 'bacteriology' && !c.hasBacteria && !c.hasFungi
          );
          
          const avgConfluency = remainingContainers.length > 0 
            ? Math.round(remainingContainers.reduce((sum, c) => sum + c.confluency, 0) / remainingContainers.length)
            : 0;
          
          if (remainingContainers.length === 0) {
            updateCulture(completingTask.relatedEntityId, { status: 'disposed', isSterile: false });
          } else if (disposedContainers.length > 0) {
            const newContainers = remainingContainers.map(c => ({ type: c.containerType, count: 1 }));
            updateCulture(completingTask.relatedEntityId, {
              containerCount: remainingContainers.length,
              containers: newContainers,
              currentConfluency: avgConfluency,
              isSterile: false
            });
          } else {
            updateCulture(completingTask.relatedEntityId, {
              currentConfluency: avgConfluency,
              isSterile: true
            });
          }
        }
      }
      
      // Создаём манипуляцию для истории культуры
      if (completingTask.relatedEntityType === 'culture') {
        const manipType = completingTask.title.toLowerCase().includes('подкорм') ? 'feeding' : 'observation';
        addManipulation({
          type: manipType,
          targetId: completingTask.relatedEntityId,
          targetType: 'culture',
          operatorName: 'Оператор',
          dateTime: new Date().toISOString(),
          notes: completionNotes || completingTask.title,
          parameters: {
            ...dataToSave,
            taskId: completingTask.id,
            fromTask: true
          }
        });
      }
      
      updateTask(completingTask.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        completionNotes,
        completionData: dataToSave
      });
      setIsCompleteModalOpen(false);
      setCompletingTask(null);
      setCompletionNotes('');
      setCompletionData({
        cellCount: '',
        viability: '',
        confluency: '',
        morphology: '',
        mediaVolume: '',
        phStatus: 'normal',
        sterilityStatus: 'sterile',
        observationType: 'all',
        containerObservations: [],
        hasBacteria: false,
        hasFungi: false,
        photos: [],
        feedingType: 'all',
        mediaId: '',
        volume: '',
        feedingContainers: []
      });
    }
  };

  // Check for overdue tasks
  const now = new Date();
  safeTasks.forEach(task => {
    if (task.status !== 'completed' && task.status !== 'overdue') {
      if (new Date(task.dueDate) < now) {
        updateTask(task.id, { status: 'overdue' });
      }
    }
  });

  const filteredTasks = (tasks || []).filter(task => {
    const matchesSearch = (task.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (task.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         String(task.id).includes(searchQuery.toLowerCase());
    // "active" = new, in_progress, overdue
    const matchesStatus = statusFilter === 'all' ? true : 
                          statusFilter === 'active' ? ['new', 'in_progress', 'overdue'].includes(task.status) :
                          task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesEntityType = entityTypeFilter === 'all' || task.relatedEntityType === entityTypeFilter;
    
    // Фильтр по сроку: оперативные (< 2 мес) vs долгосрочные (>= 2 мес)
    const taskDueDate = new Date(task.dueDate);
    const isOperational = taskDueDate < twoMonthsLater;
    const matchesScope = taskScope === 'operational' ? isOperational : !isOperational;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesEntityType && matchesScope;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'dueDate') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const statusOptions = [
    { value: 'active', label: 'Активные' },
    { value: 'all', label: 'Все' },
    { value: 'new', label: 'Новые' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'completed', label: 'Выполнены' },
    { value: 'overdue', label: 'Просрочены' }
  ];

  const entityTypeOptions = [
    { value: 'all', label: 'Все типы' },
    { value: 'culture', label: 'Культуры' },
    { value: 'equipment', label: 'Оборудование' },
    { value: 'donation', label: 'Донации' },
    { value: 'donor', label: 'Доноры' }
  ];

  const sortOptions = [
    { value: 'dueDate', label: 'По сроку' },
    { value: 'priority', label: 'По приоритету' },
    { value: 'created', label: 'По дате создания' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'Все приоритеты' },
    { value: 'high', label: 'Высокий' },
    { value: 'medium', label: 'Средний' },
    { value: 'low', label: 'Низкий' }
  ];

  const formEntityTypeOptions = [
    { value: 'culture', label: 'Культура' },
    { value: 'donation', label: 'Донация' },
    { value: 'donor', label: 'Донор' }
  ];

  const getEntityOptions = () => {
    switch (formData.relatedEntityType) {
      case 'culture':
        return safeCultures.map(c => ({ value: c.id, label: `${c.id} - ${c.cellType}` }));
      case 'donation':
        return safeDonations.map(d => ({ value: d.id, label: `${d.id} - ${d.donationType}` }));
      case 'donor':
        return safeDonors.map(d => ({ value: d.id, label: `${d.id} - ${d.fullName}` }));
      default:
        return [];
    }
  };

  const tasksByStatus = {
    new: sortedTasks.filter(t => t.status === 'new'),
    in_progress: sortedTasks.filter(t => t.status === 'in_progress'),
    completed: sortedTasks.filter(t => t.status === 'completed'),
    overdue: sortedTasks.filter(t => t.status === 'overdue')
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const isOverdue = new Date(task.dueDate) < now && task.status !== 'completed';
    
    return (
      <div className={`p-4 bg-white border rounded-lg ${isOverdue ? 'border-danger' : 'border-slate-200'} hover:shadow-md transition-shadow`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusBadge 
              status={task.priority} 
              label={taskPriorityLabels[task.priority]} 
              color={getPriorityColor(task.priority)} 
            />
            <span className="text-xs font-mono text-slate-400">{task.id}</span>
          </div>
          <StatusBadge 
            status={task.status} 
            label={taskStatusLabels[task.status]} 
            color={getStatusColor(task.status)} 
          />
        </div>
        
        <h4 className="font-medium text-slate-800 mb-1">{task.title}</h4>
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{task.description}</p>
        
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className={isOverdue ? 'text-danger font-medium' : ''}>
              {formatDateTime(task.dueDate)}
            </span>
          </div>
          {task.assignee && <span>{task.assignee}</span>}
        </div>
        
        {task.completionNotes && (
          <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
            <strong>Результат:</strong> {task.completionNotes}
          </div>
        )}
        
        {canEdit() && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            {task.status === 'new' && (
              <Button size="sm" variant="secondary" onClick={() => handleStatusChange(task.id, 'in_progress')}>
                <Play className="w-3 h-3" /> Начать
              </Button>
            )}
            {(task.status === 'in_progress' || task.status === 'overdue') && (
              <Button size="sm" variant="success" onClick={() => handleStatusChange(task.id, 'completed')}>
                <CheckCircle className="w-3 h-3" /> Выполнено
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Задачи</h1>
          <p className="text-slate-500">
            {taskScope === 'operational' 
              ? 'Оперативные задачи (срок до 2 месяцев)' 
              : 'Долгосрочные задачи (срок более 2 месяцев)'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Переключатель оперативные/долгосрочные */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setTaskScope('operational')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${taskScope === 'operational' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-800'}`}
            >
              ⚡ Оперативные
            </button>
            <button
              onClick={() => setTaskScope('longterm')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${taskScope === 'longterm' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-800'}`}
            >
              📅 Долгосрочные
            </button>
          </div>
          {/* Переключатель вида */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow text-slate-800' : 'text-slate-600'}`}
            >
              Список
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white shadow text-slate-800' : 'text-slate-600'}`}
            >
              Канбан
            </button>
          </div>
          {canEdit() && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Новая задача
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{tasksByStatus.new.length}</p>
              <p className="text-xs text-slate-500">Новых</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{tasksByStatus.in_progress.length}</p>
              <p className="text-xs text-slate-500">В работе</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{tasksByStatus.completed.length}</p>
              <p className="text-xs text-slate-500">Выполнено</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{tasksByStatus.overdue.length}</p>
              <p className="text-xs text-slate-500">Просрочено</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск задач..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
          />
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={priorityOptions}
          />
          <Select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            options={entityTypeOptions}
          />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'created')}
            options={sortOptions}
          />
        </div>
      </Card>

      {/* Task List / Kanban View */}
      {viewMode === 'list' ? (
        <Card>
          {sortedTasks.length > 0 ? (
            <div className="space-y-3">
              {sortedTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Задачи не найдены"
              description="Создайте новую задачу или измените фильтры"
              action={canEdit() ? <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4" /> Новая задача</Button> : undefined}
            />
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* New Column */}
          <div className="bg-slate-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <h3 className="font-medium text-slate-700">Новые</h3>
              <span className="ml-auto text-sm text-slate-500">{tasksByStatus.new.length}</span>
            </div>
            <div className="space-y-3">
              {tasksByStatus.new.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="bg-slate-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-warning rounded-full"></div>
              <h3 className="font-medium text-slate-700">В работе</h3>
              <span className="ml-auto text-sm text-slate-500">{tasksByStatus.in_progress.length}</span>
            </div>
            <div className="space-y-3">
              {tasksByStatus.in_progress.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          {/* Overdue Column */}
          <div className="bg-red-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-danger rounded-full"></div>
              <h3 className="font-medium text-slate-700">Просрочено</h3>
              <span className="ml-auto text-sm text-slate-500">{tasksByStatus.overdue.length}</span>
            </div>
            <div className="space-y-3">
              {tasksByStatus.overdue.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          {/* Completed Column */}
          <div className="bg-slate-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <h3 className="font-medium text-slate-700">Выполнено</h3>
              <span className="ml-auto text-sm text-slate-500">{tasksByStatus.completed.length}</span>
            </div>
            <div className="space-y-3">
              {tasksByStatus.completed.slice(0, 5).map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              {tasksByStatus.completed.length > 5 && (
                <p className="text-sm text-slate-500 text-center">+ ещё {tasksByStatus.completed.length - 5}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title="Новая задача"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Название *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Textarea
            label="Описание"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Приоритет"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
              options={priorityOptions.slice(1)}
            />
            <Input
              label="Срок выполнения *"
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Тип объекта"
              value={formData.relatedEntityType}
              onChange={(e) => setFormData({ ...formData, relatedEntityType: e.target.value as 'donor' | 'donation' | 'culture', relatedEntityId: '' })}
              options={formEntityTypeOptions}
            />
            <Select
              label="Объект"
              value={formData.relatedEntityId}
              onChange={(e) => setFormData({ ...formData, relatedEntityId: e.target.value })}
              options={[{ value: '', label: 'Выберите...' }, ...getEntityOptions()]}
            />
          </div>
          <Input
            label="Исполнитель"
            value={formData.assignee}
            onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
            placeholder="напр. Петров И.В."
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Отмена
            </Button>
            <Button type="submit">
              Создать задачу
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Task Modal */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => { setIsCompleteModalOpen(false); setCompletingTask(null); setCompletionNotes(''); }}
        title={`Завершение задачи: ${completingTask?.title || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {completingTask && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p className="text-slate-600 mb-1"><strong>Задача:</strong> {completingTask.title}</p>
              <p className="text-slate-500">{completingTask.description}</p>
              <p className="text-slate-500 mt-2"><strong>Объект:</strong> {completingTask.relatedEntityId}</p>
            </div>
          )}
          
          {/* Определение типа задачи и показ соответствующей формы */}
          {completingTask?.relatedEntityType === 'culture' && (() => {
            const isFeedingTask = completingTask?.title.toLowerCase().includes('подкормк') || completingTask?.title.toLowerCase().includes('feeding');
            
            if (isFeedingTask) {
              // Форма для подкормки
              return (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Данные подкормки:</p>
                  
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={completionData.feedingType === 'all'} onChange={() => setCompletionData({...completionData, feedingType: 'all'})} />
                      <span className="text-sm">Для всей культуры</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={completionData.feedingType === 'individual'} onChange={() => setCompletionData({...completionData, feedingType: 'individual'})} />
                      <span className="text-sm">По каждому контейнеру</span>
                    </label>
                  </div>
                  
                  {completionData.feedingType === 'all' ? (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                      <Select
                        label="Среда *"
                        value={completionData.mediaId}
                        onChange={(e) => setCompletionData({...completionData, mediaId: e.target.value})}
                        options={[
                          {value: '', label: 'Выберите среду'},
                          ...approvedMedia.map(m => ({value: m.id, label: `${m.name} (${m.remainingVolume} ${m.unit})`}))
                        ]}
                      />
                      <Input
                        label="Объём (мл) *"
                        type="number"
                        value={completionData.volume}
                        onChange={(e) => setCompletionData({...completionData, volume: e.target.value})}
                        placeholder="напр. 15"
                      />
                      {approvedMedia.length === 0 && (
                        <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                          Нет доступных сред. Добавьте среды в раздел "Среды" и одобрите их.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                      {completionData.feedingContainers.map((fc, idx) => (
                        <div key={fc.containerId} className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-sm font-medium text-slate-700 mb-2">#{idx + 1} {fc.containerType}</div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              label="Среда"
                              value={fc.mediaId}
                              onChange={(e) => {
                                const updated = [...completionData.feedingContainers];
                                updated[idx].mediaId = e.target.value;
                                setCompletionData({...completionData, feedingContainers: updated});
                              }}
                              options={[
                                {value: '', label: 'Выбрать'},
                                ...approvedMedia.map(m => ({value: m.id, label: `${m.name} (${m.remainingVolume} ${m.unit})`}))
                              ]}
                            />
                            <Input
                              label="Объём (мл)"
                              type="number"
                              value={fc.volume}
                              onChange={(e) => {
                                const updated = [...completionData.feedingContainers];
                                updated[idx].volume = e.target.value;
                                setCompletionData({...completionData, feedingContainers: updated});
                              }}
                              placeholder="мл"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            // Форма для наблюдения (по умолчанию)
            return (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Данные наблюдения:</p>
                
                <Select
                  label="Тип наблюдения"
                  value={completionData.observationType}
                  onChange={(e) => setCompletionData({ ...completionData, observationType: e.target.value as 'all' | 'individual' })}
                  options={[
                    { value: 'all', label: 'Для всей посуды сразу' },
                    { value: 'individual', label: 'Индивидуально по каждой посуде' }
                  ]}
                />
              
              {completionData.observationType === 'all' ? (
                <div className="space-y-4 mt-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Параметры для всей культуры ({completionData.containerObservations.length} ед. посуды)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Конфлюентность (%)"
                      type="number"
                      value={completionData.confluency}
                      onChange={(e) => setCompletionData({ ...completionData, confluency: e.target.value })}
                      placeholder="0-100"
                    />
                    <Select
                      label="Морфология"
                      value={completionData.morphology as string}
                      onChange={(e) => setCompletionData({ ...completionData, morphology: e.target.value as MorphologyType })}
                      options={[
                        { value: 'typical', label: 'Типичная' },
                        { value: 'atypical', label: 'Атипичная' },
                        { value: 'differentiating', label: 'С признаками дифференцировки' }
                      ]}
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={completionData.hasBacteria} onChange={(e) => setCompletionData({ ...completionData, hasBacteria: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm text-red-600">Признаки бактерий</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={completionData.hasFungi} onChange={(e) => setCompletionData({ ...completionData, hasFungi: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm text-red-600">Признаки грибов</span>
                    </label>
                  </div>
                  {(completionData.hasBacteria || completionData.hasFungi) && (
                    <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">⚠️ Обнаружена контаминация!</div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 mt-4 max-h-64 overflow-y-auto">
                  {completionData.containerObservations.map((obs, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${obs.hasBacteria || obs.hasFungi ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="text-sm font-medium mb-2">#{idx + 1}: {obs.containerType}</div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <Input label="Конфл.%" type="number" value={obs.confluency.toString()}
                          onChange={(e) => {
                            const updated = [...completionData.containerObservations];
                            updated[idx] = { ...updated[idx], confluency: parseInt(e.target.value) || 0 };
                            setCompletionData({ ...completionData, containerObservations: updated });
                          }} />
                        <Select label="Морфология" value={obs.morphology}
                          onChange={(e) => {
                            const updated = [...completionData.containerObservations];
                            updated[idx] = { ...updated[idx], morphology: e.target.value as MorphologyType };
                            setCompletionData({ ...completionData, containerObservations: updated });
                          }}
                          options={[
                            { value: 'typical', label: 'Типичная' },
                            { value: 'atypical', label: 'Атипичная' },
                            { value: 'differentiating', label: 'Диффер.' }
                          ]} />
                        <Select label="Действие" value={obs.action || 'none'}
                          onChange={(e) => {
                            const updated = [...completionData.containerObservations];
                            updated[idx] = { ...updated[idx], action: e.target.value as 'none' | 'dispose' | 'bacteriology' };
                            setCompletionData({ ...completionData, containerObservations: updated });
                          }}
                          options={[
                            { value: 'none', label: 'Ок' },
                            { value: 'dispose', label: 'Утиль' },
                            { value: 'bacteriology', label: 'Бак.иссл.' }
                          ]} />
                      </div>
                      <div className="flex gap-3 mt-2">
                        <label className="flex items-center gap-1 text-xs text-red-600">
                          <input type="checkbox" checked={obs.hasBacteria} onChange={(e) => {
                            const updated = [...completionData.containerObservations];
                            updated[idx] = { ...updated[idx], hasBacteria: e.target.checked };
                            setCompletionData({ ...completionData, containerObservations: updated });
                          }} className="w-3 h-3" />
                          <span>Бактерии</span>
                        </label>
                        <label className="flex items-center gap-1 text-xs text-red-600">
                          <input type="checkbox" checked={obs.hasFungi} onChange={(e) => {
                            const updated = [...completionData.containerObservations];
                            updated[idx] = { ...updated[idx], hasFungi: e.target.checked };
                            setCompletionData({ ...completionData, containerObservations: updated });
                          }} className="w-3 h-3" />
                          <span>Грибы</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Фотографии с микроскопа */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-700 mb-2">📷 Фотографии с микроскопа</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const urls = files.map(f => URL.createObjectURL(f));
                    setCompletionData({ ...completionData, photos: [...completionData.photos, ...urls] });
                  }}
                  className="text-sm"
                />
                {completionData.photos.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {completionData.photos.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt={`Фото ${i+1}`} className="w-16 h-16 object-cover rounded" />
                        <button type="button" onClick={() => setCompletionData({ ...completionData, photos: completionData.photos.filter((_, idx) => idx !== i) })} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            );
          })()}
          
          <Textarea
            label="Заметки о выполнении"
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="Дополнительные наблюдения и комментарии..."
            rows={3}
          />
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            Эти данные будут сохранены в истории задачи.
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => { setIsCompleteModalOpen(false); setCompletingTask(null); }}>
              Отмена
            </Button>
            <Button 
              variant="success" 
              onClick={handleCompleteTask}
            >
              <CheckCircle className="w-4 h-4" /> Завершить задачу
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
