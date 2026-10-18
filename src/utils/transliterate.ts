/**
 * Devanagari to Romanized (Hinglish) transliteration utility.
 * Allows Indian language songs (Hindi, Punjabi, Marathi, etc.) to be read and sung
 * in English script, matching Spotify and Apple Music's romanized lyrics feature.
 */

const VOWEL_MAP: Record<string, string> = {
  'अ': 'a',
  'आ': 'aa',
  'इ': 'i',
  'ई': 'i',
  'उ': 'u',
  'ऊ': 'oo',
  'ऋ': 'ri',
  'ए': 'e',
  'ऐ': 'ai',
  'ओ': 'o',
  'औ': 'au',
};

const MATRA_MAP: Record<string, string> = {
  'ा': 'a',
  'ि': 'i',
  'ी': 'i',
  'ु': 'u',
  'ू': 'oo',
  'ृ': 'ri',
  'े': 'e',
  'ै': 'ai',
  'ो': 'o',
  'ौ': 'au',
  'ं': 'n',
  'ँ': 'n',
  'ः': 'h',
};

const CONSONANT_MAP: Record<string, string> = {
  'क': 'k',
  'ख': 'kh',
  'ग': 'g',
  'घ': 'gh',
  'ङ': 'ng',
  'च': 'ch',
  'छ': 'chh',
  'ज': 'j',
  'झ': 'jh',
  'ञ': 'ny',
  'ट': 't',
  'ठ': 'th',
  'ड': 'd',
  'ढ': 'dh',
  'ण': 'n',
  'त': 't',
  'थ': 'th',
  'द': 'd',
  'ध': 'dh',
  'न': 'n',
  'प': 'p',
  'फ': 'f',
  'ब': 'b',
  'भ': 'bh',
  'म': 'm',
  'य': 'y',
  'र': 'r',
  'ल': 'l',
  'व': 'v',
  'श': 'sh',
  'ष': 'sh',
  'स': 's',
  'ह': 'h',
  'क़': 'q',
  'ख़': 'kh',
  'ग़': 'gh',
  'ज़': 'z',
  'ड़': 'r',
  'ढ़': 'rh',
  'फ़': 'f',
};

const VIRAMA = '्';

