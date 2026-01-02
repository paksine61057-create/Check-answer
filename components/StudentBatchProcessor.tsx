
import React, { useState, useRef, useMemo } from 'react';
import { Upload, Camera, Loader2, AlertCircle, CheckCircle2, FileX, X, Zap, AlertTriangle, Eye, User, Fingerprint } from 'lucide-react';
import { MasterConfig, StudentRecord } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface StudentBatchProcessorProps {
  masterConfig: MasterConfig;
  onComplete: (records: StudentRecord[]) => void;
  records: StudentRecord[];
  filterAnomalies?: boolean;
}

const StudentBatchProcessor: React.FC<StudentBatchProcessorProps> = ({ masterConfig, onComplete, records, filterAnomalies = false }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StudentRecord | null>(null);
  const [scanStatus, setScanStatus] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const displayRecords = useMemo(() => {
    let filtered = [...records];
    if (filterAnomalies) {
      filtered = filtered.filter(r => r.results.some(res => res.isAnomalous));
    }
    return filtered.reverse();
  }, [records, filterAnomalies]);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const startScanner = async () => {
    try {
      setShowScanner(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("ไม่สามารถเข้าถึงกล้องได้");
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowScanner(false);
  };

  const processImageWithGemini = async (base64Data: string, mimeType: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const questionList = Object.keys(masterConfig.correctAnswers).join(', ');

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: `คุณคือผู้ช่วยครูอัจฉริยะ โปรดตรวจกระดาษคำตอบนี้อย่างละเอียด:
            1. อ่านชื่อ-นามสกุล ของนักเรียนที่เขียนด้วยลายมือบริเวณหัวกระดาษ (Handwritten Name)
            2. อ่านรหัสประจำตัว หรือเลขที่ ที่เขียนด้วยลายมือ (Student ID / No.)
            3. ตรวจคำตอบข้อที่: ${questionList} โดยเทียบกับเฉลยต้นแบบ
            4. หากชื่อหรือรหัสอ่านไม่ออกจริงๆ ให้ระบุว่า "อ่านไม่ออก" และตั้ง isAnomalous: true
            5. หากมีการแก้ไขคำตอบแต่ดูไม่ออกว่าเลือกข้อไหน ให้ตั้ง isAnomalous: true พร้อมเหตุผล`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studentName: { type: Type.STRING, description: "ชื่อนักเรียนที่อ่านได้จากลายมือ" },
            studentId: { type: Type.STRING, description: "รหัสหรือเลขที่ที่อ่านได้จากลายมือ" },
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.INTEGER },
                  studentAnswer: { type: Type.STRING },
                  isAnomalous: { type: Type.BOOLEAN },
                  anomalyReason: { type: Type.STRING },
                },
                required: ["questionNumber", "studentAnswer", "isAnomalous"]
              }
            }
          },
          required: ["studentName", "studentId", "results"]
        }
      }
    });

    const resultData = JSON.parse(response.text || '{}');
    let score = 0;
    const processedResults = (resultData.results || []).map((res: any) => {
      const qNum = res.questionNumber;
      const rawStudentAns = (res.studentAnswer || "").trim();
      const correctAnswer = (masterConfig.correctAnswers[qNum] || "").trim();
      const isCorrect = !res.isAnomalous && rawStudentAns !== "" && rawStudentAns === correctAnswer;
      if (isCorrect) score++;
      return { ...res, studentAnswer: rawStudentAns, correctAnswer, isCorrect };
    });

    return {
      id: Math.random().toString(36).substr(2, 9),
      studentName: resultData.studentName || "ไม่ระบุชื่อ",
      studentId: resultData.studentId || "ไม่ระบุ ID",
      score,
      totalQuestions: Object.keys(masterConfig.correctAnswers).length,
      imagePreview: `data:${mimeType};base64,${base64Data}`,
      status: 'completed' as const,
      results: processedResults
    };
  };

  const captureAndScan = async () => {
    if (videoRef.current && canvasRef.current && !isScanning) {
      setIsScanning(true);
      setScanStatus('กำลังอ่านลายมือชื่อและตรวจคำตอบ...');
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const fullDataUrl = canvas.toDataURL('image/jpeg');
        const compressed = await compressImage(fullDataUrl);
        const base64Only = compressed.split(',')[1];
        
        try {
          const record = await processImageWithGemini(base64Only, 'image/jpeg');
          onComplete([record]);
        } catch (error) {
          console.error("Scanning error:", error);
          alert("การประมวลผลล้มเหลว โปรดลองใหม่อีกครั้ง");
        } finally {
          setIsScanning(false);
          setScanStatus('');
        }
      }
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    const filesArray = Array.from(files) as File[];
    const newRecords: StudentRecord[] = [];

    for (const file of filesArray) {
      try {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
        const compressed = await compressImage(base64Data);
        const base64Only = compressed.split(',')[1];
        const record = await processImageWithGemini(base64Only, 'image/jpeg');
        newRecords.push(record);
      } catch (error) {
        console.error("Batch error:", error);
      }
    }
    onComplete(newRecords);
    setIsUploading(false);
  };

  return (
    <div className="space-y-8">
      {showScanner && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-indigo-500/50">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className={`absolute left-0 right-0 h-1 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)] z-10 ${isScanning ? 'animate-bounce' : 'top-1/2 -translate-y-1/2 opacity-30'}`}></div>
            {isScanning && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="font-bold text-lg">{scanStatus}</p>
                <p className="text-sm opacity-70 mt-2 italic">Gemini AI กำลังอ่านลายมือนักเรียน...</p>
              </div>
            )}
            <button onClick={stopScanner} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full" disabled={isScanning}><X size={24} /></button>
          </div>
          <div className="mt-8 flex flex-col items-center gap-4">
            <button onClick={captureAndScan} disabled={isScanning} className={`w-20 h-20 rounded-full border-8 flex items-center justify-center shadow-xl active:scale-95 transition-all ${isScanning ? 'bg-slate-400 border-slate-500' : 'bg-white border-slate-300'}`}><div className={`w-12 h-12 rounded-full ${isScanning ? 'bg-slate-500' : 'bg-indigo-600'}`}></div></button>
            <p className="text-white font-bold text-lg">ถ่ายภาพหัวกระดาษให้ชัดเจน</p>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            <div className="bg-slate-900 flex-1 flex items-center justify-center relative min-h-[300px]">
              <img src={selectedRecord.imagePreview} className="max-w-full max-h-full object-contain" alt="Full Preview" />
              <button onClick={() => setSelectedRecord(null)} className="absolute top-4 left-4 bg-white/20 text-white p-2 rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-start border-b pb-6 mb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <User size={18} />
                    <span className="text-xs font-black uppercase tracking-tighter">ชื่อที่ AI อ่านได้จากลายมือ</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 leading-tight">{selectedRecord.studentName}</h3>
                  <div className="flex items-center gap-2 text-slate-400 pt-1">
                    <Fingerprint size={16} />
                    <p className="font-bold text-sm">เลขที่/ID: {selectedRecord.studentId}</p>
                  </div>
                </div>
                <div className="text-right bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-400 uppercase">คะแนนสุทธิ</p>
                  <p className="text-3xl font-black text-indigo-600">{selectedRecord.score}/{selectedRecord.totalQuestions}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2"><Eye size={18} /> ตรวจสอบรายข้อ</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedRecord.results.map((res, i) => (
                    <div key={i} className={`p-4 rounded-2xl flex items-center justify-between border ${res.isAnomalous ? 'bg-orange-50 border-orange-200' : res.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div>
                        <span className="font-black text-slate-800">ข้อ {res.questionNumber}:</span>
                        <span className="ml-2 font-medium">ตอบ {res.studentAnswer || "-"} (เฉลย {res.correctAnswer})</span>
                        {res.isAnomalous && <p className="text-[10px] text-orange-600 font-black mt-1 italic">⚠ {res.anomalyReason}</p>}
                      </div>
                      {res.isAnomalous ? <AlertTriangle className="text-orange-500" size={20} /> : res.isCorrect ? <CheckCircle2 className="text-green-600" size={20} /> : <X className="text-red-500" size={20} />}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-colors">ยืนยันข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {!filterAnomalies && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-10 flex flex-col items-center justify-center hover:bg-indigo-50 cursor-pointer relative group">
            <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleBatchUpload} disabled={isUploading} />
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 size={48} className="animate-spin text-indigo-600" />
                <p className="mt-4 text-indigo-600 font-black">AI กำลังอ่านชื่อและตรวจคำตอบ...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Upload size={32} className="text-indigo-600" /></div>
                <span className="text-xl font-black text-slate-800">อัปโหลดภาพจำนวนมาก</span>
                <p className="text-slate-500 text-sm mt-2 font-medium">เลือกหลายไฟล์พร้อมกันจากเครื่อง</p>
              </>
            )}
          </div>
          <button onClick={startScanner} disabled={isUploading} className="bg-indigo-900 rounded-3xl p-10 flex flex-col items-center justify-center hover:bg-black transition-all text-white shadow-xl group">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Camera size={32} /></div>
            <span className="text-xl font-black">เปิดโหมดสแกนเพิ่ม</span>
            <p className="text-indigo-200 text-sm mt-2 font-medium">ใช้กล้องมือถือถ่ายเพื่ออ่านชื่อและตรวจทันที</p>
          </button>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-black text-slate-800 flex items-center gap-3 text-xl">
          {filterAnomalies ? <AlertTriangle className="text-orange-500" /> : <CheckCircle2 className="text-green-500" />}
          {filterAnomalies ? `รายการที่ AI อ่านชื่อไม่ออก (${displayRecords.length})` : `ผลการตรวจล่าสุด (${records.length} แผ่น)`}
        </h3>
        {displayRecords.length === 0 ? (
          <div className="py-24 flex flex-col items-center text-slate-300 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
            <FileX size={80} strokeWidth={1} />
            <p className="mt-4 text-xl font-bold text-slate-400">ยังไม่มีรายการตรวจ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayRecords.map((record) => (
              <div key={record.id} onClick={() => setSelectedRecord(record)} className={`group relative bg-white border rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col gap-4 border-l-8 ${record.results.some(res => res.isAnomalous) || record.studentName === "ไม่ระบุชื่อ" ? 'border-orange-500' : 'border-green-500'}`}>
                <div className="flex items-start gap-4">
                  <img src={record.imagePreview} className="w-20 h-24 bg-slate-100 rounded-2xl object-cover" alt="Student" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 truncate text-lg">{record.studentName}</p>
                    <p className="text-xs font-black text-slate-400 mt-0.5 uppercase tracking-tighter">เลขที่/ID: {record.studentId}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-black text-indigo-700">{record.score}/{record.totalQuestions}</span>
                      {record.studentName === "อ่านไม่ออก" && <AlertTriangle size={16} className="text-orange-500 animate-pulse" />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentBatchProcessor;
