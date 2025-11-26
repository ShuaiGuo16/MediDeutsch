
export enum Difficulty {
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1'
}

export enum Topic {
  ANATOMY = 'Anatomie',
  CARDIOLOGY = 'Kardiologie',
  EQUIPMENT = 'Instrumente',
  ANAMNESIS = 'Anamnese',
  PHARMACOLOGY = 'Pharmakologie',
  ABBREVIATIONS = 'Abkürzungen',
  NEUROLOGY = 'Neurologie',
  ONCOLOGY = 'Onkologie',
  SURGERY = 'Chirurgie',
  EMERGENCY = 'Notfallmedizin',
  PSYCHIATRY = 'Psychiatrie',
  ADMINISTRATION = 'Verwaltung'
}

export interface Flashcard {
  term: string;
  article: string; // der, die, das
  definition: string; // in German
  exampleSentence: string;
  exampleSentenceEnglish: string; // New field
  englishTranslation: string;
  category: string;
  syllables?: string; // New: e.g. "An-ti-bi-o-ti-kum"
  mastered?: boolean; // New: Learning status
  
  // SRS / Hospital Metaphor Fields
  srsLevel?: number; // 0=Notaufnahme, 1=Intensiv, 2=Station, 3=Reha, 4=Entlassen
  nextReviewDate?: string; // ISO Date string
  lastReviewDate?: string; // ISO Date string
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isAudioPlaying?: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  systemPrompt: string;
  difficulty: Difficulty;
  isCustom?: boolean;
}

export interface CaseQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MedicalCase {
  id: string;
  title: string;
  department: string; // e.g., Innere Medizin
  caseText: string; // The full text (Anamnese + Befund)
  difficulty: Difficulty;
  questions: CaseQuestion[];
}

export interface QuizQuestion {
  id: string;
  type: 'article' | 'translation' | 'definition';
  question: string;
  correctAnswer: string;
  options: string[];
  card: Flashcard;
}

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}
