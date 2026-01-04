// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, FlaskConical, User, Database, Package, Beaker } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button, Card } from './UI';
import { Storage } from '../types';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ScannedObject {
  type: 'DONOR' | 'CULTURE' | 'MASTERBANK' | 'STORAGE' | 'MEDIA' | 'TUBE';
  id: string;
  data: any;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose }) => {
  const { donors, cultures, masterBanks, storages, media } = useApp();
  const [scanning, setScanning] = useState(true);
  const [scannedObject, setScannedObject] = useState<ScannedObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const parseQRCode = (text: string): ScannedObject | null => {
    const parts = text.split(':');
    if (parts.length < 2) return null;

    const type = parts[0] as ScannedObject['type'];
    const id = parts[1];

    switch (type) {
      case 'DONOR':
        const donor = donors.find(d => d.id === id);
        return donor ? { type, id, data: donor } : null;
      case 'CULTURE':
        const culture = cultures.find(c => c.id === id);
        return culture ? { type, id, data: culture } : null;
      case 'MASTERBANK':
        const mb = masterBanks.find(m => m.id === id);
        return mb ? { type, id, data: mb } : null;
      case 'STORAGE':
        const storage = storages.find((s: Storage) => s.id === id);
        return storage ? { type, id, data: storage } : null;
      case 'MEDIA':
        const med = media.find(m => m.id === id);
        return med ? { type, id, data: med } : null;
      case 'TUBE':
        const tubeStorage = storages.find((s: Storage) => s.id === id);
        return tubeStorage ? { type, id: `${id}:${parts[2]}`, data: { ...tubeStorage, tubeNumber: parts[2] } } : null;
      default:
        return null;
    }
  };

  const startScanner = async () => {
    if (!containerRef.current) return;
    
    try {
      scannerRef.current = new Html5Qrcode('qr-reader');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const obj = parseQRCode(decodedText);
          if (obj) {
            setScannedObject(obj);
            setScanning(false);
            scannerRef.current?.stop();
          } else {
            setError('Неизвестный QR-код');
          }
        },
        () => {}
      );
    } catch (err) {
      setError('Не удалось запустить камеру. Проверьте разрешения.');
    }
  };

  const stopScanner = () => {
    scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
  };

  useEffect(() => {
    if (isOpen && scanning) {
      startScanner();
    }
    return () => stopScanner();
  }, [isOpen, scanning]);

  const handleRescan = () => {
    setScannedObject(null);
    setError(null);
    setScanning(true);
  };

  if (!isOpen) return null;

  const renderObjectCard = () => {
    if (!scannedObject) return null;
    const { type, data } = scannedObject;

    const iconMap = {
      DONOR: <User className="w-8 h-8 text-blue-500" />,
      CULTURE: <FlaskConical className="w-8 h-8 text-green-500" />,
      MASTERBANK: <Database className="w-8 h-8 text-purple-500" />,
      STORAGE: <Package className="w-8 h-8 text-cyan-500" />,
      MEDIA: <Beaker className="w-8 h-8 text-orange-500" />,
      TUBE: <Package className="w-8 h-8 text-cyan-500" />
    };

    const typeLabels = {
      DONOR: 'Донор',
      CULTURE: 'Культура',
      MASTERBANK: 'Мастер-банк',
      STORAGE: 'Хранение',
      MEDIA: 'Среда',
      TUBE: 'Криопробирка'
    };

    return (
      <Card className="mt-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-100 rounded-xl">
            {iconMap[type]}
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-500 uppercase">{typeLabels[type]}</div>
            <div className="text-lg font-bold text-slate-800">{data.id}</div>
            
            {type === 'DONOR' && (
              <div className="mt-2 space-y-1 text-sm">
                <p><span className="text-slate-500">ФИО:</span> {data.lastName} {data.firstName}</p>
                <p><span className="text-slate-500">Статус:</span> {data.status}</p>
                <p><span className="text-slate-500">Группа крови:</span> {data.bloodType}</p>
              </div>
            )}
            
            {type === 'CULTURE' && (
              <div className="mt-2 space-y-1 text-sm">
                <p><span className="text-slate-500">Пассаж:</span> P{data.passageNumber}</p>
                <p><span className="text-slate-500">Конфлюентность:</span> {data.confluency}%</p>
                <p><span className="text-slate-500">Жизнеспособность:</span> {data.viability}%</p>
                <p><span className="text-slate-500">Статус:</span> {data.status}</p>
              </div>
            )}
            
            {type === 'MASTERBANK' && (
              <div className="mt-2 space-y-1 text-sm">
                <p><span className="text-slate-500">Пробирок:</span> {data.tubeCount}</p>
                <p><span className="text-slate-500">Клеток/пробирка:</span> {data.cellsPerTube?.toLocaleString()}</p>
                <p><span className="text-slate-500">Локация:</span> {data.storageLocation}</p>
              </div>
            )}
            
            {(type === 'STORAGE' || type === 'TUBE') && (
              <div className="mt-2 space-y-1 text-sm">
                {type === 'TUBE' && <p><span className="text-slate-500">Пробирка №:</span> {data.tubeNumber}</p>}
                <p><span className="text-slate-500">Тип:</span> {data.sampleType}</p>
                <p><span className="text-slate-500">Локация:</span> {data.location}</p>
                <p><span className="text-slate-500">Пробирок:</span> {data.tubeCount}</p>
              </div>
            )}
            
            {type === 'MEDIA' && (
              <div className="mt-2 space-y-1 text-sm">
                <p><span className="text-slate-500">Название:</span> {data.name}</p>
                <p><span className="text-slate-500">Остаток:</span> {data.currentVolume} {data.unit}</p>
                <p><span className="text-slate-500">Годен до:</span> {new Date(data.expiryDate).toLocaleDateString('ru')}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="w-5 h-5" />
          QR-сканер
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {scanning ? (
          <>
            <div 
              id="qr-reader" 
              ref={containerRef}
              className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black"
            />
            <p className="text-white/70 mt-4 text-center">
              Наведите камеру на QR-код
            </p>
          </>
        ) : (
          <div className="w-full max-w-sm bg-white rounded-2xl p-4">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-2">
                <FlaskConical className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Объект найден!</h3>
            </div>
            
            {renderObjectCard()}
            
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={handleRescan} className="flex-1">
                Сканировать ещё
              </Button>
              <Button onClick={onClose} className="flex-1">
                Закрыть
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg mt-4">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