export function transliterateDevanagariToHinglish(text: string): string {
  if (!text) return '';

  const words = text.split(/(\s+|[.,!?;:'"()[\]{}—-])/);
  return words.map((w) => transliterateWord(w)).join('');
}

function transliterateWord(word: string): string {
  if (!hasDevanagari(word)) return word;

  let out = '';
  const len = word.length;

  for (let i = 0; i < len; i++) {
    const char = word[i];
    const nextChar = i + 1 < len ? word[i + 1] : '';

    // Handle Nukta pair (e.g. क + ़ = क़)
    if (nextChar === '़') {
      const combined = char + nextChar;
      const c = CONSONANT_MAP[combined] || CONSONANT_MAP[char] || char;
      i++; // skip nukta
      const afterNukta = i + 1 < len ? word[i + 1] : '';
      if (afterNukta === VIRAMA) {
        out += c;
        i++; // skip virama
      } else if (MATRA_MAP[afterNukta]) {
        out += c + MATRA_MAP[afterNukta];
        i++; // skip matra
      } else {
        // Schwa at word end is suppressed
        const isLast = i + 1 >= len;
        out += c + (isLast ? '' : 'a');
      }
      continue;
    }

    // Independent Vowel
    if (VOWEL_MAP[char]) {
      out += VOWEL_MAP[char];
      continue;
    }

    // Consonant
    if (CONSONANT_MAP[char]) {
      const consonant = CONSONANT_MAP[char];
      if (nextChar === VIRAMA) {
        out += consonant;
        i++; // skip virama (half consonant)
      } else if (MATRA_MAP[nextChar]) {
        out += consonant + MATRA_MAP[nextChar];
        i++; // skip matra
      } else {
        // Natural Hindi schwa deletion:
        // In Hindi, word-final consonant does not carry 'a' (e.g. कर -> kar, not kara)
        const isWordEnd = i + 1 >= len;
        if (isWordEnd) {
          out += consonant;
        } else {
          // If followed by another consonant or vowel, add inherent 'a'
          out += consonant + 'a';
        }
      }
      continue;
    }

    // Standalone matra or punctuation
    if (MATRA_MAP[char]) {
      out += MATRA_MAP[char];
      continue;
    }

    out += char;
  }

  // Capitalize first letter of word
  if (out.length > 0) {
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}

export function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

export function cleanSmartSpeechToHinglish(raw: string, candidates?: string[]): string {
  // If candidates array is supplied, check if any candidate matches high confidence corrections
  const allTexts: string[] = [];
  if (raw && typeof raw === 'string') allTexts.push(raw);
  if (Array.isArray(candidates)) {
    candidates.forEach((c) => {
      if (c && typeof c === 'string' && !allTexts.includes(c)) {
        allTexts.push(c);
      }
    });
  }

  if (allTexts.length === 0) return '';

  const corrections: { [key: string]: string } = {
    // Acoustic confusion for "Arz Kiya Hai" (user reported "harsh kya hai")
    'harsh kya hai': 'Arz Kiya Hai',
    'harsh kiya hai': 'Arz Kiya Hai',
    'harsh kya he': 'Arz Kiya Hai',
    'harsh kyu hai': 'Arz Kiya Hai',
    'harsh kya': 'Arz Kiya Hai',
    'harsh kiya': 'Arz Kiya Hai',
    'arsh kya hai': 'Arz Kiya Hai',
    'arsh kiya hai': 'Arz Kiya Hai',
    'arsh kya': 'Arz Kiya Hai',
    'arz kya hai': 'Arz Kiya Hai',
    'arz kiya hai': 'Arz Kiya Hai',
    'arz kiya h': 'Arz Kiya Hai',
    'arz kiya': 'Arz Kiya Hai',
    'arj kiya hai': 'Arz Kiya Hai',
    'arjiya hai': 'Arz Kiya Hai',
    'aaj kiya hai': 'Arz Kiya Hai',
    'aaj kya hai': 'Arz Kiya Hai',
    'aaj ki hai': 'Arz Kiya Hai',
    'coke studio arz': 'Arz Kiya Hai',

    // Other popular Bollywood/Indie acoustic confusions & humming fragments
    'na kahate the': 'Naa Kahate The',
    'na kahte the': 'Naa Kahate The',
    'naa kahate the': 'Naa Kahate The',
    'na kende ne': 'Naah Hardy Sandhu',
    'na kehnde ne': 'Naah Hardy Sandhu',
    'gehra hua': 'Gehra Hua',
    'gahra hua': 'Gehra Hua',
    'kesariya': 'Kesariya',
    'kesaria': 'Kesariya',
    'kesariya tera': 'Kesariya',
    'tum hi ho': 'Tum Hi Ho',
    'tumhi ho': 'Tum Hi Ho',
    'pehla nasha': 'Pehla Nasha',
    'pehla nasha pehla khumaar': 'Pehla Nasha',
    'diljit': 'Diljit Dosanjh',
    'arijit': 'Arijit Singh',
    'anuv': 'Anuv Jain',
    'anuv jain': 'Anuv Jain',
    'dhurandhar': 'Dhurandhar',
    'ap dhillon': 'AP Dhillon',
    'sidhu': 'Sidhu Moose Wala',
    'sidhu moosewala': 'Sidhu Moose Wala',
    'husn': 'Husn',
    'husn tera': 'Husn',
    'jo tum mere ho': 'Jo Tum Mere Ho',
    'jo tum mere': 'Jo Tum Mere Ho',
    'tauba tauba': 'Tauba Tauba',
    'toba toba': 'Tauba Tauba',
    'aayi nai': 'Aayi Nai',
    'aai nai': 'Aayi Nai',
    'khoobsurat': 'Khoobsurat',
    'khubsurat': 'Khoobsurat',
    'chuttamalle': 'Chuttamalle',
    'chal kudiye': 'Chal Kudiye',
    'sajni re': 'Sajni',
    'sajni': 'Sajni',
    'taras': 'Taras',
    'tere hawale': 'Tere Hawaale',
    'tere hawaale': 'Tere Hawaale',
    'apna bana le': 'Apna Bana Le',
    'channa mereya': 'Channa Mereya',
    'baarishein': 'Baarishein',
    'barishein': 'Baarishein',
    'alag aasmaan': 'Alag Aasmaan',
    'alag aasman': 'Alag Aasmaan',
    'mishri': 'Mishri',
    'ocean': 'Ocean',
    'o maahi': 'O Maahi',
    'o mahi': 'O Maahi',
    'omahi': 'O Maahi',
    // Hafiz Hafiz (Laila Majnu / Mohit Chauhan)
    'haaphij haaphij': 'Hafiz Hafiz',
    'haaphij': 'Hafiz Hafiz',
    'haaphiz haaphiz': 'Hafiz Hafiz',
    'haaphiz': 'Hafiz Hafiz',
    'hafiz hafiz': 'Hafiz Hafiz',
    'hafiz': 'Hafiz Hafiz',
    'haafiz haafiz': 'Hafiz Hafiz',
    'haafiz': 'Hafiz Hafiz',
    'hafij hafij': 'Hafiz Hafiz',
    'hafij': 'Hafiz Hafiz',
    'hafeez hafeez': 'Hafiz Hafiz',
    'hafeez': 'Hafiz Hafiz',
    'o hafiz': 'Hafiz Hafiz',
    'hafiz hafiz song': 'Hafiz Hafiz',

    'satranga': 'Satranga',
    'chaleya': 'Chaleya',
  };

  // Check all candidates first against the acoustic correction dictionary
  for (const item of allTexts) {
    let transliterated = transliterateDevanagariToHinglish(item).trim();
    transliterated = transliterated.replace(/[.?!,;:"']/g, '').trim().toLowerCase();

    // Normalize phonetic errors before dictionary lookup
    const norm = transliterated
      .replace(/\bha+ph+[ie]+[jz]\b/g, 'hafiz')
      .replace(/\bha+f+[ie]+[jz]\b/g, 'hafiz')
      .replace(/phij\b/g, 'fiz')
      .replace(/fij\b/g, 'fiz');

    for (const [pattern, replacement] of Object.entries(corrections)) {
      if (
        norm === pattern ||
        norm.startsWith(pattern + ' ') ||
        norm.endsWith(' ' + pattern) ||
        norm.includes(pattern) ||
        transliterated === pattern ||
        transliterated.startsWith(pattern + ' ') ||
        transliterated.endsWith(' ' + pattern) ||
        transliterated.includes(pattern)
      ) {
        return replacement;
      }
    }
  }

  // If no direct dictionary match, transliterate primary raw string to clean Hinglish
  let text = transliterateDevanagariToHinglish(raw).trim();
  text = text.replace(/[.?!,;:"']/g, '').trim();

  // Clean common phonetic suffixes (phij -> fiz, haaphij -> Hafiz)
  text = text
    .replace(/\bha+ph+[ie]+[jz]\b/gi, 'Hafiz')
    .replace(/\bha+f+[ie]+[jz]\b/gi, 'Hafiz')
    .replace(/phij\b/gi, 'fiz')
    .replace(/fij\b/gi, 'fiz');

  // Capitalize first letter of words
  return text
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

