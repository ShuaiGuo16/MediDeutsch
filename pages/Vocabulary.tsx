
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BookOpen, RefreshCw, Loader2, Bookmark, Sparkles, Plus, UploadCloud, FileText, CheckSquare, Trash2, HelpCircle, Filter, AlertCircle, Download, Search, Trophy, ArrowRight, XCircle, CheckCircle, Eye, EyeOff, Printer, Stethoscope, Ambulance } from 'lucide-react';
import { Flashcard, Topic, QuizQuestion } from '../types';
import { generateFlashcards, generateFlashcardsFromTerms } from '../services/geminiService';
import { calculateNextReview, isCardDue, getWardName } from '../services/srsService';
import { FlashcardItem } from '../components/FlashcardItem';
import { Button } from '../components/Button';
import { AddWordModal } from '../components/AddWordModal';

type ViewMode = 'discover' | 'saved' | 'quiz' | 'visite';

const DEMO_CARDS: Flashcard[] = [
  { term: 'Blinddarm', article: 'der', definition: 'Kleiner Wurmfortsatz am Anfang des Dickdarms.', englishTranslation: 'Appendix', exampleSentence: 'Der Patient hat Verdacht auf Blinddarmentzündung.', exampleSentenceEnglish: 'The patient has suspected appendicitis.', category: 'Anatomie', syllables: 'Blind·darm', srsLevel: 0 },
  { term: 'Blutdruck', article: 'der', definition: 'Der Druck des Blutes in den Gefäßen.', englishTranslation: 'Blood pressure', exampleSentence: 'Bitte messen Sie den Blutdruck stündlich.', exampleSentenceEnglish: 'Please measure the blood pressure every hour.', category: 'Kardiologie', syllables: 'Blut·druck', srsLevel: 0 },
  { term: 'Übelkeit', article: 'die', definition: 'Gefühl, sich übergeben zu müssen.', englishTranslation: 'Nausea', exampleSentence: 'Sie klagt über starke Übelkeit nach dem Essen.', exampleSentenceEnglish: 'She complains of severe nausea after eating.', category: 'Symptome', syllables: 'Ü·bel·keit', srsLevel: 0 },
  { term: 'Skalpell', article: 'das', definition: 'Kleines, sehr scharfes chirurgisches Messer.', englishTranslation: 'Scalpel', exampleSentence: 'Reichen Sie mir bitte das Skalpell.', exampleSentenceEnglish: 'Please hand me the scalpel.', category: 'Instrumente', syllables: 'Skal·pell', srsLevel: 0 },
  { term: 'Lungenentzündung', article: 'die', definition: 'Entzündung des Lungengewebes.', englishTranslation: 'Pneumonia', exampleSentence: 'Die Röntgenaufnahme bestätigt eine Lungenentzündung.', exampleSentenceEnglish: 'The X-ray confirms pneumonia.', category: 'Pulmologie', syllables: 'Lun·gen·ent·zün·dung', srsLevel: 0 },
];

