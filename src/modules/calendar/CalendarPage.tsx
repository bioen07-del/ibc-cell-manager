// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'passage' | 'calibration';
  priority?: string;
  status?: string;
}

export const CalendarPage: React.FC = () => {
  const { tasks, cultures, equipment } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const safeTasks = tasks || [];
  const safeCultures = cultures || [];
  const safeEquipment = equipment || [];

  // Собираем события из разных источников
  const getEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Задачи
    safeTasks.forEach(task => {
      if (task.dueDate) {
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          date: task.dueDate.split('T')[0],
          type: 'task',
          priority: task.priority,
          status: task.status
        });
      }
    });

    // Пассажи культур (предполагаемая дата следующего пассажа)
    safeCultures.forEach(culture => {
      if (culture.status === 'in_work' && culture.updatedAt) {
        // Предполагаем пассаж каждые 3-4 дня
        const lastUpdate = new Date(culture.updatedAt);
        const nextPassage = new Date(lastUpdate.getTime() + 3 * 24 * 60 * 60 * 1000);
        events.push({
          id: `passage-${culture.id}`,
          title: `Пассаж: ${culture.name}`,
          date: nextPassage.toISOString().split('T')[0],
          type: 'passage'
        });
      }
    });

    // Калибровка оборудования
    safeEquipment.forEach(eq => {
      if (eq.nextCalibration) {
        events.push({
          id: `calibration-${eq.id}`,
          title: `Калибровка: ${eq.name}`,
          date: eq.nextCalibration,
          type: 'calibration'
        });
      }
    });

    return events;
  };

  const events = getEvents();

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // Корректировка для начала недели с понедельника
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    return { daysInMonth, firstDay: adjustedFirstDay };
  };

  const { daysInMonth, firstDay } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDateKey = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const getEventsForDay = (day: number) => {
    const dateKey = formatDateKey(day);
    return events.filter(e => e.date === dateKey);
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getEventColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-blue-500';
      case 'passage': return 'bg-green-500';
      case 'calibration': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const today = new Date();
  const isToday = (day: number) => {
    return currentDate.getFullYear() === today.getFullYear() &&
           currentDate.getMonth() === today.getMonth() &&
           day === today.getDate();
  };

  const selectedDateEvents = selectedDate ? events.filter(e => e.date === selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Календарь</h1>
          <p className="text-gray-500">Задачи, пассажи, калибровки</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Новое событие
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Календарь */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-4">
          {/* Навигация */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Дни недели */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Дни месяца */}
          <div className="grid grid-cols-7 gap-1">
            {/* Пустые ячейки до первого дня */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded-lg"></div>
            ))}

            {/* Дни месяца */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = formatDateKey(day);
              const dayEvents = getEventsForDay(day);
              const isSelected = selectedDate === dateKey;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`h-24 p-1 rounded-lg border cursor-pointer transition-all ${
                    isToday(day) ? 'border-blue-500 bg-blue-50' :
                    isSelected ? 'border-blue-300 bg-blue-50' :
                    'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday(day) ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={`text-xs text-white px-1 py-0.5 rounded truncate ${getEventColor(event.type)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500">+{dayEvents.length - 3} ещё</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Боковая панель с событиями */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-semibold text-gray-900 mb-4">
            {selectedDate ? `События на ${selectedDate}` : 'Выберите дату'}
          </h3>

          {selectedDate && selectedDateEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDateEvents.map(event => (
                <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${getEventColor(event.type)}`}></div>
                    <span className="text-xs text-gray-500 uppercase">
                      {event.type === 'task' ? 'Задача' : event.type === 'passage' ? 'Пассаж' : 'Калибровка'}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">{event.title}</p>
                  {event.priority && (
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                      event.priority === 'high' ? 'bg-red-100 text-red-700' :
                      event.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {event.priority === 'high' ? 'Высокий' : event.priority === 'medium' ? 'Средний' : 'Низкий'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : selectedDate ? (
            <p className="text-gray-500 text-sm">Нет событий на эту дату</p>
          ) : (
            <p className="text-gray-500 text-sm">Кликните на день для просмотра событий</p>
          )}

          {/* Легенда */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Легенда</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-gray-600">Задачи</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-gray-600">Пассажи</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-gray-600">Калибровка</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

