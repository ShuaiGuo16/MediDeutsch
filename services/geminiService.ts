import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Flashcard, Topic, MedicalCase, Difficulty, ChatMessage } from "../types";

// Ensure API key is present
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to strip Markdown code blocks if present
const cleanAndParseJSON = (text: string) => {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    return [];
  }
};

export const generateFlashcards = async (topic: Topic, count: number = 6, excludeTerms: string[] = []): Promise<Flashcard[]> => {
  try {
    // Use the full list of excluded terms joined by commas for efficiency
    // Gemini Flash has a large context window, so we can pass the entire list to ensure uniqueness
    const exclusionList = excludeTerms.join(", ");

    const prompt = `Generate ${count} distinct German medical vocabulary flashcards for the topic "${topic}". 
    Target audience: Medical professionals learning German (Level B2/C1).
    
    CRITICAL: DO NOT generate any of the following terms (they are already known): ${exclusionList}.
    
    Include:
    - Term
    - Syllable breakdown (e.g. "Nie·ren·be·cken") using '·' as separator
    - Grammatical gender (article)
    - A concise definition (max 15 words) in simple professional German
    - A short example sentence (max 20 words) typically used in a hospital
    - English translation of the term
    - English translation of the example sentence
    
    Ensure diversity in the terms (mix of nouns, verbs, and adjectives if appropriate).`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING, description: "The German medical term (noun or verb)" },
              syllables: { type: Type.STRING, description: "Syllable breakdown with dot separator" },
              article: { type: Type.STRING, description: "Definite article (der/die/das) or empty if verb" },
              definition: { type: Type.STRING, description: "Definition in German" },
              exampleSentence: { type: Type.STRING, description: "A realistic sentence used in a clinical setting" },
              exampleSentenceEnglish: { type: Type.STRING, description: "English translation of the example sentence" },
              englishTranslation: { type: Type.STRING, description: "English translation of the term" },
              category: { type: Type.STRING, description: "The sub-category" }
            },
            required: ["term", "article", "definition", "exampleSentence", "exampleSentenceEnglish", "englishTranslation", "category"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return cleanAndParseJSON(text) as Flashcard[];
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return [];
  }
};

export const generateFlashcardsFromTerms = async (terms: string[]): Promise<Flashcard[]> => {
  try {
    // Deduplicate terms
    const uniqueTerms = Array.from(new Set(terms));
    const allFlashcards: Flashcard[] = [];
    
    // Batch process terms to handle any size (e.g., 20 at a time)
    const batchSize = 20;
    
    for (let i = 0; i < uniqueTerms.length; i += batchSize) {
      const batch = uniqueTerms.slice(i, i + batchSize);
      
      const prompt = `Create German medical flashcards for exactly these input strings: ${JSON.stringify(batch)}.
      Note: The inputs might contain foreign text (e.g., Chinese, English notes). EXTRACT only the main German medical term.
      Target audience: Medical professionals (B2/C1).
      Return a JSON array.
      If a term is completely invalid/not medical, skip it.
      Use concise definitions (max 15 words) and short example sentences (max 20 words).
      Include syllable breakdown (e.g. "Blind·darm").
      For 'exampleSentenceEnglish', provide the English translation of the German example sentence.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                syllables: { type: Type.STRING },
                article: { type: Type.STRING },
                definition: { type: Type.STRING },
                exampleSentence: { type: Type.STRING },
                exampleSentenceEnglish: { type: Type.STRING },
                englishTranslation: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["term", "article", "definition", "exampleSentence", "exampleSentenceEnglish", "englishTranslation", "category"]
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        const batchResults = cleanAndParseJSON(text) as Flashcard[];
        // Filter out any potential empty/malformed results
        if (Array.isArray(batchResults)) {
           allFlashcards.push(...batchResults);
        }
      }
    }

    return allFlashcards;
  } catch (error) {
    console.error("Error generating flashcards from list:", error);
    return [];
  }
};

export const enrichFlashcard = async (term: string): Promise<Flashcard | null> => {
  try {
    const prompt = `Create a detailed German medical flashcard for the term: "${term}".
    Target audience: Medical professionals (B2/C1).
    Keep the definition concise (max 15 words) and the example sentence short (max 20 words).
    Include syllable breakdown.
    Return a single JSON object.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            syllables: { type: Type.STRING },
            article: { type: Type.STRING },
            definition: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            exampleSentenceEnglish: { type: Type.STRING },
            englishTranslation: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["term", "article", "definition", "exampleSentence", "exampleSentenceEnglish", "englishTranslation", "category"]
        }
      }
    });
    
    const text = response.text;
    if (!text) return null;
    return cleanAndParseJSON(text) as Flashcard;
  } catch (error) {
    console.error("Error enriching flashcard:", error);
    return null;
  }
}

