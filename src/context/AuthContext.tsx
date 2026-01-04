import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'operator' | 'customer' | 'doctor';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  customerId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  targetId?: string;
  details?: string;
  timestamp: string;
}

interface AuthContextType {
  user: User | null;
  users: User[];
  activityLogs: ActivityLog[];
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  canAccess: (module: string) => boolean;
  canEdit: () => boolean;
  canManageSOP: () => boolean;
  isAdmin: () => boolean;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>, password: string) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  logActivity: (action: string, module: string, targetId?: string, details?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Начальные пользователи
const INITIAL_USERS: User[] = [
  { id: 'ADM001', username: 'admin', name: 'Администратор', role: 'admin', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'OP001', username: 'operator', name: 'Оператор Иванов А.П.', role: 'operator', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'OP002', username: 'operator2', name: 'Оператор Петрова М.С.', role: 'operator', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'CU001', username: 'customer1', name: 'Заказчик Сидоров В.И.', role: 'customer', customerId: 'DON-001', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'DR001', username: 'doctor', name: 'Врач Козлова Е.В.', role: 'doctor', isActive: true, createdAt: '2024-01-01T00:00:00Z' }
];

const INITIAL_PASSWORDS: Record<string, string> = {
  'admin': 'admin123',
  'operator': '123456',
  'operator2': '123456',
  'customer1': '123456',
  'doctor': '123456'
};

// Права доступа по ролям (какие модули видит)
const ACCESS_MATRIX: Record<UserRole, string[]> = {
  admin: ['dashboard', 'admin', 'sops', 'audit', 'autotasks', 'calendar', 'donors', 'donations', 'cultures', 'masterbanks', 'storage', 'releases', 'disposals', 'equipment', 'media', 'tasks', 'containers'],
  operator: ['dashboard', 'donors', 'donations', 'cultures', 'masterbanks', 'storage', 'releases', 'disposals', 'equipment', 'media', 'tasks', 'containers', 'sops', 'calendar', 'autotasks'],
  customer: ['dashboard', 'donors', 'donations', 'cultures', 'masterbanks', 'storage'],
  doctor: ['dashboard', 'donations', 'masterbanks', 'storage']
};

// Роли, которые могут редактировать данные
const EDIT_ROLES: UserRole[] = ['admin', 'operator'];

// Роли, которые могут управлять СОПами (создание, редактирование, удаление)
const SOP_ADMIN_ROLES: UserRole[] = ['admin'];

const generateId = () => `USR${Date.now().toString(36).toUpperCase()}`;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ibc_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('ibc_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [passwords, setPasswords] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('ibc_passwords');
    return saved ? JSON.parse(saved) : INITIAL_PASSWORDS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('ibc_activity_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem('ibc_users', JSON.stringify(newUsers));
  };

  const savePasswords = (newPasswords: Record<string, string>) => {
    setPasswords(newPasswords);
    localStorage.setItem('ibc_passwords', JSON.stringify(newPasswords));
  };

  const saveLogs = (newLogs: ActivityLog[]) => {
    setActivityLogs(newLogs);
    localStorage.setItem('ibc_activity_logs', JSON.stringify(newLogs));
  };

  const logActivity = (action: string, module: string, targetId?: string, details?: string) => {
    if (!user) return;
    const log: ActivityLog = {
      id: `LOG${Date.now()}`,
      userId: user.id,
      userName: user.name,
      action,
      module,
      targetId,
      details,
      timestamp: new Date().toISOString()
    };
    const newLogs = [log, ...activityLogs].slice(0, 1000); // Храним последние 1000 записей
    saveLogs(newLogs);
  };

  const login = (username: string, password: string): boolean => {
    const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.isActive);
    if (foundUser && passwords[foundUser.username] === password) {
      setUser(foundUser);
      localStorage.setItem('ibc_user', JSON.stringify(foundUser));
      // Логируем вход
      const log: ActivityLog = {
        id: `LOG${Date.now()}`,
        userId: foundUser.id,
        userName: foundUser.name,
        action: 'Вход в систему',
        module: 'auth',
        timestamp: new Date().toISOString()
      };
      const newLogs = [log, ...activityLogs].slice(0, 1000);
      saveLogs(newLogs);
      return true;
    }
    return false;
  };

  const logout = () => {
    if (user) {
      logActivity('Выход из системы', 'auth');
    }
    setUser(null);
    localStorage.removeItem('ibc_user');
  };

  const canAccess = (module: string): boolean => {
    if (!user) return false;
    const allowed = ACCESS_MATRIX[user.role];
    return allowed.includes('*') || allowed.includes(module);
  };

  const canEdit = (): boolean => {
    if (!user) return false;
    return EDIT_ROLES.includes(user.role);
  };

  const canManageSOP = (): boolean => {
    if (!user) return false;
    return SOP_ADMIN_ROLES.includes(user.role);
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>, password: string) => {
    const newUser: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    saveUsers([...users, newUser]);
    savePasswords({ ...passwords, [userData.username]: password });
    logActivity('Создание пользователя', 'users', newUser.id, `Создан пользователь: ${newUser.name} (${newUser.role})`);
  };

  const updateUser = (id: string, data: Partial<User>) => {
    const newUsers = users.map(u => u.id === id ? { ...u, ...data } : u);
    saveUsers(newUsers);
    const targetUser = users.find(u => u.id === id);
    logActivity('Обновление пользователя', 'users', id, `Обновлён пользователь: ${targetUser?.name}`);
  };

  const deleteUser = (id: string) => {
    const targetUser = users.find(u => u.id === id);
    saveUsers(users.filter(u => u.id !== id));
    logActivity('Удаление пользователя', 'users', id, `Удалён пользователь: ${targetUser?.name}`);
  };

  return (
    <AuthContext.Provider value={{
      user,
      users,
      activityLogs,
      isAuthenticated: !!user,
      login,
      logout,
      canAccess,
      canEdit,
      canManageSOP,
      isAdmin,
      addUser,
      updateUser,
      deleteUser,
      logActivity
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
