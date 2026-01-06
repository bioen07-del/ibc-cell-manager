// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, Textarea, StatusBadge, EmptyState } from '../../components/UI';
import { FlaskConical, Search, Eye, Utensils, GitBranch, Snowflake, Trash2, Package, Printer, FileDown, BarChart3, AlertTriangle, History, FileText } from 'lucide-react';
import { CultureGrowthChart } from '../../components/CultureGrowthChart';
import { ConfluencyChart } from '../../components/ConfluencyChart';
import { ViabilityChart } from '../../components/ViabilityChart';
import { formatDateTime, cultureStatusLabels, getStatusColor, manipulationTypeLabels } from '../../utils';
import { printCultureLabel, generateCulturesJournalReport, generateCulturePassport } from '../../utils/pdf';
import { Culture, ManipulationType, MasterBankStatus, ContainerObservation, MorphologyType } from '../../types';

export const CulturesPage: React.FC = () => {
  const { donors, donations, cultures, manipulations, equipment, media, tasks, masterBanks, containerTypes, updateCulture, addManipulation, updateMedia, addMasterBank, addStorage, addCulture, triggerAutoTasks, addDisposal, addRelease } = useApp();
  const { canEdit } = useAuth();
  
  const safeDonors = donors || [];
  const safeDonations = donations || [];
  const safeMasterBanks = masterBanks || [];
  const safeMedia = media || [];
  const safeCultures = cultures || [];
  const safeTasks = tasks || [];
  
  const incubators = (equipment || []).filter((e: any) => (e.equipmentType || e.type) === 'incubator' && e.status === 'active');
  const approvedMedia = safeMedia.filter((m: any) => m.status === 'approved' && (m.remaining_volume || (m.remaining_volume || 0) || 0) > 0 && new Date(m.expiry_date || m.expiryDate) > new Date());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('in_work');
  const [isManipModalOpen, setIsManipModalOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [selectedCulture, setSelectedCulture] = useState<Culture | null>(null);
  const [manipType, setManipType] = useState<ManipulationType>('observation');

  const [manipFormData, setManipFormData] = useState({
    notes: '',
    confluence: '',
    morphology: '' as MorphologyType | '',
    mediaId: '',
    volume: '',
    cellCount: '',
    viability: '',
    newContainerCount: '1',
    passageType: 'full' as 'full' | 'partial',
    incubatorId: '',
    // Поля для заморозки
    tubeCount: '5',
    freezeTubeType: 'Криопробирка 2 мл',
    freezeTubeVolume: '1',
    cryoprotectant: 'DMSO 10%',
    freezeProtocol: 'Стандартный -1°C/мин',
    storageEquipment: '',
    storageShelf: '',
    storageRack: '',
    storageBox: '',
    storagePosition: '',
    // Наблюдение по посуде
    observationType: 'all' as 'all' | 'individual',
    photos: [] as string[],
    // Подкормка по посуде
    feedingType: 'all' as 'all' | 'individual',
    feedingContainers: [] as { containerId: number; containerType: string; volume: string; mediaId: string }[],
    containerObservations: [] as ContainerObservation[],
    hasBacteria: false,
    hasFungi: false,
    hasCells: true,
    containerAction: 'none' as 'none' | 'dispose' | 'bacteriology',
    // Пассаж - выбор посуды
    selectedContainers: [] as number[],
    // Пассаж - новая посуда и среды
    passageContainers: [{ type: 'Флакон T75', count: 1, mediaId: '', volume: '' }] as { type: string; count: number; mediaId: string; volume: string }[],
    // Дата/время манипуляции
    dateTime: new Date().toISOString().slice(0, 16),
    // Поля выдачи
    releaseRecipientName: '',
    releaseRecipientOrg: '',
    releaseRecipientContact: '',
    releaseApplicationType: 'clinical' as 'clinical' | 'research' | 'scientific',
    releaseType: 'full' as 'full' | 'partial',
    releaseContainerCount: '1',
    // Поля утилизации
    disposalReason: 'contamination' as 'contamination' | 'expired' | 'quality_failure' | 'no_demand' | 'damage' | 'other',
    disposalReasonDetails: '',
    // Пункт 4: Выбор культуры для мастер-банка при частичном пассаже
    forMasterBank: 'new' as 'new' | 'original' // 'new' = новая культура, 'original' = исходная
  });

  // Площади культуральной посуды (см²)
  const CONTAINER_AREAS: Record<string, number> = {
    'Флакон T25': 25, 'Флакон T-25': 25,
    'Флакон T75': 75, 'Флакон T-75': 75,
    'Флакон T175': 175, 'Флакон T-175': 175,
    'Чашка Петри 35мм': 9.6,
    'Чашка Петри 60мм': 21,
    'Чашка Петри 100мм': 56,
    '6-луночный планшет': 9.5,
    '12-луночный планшет': 3.8,
    '24-луночный планшет': 1.9
  };

  // Расчёт плотности клеток при рассеивании
  const calculatePassageCellDensity = () => {
    const totalCells = parseInt(manipFormData.cellCount) || 0;
    const containers = manipFormData.passageContainers;
    const totalContainers = containers.reduce((sum, c) => sum + c.count, 0);
    const totalArea = containers.reduce((sum, c) => sum + (CONTAINER_AREAS[c.type] || 25) * c.count, 0);
    return {
      cellsPerContainer: totalContainers > 0 ? Math.round(totalCells / totalContainers) : 0,
      cellsPerCm2: totalArea > 0 ? Math.round(totalCells / totalArea) : 0
    };
  };

  // Проверка наличия мастер-банка для донации
  const hasMasterBankForDonation = (donationId: string) => {
    return safeMasterBanks.some(mb => mb.donationId === donationId);
  };

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const cryoStorages = (equipment || []).filter((e: any) => (e.equipmentType || e.type) === 'cryostorage' && e.status === 'active');

  const resetManipForm = () => {
    setManipFormData({
      notes: '',
      confluence: '',
      morphology: '',
      mediaId: '',
      volume: '',
      cellCount: '',
      viability: '',
      newContainerCount: '1',
      passageType: 'full',
      incubatorId: '',
      tubeCount: '5',
      freezeTubeType: 'Криопробирка 2 мл',
      freezeTubeVolume: '1',
      cryoprotectant: 'DMSO 10%',
      freezeProtocol: 'Стандартный -1°C/мин',
      storageEquipment: '',
      storageShelf: '',
      storageRack: '',
      storageBox: '',
      storagePosition: '',
      observationType: 'all',
      photos: [],
      containerObservations: [],
      feedingType: 'all',
      feedingContainers: [],
      hasBacteria: false,
      hasFungi: false,
      hasCells: true,
      containerAction: 'none',
      selectedContainers: [],
      passageContainers: [{ type: 'Флакон T75', count: 1, mediaId: '', volume: '' }],
      dateTime: new Date().toISOString().slice(0, 16),
      releaseRecipientName: '',
      releaseRecipientOrg: '',
      releaseRecipientContact: '',
      releaseApplicationType: 'clinical',
      releaseType: 'full',
      releaseContainerCount: '1',
      disposalReason: 'contamination',
      disposalReasonDetails: '',
      forMasterBank: 'new'
    });
  };

  // Инициализация наблюдений по посуде
  const initContainerObservations = (culture: Culture) => {
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
    return observations;
  };

  const handleOpenManipulation = (culture: Culture, type: ManipulationType) => {
    setSelectedCulture(culture);
    setManipType(type);
    resetManipForm();
    
    // Для наблюдения инициализируем список посуды
    if (type === 'observation') {
      const obs = initContainerObservations(culture);
      setManipFormData(prev => ({ ...prev, containerObservations: obs }));
    }
    
    // Для подкормки инициализируем список посуды
    if (type === 'feeding') {
      const containers = culture.containers || [{ type: culture.containerType, count: culture.containerCount }];
      const feedingCont: { containerId: number; containerType: string; volume: string; mediaId: string }[] = [];
      let idx = 0;
      containers.forEach((c) => {
        for (let i = 0; i < c.count; i++) {
          feedingCont.push({ containerId: idx++, containerType: c.type, volume: '', mediaId: '' });
        }
      });
      setManipFormData(prev => ({ ...prev, feedingContainers: feedingCont }));
    }
    
    // Для пассажа инициализируем список контейнеров
    if (type === 'passage') {
      const obs = initContainerObservations(culture);
      setManipFormData(prev => ({ 
        ...prev, 
        containerObservations: obs,
        selectedContainers: Array.from({ length: obs.length }, (_, i) => i) // по умолчанию все выбраны
      }));
    }
    
    // Для утилизации инициализируем список контейнеров
    if (type === 'disposal') {
      const obs = initContainerObservations(culture);
      setManipFormData(prev => ({ 
        ...prev, 
        containerObservations: obs,
        selectedContainers: Array.from({ length: obs.length }, (_, i) => i), // по умолчанию все выбраны
        observationType: 'all'
      }));
    }
    
    setIsManipModalOpen(true);
  };

  const handleSubmitManipulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCulture) return;

    const parameters: Record<string, unknown> = {};
    
    switch (manipType) {
      case 'observation':
        parameters.incubatorId = manipFormData.incubatorId;
        parameters.observationType = manipFormData.observationType;
        if (manipFormData.observationType === 'all') {
          parameters.confluence = manipFormData.confluence;
          parameters.morphology = manipFormData.morphology;
          parameters.hasCells = manipFormData.hasCells;
          parameters.hasBacteria = manipFormData.hasBacteria;
          parameters.hasFungi = manipFormData.hasFungi;
          parameters.containerAction = manipFormData.containerAction;
        } else {
          parameters.containerObservations = manipFormData.containerObservations;
        }
        // Сохранить фотографии
        if (manipFormData.photos.length > 0) {
          parameters.photos = manipFormData.photos;
        }
        
        // Обработка контаминации и обновление культуры
        if (manipFormData.observationType === 'all') {
          // Обновляем конфлюэнтность и стерильность культуры
          const hasContamination = manipFormData.hasBacteria || manipFormData.hasFungi;
          const newConfluency = parseFloat(manipFormData.confluence) || undefined;
          
          // Добавляем в историю конфлюэнтности
          const newHistory = [...(selectedCulture.confluencyHistory || [])];
          if (newConfluency !== undefined) {
            newHistory.push({ date: new Date().toISOString(), value: newConfluency });
          }
          
          updateCulture(selectedCulture.id, {
            currentConfluency: newConfluency,
            confluencyHistory: newHistory,
            isSterile: !hasContamination,
            morphology: manipFormData.morphology as 'typical' | 'atypical' | 'differentiating' || undefined
          });
          
          // Если контаминация для всей культуры
          if (manipFormData.containerAction === 'dispose' || manipFormData.containerAction === 'bacteriology') {
            // Регистрируем утилизацию в журнале
            addDisposal({
              objectType: 'culture',
              objectId: selectedCulture.id,
              donorId: selectedCulture.donorId,
              cellType: selectedCulture.cellType,
              tubeCount: selectedCulture.containerCount || 1,
              reason: 'contamination',
              reasonDetails: manipFormData.containerAction === 'bacteriology' ? 'На бак. исследование' : undefined,
              quantity: String(selectedCulture.containerCount || 1),
              disposalDate: manipFormData.dateTime || new Date().toISOString(),
              operatorName: 'Текущий пользователь'
            });
            updateCulture(selectedCulture.id, { status: 'disposed', isSterile: false });
          }
        } else {
          // Индивидуальное наблюдение - удалить контаминированные чашки
          const disposedContainers = manipFormData.containerObservations.filter(
            c => c.action === 'dispose' || c.action === 'bacteriology' || c.hasBacteria || c.hasFungi
          );
          const remainingContainers = manipFormData.containerObservations.filter(
            c => c.action !== 'dispose' && c.action !== 'bacteriology' && !c.hasBacteria && !c.hasFungi
          );
          
          // Рассчитать среднюю конфлюэнтность по оставшимся контейнерам
          const avgConfluency = remainingContainers.length > 0 
            ? Math.round(remainingContainers.reduce((sum, c) => sum + c.confluency, 0) / remainingContainers.length)
            : 0;
          const hasAnyContamination = disposedContainers.length > 0;
          
          if (remainingContainers.length === 0) {
            // Все чашки контаминированы - утилизация всей культуры
            addDisposal({
              objectType: 'culture',
              objectId: selectedCulture.id,
              donorId: selectedCulture.donorId,
              cellType: selectedCulture.cellType,
              tubeCount: disposedContainers.length,
              reason: 'contamination',
              reasonDetails: 'Все контейнеры контаминированы',
              quantity: String(disposedContainers.length),
              disposalDate: manipFormData.dateTime || new Date().toISOString(),
              operatorName: 'Текущий пользователь'
            });
            updateCulture(selectedCulture.id, { status: 'disposed', isSterile: false });
          } else if (disposedContainers.length > 0) {
            // Частичная утилизация - регистрируем в журнале
            addDisposal({
              objectType: 'culture',
              objectId: selectedCulture.id,
              donorId: selectedCulture.donorId,
              cellType: selectedCulture.cellType,
              tubeCount: disposedContainers.length,
              reason: 'contamination',
              reasonDetails: `Частичная утилизация: ${disposedContainers.length} контейнер(ов)`,
              quantity: String(disposedContainers.length),
              disposalDate: manipFormData.dateTime || new Date().toISOString(),
              operatorName: 'Текущий пользователь'
            });
            // Частичная утилизация - обновить контейнеры культуры
            const newContainers = remainingContainers.map(c => ({ type: c.containerType, count: 1 }));
            updateCulture(selectedCulture.id, {
              containerCount: remainingContainers.length,
              containers: newContainers,
              currentConfluency: avgConfluency,
              isSterile: !hasAnyContamination
            });
          } else {
            // Без контаминации - просто обновить конфлюэнтность
            updateCulture(selectedCulture.id, {
              currentConfluency: avgConfluency,
              isSterile: true
            });
          }
        }
        break;
      case 'feeding':
        parameters.feedingType = manipFormData.feedingType;
        if (manipFormData.feedingType === 'all') {
          parameters.mediaId = manipFormData.mediaId;
          parameters.volume = parseFloat(manipFormData.volume) || 0;
          // Списать среду
          if (manipFormData.mediaId && manipFormData.volume) {
            const usedMedia = safeMedia.find(m => m.id === manipFormData.mediaId);
            if (usedMedia) {
              const newRemaining = Math.max(0, (usedMedia.remaining_volume || usedMedia.remainingVolume || 0) - (parseFloat(manipFormData.volume) || 0));
              updateMedia(usedMedia.id, { 
                remaining_volume: newRemaining,
                status: newRemaining === 0 ? 'exhausted' : usedMedia.status
              });
            }
          }
        } else {
          parameters.feedingContainers = manipFormData.feedingContainers;
          // Списать среды по каждому контейнеру
          const mediaUsage: Record<string, number> = {};
          manipFormData.feedingContainers.forEach(fc => {
            if (fc.mediaId && fc.volume) {
              mediaUsage[fc.mediaId] = (mediaUsage[fc.mediaId] || 0) + parseFloat(fc.volume);
            }
          });
          Object.entries(mediaUsage).forEach(([mId, vol]) => {
            const usedMedia = safeMedia.find(m => m.id === mId);
            if (usedMedia) {
              const newRemaining = Math.max(0, (usedMedia.remaining_volume || usedMedia.remainingVolume || 0) - vol);
              updateMedia(usedMedia.id, { 
                remaining_volume: newRemaining,
                status: newRemaining === 0 ? 'exhausted' : usedMedia.status
              });
            }
          });
        }
        break;
      case 'passage':
        parameters.cellCount = parseInt(manipFormData.cellCount) || 0;
        parameters.viability = parseFloat(manipFormData.viability) || 0;
        parameters.passageType = manipFormData.passageType;
        parameters.passageContainers = manipFormData.passageContainers;
        // Списать среды для пассажа
        const passageMediaUsage: Record<string, number> = {};
        manipFormData.passageContainers.forEach(c => {
          if (c.mediaId && c.volume) {
            passageMediaUsage[c.mediaId] = (passageMediaUsage[c.mediaId] || 0) + parseFloat(c.volume) * c.count;
          }
        });
        Object.entries(passageMediaUsage).forEach(([mId, vol]) => {
          const usedMedia = safeMedia.find(m => m.id === mId);
          if (usedMedia) {
            const newRemaining = Math.max(0, (usedMedia.remaining_volume || usedMedia.remainingVolume || 0) - vol);
            updateMedia(usedMedia.id, { 
              remaining_volume: newRemaining,
              status: newRemaining === 0 ? 'exhausted' : usedMedia.status
            });
          }
        });
        break;
      case 'freezing':
        parameters.cellCount = parseInt(manipFormData.cellCount) || 0;
        parameters.viability = parseFloat(manipFormData.viability) || 0;
        break;
      case 'release':
        parameters.recipientName = manipFormData.releaseRecipientName;
        parameters.recipientOrg = manipFormData.releaseRecipientOrg;
        parameters.recipientContact = manipFormData.releaseRecipientContact;
        parameters.applicationType = manipFormData.releaseApplicationType;
        break;
      case 'disposal':
        parameters.reason = manipFormData.disposalReason;
        parameters.reasonDetails = manipFormData.disposalReasonDetails;
        parameters.disposalType = manipFormData.observationType;
        parameters.disposedContainers = manipFormData.selectedContainers;
        break;
    }

    addManipulation({
      type: manipType,
      targetId: selectedCulture.id,
      targetType: 'culture',
      operatorName: 'Оператор',
      dateTime: manipFormData.dateTime ? new Date(manipFormData.dateTime).toISOString() : new Date().toISOString(),
      notes: manipFormData.notes,
      parameters
    });

    // Update culture based on manipulation
    switch (manipType) {
      case 'passage':
        // Подготовить новые контейнеры из формы пассажа
        const newPassageContainers = manipFormData.passageContainers.map(c => ({ type: c.type, count: c.count }));
        const totalNewContainers = manipFormData.passageContainers.reduce((sum, c) => sum + c.count, 0);
        
        if (manipFormData.passageType === 'full') {
          // Полный пассаж: текущая культура получает новый номер пассажа
          const prevCellCount = selectedCulture.lastCellCount || selectedCulture.cellCount || 0;
          const newCellCount = parseInt(manipFormData.cellCount) || 0;
          let growthRate = selectedCulture.growthRate;
          let doublings = 0;
          
          if (prevCellCount > 0 && newCellCount > prevCellCount && selectedCulture.lastCellCountDate) {
            const daysDiff = (Date.now() - new Date(selectedCulture.lastCellCountDate).getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff > 0) {
              doublings = Math.log2(newCellCount / prevCellCount);
              growthRate = doublings / daysDiff;
            }
          }
          
          updateCulture(selectedCulture.id, {
            passageNumber: selectedCulture.passageNumber + 1,
            cellCount: newCellCount || selectedCulture.cellCount,
            viability: parseFloat(manipFormData.viability) || selectedCulture.viability,
            containers: newPassageContainers,
            containerCount: totalNewContainers,
            containerType: newPassageContainers[0]?.type || selectedCulture.containerType,
            totalDoublings: (selectedCulture.totalDoublings || 0) + doublings,
            growthRate: growthRate,
            lastCellCount: newCellCount || undefined,
            lastCellCountDate: new Date().toISOString()
          });
        } else {
          // Частичный пассаж: создаём новую культуру и обновляем исходную
          const allContainers = manipFormData.containerObservations;
          const selectedIndexes = manipFormData.selectedContainers;
          const remainingIndexes = allContainers.map((_, i) => i).filter(i => !selectedIndexes.includes(i));
          
          // Контейнеры оставшиеся в исходной культуре
          const remainingContainers = remainingIndexes.map(i => ({
            type: allContainers[i].containerType,
            count: 1
          }));
          
          // Пункт 4: определяем какая культура для мастер-банка
          const newCultureForMB = manipFormData.forMasterBank === 'new';
          const originalCultureForMB = manipFormData.forMasterBank === 'original';
          
          // Расчёт скорости роста и удвоений
          const prevCellCount = selectedCulture.lastCellCount || selectedCulture.cellCount || 0;
          const newCellCount = parseInt(manipFormData.cellCount) || 0;
          let growthRate = selectedCulture.growthRate;
          let doublings = 0;
          
          if (prevCellCount > 0 && newCellCount > prevCellCount && selectedCulture.lastCellCountDate) {
            const daysDiff = (Date.now() - new Date(selectedCulture.lastCellCountDate).getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff > 0) {
              doublings = Math.log2(newCellCount / prevCellCount);
              growthRate = doublings / daysDiff;
            }
          }
          
          const totalDoublings = (selectedCulture.totalDoublings || 0) + doublings;
          const rootId = selectedCulture.rootCultureId || selectedCulture.id;
          
          // Создаём новую культуру с новыми контейнерами из формы
          const newCulture = addCulture({
            donationId: selectedCulture.donationId,
            donorId: selectedCulture.donorId,
            cellType: selectedCulture.cellType,
            passageNumber: selectedCulture.passageNumber + 1,
            containerType: newPassageContainers[0]?.type || selectedCulture.containerType,
            containerCount: totalNewContainers,
            containers: newPassageContainers,
            incubatorId: selectedCulture.incubatorId,
            cellCount: newCellCount || undefined,
            viability: parseFloat(manipFormData.viability) || undefined,
            parentCultureId: selectedCulture.id,
            rootCultureId: rootId,
            totalDoublings: totalDoublings,
            growthRate: growthRate,
            lastCellCount: newCellCount || undefined,
            lastCellCountDate: new Date().toISOString(),
            confluencyHistory: selectedCulture.confluencyHistory || [],
            suggestedForMasterBank: newCultureForMB,
            status: 'in_work'
          });
          
          // Триггерим автозадачи для новой культуры
          triggerAutoTasks('culture_created', newCulture.id);
          
          // Обновляем исходную культуру (убираем выбранные контейнеры)
          if (remainingContainers.length > 0) {
            updateCulture(selectedCulture.id, {
              containerCount: remainingContainers.length,
              containers: remainingContainers,
              suggestedForMasterBank: originalCultureForMB
            });
          } else {
            // Если все контейнеры сняты - это фактически полный пассаж
            updateCulture(selectedCulture.id, { status: 'passaged' });
          }
        }
        break;
      case 'freezing':
        const cellCount = parseInt(manipFormData.cellCount) || 0;
        const tubeCount = parseInt(manipFormData.tubeCount) || 1;
        const cellsPerTube = tubeCount > 0 ? Math.floor(cellCount / tubeCount) : cellCount;
        const viability = parseFloat(manipFormData.viability) || 0;
        
        // Первая заморозка от донации → мастер-банк
        // Последующие заморозки (после размораживания из мастер-банка) → хранилище
        const existingMasterBank = safeMasterBanks.find(mb => mb.donationId === selectedCulture.donationId);
        const isFirstFreeze = !existingMasterBank;
        
        if (isFirstFreeze) {
          addMasterBank({
            donationId: selectedCulture.donationId,
            donorId: selectedCulture.donorId,
            sourceCultureId: selectedCulture.id,
            cellType: selectedCulture.cellType,
            passageNumber: selectedCulture.passageNumber,
            cellCountAtFreeze: cellCount,
            viabilityAtFreeze: viability,
            cryoprotectant: manipFormData.cryoprotectant,
            freezeProtocol: manipFormData.freezeProtocol,
            tubeCount: tubeCount,
            cellsPerTube: cellsPerTube,
            storageConditions: '-196°C жидкий азот',
            status: 'stored' as MasterBankStatus,
            location: {
              equipment: manipFormData.storageEquipment || 'Криохранилище 1',
              shelf: manipFormData.storageShelf || '1',
              rack: manipFormData.storageRack || 'A',
              box: manipFormData.storageBox || '1',
              position: manipFormData.storagePosition || '1'
            }
          });
        } else {
          addStorage({
            sourceCultureId: selectedCulture.id,
            donorId: selectedCulture.donorId,
            cellType: selectedCulture.cellType,
            tubeCount: tubeCount,
            cellsPerTube: cellsPerTube,
            location: {
              equipment: manipFormData.storageEquipment || 'Криохранилище 1',
              shelf: manipFormData.storageShelf || '1',
              rack: manipFormData.storageRack || 'A',
              box: manipFormData.storageBox || '1',
              position: manipFormData.storagePosition || '1'
            },
            storageDate: new Date().toISOString(),
            temperature: '-196°C',
            nitrogenPhase: 'liquid',
            status: 'stored'
          });
        }
        
        updateCulture(selectedCulture.id, { 
          status: 'frozen',
          cellCount: cellCount,
          viability: viability
        });
        break;
      case 'disposal':
        // Регистрируем утилизацию в журнале
        addDisposal({
          objectType: 'culture',
          objectId: selectedCulture.id,
          donorId: selectedCulture.donorId,
          cellType: selectedCulture.cellType,
          reason: manipFormData.disposalReason,
          reasonDetails: manipFormData.disposalReasonDetails,
          quantity: manipFormData.observationType === 'all' ? 'Весь объём' : `${manipFormData.selectedContainers.length} контейнеров`,
          tubeCount: 0,
          disposalDate: new Date().toISOString(),
          operatorName: 'Оператор'
        });
        
        if (manipFormData.observationType === 'all') {
          // Полная утилизация
          updateCulture(selectedCulture.id, { status: 'disposed' });
        } else {
          // Частичная утилизация по выбранным контейнерам
          const selectedIndexes = manipFormData.selectedContainers;
          const allContainers = manipFormData.containerObservations;
          const remainingContainers = allContainers.filter((_, i) => !selectedIndexes.includes(i));
          
          if (remainingContainers.length === 0) {
            updateCulture(selectedCulture.id, { status: 'disposed' });
          } else {
            const newContainers = remainingContainers.map(c => ({ type: c.containerType, count: 1 }));
            updateCulture(selectedCulture.id, {
              containerCount: remainingContainers.length,
              containers: newContainers
            });
          }
        }
        break;
      case 'release':
        const releaseCount = parseInt(manipFormData.releaseContainerCount) || 1;
        const totalContainers = selectedCulture.containerCount || 1;
        
        // Регистрируем выдачу в журнале
        addRelease({
          sourceType: 'culture',
          sourceId: selectedCulture.id,
          donorId: selectedCulture.donorId,
          cellType: selectedCulture.cellType,
          applicationType: manipFormData.releaseApplicationType,
          recipientName: manipFormData.releaseRecipientName,
          recipientOrg: manipFormData.releaseRecipientOrg,
          recipientContact: manipFormData.releaseRecipientContact,
          quantity: manipFormData.releaseType === 'partial' 
            ? `${releaseCount} контейнер(ов) из ${totalContainers}`
            : `Все (${totalContainers} контейнер(ов))`,
          releaseDate: new Date().toISOString(),
          operatorName: 'Оператор',
          status: 'pending'
        });
        
        if (manipFormData.releaseType === 'partial' && releaseCount < totalContainers) {
          // Частичная выдача - уменьшаем количество контейнеров
          const remainingCount = totalContainers - releaseCount;
          updateCulture(selectedCulture.id, { 
            containerCount: remainingCount,
            containers: selectedCulture.containers?.slice(0, remainingCount)
          });
        } else {
          // Полная выдача
          updateCulture(selectedCulture.id, { status: 'released' });
        }
        break;
      case 'feeding':
        // Триггерим автозадачи на основе правил
        triggerAutoTasks('feeding_done', selectedCulture.id);
        break;
    }

    // Триггерим автозадачи для наблюдения
    if (manipType === 'observation') {
      triggerAutoTasks('observation_done', selectedCulture.id);
    }
    // Триггерим автозадачи для пассажа
    if (manipType === 'passage') {
      triggerAutoTasks('passage_done', selectedCulture.id);
    }

    setIsManipModalOpen(false);
    setSelectedCulture(null);
    resetManipForm();
  };

  const filteredCultures = (cultures || []).filter(culture => {
    const donor = safeDonors.find(d => d.id === culture.donorId);
    const matchesSearch = culture.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         donor?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         culture.cellType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || culture.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: 'Все статусы' },
    { value: 'in_work', label: 'В работе' },
    { value: 'frozen', label: 'Заморожены' },
    { value: 'released', label: 'Выданы' },
    { value: 'disposed', label: 'Утилизированы' }
  ];

  const getCultureManipulations = (cultureId: string) => {
    return manipulations.filter(m => m.targetId === cultureId).sort((a, b) => 
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    );
  };

  // Получение активных задач для культуры
  const getCultureTasks = (cultureId: string) => {
    return safeTasks.filter(t => 
      t.relatedEntityId === cultureId && 
      t.relatedEntityType === 'culture' && 
      (t.status === 'new' || t.status === 'in_progress')
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Активные культуры</h1>
          <p className="text-slate-500">Управление клеточными культурами</p>
        </div>
        <Button variant="secondary" onClick={() => generateCulturesJournalReport(cultures, donors)}>
          <FileDown className="w-4 h-4" /> Экспорт журнала PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по ID, донору или типу клеток..."
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
        </div>
      </Card>

      {/* Cultures Grid */}
      {filteredCultures.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCultures.map(culture => {
            const donor = safeDonors.find(d => d.id === culture.donorId);
            const donation = safeDonations.find(d => d.id === culture.donationId);
            const cultureManips = getCultureManipulations(culture.id);
            const cultureTasks = getCultureTasks(culture.id);
            
            return (
              <Card key={culture.id} className="overflow-hidden">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-slate-800">{culture.id}</h3>
                      <StatusBadge 
                        status={culture.status} 
                        label={cultureStatusLabels[culture.status]} 
                        color={getStatusColor(culture.status)} 
                      />
                    </div>
                    <p className="text-slate-600">{culture.cellType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">P{culture.passageNumber}</p>
                    <p className="text-xs text-slate-500">Пассаж</p>
                  </div>
                </div>

                {/* Culture Type Badge + PDL */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${culture.passageNumber === 0 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {culture.passageNumber === 0 ? 'Первичная культура' : 'Рабочая культура'}
                  </span>
                  {culture.suggestedForMasterBank && !hasMasterBankForDonation(culture.donationId) && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">
                      🧬 Для мастер-банка
                    </span>
                  )}
                  {culture.parentCultureId && (
                    <span className="text-xs text-slate-500">← от {culture.parentCultureId}</span>
                  )}
                  {/* PDL Badge */}
                  {(() => {
                    // Вычисляем PDL для всей линии культуры
                    const getLineage = (id: string): string[] => {
                      const c = safeCultures.find(x => x.id === id);
                      if (!c) return [id];
                      return c.parentCultureId ? [...getLineage(c.parentCultureId), id] : [id];
                    };
                    const lineage = getLineage(culture.id);
                    const lineageManips = manipulations
                      .filter(m => lineage.includes(m.targetId) && m.parameters?.cellCount)
                      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
                    
                    if (lineageManips.length < 2) return null;
                    
                    let pdl = 0;
                    for (let i = 1; i < lineageManips.length; i++) {
                      const prev = Number(lineageManips[i-1].parameters?.cellCount) || 0;
                      const curr = Number(lineageManips[i].parameters?.cellCount) || 0;
                      if (prev > 0 && curr > 0) {
                        pdl += Math.max(0, Math.log2(curr / prev));
                      }
                    }
                    return (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700" title="Population Doubling Level">
                        PDL: {pdl.toFixed(1)}
                      </span>
                    );
                  })()}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-500">Донор</p>
                    <p className="text-sm font-medium text-slate-700">{donor?.fullName || 'Неизвестен'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Тип ткани</p>
                    <p className="text-sm font-medium text-slate-700">{donation?.donationType || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Кол-во клеток</p>
                    <p className="text-sm font-medium text-slate-700">{culture.cellCount?.toLocaleString() || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Жизнеспособность</p>
                    <p className="text-sm font-medium text-slate-700">{culture.viability ? `${culture.viability}%` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Посуда</p>
                    <p className="text-sm font-medium text-slate-700">{culture.containerType} × {culture.containerCount || 1}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Конфлюэнтность</p>
                    <p className="text-sm font-medium text-slate-700">{culture.currentConfluency ? `${culture.currentConfluency}%` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Стерильность</p>
                    <p className={`text-sm font-medium ${culture.isSterile === false ? 'text-red-600' : 'text-green-600'}`}>
                      {culture.isSterile === false ? '⚠️ Контаминация' : '✓ Стерильно'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Создана</p>
                    <p className="text-sm font-medium text-slate-700">{formatDateTime(culture.createdAt)}</p>
                  </div>
                </div>

                {/* Active Tasks - синхронизация с разделом Задачи */}
                {cultureTasks.length > 0 && (
                  <div className="mb-4 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs font-medium text-yellow-800 mb-2">📋 Активные задачи:</p>
                    <div className="space-y-1">
                      {cultureTasks.slice(0, 3).map(t => (
                        <div key={t.id} className="text-xs flex items-center justify-between">
                          <span className="text-yellow-700">{t.title.replace(`культуры ${culture.id}`, '').trim()}</span>
                          <span className={`${new Date(t.dueDate) < new Date() ? 'text-red-600' : 'text-yellow-600'}`}>
                            {new Date(t.dueDate).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Manipulations */}
                {cultureManips.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2">Последние манипуляции:</p>
                    <div className="space-y-1">
                      {cultureManips.slice(0, 3).map(m => (
                        <div key={m.id} className="text-xs flex items-center justify-between text-slate-600">
                          <span>{manipulationTypeLabels[m.type]}</span>
                          <span>{formatDateTime(m.dateTime)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                  <Button size="sm" variant="secondary" onClick={() => { setSelectedCulture(culture); setIsHistoryModalOpen(true); }}>
                    <History className="w-3 h-3" /> История
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setSelectedCulture(culture); setIsChartModalOpen(true); }}>
                    <BarChart3 className="w-3 h-3" /> График
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => printCultureLabel(culture, donor?.fullName || '')}>
                    <Printer className="w-3 h-3" /> Этикетка
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => {
                    const donation = safeDonations.find(d => d.id === culture.donationId) || { id: '', materialType: culture.cellType, dateTime: culture.createdAt } as any;
                    const parentCulture = safeCultures.find(c => c.id === culture.parentCultureId);
                    const cultureManipulations = manipulations.filter(m => m.targetId === culture.id);
                    generateCulturePassport(culture, donor!, donation, parentCulture, cultureManipulations);
                  }}>
                    <FileText className="w-3 h-3" /> Паспорт
                  </Button>
                {canEdit() && culture.status === 'in_work' && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenManipulation(culture, 'observation')}>
                      <Eye className="w-3 h-3" /> Наблюдение
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenManipulation(culture, 'feeding')}>
                      <Utensils className="w-3 h-3" /> Подкормка
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenManipulation(culture, 'passage')}>
                      <GitBranch className="w-3 h-3" /> Пассаж
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => handleOpenManipulation(culture, 'freezing')}>
                      <Snowflake className="w-3 h-3" /> Заморозка
                    </Button>
                    <Button size="sm" variant="success" onClick={() => handleOpenManipulation(culture, 'release')}>
                      <Package className="w-3 h-3" /> Выдача
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleOpenManipulation(culture, 'disposal')}>
                      <Trash2 className="w-3 h-3" /> Утилизация
                    </Button>
                  </>
                )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={FlaskConical}
            title="Культуры не найдены"
            description={searchQuery ? 'Попробуйте изменить параметры поиска' : 'Создайте культуру из обработанной донации'}
          />
        </Card>
      )}

      {/* Manipulation Modal */}
      <Modal
        isOpen={isManipModalOpen}
        onClose={() => { setIsManipModalOpen(false); setSelectedCulture(null); resetManipForm(); }}
        title={`${manipulationTypeLabels[manipType]} - ${selectedCulture?.id}`}
        size="md"
      >
        <form onSubmit={handleSubmitManipulation} className="space-y-4">
          {/* Observation fields */}
          {manipType === 'observation' && (
            <>
              <Select
                label="Инкубатор"
                value={manipFormData.incubatorId}
                onChange={(e) => setManipFormData({ ...manipFormData, incubatorId: e.target.value })}
                options={[
                  { value: '', label: 'Выберите инкубатор' },
                  ...incubators.map(eq => ({ value: eq.id, label: `${eq.name} (${eq.id})` }))
                ]}
              />
              
              <Select
                label="Тип наблюдения"
                value={manipFormData.observationType}
                onChange={(e) => setManipFormData({ ...manipFormData, observationType: e.target.value as 'all' | 'individual' })}
                options={[
                  { value: 'all', label: 'Для всей посуды сразу' },
                  { value: 'individual', label: 'Индивидуально по каждой посуде' }
                ]}
              />
              
              {manipFormData.observationType === 'all' ? (
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">Параметры для всей культуры ({manipFormData.containerObservations.length} ед. посуды)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Конфлюентность (%)" type="number" value={manipFormData.confluence} 
                      onChange={(e) => setManipFormData({ ...manipFormData, confluence: e.target.value })} placeholder="0-100" />
                    <Select label="Морфология" value={manipFormData.morphology as string}
                      onChange={(e) => setManipFormData({ ...manipFormData, morphology: e.target.value as MorphologyType })}
                      options={[
                        { value: 'typical', label: 'Типичная' },
                        { value: 'atypical', label: 'Атипичная' },
                        { value: 'differentiating', label: 'С признаками дифференцировки' }
                      ]} />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={manipFormData.hasCells} onChange={(e) => setManipFormData({ ...manipFormData, hasCells: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">Клетки присутствуют</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={manipFormData.hasBacteria} onChange={(e) => setManipFormData({ ...manipFormData, hasBacteria: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm text-red-600">Признаки бактерий</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={manipFormData.hasFungi} onChange={(e) => setManipFormData({ ...manipFormData, hasFungi: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm text-red-600">Признаки грибов</span>
                    </label>
                  </div>
                  {(manipFormData.hasBacteria || manipFormData.hasFungi) && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700 font-medium mb-2">⚠️ Обнаружена контаминация!</p>
                      <Select label="Действие" value={manipFormData.containerAction}
                        onChange={(e) => setManipFormData({ ...manipFormData, containerAction: e.target.value as 'none' | 'dispose' | 'bacteriology' })}
                        options={[
                          { value: 'none', label: 'Продолжить наблюдение' },
                          { value: 'dispose', label: 'Отправить в утилизацию' },
                          { value: 'bacteriology', label: 'На бак. исследование → утилизация' }
                        ]} />
                    </div>
                  )}
                  
                  {/* Прикрепление фотографий */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-2">📷 Фотографии с микроскопа</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const urls = files.map(f => URL.createObjectURL(f));
                        setManipFormData({ ...manipFormData, photos: [...manipFormData.photos, ...urls] });
                      }}
                      className="text-sm"
                    />
                    {manipFormData.photos.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {manipFormData.photos.map((url, i) => (
                          <div key={i} className="relative">
                            <img src={url} alt={`Фото ${i+1}`} className="w-16 h-16 object-cover rounded" />
                            <button type="button" onClick={() => setManipFormData({ ...manipFormData, photos: manipFormData.photos.filter((_, idx) => idx !== i) })} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {manipFormData.containerObservations.map((obs, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${obs.hasBacteria || obs.hasFungi ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">#{idx + 1}: {obs.containerType}</span>
                        {(obs.hasBacteria || obs.hasFungi) && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <Input label="Конфл.%" type="number" value={obs.confluency.toString()}
                          onChange={(e) => {
                            const updated = [...manipFormData.containerObservations];
                            updated[idx] = { ...updated[idx], confluency: parseInt(e.target.value) || 0 };
                            setManipFormData({ ...manipFormData, containerObservations: updated });
                          }} />
                        <Select label="Морфология" value={obs.morphology}
                          onChange={(e) => {
                            const updated = [...manipFormData.containerObservations];
                            updated[idx] = { ...updated[idx], morphology: e.target.value as MorphologyType };
                            setManipFormData({ ...manipFormData, containerObservations: updated });
                          }}
                          options={[
                            { value: 'typical', label: 'Типичная' },
                            { value: 'atypical', label: 'Атипичная' },
                            { value: 'differentiating', label: 'Диффер.' }
                          ]} />
                        <Select label="Действие" value={obs.action || 'none'}
                          onChange={(e) => {
                            const updated = [...manipFormData.containerObservations];
                            updated[idx] = { ...updated[idx], action: e.target.value as 'none' | 'dispose' | 'bacteriology' };
                            setManipFormData({ ...manipFormData, containerObservations: updated });
                          }}
                          options={[
                            { value: 'none', label: 'Ок' },
                            { value: 'dispose', label: 'Утиль' },
                            { value: 'bacteriology', label: 'Бак.иссл.' }
                          ]} />
                      </div>
                      <div className="flex gap-3 mt-2">
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={obs.hasCells} onChange={(e) => {
                            const updated = [...manipFormData.containerObservations];
                            updated[idx] = { ...updated[idx], hasCells: e.target.checked };
                            setManipFormData({ ...manipFormData, containerObservations: updated });
                          }} className="w-3 h-3" />
                          <span>Клетки</span>
                        </label>
                        <label className="flex items-center gap-1 text-xs text-red-600">
                          <input type="checkbox" checked={obs.hasBacteria} onChange={(e) => {
                            const updated = [...manipFormData.containerObservations];
                            updated[idx] = { ...updated[idx], hasBacteria: e.target.checked };
                            setManipFormData({ ...manipFormData, containerObservations: updated });
                          }} className="w-3 h-3" />
                          <span>Бактерии</span>
                        </label>
                        <label className="flex items-center gap-1 text-xs text-red-600">
                          <input type="checkbox" checked={obs.hasFungi} onChange={(e) => {
                            const updated = [...manipFormData.containerObservations];
                            updated[idx] = { ...updated[idx], hasFungi: e.target.checked };
                            setManipFormData({ ...manipFormData, containerObservations: updated });
                          }} className="w-3 h-3" />
                          <span>Грибы</span>
                        </label>
                      </div>
                    </div>
                  ))}
                  
                  {/* Прикрепление фотографий для индивидуального наблюдения */}
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-2">📷 Фотографии с микроскопа</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const urls = files.map(f => URL.createObjectURL(f));
                        setManipFormData({ ...manipFormData, photos: [...manipFormData.photos, ...urls] });
                      }}
                      className="text-sm"
                    />
                    {manipFormData.photos.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {manipFormData.photos.map((url, i) => (
                          <div key={i} className="relative">
                            <img src={url} alt={`Фото ${i+1}`} className="w-16 h-16 object-cover rounded" />
                            <button type="button" onClick={() => setManipFormData({ ...manipFormData, photos: manipFormData.photos.filter((_, idx) => idx !== i) })} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Feeding fields */}
          {manipType === 'feeding' && (
            <>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={manipFormData.feedingType === 'all'}
                    onChange={() => setManipFormData({ ...manipFormData, feedingType: 'all' })}
                  />
                  <span className="text-sm">Для всей культуры</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={manipFormData.feedingType === 'individual'}
                    onChange={() => setManipFormData({ ...manipFormData, feedingType: 'individual' })}
                  />
                  <span className="text-sm">По каждому контейнеру</span>
                </label>
              </div>
              
              {manipFormData.feedingType === 'all' ? (
                <>
                  <Select
                    label="Среда из справочника *"
                    value={manipFormData.mediaId}
                    onChange={(e) => setManipFormData({ ...manipFormData, mediaId: e.target.value })}
                    options={[
                      { value: '', label: 'Выберите среду' },
                      ...approvedMedia.map(m => ({ 
                        value: m.id, 
                        label: `${m.name} (${m.lotNumber}) - остаток: ${(m.remaining_volume || 0)} ${m.unit}` 
                      }))
                    ]}
                    required
                  />
                  {manipFormData.mediaId && (
                    <div className="p-2 bg-blue-50 rounded text-sm text-blue-700">
                      {(() => {
                        const selected = safeMedia.find(m => m.id === manipFormData.mediaId);
                        return selected ? `Годен до: ${new Date(selected.expiryDate).toLocaleDateString('ru-RU')}` : '';
                      })()}
                    </div>
                  )}
                  <Input
                    label="Объём (мл) *"
                    type="number"
                    value={manipFormData.volume}
                    onChange={(e) => setManipFormData({ ...manipFormData, volume: e.target.value })}
                    placeholder="напр. 15"
                    required
                  />
                </>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {manipFormData.feedingContainers.map((fc, idx) => (
                    <div key={fc.containerId} className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm font-medium text-slate-700 mb-2">
                        #{idx + 1} {fc.containerType}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          label="Среда"
                          value={fc.mediaId}
                          onChange={(e) => {
                            const updated = [...manipFormData.feedingContainers];
                            updated[idx].mediaId = e.target.value;
                            setManipFormData({ ...manipFormData, feedingContainers: updated });
                          }}
                          options={[
                            { value: '', label: 'Выбрать' },
                            ...approvedMedia.map(m => ({ value: m.id, label: `${m.name} (${(m.remaining_volume || 0)} ${m.unit})` }))
                          ]}
                        />
                        <Input
                          label="Объём (мл)"
                          type="number"
                          value={fc.volume}
                          onChange={(e) => {
                            const updated = [...manipFormData.feedingContainers];
                            updated[idx].volume = e.target.value;
                            setManipFormData({ ...manipFormData, feedingContainers: updated });
                          }}
                          placeholder="мл"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {approvedMedia.length === 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                  Нет доступных сред. Добавьте среды в раздел "Среды" и одобрите их.
                </div>
              )}
            </>
          )}

          {/* Passage fields */}
          {manipType === 'passage' && (
            <>
              <Select
                label="Тип пассажа"
                value={manipFormData.passageType}
                onChange={(e) => setManipFormData({ ...manipFormData, passageType: e.target.value as 'full' | 'partial' })}
                options={[
                  { value: 'full', label: 'Полный (все клетки → культура получает P+1)' },
                  { value: 'partial', label: 'Частичный (часть посуды → создаётся новая культура P+1)' }
                ]}
              />
              <div className={`p-3 rounded-lg text-sm ${manipFormData.passageType === 'full' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                {manipFormData.passageType === 'full' 
                  ? `Культура ${selectedCulture?.id} будет обновлена: P${selectedCulture?.passageNumber} → P${(selectedCulture?.passageNumber || 0) + 1}`
                  : `Будет создана новая культура P${(selectedCulture?.passageNumber || 0) + 1}. Исходная ${selectedCulture?.id} сохранит оставшуюся посуду.`
                }
              </div>
              
              {/* Выбор контейнеров для частичного пассажа */}
              {manipFormData.passageType === 'partial' && manipFormData.containerObservations.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2">Выберите посуду для пассажа:</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {manipFormData.containerObservations.map((obs, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-sm">
                        <input 
                          type="checkbox" 
                          checked={manipFormData.selectedContainers.includes(idx)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setManipFormData(prev => ({ ...prev, selectedContainers: [...prev.selectedContainers, idx] }));
                            } else {
                              setManipFormData(prev => ({ ...prev, selectedContainers: prev.selectedContainers.filter(i => i !== idx) }));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span>#{idx + 1}: {obs.containerType}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Выбрано: {manipFormData.selectedContainers.length} из {manipFormData.containerObservations.length}
                  </p>
                  
                  {/* Пункт 4: Выбор культуры для мастер-банка */}
                  {!hasMasterBankForDonation(selectedCulture?.donationId || '') && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-800 mb-2">🧬 Выбор для мастер-банка</p>
                      <p className="text-xs text-blue-600 mb-2">Какая культура будет использована для создания мастер-банка?</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="forMasterBank" 
                            checked={manipFormData.forMasterBank === 'new'}
                            onChange={() => setManipFormData(prev => ({ ...prev, forMasterBank: 'new' }))}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm text-slate-700">
                            <strong>Новая культура</strong> (P{(selectedCulture?.passageNumber || 0) + 1}) — для мастер-банка
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="forMasterBank" 
                            checked={manipFormData.forMasterBank === 'original'}
                            onChange={() => setManipFormData(prev => ({ ...prev, forMasterBank: 'original' }))}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm text-slate-700">
                            <strong>Исходная культура</strong> ({selectedCulture?.id}) — для мастер-банка
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <Input
                label="Количество клеток (после подсчёта)"
                type="number"
                value={manipFormData.cellCount}
                onChange={(e) => setManipFormData({ ...manipFormData, cellCount: e.target.value })}
                placeholder="напр. 5000000"
                required
              />
              <Input
                label="Жизнеспособность (%)"
                type="number"
                value={manipFormData.viability}
                onChange={(e) => setManipFormData({ ...manipFormData, viability: e.target.value })}
                placeholder="напр. 95"
              />
              {/* Посуда и среды для пассажа */}
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700">Посуда и среды для рассева</p>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setManipFormData(prev => ({ 
                    ...prev, 
                    passageContainers: [...prev.passageContainers, { type: 'Флакон T75', count: 1, mediaId: '', volume: '' }] 
                  }))}>
                    + Добавить
                  </Button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {manipFormData.passageContainers.map((pc, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Select
                          className="flex-1"
                          value={pc.type}
                          onChange={(e) => {
                            const updated = [...manipFormData.passageContainers];
                            updated[idx] = { ...updated[idx], type: e.target.value };
                            setManipFormData({ ...manipFormData, passageContainers: updated });
                          }}
                          options={containerTypes.filter(c => c.is_active).map(c => ({ value: c.name, label: c.name }))}
                        />
                        <Input
                          className="w-20"
                          type="number"
                          min="1"
                          value={pc.count}
                          onChange={(e) => {
                            const updated = [...manipFormData.passageContainers];
                            updated[idx] = { ...updated[idx], count: parseInt(e.target.value) || 1 };
                            setManipFormData({ ...manipFormData, passageContainers: updated });
                          }}
                          placeholder="Кол."
                        />
                        {manipFormData.passageContainers.length > 1 && (
                          <button type="button" onClick={() => setManipFormData(prev => ({ 
                            ...prev, 
                            passageContainers: prev.passageContainers.filter((_, i) => i !== idx) 
                          }))} className="p-1 text-red-500 hover:bg-red-50 rounded">×</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={pc.mediaId}
                          onChange={(e) => {
                            const updated = [...manipFormData.passageContainers];
                            updated[idx] = { ...updated[idx], mediaId: e.target.value };
                            setManipFormData({ ...manipFormData, passageContainers: updated });
                          }}
                          options={[
                            { value: '', label: 'Выберите среду' },
                            ...approvedMedia.map(m => ({ value: m.id, label: `${m.name} (${(m.remaining_volume || 0)} ${m.unit})` }))
                          ]}
                        />
                        <Input
                          type="number"
                          step="0.1"
                          value={pc.volume}
                          onChange={(e) => {
                            const updated = [...manipFormData.passageContainers];
                            updated[idx] = { ...updated[idx], volume: e.target.value };
                            setManipFormData({ ...manipFormData, passageContainers: updated });
                          }}
                          placeholder="Объём (мл)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Итого: {manipFormData.passageContainers.reduce((sum, c) => sum + c.count, 0)} ед. посуды
                </p>
                {manipFormData.cellCount && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                    <p><strong>Расчёт плотности:</strong></p>
                    <p>≈ {calculatePassageCellDensity().cellsPerContainer.toLocaleString()} клеток на 1 ед. посуды</p>
                    <p>≈ {calculatePassageCellDensity().cellsPerCm2.toLocaleString()} клеток/см²</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Freezing fields */}
          {manipType === 'freezing' && (
            <>
              <div className={`p-3 rounded-lg text-sm ${selectedCulture && !hasMasterBankForDonation(selectedCulture.donationId) ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                {selectedCulture && !hasMasterBankForDonation(selectedCulture.donationId)
                  ? `⭐ Первая заморозка от донации (P${selectedCulture?.passageNumber}) → будет создан МАСТЕР-БАНК`
                  : `Рабочая культура (P${selectedCulture?.passageNumber}) → будет добавлена в ХРАНИЛИЩЕ`
                }
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Количество клеток *"
                  type="number"
                  value={manipFormData.cellCount}
                  onChange={(e) => setManipFormData({ ...manipFormData, cellCount: e.target.value })}
                  placeholder="напр. 10000000"
                  required
                />
                <Input
                  label="Жизнеспособность (%) *"
                  type="number"
                  value={manipFormData.viability}
                  onChange={(e) => setManipFormData({ ...manipFormData, viability: e.target.value })}
                  placeholder="напр. 92"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Select
                  label="Тип криопробирки"
                  value={manipFormData.freezeTubeType}
                  onChange={(e) => {
                    const selected = containerTypes.find(c => c.name === e.target.value);
                    setManipFormData({ 
                      ...manipFormData, 
                      freezeTubeType: e.target.value,
                      freezeTubeVolume: selected?.volume_recommended?.toString() || manipFormData.freezeTubeVolume
                    });
                  }}
                  options={[
                    { value: '', label: 'Выберите криопробирку' },
                    ...containerTypes.filter(c => c.is_active && c.category === 'cryotube').map(c => ({ value: c.name, label: c.name }))
                  ]}
                />
                <Input
                  label="Кол-во криопробирок"
                  type="number"
                  value={manipFormData.tubeCount}
                  onChange={(e) => setManipFormData({ ...manipFormData, tubeCount: e.target.value })}
                />
                <Input
                  label="Объём на пробирку (мл)"
                  type="number"
                  step="0.1"
                  value={manipFormData.freezeTubeVolume}
                  onChange={(e) => setManipFormData({ ...manipFormData, freezeTubeVolume: e.target.value })}
                />
              </div>
              
              {/* Расчёт клеток */}
              {manipFormData.cellCount && manipFormData.tubeCount && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2">📊 Расчёт:</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Клеток на пробирку:</span>
                      <span className="ml-2 font-medium">{(parseInt(manipFormData.cellCount) / parseInt(manipFormData.tubeCount)).toLocaleString('ru-RU')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Клеток на 1 мл:</span>
                      <span className="ml-2 font-medium">
                        {((parseInt(manipFormData.cellCount) / parseInt(manipFormData.tubeCount)) / (parseFloat(manipFormData.freezeTubeVolume) || 1)).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Криопротектор"
                  value={manipFormData.cryoprotectant}
                  onChange={(e) => setManipFormData({ ...manipFormData, cryoprotectant: e.target.value })}
                />
                <Input
                  label="Протокол заморозки"
                  value={manipFormData.freezeProtocol}
                  onChange={(e) => setManipFormData({ ...manipFormData, freezeProtocol: e.target.value })}
                />
              </div>
              <div className="border-t pt-4 mt-2">
                  <p className="text-sm font-medium text-slate-700 mb-3">Место хранения {selectedCulture?.passageNumber === 0 ? '(Мастер-банк)' : ''}:</p>
                  <Select
                    label="Криохранилище"
                    value={manipFormData.storageEquipment}
                    onChange={(e) => setManipFormData({ ...manipFormData, storageEquipment: e.target.value })}
                    options={[
                      { value: '', label: 'Выберите криохранилище' },
                      ...cryoStorages.map(eq => ({ value: eq.id, label: `${eq.name} (${eq.location})` }))
                    ]}
                  />
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <Input label="Полка" value={manipFormData.storageShelf} onChange={(e) => setManipFormData({ ...manipFormData, storageShelf: e.target.value })} />
                    <Input label="Штатив" value={manipFormData.storageRack} onChange={(e) => setManipFormData({ ...manipFormData, storageRack: e.target.value })} />
                    <Input label="Коробка" value={manipFormData.storageBox} onChange={(e) => setManipFormData({ ...manipFormData, storageBox: e.target.value })} />
                    <Input label="Позиция" value={manipFormData.storagePosition} onChange={(e) => setManipFormData({ ...manipFormData, storagePosition: e.target.value })} />
                  </div>
                </div>
            </>
          )}

          {/* Disposal fields */}
          {manipType === 'disposal' && (
            <>
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                ⚠️ Внимание! Утилизация необратима.
              </div>
              
              <Select
                label="Причина утилизации *"
                value={manipFormData.disposalReason}
                onChange={(e) => setManipFormData({ ...manipFormData, disposalReason: e.target.value as any })}
                options={[
                  { value: 'contamination', label: 'Контаминация' },
                  { value: 'expired', label: 'Истёк срок годности' },
                  { value: 'quality_failure', label: 'Не прошёл контроль качества' },
                  { value: 'no_demand', label: 'Нет востребованности' },
                  { value: 'damage', label: 'Повреждение' },
                  { value: 'other', label: 'Другое' }
                ]}
              />
              {manipFormData.disposalReason === 'other' && (
                <Input
                  label="Укажите причину"
                  value={manipFormData.disposalReasonDetails}
                  onChange={(e) => setManipFormData({ ...manipFormData, disposalReasonDetails: e.target.value })}
                  placeholder="Подробности причины утилизации"
                  required
                />
              )}
              
              <Select
                label="Тип утилизации"
                value={manipFormData.observationType}
                onChange={(e) => setManipFormData({ ...manipFormData, observationType: e.target.value as 'all' | 'individual' })}
                options={[
                  { value: 'all', label: 'Вся культура целиком' },
                  { value: 'individual', label: 'Только выбранные чашки' }
                ]}
              />
              
              {manipFormData.observationType === 'individual' && (
                <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2">Выберите чашки для утилизации:</p>
                  {manipFormData.containerObservations.map((obs, idx) => (
                    <label key={idx} className={`flex items-center gap-3 p-2 rounded cursor-pointer ${manipFormData.selectedContainers.includes(idx) ? 'bg-red-100 border border-red-300' : 'bg-white border border-slate-200'}`}>
                      <input
                        type="checkbox"
                        checked={manipFormData.selectedContainers.includes(idx)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setManipFormData({ ...manipFormData, selectedContainers: [...manipFormData.selectedContainers, idx] });
                          } else {
                            setManipFormData({ ...manipFormData, selectedContainers: manipFormData.selectedContainers.filter(i => i !== idx) });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">#{idx + 1}: {obs.containerType}</span>
                      {manipFormData.selectedContainers.includes(idx) && <Trash2 className="w-4 h-4 text-red-500 ml-auto" />}
                    </label>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setManipFormData({ ...manipFormData, selectedContainers: manipFormData.containerObservations.map((_, i) => i) })}>
                      Выбрать все
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setManipFormData({ ...manipFormData, selectedContainers: [] })}>
                      Снять выделение
                    </Button>
                  </div>
                  {manipFormData.selectedContainers.length > 0 && (
                    <p className="text-sm text-red-600 mt-2">
                      Будет утилизировано: {manipFormData.selectedContainers.length} из {manipFormData.containerObservations.length} чашек
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Release fields */}
          {manipType === 'release' && (
            <>
              <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                {manipFormData.releaseType === 'full' 
                  ? 'Вся культура будет выдана получателю и переведена в статус "Выдан".'
                  : `Будет выдано ${manipFormData.releaseContainerCount} контейнер(ов). Оставшиеся останутся в работе.`}
              </div>
              
              {/* Тип выдачи */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="releaseType" 
                    checked={manipFormData.releaseType === 'full'}
                    onChange={() => setManipFormData({ ...manipFormData, releaseType: 'full' })}
                    className="w-4 h-4"
                  />
                  <span>Полная выдача</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="releaseType" 
                    checked={manipFormData.releaseType === 'partial'}
                    onChange={() => setManipFormData({ ...manipFormData, releaseType: 'partial' })}
                    className="w-4 h-4"
                  />
                  <span>Частичная выдача</span>
                </label>
              </div>
              
              {manipFormData.releaseType === 'partial' && selectedCulture && (
                <Input
                  label={`Количество контейнеров для выдачи (доступно: ${selectedCulture.containerCount || 1})`}
                  type="number"
                  min="1"
                  max={selectedCulture.containerCount || 1}
                  value={manipFormData.releaseContainerCount}
                  onChange={(e) => setManipFormData({ ...manipFormData, releaseContainerCount: e.target.value })}
                />
              )}
              
              <Select
                label="Цель выдачи *"
                value={manipFormData.releaseApplicationType}
                onChange={(e) => setManipFormData({ ...manipFormData, releaseApplicationType: e.target.value as 'clinical' | 'research' | 'scientific' })}
                options={[
                  { value: 'clinical', label: 'Клиническое применение' },
                  { value: 'research', label: 'Исследование' },
                  { value: 'scientific', label: 'Научная работа' }
                ]}
              />
              <Input
                label="ФИО получателя *"
                value={manipFormData.releaseRecipientName}
                onChange={(e) => setManipFormData({ ...manipFormData, releaseRecipientName: e.target.value })}
                placeholder="Иванов Иван Иванович"
                required
              />
              <Input
                label="Организация"
                value={manipFormData.releaseRecipientOrg}
                onChange={(e) => setManipFormData({ ...manipFormData, releaseRecipientOrg: e.target.value })}
                placeholder="Клиника / НИИ"
              />
              <Input
                label="Контакт получателя"
                value={manipFormData.releaseRecipientContact}
                onChange={(e) => setManipFormData({ ...manipFormData, releaseRecipientContact: e.target.value })}
                placeholder="Телефон или email"
              />
            </>
          )}

          {/* DateTime field */}
          <Input
            label="Дата и время манипуляции"
            type="datetime-local"
            value={manipFormData.dateTime}
            onChange={(e) => setManipFormData({ ...manipFormData, dateTime: e.target.value })}
          />

          {/* Common notes field */}
          <Textarea
            label="Примечания"
            value={manipFormData.notes}
            onChange={(e) => setManipFormData({ ...manipFormData, notes: e.target.value })}
            placeholder="Дополнительные заметки..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => { setIsManipModalOpen(false); setSelectedCulture(null); resetManipForm(); }}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              variant={manipType === 'disposal' ? 'danger' : manipType === 'release' ? 'success' : 'primary'}
            >
              {manipulationTypeLabels[manipType]}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Chart Modal */}
      <Modal
        isOpen={isChartModalOpen}
        onClose={() => { setIsChartModalOpen(false); setSelectedCulture(null); }}
        title={`Аналитика роста - ${selectedCulture?.id || ''}`}
        size="lg"
      >
        {selectedCulture && (
          <div className="space-y-6">
            {/* Показатели культуры */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedCulture.totalDoublings?.toFixed(1) || '—'}
                </div>
                <div className="text-xs text-slate-500">Удвоений всего</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">
                  {selectedCulture.growthRate?.toFixed(2) || '—'}
                </div>
                <div className="text-xs text-slate-500">Удвоений/день</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {selectedCulture.currentConfluency || '—'}%
                </div>
                <div className="text-xs text-slate-500">Конфлюэнтность</div>
              </div>
            </div>

            {/* График конфлюэнтности */}
            <div>
              <h4 className="font-medium text-slate-700 mb-2">Динамика конфлюэнтности</h4>
              <ConfluencyChart 
                culture={selectedCulture} 
                manipulations={manipulations}
                height={180}
              />
            </div>
            
            {/* График жизнеспособности */}
            <div>
              <h4 className="font-medium text-slate-700 mb-2">Динамика жизнеспособности</h4>
              <ViabilityChart 
                culture={selectedCulture} 
                manipulations={manipulations}
                height={180}
              />
            </div>

            {/* Оригинальный график роста */}
            <div>
              <h4 className="font-medium text-slate-700 mb-2">Кривая роста</h4>
              <CultureGrowthChart 
                manipulations={manipulations} 
                cultureId={selectedCulture.id}
                cultures={cultures}
              />
            </div>
          </div>
        )}
        <div className="flex justify-end pt-4 mt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => { setIsChartModalOpen(false); setSelectedCulture(null); }}>
            Закрыть
          </Button>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => { setIsHistoryModalOpen(false); setSelectedCulture(null); }}
        title={`История манипуляций - ${selectedCulture?.id || ''}`}
        size="lg"
      >
        {selectedCulture && (() => {
          // Собираем полную цепочку родительских культур
          const getCultureLineage = (cultureId: string): Culture[] => {
            const culture = safeCultures.find(c => c.id === cultureId);
            if (!culture) return [];
            if (culture.parentCultureId) {
              return [...getCultureLineage(culture.parentCultureId), culture];
            }
            return [culture];
          };
          const lineage = getCultureLineage(selectedCulture.id);
          
          // Собираем манипуляции для всей линии
          const getAllLineageManipulations = () => {
            return lineage.flatMap(c => 
              getCultureManipulations(c.id).map(m => ({ ...m, fromCultureId: c.id }))
            ).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
          };
          const allManips = getAllLineageManipulations();
          
          return (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm"><strong>Тип клеток:</strong> {selectedCulture.cellType}</p>
              <p className="text-sm"><strong>Пассаж:</strong> P{selectedCulture.passageNumber}</p>
              <p className="text-sm"><strong>Создана:</strong> {formatDateTime(selectedCulture.createdAt)}</p>
              {lineage.length > 1 && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Линия культуры:</p>
                  <p className="text-xs font-mono">{lineage.map(c => `${c.id} (P${c.passageNumber})`).join(' → ')}</p>
                </div>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {allManips.length > 0 ? (() => {
                // Группируем манипуляции по типу
                const grouped = allManips.reduce((acc, m) => {
                  const type = m.type;
                  if (!acc[type]) acc[type] = [];
                  acc[type].push(m);
                  return acc;
                }, {} as Record<string, typeof allManips>);
                
                const typeOrder: ManipulationType[] = ['observation', 'feeding', 'passage', 'freezing', 'thawing', 'disposal', 'release'];
                const sortedTypes = Object.keys(grouped).sort((a, b) => 
                  typeOrder.indexOf(a as ManipulationType) - typeOrder.indexOf(b as ManipulationType)
                );
                
                return sortedTypes.map(type => (
                  <details key={type} className="border rounded-lg overflow-hidden" open={grouped[type].length <= 3}>
                    <summary className="px-3 py-2 bg-slate-100 cursor-pointer hover:bg-slate-200 flex items-center justify-between">
                      <span className="font-medium text-slate-700">{manipulationTypeLabels[type as ManipulationType]}</span>
                      <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded">{grouped[type].length}</span>
                    </summary>
                    <div className="p-2 space-y-2">
                      {grouped[type].map(m => (
                        <div key={m.id} className={`p-2 border rounded ${(m as any).fromCultureId !== selectedCulture.id ? 'bg-slate-50 border-slate-300' : 'bg-white'}`}>
                          {(m as any).fromCultureId !== selectedCulture.id && (
                            <p className="text-xs text-slate-400 mb-1">← от {(m as any).fromCultureId}</p>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">{formatDateTime(m.dateTime)}</span>
                          </div>
                          {m.notes && <p className="text-xs text-slate-500 mt-1">{m.notes}</p>}
                          {m.parameters && (
                            <div className="text-xs text-slate-500 mt-1">
                              {m.type === 'observation' && (
                                <>
                                  {m.parameters.observationType === 'all' ? (
                                    <span>
                                      {!!m.parameters.confluence && `Конф: ${String(m.parameters.confluence)}% `}
                                      {!!m.parameters.morphology && `Морф: ${String(m.parameters.morphology)} `}
                                      {!!m.parameters.hasBacteria && <span className="text-red-600">🦠 </span>}
                                      {!!m.parameters.hasFungi && <span className="text-red-600">🍄 </span>}
                                    </span>
                                  ) : (
                                    <span>{(m.parameters.containerObservations as ContainerObservation[] | undefined)?.length || 0} контейнеров</span>
                                  )}
                                </>
                              )}
                              {m.type === 'feeding' && !!m.parameters.volume && <span>Объём: {String(m.parameters.volume)} мл</span>}
                              {m.type === 'passage' && (
                                <span>
                                  {m.parameters.cellCount ? `${Number(m.parameters.cellCount).toLocaleString()} кл. ` : ''}
                                  {m.parameters.viability ? `${Number(m.parameters.viability)}% ` : ''}
                                </span>
                              )}
                              {m.type === 'freezing' && (
                                <span>
                                  {m.parameters.cellCount ? `${Number(m.parameters.cellCount).toLocaleString()} кл. ` : ''}
                                  {m.parameters.viability ? `${Number(m.parameters.viability)}% ` : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ));
              })() : (
                <p className="text-center text-slate-500 py-8">Манипуляции не зафиксированы</p>
              )}
            </div>
          </div>
        );})()}
        <div className="flex justify-end pt-4 mt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => { setIsHistoryModalOpen(false); setSelectedCulture(null); }}>
            Закрыть
          </Button>
        </div>
      </Modal>
    </div>
  );
};
