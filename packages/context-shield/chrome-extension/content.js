/**
 * Context-Shield AI - Content Script
 * Phase 2 Architecture Port
 */

// --- 1. PII Scanner Logic (Ported from scanner.js) ---
const PATTERNS = {
    TC: /\b[1-9](?:\s*\d){10}\b/g,
    EMAIL: /\b[A-Za-z0-9._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gi,
    PHONE: /\b(0?5[0-9]{2}[-.\s]??[0-9]{3}[-.\s]??[0-9]{2}[-.\s]??[0-9]{2}|0?5[0-9]{9}|0?2[0-9]{2}[-.\s]??[0-9]{3}[-.\s]??[0-9]{2}[-.\s]??[0-9]{2})\b/g,
    PERSON: /(?<![a-zçğıöşüA-ZÇĞİÖŞÜ])(?!(?:Hasta|Doğum|Tarih|Klinik|Rapor|Bulgu|Dosya|Yakını|Tanı|İletişim|Adres|Muayene|Laboratuvar|Glikoz|Üre|Kreatinin|Saat|HBG|WBC|PLT|Cihaz|Nem|Hata|Sürüm|Bakım|Teknisyen|Parça|Fiyat|Adet|Toplam|Kimlik|TC|No|Sayın|Doktor|Prof|Dr|Uzm|E-posta|Email|Telefon|Adı|Soyadı|Yedek|Bellek|Kodu|Son|Seri|Yüzde|Oran|Değer|Aralığı|Grade|HER2|SUVmax|LAP|Evre|USG|Patojenik|Modifiye|Radikal|Aksiller|Bölgede|Hipermetabolik|Metastatik|Kemik|Lezyonları|Meme|Dış|Üst|Duktal|Karsinom|İnvaziv|Onkoloji|Konsey|Kararı|Kemoterapi|Protokolü|Planı|Biyopsi|Sonucu|Cerrahi|Epikriz|Sevk|Takip|Notu|Hastanede|Yatan|İcra|Yapıldı)\b)((?:[a-zçğıöşüA-ZÇĞİÖŞÜ]{2,})(?:\s+(?:[a-zçğıöşüA-ZÇĞİÖŞÜ]{2,}))+)(?![a-zçğıöşüA-ZÇĞİÖŞÜ])/giu
};

const TOKEN_LABELS = {
    TC: 'TC',
    EMAIL: 'EPOSTA',
    PHONE: 'TELEFON',
    PERSON: 'KİŞİ'
};

const STRIP_LIST = ["Hasta", "Sayın", "Doktor", "Prof", "Dr", "Uzm", "Biyolog", "Hemşire", "Eczacı", "Prof.", "Dr.", "Uzm.", "Yakını", "Onaylayan", "Doktoru", "Yatan", "Ekibi", "Cerrah", "Hekim", "Hekimi", "Hastanede", "Klinik", "Raporu", "Sonucu", "Planı", "Notu", "Tanı", "Muayene"];
const EXCLUDE_LIST = ["Doğum", "Tarih", "Bulgu", "Dosya", "İletişim", "Adres", "Laboratuvar", "Glikoz", "Üre", "Kreatinin", "Saat", "HBG", "WBC", "PLT", "Cihaz", "Nem", "Hata", "Sürüm", "Bakım", "Teknisyen", "Parça", "Fiyat|Adet", "Toplam", "Kimlik", "TC", "No", "E-posta", "Email", "Telefon", "Adı", "Soyadı", "Yedek", "Bellek", "Kodu", "Son", "Seri", "Yüzde", "Oran", "Değer", "Aralığı", "Grade", "HER2", "SUVmax", "LAP", "Evre", "USG", "Patojenik", "Modifiye", "Radikal", "Aksiller", "Bölgede", "Hipermetabolik", "Metastatik", "Kemik", "Lezyonları", "Meme", "Dış", "Üst", "Duktal", "Karsinom", "İnvaziv", "Onkoloji", "Konsey", "Kararı", "Kemoterapi", "Protokolü", "Epikriz", "Sevk", "Takip", "Radyoterapi", "Genetik", "Bulgular", "Laboratuvarı", "Sorumlusu", "Teknik", "Analiz", "İmza", "Kaşe", "Mühür", "Onaylanacak", "Planlanmıştır", "Bilgilendirildi", "Üzerinden", "Sonraki", "Randevu", "Giriş", "Önizleme", "İcra", "Edildi", "Edilmiştir", "Yapıldı", "Saptanmıştır"];

function scan(text) {
    const map = {};
    const counters = { TC: 0, EMAIL: 0, PHONE: 0, PERSON: 0 };

    for (const [type, regex] of Object.entries(PATTERNS)) {
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
            let originalValue = match[1] || match[0];

            if (type === 'PERSON') {
                let stripped = false;
                do {
                    stripped = false;
                    const words = originalValue.split(/\s+/);
                    const firstWord = words[0].replace(/[.,:;]$/, '').toLowerCase();
                    if (words.length > 1 && (STRIP_LIST.some(s => s.toLowerCase() === firstWord) || EXCLUDE_LIST.some(e => e.toLowerCase() === firstWord))) {
                        originalValue = words.slice(1).join(' ');
                        stripped = true;
                    }
                } while (stripped);

                const parts = originalValue.split(/\s+/);
                const isExcluded = parts.some(p => {
                    const cleanWord = p.replace(/[.,:;]$/, '').toLowerCase();
                    return EXCLUDE_LIST.some(e => e.toLowerCase() === cleanWord) || STRIP_LIST.some(s => s.toLowerCase() === cleanWord);
                });

                if (isExcluded || originalValue.length < 3) continue;
            }

            if (!map[originalValue]) {
                counters[type]++;
                map[originalValue] = `[${TOKEN_LABELS[type]}_${counters[type]}]`;
            }
        }
    }
    return map;
}

function mask(text, map) {
    if (!map || Object.keys(map).length === 0) return text;
    let maskedText = text;
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'g');
        maskedText = maskedText.replace(regex, map[key]);
    }
    return maskedText;
}

// --- 2. Extension Logic (Input Handling) ---

let isProcessing = false;

function handleInput(event) {
    if (isProcessing) return;
    
    const input = event.target;
    const originalText = input.value;
    
    // Scan and detect
    const map = scan(originalText);
    
    if (Object.keys(map).length > 0) {
        isProcessing = true;
        
        // Apply masking
        const maskedText = mask(originalText, map);
        
        // Only update if text actually changed
        if (maskedText !== originalText) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            
            input.value = maskedText;
            
            // Try to restore cursor (simple implementation)
            input.setSelectionRange(start, end);
            
            console.log("🛡️ Context-Shield: PII Detected and Masked!");
        }
        
        isProcessing = false;
    }
}

// Attach listeners to existing and future inputs
function attachListeners() {
    const inputs = document.querySelectorAll('input[type="text"], textarea');
    inputs.forEach(input => {
        if (!input.dataset.shieldActive) {
            input.addEventListener('input', handleInput);
            input.dataset.shieldActive = "true";
        }
    });
}

// Observer to catch dynamically added inputs
const observer = new MutationObserver((mutations) => {
    attachListeners();
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial attachment
attachListeners();

console.log("🚀 Context-Shield AI Extension Active. Phase 2 Engine Loaded.");