export const Vocabulary: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('saved');
  const [topic, setTopic] = useState<Topic>(Topic.ANATOMY);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Persistent Storage for Saved Cards
  const [savedCards, setSavedCards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem('savedCards');
    return saved ? JSON.parse(saved) : [];
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [hideMastered, setHideMastered] = useState(false); // Default to false to see demo cards better

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [deleteConfirmState, setDeleteConfirmState] = useState<'idle' | 'confirming'>('idle');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportHelp, setShowImportHelp] = useState(false);

  // Visite (Review) State
  const [visiteQueue, setVisiteQueue] = useState<Flashcard[]>([]);
  const [currentVisiteCard, setCurrentVisiteCard] = useState<Flashcard | null>(null);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('savedCards', JSON.stringify(savedCards));
  }, [savedCards]);

  // Initial load for discover mode
  useEffect(() => {
    if (viewMode === 'discover' && generatedCards.length === 0) {
      fetchCards(Topic.ANATOMY);
    }
  }, [viewMode]);

  const getLoadingMessage = () => {
    const msgs = [
      "Paging Dr. AI...",
      "Deciphering handwriting...",
      "Sterilizing instruments...",
      "Checking vital signs...",
      "Consulting the Chief Physician...",
      "Preparing the operating theatre...",
      "Reviewing patient charts..."
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  };

  const uniqueCategories = useMemo(() => {
    const cats = new Set(savedCards.map(c => c.category || 'General').map(c => c.trim()));
    return ['All', ...Array.from(cats).sort()];
  }, [savedCards]);

  const filteredSavedCards = useMemo(() => {
    let result = savedCards;
    if (hideMastered) {
      result = result.filter(c => !c.mastered);
    }
    if (selectedCategory !== 'All') {
      result = result.filter(c => (c.category || 'General').trim() === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.term.toLowerCase().includes(q) || 
        c.englishTranslation.toLowerCase().includes(q) ||
        c.definition.toLowerCase().includes(q)
      );
    }
    return result;
  }, [savedCards, selectedCategory, searchQuery, hideMastered]);

  // Calculate Due Cards
  const dueCards = useMemo(() => {
    return savedCards.filter(isCardDue);
  }, [savedCards]);

  const fetchCards = async (selectedTopic: Topic) => {
    setLoading(true);
    setLoadingMessage(getLoadingMessage());
    const interval = setInterval(() => setLoadingMessage(getLoadingMessage()), 2000);

    const existingTerms = savedCards.map(c => c.term);
    const newCards = await generateFlashcards(selectedTopic, 6, existingTerms); 
    const uniqueCards = newCards.filter(
      newCard => !existingTerms.some(
        saved => saved.toLowerCase() === newCard.term.toLowerCase()
      )
    );
    setGeneratedCards(uniqueCards);
    
    clearInterval(interval);
    setLoading(false);
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTopic = e.target.value as Topic;
    setTopic(newTopic);
    fetchCards(newTopic);
  };

  const toggleSaveCard = (card: Flashcard) => {
    const exists = savedCards.some(c => c.term === card.term);
    if (exists) {
      setSavedCards(prev => prev.filter(c => c.term !== card.term));
    } else {
      // Add new card with default SRS level 0
      setSavedCards(prev => [...prev, { ...card, srsLevel: 0 }]);
    }
  };

  const toggleMasterCard = (card: Flashcard) => {
    setSavedCards(prev => prev.map(c => {
      if (c.term === card.term) {
        return { ...c, mastered: !c.mastered, srsLevel: !c.mastered ? 4 : 2 }; // Jump to level 4 or back to 2
      }
      return c;
    }));
  };

  const handleSaveNewCard = (card: Flashcard) => {
     toggleSaveCard(card);
  };

  const handleLoadDemo = () => {
    setSavedCards([...savedCards, ...DEMO_CARDS]);
  };

  // --- VISITE (REVIEW) LOGIC ---
  const startVisite = () => {
    if (dueCards.length === 0) return;
    setVisiteQueue([...dueCards]);
    setCurrentVisiteCard(dueCards[0]);
    setViewMode('visite');
  };

  const handleVisiteGrade = (card: Flashcard, grade: 'again' | 'hard' | 'good' | 'easy') => {
    // Calculate new schedule
    const currentLevel = card.srsLevel || 0;
    const { level, nextDate } = calculateNextReview(currentLevel, grade);

    // Update Card in State
    setSavedCards(prev => prev.map(c => {
      if (c.term === card.term) {
        return {
          ...c,
          srsLevel: level,
          nextReviewDate: nextDate,
          lastReviewDate: new Date().toISOString(),
          mastered: level === 4 // Auto master if level 4
        };
      }
      return c;
    }));

    // Move to next card in queue
    const nextQueue = visiteQueue.slice(1);
    setVisiteQueue(nextQueue);
    
    if (nextQueue.length > 0) {
      setCurrentVisiteCard(nextQueue[0]);
    } else {
      // Finished
      setViewMode('saved');
    }
  };

  // --- QUIZ LOGIC (Simplified for brevity) ---
  const startQuiz = () => { /* ... existing quiz logic ... */ };
  
  // --- PRINT LOGIC ---
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>MediDeutsch Vocabulary List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th { text-align: left; background-color: #f0fdfa; padding: 12px; border-bottom: 2px solid #ccfbf1; color: #134e4a; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
            .art-der { color: #2563eb; font-weight: bold; }
            .art-die { color: #e11d48; font-weight: bold; }
            .art-das { color: #059669; font-weight: bold; }
            .term { font-weight: bold; font-size: 1.1em; }
            .meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
          </style>
        </head>
        <body>
          <h1>Meine Wortschatzliste (${filteredSavedCards.length})</h1>
          <table>
            <thead>
              <tr>
                <th width="25%">Term</th>
                <th width="25%">Translation</th>
                <th width="50%">Definition & Example</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSavedCards.map(c => `
                <tr>
                  <td>
                    <span class="art-${c.article.toLowerCase()}">${c.article}</span> 
                    <span class="term">${c.term}</span>
                    <div class="meta">${c.syllables || ''}</div>
                  </td>
                  <td>${c.englishTranslation}</td>
                  <td>
                    <div>${c.definition}</div>
                    <div style="margin-top: 8px; font-style: italic; color: #4b5563;">"${c.exampleSentence}"</div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- RENDER HELPERS ---
  const isCardSaved = (card: Flashcard) => savedCards.some(c => c.term === card.term);

  // Stats for "Hospital Status"
  const stats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    savedCards.forEach(c => {
      const lvl = c.srsLevel || 0;
      if (lvl >= 0 && lvl <= 4) counts[lvl]++;
    });
    return counts;
  }, [savedCards]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
             <BookOpen className="text-teal-600" />
             Vocabulary Hospital
           </h2>
           <p className="text-gray-500 mt-1">Manage your patients (words) and perform daily rounds.</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
           <button 
             onClick={() => setViewMode('saved')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'saved' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-50'}`}
           >
             <Bookmark className="w-4 h-4" /> My Ward
             {savedCards.length > 0 && (
               <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{savedCards.length}</span>
             )}
           </button>
           <button 
             onClick={() => setViewMode('discover')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'discover' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-50'}`}
           >
             <Sparkles className="w-4 h-4" /> Discover
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-teal-50 min-h-[500px]">
        
        {/* VISITE MODE */}
        {viewMode === 'visite' && currentVisiteCard && (
          <div className="max-w-md mx-auto py-10">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full font-bold text-sm mb-2">
                <Stethoscope className="w-4 h-4" /> Morning Rounds (Visite)
              </div>
              <p className="text-gray-500 text-sm">
                Patient {savedCards.length - visiteQueue.length + 1} of {savedCards.length - (savedCards.length - visiteQueue.length - 1)}
              </p>
            </div>

            <FlashcardItem 
              card={currentVisiteCard} 
              isSaved={true}
              isReviewMode={true}
              onGrade={handleVisiteGrade}
            />
            
            <div className="mt-8 text-center">
              <Button onClick={() => setViewMode('saved')} variant="ghost" className="text-gray-400">
                End Rounds Early
              </Button>
            </div>
          </div>
        )}

        {viewMode === 'saved' && (
          <div className="space-y-6">
             {/* Hospital Status Dashboard */}
             {savedCards.length > 0 && (
               <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
                 {['Notaufnahme', 'Intensiv', 'Station', 'Reha', 'Entlassen'].map((ward, idx) => (
                   <div key={ward} className={`p-3 rounded-xl border text-center ${idx === 0 ? 'bg-red-50 border-red-100 text-red-800' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                      <div className="text-xs font-bold uppercase tracking-wider mb-1">{ward}</div>
                      <div className="text-xl font-bold">{stats[idx] || 0}</div>
                   </div>
                 ))}
               </div>
             )}

             {/* Due Cards Banner */}
             {dueCards.length > 0 && (
               <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
                 <div className="flex items-center gap-4">
                   <div className="bg-rose-100 p-3 rounded-full text-rose-600">
                     <Ambulance className="w-6 h-6 animate-pulse" />
                   </div>
                   <div>
                     <h3 className="text-lg font-bold text-gray-900">{dueCards.length} Patients Need Attention</h3>
                     <p className="text-rose-700 text-sm">Start your morning rounds to check on their status.</p>
                   </div>
                 </div>
                 <Button onClick={startVisite} className="bg-rose-600 hover:bg-rose-700 text-white border-none shadow-lg shadow-rose-200">
                   <Stethoscope className="w-4 h-4 mr-2" /> Start Visite
                 </Button>
               </div>
             )}

             {/* Filter & Toolbar */}
             <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center pb-4 border-b border-gray-100 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                     <input 
                       type="text" 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       placeholder="Find patient..."
                       className="pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-48"
                     />
                  </div>
                  
                  {/* Category Filter */}
                  <select 
                     value={selectedCategory}
                     onChange={(e) => setSelectedCategory(e.target.value)}
                     className="py-1.5 pl-3 pr-8 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                     {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <Button type="button" onClick={() => setIsModalOpen(true)} variant="outline" className="text-xs !py-1.5 flex-1 sm:flex-none">
                    <Plus className="w-4 h-4" /> Add Patient
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                   <Button 
                      onClick={() => setHideMastered(!hideMastered)} 
                      variant="ghost" 
                      className={`text-xs !py-1.5 ${hideMastered ? 'text-teal-700 bg-teal-50' : 'text-gray-500'}`}
                      title={hideMastered ? "Show All" : "Hide Mastered"}
                   >
                     {hideMastered ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                     {hideMastered ? 'Hidden' : 'All'}
                   </Button>
                   <Button onClick={handlePrint} variant="ghost" className="text-xs text-gray-500 hover:text-indigo-600" title="Print List">
                      <Printer className="w-4 h-4" />
                   </Button>
                </div>
             </div>
             
             {/* Card Grid */}
             {savedCards.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                 <div className="bg-gray-100 p-6 rounded-full mb-6">
                    <Ambulance className="w-12 h-12 text-gray-300" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-700 mb-2">Your Hospital is Empty</h3>
                 <p className="max-w-sm text-center mb-8">
                   Admit your first patients to start learning.
                 </p>
                 
                 <div className="flex gap-4">
                   <Button onClick={() => setViewMode('discover')} variant="primary" className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-200">
                     <Sparkles className="w-4 h-4 mr-2" /> Use AI Generator
                   </Button>
                   <Button onClick={handleLoadDemo} variant="outline" className="border-dashed text-gray-500 hover:text-gray-800">
                     Load Example Data
                   </Button>
                 </div>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredSavedCards.length === 0 ? (
                   <div className="col-span-full py-10 text-center text-gray-400 italic">No matching cards found.</div>
                 ) : (
                   filteredSavedCards.map((card) => (
                     <FlashcardItem 
                       key={`saved-${card.term}`} 
                       card={card} 
                       isSaved={true}
                       onToggleSave={toggleSaveCard}
                       onToggleMaster={toggleMasterCard}
                       isSelectionMode={isSelectionMode}
                       isSelected={selectedCards.has(card.term)}
                       // onSelect={handleSelectCard}
                     />
                   ))
                 )}
               </div>
             )}
          </div>
        )}

        {viewMode === 'discover' && (
           <div className="space-y-6">
             {/* Controls for Generation */}
             <div className="flex flex-col sm:flex-col md:flex-row justify-between sm:items-stretch md:items-center bg-teal-50/50 p-4 rounded-xl border border-teal-100 gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                 <span className="text-sm font-medium text-teal-800 whitespace-nowrap">Topic:</span>
                  <div className="relative flex-1 md:flex-none">
                     <select 
                       value={topic}
                       onChange={handleTopicChange}
                       className="w-full appearance-none bg-white border border-teal-200 text-teal-900 py-1.5 px-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:border-teal-500 shadow-sm cursor-pointer"
                     >
                       {Object.values(Topic).map((t) => (
                         <option key={t} value={t}>{t}</option>
                       ))}
                     </select>
                   </div>
                </div>
                
                <Button onClick={() => fetchCards(topic)} disabled={loading} variant="primary" className="w-full md:w-auto !py-1.5 text-sm justify-center">
                   <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                   Generate New
                 </Button>
             </div>
 
             {loading ? (
               <div className="h-64 flex flex-col items-center justify-center text-teal-600">
                 <Loader2 className="w-10 h-10 animate-spin mb-4" />
                 <p className="font-medium animate-pulse">{loadingMessage}</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {generatedCards.map((card, index) => (
                   <FlashcardItem 
                     key={`gen-${card.term}`} 
                     card={card} 
                     isSaved={isCardSaved(card)}
                     onToggleSave={toggleSaveCard}
                   />
                 ))}
               </div>
             )}
           </div>
        )}
      </div>

      <AddWordModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNewCard}
      />
    </div>
  );
};
