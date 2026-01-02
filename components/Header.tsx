
import React from 'react';
import { BookOpen, Info } from 'lucide-react';

interface HeaderProps {
  onShowArch: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowArch }) => {
  return (
    <header className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 max-w-6xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg text-indigo-700 shadow-md">
            <BookOpen size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AI Exam Grader</h1>
            <p className="text-indigo-200 text-xs font-light">Smart School Solutions</p>
          </div>
        </div>
        
        <button 
          onClick={onShowArch}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full transition-all text-sm font-medium"
        >
          <Info size={16} />
          สถาปัตยกรรมระบบ
        </button>
      </div>
    </header>
  );
};

export default Header;
