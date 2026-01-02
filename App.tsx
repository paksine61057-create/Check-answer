
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
    setExams([...exams, newExam]);
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
    if (confirm("ยืนยันการลบวิชานี้และข้อมูลคะแนนทั้งหมด?")) {
      setExams(exams.filter(e => e.id !== id));
      if (activeExamId === id) {
        setActiveExamId(null);
        setCurrentStep(AppStep.SELECT_EXAM);
      }
    }
  };

  const handleMasterUpload = (config: MasterConfig) => {
    setExams(exams.map(e => e.id === activeExamId ? { ...e, masterConfig: config } : e));
    setCurrentStep(AppStep.PROCESS_STUDENTS);
  };

  const handleProcessComplete = (records: StudentRecord[]) => {
    setExams(exams.map(e => e.id === activeExamId ? { ...e, studentRecords: [...e.studentRecords, ...records] } : e));
  };

  const riskyCount = useMemo(() => 
    activeExam?.studentRecords.filter(r => r.results.some(res => res.isAnomalous)).length || 0
  , [activeExam]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header onShowArch={() => setShowArch(!showArch)} />
      
      {/* Teacher Dashboard Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-[72px] z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3 max-w-6xl flex flex-wrap gap-2 md:gap-4 items-center">
          <button 
            onClick={() => setCurrentStep(AppStep.SELECT_EXAM)}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-bold text-sm border border-slate-200"
          >
            <ChevronLeft size={18} /> สลับวิชา
          </button>
          
          <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden md:block"></div>

          {activeExam && currentStep !== AppStep.SELECT_EXAM && (
            <>
              <div className="flex flex-col mr-4">
                <span className="text-[10px] font-black text-indigo-500 uppercase">กำลังตรวจวิชา</span>
                <span className="text-sm font-bold text-slate-800">{activeExam.subjectName} ({activeExam.gradeLevel})</span>
              </div>

              <button 
                onClick={() => {
                  setCurrentStep(AppStep.PROCESS_STUDENTS);
                  setFilterAnomalies(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-bold text-sm ${currentStep === AppStep.PROCESS_STUDENTS && !filterAnomalies ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Camera size={18} /> สแกนเพิ่ม
              </button>
              <button 
                onClick={() => {
                  setCurrentStep(AppStep.PROCESS_STUDENTS);
                  setFilterAnomalies(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-bold text-sm relative ${filterAnomalies ? 'bg-orange-500 text-white shadow-md' : 'text-slate-600 hover:bg-orange-50 text-orange-600'}`}
              >
                <AlertTriangle size={18} /> ตรวจแผ่นเสี่ยง
                {riskyCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white ring-2 ring-white">
                    {riskyCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setCurrentStep(AppStep.RESULTS)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-bold text-sm ${currentStep === AppStep.RESULTS ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <BarChart3 size={18} /> สรุปผล
              </button>
            </>
          )}
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {currentStep !== AppStep.SELECT_EXAM && <StepProgressBar currentStep={currentStep} />}

        <div className="mt-8 bg-white rounded-3xl shadow-xl overflow-hidden min-h-[500px] border border-slate-100">
          {currentStep === AppStep.SELECT_EXAM && (
            <ExamManager 
              exams={exams} 
              onSelect={handleSelectExam} 
              onCreate={handleCreateExam} 
              onDelete={handleDeleteExam} 
            />
          )}

          {currentStep === AppStep.SETUP_MASTER && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <PlusCircle size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">ขั้นตอนที่ 1: ตั้งค่าเฉลย [{activeExam?.subjectName}]</h2>
                <p className="text-slate-500 mt-2 font-medium">สแกนเฉลยของครูเพื่อให้ AI เรียนรู้ตำแหน่งช่องคำตอบ</p>
              </div>
              <MasterKeyUploader onComplete={handleMasterUpload} />
            </div>
          )}

          {currentStep === AppStep.PROCESS_STUDENTS && activeExam && (
            <div className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    {filterAnomalies ? <AlertTriangle className="text-orange-500" /> : <Camera className="text-indigo-600" />}
                    {filterAnomalies ? 'แผ่นที่มีความผิดปกติ' : 'ตรวจกระดาษคำตอบ'}
                  </h2>
                  <p className="text-slate-500 mt-1 font-medium">{activeExam.subjectName} - {activeExam.gradeLevel}</p>
                </div>
                {!filterAnomalies && (
                  <button 
                    onClick={() => setCurrentStep(AppStep.RESULTS)}
                    className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl flex items-center gap-3 transition-all font-bold shadow-lg"
                  >
                    ดูสรุปผลคะแนน <ArrowRight size={20} />
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
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <BarChart3 className="text-indigo-600" /> สรุปผลคะแนน [{activeExam.subjectName}]
                  </h2>
                  <p className="text-slate-500 mt-1 font-medium">วิเคราะห์สถิติและส่งออกคะแนนเข้าสู่ระบบบริหารจัดการของโรงเรียน</p>
                </div>
              </div>
              <ResultsTable records={activeExam.studentRecords} />
            </div>
          )}
        </div>

        {showArch && (
          <div className="mt-12">
            <SystemArchitectureInfo />
          </div>
        )}
      </main>

      <footer className="bg-white py-8 border-t border-slate-200 text-center text-slate-400 text-sm font-medium">
        <div className="container mx-auto max-w-6xl">
          <p>© 2024 AI Exam Grader - สนับสนุนคุณครูไทยให้ทำงานได้รวดเร็วและแม่นยำ</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
