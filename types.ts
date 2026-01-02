
export enum AppStep {
  SELECT_EXAM = 'SELECT_EXAM',
  SETUP_MASTER = 'SETUP_MASTER',
  PROCESS_STUDENTS = 'PROCESS_STUDENTS',
  RESULTS = 'RESULTS'
}

export interface QuestionResult {
  questionNumber: number;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  isAnomalous: boolean;
  anomalyReason?: string;
}

export interface StudentRecord {
  id: string;
  studentName: string;
  studentId: string;
  score: number;
  totalQuestions: number;
  results: QuestionResult[];
  imagePreview?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface MasterConfig {
  imageUrl: string;
  gridData: any;
  correctAnswers: Record<number, string>;
}

export interface ExamSession {
  id: string;
  subjectName: string;
  gradeLevel: string;
  masterConfig: MasterConfig | null;
  studentRecords: StudentRecord[];
  createdAt: number;
}
