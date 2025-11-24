import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, User, Stethoscope, Send, StopCircle, Plus, Trash2, Sparkles, GraduationCap, X, Check, Lightbulb, Loader2 } from 'lucide-react';
import { createChatSession, generateSpeech, playPcmData, getChatFeedback, generateChatHints } from '../services/geminiService';
import { ChatMessage, Scenario, Difficulty } from '../types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';

const defaultScenarios: Scenario[] = [
  {
    id: 'chest_pain',
    title: 'Anamnesis: Chest Pain',
    description: 'A 55-year-old patient complains of pressing retrosternal pain.',
    difficulty: Difficulty.B2,
    systemPrompt: `You are Herr Müller, a 55-year-old patient in a German hospital ER. 
    You have chest pain (pressing, radiating to left arm). You are anxious. 
    Speak only in German. Use layperson terms (e.g., "Brustschmerzen" not "Thoraxschmerz").
    The user is the doctor taking your anamnesis. 
    Keep responses relatively short (1-3 sentences) to encourage dialogue.`
  },
  {
    id: 'discharge',
    title: 'Discharge Conversation',
    description: 'Explain the medication plan to an elderly patient.',
    difficulty: Difficulty.B2,
    systemPrompt: `You are Frau Schmidt, an elderly patient (75yo) being discharged after hip surgery.
    You are a bit confused about your medication. 
    Speak only in German. Ask clarifying questions about when to take the pills.
    The user is the ward physician.`
  },
  {
    id: 'handover',
    title: 'Colleague Handover',
    description: 'Hand over a patient case to the night shift doctor.',
    difficulty: Difficulty.C1,
    systemPrompt: `You are Dr. Weber, the night shift colleague. 
    You are tired but professional. Ask specific medical questions about the patient's stability and pending labs.
    Speak in professional medical German (Fachsprache).
    The user is the doctor finishing their shift.`
  }
];

interface FeedbackData {
  corrections: string[];
  vocabulary_tips: string[];
  positive_feedback: string;
}

