/**
 * Tamil to English / Tanglish phonetic transliteration and search matching utility.
 * Allows searching Tamil shop names, addresses, and items using English (Tanglish) or Tamil.
 *
 * Example:
 *   matchesTamilSearch("பவானி ஸ்டோர்", "bavani store") => true
 *   matchesTamilSearch("பவானி ஸ்டோர்", "bhavani") => true
 *   matchesTamilSearch("சஞ்சனா டீ கடை", "sanjana") => true
 *   matchesTamilSearch("அக் ஷா ஸ்வீட்ஸ்", "aksha sweets") => true
 */

const TAMIL_CONSONANTS: Record<string, string> = {
  'க': 'k', 'ங': 'ng', 'ச': 's', 'ஞ': 'nj', 'ட': 't', 'ண': 'n',
  'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r',
  'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
  'ஜ': 'j', 'ஶ': 'sh', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h', 'க்ஷ': 'ksh'
};

const TAMIL_VOWELS: Record<string, string> = {
  'அ': 'a', 'ஆ': 'a', 'இ': 'i', 'ஈ': 'i', 'உ': 'u', 'ஊ': 'u',
  'எ': 'e', 'ஏ': 'e', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'o', 'ஔ': 'au', 'ஃ': 'k'
};

const TAMIL_VOWEL_SIGNS: Record<string, string> = {
  'ா': 'a', 'ி': 'i', 'ீ': 'i', 'ு': 'u', 'ூ': 'u',
  'ெ': 'e', 'ே': 'e', 'ை': 'ai', 'ொ': 'o', 'ோ': 'o', 'ௌ': 'au'
};

/**
 * Transliterates Tamil text into Romanized phonetic text
 */
export function transliterateTamil(text: string): string {
  if (!text) return '';

  let str = text
    .replace(/ஸ்டோர்ஸ்/g, ' stores ')
    .replace(/ஸ்டோர்/g, ' store ')
    .replace(/ஸ்வீட்ஸ்/g, ' sweets ')
    .replace(/ஸ்வீட்/g, ' sweet ')
    .replace(/டீ/g, ' tea ')
    .replace(/கடை/g, ' kadai ')
    .replace(/பேக்கரி/g, ' bakery ')
    .replace(/ஹோட்டல்/g, ' hotel ')
    .replace(/ஸ்ரீ/g, ' sri ')
    .replace(/மெடிக்கல்/g, ' medical ')
    .replace(/பிராவிஷன்/g, ' provision ')
    .replace(/ஏஜென்சி/g, ' agency ')
    .replace(/மார்ட்/g, ' mart ')
    .replace(/ஞ்ச/g, 'nja')
    .replace(/ந்த/g, 'nda')
    .replace(/ம்ப/g, 'mba')
    .replace(/ங்க/g, 'nga')
    .replace(/ட்ட/g, 'tta')
    .replace(/க்க/g, 'kka')
    .replace(/ப்ப/g, 'ppa');

  let res = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const next = str[i + 1];

    if (TAMIL_VOWELS[ch]) {
      res += TAMIL_VOWELS[ch];
    } else if (TAMIL_CONSONANTS[ch]) {
      const c = TAMIL_CONSONANTS[ch];
      if (next === '்') {
        res += c;
        i++; // Skip pulli
      } else if (TAMIL_VOWEL_SIGNS[next]) {
        res += c + TAMIL_VOWEL_SIGNS[next];
        i++; // Skip vowel sign
      } else {
        res += c + 'a';
      }
    } else {
      res += ch;
    }
  }

  return res;
}

/**
 * Normalizes phonetic variants in Tanglish / English spellings
 * (e.g. b/p/bh, th/d/t, v/w, ee/i, oo/u, store/stor, tea/ti)
 */
export function normalizePhonetic(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .trim()
    .replace(/\btea\b/g, 'ti')
    .replace(/\bstores?\b/g, 'stor')
    .replace(/\bsweets?\b/g, 'swit')
    .replace(/\bkadai\b/g, 'katai')
    .replace(/\bbakery\b/g, 'bekari')
    .replace(/\bhotel\b/g, 'hotel')
    .replace(/bh/g, 'b')
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'k')
    .replace(/ph/g, 'p')
    .replace(/sh|ch/g, 's')
    .replace(/zh/g, 'l')
    .replace(/ee|ii|ea|y/g, 'i')
    .replace(/oo|uu/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/ai|ay|ey/g, 'ai')
    .replace(/[pb]/g, 'p')
    .replace(/[td]/g, 't')
    .replace(/[kgcq]/g, 'k')
    .replace(/[sz]/g, 's')
    .replace(/[vw]/g, 'v')
    .replace(/j/g, 's')
    .replace(/l+/g, 'l')
    .replace(/r+/g, 'r')
    .replace(/n+/g, 'n')
    .replace(/e/g, 'a')
    .replace(/o/g, 'u')
    .replace(/(.)\1+/g, '$1')
    .replace(/[^a-z0-9\s]/g, '');
}

