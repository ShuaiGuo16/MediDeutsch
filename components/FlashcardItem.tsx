
import React, { useState, useCallback } from 'react';
import { Volume2, RotateCw, Heart, Check, Trash2, Award, Ambulance, Bed, Activity, Bike, CheckCircle2, CalendarClock } from 'lucide-react';
import { Flashcard } from '../types';
import { generateSpeech, playPcmData } from '../services/geminiService';
import { Button } from './Button';
import { getWardName, formatDueDate } from '../services/srsService';

interface FlashcardItemProps {
  card: Flashcard;
  isSaved?: boolean;
  onToggleSave?: (card: Flashcard) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (card: Flashcard) => void;
  onToggleMaster?: (card: Flashcard) => void;
  // SRS Props
  isReviewMode?: boolean;
  onGrade?: (card: Flashcard, grade: 'again' | 'hard' | 'good' | 'easy') => void;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = ({ 
  card, 
  isSaved = false, 
  onToggleSave,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
  onToggleMaster,
  isReviewMode = false,
  onGrade
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleAudio = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent flip
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      // Generate PCM data
      const pcmData = await generateSpeech(`${card.article} ${card.term}. ${card.exampleSentence}`);
      
      if (pcmData) {
        // Play using the helper that handles raw PCM
        await playPcmData(pcmData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPlaying(false);
    }
  }, [card, isPlaying]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSave) {
      onToggleSave(card);
    }
  };

