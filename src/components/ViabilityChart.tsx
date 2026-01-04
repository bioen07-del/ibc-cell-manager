// @ts-nocheck
import React from 'react';
import { Culture, Manipulation } from '../types';

interface ViabilityChartProps {
  culture: Culture;
  manipulations: Manipulation[];
  height?: number;
}

export const ViabilityChart: React.FC<ViabilityChartProps> = ({ 
  culture, 
  manipulations,
  height = 200 
}) => {
  // Собираем данные жизнеспособности из манипуляций
  const getViabilityData = () => {
    const dataPoints: { date: Date; value: number; label?: string }[] = [];
    
    // Из манипуляций (пассажи и подсчёты с жизнеспособностью)
    const relevantManips = manipulations.filter(m => 
      m.targetId === culture.id && 
      m.parameters
    );
    
    relevantManips.forEach(m => {
      const params = m.parameters as Record<string, unknown>;
      if (params.viability) {
        const viability = parseFloat(params.viability as string) || 0;
        if (viability > 0) {
          dataPoints.push({ 
            date: new Date(m.dateTime), 
            value: viability,
            label: m.type === 'passage' ? 'Пассаж' : 'Подсчёт'
          });
        }
      }
    });
    
    // Из истории культуры (если есть viabilityHistory)
    if ((culture as any).viabilityHistory) {
      (culture as any).viabilityHistory.forEach((h: { date: string; value: number }) => {
        const existing = dataPoints.find(d => 
          Math.abs(d.date.getTime() - new Date(h.date).getTime()) < 1000 * 60 * 5
        );
        if (!existing) {
          dataPoints.push({ date: new Date(h.date), value: h.value });
        }
      });
    }
    
    // Добавляем текущую жизнеспособность культуры
    if (culture.viability && dataPoints.length === 0) {
      dataPoints.push({ 
        date: new Date(culture.createdAt), 
        value: culture.viability 
      });
    }
    
    // Сортируем по дате
    return dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const data = getViabilityData();
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-slate-50 rounded-lg text-slate-400 text-sm">
        Нет данных о жизнеспособности
      </div>
    );
  }

  // SVG размеры
  const width = 400;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Масштабирование (50-100%)
  const minValue = Math.max(50, Math.min(...data.map(d => d.value)) - 5);
  const maxValue = 100;
  const valueRange = maxValue - minValue;
  
  const minDate = data[0].date.getTime();
  const maxDate = data[data.length - 1].date.getTime();
  const dateRange = maxDate - minDate || 1;
  
  const xScale = (date: Date) => 
    padding.left + ((date.getTime() - minDate) / dateRange) * chartWidth;
  const yScale = (value: number) => 
    padding.top + (1 - (value - minValue) / valueRange) * chartHeight;

  // Линия графика
  const pathD = data.map((d, i) => {
    const x = xScale(d.date);
    const y = yScale(d.value);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  // Область под графиком
  const areaD = pathD + 
    ` L ${xScale(data[data.length - 1].date)} ${padding.top + chartHeight}` +
    ` L ${xScale(data[0].date)} ${padding.top + chartHeight} Z`;

  // Форматирование даты
  const formatDate = (date: Date) => {
    return `${date.getDate()}.${date.getMonth() + 1}`;
  };

  // Цвет в зависимости от значения
  const getColor = (value: number) => {
    if (value >= 90) return '#10b981'; // green
    if (value >= 80) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const currentValue = data[data.length - 1]?.value || 0;
  const color = getColor(currentValue);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
        {/* Сетка Y */}
        {[minValue, (minValue + maxValue) / 2, maxValue].map(v => (
          <g key={v}>
            <line 
              x1={padding.left} 
              y1={yScale(v)} 
              x2={width - padding.right} 
              y2={yScale(v)} 
              stroke="#e2e8f0" 
              strokeDasharray="2,2"
            />
            <text 
              x={padding.left - 5} 
              y={yScale(v) + 4} 
              textAnchor="end" 
              className="text-xs fill-slate-400"
            >
              {v.toFixed(0)}%
            </text>
          </g>
        ))}
        
        {/* Зона нормы (>90%) */}
        <rect 
          x={padding.left} 
          y={yScale(100)} 
          width={chartWidth} 
          height={yScale(90) - yScale(100)}
          fill="#10b981" 
          opacity="0.1"
        />
        
        {/* Область */}
        <path d={areaD} fill={`url(#viabilityGradient)`} opacity="0.3" />
        
        {/* Линия */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
        
        {/* Точки */}
        {data.map((d, i) => (
          <g key={i}>
            <circle 
              cx={xScale(d.date)} 
              cy={yScale(d.value)} 
              r="4" 
              fill={getColor(d.value)} 
              stroke="white" 
              strokeWidth="2"
            />
            {/* Подпись даты */}
            {(i === 0 || i === data.length - 1 || data.length <= 5) && (
              <text 
                x={xScale(d.date)} 
                y={height - 5} 
                textAnchor="middle" 
                className="text-xs fill-slate-400"
              >
                {formatDate(d.date)}
              </text>
            )}
          </g>
        ))}
        
        {/* Градиент */}
        <defs>
          <linearGradient id="viabilityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Легенда */}
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>Всего замеров: {data.length}</span>
        <span className={`font-medium ${currentValue >= 90 ? 'text-emerald-600' : currentValue >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
          Текущая: {currentValue.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};
