// @ts-nocheck
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Donor, Donation, Culture, MasterBank, Storage, Media, Equipment, EQUIPMENT_TYPE_LABELS, EQUIPMENT_STATUS_LABELS } from '../types';
import { robotoBase64 } from './roboto-font';

// Регистрация шрифта с поддержкой кириллицы
const registerFont = (doc: jsPDF) => {
  doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto');
};

// Генерация QR-кода как data URL
export const generateQRCode = async (text: string): Promise<string> => {
  return await QRCode.toDataURL(text, { width: 100, margin: 1 });
};

// PDF отчёт по донору
export const generateDonorReport = async (donor: Donor, donations: Donation[]): Promise<void> => {
  const doc = new jsPDF();
  registerFont(doc);
  const qr = await generateQRCode(`DONOR:${donor.id}`);
  
  doc.setFontSize(18);
  doc.text('Отчёт по донору', 105, 20, { align: 'center' });
  
  doc.addImage(qr, 'PNG', 160, 10, 30, 30);
  
  doc.setFontSize(12);
  doc.text(`ID: ${donor.id}`, 20, 50);
  doc.text(`ФИО: ${donor.full_name}`, 20, 58);
  doc.text(`Дата рождения: ${new Date(donor.birth_date).toLocaleDateString('ru-RU')}`, 20, 66);
  doc.text(`Пол: ${donor.gender === 'male' ? 'Мужской' : 'Женский'}`, 20, 74);
  doc.text(`Группа крови: ${donor.blood_type || 'Не указана'}`, 20, 82);
  doc.text(`Телефон: ${donor.phone}`, 20, 90);
  doc.text(`Email: ${donor.email}`, 20, 98);
  doc.text(`Статус: ${donor.status}`, 20, 106);
  
  if (donor.customerName) {
    doc.text('--- Заказчик ---', 20, 120);
    doc.text(`ФИО: ${donor.customerName}`, 20, 128);
    doc.text(`Телефон: ${donor.customerPhone || '-'}`, 20, 136);
  }
  
  if (donations.length > 0) {
    doc.text('--- Донации ---', 20, 150);
    let y = 158;
    donations.forEach((d, i) => {
      doc.text(`${i + 1}. ${d.id} - ${d.material_type} (${new Date(d.date_time).toLocaleDateString('ru-RU')})`, 25, y);
      y += 8;
    });
  }
  
  doc.save(`donor_${donor.id}_report.pdf`);
};

