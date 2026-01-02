
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
    <div className="p-8 md:p-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">คลังรายวิชาของคุณครู</h2>
          <p className="text-slate-600 mt-2 font-bold text-xl">เลือกวิชาที่ต้องการตรวจหรือสร้างวิชาใหม่</p>
        </div>
        {!showCreateForm && (
          <button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-4 bg-indigo-700 hover:bg-indigo-800 text-white px-10 py-5 rounded-2xl font-black shadow-2xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={28} strokeWidth={3} /> สร้างวิชาใหม่
          </button>
        )}
      </div>

      {showCreateForm ? (
        <div className="bg-indigo-50 border-4 border-indigo-200 rounded-[40px] p-12 max-w-2xl mx-auto shadow-xl">
          <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
            <BookMarked size={32} /> ข้อมูลวิชาใหม่
          </h3>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-black text-indigo-700 uppercase ml-3 tracking-widest">ชื่อรายวิชา</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="เช่น ภาษาไทย ม.1, วิทยาศาสตร์พื้นฐาน"
                className="w-full px-8 py-5 rounded-3xl border-4 border-white focus:border-indigo-600 outline-none transition-all shadow-md font-black text-xl placeholder:text-slate-300"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-black text-indigo-700 uppercase ml-3 tracking-widest">ระดับชั้น / ห้อง</label>
              <input 
                type="text" 
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="เช่น ป.5/2, ม.ต้น"
                className="w-full px-8 py-5 rounded-3xl border-4 border-white focus:border-indigo-600 outline-none transition-all shadow-md font-black text-xl placeholder:text-slate-300"
                required
              />
            </div>
            <div className="flex gap-6 pt-6">
              <button 
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 py-5 text-slate-700 font-black hover:bg-slate-200 rounded-3xl transition-colors text-lg"
              >
                ยกเลิก
              </button>
              <button 
                type="submit"
                className="flex-[2] py-5 bg-indigo-700 text-white rounded-3xl font-black shadow-xl hover:bg-indigo-800 transition-all text-xl"
              >
                เริ่มสร้างชุดข้อสอบ
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {exams.length === 0 ? (
            <div className="col-span-full py-32 bg-slate-50 rounded-[48px] border-4 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
              <div className="bg-white p-8 rounded-full shadow-inner mb-6">
                <BookOpen size={80} strokeWidth={1} className="text-slate-300" />
              </div>
              <p className="text-2xl font-black text-slate-500">คุณครูยังไม่ได้เริ่มสร้างวิชาใดๆ</p>
              <p className="text-slate-400 mt-2 font-bold">กดปุ่มสีม่วงด้านบนเพื่อเริ่มตรวจแผ่นแรกได้เลยครับ!</p>
            </div>
          ) : (
            exams.sort((a, b) => b.createdAt - a.createdAt).map((exam) => (
              <div 
                key={exam.id}
                className="group relative bg-white border-2 border-slate-200 rounded-[40px] p-8 hover:border-indigo-400 hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div onClick={() => onSelect(exam.id)}>
                  <div className="flex justify-between items-start mb-8">
                    <div className="bg-indigo-100 text-indigo-700 p-4 rounded-[24px] group-hover:bg-indigo-700 group-hover:text-white transition-all shadow-sm">
                      <BookOpen size={32} />
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(exam.id);
                      }}
                      className="text-slate-300 hover:text-red-600 p-3 transition-colors bg-slate-50 rounded-2xl hover:bg-red-50"
                      title="ลบรายวิชา"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 line-clamp-2 leading-tight mb-3 group-hover:text-indigo-700 transition-colors">{exam.subjectName}</h4>
                  <div className="bg-slate-100 px-4 py-1 rounded-full inline-block mb-8">
                    <p className="text-slate-600 font-black text-xs uppercase tracking-tighter tracking-widest">{exam.gradeLevel}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t-2 border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ตรวจแล้ว</span>
                    <span className="text-xl font-black text-slate-900">{exam.studentRecords.length} แผ่น</span>
                  </div>
                  <button 
                    onClick={() => onSelect(exam.id)}
                    className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-indigo-700 transition-all shadow-lg group-hover:scale-110 active:scale-95"
                  >
                    <ArrowRight size={28} />
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
