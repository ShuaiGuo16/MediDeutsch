import React, { useState, useCallback } from 'react';
import { Volume2, RotateCw, Heart, Check, Trash2 } from 'lucide-react';
import { Flashcard } from '../types';
import { generateSpeech, playPcmData } from '../services/geminiService';
import { Button } from './Button';

interface FlashcardItemProps {
  card: Flashcard;
  isSaved?: boolean;
  onToggleSave?: (card: Flashcard) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (card: Flashcard) => void;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = ({ 
  card, 
  isSaved = false, 
  onToggleSave,
  isSelectionMode = false,
  isSelected = false,
  onSelect
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

  // Determine Color Scheme based on Article (Visual Mnemonic)
  const getColors = () => {
    const art = card.article.toLowerCase();
    if (art === 'der') return {
      frontBorder: 'border-blue-100',
      badge: 'bg-blue-50 text-blue-600',
      activeRing: 'ring-blue-500',
      selectedBg: 'bg-blue-600',
      backBg: 'bg-blue-600',
      backDivider: 'bg-blue-400/50',
      backBox: 'bg-blue-800/30'
    };
    if (art === 'die') return {
      frontBorder: 'border-rose-100',
      badge: 'bg-rose-50 text-rose-600',
      activeRing: 'ring-rose-500',
      selectedBg: 'bg-rose-500',
      backBg: 'bg-rose-500',
      backDivider: 'bg-rose-300/50',
      backBox: 'bg-rose-800/30'
    };
    if (art === 'das') return {
      frontBorder: 'border-emerald-100',
      badge: 'bg-emerald-50 text-emerald-600',
      activeRing: 'ring-emerald-500',
      selectedBg: 'bg-emerald-600',
      backBg: 'bg-emerald-600',
      backDivider: 'bg-emerald-400/50',
      backBox: 'bg-emerald-800/30'
    };
    // Default/Plural
    return {
      frontBorder: 'border-teal-100',
      badge: 'bg-teal-50 text-teal-600',
      activeRing: 'ring-teal-500',
      selectedBg: 'bg-teal-600',
      backBg: 'bg-teal-600',
      backDivider: 'bg-teal-400/50',
      backBox: 'bg-teal-800/30'
    };
  };

  const colors = getColors();

  return (
    <div 
      className={`card-flip w-full h-80 cursor-pointer group ${isFlipped && !isSelectionMode ? 'flipped' : ''}`}
      onClick={handleClick}
    >
      <div className={`card-inner relative w-full h-full text-center rounded-2xl shadow-xl transition-all duration-500 ${isSelectionMode && isSelected ? `ring-4 ${colors.activeRing} ring-offset-2` : ''}`}>
        
        {/* Front */}
        <div className={`card-front absolute w-full h-full bg-white rounded-2xl border ${colors.frontBorder} p-6 flex flex-col items-center justify-between`}>
          <div className="w-full flex justify-between items-start">
            <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded ${colors.badge}`}>
              {card.category}
            </span>
            <div className="flex gap-2 items-center">
              {isSelectionMode && (
                <div 
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? `${colors.selectedBg} border-transparent` : 'border-gray-300'}`}
                  onClick={handleSelectCheckbox}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              )}
              {!isSelectionMode && (
                <>
                  <Button variant="ghost" className="!p-2 rounded-full hover:bg-gray-50 text-gray-500" onClick={handleAudio}>
                    <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse text-teal-600' : ''}`} />
                  </Button>
                  {onToggleSave && (
                    <Button 
                      variant="ghost" 
                      className={`!p-2 rounded-full hover:bg-gray-50 ${isSaved ? 'text-rose-500' : 'text-gray-300 hover:text-rose-400'}`} 
                      onClick={handleSave}
                    >
                      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center">
             <p className="text-gray-400 text-sm mb-1">{card.article}</p>
             <h3 className="text-3xl font-bold text-gray-800 break-words w-full px-2">{card.term}</h3>
          </div>

          {!isSelectionMode && (
            <div className="text-gray-400 text-sm flex items-center gap-1">
               <RotateCw className="w-4 h-4" /> Tap to flip
            </div>
          )}
        </div>

        {/* Back */}
        <div className={`card-back absolute w-full h-full ${colors.backBg} rounded-2xl p-6 flex flex-col text-white`}>
           <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button variant="ghost" className="!p-2 text-white/80 hover:text-white hover:bg-white/20" onClick={handleAudio}>
                <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
              </Button>
           </div>
           
           <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto scrollbar-hide pt-6">
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