// PDF отчёт по мастер-банку (расширенный)
export const generateMasterBankReport = async (
  mb: MasterBank, 
  donor: Donor,
  donation: Donation,
  sourceCulture?: Culture
): Promise<void> => {
  const doc = new jsPDF();
  registerFont(doc);
  const qr = await generateQRCode(`MASTERBANK:${mb.id}`);
  
  doc.setFontSize(18);
  doc.text('ПАСПОРТ МАСТЕР-БАНКА', 105, 20, { align: 'center' });
  
  doc.addImage(qr, 'PNG', 160, 10, 30, 30);
  
  doc.setFontSize(12);
  let y = 50;
  doc.text(`ID мастер-банка: ${mb.id}`, 20, y); y += 8;
  doc.text(`Тип клеток: ${mb.cell_type}`, 20, y); y += 8;
  doc.text(`Дата заморозки: ${new Date(mb.created_at).toLocaleDateString('ru-RU')}`, 20, y); y += 12;
  
  doc.text('--- Характеристики при заморозке ---', 20, y); y += 8;
  doc.text(`Количество клеток: ${mb.cell_count_at_freeze.toLocaleString()}`, 20, y); y += 8;
  doc.text(`Жизнеспособность: ${mb.viability_at_freeze}%`, 20, y); y += 8;
  doc.text(`Количество пробирок: ${mb.tube_count}`, 20, y); y += 8;
  doc.text(`Клеток в пробирке: ${mb.cells_per_tube.toLocaleString()}`, 20, y); y += 8;
  const cellsPerMl = mb.cells_per_tube ? Math.round(mb.cells_per_tube / 1) : 0; // Предполагаем 1 мл объём
  doc.text(`Клеток на 1 мл: ~${cellsPerMl.toLocaleString()}`, 20, y); y += 8;
  doc.text(`Криопротектор: ${mb.cryoprotectant}`, 20, y); y += 8;
  doc.text(`Протокол заморозки: ${mb.freezeProtocol}`, 20, y); y += 12;
  
  doc.text('--- Качество и безопасность ---', 20, y); y += 8;
  doc.text(`Стерильность: ${mb.safety_test_results ? 'Проверено' : 'Не проверено'}`, 20, y); y += 8;
  if (sourceCulture) {
    doc.text(`PDL (удвоения популяции): ${sourceCulture.total_doublings?.toFixed(2) || 'N/A'}`, 20, y); y += 8;
    doc.text(`Скорость роста: ${sourceCulture.growth_rate?.toFixed(3) || 'N/A'} удв./день`, 20, y); y += 8;
    doc.text(`Морфология: ${sourceCulture.morphology || 'Типичная'}`, 20, y); y += 8;
  }
  if (mb.safety_test_results) {
    doc.text(`Результаты тестов: ${mb.safety_test_results.substring(0, 60)}`, 20, y); y += 8;
  }
  y += 4;
  
  doc.text('--- Донор ---', 20, y); y += 8;
  doc.text(`ID: ${donor.id}`, 20, y); y += 8;
  doc.text(`ФИО: ${donor.full_name}`, 20, y); y += 8;
  doc.text(`Дата рождения: ${new Date(donor.birth_date).toLocaleDateString('ru-RU')}`, 20, y); y += 8;
  doc.text(`Группа крови: ${donor.blood_type || 'Не указана'}`, 20, y); y += 12;
  
  doc.text('--- Донация ---', 20, y); y += 8;
  doc.text(`ID: ${donation.id}`, 20, y); y += 8;
  doc.text(`Материал: ${donation.material_type}`, 20, y); y += 8;
  doc.text(`Дата: ${new Date(donation.date_time).toLocaleDateString('ru-RU')}`, 20, y); y += 12;
  
  doc.text('--- Хранение ---', 20, y); y += 8;
  doc.text(`Статус: ${mb.status}`, 20, y); y += 8;
  doc.text(`Условия: ${mb.storage_conditions}`, 20, y);
  
  doc.setFontSize(8);
  doc.text(`Документ сформирован: ${new Date().toLocaleString('ru-RU')}`, 20, 280);
  
  doc.save(`masterbank_${mb.id}_passport.pdf`);
};

// Печать этикетки для культуры
export const printCultureLabel = async (culture: Culture, donorName: string): Promise<void> => {
  const doc = new jsPDF({ unit: 'mm', format: [50, 30] }); // 5x3 см
  registerFont(doc);
  const qr = await generateQRCode(`CULTURE:${culture.id}`);
  
  doc.addImage(qr, 'PNG', 2, 2, 12, 12);
  
  doc.setFontSize(7);
  doc.text(culture.id, 16, 5);
  doc.text(`P${culture.passage_number}`, 16, 9);
  doc.text(culture.cell_type.substring(0, 15), 16, 13);
  doc.setFontSize(5);
  doc.text(donorName.substring(0, 20), 16, 17);
  doc.text(new Date(culture.created_at).toLocaleDateString('ru-RU'), 16, 21);
  
  doc.save(`label_${culture.id}.pdf`);
};

// Печать этикетки для среды
export const printMediaLabel = async (media: Media): Promise<void> => {
  const doc = new jsPDF({ unit: 'mm', format: [50, 30] });
  registerFont(doc);
  const qr = await generateQRCode(`MEDIA:${media.id}`);
  
  doc.addImage(qr, 'PNG', 2, 2, 12, 12);
  
  doc.setFontSize(6);
  doc.text(media.id, 16, 5);
  doc.text(media.name.substring(0, 18), 16, 9);
  doc.text(`Лот: ${media.lot_number}`, 16, 13);
  doc.text(`Годен до: ${new Date(media.expiry_date).toLocaleDateString('ru-RU')}`, 16, 17);
  doc.text(`Ост.: ${media.remaining_volume} ${media.unit}`, 16, 21);
  
  doc.save(`label_media_${media.id}.pdf`);
};