/**
 * Strips vowels for consonant skeleton matching
 */
function getConsonantSkeleton(str: string): string {
  return str.replace(/[aeiou\s]/g, '');
}

/**
 * Computes Levenshtein edit distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if target string (Tamil or English) matches the search query (Tamil or English).
 */
export function matchesTamilSearch(target: string | null | undefined, query: string | null | undefined): boolean {
  if (!target || !query) return false;

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true;

  const lowerTarget = target.toLowerCase();
  const lowerQuery = trimmedQuery.toLowerCase();

  // 1. Direct standard substring check (handles direct Tamil or direct English matches)
  if (lowerTarget.includes(lowerQuery)) {
    return true;
  }

  // 2. Transliterate target and normalize both query & target
  const translitTarget = transliterateTamil(target);
  const normTarget = normalizePhonetic(translitTarget);
  const normQuery = normalizePhonetic(trimmedQuery);

  if (!normQuery) return false;

  // Check without spaces
  const targetNoSpace = normTarget.replace(/\s+/g, '');
  const queryNoSpace = normQuery.replace(/\s+/g, '');

  if (targetNoSpace.includes(queryNoSpace)) {
    return true;
  }

  // 3. Multi-word check: all words in query must match target
  const queryWords = normQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length > 0 && queryWords.every(qw => targetNoSpace.includes(qw))) {
    return true;
  }

  // 4. Consonant skeleton check (handles vowel spelling variations like Sanjana vs Sanjna)
  const skelQuery = getConsonantSkeleton(queryNoSpace);
  const skelTarget = getConsonantSkeleton(targetNoSpace);

  if (skelQuery.length >= 3 && skelTarget.includes(skelQuery)) {
    return true;
  }

  // 5. Word-by-word skeleton check
  if (queryWords.length > 0) {
    const allWordsSkeletonMatch = queryWords.every(qw => {
      const sqw = getConsonantSkeleton(qw);
      return sqw.length >= 2 ? skelTarget.includes(sqw) : targetNoSpace.includes(qw);
    });
    if (allWordsSkeletonMatch) {
      return true;
    }
  }

  // 6. Substring fuzzy distance check for typo tolerance on longer queries
  if (queryNoSpace.length >= 4) {
    // Check if any sliding window of targetNoSpace is within edit distance of 1
    const qLen = queryNoSpace.length;
    for (let i = 0; i <= targetNoSpace.length - qLen; i++) {
      const window = targetNoSpace.substring(i, i + qLen);
      if (levenshteinDistance(window, queryNoSpace) <= 1) {
        return true;
      }
    }
    // Also check window with length ± 1
    for (let i = 0; i <= targetNoSpace.length - (qLen + 1); i++) {
      const window = targetNoSpace.substring(i, i + qLen + 1);
      if (levenshteinDistance(window, queryNoSpace) <= 1) {
        return true;
      }
    }
    for (let i = 0; i <= targetNoSpace.length - (qLen - 1); i++) {
      const window = targetNoSpace.substring(i, i + qLen - 1);
      if (levenshteinDistance(window, queryNoSpace) <= 1) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Common English/Tanglish words to direct Tamil mappings
 */
const COMMON_TAMIL_WORDS: Record<string, string> = {
  store: 'ஸ்டோர்',
  stores: 'ஸ்டோர்ஸ்',
  tea: 'டீ',
  kadai: 'கடை',
  sweets: 'ஸ்வீட்ஸ்',
  sweet: 'ஸ்வீட்',
  bakery: 'பேக்கரி',
  hotel: 'ஹோட்டல்',
  sri: 'ஸ்ரீ',
  shri: 'ஸ்ரீ',
  shree: 'ஸ்ரீ',
  sree: 'ஸ்ரீ',
  bavani: 'பவானி',
  bhavani: 'பவானி',
  sanjana: 'சஞ்சனா',
  aksha: 'அக் ஷா',
  sajith: 'சஜித்',
  panagudi: 'பனகுடி',
  medical: 'மெடிக்கல்',
  medicals: 'மெடிக்கல்ஸ்',
  provision: 'பிராவிஷன்',
  provisions: 'பிராவிஷன்ஸ்',
  agency: 'ஏஜென்சி',
  agencies: 'ஏஜென்சீஸ்',
  mart: 'மார்ட்',
  center: 'சென்டர்',
  centre: 'சென்டர்',
  supermarket: 'சூப்பர் மார்க்கெட்',
  super: 'சூப்பர்',
  market: 'மார்க்கெட்',
  annachi: 'அண்ணாச்சி',
  maligai: 'மளிகை',
  vilas: 'விலாஸ்',
  traders: 'டிரேடர்ஸ்',
  complex: 'காம்ப்ளக்ஸ்',
  nagar: 'நகர்',
  colony: 'காலனி',
  road: 'ரோடு',
  street: 'தெரு',
  theru: 'தெரு',
  cafe: 'கஃபே',
  juice: 'ஜூஸ்',
  stall: 'ஸ்டால்',
  coolbar: 'கூல் பார்',
  bhavan: 'பவன்',
  mess: 'மெஸ்',
  restaurant: 'ரெஸ்டாரன்ட்',
  saloon: 'சலூன்',
  hardwares: 'ஹார்டுவேர்ஸ்',
  hardware: 'ஹார்டுவேர்',
  electricals: 'எலக்ட்ரிக்கல்ஸ்',
  electrical: 'எலக்ட்ரிக்கல்',
  press: 'பிரஸ்',
  studio: 'ஸ்டுடியோ',
  clinic: 'கிளினிக்',
  hospital: 'மருத்துவமனை',
  travels: 'டிராவல்ஸ்',
  transport: 'டிரான்ஸ்போர்ட்',
  jewellers: 'ஜுவல்லர்ஸ்',
  jewellery: 'ஜுவல்லரி',
  textiles: 'டெக்ஸ்டைல்ஸ்',
  silks: 'சில்க்ஸ்',
  fashions: 'ஃபேஷன்ஸ்',
  fashion: 'ஃபேஷன்',
  footwear: 'ஃபுட்வேர்',
  mobiles: 'மொபைல்ஸ்',
  mobile: 'மொபைல்',
  xerox: 'ஜெராக்ஸ்',
  fancy: 'ஃபேன்சி',
  general: 'ஜெனரல்',
  tiffin: 'டிபன்',
  milk: 'மில்க்',
  dairy: 'டெய்ரி',
  co: 'கோ',
  pvt: 'பிரைவேட்',
  ltd: 'லிமிடெட்',
  chidambarapuram: 'சிதம்பராபுரம்',
  chithambarapuram: 'சிதம்பராபுரம்',
  aralvaimozhi: 'ஆரல்வாய்மொழி',
  aaralvaimozhi: 'ஆரல்வாய்மொழி',
  mandapam: 'மண்டபம்',
  thomas: 'தாமஸ்',
  velayuthampillai: 'வேலாயுதம்பிள்ளை',
  velayutham: 'வேலாயுதம்',
  pillai: 'பிள்ளை',
  amman: 'அம்மன்',
  kovil: 'கோவில்',
  nagercoil: 'நாகர்கோவில்',
  tirunelveli: 'திருநெல்வேலி',
  thirunelveli: 'திருநெல்வேலி',
  nellai: 'நெல்லை',
  neduvalai: 'நெடுவாலை',
  neduvaalai: 'நெடுவாலை',
  neduvali: 'நெடுவாலை',
  radhapuram: 'ராதாபுரம்',
  vallioor: 'வள்ளியூர்',
  valliyur: 'வள்ளியூர்',
  kudankulam: 'கூடங்குளம்',
  thisayanvilai: 'திசையன்விளை',
  tisayanvilai: 'திசையன்விளை',
  palayamkottai: 'பாளையங்கோட்டை',
  thoothukudi: 'தூத்துக்குடி',
  tuticorin: 'தூத்துக்குடி',
  tenkasi: 'தென்காசி',
  kovilpatti: 'கோவில்பட்டி',
  sankarankovil: 'சங்கரன்கோவில்',
  kalakkad: 'களக்காடு',
  kalakad: 'களக்காடு',
  ambasamudram: 'அம்பாசமுத்திரம்',
  ambai: 'அம்பை',
  cheranmahadevi: 'சேரன்மகாதேவி',
  chennai: 'சென்னை',
  madurai: 'மதுரை',
  kanyakumari: 'கன்னியாகுமரி',
  thuckalay: 'தக்கலை',
  marthandam: 'மார்த்தாண்டம்',
  devi: 'தேவி',
  jaya: 'ஜெய',
  jeya: 'ஜெய',
  kumar: 'குமார்',
  raja: 'ராஜா',
  selvam: 'செல்வம்',
  murugan: 'முருகன்',
  ganesh: 'கணேஷ்',
  kannan: 'கண்ணன்',
  balaji: 'பாலாஜி',
  saravanan: 'சரவணன்',
  saravana: 'சரவணா'
};

const EN_VOWEL_SIGNS: Record<string, string> = {
  'aa': 'ா', 'a': '',
  'ii': 'ீ', 'ee': 'ீ', 'i': 'ி',
  'uu': 'ூ', 'oo': 'ூ', 'u': 'ு',
  'ae': 'ே', 'e': 'ெ',
  'ai': 'ை',
  'oa': 'ோ', 'o': 'ொ',
  'au': 'ௌ', 'ou': 'ௌ'
};

const EN_INDEPENDENT_VOWELS: Record<string, string> = {
  'aa': 'ஆ', 'a': 'அ',
  'ii': 'ஈ', 'ee': 'ஈ', 'i': 'இ',
  'uu': 'ஊ', 'oo': 'ஊ', 'u': 'உ',
  'ae': 'ஏ', 'e': 'எ',
  'ai': 'ஐ',
  'oa': 'ஓ', 'o': 'ஒ',
  'au': 'ஔ', 'ou': 'ஔ'
};

const EN_CONSONANTS: Array<{ en: string; ta: string; pulli: boolean }> = [
  { en: 'nch', ta: 'ஞ்ச', pulli: false },
  { en: 'nja', ta: 'ஞ்ச', pulli: false },
  { en: 'nj', ta: 'ஞ்', pulli: false },
  { en: 'nth', ta: 'ந்த', pulli: false },
  { en: 'ndh', ta: 'ந்த', pulli: false },
  { en: 'nd', ta: 'ண்ட', pulli: false },
  { en: 'mp', ta: 'ம்ப', pulli: false },
  { en: 'mb', ta: 'ம்ப', pulli: false },
  { en: 'ngk', ta: 'ங்க', pulli: false },
  { en: 'ng', ta: 'ங்', pulli: false },
  { en: 'ksh', ta: 'க்ஷ', pulli: true },
  { en: 'sh', ta: 'ஷ', pulli: true },
  { en: 'th', ta: 'த', pulli: true },
  { en: 'dh', ta: 'த', pulli: true },
  { en: 'zh', ta: 'ழ', pulli: true },
  { en: 'ch', ta: 'ச', pulli: true },
  { en: 'kh', ta: 'க', pulli: true },
  { en: 'gh', ta: 'க', pulli: true },
  { en: 'ph', ta: 'ப', pulli: true },
  { en: 'bh', ta: 'ப', pulli: true },
  { en: 'kk', ta: 'க்க', pulli: false },
  { en: 'pp', ta: 'ப்ப', pulli: false },
  { en: 'tt', ta: 'ட்ட', pulli: false },
  { en: 'll', ta: 'ல்ல', pulli: false },
  { en: 'mm', ta: 'ம்ம', pulli: false },
  { en: 'nn', ta: 'ன்ன', pulli: false },
  { en: 'k', ta: 'க', pulli: true },
  { en: 'g', ta: 'க', pulli: true },
  { en: 's', ta: 'ச', pulli: true },
  { en: 'j', ta: 'ஜ', pulli: true },
  { en: 't', ta: 'ட', pulli: true },
  { en: 'd', ta: 'ட', pulli: true },
  { en: 'p', ta: 'ப', pulli: true },
  { en: 'b', ta: 'ப', pulli: true },
  { en: 'm', ta: 'ம', pulli: true },
  { en: 'y', ta: 'ய', pulli: true },
  { en: 'r', ta: 'ர', pulli: true },
  { en: 'l', ta: 'ல', pulli: true },
  { en: 'v', ta: 'வ', pulli: true },
  { en: 'w', ta: 'வ', pulli: true },
  { en: 'h', ta: 'ஹ', pulli: true },
  { en: 'n', ta: 'ன', pulli: true },
  { en: 'N', ta: 'ண', pulli: true },
  { en: 'L', ta: 'ள', pulli: true },
  { en: 'R', ta: 'ற', pulli: true }
];

/**
 * Transliterates an English / Tanglish word to Tamil
 */
export function transliterateWord(word: string): string {
  if (!word) return '';
  if (/^[\u0B80-\u0BFF0-9\W]+$/.test(word)) return word;

  const lower = word.toLowerCase().trim();
  if (COMMON_TAMIL_WORDS[lower]) {
    return COMMON_TAMIL_WORDS[lower];
  }

  let workingWord = word;
  if (lower.length >= 4 && lower.endsWith('a') && !lower.endsWith('aa') && !lower.endsWith('ia')) {
    workingWord = word + 'a';
  }

  let i = 0;
  let res = '';
  const len = workingWord.length;

  while (i < len) {
    const sub = workingWord.slice(i);
    const isAtStart = (i === 0 || workingWord[i - 1] === ' ' || workingWord[i - 1] === '-');

    let matchedVowel: string | null = null;
    for (const v of ['au', 'ou', 'aa', 'ee', 'ii', 'uu', 'oo', 'ae', 'oa', 'ai', 'a', 'i', 'u', 'e', 'o']) {
      if (sub.toLowerCase().startsWith(v)) {
        matchedVowel = v;
        break;
      }
    }

    if (matchedVowel && isAtStart) {
      res += EN_INDEPENDENT_VOWELS[matchedVowel] || matchedVowel;
      i += matchedVowel.length;
      continue;
    }

    if (isAtStart && (sub.toLowerCase().startsWith('st') || sub.toLowerCase().startsWith('sp') || sub.toLowerCase().startsWith('sk') || sub.toLowerCase().startsWith('sm') || sub.toLowerCase().startsWith('sn') || sub.toLowerCase().startsWith('sw'))) {
      res += 'ஸ்';
      i += 1;
      continue;
    }

    if (sub.toLowerCase() === 's') {
      res += 'ஸ்';
      i += 1;
      continue;
    }

    let matchedConsonant: { en: string; ta: string; pulli: boolean } | null = null;
    for (const c of EN_CONSONANTS) {
      if (sub.toLowerCase().startsWith(c.en)) {
        matchedConsonant = c;
        break;
      }
    }

    if (matchedConsonant) {
      i += matchedConsonant.en.length;
      const afterC = workingWord.slice(i);
      let vSign: string | null = null;
      let vLen = 0;

      for (const v of ['au', 'ou', 'aa', 'ee', 'ii', 'uu', 'oo', 'ae', 'oa', 'ai', 'a', 'i', 'u', 'e', 'o']) {
        if (afterC.toLowerCase().startsWith(v)) {
          vSign = v;
          vLen = v.length;
          break;
        }
      }

      if (vSign !== null) {
        if (matchedConsonant.pulli) {
          let baseChar = matchedConsonant.ta;
          if (isAtStart) {
            if (matchedConsonant.en === 'd' || matchedConsonant.en === 't') {
              baseChar = 'த';
            } else if (matchedConsonant.en === 'n' || matchedConsonant.en === 'N') {
              baseChar = 'ந';
            }
          }
          let sign = EN_VOWEL_SIGNS[vSign] !== undefined ? EN_VOWEL_SIGNS[vSign] : '';
          if (vSign === 'e' && (matchedConsonant.en === 'd' || matchedConsonant.en === 'v' || matchedConsonant.en === 'm')) {
            sign = 'ே';
          }
          res += baseChar + sign;
        } else {
          res += matchedConsonant.ta + (EN_VOWEL_SIGNS[vSign] !== undefined ? EN_VOWEL_SIGNS[vSign] : '');
        }
        i += vLen;
      } else {
        let baseChar = matchedConsonant.ta;
        if (isAtStart) {
          if (matchedConsonant.en === 'd' || matchedConsonant.en === 't') {
            baseChar = 'த';
          } else if (matchedConsonant.en === 'n' || matchedConsonant.en === 'N') {
            baseChar = 'ந';
          }
        }
        if (matchedConsonant.pulli) {
          res += baseChar + '்';
        } else {
          res += baseChar;
        }
      }
    } else {
      res += workingWord[i];
      i++;
    }
  }

  return res;
}

/**
 * Transliterates entire English/Tanglish text (sentences, shop names, addresses) to Tamil.
 * Preserves Tamil characters, numbers, commas, and spaces.
 */
export function englishToTamil(text: string): string {
  if (!text) return '';
  return text.replace(/([a-zA-Z]+)/g, (match) => {
    return transliterateWord(match);
  });
}

