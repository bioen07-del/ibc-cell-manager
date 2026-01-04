// Утилиты для преобразования snake_case <-> camelCase

// Преобразование строки snake_case в camelCase
export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Преобразование строки camelCase в snake_case
export const camelToSnake = (str: string): string => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
};

// Преобразование объекта из snake_case в camelCase
export const mapFromSupabase = <T>(obj: Record<string, any>): T => {
  if (!obj) return obj as T;
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamel(key);
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = mapFromSupabase(value);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item => 
        typeof item === 'object' && item !== null ? mapFromSupabase(item) : item
      );
    } else {
      result[camelKey] = value;
    }
  }
  return result as T;
};

// Преобразование объекта из camelCase в snake_case для отправки в Supabase
export const mapToSupabase = (obj: Record<string, any>): Record<string, any> => {
  if (!obj) return obj;
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key);
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = mapToSupabase(value);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item => 
        typeof item === 'object' && item !== null ? mapToSupabase(item) : item
      );
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
};

// Преобразование массива из Supabase
export const mapArrayFromSupabase = <T>(arr: Record<string, any>[]): T[] => {
  if (!arr) return [];
  return arr.map(item => mapFromSupabase<T>(item));
};

// Маппинг специфичных полей (для особых случаев)
export const mapCultureFromSupabase = (data: any): any => {
  if (!data) return data;
  return {
    ...mapFromSupabase(data),
    // Специальные маппинги
    passageNumber: data.passage ?? data.passage_number ?? 0,
    donorId: data.donor_id,
    donationId: data.donation_id,
    cellType: data.cell_type,
    containerType: data.container_type,
    containerCount: data.container_count ?? 1,
    cellCount: data.cell_count,
    parentCultureId: data.parent_culture_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const mapDonorFromSupabase = (data: any): any => {
  if (!data) return data;
  return {
    ...mapFromSupabase(data),
    fullName: data.full_name,
    birthDate: data.birth_date,
    bloodType: data.blood_type,
    rhFactor: data.rh_factor,
    healthNotes: data.health_notes,
    contractNumber: data.contract_number,
    contractDate: data.contract_date,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    customerEmail: data.customer_email,
    doctorId: data.doctor_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const mapMediaFromSupabase = (data: any): any => {
  if (!data) return data;
  return {
    id: data.id,
    name: data.name,
    manufacturer: data.manufacturer,
    lotNumber: data.lot_number,
    catalogNumber: data.catalog_number,
    mediaType: data.media_type || 'original',
    category: data.category || 'base',
    purpose: data.purpose,
    volume: parseFloat(data.volume) || 0,
    remainingVolume: parseFloat(data.remaining_volume) || 0,
    unit: data.unit || 'мл',
    expiryDate: data.expiry_date,
    storageConditions: data.storage_conditions,
    status: data.status || 'quarantine',
    lowStockThreshold: parseFloat(data.low_stock_threshold) || 100,
    isSterile: data.is_sterile ?? true,
    sterilizationMethod: data.sterilization_method,
    sterilizationDate: data.sterilization_date,
    components: data.components ? (typeof data.components === 'string' ? JSON.parse(data.components) : data.components) : null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const mapEquipmentFromSupabase = (data: any): any => {
  if (!data) return data;
  return {
    ...mapFromSupabase(data),
    equipmentType: data.type,
    serialNumber: data.serial_number,
    lastCalibration: data.last_calibration,
    nextCalibration: data.next_calibration,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const mapContainerTypeFromSupabase = (data: any): any => {
  if (!data) return data;
  return {
    id: data.id,
    name: data.name,
    area: parseFloat(data.area) || 0,
    volumeMin: parseFloat(data.volume_min) || 0,
    volumeMax: parseFloat(data.volume_max) || 0,
    volumeRecommended: parseFloat(data.volume_recommended) || 0,
    category: data.category || 'other',
    isActive: data.is_active ?? true,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const mapAutoTaskRuleFromSupabase = (data: any): any => {
  if (!data) return data;
  return {
    ...mapFromSupabase(data),
    delayDays: data.delay_days,
    isActive: data.is_active ?? true,
    sopId: data.sop_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const mapMasterBankFromSupabase = (data: any): any => {
  if (!data) return data;
  return {
    ...mapFromSupabase(data),
    donorId: data.donor_id,
    donationId: data.donation_id,
    cultureId: data.culture_id,
    cellType: data.cell_type,
    passageNumber: data.passage_number,
    vialsCount: data.vials_count,
    storageLocation: data.storage_location,
    freezingDate: data.freezing_date,
    cellCount: data.cell_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};