// Печать этикетки криопробирки (расширенная)
export const printCryotubeLabel = async (
  storage: Storage | MasterBank, 
  tubeNumber: number,
  donorName: string,
  donorId?: string,
  donationId?: string,
  freezeDate?: string
): Promise<void> => {
  const doc = new jsPDF({ unit: 'mm', format: [50, 35] }); // криопробирка увеличенная
  registerFont(doc);
  const qr = await generateQRCode(`TUBE:${storage.id}:${tubeNumber}`);
  
  doc.addImage(qr, 'PNG', 2, 2, 12, 12);
  
  doc.setFontSize(5);
  doc.text(storage.id, 16, 4);
  doc.text(`#${tubeNumber}/${storage.tube_count}`, 16, 7);
  doc.text(storage.cell_type.substring(0, 15), 16, 10);
  doc.text(`${storage.cells_per_tube?.toLocaleString() || '?'} кл.`, 16, 13);
  doc.text(donorName.substring(0, 18), 2, 18);
  if (donorId) doc.text(`Донор: ${donorId.substring(0, 12)}`, 2, 21);
  if (donationId) doc.text(`Донация: ${donationId.substring(0, 12)}`, 2, 24);
  const dateStr = freezeDate ? new Date(freezeDate).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU');
  doc.text(`Заморозка: ${dateStr}`, 2, 27);
  
  doc.save(`label_tube_${storage.id}_${tubeNumber}.pdf`);
};

// Паспорт хранения
export const generateStoragePassport = async (
  storage: Storage,
  donor: Donor,
  sourceMasterBank?: MasterBank,
  sourceCulture?: Culture
): Promise<void> => {
  const doc = new jsPDF();
  registerFont(doc);
  const qr = await generateQRCode(`STORAGE:${storage.id}`);
  
  doc.setFontSize(18);
  doc.text('ПАСПОРТ КРИОХРАНЕНИЯ', 105, 20, { align: 'center' });
  
  doc.addImage(qr, 'PNG', 160, 10, 30, 30);
  
  doc.setFontSize(12);
  let y = 50;
  doc.text(`ID хранения: ${storage.id}`, 20, y); y += 8;
  doc.text(`Тип клеток: ${storage.cell_type}`, 20, y); y += 8;
  doc.text(`Дата помещения: ${new Date(storage.storage_date).toLocaleDateString('ru-RU')}`, 20, y); y += 12;
  
  doc.text('--- Характеристики ---', 20, y); y += 8;
  doc.text(`Количество пробирок: ${storage.tube_count}`, 20, y); y += 8;
  doc.text(`Клеток в пробирке: ${storage.cells_per_tube?.toLocaleString() || 'N/A'}`, 20, y); y += 8;
  const totalCells = (storage.tube_count || 0) * (storage.cells_per_tube || 0);
  doc.text(`Всего клеток: ${totalCells.toLocaleString()}`, 20, y); y += 8;
  doc.text(`Температура: ${storage.temperature}`, 20, y); y += 8;
  doc.text(`Фаза азота: ${storage.nitrogen_phase === 'liquid' ? 'Жидкая' : 'Паровая'}`, 20, y); y += 8;
  if (storage.expiry_date) {
    doc.text(`Срок годности: ${new Date(storage.expiry_date).toLocaleDateString('ru-RU')}`, 20, y); y += 8;
  }
  y += 4;
  
  doc.text('--- Расположение ---', 20, y); y += 8;
  doc.text(`Криохранилище: ${storage.location.equipment}`, 20, y); y += 8;
  doc.text(`Полка: ${storage.location.shelf}, Штатив: ${storage.location.rack}`, 20, y); y += 8;
  doc.text(`Коробка: ${storage.location.box}, Позиция: ${storage.location.position}`, 20, y); y += 12;
  
  doc.text('--- Донор ---', 20, y); y += 8;
  doc.text(`ID: ${donor.id}`, 20, y); y += 8;
  doc.text(`ФИО: ${donor.full_name}`, 20, y); y += 8;
  doc.text(`Группа крови: ${donor.blood_type || 'Не указана'}`, 20, y); y += 12;
  
  if (sourceMasterBank) {
    doc.text('--- Источник: Мастер-банк ---', 20, y); y += 8;
    doc.text(`ID: ${sourceMasterBank.id}`, 20, y); y += 8;
    doc.text(`Жизнеспособность при заморозке: ${sourceMasterBank.viability_at_freeze}%`, 20, y); y += 8;
  }
  
  if (sourceCulture) {
    doc.text('--- Источник: Культура ---', 20, y); y += 8;
    doc.text(`ID: ${sourceCulture.id}`, 20, y); y += 8;
    doc.text(`Пассаж: P${sourceCulture.passage_number}`, 20, y); y += 8;
  }
  
  doc.text(`Статус: ${storage.status}`, 20, 260);
  
  doc.setFontSize(8);
  doc.text(`Документ сформирован: ${new Date().toLocaleString('ru-RU')}`, 20, 280);
  
  doc.save(`storage_${storage.id}_passport.pdf`);
};

