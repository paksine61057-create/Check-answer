
import React, { useState } from 'react';
import { Plus, BookOpen, Trash2, Calendar, Users, ArrowRight, BookMarked } from 'lucide-react';
import { ExamSession } from '../types';

interface ExamManagerProps {
  exams: ExamSession[];
  onSelect: (id: string) => void;
  onCreate: (subject: string, grade: string) => void;
  onDelete: (id: string) => void;
}

const ExamManager: React.FC<ExamManagerProps> = ({ exams, onSelect, onCreate, onDelete }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject && grade) {
      onCreate(subject, grade);
      setSubject('');
      setGrade('');
      setShowCreateForm(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">ยินดีต้อนรับคุณครู</h2>
          <p className="text-slate-500 mt-1 font-medium text-lg">จัดการวิชาที่ต้องการตรวจข้อสอบ</p>
        </div>
        {!showCreateForm && (
          <button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            <Plus size={24} /> สร้างวิชาตรวจใหม่
          </button>
        )}
      </div>

      {showCreateForm ? (
        <div className="bg-indigo-50 border-2 border-indigo-100 rounded-[32px] p-10 max-w-2xl mx-auto shadow-sm">
          <h3 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
            <BookMarked size={24} /> กรอกข้อมูลรายวิชา
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-indigo-700 uppercase ml-2">ชื่อวิชา</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="เช่น คณิตศาสตร์พื้นฐาน, ภาษาอังกฤษ ปลายภาค"
                className="w-full px-6 py-4 rounded-2xl border-2 border-white focus:border-indigo-500 outline-none transition-all shadow-sm font-bold text-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-indigo-700 uppercase ml-2">ระดับชั้น</label>
              <input 
                type="text" 
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="เช่น ม.3/1, ป.6 ทั้งสายชั้น"
                className="w-full px-6 py-4 rounded-2xl border-2 border-white focus:border-indigo-500 outline-none transition-all shadow-sm font-bold text-lg"
                required
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                type="submit"
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all"
              >
                เริ่มสร้างชุดข้อสอบ
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.length === 0 ? (
            <div className="col-span-full py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
              <BookOpen size={64} strokeWidth={1} />
              <p className="mt-4 text-xl font-bold italic">คุณครูยังไม่ได้สร้างวิชาใดๆ</p>
            </div>
          ) : (
            exams.sort((a, b) => b.createdAt - a.createdAt).map((exam) => (
              <div 
                key={exam.id}
                className="group relative bg-white border-2 border-slate-100 rounded-[32px] p-6 hover:border-indigo-200 hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div onClick={() => onSelect(exam.id)}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <BookOpen size={24} />
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(exam.id);
                      }}
                      className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <h4 className="text-xl font-black text-slate-800 line-clamp-2 leading-tight mb-2">{exam.subjectName}</h4>
                  <p className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-6">{exam.gradeLevel}</p>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-300 uppercase">นักเรียน</span>
                      <span className="text-sm font-black text-slate-700">{exam.studentRecords.length} คน</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onSelect(exam.id)}
                    className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ExamManager;
