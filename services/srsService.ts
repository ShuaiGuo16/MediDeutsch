
import { Flashcard } from '../types';

// The Hospital Metaphor Levels
// Level 0: Notaufnahme (Emergency) - Interval: 1 day (Daily check)
// Level 1: Intensiv (ICU) - Interval: 3 days
// Level 2: Station (Ward) - Interval: 7 days
// Level 3: Reha (Rehab) - Interval: 14 days
// Level 4: Entlassen (Discharged/Mastered) - Interval: 30 days+

export const calculateNextReview = (currentLevel: number, performance: 'again' | 'hard' | 'good' | 'easy'): { level: number, nextDate: string } => {
  let newLevel = currentLevel;
  let daysToAdd = 0;

  switch (performance) {
    case 'again': // Relapse -> Back to ER
      newLevel = 0;
      daysToAdd = 0; // Review today/tomorrow
      break;
    case 'hard': // Complication -> Stay same or downgrade
      newLevel = Math.max(0, currentLevel - 1);
      daysToAdd = 1;
      break;
    case 'good': // Stable -> Move to next ward
      newLevel = Math.min(4, currentLevel + 1);
      break;
    case 'easy': // Miracle Recovery -> Jump wards
      newLevel = Math.min(4, currentLevel + 2);
      break;
  }

  // Calculate interval based on NEW level
  switch (newLevel) {
    case 0: daysToAdd = 1; break;
    case 1: daysToAdd = 3; break;
    case 2: daysToAdd = 7; break;
    case 3: daysToAdd = 14; break;
    case 4: daysToAdd = 30; break;
    default: daysToAdd = 1;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  // Set to start of day to avoid time drift issues
  nextDate.setHours(0, 0, 0, 0);

  return {
    level: newLevel,
    nextDate: nextDate.toISOString()
  };
};

export const isCardDue = (card: Flashcard): boolean => {
  if (!card.nextReviewDate) return true; // New cards are due
  if (card.mastered) return false; // Mastered cards are not due in standard review
  
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  const reviewDate = new Date(card.nextReviewDate);
  
  return reviewDate <= today;
};

export const getWardName = (level?: number): string => {
  switch (level) {
    case 0: return '🚑 Notaufnahme';
    case 1: return '🛏️ Intensiv';
    case 2: return '🏥 Station';
    case 3: return '🏃 Reha';
    case 4: return '✅ Entlassen';
    default: return '🚑 Notaufnahme';
  }
};

export const formatDueDate = (isoDate?: string): string => {
  if (!isoDate) return 'Due Now';
  
  const due = new Date(isoDate);
  const today = new Date();
  today.setHours(0,0,0,0);
  due.setHours(0,0,0,0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays <= 0) return 'Due Today';
  if (diffDays === 1) return 'Tomorrow';
  return `in ${diffDays} days`;
};
