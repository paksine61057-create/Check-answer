
import React from 'react';
import { AppStep } from '../types';
import { Settings, Camera, Table } from 'lucide-react';

interface StepProgressBarProps {
  currentStep: AppStep;
}

const StepProgressBar: React.FC<StepProgressBarProps> = ({ currentStep }) => {
  if (currentStep === AppStep.SELECT_EXAM) return null;

  const steps = [
    { id: AppStep.SETUP_MASTER, label: 'ตั้งค่าเฉลย', icon: <Settings size={18} /> },
    { id: AppStep.PROCESS_STUDENTS, label: 'ตรวจกระดาษ', icon: <Camera size={18} /> },
    { id: AppStep.RESULTS, label: 'สรุปผลคะแนน', icon: <Table size={18} /> },
  ];

  const currentIdx = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="relative flex justify-between max-w-2xl mx-auto py-4">
      <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
      
      {steps.map((step, idx) => {
        const isActive = step.id === currentStep;
        const isCompleted = currentIdx > idx;
        
        return (
          <div key={step.id} className="relative z-10 flex flex-col items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
              ${isActive ? 'bg-indigo-600 text-white scale-110 shadow-lg ring-4 ring-indigo-100' : 
                isCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}
            `}>
              {step.icon}
            </div>
            <span className={`mt-3 text-sm font-semibold transition-colors duration-300 ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StepProgressBar;
