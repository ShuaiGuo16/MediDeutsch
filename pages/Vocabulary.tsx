import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BookOpen, RefreshCw, Loader2, Bookmark, Sparkles, Plus, UploadCloud, FileText, CheckSquare, Trash2, HelpCircle, Filter, AlertCircle, Download, Search, Trophy, ArrowRight, XCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Flashcard, Topic, QuizQuestion } from '../types';
import { generateFlashcards, generateFlashcardsFromTerms } from '../services/geminiService';
import { FlashcardItem } from '../components/FlashcardItem';
import { Button } from '../components/Button';
import { AddWordModal } from '../components/AddWordModal';

type ViewMode = 'discover' | 'saved' | 'quiz';

export const Vocabulary: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('saved');
  const [topic, setTopic] = useState<Topic>(Topic.ANATOMY);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Persistent Storage for Saved Cards
  const [savedCards, setSavedCards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem('savedCards');
    return saved ? JSON.parse(saved) : [];
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [hideMastered, setHideMastered] = useState(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Calculate unique categories from saved cards
  const uniqueCategories = useMemo(() => {
    const cats = new Set(savedCards.map(c => c.category || 'General').map(c => c.trim()));
    return ['All', ...Array.from(cats).sort()];
  }, [savedCards]);

  // Filtered cards based on category and search
  const filteredSavedCards = useMemo(() => {
    let result = savedCards;
    
    // Hide Mastered Filter
    if (hideMastered) {
      result = result.filter(c => !c.mastered);
    }

    // Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(c => (c.category || 'General').trim() === selectedCategory);
    }

    // Search Filter
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

  const fetchCards = async (selectedTopic: Topic) => {
    setLoading(true);
    // Exclude words user already has
    const existingTerms = savedCards.map(c => c.term);
    const newCards = await generateFlashcards(selectedTopic, 6, existingTerms); 
    
    // Client-side safety filter to ensure absolute uniqueness (case-insensitive)
    const uniqueCards = newCards.filter(
      newCard => !existingTerms.some(
        saved => saved.toLowerCase() === newCard.term.toLowerCase()
      )
    );

    setGeneratedCards(uniqueCards);
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
      setSavedCards(prev => [...prev, card]);
    }
  };

  const toggleMasterCard = (card: Flashcard) => {
    setSavedCards(prev => prev.map(c => {
      if (c.term === card.term) {
        return { ...c, mastered: !c.mastered };
      }
      return c;
    }));
  };

  const handleSaveNewCard = (card: Flashcard) => {
     toggleSaveCard(card);
  };

  // --- QUIZ LOGIC ---
  const startQuiz = () => {
    if (savedCards.length < 5) return;
    
    // Select 10 random cards (or less if not enough)
    const shuffled = [...savedCards].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    
    const questions: QuizQuestion[] = selected.map((card, index) => {
       const typeRand = Math.random();
       let type: 'article' | 'translation' | 'definition' = 'translation';
       let questionText = '';
       let correctAnswer = '';
       let options: string[] = [];
       
       if (typeRand < 0.33 && card.article) {
         type = 'article';
         questionText = `What is the correct article for "${card.term}"?`;
         correctAnswer = card.article;
         options = ['der', 'die', 'das'];
       } else if (typeRand < 0.66) {
         type = 'translation';
         questionText = `What is the German term for "${card.englishTranslation}"?`;
         correctAnswer = card.term;
         // Generate distractors
         const distractors = savedCards
            .filter(c => c.term !== card.term)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(c => c.term);
         options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
       } else {
         type = 'definition';
         questionText = `Which term matches this definition?\n"${card.definition}"`;
         correctAnswer = card.term;
         const distractors = savedCards
            .filter(c => c.term !== card.term)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(c => c.term);
         options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
       }

       return {
         id: `q-${index}`,
         type,
         question: questionText,
         correctAnswer,
         options,
         card
       };
    });

    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setIsQuizActive(true);
    setQuizFinished(false);
    setSelectedAnswer(null);
  };

  const handleQuizAnswer = (answer: string) => {
    if (selectedAnswer) return; // Prevent double click
    setSelectedAnswer(answer);
    
    const currentQ = quizQuestions[currentQuestionIndex];
    const isCorrect = answer === currentQ.correctAnswer;
    
    if (isCorrect) setScore(s => s + 1);

    // Auto advance after short delay
    setTimeout(() => {
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        finishQuiz(score + (isCorrect ? 1 : 0));
      }
    }, 1500);
  };

  const finishQuiz = (finalScore: number) => {
    setIsQuizActive(false);
    setQuizFinished(true);
    // Update global score in localStorage
    const currentTotal = parseInt(localStorage.getItem('totalScore') || '0');
    localStorage.setItem('totalScore', (currentTotal + finalScore).toString());
  };


  // --- EXPORT/IMPORT ---
  const handleExportCSV = () => {
    if (savedCards.length === 0) return;

    // Create CSV Content
    const headers = ['Term', 'Article', 'Definition', 'Example (DE)', 'Example (EN)', 'Translation', 'Category'];
    const rows = savedCards.map(c => [
      `"${c.term.replace(/"/g, '""')}"`,
      `"${c.article}"`,
      `"${c.definition.replace(/"/g, '""')}"`,
      `"${c.exampleSentence.replace(/"/g, '""')}"`,
      `"${c.exampleSentenceEnglish?.replace(/"/g, '""') || ''}"`,
      `"${c.englishTranslation.replace(/"/g, '""')}"`,
      `"${c.category.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `medideutsch_vocab_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setShowImportHelp(false);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
        
        if (rows.length === 0) {
          setIsImporting(false);
          return;
        }

        const firstRowCommas = (rows[0].match(/,/g) || []).length;
        
        if (firstRowCommas < 2) {
          // Simple List
          let terms = rows.map(r => r.trim().replace(/^"|"$/g, ''));
          if (terms[0].toLowerCase() === 'term' || terms[0].toLowerCase() === 'word') {
             terms = terms.slice(1);
          }
          
          if (terms.length > 0) {
             const newCards = await generateFlashcardsFromTerms(terms);
             setSavedCards(prev => {
               const existingTerms = new Set(prev.map(c => c.term));
               const uniqueNewCards = newCards.filter(c => !existingTerms.has(c.term));
               return [...prev, ...uniqueNewCards];
             });
          }
        } else {
          // Structured CSV
          const parsedCards: Flashcard[] = [];
          rows.forEach((row, index) => {
             if (index === 0 && row.toLowerCase().includes('term')) return;
             const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
             if (cols.length >= 1) {
               const card: Flashcard = {
                 term: cols[0] || '',
                 article: cols[1] || 'der',
                 definition: cols[2] || 'Imported via CSV',
                 exampleSentence: cols[3] || '',
                 exampleSentenceEnglish: cols[4] || '',
                 englishTranslation: cols[5] || '',
                 category: cols[6] || 'Imported'
               };
               if (card.term) parsedCards.push(card);
             }
          });

          setSavedCards(prev => {
             const existingTerms = new Set(prev.map(c => c.term));
             const uniqueNewCards = parsedCards.filter(c => !existingTerms.has(c.term));
             return [...prev, ...uniqueNewCards];
          });
        }
      } catch (error) {
        console.error("Import failed", error);
        alert("Failed to process file. Please check the format.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const isCardSaved = (card: Flashcard) => savedCards.some(c => c.term === card.term);

  // Selection Logic
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedCards(new Set());
    setDeleteConfirmState('idle');
  };

  const handleSelectCard = (card: Flashcard) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(card.term)) {
      newSelected.delete(card.term);
    } else {
      newSelected.add(card.term);
    }
    setSelectedCards(newSelected);
    setDeleteConfirmState('idle'); // Reset confirm state if selection changes
  };

  const handleBatchDelete = () => {
    if (deleteConfirmState === 'idle') {
      setDeleteConfirmState('confirming');
      setTimeout(() => setDeleteConfirmState('idle'), 3000);
    } else {
      setSavedCards(prev => prev.filter(c => !selectedCards.has(c.term)));
      setSelectedCards(new Set());
      setIsSelectionMode(false);
      setDeleteConfirmState('idle');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
             <BookOpen className="text-teal-600" />
             Fachwortschatz
           </h2>
           <p className="text-gray-500 mt-1">Build and manage your professional medical vocabulary.</p>
        </div>

        {/* View Switcher */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
           <button 
             onClick={() => setViewMode('saved')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'saved' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-50'}`}
           >
             <Bookmark className="w-4 h-4" /> Collection
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
           <button 
             onClick={() => setViewMode('quiz')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'quiz' ? 'bg-amber-100 text-amber-800' : 'text-gray-600 hover:bg-gray-50'}`}
           >
             <Trophy className="w-4 h-4" /> Quiz
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-teal-50 min-h-[500px]">
        
        {viewMode === 'discover' && (
          <div className="space-y-6">
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
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-teal-700">
                      <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
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
                <p className="font-medium animate-pulse">Consulting the AI Chief Physician...</p>
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

        {viewMode === 'saved' && (
          <div className="space-y-6">
             <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center pb-4 border-b border-gray-100 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
                  
                  {/* Search Bar */}
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                     <input 
                       type="text"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       placeholder="Search words..."
                       className="pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-48"
                     />
                  </div>
                  
                  {/* Category Filter Dropdown */}
                  {uniqueCategories.length > 1 && (
                    <div className="relative">
                      <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="pl-8 pr-4 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
                      >
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Hide Mastered Toggle */}
                  <Button 
                    type="button"
                    onClick={() => setHideMastered(!hideMastered)}
                    variant="ghost"
                    className={`!py-1.5 !px-3 text-xs border ${hideMastered ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                  >
                    {hideMastered ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {hideMastered ? 'Hiding Mastered' : 'Show All'}
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end items-center">
                  {/* Bulk Selection Controls */}
                  {savedCards.length > 0 && (
                    <>
                      {isSelectionMode && selectedCards.size > 0 && (
                         <Button 
                           type="button"
                           onClick={handleBatchDelete} 
                           className={`text-xs !py-1.5 transition-all ${deleteConfirmState === 'confirming' ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'}`}
                           variant={deleteConfirmState === 'confirming' ? 'primary' : 'outline'}
                         >
                           {deleteConfirmState === 'confirming' ? (
                             <>
                               <AlertCircle className="w-4 h-4" /> Confirm?
                             </>
                           ) : (
                             <>
                               <Trash2 className="w-4 h-4" /> Delete ({selectedCards.size})
                             </>
                           )}
                         </Button>
                      )}
                      
                      <Button 
                        type="button"
                        onClick={handleToggleSelectionMode} 
                        variant={isSelectionMode ? "secondary" : "ghost"} 
                        className={`text-xs !py-1.5 ${isSelectionMode ? '' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <CheckSquare className="w-4 h-4" />
                        {isSelectionMode ? 'Cancel' : 'Select'}
                      </Button>
                    </>
                  )}

                  <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

                  <input 
                    type="file" 
                    accept=".csv,.txt" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      onClick={() => setShowImportHelp(!showImportHelp)} 
                      variant="ghost" 
                      className="text-gray-400 hover:text-teal-600 !px-2"
                      title="Import Help"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleExportCSV} 
                      variant="ghost" 
                      className="text-gray-400 hover:text-teal-600 !px-2"
                      title="Export CSV"
                      disabled={savedCards.length === 0}
                    >
                      <Download className="w-5 h-5" />
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleImportClick} 
                      variant="secondary" 
                      className="text-xs !py-1.5 flex-1 sm:flex-none"
                      disabled={isImporting}
                    >
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                      {isImporting ? 'Processing...' : 'Import'}
                    </Button>
                  </div>
                  <Button type="button" onClick={() => setIsModalOpen(true)} variant="outline" className="text-xs !py-1.5 flex-1 sm:flex-none">
                    <Plus className="w-4 h-4" /> Add Word
                  </Button>
                </div>
             </div>
             
             {showImportHelp && (
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 animate-in fade-in slide-in-from-top-2">
                 <h4 className="font-bold flex items-center gap-2 mb-2">
                   <FileText className="w-4 h-4" /> Supported Import Formats
                 </h4>
                 <div className="grid md:grid-cols-2 gap-4">
                   <div>
                     <p className="font-semibold text-blue-800 mb-1">Option 1: Smart List (Recommended)</p>
                     <p className="text-blue-700/80 mb-2">Upload a simple text file with one word per line. Mixed languages (e.g., German + Chinese) are fine.</p>
                     <code className="block bg-white/50 p-2 rounded border border-blue-100 text-xs">
                       Blinddarm<br/>
                       Kopfschmerzen (headache)<br/>
                       Fraktur - 骨折
                     </code>
                     <p className="text-xs mt-1 text-blue-600">The AI will extract the German term and auto-fill the details.</p>
                   </div>
                   <div>
                     <p className="font-semibold text-blue-800 mb-1">Option 2: Structured CSV</p>
                     <p className="text-blue-700/80 mb-2">Upload a CSV with exactly 7 columns in this order:</p>
                     <code className="block bg-white/50 p-2 rounded border border-blue-100 text-xs break-all">
                       Term, Article, Definition, Example (DE), Example (EN), Translation, Category
                     </code>
                   </div>
                 </div>
               </div>
             )}
             
             {isImporting && (
               <div className="bg-indigo-50 text-indigo-800 p-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                 <Sparkles className="w-4 h-4" />
                 Analyzing your file and generating flashcards. This may take a moment for large files...
               </div>
             )}

             {savedCards.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                 <Bookmark className="w-12 h-12 mb-4 text-gray-200" />
                 <p>No saved words yet.</p>
                 <div className="flex gap-4 mt-4">
                   <Button variant="ghost" className="text-teal-600" onClick={() => setViewMode('discover')}>
                     Discover
                   </Button>
                   <span className="text-gray-300 py-2">|</span>
                   <Button variant="ghost" className="text-indigo-600" onClick={handleImportClick}>
                     Import File
                   </Button>
                 </div>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredSavedCards.length === 0 ? (
                   <div className="col-span-full py-10 text-center text-gray-400 italic">
                     {hideMastered ? "All matching cards are hidden because they are marked as 'Mastered'. Toggle the filter to see them." : "No cards found matching your search."}
                   </div>
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
                       onSelect={handleSelectCard}
                     />
                   ))
                 )}
               </div>
             )}
          </div>
        )}

        {viewMode === 'quiz' && (
          <div className="max-w-2xl mx-auto py-6">
             {!isQuizActive && !quizFinished && (
               <div className="text-center space-y-6">
                 <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Trophy className="w-10 h-10 text-amber-600" />
                 </div>
                 <h3 className="text-2xl font-bold text-gray-800">Knowledge Check</h3>
                 <p className="text-gray-600">
                   Test yourself on your saved vocabulary. We'll pick 10 random words from your collection.
                 </p>
                 {savedCards.length < 5 ? (
                   <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
                     You need at least 5 saved words to start a quiz. Go Discover!
                   </div>
                 ) : (
                   <Button onClick={startQuiz} className="mx-auto text-lg px-8 py-3 bg-amber-500 hover:bg-amber-600">
                     Start Quiz
                   </Button>
                 )}
               </div>
             )}

             {isQuizActive && quizQuestions.length > 0 && (
               <div className="space-y-6 animate-in slide-in-from-right fade-in">
                  <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                    <span>Question {currentQuestionIndex + 1} / {quizQuestions.length}</span>
                    <span className="text-amber-600">Score: {score}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                    ></div>
                  </div>

                  <div className="bg-white p-8 rounded-2xl shadow-lg border border-amber-50 text-center">
                     <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
                       {quizQuestions[currentQuestionIndex].type}
                     </p>
                     <h3 className="text-xl font-bold text-gray-800 mb-8 whitespace-pre-wrap">
                       {quizQuestions[currentQuestionIndex].question}
                     </h3>
                     
                     <div className="grid grid-cols-1 gap-3">
                       {quizQuestions[currentQuestionIndex].options.map((opt, idx) => {
                         const isSelected = selectedAnswer === opt;
                         const isCorrect = opt === quizQuestions[currentQuestionIndex].correctAnswer;
                         
                         let btnClass = "p-4 rounded-xl border-2 text-left transition-all font-medium text-lg ";
                         
                         if (selectedAnswer) {
                           if (isCorrect) btnClass += "border-green-500 bg-green-50 text-green-700";
                           else if (isSelected) btnClass += "border-red-500 bg-red-50 text-red-700";
                           else btnClass += "border-gray-100 bg-white text-gray-300 opacity-50";
                         } else {
                           btnClass += "border-gray-100 hover:border-amber-300 hover:bg-amber-50 text-gray-700";
                         }

                         return (
                           <button
                             key={idx}
                             onClick={() => handleQuizAnswer(opt)}
                             disabled={!!selectedAnswer}
                             className={btnClass}
                           >
                             <div className="flex justify-between items-center">
                               {opt}
                               {selectedAnswer && isCorrect && <CheckCircle className="w-6 h-6 text-green-500" />}
                               {selectedAnswer && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-500" />}
                             </div>
                           </button>
                         );
                       })}
                     </div>
                  </div>
               </div>
             )}

             {quizFinished && (
               <div className="text-center space-y-6 animate-in zoom-in fade-in">
                 <div className="inline-block relative">
                   <Trophy className="w-24 h-24 text-amber-400 mx-auto" />
                   <Sparkles className="w-8 h-8 text-yellow-300 absolute -top-2 -right-2 animate-bounce" />
                 </div>
                 
                 <h3 className="text-3xl font-bold text-gray-900">Quiz Complete!</h3>
                 <p className="text-xl text-gray-600">
                   You scored <span className="text-amber-600 font-bold">{score} / {quizQuestions.length}</span>
                 </p>
                 
                 <div className="flex justify-center gap-4 pt-4">
                   <Button onClick={startQuiz} variant="secondary">
                     Try Again
                   </Button>
                   <Button onClick={() => setViewMode('saved')} variant="outline">
                     Back to Collection
                   </Button>
                 </div>
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