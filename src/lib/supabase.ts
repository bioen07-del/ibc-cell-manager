import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://klpwxytazuzzmwteyooa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtscHd4eXRhenV6em13dGV5b29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMjAyNTUsImV4cCI6MjA4Mjg5NjI1NX0.pQC7BGvTheVSeWSuFY8Ud7x1YYYESmG9MSu4BiLzHw0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы для таблиц
export interface DbDonor {
  id: string;
  code: string;
  age: number;
  gender: 'male' | 'female';
  diagnosis?: string;
  status: 'active' | 'inactive' | 'completed';
  medical_info?: any;
  created_at: string;
  updated_at: string;
}

export interface DbCulture {
  id: string;
  donor_id: string;
  donation_id?: string;
  name: string;
  passage: number;
  status: 'in_work' | 'frozen' | 'disposed' | 'released';
  location?: string;
  viability?: number;
  cell_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  due_date: string;
  assignee?: string;
  culture_id?: string;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  user_id?: string;
  user_name?: string;
  details?: any;
  created_at: string;
}
