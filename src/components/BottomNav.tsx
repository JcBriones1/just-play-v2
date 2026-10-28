import React from 'react';
import { Home, Compass, Library, SlidersHorizontal, Cloud } from 'lucide-react';

export type NavTab = 'home' | 'explore' | 'library' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  syncCode: string | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  syncCode,
}) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'explore' as NavTab, label: 'Explore', icon: Compass },
    { id: 'library' as NavTab, label: 'Library', icon: Library },
    { id: 'settings' as NavTab, label: 'Sync & Settings', icon: SlidersHorizontal },
  ];

  return (
    <nav className="relative w-full glass-nav border-t border-white/5 pb-safe px-2 select-none">
      <div className="flex items-center justify-around w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 relative ${
                isActive
                  ? 'text-purple-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200 font-normal'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.id === 'settings' && syncCode && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-sm shadow-purple-500/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
