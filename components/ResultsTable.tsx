
import React from 'react';
import { Download, Search, BarChart3, TrendingUp, Users, Award } from 'lucide-react';
import { StudentRecord } from '../types';

interface ResultsTableProps {
  records: StudentRecord[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ records }) => {
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Name,Score,Total,Status\n";
    records.forEach(r => {
      const status = r.results.some(res => res.isAnomalous) ? "Requires Review" : "Completed";
      csvContent += `${r.studentId},${r.studentName},${r.score},${r.totalQuestions},${status}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "school_exam_results.csv");
    document.body.appendChild(link);
    link.click();
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-24 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
        <p className="text-slate-400 font-bold italic text-lg">ยังไม่มีข้อมูลคะแนน โปรดทำการตรวจกระดาษคำตอบก่อน</p>
      </div>
    );
  }

  const avg = (records.reduce((acc, r) => acc + r.score, 0) / records.length).toFixed(2);
  const max = Math.max(...records.map(r => r.score));

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 flex flex-col justify-between">
          <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6"><Users size={24}/></div>
          <div>
            <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs">จำนวนผู้สอบทั้งหมด</p>
            <p className="text-5xl font-black mt-1">{records.length} <span className="text-xl font-medium">คน</span></p>
          </div>
        </div>
        
        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-100 flex flex-col justify-between">
          <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-green-600"><TrendingUp size={24}/></div>
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">คะแนนเฉลี่ยห้อง</p>
            <p className="text-5xl font-black text-slate-800 mt-1">{avg}</p>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-100 flex flex-col justify-between">
          <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-orange-600"><Award size={24}/></div>
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">คะแนนสูงสุด</p>
            <p className="text-5xl font-black text-slate-800 mt-1">{max}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 p-8 rounded-[32px] shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500 p-3 rounded-2xl text-white"><BarChart3 size={24} /></div>
          <div>
            <h4 className="text-white font-black text-xl">ข้อมูลพร้อมส่งออก</h4>
            <p className="text-indigo-300 text-sm font-medium">ตรวจสอบความถูกต้องก่อนบันทึกเข้าระบบโรงเรียน</p>
          </div>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-green-500 hover:bg-green-400 text-slate-900 px-10 py-4 rounded-2xl flex items-center gap-3 font-black shadow-lg shadow-green-900/20 transition-all w-full sm:w-auto active:scale-95"
        >
          <Download size={24} /> สั่ง Export คะแนน (CSV)
        </button>
      </div>

      <div className="overflow-hidden border border-slate-100 rounded-[32px] shadow-sm bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-widest">รหัสนักเรียน</th>
              <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-widest">ชื่อ-นามสกุล</th>
              <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-widest">คะแนนสุทธิ</th>
              <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-widest">ความก้าวหน้า</th>
              <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-widest text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6 text-slate-500 font-bold">{record.studentId}</td>
                <td className="px-8 py-6 text-slate-800 font-black text-lg">{record.studentName}</td>
                <td className="px-8 py-6">
                  <span className="text-2xl font-black text-indigo-600">{record.score}</span>
                  <span className="text-slate-400 font-bold text-sm"> / {record.totalQuestions}</span>
                </td>
                <td className="px-8 py-6">
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden max-w-[120px]">
                    <div 
                      className={`h-full transition-all duration-1000 ${record.score / record.totalQuestions > 0.5 ? 'bg-green-500' : 'bg-red-400'}`} 
                      style={{ width: `${(record.score / record.totalQuestions) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center mx-auto sm:ml-auto">
                    <Search size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
