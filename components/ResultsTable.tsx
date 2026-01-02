
import React, { useState, useMemo } from 'react';
import { Download, Search, BarChart3, TrendingUp, Users, Award, ArrowUpDown, Filter } from 'lucide-react';
import { StudentRecord } from '../types';

interface ResultsTableProps {
  records: StudentRecord[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ records }) => {
  const [sortConfig, setSortConfig] = useState<{ key: 'studentId' | 'studentName' | 'score', direction: 'asc' | 'desc' }>({
    key: 'studentId',
    direction: 'asc'
  });

  const sortedRecords = useMemo(() => {
    const sortableItems = [...records];
    sortableItems.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // พยายามแปลงเป็นตัวเลขถ้าเป็น ID เพื่อให้เรียง 1, 2, 10 ได้ถูกต้อง
      if (sortConfig.key === 'studentId') {
        const aNum = parseInt(aVal.replace(/\D/g, ''));
        const bNum = parseInt(bVal.replace(/\D/g, ''));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [records, sortConfig]);

  const requestSort = (key: 'studentId' | 'studentName' | 'score') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    // ใช้ \uFEFF เพื่อให้ Excel เปิดภาษาไทยได้ถูกต้อง (BOM)
    let csvContent = "\uFEFFเลขที่/รหัส,ชื่อ-นามสกุล,คะแนน,เต็ม,หมายเหตุ\n";
    sortedRecords.forEach(r => {
      const isAnomalous = r.results.some(res => res.isAnomalous);
      const note = isAnomalous ? "ต้องตรวจสอบใหม่" : "ปกติ";
      csvContent += `"${r.studentId}","${r.studentName}",${r.score},${r.totalQuestions},"${note}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `คะแนน_วิชา_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <h4 className="text-white font-black text-xl">สรุปผลการจัดเรียง</h4>
            <p className="text-indigo-300 text-sm font-medium">คะแนนเรียงตามเลขที่ พร้อมนำไปลงชีตคะแนน</p>
          </div>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-green-500 hover:bg-green-400 text-slate-900 px-10 py-4 rounded-2xl flex items-center gap-3 font-black shadow-lg shadow-green-900/20 transition-all w-full sm:w-auto active:scale-95"
        >
          <Download size={24} /> ส่งออกไฟล์ Excel (CSV)
        </button>
      </div>

      <div className="overflow-hidden border border-slate-100 rounded-[32px] shadow-sm bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th 
                className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => requestSort('studentId')}
              >
                <div className="flex items-center gap-2">
                  เลขที่/รหัส <ArrowUpDown size={14} />
                </div>
              </th>
              <th 
                className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => requestSort('studentName')}
              >
                <div className="flex items-center gap-2">
                  ชื่อ-นามสกุล <ArrowUpDown size={14} />
                </div>
              </th>
              <th 
                className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => requestSort('score')}
              >
                <div className="flex items-center gap-2">
                  คะแนนสุทธิ <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-widest">ระดับคะแนน</th>
              <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-widest text-right">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => {
              const hasAnomaly = record.results.some(res => res.isAnomalous);
              return (
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
                        className={`h-full transition-all duration-1000 ${record.score / record.totalQuestions >= 0.5 ? 'bg-green-500' : 'bg-red-400'}`} 
                        style={{ width: `${(record.score / record.totalQuestions) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {hasAnomaly ? (
                      <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-black rounded-full">ต้องตรวจสอบ</span>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-black rounded-full">เรียบร้อย</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
