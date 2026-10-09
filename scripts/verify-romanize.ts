// Captions must read the way the words sound. Run: npx tsx scripts/verify-romanize.ts
import { romanizeDisplay } from "../lib/romanize-client";

const GOLDEN: Record<string, string> = {
  "சூப்பர்": "sooppar", "இசை": "isai", "சாப்பாடு": "saappaadu", "சரி": "sari", "கொஞ்சம்": "konjam",
  "பச்சை": "pachchai", "வணக்கம்": "vanakkam", "எப்படி இருக்கீங்க": "eppadi irukkeenga",
  "டீ குடுங்க": "tee kudunga", "தண்ணீர்": "thanneer", "நேத்து": "netthu", "வாங்கினேன்": "vaanginen",
  "தக்காளி": "thakkaali", "அஞ்சு": "anju", "ரொம்ப": "romba", "தம்பி": "thambi", "வீடு": "veedu",
  "மழை": "mazhai", "குழந்தை": "kuzhandhai", "வந்துட்டேன்": "vandhutten", "வெற்றி": "vetri",
  "என்று": "endru", "மியூசிக்": "miyoosik", "சொல்லுங்க": "sollunga",
  "ನಮಸ್ಕಾರ": "namaskaara", "ಹೇಗಿದ್ದೀರಾ": "hegiddeeraa", "ಚೆನ್ನಾಗಿದ್ದೀನಿ": "chennaagiddeeni",
  "ಸ್ವಲ್ಪ": "svalpa", "ಹೋದೆ": "hode", "ಮಾರ್ಕೆಟ್‌ಗೆ": "maarketge", "ಬೆಂಗಳೂರು": "bengalooru",
  "नमस्ते": "namaste", "आप कैसे हैं": "aap kaise hain", "ज़्यादा": "zyaadaa", "कितना": "kitnaa",
  "समझना": "samajhnaa", "बचपन": "bachpan", "मदद": "madad", "सब्ज़ी": "sabzee", "गाड़ी": "gaadee",
  "पढ़ना": "padhnaa", "लड़का": "ladkaa", "बाज़ार": "baazaar", "क्या": "kyaa", "अच्छा": "achchhaa", "मैंने": "maine", "हिंदी": "hindee",
  "നന്ദി": "nandi", "ഞാൻ": "naan", "മെഡിക്കൽ സ്റ്റോർ": "medikkal stor", "എവിടെ": "evide", "എന്റെ": "ente", "చాలా బాగుంది": "chaalaa baagundi",
};
let failed = 0;
for (const [native, expected] of Object.entries(GOLDEN)) {
  const got = romanizeDisplay(native);
  if (got !== expected) {
    failed++;
    console.log(`MISMATCH ${native}: expected ${expected}, got ${got}`);
  }
}
const leftover = Object.keys(GOLDEN).map(romanizeDisplay).filter((t) => /[ऀ-ൿ]/u.test(t));
if (leftover.length) {
  failed++;
  console.log("Native script left in captions:", leftover);
}
console.log(failed ? `${failed} caption checks failed` : `${Object.keys(GOLDEN).length} caption checks passed`);
process.exit(failed ? 1 : 0);
