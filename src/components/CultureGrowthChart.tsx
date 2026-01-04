// @ts-nocheck
import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Manipulation, Culture } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CultureGrowthChartProps {
  manipulations: Manipulation[];
  cultureId: string;
  cultures?: Culture[]; // Для расчёта PDL от всей линии
}

export const CultureGrowthChart: React.FC<CultureGrowthChartProps> = ({ manipulations, cultureId, cultures }) => {
  // Получаем полную линию культуры (от первого пассажа до текущего)
  const getCultureLineage = (id: string): string[] => {
    if (!cultures) return [id];
    const culture = cultures.find(c => c.id === id);
    if (!culture) return [id];
    if (culture.parentCultureId) {
      return [...getCultureLineage(culture.parentCultureId), id];
    }
    return [id];
  };
  
  const lineage = getCultureLineage(cultureId);

  // Фильтруем манипуляции с данными о количестве клеток для всей линии
  const growthData = useMemo(() => {
    const labels: string[] = [];
    const cellCounts: number[] = [];
    const viabilities: number[] = [];
    const dates: Date[] = [];
    const cultureIds: string[] = [];
    const sources: string[] = []; // Источник данных для отображения

    // Добавляем начальные данные из культур (после размораживания)
    if (cultures) {
      lineage.forEach(cultId => {
        const cult = cultures.find(c => c.id === cultId);
        if (cult && cult.cellCount && cult.passageNumber >= 1) {
          const date = new Date(cult.createdAt);
          labels.push(date.toLocaleDateString('ru-RU'));
          dates.push(date);
          cellCounts.push(cult.cellCount);
          viabilities.push(cult.viability || 0);
          cultureIds.push(cultId);
          sources.push('создание/разморозка');
        }
      });
    }

    // Добавляем данные из манипуляций
    const relevantManips = manipulations
      .filter(m => lineage.includes(m.targetId) && m.parameters?.cellCount)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    relevantManips.forEach(m => {
      const date = new Date(m.dateTime);
      labels.push(date.toLocaleDateString('ru-RU'));
      dates.push(date);
      cellCounts.push(Number(m.parameters?.cellCount) || 0);
      viabilities.push(Number(m.parameters?.viability) || 0);
      cultureIds.push(m.targetId);
      sources.push(m.type);
    });

    // Сортируем все данные по дате
    const combined = labels.map((_, i) => ({
      label: labels[i], date: dates[i], cellCount: cellCounts[i], 
      viability: viabilities[i], cultureId: cultureIds[i], source: sources[i]
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    return { 
      labels: combined.map(c => c.label), 
      cellCounts: combined.map(c => c.cellCount), 
      viabilities: combined.map(c => c.viability), 
      dates: combined.map(c => c.date), 
      cultureIds: combined.map(c => c.cultureId),
      sources: combined.map(c => c.source)
    };
  }, [manipulations, lineage, cultures]);

  // Расчёт удвоений популяции (PDL)
  const doublingData = useMemo(() => {
    const doublings: number[] = [];
    const { cellCounts } = growthData;
    
    for (let i = 0; i < cellCounts.length; i++) {
      if (i === 0 || cellCounts[i - 1] === 0) {
        doublings.push(0);
      } else {
        // Population Doubling Level = log2(Nf / Ni) = 3.322 * log10(Nf / Ni)
        const pdl = Math.log2(cellCounts[i] / cellCounts[i - 1]);
        doublings.push(doublings[i - 1] + Math.max(0, pdl));
      }
    }
    return doublings;
  }, [growthData]);

  // Расчёт скорости роста (удвоения в сутки)
  const growthRateData = useMemo(() => {
    const rates: number[] = [];
    const { dates } = growthData;
    
    for (let i = 0; i < doublingData.length; i++) {
      if (i === 0 || dates[i - 1] === undefined) {
        rates.push(0);
      } else {
        const daysBetween = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        const pdlDiff = doublingData[i] - doublingData[i - 1];
        rates.push(daysBetween > 0 ? pdlDiff / daysBetween : 0);
      }
    }
    return rates;
  }, [doublingData, growthData.dates]);

  if (growthData.labels.length < 2) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500 text-sm">
        Недостаточно данных для построения графика. Необходимо минимум 2 измерения количества клеток.
        {lineage.length > 1 && (
          <p className="mt-2 text-xs">Линия культуры: {lineage.join(' → ')}</p>
        )}
      </div>
    );
  }

  const chartData = {
    labels: growthData.labels,
    datasets: [
      {
        label: 'Количество клеток',
        data: growthData.cellCounts,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'Накопленный PDL',
        data: doublingData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
        tension: 0.3,
        yAxisID: 'y1'
      }
    ]
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top' as const
      },
      title: {
        display: true,
        text: lineage.length > 1 ? `Динамика роста (линия: ${lineage.length} культур)` : 'Динамика роста культуры'
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label.includes('клеток')) {
              return `${label}: ${value.toLocaleString()}`;
            }
            return `${label}: ${value.toFixed(2)}`;
          },
          afterBody: (tooltipItems: any[]) => {
            const idx = tooltipItems[0]?.dataIndex;
            if (idx !== undefined && growthData.cultureIds[idx]) {
              const lines = [`Культура: ${growthData.cultureIds[idx]}`];
              if (growthData.sources && growthData.sources[idx]) {
                lines.push(`Источник: ${growthData.sources[idx]}`);
              }
              if (growthRateData[idx] > 0) {
                lines.push(`Скорость роста: ${growthRateData[idx].toFixed(3)} PDL/сутки`);
              }
              return lines;
            }
            return [];
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Количество клеток'
        },
        ticks: {
          callback: (value: string | number) => Number(value).toLocaleString()
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'PDL (удвоения)'
        },
        grid: {
          drawOnChartArea: false
        }
      }
    }
  };

  // Статистика
  const totalPDL = doublingData[doublingData.length - 1] || 0;
  const totalDays = growthData.dates.length > 1 
    ? (growthData.dates[growthData.dates.length - 1].getTime() - growthData.dates[0].getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const avgDoublingTime = totalPDL > 0 ? totalDays / totalPDL : 0;
  const avgGrowthRate = totalDays > 0 ? totalPDL / totalDays : 0;

  return (
    <div className="space-y-4">
      {/* Линия культур */}
      {lineage.length > 1 && (
        <div className="p-2 bg-slate-50 rounded text-xs text-slate-600">
          <strong>Линия:</strong> {lineage.join(' → ')}
        </div>
      )}
      
      {/* Основная статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-600">{growthData.cellCounts[growthData.cellCounts.length - 1]?.toLocaleString() || 0}</p>
          <p className="text-xs text-blue-600">Текущее кол-во клеток</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-600">{totalPDL.toFixed(2)}</p>
          <p className="text-xs text-green-600">Накопл. PDL</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-purple-600">{avgDoublingTime > 0 ? `${avgDoublingTime.toFixed(1)} дн.` : '—'}</p>
          <p className="text-xs text-purple-600">Ср. время удвоения</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{avgGrowthRate > 0 ? avgGrowthRate.toFixed(3) : '—'}</p>
          <p className="text-xs text-amber-600">PDL/сутки</p>
        </div>
      </div>
      
      {/* График */}
      <Line data={chartData} options={options} />
      
      {/* Детальная таблица */}
      <details className="text-sm">
        <summary className="cursor-pointer text-slate-600 hover:text-slate-800">Подробная таблица данных</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-1 text-left">Дата</th>
                <th className="border p-1 text-left">Культура</th>
                <th className="border p-1 text-left">Источник</th>
                <th className="border p-1 text-right">Клеток</th>
                <th className="border p-1 text-right">Жизнесп.%</th>
                <th className="border p-1 text-right">PDL</th>
                <th className="border p-1 text-right">PDL/сут</th>
              </tr>
            </thead>
            <tbody>
              {growthData.labels.map((label, i) => (
                <tr key={i} className={growthData.cultureIds[i] === cultureId ? 'bg-blue-50' : ''}>
                  <td className="border p-1">{label}</td>
                  <td className="border p-1">{growthData.cultureIds[i]}</td>
                  <td className="border p-1 text-xs">{growthData.sources?.[i] || '—'}</td>
                  <td className="border p-1 text-right">{growthData.cellCounts[i].toLocaleString()}</td>
                  <td className="border p-1 text-right">{growthData.viabilities[i] || '—'}%</td>
                  <td className="border p-1 text-right">{doublingData[i].toFixed(2)}</td>
                  <td className="border p-1 text-right">{growthRateData[i] > 0 ? growthRateData[i].toFixed(3) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};
