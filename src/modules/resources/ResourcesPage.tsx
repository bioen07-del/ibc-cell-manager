// @ts-nocheck
import React, { useState } from 'react';
import { Wrench, Beaker, Package } from 'lucide-react';
import { EquipmentPage } from '../equipment/EquipmentPage';
import { MediaPage } from '../media/MediaPage';
import { ContainersPage } from '../containers/ContainersPage';

const tabs = [
  { id: 'equipment', label: 'Оборудование', icon: Wrench },
  { id: 'media', label: 'Среды и Реактивы', icon: Beaker },
  { id: 'containers', label: 'Справочник Посуды', icon: Package },
];

export const ResourcesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('equipment');

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Ресурсы</h1>
      
      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'equipment' && <EquipmentPage />}
      {activeTab === 'media' && <MediaPage />}
      {activeTab === 'containers' && <ContainersPage />}
    </div>
  );
};
