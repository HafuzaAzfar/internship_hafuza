import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Maximize2, 
  Minimize2, 
  Globe, 
  ShieldCheck, 
  Plus, 
  CheckCheck, 
  LogOut, 
  User, 
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Calendar,
  BookOpen,
  Megaphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { NavTab } from './Sidebar';
import { UserRole } from '../types';

interface TopNavbarProps {
  onToggleMobileSidebar: () => void;
  onNavigate: (tab: NavTab) => void;
  onQuickAction?: () => void;
  quickActionLabel?: string;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
    link?: string;
  }>;
  onMarkAllNotificationsRead: () => void;
  searchItems?: Array<{ id: string; title: string; category: string; tab: NavTab }>;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleMobileSidebar,
  onNavigate,
  onQuickAction,
  quickActionLabel,
  notifications,
  onMarkAllNotificationsRead,
  searchItems = [],
}) => {
  const { profile, effectiveRole, previewRole, setPreviewRole, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
        setShowRoleSelector(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSearch = searchQuery.trim() === '' 
    ? [] 
    : searchItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E6ECE8] px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
      {/* Left section: Toggle & Company Workspace */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-[#718078] hover:text-[#111A16] hover:bg-[#F3F6F4] transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F3F6F4] border border-[#E6ECE8]">
          <div className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <span className="text-xs font-semibold text-[#111A16]">
            PT One Data Security
          </span>
          <span className="text-[11px] text-[#718078] font-medium border-l border-[#E6ECE8] pl-2">
            Jakarta (WIB)
          </span>
        </div>
      </div>

      {/* Center section: Global Search Bar */}
      <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718078]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            placeholder={t.topbar.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-full bg-[#F3F6F4] border border-[#E6ECE8] text-[#111A16] placeholder-[#718078] focus:outline-none focus:ring-2 focus:ring-[#0B3325]/20 focus:border-[#0B3325] transition-all"
          />
        </div>

        {/* Global Search Results Dropdown */}
        {showSearchDropdown && searchQuery.trim() !== '' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-[#E6ECE8] py-2 z-50 max-h-80 overflow-y-auto">
            <div className="px-4 py-1.5 text-[11px] font-bold text-[#718078] uppercase">
              Hasil Pencarian ({filteredSearch.length})
            </div>
            {filteredSearch.length === 0 ? (
              <div className="px-4 py-4 text-xs text-center text-[#718078]">
                Tidak ada data ditemukan untuk "{searchQuery}"
              </div>
            ) : (
              filteredSearch.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.tab);
                    setShowSearchDropdown(false);
                    setSearchQuery('');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#F3F6F4] flex items-center justify-between text-xs transition-colors"
                >
                  <span className="font-medium text-[#111A16] truncate max-w-[280px]">
                    {item.title}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E6ECE8] text-[#718078]">
                    {item.category}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right section: Context Action, Language, Notifications, Fullscreen, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Context Action Button (e.g. Scan QR, Tambah Jurnal) */}
        {onQuickAction && quickActionLabel && (
          <button
            onClick={onQuickAction}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#0B3325] text-white hover:bg-[#102F23] shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[#B7F500]" />
            <span>{quickActionLabel}</span>
          </button>
        )}

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
          title="Switch Language (ID / EN)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#E6ECE8] bg-white hover:bg-[#F3F6F4] text-xs font-semibold text-[#111A16] transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-[#718078]" />
          <span className="uppercase">{language}</span>
        </button>

        {/* Notifications Popover */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full border border-[#E6ECE8] bg-white hover:bg-[#F3F6F4] text-[#718078] hover:text-[#111A16] relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#E6ECE8] py-2 z-50">
              <div className="px-4 py-2 border-b border-[#E6ECE8] flex items-center justify-between">
                <span className="text-xs font-bold text-[#111A16]">
                  {t.topbar.notifications} ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllNotificationsRead}
                    className="text-[11px] font-semibold text-[#16A34A] hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {t.topbar.markAllRead}
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#E6ECE8]/50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#718078]">
                    {t.topbar.noNotifications}
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-3 text-xs transition-colors hover:bg-[#F3F6F4] ${
                        !notif.read ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-[#111A16]">{notif.title}</p>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#718078] mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-[#718078]/70 mt-1">
                        {new Date(notif.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          title={t.topbar.fullscreen}
          className="hidden sm:inline-flex p-2 rounded-full border border-[#E6ECE8] bg-white hover:bg-[#F3F6F4] text-[#718078] hover:text-[#111A16] transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* User Profile Dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-[#E6ECE8] bg-white hover:bg-[#F3F6F4] transition-all"
          >
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="w-7 h-7 rounded-full object-cover border border-[#0B3325]/20"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#0B3325] text-[#B7F500] font-bold text-xs flex items-center justify-center">
                {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="hidden xl:block text-left">
              <p className="text-xs font-bold text-[#111A16] leading-none truncate max-w-[100px]">
                {profile?.displayName || 'User Hafuza'}
              </p>
              <p className="text-[10px] text-[#718078] font-medium capitalize mt-0.5">
                {effectiveRole}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#718078]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E6ECE8] py-2 z-50">
              <div className="px-4 py-2 border-b border-[#E6ECE8]">
                <p className="text-xs font-bold text-[#111A16]">{profile?.displayName}</p>
                <p className="text-[11px] text-[#718078] truncate">{profile?.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#0B3325] text-[#B7F500] uppercase">
                    {effectiveRole}
                  </span>
                  <span className="text-[10px] text-[#16A34A] font-semibold">
                    PT One Data Security
                  </span>
                </div>
              </div>

              {/* Role preview switcher (for Admin testing of all 4 roles) */}
              {(profile?.role === 'admin' || profile?.email === 'hafuza@narmadi.com') && (
                <div className="px-3 py-2 border-b border-[#E6ECE8] bg-[#F3F6F4]/50">
                  <p className="text-[10px] font-bold text-[#718078] uppercase mb-1.5 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3 text-[#16A34A]" />
                    {t.topbar.switchRole}
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {(['student', 'supervisor', 'teacher', 'admin'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setPreviewRole(r === profile?.role ? null : r);
                          setShowUserMenu(false);
                        }}
                        className={`px-2 py-1 rounded-lg text-left font-medium transition-colors ${
                          effectiveRole === r 
                            ? 'bg-[#0B3325] text-[#B7F500]' 
                            : 'bg-white hover:bg-emerald-50 text-[#111A16] border border-[#E6ECE8]'
                        }`}
                      >
                        {r === 'student' && 'Siswa'}
                        {r === 'supervisor' && 'Pembimbing'}
                        {r === 'teacher' && 'Guru'}
                        {r === 'admin' && 'Admin'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="py-1">
                <button
                  onClick={() => {
                    onNavigate('profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#F3F6F4] text-xs font-medium text-[#111A16] flex items-center gap-2.5"
                >
                  <User className="w-4 h-4 text-[#718078]" />
                  {t.topbar.myProfile}
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-red-50 text-xs font-medium text-red-600 flex items-center gap-2.5"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  {t.nav.logout}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
