import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MedicalCase } from '../types';

interface CaseStudyContextType {
  currentCase: MedicalCase | null;
  setCurrentCase: (c: MedicalCase | null) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  selectedDept: string;
  setSelectedDept: (d: string) => void;
  answers: number[];
  setAnswers: (a: number[]) => void;
  showResults: boolean;
  setShowResults: (s: boolean) => void;
  audioCache: Uint8Array | null;
  setAudioCache: (a: Uint8Array | null) => void;
  isAudioLoading: boolean;
  setIsAudioLoading: (l: boolean) => void;
}

const CaseStudyContext = createContext<CaseStudyContextType | undefined>(undefined);

export const CaseStudyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentCase, setCurrentCase] = useState<MedicalCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState('Innere Medizin');
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [audioCache, setAudioCache] = useState<Uint8Array | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  return (
    <CaseStudyContext.Provider value={{
      currentCase, setCurrentCase,
      loading, setLoading,
      selectedDept, setSelectedDept,
      answers, setAnswers,
      showResults, setShowResults,
      audioCache, setAudioCache,
      isAudioLoading, setIsAudioLoading
    }}>
      {children}
    </CaseStudyContext.Provider>
  );
};

export const useCaseStudy = () => {
  const context = useContext(CaseStudyContext);
  if (context === undefined) {
    throw new Error('useCaseStudy must be used within a CaseStudyProvider');
  }
  return context;
};