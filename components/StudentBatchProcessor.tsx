
import React, { useState, useRef, useMemo } from 'react';
import { Upload, Camera, Loader2, AlertCircle, CheckCircle2, FileX, X, Zap, AlertTriangle, Eye, User, Fingerprint, Layers } from 'lucide-react';
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
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StudentRecord | null>(null);
  const [scanStatus, setScanStatus] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const displayRecords = useMemo(() => {
    let filtered = [...records];
    if (filterAnomalies) {
      filtered = filtered.filter(r => r.results.some(res => res.isAnomalous) || r.studentName === "ไม่ระบุชื่อ");
    }
    return filtered.reverse();
  }, [records, filterAnomalies]);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024; // ปรับลดขนาดเล็กน้อยเพื่อความเร็วในการอัปโหลด
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
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const processImageWithGemini = async (base64Data: string, mimeType: string) => {
    // ALWAYS create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
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
            text: `ในฐานะผู้ช่วยครูชาวไทย:
            1. อ่าน "ชื่อ-นามสกุล" ที่เขียนด้วยลายมือ
            2. อ่าน "เลขที่" หรือ "รหัสประจำตัว" ที่เขียนด้วยลายมือให้แม่นยำที่สุด
            3. ตรวจข้อสอบข้อที่: ${questionList} โดยเทียบกับเฉลยที่ครูให้มา
            4. หากลายมือชื่อหรือเลขที่อ่านยากมาก ให้ตอบว่า "อ่านไม่ออก" และระบุ isAnomalous: true
            5. ตรวจสอบรอยลบ/แก้ไข หากมีการตอบ 2 ช่องในข้อเดียว ให้มาร์ค isAnomalous: true พร้อมระบุเหตุผล "กาซ้ำ"`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studentName: { type: Type.STRING },
            studentId: { type: Type.STRING },
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
      studentId: resultData.studentId || "0",
      score,
      totalQuestions: Object.keys(masterConfig.correctAnswers).length,
      imagePreview: `data:${mimeType};base64,${base64Data}`,
      status: 'completed' as const,
      results: processedResults
    };
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setBatchProgress({ current: 0, total: files.length });
    // Fix: Cast Array.from(files) to File[] to ensure the loop elements are correctly typed as File (Blob)
    const filesArray = Array.from(files) as File[];
    const newRecords: StudentRecord[] = [];

    for (let i = 0; i < filesArray.length; i++) {
      setBatchProgress({ current: i + 1, total: filesArray.length });
      try {
        const file = filesArray[i];
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          // file is now correctly identified as a Blob by TypeScript
          reader.readAsDataURL(file);
        });
        const compressed = await compressImage(base64Data);
        const base64Only = compressed.split(',')[1];
        const record = await processImageWithGemini(base64Only, 'image/jpeg');
        newRecords.push(record);
      } catch (error) {
        console.error("Batch processing error at index", i, error);
        // ข้ามไฟล์ที่เสีย
      }
    }
    
    if (newRecords.length > 0) {
      onComplete(newRecords);
    }
    setIsUploading(false);
    setBatchProgress({ current: 0, total: 0 });
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
      alert("ไม่สามารถเข้าถึงกล้องได้ โปรดตรวจสอบสิทธิ์การใช้งาน");
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowScanner(false);
  };

  const captureAndScan = async () => {
    if (videoRef.current && canvasRef.current && !isScanning) {
      setIsScanning(true);
      setScanStatus('AI กำลังอ่านข้อมูลในแผ่นนี้...');
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
          alert("ไม่สามารถตรวจใบนี้ได้ โปรดถ่ายให้ชัดเจนกว่าเดิม");
        } finally {
          setIsScanning(false);
          setScanStatus('');
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-indigo-500/50">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className={`absolute left-0 right-0 h-1 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)] z-10 ${isScanning ? 'animate-bounce' : 'top-1/2 -translate-y-1/2 opacity-30'}`}></div>
            {isScanning && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="font-bold text-lg">{scanStatus}</p>
                <p className="text-sm opacity-70 mt-2 italic">กรุณารอสักครู่...</p>
              </div>
            )}
            <button onClick={stopScanner} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full" disabled={isScanning}><X size={24} /></button>
          </div>
          <div className="mt-8 flex flex-col items-center gap-4">
            <button onClick={captureAndScan} disabled={isScanning} className={`w-20 h-20 rounded-full border-8 flex items-center justify-center shadow-xl active:scale-95 transition-all ${isScanning ? 'bg-slate-400 border-slate-500' : 'bg-white border-slate-300'}`}><div className={`w-12 h-12 rounded-full ${isScanning ? 'bg-slate-500' : 'bg-indigo-600'}`}></div></button>
            <p className="text-white font-bold text-lg">ถ่ายภาพกระดาษคำตอบ</p>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Result Detail Modal */}
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
                    <span className="text-xs font-black uppercase tracking-tighter tracking-widest">ข้อมูลนักเรียน</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 leading-tight">{selectedRecord.studentName}</h3>
                  <div className="flex items-center gap-2 text-slate-400 pt-1">
                    <Fingerprint size={16} />
                    <p className="font-bold text-sm">เลขที่/รหัส: {selectedRecord.studentId}</p>
                  </div>
                </div>
                <div className="text-right bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-400 uppercase">คะแนนสุทธิ</p>
                  <p className="text-3xl font-black text-indigo-600">{selectedRecord.score}/{selectedRecord.totalQuestions}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2"><Eye size={18} /> ผลการตรวจรายข้อ</h4>
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
              <button onClick={() => setSelectedRecord(null)} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-colors">ปิดหน้าต่างนี้</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Upload Controls */}
      {!filterAnomalies && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-10 flex flex-col items-center justify-center hover:bg-indigo-50 cursor-pointer relative group transition-colors overflow-hidden">
            <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleBatchUpload} disabled={isUploading} />
            {isUploading ? (
              <div className="flex flex-col items-center w-full">
                <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  <span className="text-indigo-600 font-black text-sm">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                </div>
                <p className="text-indigo-600 font-black text-lg">กำลังตรวจใบที่ {batchProgress.current} จาก {batchProgress.total}</p>
                <p className="text-indigo-400 text-sm mt-1 font-medium italic">Gemini AI กำลังวิเคราะห์ลายมือนักเรียน...</p>
                <div className="w-full h-2 bg-indigo-100 rounded-full mt-6 max-w-xs overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-300" 
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Upload size={32} className="text-indigo-600" /></div>
                <span className="text-xl font-black text-slate-800">เลือกรูปกระดาษคำตอบ (ตรวจรวดเดียว)</span>
                <p className="text-slate-500 text-sm mt-2 font-medium">คุณครูสามารถเลือกได้หลายไฟล์พร้อมกันจากแกลเลอรี</p>
              </>
            )}
          </div>
          <button onClick={startScanner} disabled={isUploading} className="bg-indigo-900 rounded-3xl p-10 flex flex-col items-center justify-center hover:bg-black transition-all text-white shadow-xl group">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Camera size={32} /></div>
            <span className="text-xl font-black">สแกนทีละแผ่น (ผ่านกล้อง)</span>
            <p className="text-indigo-200 text-sm mt-2 font-medium text-center">ใช้สำหรับถ่ายภาพใหม่ทันที เหมาะกับใบที่ยังไม่ได้ตรวจ</p>
          </button>
        </div>
      )}

      {/* Processed List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-slate-800 flex items-center gap-3 text-xl">
            {filterAnomalies ? <AlertTriangle className="text-orange-500" /> : <Layers className="text-indigo-600" />}
            {filterAnomalies ? `รายชื่อที่ต้องตรวจสอบเพิ่ม (${displayRecords.length})` : `คลังกระดาษที่ตรวจแล้ว (${records.length} แผ่น)`}
          </h3>
        </div>
        
        {displayRecords.length === 0 ? (
          <div className="py-24 flex flex-col items-center text-slate-300 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
            <FileX size={80} strokeWidth={1} />
            <p className="mt-4 text-xl font-bold text-slate-400 italic">ยังไม่มีข้อมูลการตรวจในส่วนนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayRecords.map((record) => (
              <div key={record.id} onClick={() => setSelectedRecord(record)} className={`group relative bg-white border rounded-[28px] p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col gap-4 border-l-8 ${record.results.some(res => res.isAnomalous) || record.studentName === "ไม่ระบุชื่อ" || record.studentName === "อ่านไม่ออก" ? 'border-orange-500' : 'border-green-500'}`}>
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img src={record.imagePreview} className="w-20 h-24 bg-slate-100 rounded-2xl object-cover" alt="Student" />
                    <div className="absolute -top-2 -right-2 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ring-2 ring-white">
                      #{record.studentId}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 truncate text-lg">{record.studentName}</p>
                    <p className="text-xs font-black text-slate-400 mt-0.5 uppercase tracking-widest">เลขที่: {record.studentId}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="bg-indigo-50 px-3 py-1 rounded-lg">
                        <span className="text-lg font-black text-indigo-700">{record.score}</span>
                        <span className="text-[10px] text-indigo-300 font-bold ml-1">/{record.totalQuestions}</span>
                      </div>
                      {(record.results.some(res => res.isAnomalous) || record.studentName === "อ่านไม่ออก") && (
                        <div className="bg-orange-100 p-1.5 rounded-lg">
                          <AlertTriangle size={16} className="text-orange-500" />
                        </div>
                      )}
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
