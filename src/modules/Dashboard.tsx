// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatsCard, Card, StatusBadge } from '../components/UI';
import { Users, Droplets, FlaskConical, ClipboardList, AlertTriangle, Download, TrendingUp, Calendar, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateTime, taskStatusLabels, taskPriorityLabels, getStatusColor, getPriorityColor } from '../utils';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { donors, donations, cultures, tasks, storages, equipment, media } = useApp();
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  const safedonors = donors || [];
  const safecultures = cultures || [];
  const safetasks = tasks || [];
  
  const activeDonors = safedonors.filter((d: any) => d.status === 'active').length;
  const activeCultures = safecultures.filter((c: any) => c.status === 'in_work').length;
  const frozenCultures = safecultures.filter((c: any) => c.status === 'frozen').length;
  const pendingTasks = safetasks.filter((t: any) => t.status === 'new' || t.status === 'in_progress').length;
  const overdueTasks = safetasks.filter((t: any) => t.status === 'overdue').length;
  const completedThisMonth = safetasks.filter((t: any) => {
    const date = new Date(t.createdAt || t.created_at);
    const now = new Date();
    return t.status === 'completed' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  
  const recentTasks = safetasks
    .filter((t: any) => t.status !== 'completed')
    .sort((a: any, b: any) => new Date(a.dueDate || a.due_date).getTime() - new Date(b.dueDate || b.due_date).getTime())
    .slice(0, 5);

  const recentCultures = safecultures
    .filter((c: any) => c.status === 'in_work')
    .sort((a: any, b: any) => new Date(b.updatedAt || b.updated_at).getTime() - new Date(a.updatedAt || a.updated_at).getTime())
    .slice(0, 5);

  // Мини-календарь
  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days = [];
    
    for (let i = 0; i < startPad; i++) {
      days.push({ day: null, tasks: [] });
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTasks = safetasks.filter((t: any) => (t.dueDate || t.due_date)?.startsWith(dateStr));
      days.push({ day: d, date: dateStr, tasks: dayTasks });
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Экспорт в Excel (CSV)
  const exportToExcel = (type: 'donors' | 'cultures' | 'tasks' | 'full') => {
    let csvContent = '';
    let filename = '';
    
    if (type === 'donors' || type === 'full') {
      csvContent += 'ДОНОРЫ\nID,Код,Возраст,Пол,Диагноз,Статус,Дата создания\n';
      safedonors.forEach(d => {
        csvContent += `${d.id},"${d.code || ''}",${d.age || ''},${d.gender === 'male' ? 'М' : 'Ж'},"${d.diagnosis || ''}",${d.status},"${d.createdAt}"\n`;
      });
      csvContent += '\n';
    }
    
    if (type === 'cultures' || type === 'full') {
      csvContent += 'КУЛЬТУРЫ\nID,Название,Донор,Пассаж,Статус,Локация,Дата обновления\n';
      safecultures.forEach(c => {
        const donor = safedonors.find(d => d.id === c.donorId);
        csvContent += `${c.id},"${c.name || ''}","${donor?.code || ''}",${c.passage || ''},${c.status},"${c.location || ''}","${c.updatedAt}"\n`;
      });
      csvContent += '\n';
    }
    
    if (type === 'tasks' || type === 'full') {
      csvContent += 'ЗАДАЧИ\nID,Название,Приоритет,Статус,Срок,Исполнитель\n';
      safetasks.forEach(t => {
        csvContent += `${t.id},"${t.title}",${t.priority},${t.status},"${t.dueDate}","${t.assignee || ''}"\n`;
      });
    }
    
    filename = type === 'full' ? 'ibc_full_report.csv' : `ibc_${type}.csv`;
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Дашборд</h1>
          <p className="text-slate-500">Обзор системы управления БМКП</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => exportToExcel('full')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Экспорт в Excel
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Активных доноров" value={activeDonors} icon={Users} color="bg-primary" />
        <StatsCard title="Всего донаций" value={(donations || []).length} icon={Droplets} color="bg-success" />
        <StatsCard title="Культур в работе" value={activeCultures} icon={FlaskConical} color="bg-warning" />
        <StatsCard title="Активных задач" value={pendingTasks} icon={ClipboardList} color="bg-secondary" />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{frozenCultures}</p>
            <p className="text-sm text-slate-500">Замороженных культур</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg"><TrendingUp className="w-6 h-6 text-green-600" /></div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{completedThisMonth}</p>
            <p className="text-sm text-slate-500">Задач за месяц</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg"><Calendar className="w-6 h-6 text-purple-600" /></div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{(storages || []).length}</p>
            <p className="text-sm text-slate-500">Хранилищ</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-orange-100 rounded-lg"><Package className="w-6 h-6 text-orange-600" /></div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{(equipment || []).length + (media || []).length}</p>
            <p className="text-sm text-slate-500">Единиц ресурсов</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {overdueTasks > 0 && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-danger" />
          <div>
            <p className="font-medium text-danger">Внимание! Просроченных задач: {overdueTasks}</p>
            <p className="text-sm text-danger/70">Требуется немедленное внимание</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Calendar */}
        <Card 
          title="Календарь задач" 
          action={<Link to="/calendar" className="text-sm text-primary hover:underline">Открыть</Link>}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium">{monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
              <button 
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                <div key={d} className="text-slate-500 font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, i) => (
                <div 
                  key={i} 
                  className={`
                    aspect-square flex flex-col items-center justify-center text-sm rounded relative
                    ${!item.day ? '' : item.date === todayStr ? 'bg-primary text-white font-bold' : 'hover:bg-slate-100'}
                    ${item.tasks?.length > 0 && item.date !== todayStr ? 'bg-blue-50' : ''}
                  `}
                >
                  {item.day}
                  {item.tasks?.length > 0 && (
                    <div className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${item.date === todayStr ? 'bg-white' : 'bg-primary'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Recent Tasks */}
        <Card 
          title="Ближайшие задачи" 
          action={
            <div className="flex gap-2">
              <button onClick={() => exportToExcel('tasks')} className="text-sm text-green-600 hover:underline">Экспорт</button>
              <Link to="/tasks" className="text-sm text-primary hover:underline">Все задачи</Link>
            </div>
          }
        >
          {recentTasks.length > 0 ? (
            <div className="space-y-3">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 truncate">{task.title}</p>
                    <p className="text-sm text-slate-500">Срок: {formatDateTime(task.dueDate)}</p>
                  </div>
                  <div className="flex gap-2 ml-2 flex-shrink-0">
                    <StatusBadge label={taskPriorityLabels[task.priority]} color={getPriorityColor(task.priority)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 py-4 text-center">Нет активных задач</p>
          )}
        </Card>

        {/* Recent Cultures */}
        <Card 
          title="Культуры в работе" 
          action={
            <div className="flex gap-2">
              <button onClick={() => exportToExcel('cultures')} className="text-sm text-green-600 hover:underline">Экспорт</button>
              <Link to="/cultures" className="text-sm text-primary hover:underline">Все культуры</Link>
            </div>
          }
        >
          {recentCultures.length > 0 ? (
            <div className="space-y-3">
              {recentCultures.map(culture => {
                const donor = safedonors.find(d => d.id === culture.donorId);
                return (
                  <div key={culture.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 truncate">{culture.name || culture.id}</p>
                      <p className="text-sm text-slate-500">Донор: {donor?.code || 'N/A'} • П: {culture.passage || 0}</p>
                    </div>
                    <StatusBadge 
                      label={culture.status === 'in_work' ? 'В работе' : culture.status} 
                      color="bg-yellow-100 text-yellow-700"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 py-4 text-center">Нет культур в работе</p>
          )}
        </Card>
      </div>

      {/* Quick Export Buttons */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <h3 className="font-semibold text-slate-800 mb-3">Быстрый экспорт отчётов</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportToExcel('donors')} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">Доноры (CSV)</button>
          <button onClick={() => exportToExcel('cultures')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm">Культуры (CSV)</button>
          <button onClick={() => exportToExcel('tasks')} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm">Задачи (CSV)</button>
          <button onClick={() => exportToExcel('full')} className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm">Полный отчёт (CSV)</button>
        </div>
      </div>
    </div>
  );
};
