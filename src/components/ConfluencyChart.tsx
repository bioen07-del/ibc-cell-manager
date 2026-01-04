// @ts-nocheck
import React from 'react';
import { Culture, Manipulation } from '../types';

interface ConfluencyChartProps {
  culture: Culture;
  manipulations: Manipulation[];
  height?: number;
}

export const ConfluencyChart: React.FC<ConfluencyChartProps> = ({ 
  culture, 
  manipulations,
  height = 200 
}) => {
  // Собираем данные конфлюэнтности из истории культуры и манипуляций
  const getConfluencyData = () => {
    const dataPoints: { date: Date; value: number; label?: string }[] = [];
    
    // Из истории культуры
    if (culture.confluencyHistory) {
      culture.confluencyHistory.forEach(h => {
        dataPoints.push({ date: new Date(h.date), value: h.value, label: 'Наблюдение' });
      });
    }
    
    // Из манипуляций (наблюдения с конфлюэнтностью)
    const observations = manipulations.filter(m => 
      m.targetId === culture.id && 
      m.type === 'observation' && 
      m.parameters
    );
    
    observations.forEach(m => {
      const params = m.parameters as Record<string, unknown>;
      if (params.confluence) {
        const existing = dataPoints.find(d => 
          Math.abs(d.date.getTime() - new Date(m.dateTime).getTime()) < 1000 * 60 * 5
        );
        if (!existing) {
          dataPoints.push({ 
            date: new Date(m.dateTime), 
            value: parseFloat(params.confluence as string) || 0 
          });
        }
      }
      // Из индивидуальных наблюдений
      if (params.containerObservations) {
        const obs = params.containerObservations as { confluency: number }[];
        const avgConf = obs.length > 0 
          ? obs.reduce((sum, o) => sum + o.confluency, 0) / obs.length 
          : 0;
        if (avgConf > 0) {
          const existing = dataPoints.find(d => 
            Math.abs(d.date.getTime() - new Date(m.dateTime).getTime()) < 1000 * 60 * 5
          );
          if (!existing) {
            dataPoints.push({ date: new Date(m.dateTime), value: avgConf });
          }
        }
      }
    });
    
    // Сортируем по дате
    return dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const data = getConfluencyData();
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-slate-50 rounded-lg text-slate-400 text-sm">
        Нет данных о конфлюэнтности
      </div>
    );
  }

  // SVG размеры
  const width = 400;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Масштабирование
  const minDate = data[0].date.getTime();
  const maxDate = data[data.length - 1].date.getTime();
  const dateRange = maxDate - minDate || 1;
  
  const xScale = (date: Date) => 
    padding.left + ((date.getTime() - minDate) / dateRange) * chartWidth;
  const yScale = (value: number) => 
    padding.top + (1 - value / 100) * chartHeight;

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

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
        {/* Сетка Y */}
        {[0, 25, 50, 75, 100].map(v => (
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
              {v}%
            </text>
          </g>
        ))}
        
        {/* Область */}
        <path d={areaD} fill="url(#confluencyGradient)" opacity="0.3" />
        
        {/* Линия */}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" />
        
        {/* Точки */}
        {data.map((d, i) => (
          <g key={i}>
            <circle 
              cx={xScale(d.date)} 
              cy={yScale(d.value)} 
              r="4" 
              fill="#10b981" 
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
          <linearGradient id="confluencyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Легенда */}
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>Всего точек: {data.length}</span>
        <span>Текущая: {data[data.length - 1]?.value.toFixed(0)}%</span>
      </div>
    </div>
  );
};
