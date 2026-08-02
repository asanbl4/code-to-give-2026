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
 *
 * `flag` is decoration, not identification: languages are not countries, and the
 * emoji is one country where the language is spoken, never a claim about who
 * "owns" it. Where a language spans many states we pick the largest speaker
 * population (Arabic → Saudi Arabia, Tamil → India), and for Traditional Chinese
 * we pick Hong Kong, since that is who this site is for.
 */
export interface Language {
  code: string;
  label: string;
  native: string;
  short: string;
  flag: string;
}

/** The page is authored in English; everything else is a translation of it. */
export const SOURCE_LANGUAGE = "en";

export const LANGUAGES: readonly Language[] = [
  { code: "en", label: "English", native: "English", short: "EN", flag: "🇬🇧" },
  { code: "zh-TW", label: "Chinese (Traditional)", native: "繁體中文", short: "繁", flag: "🇭🇰" },
  { code: "zh-CN", label: "Chinese (Simplified)", native: "简体中文", short: "简", flag: "🇨🇳" },
  { code: "ar", label: "Arabic", native: "العربية", short: "ع", flag: "🇸🇦" },
  { code: "bn", label: "Bengali", native: "বাংলা", short: "বাং", flag: "🇧🇩" },
  { code: "cs", label: "Czech", native: "Čeština", short: "CS", flag: "🇨🇿" },
  { code: "da", label: "Danish", native: "Dansk", short: "DA", flag: "🇩🇰" },
  { code: "de", label: "German", native: "Deutsch", short: "DE", flag: "🇩🇪" },
  { code: "el", label: "Greek", native: "Ελληνικά", short: "EL", flag: "🇬🇷" },
  { code: "es", label: "Spanish", native: "Español", short: "ES", flag: "🇪🇸" },
  { code: "fa", label: "Persian", native: "فارسی", short: "فا", flag: "🇮🇷" },
  { code: "fi", label: "Finnish", native: "Suomi", short: "FI", flag: "🇫🇮" },
  { code: "fr", label: "French", native: "Français", short: "FR", flag: "🇫🇷" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", short: "ગુ", flag: "🇮🇳" },
  { code: "he", label: "Hebrew", native: "עברית", short: "עב", flag: "🇮🇱" },
  { code: "hi", label: "Hindi", native: "हिन्दी", short: "हि", flag: "🇮🇳" },
  { code: "hu", label: "Hungarian", native: "Magyar", short: "HU", flag: "🇭🇺" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", short: "ID", flag: "🇮🇩" },
  { code: "it", label: "Italian", native: "Italiano", short: "IT", flag: "🇮🇹" },
  { code: "ja", label: "Japanese", native: "日本語", short: "日", flag: "🇯🇵" },
  { code: "km", label: "Khmer", native: "ភាសាខ្មែរ", short: "ខ្មែរ", flag: "🇰🇭" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", short: "ಕ", flag: "🇮🇳" },
  { code: "ko", label: "Korean", native: "한국어", short: "한", flag: "🇰🇷" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", short: "മ", flag: "🇮🇳" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu", short: "MS", flag: "🇲🇾" },
  { code: "my", label: "Burmese", native: "မြန်မာ", short: "မြ", flag: "🇲🇲" },
  { code: "ne", label: "Nepali", native: "नेपाली", short: "ने", flag: "🇳🇵" },
  { code: "nl", label: "Dutch", native: "Nederlands", short: "NL", flag: "🇳🇱" },
  { code: "no", label: "Norwegian", native: "Norsk", short: "NO", flag: "🇳🇴" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", short: "ਪੰ", flag: "🇮🇳" },
  { code: "pl", label: "Polish", native: "Polski", short: "PL", flag: "🇵🇱" },
  { code: "pt", label: "Portuguese", native: "Português", short: "PT", flag: "🇵🇹" },
  { code: "ro", label: "Romanian", native: "Română", short: "RO", flag: "🇷🇴" },
  { code: "ru", label: "Russian", native: "Русский", short: "RU", flag: "🇷🇺" },
  { code: "si", label: "Sinhala", native: "සිංහල", short: "සි", flag: "🇱🇰" },
  { code: "sv", label: "Swedish", native: "Svenska", short: "SV", flag: "🇸🇪" },
  { code: "ta", label: "Tamil", native: "தமிழ்", short: "த", flag: "🇮🇳" },
  { code: "te", label: "Telugu", native: "తెలుగు", short: "తె", flag: "🇮🇳" },
  { code: "th", label: "Thai", native: "ไทย", short: "ไทย", flag: "🇹🇭" },
  { code: "tl", label: "Filipino", native: "Filipino", short: "TL", flag: "🇵🇭" },
  { code: "tr", label: "Turkish", native: "Türkçe", short: "TR", flag: "🇹🇷" },
  { code: "uk", label: "Ukrainian", native: "Українська", short: "UK", flag: "🇺🇦" },
  { code: "ur", label: "Urdu", native: "اردو", short: "اردو", flag: "🇵🇰" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt", short: "VI", flag: "🇻🇳" },
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
