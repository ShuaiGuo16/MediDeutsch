import React, { useState, useEffect } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { enrichFlashcard } from '../services/geminiService';
import { Flashcard } from '../types';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Flashcard) => void;
  initialTerm?: string;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({ isOpen, onClose, onSave, initialTerm = '' }) => {
  const [newCard, setNewCard] = useState<Partial<Flashcard>>({
    term: '', article: 'der', definition: '', exampleSentence: '', exampleSentenceEnglish: '', englishTranslation: '', category: 'General'
  });
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewCard(prev => ({ ...prev, term: initialTerm }));
      
      if (initialTerm) {
        // Automatically trigger enrichment for selected text
        const autoEnrich = async () => {
          setIsAutoFilling(true);
          const enriched = await enrichFlashcard(initialTerm);
          if (enriched) {
            setNewCard(enriched);
          }
          setIsAutoFilling(false);
        };
        autoEnrich();
      }
    } else {
      // Reset on close
      setNewCard({
        term: '', article: 'der', definition: '', exampleSentence: '', exampleSentenceEnglish: '', englishTranslation: '', category: 'General'
      });
    }
  }, [isOpen, initialTerm]);

  const handleAutoFill = async () => {
    if (!newCard.term) return;
    setIsAutoFilling(true);
    const enriched = await enrichFlashcard(newCard.term);
    if (enriched) {
      setNewCard(enriched);
    }
    setIsAutoFilling(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCard.term && newCard.definition) {
      onSave(newCard as Flashcard);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Word">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Article</label>
            <select 
              value={newCard.article}
              onChange={(e) => setNewCard({...newCard, article: e.target.value})}
              className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="der">der</option>
              <option value="die">die</option>
              <option value="das">das</option>
              <option value="">(none)</option>
            </select>
          </div>
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">German Term</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newCard.term}
                onChange={(e) => setNewCard({...newCard, term: e.target.value})}
                className="flex-1 rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
                placeholder="e.g. Blinddarm"
                required
              />
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={isAutoFilling || !newCard.term}
                className="bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                title="Auto-fill with AI"
              >
                {isAutoFilling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">English Translation</label>
          <input 
            type="text" 
            value={newCard.englishTranslation}
            onChange={(e) => setNewCard({...newCard, englishTranslation: e.target.value})}
            className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
            placeholder="e.g. Appendix"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Definition (German)</label>
          <textarea 
            value={newCard.definition}
            onChange={(e) => setNewCard({...newCard, definition: e.target.value})}
            className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
            rows={2}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Example Sentence (German)</label>
          <textarea 
            value={newCard.exampleSentence}
            onChange={(e) => setNewCard({...newCard, exampleSentence: e.target.value})}
            className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
            rows={2}
            required
          />
        </div>

         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Example Sentence (English Translation)</label>
          <input 
            type="text" 
            value={newCard.exampleSentenceEnglish}
            onChange={(e) => setNewCard({...newCard, exampleSentenceEnglish: e.target.value})}
            className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
            placeholder="e.g. The patient was operated on for appendicitis."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input 
            type="text" 
            value={newCard.category}
            onChange={(e) => setNewCard({...newCard, category: e.target.value})}
            className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
            placeholder="e.g. Anatomie"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Card</Button>
        </div>
      </form>
    </Modal>
  );
};