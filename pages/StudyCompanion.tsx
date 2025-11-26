
import React, { useState, useEffect, useRef } from 'react';
import { Notebook, Plus, Image as ImageIcon, Sparkles, MessageSquare, BookOpen, Trash2, Save, MoreVertical, Loader2, Tag, Check, Brain } from 'lucide-react';
import { Button } from '../components/Button';
import { StudyNote, Scenario, QuizQuestion, Flashcard } from '../types';
import { analyzeImageToText, generateFlashcardsFromTerms, generateScenarioFromText, generateQuizFromText } from '../services/geminiService';
import { Modal } from '../components/Modal';

export const StudyCompanion: React.FC = () => {
  const [notes, setNotes] = useState<StudyNote[]>(() => {
    const saved = localStorage.getItem('studyNotes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editorContent, setEditorContent] = useState({ title: '', content: '', tags: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const [activeAction, setActiveAction] = useState<'idle' | 'vocab' | 'scenario' | 'quiz'>('idle');
  const [actionStatus, setActionStatus] = useState('');
  
  // Quiz State
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  useEffect(() => {
    localStorage.setItem('studyNotes', JSON.stringify(notes));
  }, [notes]);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  const handleCreateNote = () => {
    const newNote: StudyNote = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      tags: [],
      createdAt: new Date().toISOString()
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    setEditorContent({ title: newNote.title, content: newNote.content, tags: '' });
    setIsEditing(true);
    setGeneratedQuiz(null);
  };

  const handleSelectNote = (note: StudyNote) => {
    setSelectedNoteId(note.id);
    setEditorContent({ title: note.title, content: note.content, tags: note.tags.join(', ') });
    setIsEditing(false);
    setGeneratedQuiz(null);
    setActiveAction('idle');
  };

  const handleSave = () => {
    if (!selectedNoteId) return;
    
    const tagsArray = editorContent.tags.split(',').map(t => t.trim()).filter(t => t);
    
    setNotes(prev => prev.map(n => 
      n.id === selectedNoteId 
        ? { ...n, title: editorContent.title, content: editorContent.content, tags: tagsArray }
        : n
    ));
    setIsEditing(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNoteId === id) setSelectedNoteId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      const mimeType = file.type;

      const analysis = await analyzeImageToText(base64Data, mimeType);
      
      if (analysis) {
        setEditorContent(prev => ({
          ...prev,
          content: prev.content ? prev.content + '\n\n' + analysis : analysis
        }));
        // Auto-switch to edit mode if not already
        if (selectedNoteId) {
            setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, content: n.content + '\n\n' + analysis } : n));
        } else {
            handleCreateNote();
            setEditorContent(prev => ({...prev, content: analysis, title: 'Image Analysis'}));
        }
      }
      setIsProcessingImage(false);
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- ACTIONS ---

  const handleExtractVocab = async () => {
    if (!selectedNote) return;
    setActiveAction('vocab');
    setActionStatus('Analyzing text for medical terms...');
    
    // We pass the raw text to the batch generator. It handles extraction.
    // To make it efficient, we might first ask LLM to identify terms, but existing service does extraction.
    // Let's assume we split by whitespace as a naive first pass or just pass the whole text block to a new service method
    // For now, let's try passing the content directly to generateFlashcardsFromTerms which has a prompt to "Extract" terms.
    
    const terms = [selectedNote.content]; // Pass the whole text, the service prompt handles extraction from "input strings"
    const cards = await generateFlashcardsFromTerms(terms);
    
    if (cards.length > 0) {
      const saved = localStorage.getItem('savedCards');
      const current = saved ? JSON.parse(saved) : [];
      // Dedup
      const existing = new Set(current.map((c: Flashcard) => c.term));
      const newUnique = cards.filter(c => !existing.has(c.term));
      
      localStorage.setItem('savedCards', JSON.stringify([...current, ...newUnique]));
      setActionStatus(`Success! Added ${newUnique.length} new words to your Vocabulary.`);
    } else {
      setActionStatus('No valid medical terms found to add.');
    }
    setTimeout(() => setActiveAction('idle'), 3000);
  };

  const handleStartRoleplay = async () => {
    if (!selectedNote) return;
    setActiveAction('scenario');
    setActionStatus('Designing a patient simulation based on your notes...');
    
    const scenario = await generateScenarioFromText(selectedNote.content);
    
    if (scenario) {
      const saved = localStorage.getItem('customScenarios');
      const current = saved ? JSON.parse(saved) : [];
      localStorage.setItem('customScenarios', JSON.stringify([...current, scenario]));
      setActionStatus(`Scenario "${scenario.title}" created! Check the Roleplay tab.`);
    } else {
      setActionStatus('Failed to generate scenario.');
    }
    setTimeout(() => setActiveAction('idle'), 3000);
  };

  const handleGenerateQuiz = async () => {
    if (!selectedNote) return;
    setActiveAction('quiz');
    setActionStatus('Drafting quiz questions...');
    
    const questions = await generateQuizFromText(selectedNote.content);
    if (questions) {
      setGeneratedQuiz(questions);
      setQuizAnswers({});
      setShowQuizResults(false);
      setActionStatus(''); 
    } else {
      setActionStatus('Could not generate quiz.');
      setTimeout(() => setActiveAction('idle'), 2000);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar: Note List */}
      <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Notebook className="w-5 h-5 text-teal-600" /> My Notes
          </h3>
          <Button onClick={handleCreateNote} variant="ghost" className="p-1.5 hover:bg-white rounded-full">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {notes.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              <p>No notes yet.</p>
              <p>Create one or upload an image!</p>
            </div>
          ) : (
            notes.map(note => (
              <div 
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`p-3 rounded-xl cursor-pointer transition-all border group relative ${selectedNoteId === note.id ? 'bg-teal-50 border-teal-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
              >
                <div className="font-semibold text-gray-800 truncate pr-6">{note.title || 'Untitled'}</div>
                <div className="text-xs text-gray-500 line-clamp-2 mt-1">{note.content || 'No content...'}</div>
                {note.tags.length > 0 && (
                   <div className="flex flex-wrap gap-1 mt-2">
                     {note.tags.map((tag, i) => (
                       <span key={i} className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded-full">{tag}</span>
                     ))}
                   </div>
                )}
                <button 
                  onClick={(e) => handleDelete(note.id, e)}
                  className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main: Editor & Actions */}
      <div className="flex-1 flex flex-col gap-4">
        {selectedNoteId ? (
          <>
            {/* Toolbar */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
              <div className="flex gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="secondary" 
                  disabled={isProcessingImage}
                  className="text-xs"
                >
                  {isProcessingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  {isProcessingImage ? 'Analyzing...' : 'Add Image'}
                </Button>
                
                <div className="w-px h-8 bg-gray-200 mx-2"></div>
                
                <Button 
                  onClick={handleExtractVocab} 
                  variant="ghost" 
                  className="text-xs text-teal-700 hover:bg-teal-50"
                  disabled={!selectedNote?.content || activeAction !== 'idle'}
                >
                  <BookOpen className="w-4 h-4 mr-1" /> Extract Vocab
                </Button>
                <Button 
                  onClick={handleStartRoleplay} 
                  variant="ghost" 
                  className="text-xs text-indigo-700 hover:bg-indigo-50"
                  disabled={!selectedNote?.content || activeAction !== 'idle'}
                >
                  <MessageSquare className="w-4 h-4 mr-1" /> Roleplay
                </Button>
                <Button 
                  onClick={handleGenerateQuiz} 
                  variant="ghost" 
                  className="text-xs text-amber-700 hover:bg-amber-50"
                  disabled={!selectedNote?.content || activeAction !== 'idle'}
                >
                  <Brain className="w-4 h-4 mr-1" /> Quiz Me
                </Button>
              </div>

              {activeAction !== 'idle' && activeAction !== 'quiz' && (
                <div className="text-xs text-teal-600 font-medium animate-pulse flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> {actionStatus}
                </div>
              )}
              
              {!isEditing && (
                 <Button onClick={() => setIsEditing(true)} variant="outline" className="text-xs">
                   Edit Note
                 </Button>
              )}
              {isEditing && (
                 <Button onClick={handleSave} variant="primary" className="text-xs">
                   <Save className="w-3 h-3 mr-1" /> Save
                 </Button>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-hidden flex flex-col relative">
               {isEditing ? (
                 <div className="flex flex-col h-full gap-4">
                   <input 
                     type="text" 
                     value={editorContent.title}
                     onChange={(e) => setEditorContent({...editorContent, title: e.target.value})}
                     className="text-2xl font-bold text-gray-800 border-none focus:ring-0 placeholder-gray-300 px-0"
                     placeholder="Note Title"
                   />
                   <div className="flex items-center gap-2 text-sm text-gray-500">
                     <Tag className="w-4 h-4" />
                     <input 
                       type="text" 
                       value={editorContent.tags}
                       onChange={(e) => setEditorContent({...editorContent, tags: e.target.value})}
                       className="flex-1 border-none focus:ring-0 placeholder-gray-300 bg-transparent"
                       placeholder="Tags (comma separated)..."
                     />
                   </div>
                   <textarea 
                     value={editorContent.content}
                     onChange={(e) => setEditorContent({...editorContent, content: e.target.value})}
                     className="flex-1 resize-none border-none focus:ring-0 text-gray-600 leading-relaxed text-lg placeholder-gray-200 px-0"
                     placeholder="Paste text here or upload an image..."
                   />
                 </div>
               ) : (
                 <div className="h-full overflow-y-auto prose prose-teal max-w-none">
                   <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedNote?.title}</h2>
                   {selectedNote?.tags.length ? (
                     <div className="flex gap-2 mb-6">
                       {selectedNote.tags.map(t => <span key={t} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{t}</span>)}
                     </div>
                   ) : null}
                   <div className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                     {selectedNote?.content}
                   </div>
                 </div>
               )}

               {/* Quiz Overlay */}
               {activeAction === 'quiz' && generatedQuiz && (
                 <div className="absolute inset-0 bg-white/95 backdrop-blur-sm p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
                   <div className="max-w-2xl mx-auto space-y-6">
                     <div className="flex justify-between items-center">
                       <h3 className="text-xl font-bold text-amber-600 flex items-center gap-2">
                         <Brain /> Quick Quiz
                       </h3>
                       <Button onClick={() => setActiveAction('idle')} variant="ghost">Close</Button>
                     </div>
                     
                     {generatedQuiz.map((q, idx) => (
                       <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                         <p className="font-semibold text-gray-800 mb-3">{idx + 1}. {q.question}</p>
                         <div className="space-y-2">
                           {q.options.map((opt, i) => {
                             const isSelected = quizAnswers[q.id] === opt;
                             const isCorrect = opt === q.correctAnswer;
                             
                             let cls = "w-full text-left p-3 rounded-lg border text-sm ";
                             if (showQuizResults) {
                               if (isCorrect) cls += "bg-green-50 border-green-300 text-green-800";
                               else if (isSelected && !isCorrect) cls += "bg-red-50 border-red-300 text-red-800";
                               else cls += "bg-gray-50 text-gray-400";
                             } else {
                               cls += isSelected ? "bg-amber-50 border-amber-300 text-amber-900" : "hover:bg-gray-50";
                             }

                             return (
                               <button 
                                 key={i}
                                 onClick={() => !showQuizResults && setQuizAnswers(prev => ({...prev, [q.id]: opt}))}
                                 className={cls}
                               >
                                 {opt}
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     ))}
                     
                     {!showQuizResults ? (
                       <Button onClick={() => setShowQuizResults(true)} className="w-full">Check Answers</Button>
                     ) : (
                       <div className="text-center p-4 bg-green-50 rounded-xl text-green-800 font-bold">
                         Quiz Complete! Review your answers above.
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-white rounded-2xl border border-dashed border-gray-200">
            <Notebook className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};
