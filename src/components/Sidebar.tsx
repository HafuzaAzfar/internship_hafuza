import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  QrCode, 
  BookOpen, 
  Image as ImageIcon, 
  Award, 
  FileCheck, 
  Megaphone, 
  User, 
  Users, 
  Settings, 
  LogOut, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export type NavTab = 
  | 'dashboard' 
  | 'schedule' 
  | 'attendance' 
  | 'journal' 
  | 'documentation' 
  | 'assessment' 
  | 'finalReport' 
  | 'announcements' 
  | 'studentManagement' 
  | 'settings' 
  | 'profile';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pendingJournalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  pendingJournalsCount = 0,
}) => {
  const { profile, effectiveRole, logout, previewRole } = useAuth();
  const { t } = useLanguage();

  const isStaffOrAdmin = effectiveRole === 'admin' || effectiveRole === 'supervisor' || effectiveRole === 'teacher';

  const mainMenuItems = [
    { id: 'dashboard' as NavTab, label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'schedule' as NavTab, label: t.nav.schedule, icon: Calendar },
    { id: 'attendance' as NavTab, label: t.nav.attendance, icon: QrCode },
    { 
      id: 'journal' as NavTab, 
      label: t.nav.journal, 
      icon: BookOpen, 
      badge: (effectiveRole === 'supervisor' || effectiveRole === 'admin') && pendingJournalsCount > 0 ? pendingJournalsCount : undefined 
    },
    { id: 'documentation' as NavTab, label: t.nav.documentation, icon: ImageIcon },
    { id: 'assessment' as NavTab, label: t.nav.assessment, icon: Award },
    { id: 'finalReport' as NavTab, label: t.nav.finalReport, icon: FileCheck },
    { id: 'announcements' as NavTab, label: t.nav.announcements, icon: Megaphone },
  ];

  const adminMenuItems = [
    { id: 'studentManagement' as NavTab, label: t.nav.studentManagement, icon: Users },
    { id: 'settings' as NavTab, label: t.nav.settings, icon: Settings },
  ];

  const accountMenuItems = [
    { id: 'profile' as NavTab, label: t.nav.profile, icon: User },
  ];

  const handleNavClick = (tabId: NavTab) => {
    onSelectTab(tabId);
    if (isOpenMobile) onCloseMobile();
  };

  const roleBadgeColor = {
    admin: 'bg-[#B7F500] text-[#061F16]',
    supervisor: 'bg-emerald-400 text-[#061F16]',
    teacher: 'bg-sky-300 text-[#061F16]',
    student: 'bg-emerald-900 text-emerald-200 border border-emerald-700/50',
  }[effectiveRole];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Persistent Sidebar */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#061F16] text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-[#102F23]
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-[#102F23]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0B3325] via-[#102F23] to-[#B7F500]/30 border border-[#B7F500]/40 flex items-center justify-center text-[#B7F500] shadow-md shadow-[#B7F500]/10">
              <Sparkles className="w-5 h-5 text-[#B7F500]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight capitalize">
                internship hafuza
              </h1>
              <p className="text-[11px] font-medium text-emerald-400/80 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#B7F500]" />
                PT One Data Security
              </p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-[#102F23]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {/* Main Menu */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-emerald-500/80 uppercase">
              {t.nav.mainMenu}
            </div>
            <nav className="space-y-1">
              {mainMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                      isActive 
                        ? 'bg-[#102F23] text-white shadow-xs' 
                        : 'text-emerald-300/70 hover:text-white hover:bg-[#102F23]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-[#B7F500] text-[#061F16]' 
                          : 'bg-[#102F23]/60 text-emerald-400 group-hover:text-white'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#B7F500] text-[#061F16]">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#B7F500]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Admin / Staff section */}
          {isStaffOrAdmin && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-emerald-500/80 uppercase">
                {t.nav.adminMenu}
              </div>
              <nav className="space-y-1">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                        isActive 
                          ? 'bg-[#102F23] text-white shadow-xs' 
                          : 'text-emerald-300/70 hover:text-white hover:bg-[#102F23]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-[#B7F500] text-[#061F16]' 
                            : 'bg-[#102F23]/60 text-emerald-400 group-hover:text-white'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#B7F500]" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Account */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-emerald-500/80 uppercase">
              {t.nav.account}
            </div>
            <nav className="space-y-1">
              {accountMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                      isActive 
                        ? 'bg-[#102F23] text-white shadow-xs' 
                        : 'text-emerald-300/70 hover:text-white hover:bg-[#102F23]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-[#B7F500] text-[#061F16]' 
                          : 'bg-[#102F23]/60 text-emerald-400 group-hover:text-white'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#B7F500]" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Profile Card at bottom */}
        <div className="p-4 border-t border-[#102F23] bg-[#051811]/90">
          {previewRole && (
            <div className="mb-2 px-2.5 py-1 rounded-lg bg-[#B7F500]/10 border border-[#B7F500]/30 text-[10px] text-[#B7F500] flex items-center justify-between">
              <span>Previewing: {previewRole}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div 
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0 pr-2"
            >
              <div className="relative">
                {profile?.photoURL ? (
                  <img 
                    src={profile.photoURL} 
                    alt={profile.displayName} 
                    className="w-9 h-9 rounded-full object-cover border border-[#B7F500]/30" 
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#102F23] border border-emerald-600/40 flex items-center justify-center font-bold text-xs text-[#B7F500]">
                    {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#061F16]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate group-hover:text-[#B7F500] transition-colors">
                  {profile?.displayName || 'User Hafuza'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wide ${roleBadgeColor}`}>
                    {effectiveRole}
                  </span>
                  <span className="text-[10px] text-emerald-400/60 truncate">
                    {profile?.email}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title={t.nav.logout}
              className="p-2 rounded-lg text-emerald-400/70 hover:text-red-400 hover:bg-[#102F23] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