// Helper: Decode Base64 to Uint8Array
const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper: Play raw PCM data
export const playPcmData = async (pcmData: Uint8Array, sampleRate: number = 24000): Promise<void> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Convert 16-bit PCM to Float32
  const dataInt16 = new Int16Array(pcmData.buffer);
  const numChannels = 1;
  const frameCount = dataInt16.length;
  
  const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < frameCount; i++) {
    // Normalize Int16 to Float32 [-1.0, 1.0]
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
  
  return new Promise((resolve) => {
    source.onended = () => {
      resolve();
      audioContext.close(); // Clean up context
    };
  });
};

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    return decodeBase64(base64Audio);
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
};

export const createChatSession = (systemInstruction: string) => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
    },
  });
};

export const getChatFeedback = async (history: ChatMessage[]) => {
  try {
    // Filter out initial system messages or audio flags, keep only text
    const conversation = history
      .filter(m => m.id !== 'init')
      .map(m => `${m.role.toUpperCase()}: ${m.text}`)
      .join('\n');

    const prompt = `Analyze this German roleplay conversation between a Doctor (User) and a Patient/Colleague (Model).
    
    Conversation:
    ${conversation}
    
    Task:
    1. Identify any grammatical mistakes made by the USER.
    2. Suggest better "Fachsprache" (Medical Terminology) where the user used layperson terms.
    3. Give a short positive comment on what they did well.
    
    Return the response in JSON format with fields: 'corrections' (array of strings), 'vocabulary_tips' (array of strings), 'positive_feedback' (string).`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            corrections: { type: Type.ARRAY, items: { type: Type.STRING } },
            vocabulary_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            positive_feedback: { type: Type.STRING }
          },
          required: ["corrections", "vocabulary_tips", "positive_feedback"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return cleanAndParseJSON(text);
  } catch (error) {
    console.error("Error getting feedback:", error);
    return null;
  }
};

export const generateChatHints = async (history: ChatMessage[]): Promise<string[] | null> => {
  try {
    const conversation = history
      .map(m => `${m.role.toUpperCase()}: ${m.text}`)
      .join('\n');

    const prompt = `You are a medical communication coach.
    Based on the conversation below, suggest 3 distinct, professional German responses the User (Doctor) could say next.
    Make them varied (e.g., one empathetic, one clinical question, one giving instructions).
    
    Conversation:
    ${conversation}
    
    Return ONLY a JSON array of 3 strings.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
           type: Type.ARRAY,
           items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return cleanAndParseJSON(text);
  } catch (error) {
    console.error("Error generating hints:", error);
    return null;
  }
};

export const generateCaseStudy = async (department: string): Promise<MedicalCase | null> => {
  try {
    const prompt = `Generate a realistic German medical case study (Fallbeispiel) for the department: ${department}.
    Target Level: B2/C1 Medical German.
    
    Structure the response as a JSON object with:
    1. 'title': A short medical title (e.g., Akute Appendizitis).
    2. 'caseText': A 150-200 word clinical report (Anamnese, Befund, Verdachtsdiagnose). Use professional "Arztbrief" style language.
    3. 'questions': An array of 3 multiple choice questions.
       - Question 1 should test "Fachsprache" (e.g., "The text mentions 'high blood pressure', what is the medical term used?").
       - Question 2 should test reading comprehension.
       - Question 3 should be about the next clinical step or diagnosis.
       
    Each question must have: 'text', 'options' (array of 4 strings), 'correctIndex' (0-3), and 'explanation' (in German).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING }, // Just a placeholder, we generate real ID later
            title: { type: Type.STRING },
            department: { type: Type.STRING },
            caseText: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["text", "options", "correctIndex", "explanation"]
              }
            }
          },
          required: ["title", "caseText", "questions"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const result = cleanAndParseJSON(text);
    // Add runtime ID
    return {
      ...result,
      id: Date.now().toString(),
      department,
      difficulty: Difficulty.C1
    } as MedicalCase;

  } catch (error) {
    console.error("Error generating case study:", error);
    return null;
  }
};