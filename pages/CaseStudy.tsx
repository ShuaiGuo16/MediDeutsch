import React, { useState, useRef, useEffect } from 'react';
import { FileText, Play, Loader2, CheckCircle, XCircle, ArrowRight, Brain, PlusCircle, Check, Printer } from 'lucide-react';
import { Button } from '../components/Button';
import { generateCaseStudy, generateSpeech, playPcmData } from '../services/geminiService';
import { MedicalCase, Flashcard } from '../types';
import { AddWordModal } from '../components/AddWordModal';
import { useCaseStudy } from '../context/CaseStudyContext';

const DEPARTMENTS = [
  'Innere Medizin',
  'Chirurgie',
  'Neurologie',
  'Notaufnahme',
  'Pädiatrie'
];

export const CaseStudy: React.FC = () => {
  // Use Context for persistent state
  const {
    currentCase, setCurrentCase,
    loading, setLoading,
    selectedDept, setSelectedDept,
    answers, setAnswers,
    showResults, setShowResults,
    audioCache, setAudioCache,
    isAudioLoading, setIsAudioLoading
  } = useCaseStudy();

  const [isPlaying, setIsPlaying] = useState(false);
  
  // Text Selection State (Local is fine as it resets on mount usually)
  const [selectionRect, setSelectionRect] = useState<{top: number, left: number} | null>(null);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Success Toast State
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fetchNewCase = async () => {
    setLoading(true);
    setAnswers([]);
    setShowResults(false);
    setCurrentCase(null);
    setAudioCache(null);
    setSelectionRect(null);
    
    const newCase = await generateCaseStudy(selectedDept);
    setCurrentCase(newCase);
    setLoading(false);

    if (newCase) {
      // Pre-fetch Audio in Background
      setIsAudioLoading(true);
      try {
        const audio = await generateSpeech(newCase.caseText);
        setAudioCache(audio);
      } catch (e) {
        console.error("Background audio generation failed", e);
      } finally {
        setIsAudioLoading(false);
      }
    }
  };

  const handleAudio = async () => {
    if (!currentCase || isPlaying) return;
    
    // Use cache if available, otherwise fetch (if not already fetching)
    if (audioCache) {
      setIsPlaying(true);
      await playPcmData(audioCache);
      setIsPlaying(false);
    } else if (!isAudioLoading) {
      setIsPlaying(true);
      setIsAudioLoading(true);
      try {
        const pcmData = await generateSpeech(currentCase.caseText);
        if (pcmData) {
          setAudioCache(pcmData);
          await playPcmData(pcmData);
        }
      } finally {
        setIsAudioLoading(false);
        setIsPlaying(false);
      }
    }
  };

  const handlePrint = () => {
    if (!currentCase) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Case Study: ${currentCase.title}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; color: #1f2937; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1 { font-family: 'Arial', sans-serif; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px; }
            .meta { font-family: 'Arial', sans-serif; color: #6b7280; font-size: 14px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .content { font-size: 16px; margin-bottom: 40px; text-align: justify; }
            .worksheet { border-top: 1px dashed #cbd5e1; padding-top: 30px; }
            .question { margin-bottom: 20px; break-inside: avoid; }
            .q-text { font-weight: bold; font-family: 'Arial', sans-serif; margin-bottom: 10px; }
            .options { list-style: none; padding: 0; margin-left: 20px; }
            .option { margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
            .checkbox { width: 16px; height: 16px; border: 1px solid #94a3b8; display: inline-block; border-radius: 4px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; font-family: 'Arial', sans-serif; }
          </style>
        </head>
        <body>
          <h1>${currentCase.title}</h1>
          <div class="meta">
            <span>Department: ${currentCase.department}</span>
            <span>Date: ${new Date().toLocaleDateString()}</span>
          </div>
          
          <div class="content">
            ${currentCase.caseText.replace(/\n/g, '<br/>')}
          </div>

          <div class="worksheet">
            <h2 style="font-family: Arial, sans-serif; font-size: 18px; color: #1e3a8a;">Verständnisfragen</h2>
            ${currentCase.questions.map((q, idx) => `
              <div class="question">
                <div class="q-text">${idx + 1}. ${q.text}</div>
                <ul class="options">
                  ${q.options.map(opt => `
                    <li class="option">
                      <span class="checkbox"></span> ${opt}
                    </li>
                  `).join('')}
                </ul>
              </div>
            `).join('')}
          </div>

          <div class="footer">
            MediDeutsch - Clinical Case Worksheet
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleOptionSelect = (qIndex: number, optionIndex: number) => {
    if (showResults) return;
    const newAnswers = [...answers];
    newAnswers[qIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const checkAnswers = () => {
    setShowResults(true);
  };

  // Selection Handling
  const handleTextMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textContainerRef.current) {
      // Don't clear immediately if clicking, let mousedown handler decide
      return;
    }

    const text = selection.toString().trim();
    // Only show for valid single/multi words, avoid huge paragraphs
    if (text.length > 0 && text.length < 50) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Adjust for scroll if needed, but fixed positioning works best relative to viewport
      setSelectionRect({
        top: rect.top - 40, // Position above text
        left: rect.left + (rect.width / 2) - 20 // Center horizontally
      });
      setSelectedTerm(text);
    } else {
      setSelectionRect(null);
    }
  };

  const handleSaveToVocab = (card: Flashcard) => {
    // Direct LocalStorage manipulation to save across routes
    const saved = localStorage.getItem('savedCards');
    const currentCards: Flashcard[] = saved ? JSON.parse(saved) : [];
    
    // Check duplicate
    if (!currentCards.some(c => c.term === card.term)) {
      const newCards = [...currentCards, card];
      localStorage.setItem('savedCards', JSON.stringify(newCards));
      
      // Show Success Toast
      setSaveSuccessMsg(`Added: ${card.term}`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } else {
      // Show Warning Toast
      setSaveSuccessMsg(`Already in list: ${card.term}`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Clean up selection when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Check if click is inside text container OR inside the floating tooltip
      const isInsideText = textContainerRef.current?.contains(target);
      const isInsideTooltip = tooltipRef.current?.contains(target);

      if (!isInsideText && !isInsideTooltip) {
        setSelectionRect(null);
        // Clear browser selection to be clean
        window.getSelection()?.removeAllRanges();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="fixed top-20 right-4 z-50 bg-teal-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-right fade-in">
          <Check className="w-5 h-5" />
          <span className="font-medium">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-indigo-50 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <FileText className="text-indigo-600" />
             Klinik-Fälle
           </h2>
           <p className="text-gray-500 text-sm">Realistische Fallbeispiele und Verständnisfragen.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
           <select 
             value={selectedDept}
             onChange={(e) => setSelectedDept(e.target.value)}
             className="flex-1 md:w-48 bg-gray-50 border border-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
           >
             {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
           </select>
           
           <Button 
             variant="ghost"
             onClick={handlePrint}
             disabled={!currentCase}
             className="text-gray-400 hover:text-indigo-600 !px-2"
             title="Print Case Worksheet"
           >
             <Printer className="w-5 h-5" />
           </Button>

           <Button onClick={fetchNewCase} disabled={loading} variant="primary" className="bg-indigo-600 hover:bg-indigo-700">
             {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Brain className="w-4 h-4" />}
             New Case
           </Button>
        </div>
      </div>

      {loading && (
        <div className="h-64 flex flex-col items-center justify-center text-indigo-400">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="font-medium animate-pulse">Generating patient file...</p>
        </div>
      )}

      {!currentCase && !loading && (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
          <FileText className="w-12 h-12 mb-2 opacity-50" />
          <p>Select a department and click "New Case" to start.</p>
        </div>
      )}

      {currentCase && !loading && (
        <div className="grid md:grid-cols-2 gap-8">
           
           {/* Left Column: The Case File */}
           <div className="space-y-4">
             <div className="bg-white rounded-2xl shadow-lg border-t-4 border-t-indigo-500 overflow-hidden">
                <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                   <div>
                     <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">{currentCase.department}</span>
                     <h3 className="text-lg font-bold text-gray-900 leading-tight">{currentCase.title}</h3>
                   </div>
                   <Button 
                    variant="ghost" 
                    onClick={handleAudio} 
                    className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full !p-3 relative"
                    title={audioCache ? "Play audio" : "Generating audio..."}
                    disabled={isPlaying}
                   >
                     {isAudioLoading && !audioCache ? (
                       <Loader2 className="w-5 h-5 animate-spin" />
                     ) : (
                       <Play className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''} fill-current`} />
                     )}
                     {audioCache && !isPlaying && (
                       <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                       </span>
                     )}
                   </Button>
                </div>
                
                <div 
                  className="p-6 relative"
                  ref={textContainerRef}
                  onMouseUp={handleTextMouseUp}
                >
                  <div className="prose prose-indigo prose-sm max-w-none text-gray-700 font-serif leading-relaxed whitespace-pre-line selection:bg-indigo-100 selection:text-indigo-900">
                    {currentCase.caseText}
                  </div>
                </div>
             </div>
             
             <div className="bg-indigo-50 p-4 rounded-xl text-sm text-indigo-800 border border-indigo-100">
               <strong className="block mb-1">💡 Tipp:</strong>
               Highlight any word in the text to quickly add it to your vocabulary list.
             </div>
           </div>

           {/* Right Column: Quiz */}
           <div className="space-y-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5 text-teal-500" />
                Verständnis-Check
              </h3>
              
              <div className="space-y-6">
                {currentCase.questions.map((q, qIdx) => (
                  <div key={qIdx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="font-medium text-gray-800 mb-4">{qIdx + 1}. {q.text}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = answers[qIdx] === optIdx;
                        const isCorrect = q.correctIndex === optIdx;
                        
                        let btnClass = "w-full text-left p-3 rounded-lg border text-sm transition-all ";
                        
                        if (showResults) {
                          if (isCorrect) btnClass += "bg-green-50 border-green-200 text-green-800 font-medium ";
                          else if (isSelected && !isCorrect) btnClass += "bg-red-50 border-red-200 text-red-800 ";
                          else btnClass += "bg-gray-50 border-gray-100 text-gray-400 opacity-60 ";
                        } else {
                          if (isSelected) btnClass += "bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-300 ";
                          else btnClass += "bg-white border-gray-200 hover:bg-gray-50 text-gray-600 ";
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleOptionSelect(qIdx, optIdx)}
                            disabled={showResults}
                            className={btnClass}
                          >
                            <div className="flex justify-between items-center">
                              <span>{opt}</span>
                              {showResults && isCorrect && <CheckCircle className="w-4 h-4 text-green-600" />}
                              {showResults && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    {showResults && (
                      <div className="mt-3 text-sm bg-gray-50 p-3 rounded-lg text-gray-600 italic border-l-2 border-gray-300">
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!showResults ? (
                <Button 
                  onClick={checkAnswers} 
                  disabled={answers.length < currentCase.questions.length}
                  className="w-full justify-center py-3 text-lg bg-teal-600 hover:bg-teal-700"
                >
                  Check Answers
                </Button>
              ) : (
                <Button 
                  onClick={fetchNewCase}
                  className="w-full justify-center py-3 text-lg bg-indigo-600 hover:bg-indigo-700"
                >
                  Next Case <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              )}
           </div>
        </div>
      )}

      {/* Floating Selection Button */}
      {selectionRect && (
        <div 
          ref={tooltipRef}
          className="fixed z-50 animate-in fade-in zoom-in duration-150"
          style={{ top: selectionRect.top, left: selectionRect.left }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering any parent handlers
              setIsAddModalOpen(true);
              setSelectionRect(null);
            }}
            className="bg-teal-600 text-white px-3 py-1.5 rounded-full shadow-lg hover:bg-teal-700 flex items-center gap-1 text-sm font-bold transform -translate-x-1/2 transition-transform hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" /> Add
          </button>
        </div>
      )}

      <AddWordModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={handleSaveToVocab}
        initialTerm={selectedTerm}
      />
    </div>
  );
};