import { ChevronDown, Bell, Menu } from 'lucide-react';

interface HeaderProps {
  storeName?: string;
  onMenuClick: () => void;
}

export default function Header({ storeName = 'Stricey Shop', onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-2 lg:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        <button className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-gray-700 hidden sm:inline">{storeName}</span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">CD</span>
          </div>
          <button className="hidden md:flex items-center gap-1">
            <span className="text-sm font-medium text-gray-700">Cory Calender</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