export const Roleplay: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Custom Scenario State
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>(() => {
    const saved = localStorage.getItem('customScenarios');
    return saved ? JSON.parse(saved) : [];
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newScenario, setNewScenario] = useState({
    title: '', description: '', difficulty: Difficulty.B2, patientRole: '', context: ''
  });

  // Feedback Mode
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Hints
  const [hints, setHints] = useState<string[]>([]);
  const [isHintsLoading, setIsHintsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('customScenarios', JSON.stringify(savedScenarios));
  }, [savedScenarios]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setMessages([{
      id: 'init',
      role: 'model',
      text: "Guten Tag, Herr Doktor/Frau Doktor. (Scenario started)"
    }]);
    const chat = createChatSession(scenario.systemPrompt);
    setChatSession(chat);
    setFeedbackData(null); // Reset feedback
    setHints([]);
  };

  const handleCreateScenario = (e: React.FormEvent) => {
    e.preventDefault();
    const systemPrompt = `You are playing a role in a medical simulation. 
    Role: ${newScenario.patientRole}. 
    Context: ${newScenario.context}.
    Difficulty Level: ${newScenario.difficulty} (German Language).
    Speak only in German. Act naturally according to your role. 
    The user is a doctor. Keep responses conversational (1-3 sentences).`;

    const scenario: Scenario = {
      id: `custom-${Date.now()}`,
      title: newScenario.title,
      description: newScenario.description,
      difficulty: newScenario.difficulty,
      systemPrompt,
      isCustom: true
    };

    setSavedScenarios([...savedScenarios, scenario]);
    setIsModalOpen(false);
    setNewScenario({ title: '', description: '', difficulty: Difficulty.B2, patientRole: '', context: '' });
  };

  const deleteScenario = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedScenarios(savedScenarios.filter(s => s.id !== id));
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !chatSession) return;

    setHints([]); // Clear previous hints
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessage({ message: userMsg.text });
      const responseText = result.text;
      
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "Entschuldigung, ich habe das nicht verstanden."
      };
      
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const playMessageAudio = async (msg: ChatMessage) => {
    if (msg.role === 'user') return; 

    try {
      const pcmData = await generateSpeech(msg.text);
      if (pcmData) {
         await playPcmData(pcmData);
      }
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const handleGetFeedback = async () => {
    if (messages.length <= 1) return;
    setIsFeedbackLoading(true);
    const feedback = await getChatFeedback(messages);
    if (feedback) {
      setFeedbackData(feedback);
      setShowFeedbackModal(true);
    }
    setIsFeedbackLoading(false);
  };

  const handleGetHints = async () => {
    if (hints.length > 0) {
      setHints([]); // Toggle off
      return;
    }
    setIsHintsLoading(true);
    const newHints = await generateChatHints(messages);
    if (newHints) {
      setHints(newHints);
    }
    setIsHintsLoading(false);
  };

  const useHint = (hint: string) => {
    setInput(hint);
    setHints([]);
  };

  if (!selectedScenario) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare className="text-teal-600" />
            Klinische Szenarien
          </h2>
          <Button onClick={() => setIsModalOpen(true)} variant="outline">
            <Plus className="w-4 h-4" /> Create Custom Scenario
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...defaultScenarios, ...savedScenarios].map((scenario) => (
            <div key={scenario.id} className="bg-white rounded-2xl p-6 shadow-sm border border-teal-50 hover:shadow-md transition-shadow flex flex-col justify-between h-64 relative group">
              {scenario.isCustom && (
                <button 
                  onClick={(e) => deleteScenario(e, scenario.id)}
                  className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${scenario.difficulty === Difficulty.C1 ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>
                    Level {scenario.difficulty}
                  </span>
                  {scenario.isCustom && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Custom</span>}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{scenario.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{scenario.description}</p>
              </div>
              <Button onClick={() => startScenario(scenario)} className="w-full mt-4">
                Start Simulation
              </Button>
            </div>
          ))}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Custom Scenario">
          <form onSubmit={handleCreateScenario} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Title</label>
              <input 
                type="text" 
                value={newScenario.title}
                onChange={(e) => setNewScenario({...newScenario, title: e.target.value})}
                className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
                placeholder="e.g. Difficult Patient in Psychiatry"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (for menu)</label>
              <input 
                type="text" 
                value={newScenario.description}
                onChange={(e) => setNewScenario({...newScenario, description: e.target.value})}
                className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
                placeholder="Brief summary..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language Level</label>
                <select 
                  value={newScenario.difficulty}
                  onChange={(e) => setNewScenario({...newScenario, difficulty: e.target.value as Difficulty})}
                  className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value={Difficulty.B1}>B1 (Intermediate)</option>
                  <option value={Difficulty.B2}>B2 (Upper Intermediate)</option>
                  <option value={Difficulty.C1}>C1 (Advanced/Professional)</option>
                </select>
               </div>
            </div>

            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 space-y-4">
              <h4 className="text-sm font-bold text-teal-800 flex items-center gap-2">
                 <Sparkles className="w-4 h-4" /> AI Configuration
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Who is the AI playing?</label>
                <input 
                  type="text" 
                  value={newScenario.patientRole}
                  onChange={(e) => setNewScenario({...newScenario, patientRole: e.target.value})}
                  className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
                  placeholder="e.g. A 40-year old construction worker with back pain"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Situation / Context</label>
                <textarea 
                  value={newScenario.context}
                  onChange={(e) => setNewScenario({...newScenario, context: e.target.value})}
                  className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
                  placeholder="e.g. The patient is demanding strong painkillers and refuses physical therapy."
                  rows={3}
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Create Scenario</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-teal-600 p-4 text-white flex justify-between items-center shrink-0">
        <div className="flex-1 min-w-0 mr-4">
           <h3 className="font-bold flex items-center gap-2 truncate">
             <Stethoscope className="w-5 h-5" />
             {selectedScenario.title}
           </h3>
           <p className="text-teal-100 text-xs opacity-90 truncate">{selectedScenario.description}</p>
        </div>
        <div className="flex gap-2">
           <Button 
             variant="secondary" 
             onClick={handleGetFeedback}
             disabled={isFeedbackLoading || messages.length <= 1}
             className="bg-white/10 hover:bg-white/20 text-white border-0"
           >
             {isFeedbackLoading ? (
               <GraduationCap className="w-5 h-5 animate-bounce" />
             ) : (
               <GraduationCap className="w-5 h-5 mr-1" />
             )}
             <span className="hidden sm:inline">Coach Me</span>
           </Button>
           <Button variant="ghost" onClick={() => setSelectedScenario(null)} className="text-white hover:bg-teal-700">
             <StopCircle className="w-5 h-5 mr-1" /> End
           </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm relative group ${
              msg.role === 'user' 
                ? 'bg-teal-600 text-white rounded-br-none' 
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
                {msg.role === 'user' ? <User className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
                <span className="font-semibold uppercase tracking-wider">{msg.role === 'user' ? 'Du' : 'Patient/Kollege'}</span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              
              {/* Play Button for Model messages */}
              {msg.role === 'model' && (
                <button 
                  onClick={() => playMessageAudio(msg)}
                  className="absolute -right-8 top-2 p-1.5 text-gray-400 hover:text-teal-600 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Play pronunciation"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Hints UI */}
        {hints.length > 0 && (
          <div className="flex flex-col gap-2 items-center animate-in slide-in-from-bottom fade-in py-2">
            <p className="text-xs font-bold text-gray-400 uppercase">Suggested Responses</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {hints.map((hint, idx) => (
                <button 
                  key={idx}
                  onClick={() => useHint(hint)}
                  className="bg-teal-50 text-teal-700 border border-teal-200 rounded-xl px-4 py-2 text-sm hover:bg-teal-100 transition-colors text-left max-w-xs"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 shrink-0 flex gap-2">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={handleGetHints}
          disabled={isHintsLoading || isLoading || messages.length === 0}
          className="text-amber-500 hover:bg-amber-50"
          title="Get a hint"
        >
          {isHintsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lightbulb className="w-5 h-5 fill-current" />}
        </Button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Antworten Sie auf Deutsch..."
          className="flex-1 bg-gray-100 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()} className="!rounded-xl px-6">
          <Send className="w-5 h-5" />
        </Button>
      </form>

      {/* Feedback Modal */}
      <Modal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} title="AI Language Coach Report">
        {feedbackData && (
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex gap-3">
               <div className="bg-green-100 p-2 rounded-full h-fit">
                 <Sparkles className="w-5 h-5 text-green-600" />
               </div>
               <div>
                 <h4 className="font-bold text-green-800 text-sm mb-1">Analysis</h4>
                 <p className="text-green-800/80 text-sm leading-relaxed">{feedbackData.positive_feedback}</p>
               </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" /> Corrections
              </h4>
              {feedbackData.corrections.length > 0 ? (
                <ul className="space-y-2">
                  {feedbackData.corrections.map((item, i) => (
                    <li key={i} className="text-sm bg-red-50 text-red-800 p-3 rounded-lg border border-red-100">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No major grammar mistakes detected. Great job!</p>
              )}
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-teal-500" /> Medical Terminology Tips
              </h4>
              {feedbackData.vocabulary_tips.length > 0 ? (
                <ul className="space-y-2">
                  {feedbackData.vocabulary_tips.map((item, i) => (
                    <li key={i} className="text-sm bg-teal-50 text-teal-800 p-3 rounded-lg border border-teal-100">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">Your use of Fachsprache is already quite good.</p>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowFeedbackModal(false)}>Back to Chat</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};