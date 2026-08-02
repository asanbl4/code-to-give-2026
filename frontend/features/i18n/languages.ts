/**
 * Every language the site offers, and the codes Google Translate knows them by.
 *
 * The list started as the 37 in `code-to-give-2025`'s `GoogleTranslate.jsx`
 * (`includedLanguages`) and then gained seven that matter specifically here:
 * Traditional Chinese (the header used to carry a 繁 toggle for exactly this
 * reason), plus Filipino, Urdu, Nepali, Sinhala, Burmese and Khmer — the
 * languages Hong Kong's largest non-Chinese-speaking communities actually read.
 * A Down syndrome charity whose families are disproportionately in those
 * communities should not ship a picker that stops at European languages.
 *
 * `code` must be a code Google Translate accepts — it goes straight into
 * `includedLanguages` and into the `googtrans` cookie. `label` is the English
 * name and exists so typing "chinese" or "arabic" finds the row; `native` is
 * what we show, because someone who needs the Arabic option is looking for
 * العربية, not for the word "Arabic". `short` is the 2–3 character badge on the
 * collapsed header button.
 */
export interface Language {
  code: string;
  label: string;
  native: string;
  short: string;
}

/** The page is authored in English; everything else is a translation of it. */
export const SOURCE_LANGUAGE = "en";

export const LANGUAGES: readonly Language[] = [
  { code: "en", label: "English", native: "English", short: "EN" },
  { code: "zh-TW", label: "Chinese (Traditional)", native: "繁體中文", short: "繁" },
  { code: "zh-CN", label: "Chinese (Simplified)", native: "简体中文", short: "简" },
  { code: "ar", label: "Arabic", native: "العربية", short: "ع" },
  { code: "bn", label: "Bengali", native: "বাংলা", short: "বাং" },
  { code: "cs", label: "Czech", native: "Čeština", short: "CS" },
  { code: "da", label: "Danish", native: "Dansk", short: "DA" },
  { code: "de", label: "German", native: "Deutsch", short: "DE" },
  { code: "el", label: "Greek", native: "Ελληνικά", short: "EL" },
  { code: "es", label: "Spanish", native: "Español", short: "ES" },
  { code: "fa", label: "Persian", native: "فارسی", short: "فا" },
  { code: "fi", label: "Finnish", native: "Suomi", short: "FI" },
  { code: "fr", label: "French", native: "Français", short: "FR" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", short: "ગુ" },
  { code: "he", label: "Hebrew", native: "עברית", short: "עב" },
  { code: "hi", label: "Hindi", native: "हिन्दी", short: "हि" },
  { code: "hu", label: "Hungarian", native: "Magyar", short: "HU" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", short: "ID" },
  { code: "it", label: "Italian", native: "Italiano", short: "IT" },
  { code: "ja", label: "Japanese", native: "日本語", short: "日" },
  { code: "km", label: "Khmer", native: "ភាសាខ្មែរ", short: "ខ្មែរ" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", short: "ಕ" },
  { code: "ko", label: "Korean", native: "한국어", short: "한" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", short: "മ" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu", short: "MS" },
  { code: "my", label: "Burmese", native: "မြန်မာ", short: "မြ" },
  { code: "ne", label: "Nepali", native: "नेपाली", short: "ने" },
  { code: "nl", label: "Dutch", native: "Nederlands", short: "NL" },
  { code: "no", label: "Norwegian", native: "Norsk", short: "NO" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", short: "ਪੰ" },
  { code: "pl", label: "Polish", native: "Polski", short: "PL" },
  { code: "pt", label: "Portuguese", native: "Português", short: "PT" },
  { code: "ro", label: "Romanian", native: "Română", short: "RO" },
  { code: "ru", label: "Russian", native: "Русский", short: "RU" },
  { code: "si", label: "Sinhala", native: "සිංහල", short: "සි" },
  { code: "sv", label: "Swedish", native: "Svenska", short: "SV" },
  { code: "ta", label: "Tamil", native: "தமிழ்", short: "த" },
  { code: "te", label: "Telugu", native: "తెలుగు", short: "తె" },
  { code: "th", label: "Thai", native: "ไทย", short: "ไทย" },
  { code: "tl", label: "Filipino", native: "Filipino", short: "TL" },
  { code: "tr", label: "Turkish", native: "Türkçe", short: "TR" },
  { code: "uk", label: "Ukrainian", native: "Українська", short: "UK" },
  { code: "ur", label: "Urdu", native: "اردو", short: "اردو" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt", short: "VI" },
];

/** What Google Translate's `includedLanguages` option wants: one CSV string. */
export const INCLUDED_LANGUAGES = LANGUAGES.map((language) => language.code).join(",");

export function findLanguage(code: string | null | undefined): Language {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}

/** Languages Google renders right-to-left. Used to set `dir` on <html>. */
const RTL_CODES = new Set(["ar", "fa", "he", "ur"]);

export function isRightToLeft(code: string): boolean {
  return RTL_CODES.has(code);
}
