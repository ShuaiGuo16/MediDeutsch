
import { Flashcard, Topic } from '../types';

export const CORE_VOCABULARY: Record<string, Flashcard[]> = {
  [Topic.ANATOMY]: [
    {
      term: 'Bauchspeicheldrüse',
      article: 'die',
      definition: 'Organ, das Verdauungsenzyme und Hormone wie Insulin produziert.',
      exampleSentence: 'Die Bauchspeicheldrüse ist entzündet.',
      exampleSentenceEnglish: 'The pancreas is inflamed.',
      englishTranslation: 'Pancreas',
      category: Topic.ANATOMY,
      syllables: 'Bauch·spei·chel·drü·se'
    },
    {
      term: 'Schlüsselbein',
      article: 'das',
      definition: 'Knochen, der das Brustbein mit dem Schulterblatt verbindet.',
      exampleSentence: 'Er hat sich beim Sturz das Schlüsselbein gebrochen.',
      exampleSentenceEnglish: 'He broke his collarbone during the fall.',
      englishTranslation: 'Clavicle / Collarbone',
      category: Topic.ANATOMY,
      syllables: 'Schlüs·sel·bein'
    },
    {
      term: 'Gallenblase',
      article: 'die',
      definition: 'Organ, das die von der Leber produzierte Galle speichert.',
      exampleSentence: 'Wir müssen die Gallenblase laparoskopisch entfernen.',
      exampleSentenceEnglish: 'We have to remove the gallbladder laparoscopically.',
      englishTranslation: 'Gallbladder',
      category: Topic.ANATOMY,
      syllables: 'Gal·len·bla·se'
    },
    {
      term: 'Zwölffingerdarm',
      article: 'der',
      definition: 'Der erste Abschnitt des Dünndarms.',
      exampleSentence: 'Das Geschwür befindet sich im Zwölffingerdarm.',
      exampleSentenceEnglish: 'The ulcer is located in the duodenum.',
      englishTranslation: 'Duodenum',
      category: Topic.ANATOMY,
      syllables: 'Zwölf·fin·ger·darm'
    },
    {
      term: 'Schilddrüse',
      article: 'die',
      definition: 'Hormondrüse unterhalb des Kehlkopfes.',
      exampleSentence: 'Der Patient leidet an einer Unterfunktion der Schilddrüse.',
      exampleSentenceEnglish: 'The patient suffers from hypothyroidism.',
      englishTranslation: 'Thyroid gland',
      category: Topic.ANATOMY,
      syllables: 'Schild·drü·se'
    }
  ],
  [Topic.CARDIOLOGY]: [
    {
      term: 'Vorhofflimmern',
      article: 'das',
      definition: 'Eine häufige Herzrhythmusstörung.',
      exampleSentence: 'Das EKG zeigt deutliches Vorhofflimmern.',
      exampleSentenceEnglish: 'The ECG shows clear atrial fibrillation.',
      englishTranslation: 'Atrial fibrillation',
      category: Topic.CARDIOLOGY,
      syllables: 'Vor·hof·flim·mern'
    },
    {
      term: 'Herzklappe',
      article: 'die',
      definition: 'Ventil im Herzen, das den Blutfluss regelt.',
      exampleSentence: 'Die Mitralklappe schließt nicht mehr richtig.',
      exampleSentenceEnglish: 'The mitral valve does not close properly anymore.',
      englishTranslation: 'Heart valve',
      category: Topic.CARDIOLOGY,
      syllables: 'Herz·klap·pe'
    },
    {
      term: 'Herzinsuffizienz',
      article: 'die',
      definition: 'Herzschwäche; ungenügende Pumpleistung des Herzens.',
      exampleSentence: 'Er nimmt Wassertabletten wegen seiner Herzinsuffizienz.',
      exampleSentenceEnglish: 'He takes water pills because of his heart failure.',
      englishTranslation: 'Heart failure',
      category: Topic.CARDIOLOGY,
      syllables: 'Herz·in·suf·fi·zi·enz'
    }
  ],
  [Topic.SURGERY]: [
    {
      term: 'Blinddarm',
      article: 'der',
      definition: 'Wurmfortsatz am Anfang des Dickdarms.',
      exampleSentence: 'Der Blinddarm muss sofort entfernt werden.',
      exampleSentenceEnglish: 'The appendix must be removed immediately.',
      englishTranslation: 'Appendix',
      category: Topic.SURGERY,
      syllables: 'Blind·darm'
    },
    {
      term: 'Narkose',
      article: 'die',
      definition: 'Künstlicher Schlaf zur Schmerzausschaltung während einer OP.',
      exampleSentence: 'Der Patient hat die Narkose gut vertragen.',
      exampleSentenceEnglish: 'The patient tolerated the anesthesia well.',
      englishTranslation: 'Anesthesia',
      category: Topic.SURGERY,
      syllables: 'Nar·ko·se'
    },
    {
      term: 'Naht',
      article: 'die',
      definition: 'Verbindung von Wundrändern durch Fäden.',
      exampleSentence: 'Wir entfernen die Fäden der Naht in 10 Tagen.',
      exampleSentenceEnglish: 'We will remove the sutures in 10 days.',
      englishTranslation: 'Suture / Seam',
      category: Topic.SURGERY,
      syllables: 'Naht'
    }
  ],
  [Topic.EMERGENCY]: [
    {
      term: 'Schlaganfall',
      article: 'der',
      definition: 'Plötzliche Durchblutungsstörung im Gehirn.',
      exampleSentence: 'Bei Verdacht auf Schlaganfall zählt jede Minute.',
      exampleSentenceEnglish: 'Every minute counts when a stroke is suspected.',
      englishTranslation: 'Stroke',
      category: Topic.EMERGENCY,
      syllables: 'Schlag·an·fall'
    },
    {
      term: 'Gehirnerschütterung',
      article: 'die',
      definition: 'Leichte Verletzung des Gehirns durch einen Stoß.',
      exampleSentence: 'Er hat eine leichte Gehirnerschütterung und braucht Ruhe.',
      exampleSentenceEnglish: 'He has a mild concussion and needs rest.',
      englishTranslation: 'Concussion',
      category: Topic.EMERGENCY,
      syllables: 'Ge·hirn·er·schüt·te·rung'
    }
  ]
};
