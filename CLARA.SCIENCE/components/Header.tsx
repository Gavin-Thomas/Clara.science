import React from 'react';
import { ClaraIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
        <ClaraIcon className="h-9 w-9 text-[#d6001c]" />
        <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">CLARA-AI</h1>
            <p className="text-xs text-gray-500">Clinical Learning through Augmented Reasoning & Art</p>
        </div>
      </div>
    </header>
  );
};