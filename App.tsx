
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Camera, 
  PlusCircle, 
  FolderOpen, 
  AlertTriangle,
  BarChart3,
  ArrowRight,
  ChevronLeft,
  Trash2,
  BookOpen
} from 'lucide-react';
import { AppStep, StudentRecord, MasterConfig, ExamSession } from './types';
import Header from './components/Header';
import StepProgressBar from './components/StepProgressBar';
import MasterKeyUploader from './components/MasterKeyUploader';
import StudentBatchProcessor from './components/StudentBatchProcessor';
import ResultsTable from './components/ResultsTable';
import SystemArchitectureInfo from './components/SystemArchitectureInfo';
import ExamManager from './components/ExamManager';

const App: React.FC = () => {
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.SELECT_EXAM);
  const [showArch, setShowArch] = useState(false);
  const [filterAnomalies, setFilterAnomalies] = useState(false);

  // Load data from LocalStorage on mount
  useEffect(() => {
    const savedExams = localStorage.getItem('school_exams_data');
    if (savedExams) {
      try {
        setExams(JSON.parse(savedExams));
      } catch (e) {
        console.error("Failed to load exams", e);
      }
    }
  }, []);

  // Save data to LocalStorage whenever exams change
  useEffect(() => {
    localStorage.setItem('school_exams_data', JSON.stringify(exams));
  }, [exams]);

  const activeExam = useMemo(() => 
    exams.find(e => e.id === activeExamId) || null
  , [exams, activeExamId]);

  const handleCreateExam = (subject: string, grade: string) => {
    const newExam: ExamSession = {
      id: Math.random().toString(36).substr(2, 9),
      subjectName: subject,
      gradeLevel: grade,
      masterConfig: null,
      studentRecords: [],
      createdAt: Date.now()
    };
    setExams(prev => [...prev, newExam]);
    setActiveExamId(newExam.id);
    setCurrentStep(AppStep.SETUP_MASTER);
  };

  const handleSelectExam = (id: string) => {
    setActiveExamId(id);
    const exam = exams.find(e => e.id === id);
    if (exam?.masterConfig) {
      setCurrentStep(AppStep.PROCESS_STUDENTS);
    } else {
      setCurrentStep(AppStep.SETUP_MASTER);
    }
  };

  const handleDeleteExam = (id: string) => {
    if (window.confirm("ยืนยันการลบวิชานี้และข้อมูลคะแนนทั้งหมด?")) {
      setExams(prev => prev.filter(e => e.id !== id));
      if (activeExamId === id) {
        setActiveExamId(null);
        setCurrentStep(AppStep.SELECT_EXAM);
      }
    }
  };

  const handleMasterUpload = (config: MasterConfig) => {
    setExams(prev => prev.map(e => e.id === activeExamId ? { ...e, masterConfig: config } : e));
    setCurrentStep(AppStep.PROCESS_STUDENTS);
  };

  const handleProcessComplete = (records: StudentRecord[]) => {
    setExams(prev => prev.map(e => e.id === activeExamId ? { ...e, studentRecords: [...e.studentRecords, ...records] } : e));
  };

  const riskyCount = useMemo(() => 
    activeExam?.studentRecords.filter(r => r.results.some(res => res.isAnomalous)).length || 0
  , [activeExam]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Header onShowArch={() => setShowArch(!showArch)} />
      
      {/* Teacher Dashboard Bar - Increased Contrast */}
      <div className="bg-white border-b-2 border-slate-300 sticky top-[72px] z-40 shadow-md">
        <div className="container mx-auto px-4 py-3 max-w-6xl flex flex-wrap gap-2 md:gap-4 items-center">
          <button 
            onClick={() => setCurrentStep(AppStep.SELECT_EXAM)}
            className="flex items-center gap-2 px-4 py-2 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-black text-sm border-2 border-slate-200"
          >
            <ChevronLeft size={18} /> สลับวิชา
          </button>
          
          <div className="h-8 w-[2px] bg-slate-200 mx-2 hidden md:block"></div>

          {activeExam && currentStep !== AppStep.SELECT_EXAM && (
            <>
              <div className="flex flex-col mr-4 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                <span className="text-[10px] font-black text-indigo-600 uppercase">วิชาปัจจุบัน</span>
                <span className="text-sm font-black text-slate-900">{activeExam.subjectName} ({activeExam.gradeLevel})</span>
              </div>

              <button 
                onClick={() => {
                  setCurrentStep(AppStep.PROCESS_STUDENTS);
                  setFilterAnomalies(false);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-black text-sm ${currentStep === AppStep.PROCESS_STUDENTS && !filterAnomalies ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300' : 'text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
              >
                <Camera size={18} /> สแกนเพิ่ม
              </button>
              <button 
                onClick={() => {
                  setCurrentStep(AppStep.PROCESS_STUDENTS);
                  setFilterAnomalies(true);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-black text-sm relative ${filterAnomalies ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-300' : 'text-orange-700 hover:bg-orange-50 border border-orange-200'}`}
              >
                <AlertTriangle size={18} /> ตรวจแผ่นเสี่ยง
                {riskyCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[10px] text-white ring-2 ring-white shadow-sm font-black">
                    {riskyCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setCurrentStep(AppStep.RESULTS)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-black text-sm ${currentStep === AppStep.RESULTS ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300' : 'text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
              >
                <BarChart3 size={18} /> สรุปผล
              </button>
            </>
          )}
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {currentStep !== AppStep.SELECT_EXAM && <StepProgressBar currentStep={currentStep} />}

        <div className="mt-8 bg-white rounded-[40px] shadow-2xl overflow-hidden min-h-[600px] border border-slate-200">
          {currentStep === AppStep.SELECT_EXAM && (
            <ExamManager 
              exams={exams} 
              onSelect={handleSelectExam} 
              onCreate={handleCreateExam} 
              onDelete={handleDeleteExam} 
            />
          )}

          {currentStep === AppStep.SETUP_MASTER && (
            <div className="p-8 md:p-12">
              <div className="text-center mb-10">
                <div className="bg-indigo-100 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6 text-indigo-700 shadow-inner">
                  <PlusCircle size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">ขั้นตอนที่ 1: ตั้งค่าเฉลย</h2>
                <p className="text-slate-600 mt-2 font-bold text-lg">วิชา: {activeExam?.subjectName}</p>
                <p className="text-slate-400 mt-1 font-medium">สแกนเฉลยของครูเพื่อให้ AI เรียนรู้ตำแหน่งช่องคำตอบ</p>
              </div>
              <MasterKeyUploader onComplete={handleMasterUpload} />
            </div>
          )}

          {currentStep === AppStep.PROCESS_STUDENTS && activeExam && (
            <div className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                    {filterAnomalies ? <AlertTriangle className="text-orange-600" /> : <Camera className="text-indigo-700" />}
                    {filterAnomalies ? 'ตรวจสอบแผ่นที่มีปัญหา' : 'ตรวจกระดาษคำตอบนักเรียน'}
                  </h2>
                  <p className="text-slate-700 mt-2 font-black bg-slate-100 px-4 py-1 rounded-full inline-block">
                    {activeExam.subjectName} • {activeExam.gradeLevel}
                  </p>
                </div>
                {!filterAnomalies && (
                  <button 
                    onClick={() => setCurrentStep(AppStep.RESULTS)}
                    className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl flex items-center gap-4 transition-all font-black shadow-xl hover:scale-105 active:scale-95"
                  >
                    ดูสรุปผลคะแนน <ArrowRight size={24} />
                  </button>
                )}
              </div>
              <StudentBatchProcessor 
                masterConfig={activeExam.masterConfig!} 
                onComplete={handleProcessComplete}
                records={activeExam.studentRecords}
                filterAnomalies={filterAnomalies}
              />
            </div>
          )}

          {currentStep === AppStep.RESULTS && activeExam && (
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                    <BarChart3 className="text-indigo-700" size={32} /> สรุปผลคะแนน
                  </h2>
                  <p className="text-slate-600 mt-2 font-bold text-lg">วิชา: {activeExam.subjectName} ({activeExam.gradeLevel})</p>
                </div>
              </div>
              <ResultsTable records={activeExam.studentRecords} />
            </div>
          )}
        </div>

        {showArch && (
          <div className="mt-16">
            <SystemArchitectureInfo />
          </div>
        )}
      </main>

      <footer className="bg-white py-12 border-t-2 border-slate-200 text-center">
        <div className="container mx-auto max-w-6xl px-4">
          <p className="text-slate-900 font-black text-lg mb-2">AI Exam Grader for Thai Schools</p>
          <p className="text-slate-400 font-medium">© 2024 สนับสนุนคุณครูไทยให้ทำงานได้รวดเร็วและแม่นยำด้วยเทคโนโลยี AI</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
