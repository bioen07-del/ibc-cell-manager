// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Droplets, FlaskConical, ClipboardList, 
  Menu, X, Search, ChevronDown, Database, Package, Truck, Trash2, LogOut, Shield, Settings, Library, ScanLine, FileText, Calendar, History, MessageSquarePlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HelpPanel, HelpButton } from './HelpSystem';
import { QRScanner } from './QRScanner';
import FeedbackButton, { APP_VERSION, BUILD_DATE } from './FeedbackButton';

const allNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'Дашборд', module: 'dashboard' },
  { path: '/donors', icon: Users, label: 'Доноры', module: 'donors' },
  { path: '/donations', icon: Droplets, label: 'Донации', module: 'donations' },
  { path: '/cultures', icon: FlaskConical, label: 'Культуры', module: 'cultures' },
  { path: '/masterbanks', icon: Database, label: 'Мастер-банк', module: 'masterbanks' },
  { path: '/storage', icon: Package, label: 'Хранение', module: 'storage' },
  { path: '/releases', icon: Truck, label: 'Выдача', module: 'releases' },
  { path: '/disposals', icon: Trash2, label: 'Утилизация', module: 'disposals' },
  { path: '/resources', icon: Library, label: 'Ресурсы', module: 'equipment' },
  { path: '/tasks', icon: ClipboardList, label: 'Задачи', module: 'tasks' },
  { path: '/autotasks', icon: Settings, label: 'Автозадачи', module: 'autotasks' },
  { path: '/sops', icon: FileText, label: 'Протоколы (SOP)', module: 'sops' },
  { path: '/calendar', icon: Calendar, label: 'Календарь', module: 'calendar' },
  { path: '/audit', icon: History, label: 'Журнал аудита', module: 'audit' },
  { path: '/admin', icon: Shield, label: 'Администрирование', module: 'admin' },
  { path: '/admin/feedback', icon: MessageSquarePlus, label: 'Обратная связь', module: 'admin' },
];

const roleLabels: Record<string, string> = {
  admin: 'Администратор',
  operator: 'Оператор',
  customer: 'Заказчик',
  doctor: 'Врач'
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-500',
  operator: 'bg-primary',
  customer: 'bg-green-500',
  doctor: 'bg-blue-500'
};

export const Layout: React.FC = () => {
  const { user, logout, canAccess } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  // Определяем текущий модуль для справки
  const getCurrentModule = () => {
    const path = location.pathname.slice(1) || 'dashboard';
    return path;
  };

  // Клавиша ? для открытия справки
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowHelp(prev => !prev);
        }
      }
      if (e.key === 'Escape') {
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Фильтруем навигацию по правам доступа
  const navItems = allNavItems.filter(item => canAccess(item.module));

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50' : ''} 
        ${sidebarOpen || !isMobile ? 'w-64' : 'w-0 md:w-16'} 
        bg-white border-r border-slate-200 transition-all duration-300 flex flex-col overflow-hidden
      `}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-8 h-8 text-primary flex-shrink-0" />
            <span className="font-bold text-slate-800 whitespace-nowrap">IBC CellManager</span>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-primary text-white' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-slate-200">
          <div className="text-xs text-slate-400 space-y-1">
            <div className="font-medium">IBC CellManager</div>
            <div>v{APP_VERSION} • {BUILD_DATE}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            {/* Mobile menu button */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Search - hidden on very small screens */}
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* QR Scanner button */}
            <button 
              onClick={() => setShowScanner(true)}
              className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              title="QR-сканер"
            >
              <ScanLine className="w-5 h-5" />
              <span className="hidden md:inline text-sm font-medium">Сканер</span>
            </button>

            <HelpButton onClick={() => setShowHelp(true)} />
            
            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:bg-slate-50 rounded-lg p-1.5"
              >
                <div className={`w-8 h-8 ${roleColors[user?.role || 'operator']} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
                  {user ? getInitials(user.name) : 'ОП'}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-slate-700">{user?.name || 'Пользователь'}</p>
                  <p className="text-xs text-slate-400">{roleLabels[user?.role || 'operator']}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                    <p className="text-xs text-slate-500">{roleLabels[user?.role || 'operator']}</p>
                  </div>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Help Panel */}
      <HelpPanel 
        currentModule={getCurrentModule()} 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
      />

      {/* QR Scanner */}
      <QRScanner 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
      />

      {/* Feedback Button для операторов */}
      <FeedbackButton />
    </div>
  );
};