  const handleMaster = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleMaster) {
      onToggleMaster(card);
    }
  };

  const handleClick = () => {
    if (isSelectionMode && onSelect) {
      onSelect(card);
    } else {
      setIsFlipped(!isFlipped);
    }
  };

  const handleSelectCheckbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) onSelect(card);
  };

  const handleGrade = (e: React.MouseEvent, grade: 'again' | 'hard' | 'good' | 'easy') => {
    e.stopPropagation();
    if (onGrade) {
      onGrade(card, grade);
      setIsFlipped(false); // Reset flip for next card
    }
  };

  // Determine Color Scheme based on Article (Visual Mnemonic)
  const getColors = () => {
    const art = card.article.toLowerCase();
    if (art === 'der') return {
      frontBorder: card.mastered ? 'border-amber-300' : 'border-blue-100',
      badge: 'bg-blue-50 text-blue-600',
      activeRing: 'ring-blue-500',
      selectedBg: 'bg-blue-600',
      backBg: 'bg-blue-600',
      backDivider: 'bg-blue-400/50',
      backBox: 'bg-blue-800/30'
    };
    if (art === 'die') return {
      frontBorder: card.mastered ? 'border-amber-300' : 'border-rose-100',
      badge: 'bg-rose-50 text-rose-600',
      activeRing: 'ring-rose-500',
      selectedBg: 'bg-rose-500',
      backBg: 'bg-rose-500',
      backDivider: 'bg-rose-300/50',
      backBox: 'bg-rose-800/30'
    };
    if (art === 'das') return {
      frontBorder: card.mastered ? 'border-amber-300' : 'border-emerald-100',
      badge: 'bg-emerald-50 text-emerald-600',
      activeRing: 'ring-emerald-500',
      selectedBg: 'bg-emerald-600',
      backBg: 'bg-emerald-600',
      backDivider: 'bg-emerald-400/50',
      backBox: 'bg-emerald-800/30'
    };
    // Default/Plural
    return {
      frontBorder: card.mastered ? 'border-amber-300' : 'border-teal-100',
      badge: 'bg-teal-50 text-teal-600',
      activeRing: 'ring-teal-500',
      selectedBg: 'bg-teal-600',
      backBg: 'bg-teal-600',
      backDivider: 'bg-teal-400/50',
      backBox: 'bg-teal-800/30'
    };
  };

  const colors = getColors();

  // Helper for Ward Icon
  const WardIcon = () => {
    const level = card.srsLevel || 0;
    if (card.mastered) return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
    switch(level) {
      case 0: return <Ambulance className="w-3 h-3 text-red-500" />;
      case 1: return <Bed className="w-3 h-3 text-orange-500" />;
      case 2: return <Activity className="w-3 h-3 text-blue-500" />;
      case 3: return <Bike className="w-3 h-3 text-teal-500" />;
      case 4: return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      default: return <Ambulance className="w-3 h-3 text-red-500" />;
    }
  };

  return (
    <div 
      className={`card-flip w-full h-80 cursor-pointer group ${isFlipped && !isSelectionMode ? 'flipped' : ''}`}
      onClick={handleClick}
    >
      <div className={`card-inner relative w-full h-full text-center rounded-2xl shadow-xl transition-all duration-500 ${isSelectionMode && isSelected ? `ring-4 ${colors.activeRing} ring-offset-2` : ''}`}>
        
        {/* Front */}
        <div className={`card-front absolute w-full h-full bg-white rounded-2xl border ${colors.frontBorder} ${card.mastered ? 'shadow-amber-100 shadow-lg border-2' : ''} p-5 flex flex-col justify-between overflow-hidden`}>
          
          {/* Header Row: Category (Left) and Actions (Right) */}
          <div className="w-full flex justify-between items-start">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${colors.badge} truncate max-w-[50%]`}>
              {card.category}
            </span>
            
            <div className="flex gap-1 items-center z-10 -mr-1">
              {isSelectionMode && (
                <div 
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? `${colors.selectedBg} border-transparent` : 'border-gray-200 bg-gray-50'}`}
                  onClick={handleSelectCheckbox}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              )}
              {!isSelectionMode && (
                <>
                  {onToggleMaster && (
                    <Button 
                      variant="ghost" 
                      className={`!p-1.5 rounded-full hover:bg-amber-50 ${card.mastered ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`} 
                      onClick={handleMaster}
                      title="Mastered"
                    >
                      <Award className={`w-5 h-5 ${card.mastered ? 'fill-current' : ''}`} />
                    </Button>
                  )}
                  <Button variant="ghost" className="!p-1.5 rounded-full hover:bg-teal-50 text-gray-400 hover:text-teal-600" onClick={handleAudio}>
                    <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse text-teal-600' : ''}`} />
                  </Button>
                  {onToggleSave && (
                    <Button 
                      variant="ghost" 
                      className={`!p-1.5 rounded-full hover:bg-rose-50 ${isSaved ? 'text-rose-500' : 'text-gray-300 hover:text-rose-400'}`} 
                      onClick={handleSave}
                    >
                      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Center Content */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-2">
             <p className="text-gray-400 text-sm mb-1 font-medium">{card.article}</p>
             <h3 className="text-3xl font-bold text-gray-800 break-words w-full px-1 leading-tight">{card.term}</h3>
             {card.syllables && (
               <p className="text-sm text-teal-600/70 font-mono mt-2 tracking-wide">{card.syllables}</p>
             )}
          </div>

          {/* Footer Row: Ward Status (Left) and Flip Hint (Right) */}
          <div className="w-full flex justify-between items-end h-6">
            {/* Ward Indicator (only if saved) */}
            {isSaved && !isSelectionMode ? (
               <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100/50" title={`Current Ward: ${getWardName(card.srsLevel)}`}>
                   <WardIcon />
                   <span className="text-[10px] text-gray-400 font-bold hidden sm:inline">{getWardName(card.srsLevel).split(' ')[1]}</span>
                 </div>
                 {!card.mastered && (
                   <div className="flex items-center gap-1 text-[10px] text-gray-400">
                     <CalendarClock className="w-3 h-3" />
                     <span>{formatDueDate(card.nextReviewDate)}</span>
                   </div>
                 )}
               </div>
            ) : (
               <div></div> // Spacer
            )}
            
            {/* Flip Hint */}
            {!isSelectionMode && (
              <div className="text-gray-300 text-xs flex items-center gap-1.5 pl-2">
                 <RotateCw className="w-3 h-3" /> <span className="hidden sm:inline">Flip</span>
              </div>
            )}
          </div>
        </div>

        {/* Back */}
        <div className={`card-back absolute w-full h-full ${colors.backBg} rounded-2xl p-6 flex flex-col text-white overflow-hidden`}>
           {isReviewMode ? (
             // Review Mode Grading Buttons (Bottom)
             <div className="absolute bottom-6 left-0 w-full px-6 z-20">
               <div className="grid grid-cols-4 gap-2">
                 <button 
                   onClick={(e) => handleGrade(e, 'again')}
                   className="bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm transition-transform active:scale-95"
                 >
                   Relapse<br/><span className="text-[10px] opacity-75">1d</span>
                 </button>
                 <button 
                   onClick={(e) => handleGrade(e, 'hard')}
                   className="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm transition-transform active:scale-95"
                 >
                   Hard<br/><span className="text-[10px] opacity-75">2d</span>
                 </button>
                 <button 
                   onClick={(e) => handleGrade(e, 'good')}
                   className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm transition-transform active:scale-95"
                 >
                   Stable<br/><span className="text-[10px] opacity-75">1w</span>
                 </button>
                 <button 
                   onClick={(e) => handleGrade(e, 'easy')}
                   className="bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm transition-transform active:scale-95"
                 >
                   Cured<br/><span className="text-[10px] opacity-75">2w</span>
                 </button>
               </div>
             </div>
           ) : (
             <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button variant="ghost" className="!p-2 text-white/80 hover:text-white hover:bg-white/20" onClick={handleAudio}>
                  <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
                </Button>
             </div>
           )}
           
           <div className={`w-full h-full flex flex-col items-center justify-center overflow-y-auto scrollbar-hide pt-6 ${isReviewMode ? 'pb-16' : ''}`}>
             <h4 className="text-xl font-semibold mb-2 text-center mt-2 shrink-0">{card.englishTranslation}</h4>
             <div className={`w-12 h-1 ${colors.backDivider} rounded-full mb-4 shrink-0`}></div>
             
             <p className="text-white/90 mb-4 italic text-sm text-center">"{card.definition}"</p>
             
             <div className={`${colors.backBox} p-3 rounded-lg w-full shrink-0`}>
               <p className="text-sm font-medium leading-relaxed text-center">"{card.exampleSentence}"</p>
               {card.exampleSentenceEnglish && (
                 <p className="text-xs text-white/70 mt-2 pt-2 border-t border-white/20 text-center">"{card.exampleSentenceEnglish}"</p>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