// Печать этикеток хранения (пакетная)
export const printStorageLabels = async (
  storage: Storage,
  donorName: string,
  donorId: string,
  donationId?: string
): Promise<void> => {
  for (let i = 1; i <= storage.tube_count; i++) {
    await printCryotubeLabel(storage, i, donorName, donorId, donationId, storage.storage_date);
  }
};

// PDF-отчёт по средам и реактивам
export const generateMediaReport = async (mediaList: Media[]): Promise<void> => {
  const doc = new jsPDF();
  registerFont(doc);
  
  const activeMedia = mediaList.filter(m => m.status === 'approved' || m.status === 'quarantine');
  const expiringSoon = activeMedia.filter(m => {
    const days = Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days > 0;
  });
  const lowStock = activeMedia.filter(m => m.remaining_volume <= (m.low_stock_threshold || 100) && m.remaining_volume > 0);
  const expired = activeMedia.filter(m => new Date(m.expiry_date) < new Date());
  
  doc.setFontSize(16);
  doc.text('ОТЧЁТ О СРЕДАХ И РЕАКТИВАХ', 105, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Дата формирования: ${new Date().toLocaleString('ru-RU')}`, 105, 22, { align: 'center' });
  
  // Сводка
  doc.setFontSize(12);
  doc.text('СВОДКА', 20, 35);
  doc.setFontSize(10);
  doc.text(`Всего активных позиций: ${activeMedia.length}`, 25, 43);
  doc.text(`Истекает срок (до 30 дней): ${expiringSoon.length}`, 25, 50);
  doc.text(`Просрочено: ${expired.length}`, 25, 57);
  doc.text(`Малый остаток: ${lowStock.length}`, 25, 64);
  
  let y = 80;
  
  // Раздел с истекающими сроками
  if (expiringSoon.length > 0 || expired.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(200, 50, 50);
    doc.text('ТРЕБУЮТ ВНИМАНИЯ', 20, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.setFontSize(9);
    
    [...expired, ...expiringSoon].forEach(m => {
      const days = Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const status = days < 0 ? 'ПРОСРОЧЕНО' : `${days} дн.`;
      doc.text(`• ${m.name} (${m.lot_number}) — ${status}`, 25, y);
      y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 5;
  }
  
  // Раздел с малым остатком
  if (lowStock.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(200, 120, 0);
    doc.text('МАЛЫЙ ОСТАТОК', 20, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.setFontSize(9);
    
    lowStock.forEach(m => {
      doc.text(`• ${m.name}: ${m.remaining_volume}/${m.volume} ${m.unit}`, 25, y);
      y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 5;
  }
  
  // Полный список
  doc.setFontSize(12);
  doc.text('ПОЛНЫЙ СПИСОК АКТИВНЫХ СРЕД', 20, y);
  y += 10;
  
  // Заголовки
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.text('Название', 20, y);
  doc.text('Категория', 75, y);
  doc.text('Лот', 100, y);
  doc.text('Остаток', 130, y);
  doc.text('Годен до', 155, y);
  doc.text('Статус', 180, y);
  y += 6;
  
  const categoryLabels: Record<string, string> = { base: 'Основная', additive: 'Добавка', enzyme: 'Фермент', other: 'Другое' };
  const statusLabels: Record<string, string> = { approved: 'Одобрено', quarantine: 'Карантин' };
  
  activeMedia.forEach(m => {
    doc.text(m.name.substring(0, 28), 20, y);
    doc.text(categoryLabels[m.category] || m.category, 75, y);
    doc.text(m.lot_number.substring(0, 12), 100, y);
    doc.text(`${m.remaining_volume} ${m.unit}`, 130, y);
    doc.text(new Date(m.expiry_date).toLocaleDateString('ru-RU'), 155, y);
    doc.text(statusLabels[m.status] || m.status, 180, y);
    y += 5;
    if (y > 275) { doc.addPage(); y = 20; }
  });
  
  doc.save(`media_report_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Отчёт журнала культур
export const generateCulturesJournalReport = async (cultures: Culture[], donors: Donor[]): Promise<void> => {
  const doc = new jsPDF({ orientation: 'landscape' });
  registerFont(doc);
  
  doc.setFontSize(16);
  doc.text('Журнал активных культур', 148, 15, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Сформирован: ${new Date().toLocaleString('ru-RU')}`, 148, 22, { align: 'center' });
  
  // Заголовки таблицы
  const headers = ['ID', 'Тип клеток', 'Пассаж', 'Донор', 'Статус', 'Кол-во клеток', 'Жизн.%', 'Создана'];
  const colWidths = [30, 40, 15, 50, 25, 30, 15, 30];
  let x = 15;
  let y = 35;
  
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    x += colWidths[i];
  });
  
  y += 8;
  
  cultures.forEach(culture => {
    const donor = donors.find(d => d.id === culture.donorId);
    x = 15;
    
    doc.text(culture.id, x, y); x += colWidths[0];
    doc.text(culture.cell_type.substring(0, 20), x, y); x += colWidths[1];
    doc.text(`P${culture.passage_number}`, x, y); x += colWidths[2];
    doc.text((donor?.fullName || '-').substring(0, 25), x, y); x += colWidths[3];
    doc.text(culture.status, x, y); x += colWidths[4];
    doc.text(culture.cell_count?.toLocaleString() || '-', x, y); x += colWidths[5];
    doc.text(culture.viability?.toString() || '-', x, y); x += colWidths[6];
    doc.text(new Date(culture.created_at).toLocaleDateString('ru-RU'), x, y);
    
    y += 6;
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
  });
  
  doc.save('cultures_journal.pdf');
};

// PDF-отчёт по оборудованию
export const generateEquipmentReport = async (equipmentList: Equipment[]): Promise<void> => {
  const doc = new jsPDF();
  registerFont(doc);
  
  const now = new Date();
  const twoMonthsLater = new Date();
  twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);
  
  // Статистика
  const active = equipmentList.filter(e => e.status === 'active');
  const maintenance = equipmentList.filter(e => e.status === 'maintenance');
  const repair = equipmentList.filter(e => e.status === 'repair');
  
  // Оборудование, требующее валидации в ближайшие 2 месяца
  const needsValidation = equipmentList.filter(e => {
    if (!e.next_validation_date) return false;
    const validDate = new Date(e.next_validation_date);
    return validDate >= now && validDate <= twoMonthsLater;
  });
  
  doc.setFontSize(16);
  doc.text('ОТЧЁТ ПО ОБОРУДОВАНИЮ', 105, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Дата формирования: ${now.toLocaleString('ru-RU')}`, 105, 22, { align: 'center' });
  
  // Раздел 1: Сводка
  doc.setFontSize(12);
  doc.text('КРАТКАЯ СВОДКА', 20, 35);
  doc.setFontSize(10);
  doc.text(`Всего единиц оборудования: ${equipmentList.length}`, 25, 45);
  doc.text(`Активно: ${active.length}`, 25, 52);
  doc.text(`На обслуживании: ${maintenance.length}`, 25, 59);
  doc.text(`В ремонте: ${repair.length}`, 25, 66);
  
  let y = 82;
  
  // Раздел 2: Требует валидации
  doc.setFontSize(12);
  doc.setTextColor(200, 100, 0);
  doc.text('ТРЕБУЕТ ВАЛИДАЦИИ (ближайшие 2 месяца)', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 10;
  
  if (needsValidation.length === 0) {
    doc.setFontSize(10);
    doc.text('Нет оборудования, требующего валидации в ближайшие 2 месяца.', 25, y);
    y += 10;
  } else {
    doc.setFontSize(8);
    doc.text('ID', 20, y);
    doc.text('Название', 55, y);
    doc.text('Тип', 110, y);
    doc.text('Дата валидации', 150, y);
    y += 6;
    
    needsValidation.forEach(eq => {
      doc.text(eq.id, 20, y);
      doc.text(eq.name.substring(0, 25), 55, y);
      doc.text(EQUIPMENT_TYPE_LABELS[eq.equipment_type] || eq.equipment_type, 110, y);
      doc.text(new Date(eq.next_validation_date!).toLocaleDateString('ru-RU'), 150, y);
      y += 5;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 5;
  }
  
  // Раздел 3: Полный список
  if (y > 220) { doc.addPage(); y = 20; }
  
  doc.setFontSize(12);
  doc.text('ПОЛНЫЙ СПИСОК ОБОРУДОВАНИЯ', 20, y);
  y += 10;
  
  doc.setFontSize(8);
  doc.text('ID', 15, y);
  doc.text('Название', 40, y);
  doc.text('Тип', 90, y);
  doc.text('Производитель', 125, y);
  doc.text('Локация', 160, y);
  doc.text('Статус', 185, y);
  y += 6;
  
  equipmentList.forEach(eq => {
    doc.text(eq.id.substring(0, 12), 15, y);
    doc.text(eq.name.substring(0, 25), 40, y);
    doc.text((EQUIPMENT_TYPE_LABELS[eq.equipment_type] || eq.equipment_type).substring(0, 15), 90, y);
    doc.text((eq.manufacturer || '-').substring(0, 15), 125, y);
    doc.text((eq.location || '-').substring(0, 12), 160, y);
    doc.text(EQUIPMENT_STATUS_LABELS[eq.status] || eq.status, 185, y);
    y += 5;
    if (y > 275) { doc.addPage(); y = 20; }
  });
  
  doc.save(`equipment_report_${now.toISOString().split('T')[0]}.pdf`);
};


// Сводный отчёт по всем донациям
export const generateDonationsListReport = (donations: Donation[], donors: Donor[], cultures?: Culture[]): void => {
  const doc = new jsPDF({ orientation: 'landscape' });
  registerFont(doc);
  const now = new Date();
  
  doc.setFontSize(14);
  let y = 20;
  doc.text('СВОДНЫЙ ОТЧЁТ ПО ДОНАЦИЯМ', 148, y, { align: 'center' });
  doc.setFontSize(10);
  y += 8;
  doc.text(`Дата формирования: ${now.toLocaleDateString('ru-RU')}`, 148, y, { align: 'center' });
  doc.text(`Всего донаций: ${donations.length}`, 148, y + 6, { align: 'center' });
  y += 18;
  
  // Заголовки
  doc.setFontSize(8);
  doc.text('ID', 10, y);
  doc.text('Донор', 30, y);
  doc.text('Дата', 75, y);
  doc.text('Тип материала', 100, y);
  doc.text('Кол-во', 140, y);
  doc.text('Культуры', 165, y);
  doc.text('Внешний вид', 210, y);
  doc.text('Статус', 250, y);
  y += 6;
  
  doc.line(10, y - 2, 287, y - 2);
  
  donations.forEach(d => {
    const donor = donors.find(dn => dn.id === d.donor_id);
    const donationCultures = cultures?.filter(c => c.donation_id === d.id) || [];
    const culturesInfo = donationCultures.length > 0 
      ? `${donationCultures.length} (P${donationCultures.map(c => c.passage_number).join(',')})`
      : '-';
    
    doc.text(d.id.substring(0, 10), 10, y);
    doc.text((donor?.fullName || '-').substring(0, 20), 30, y);
    doc.text(new Date(d.date_time).toLocaleDateString('ru-RU'), 75, y);
    doc.text((d.material_type || d.donation_type).substring(0, 18), 100, y);
    doc.text(`${d.quantity}${d.weight_grams ? `/${d.weight_grams}г` : ''}`, 140, y);
    doc.text(culturesInfo.substring(0, 18), 165, y);
    doc.text((d.appearance || '-').substring(0, 18), 210, y);
    const statusLabel = d.status === 'quarantine' ? 'Карантин' : d.status === 'processed' ? 'Обработ.' : 'Утилиз.';
    doc.text(statusLabel, 250, y);
    y += 5;
    if (y > 195) { doc.addPage(); y = 20; }
  });
  
  doc.save(`donations_report_${now.toISOString().split('T')[0]}.pdf`);
};

// Журнал доноров с количеством донаций
export const generateDonorsListReport = (donors: Donor[], donations: Donation[], cultures: Culture[]): void => {
  const doc = new jsPDF({ orientation: 'landscape' });
  registerFont(doc);
  const now = new Date();
  
  doc.setFontSize(14);
  let y = 20;
  doc.text('ЖУРНАЛ ДОНОРОВ', 148, y, { align: 'center' });
  doc.setFontSize(10);
  y += 8;
  doc.text(`Дата формирования: ${now.toLocaleDateString('ru-RU')}`, 148, y, { align: 'center' });
  doc.text(`Всего доноров: ${donors.length}`, 148, y + 6, { align: 'center' });
  y += 18;
  
  // Заголовки
  doc.setFontSize(8);
  doc.text('ID', 10, y);
  doc.text('ФИО', 35, y);
  doc.text('Дата рождения', 90, y);
  doc.text('Группа крови', 125, y);
  doc.text('Телефон', 155, y);
  doc.text('Донаций', 195, y);
  doc.text('Культур', 215, y);
  doc.text('Статус', 240, y);
  doc.text('Договор', 265, y);
  y += 6;
  
  doc.line(10, y - 2, 287, y - 2);
  
  const statusLabels: Record<string, string> = {
    active: 'Активен',
    inactive: 'Неактивен',
    blocked: 'Заблокир.'
  };
  
  donors.forEach(d => {
    const donorDonations = donations.filter(don => don.donorId === d.id);
    const donorCultures = cultures.filter(c => c.donor_id === d.id);
    
    doc.text(d.id.substring(0, 12), 10, y);
    doc.text(d.full_name.substring(0, 25), 35, y);
    doc.text(new Date(d.birth_date).toLocaleDateString('ru-RU'), 90, y);
    doc.text(d.blood_type || '-', 125, y);
    doc.text(d.phone.substring(0, 18), 155, y);
    doc.text(String(donorDonations.length), 195, y);
    doc.text(String(donorCultures.length), 215, y);
    doc.text(statusLabels[d.status] || d.status, 240, y);
    doc.text(d.contract_number?.substring(0, 12) || '-', 265, y);
    y += 5;
    if (y > 195) { doc.addPage(); y = 20; }
  });
  
  doc.save(`donors_report_${now.toISOString().split('T')[0]}.pdf`);
};


// Паспорт культуры (полный)
export const generateCulturePassport = async (
  culture: Culture,
  donor: Donor,
  donation: Donation,
  parentCulture?: Culture,
  manipulations?: any[]
): Promise<void> => {
  const doc = new jsPDF();
  registerFont(doc);
  const qr = await generateQRCode(`CULTURE:${culture.id}`);
  
  doc.setFontSize(18);
  doc.text('ПАСПОРТ КУЛЬТУРЫ', 105, 20, { align: 'center' });
  
  doc.addImage(qr, 'PNG', 160, 10, 30, 30);
  
  doc.setFontSize(12);
  let y = 50;
  
  // Основная информация
  doc.text(`ID культуры: ${culture.id}`, 20, y); y += 8;
  doc.text(`Тип клеток: ${culture.cell_type}`, 20, y); y += 8;
  doc.text(`Пассаж: P${culture.passage_number}`, 20, y); y += 8;
  doc.text(`Дата создания: ${new Date(culture.created_at).toLocaleDateString('ru-RU')}`, 20, y); y += 8;
  doc.text(`Статус: ${culture.status}`, 20, y); y += 12;
  
  // Характеристики
  doc.text('--- Характеристики ---', 20, y); y += 8;
  doc.text(`Количество клеток: ${culture.cell_count?.toLocaleString() || 'N/A'}`, 20, y); y += 8;
  doc.text(`Жизнеспособность: ${culture.viability || 'N/A'}%`, 20, y); y += 8;
  doc.text(`PDL (удвоения популяции): ${culture.total_doublings?.toFixed(2) || 'N/A'}`, 20, y); y += 8;
  doc.text(`Скорость роста: ${culture.growth_rate?.toFixed(3) || 'N/A'} удв./день`, 20, y); y += 8;
  doc.text(`Морфология: ${culture.morphology || 'Типичная'}`, 20, y); y += 8;
  doc.text(`Стерильность: ${culture.is_sterile ? 'Да' : 'Не проверено'}`, 20, y); y += 8;
  doc.text(`Посуда: ${culture.container_type} x${culture.container_count}`, 20, y); y += 12;
  
  // Донор
  doc.text('--- Донор ---', 20, y); y += 8;
  doc.text(`ID: ${donor.id}`, 20, y); y += 8;
  doc.text(`ФИО: ${donor.full_name}`, 20, y); y += 8;
  doc.text(`Дата рождения: ${new Date(donor.birth_date).toLocaleDateString('ru-RU')}`, 20, y); y += 8;
  doc.text(`Группа крови: ${donor.blood_type || 'Не указана'}`, 20, y); y += 12;
  
  // Донация
  doc.text('--- Донация ---', 20, y); y += 8;
  doc.text(`ID: ${donation.id}`, 20, y); y += 8;
  doc.text(`Материал: ${donation.material_type}`, 20, y); y += 8;
  doc.text(`Способ выделения: ${(donation as any).isolationMethod || 'Стандартный'}`, 20, y); y += 8;
  doc.text(`Дата: ${new Date(donation.date_time).toLocaleDateString('ru-RU')}`, 20, y); y += 12;
  
  // Материнская культура
  if (parentCulture) {
    doc.text('--- Материнская культура ---', 20, y); y += 8;
    doc.text(`ID: ${parentCulture.id}`, 20, y); y += 8;
    doc.text(`Пассаж: P${parentCulture.passage_number}`, 20, y); y += 8;
    doc.text(`PDL на момент пассирования: ${parentCulture.total_doublings?.toFixed(2) || 'N/A'}`, 20, y); y += 8;
  }
  
  doc.setFontSize(8);
  doc.text(`Документ сформирован: ${new Date().toLocaleString('ru-RU')}`, 20, 280);
  
  // Страница 2: История манипуляций
  if (manipulations && manipulations.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('ПРИЛОЖЕНИЕ: ИСТОРИЯ МАНИПУЛЯЦИЙ', 105, 20, { align: 'center' });
    
    doc.setFontSize(8);
    y = 35;
    doc.text('Дата', 15, y);
    doc.text('Тип', 50, y);
    doc.text('Оператор', 100, y);
    doc.text('Примечания', 140, y);
    y += 6;
    doc.line(15, y - 2, 195, y - 2);
    
    const typeLabels: Record<string, string> = {
      observation: 'Наблюдение',
      passaging: 'Пассирование',
      freezing: 'Заморозка',
      thawing: 'Размораживание',
      media_change: 'Смена среды',
      release: 'Выдача',
      disposal: 'Утилизация'
    };
    
    manipulations.forEach(m => {
      doc.text(new Date(m.dateTime).toLocaleDateString('ru-RU'), 15, y);
      doc.text(typeLabels[m.type] || m.type, 50, y);
      doc.text((m.operatorName || '-').substring(0, 20), 100, y);
      doc.text((m.notes || '-').substring(0, 35), 140, y);
      y += 5;
      if (y > 275) { doc.addPage(); y = 20; }
    });
  }
  
  doc.save(`culture_${culture.id}_passport.pdf`);
};
