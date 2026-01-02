
import React, { useState, useRef } from 'react';
import { Upload, Camera, CheckCircle, Loader2, X, RefreshCw, AlertCircle } from 'lucide-react';
import { MasterConfig } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface MasterKeyUploaderProps {
  onComplete: (config: MasterConfig) => void;
}

const MasterKeyUploader: React.FC<MasterKeyUploaderProps> = ({ onComplete }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('image/jpeg');
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setErrorMessage("ไม่สามารถเปิดกล้องได้ โปรดตรวจสอบการอนุญาตใช้งานกล้อง");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setStatusMessage('กำลังปรับแต่งภาพ...');
        const compressed = await compressImage(dataUrl);
        setPreview(compressed);
        setFileType('image/jpeg');
        stopCamera();
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMessage(null);
      setFileType(file.type);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const originalBase64 = ev.target?.result as string;
        setStatusMessage('กำลังลดขนาดไฟล์ภาพ...');
        const compressed = await compressImage(originalBase64);
        setPreview(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const processMaster = async () => {
    if (!preview) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Gemini AI กำลังวิเคราะห์เฉลยต้นแบบ...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = preview.split(',')[1];

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
              text: "นี่คือภาพ 'เฉลยต้นแบบ' โปรดวิเคราะห์: 1. หาเลขข้อทั้งหมด 2. ระบุว่าแต่ละข้อมีการกากบาทที่ช่องใด (ก, ข, ค, หรือ ง เท่านั้น) 3. ตรวจสอบให้แน่ใจว่าอ่านครบทุกข้อที่ปรากฏในภาพ",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.INTEGER },
                    answer: { type: Type.STRING, description: "ตัวอักษร ก, ข, ค, หรือ ง เท่านั้น" },
                  },
                  required: ["questionNumber", "answer"]
                }
              }
            },
            required: ["answers"]
          }
        }
      });

      if (!response.text) throw new Error("AI ไม่ส่งข้อมูลตอบกลับ");

      const result = JSON.parse(response.text);
      const correctAnswers: Record<number, string> = {};
      
      if (!result.answers || result.answers.length === 0) {
        throw new Error("ไม่พบรอยกากบาทเฉลยในภาพ โปรดตรวจสอบว่าถ่ายภาพชัดเจนและมีกากบาทเฉลยครบถ้วน");
      }

      result.answers.forEach((item: any) => {
        correctAnswers[item.questionNumber] = (item.answer || "").trim();
      });

      onComplete({
        imageUrl: preview,
        gridData: { rows: result.answers.length, cols: 4 },
        correctAnswers: correctAnswers
      });
    } catch (error: any) {
      console.error("Error processing master key:", error);
      setErrorMessage(error.message || "เกิดข้อผิดพลาดในการวิเคราะห์เฉลย โปรดลองใหม่อีกครั้ง");
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-8 border-2 border-white/30 rounded-lg pointer-events-none"></div>
            <button 
              onClick={stopCamera}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
            >
              <X size={24} />
            </button>
          </div>
          <div className="mt-8 flex gap-6 items-center">
            <button 
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full border-8 border-slate-300 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-indigo-600 rounded-full"></div>
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 text-red-700">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm font-bold">{errorMessage}</div>
        </div>
      )}

      {!preview ? (
        <div className="flex flex-col gap-4">
          <label className="border-4 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center hover:border-indigo-300 transition-colors cursor-pointer group">
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload size={32} />
            </div>
            <span className="text-xl font-bold text-slate-700">อัปโหลดภาพเฉลยต้นแบบ</span>
            <p className="text-slate-400 text-center mt-2">โปรดใช้กระดาษเปล่าที่กากบาทเฉลยไว้ให้ครบ</p>
          </label>
          <div className="flex items-center gap-4 text-slate-400 py-2">
            <hr className="flex-1" />
            <span>หรือ</span>
            <hr className="flex-1" />
          </div>
          <button 
            onClick={startCamera}
            className="flex items-center justify-center gap-3 w-full py-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-colors font-semibold shadow-lg"
          >
            <Camera size={24} /> เปิดกล้องถ่ายภาพจริง
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black aspect-[3/4]">
            <img src={preview} alt="Master Key Preview" className="w-full h-full object-contain opacity-90" />
            {isProcessing && (
              <div className="absolute inset-0 bg-indigo-900/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                <Loader2 size={48} className="animate-spin mb-4 text-indigo-200" />
                <p className="font-bold text-xl">{statusMessage}</p>
                <p className="text-indigo-200 mt-2 text-sm animate-pulse">กรุณารอสักครู่...</p>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => { setPreview(null); setErrorMessage(null); }}
              className="flex-1 py-4 border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              disabled={isProcessing}
            >
              <RefreshCw size={18} /> เปลี่ยนภาพ
            </button>
            <button 
              onClick={processMaster}
              className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              disabled={isProcessing}
            >
              {!isProcessing && <CheckCircle size={20} />}
              {isProcessing ? 'กำลังประมวลผล...' : 'ยืนยันเฉลยนี้'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterKeyUploader;
