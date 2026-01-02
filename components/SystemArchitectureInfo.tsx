
import React from 'react';
import { Layers, Zap, Cpu, Scan, CheckCircle2 } from 'lucide-react';

const SystemArchitectureInfo: React.FC = () => {
  return (
    <div className="bg-slate-900 text-white rounded-3xl p-10 shadow-2xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-500 rounded-2xl">
          <Layers size={28} />
        </div>
        <div>
          <h3 className="text-2xl font-bold">สถาปัตยกรรมระบบ (System Architecture)</h3>
          <p className="text-slate-400">การประมวลผล Image Processing & AI เบื้องหลัง</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="text-indigo-400 mb-4"><Scan size={32} /></div>
          <h4 className="font-bold text-lg mb-2">1. Image Correction</h4>
          <p className="text-sm text-slate-400">
            ใช้ OpenCV (findContours & getPerspectiveTransform) เพื่อค้นหาขอบกระดาษ 
            และดึงภาพให้เป็นสี่เหลี่ยมผืนผ้าสมบูรณ์ (Warped Image) แม้ครูจะถ่ายมาเอียง
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="text-green-400 mb-4"><Zap size={32} /></div>
          <h4 className="font-bold text-lg mb-2">2. Adaptive Thresholding</h4>
          <p className="text-sm text-slate-400">
            แปลงภาพเป็นขาวดำโดยปรับระดับตามแสงเงา (Local mean subtraction) 
            เพื่อให้ตรวจจับหมึกปากกาได้แม่นยำแม้แสงในห้องเรียนจะไม่สม่ำเสมอ
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="text-yellow-400 mb-4"><Cpu size={32} /></div>
          <h4 className="font-bold text-lg mb-2">3. Grid-Based Slicing</h4>
          <p className="text-sm text-slate-400">
            ระบบจะซอยภาพกระดาษเป็น "กล่องคำตอบ" ย่อยๆ ตามตำแหน่งที่ตรวจพบในกระดาษเฉลย (Master Key) 
            และนับจำนวนเม็ดสีดำ (Black Pixel Density) ในแต่ละช่อง
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="text-red-400 mb-4"><CheckCircle2 size={32} /></div>
          <h4 className="font-bold text-lg mb-2">4. Decision Engine</h4>
          <p className="text-sm text-slate-400">
            ถ้า Black Pixels > Threshold (เช่น 15% ของพื้นที่) จะถือว่ามีการทำเครื่องหมาย 
            หากพบเกิน 1 ช่องในข้อเดียว ระบบจะติดธงสีแดงเพื่อให้ครูตรวจสอบด้วยมือ
          </p>
        </div>
      </div>

      <div className="mt-10 p-6 bg-indigo-900/40 rounded-2xl border border-indigo-500/30">
        <h4 className="font-bold text-indigo-300 mb-2 italic">เทคนิคสำหรับปากกาประเภทต่างๆ:</h4>
        <p className="text-slate-300 text-sm leading-relaxed">
          เนื่องจากนักเรียนอาจใช้ปากกาลูกลื่นขีดฆ่าหรือวงกลม ระบบจึงใช้ <strong>Morphological Transformations</strong> (Dilation & Erosion) 
          เพื่อเชื่อมรอยปากกาที่ขาดช่วงให้เป็นปื้นสีเดียวกันก่อนทำการนับพื้นที่หมึก ช่วยเพิ่มความแม่นยำเมื่อนักเรียนใช้ปากกาหัวเล็ก
        </p>
      </div>
    </div>
  );
};

export default SystemArchitectureInfo;
