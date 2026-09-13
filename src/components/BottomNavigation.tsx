import React from 'react';
import { LayoutDashboard, Users, Plus, FileText } from 'lucide-react';

export type MainTabType = 'dashboard' | 'data' | 'pendataan' | 'laporan';

interface BottomNavigationProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]"
      style={{ height: 'calc(66px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="w-full max-w-[480px] md:max-w-xl mx-auto h-[66px] px-2 flex items-center justify-around">
        {/* 1. Menu: Dashboard */}
        <button
          id="nav-tab-dashboard"
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 h-full cursor-pointer transition-colors ${
            activeTab === 'dashboard'
              ? 'text-[#6D4AFF] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : ''}`} />
          </div>
          <span className="text-[11px] leading-tight mt-1 whitespace-nowrap">Dashboard</span>
        </button>

        {/* 2. Menu: Data */}
        <button
          id="nav-tab-data"
          type="button"
          onClick={() => setActiveTab('data')}
          className={`flex-1 flex flex-col items-center justify-center py-1 h-full cursor-pointer transition-colors ${
            activeTab === 'data'
              ? 'text-[#6D4AFF] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <Users className={`w-5 h-5 ${activeTab === 'data' ? 'stroke-[2.5]' : ''}`} />
          </div>
          <span className="text-[11px] leading-tight mt-1 whitespace-nowrap">Data</span>
        </button>

        {/* 3. Menu: + Tambah (Paling Menonjol) */}
        <button
          id="nav-tab-tambah"
          type="button"
          onClick={() => setActiveTab('pendataan')}
          aria-label="Tambah Telitian"
          className="flex-1 flex flex-col items-center justify-center py-0.5 h-full cursor-pointer group"
        >
          <div
            className={`w-11 h-11 -mt-3.5 rounded-full flex items-center justify-center shadow-md transition-transform duration-150 active:scale-95 ${
              activeTab === 'pendataan'
                ? 'bg-[#5B39EE] text-white ring-4 ring-violet-100'
                : 'bg-[#6D4AFF] text-white hover:bg-[#5B39EE] ring-3 ring-violet-50'
            }`}
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span
            className={`text-[11px] leading-tight mt-0.5 font-bold whitespace-nowrap ${
              activeTab === 'pendataan' ? 'text-[#6D4AFF]' : 'text-slate-700'
            }`}
          >
            Tambah
          </span>
        </button>

        {/* 4. Menu: Laporan */}
        <button
          id="nav-tab-laporan"
          type="button"
          onClick={() => setActiveTab('laporan')}
          className={`flex-1 flex flex-col items-center justify-center py-1 h-full cursor-pointer transition-colors ${
            activeTab === 'laporan'
              ? 'text-[#6D4AFF] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <FileText className={`w-5 h-5 ${activeTab === 'laporan' ? 'stroke-[2.5]' : ''}`} />
          </div>
          <span className="text-[11px] leading-tight mt-1 whitespace-nowrap">Laporan</span>
        </button>
      </div>
    </nav>
  );
};
