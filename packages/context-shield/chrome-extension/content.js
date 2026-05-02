/**
 * Context-Shield AI - Content Script
 * Phase 2 Architecture Port - STRICT MODE + DEBOUNCE + VAULT + ATOMIC DELETE
 */

// --- 1. PII Scanner Logic ---
const PATTERNS = {
    TC: /\b[1-9](?:\s*\d){10}\b/g,
    EMAIL: /\b[A-Za-z0-9._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gi,
    PHONE: /\b(0?5[0-9]{2}[-.\s]??[0-9]{3}[-.\s]??[0-9]{2}[-.\s]??[0-9]{2}|0?5[0-9]{9}|0?2[0-9]{2}[-.\s]??[0-9]{3}[-.\s]??[0-9]{2}[-.\s]??[0-9]{2})\b/g,
    PERSON: /(?:^|[\s"'(])(?!(?:Hasta|Tahlil|Rapor|Sonuç|Tarih|Bugün|Yarın|Sayın|Dr|Uzm|Prof))([A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,20})\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,20})(?:\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,20}))?(?=[\s.,!?;:'")]|$)/g
};

const TOKEN_LABELS = {
    TC: 'TC',
    EMAIL: 'EPOSTA',
    PHONE: 'TELEFON',
    PERSON: 'KİŞİ'
};

// Küresel Hafıza (Global State)
let globalCounters = { TC: 0, EMAIL: 0, PHONE: 0, PERSON: 0 };
let globalVault = {};

const STRIP_LIST = ["Hasta", "Sayın", "Doktor", "Prof", "Dr", "Uzm", "Biyolog", "Hemşire", "Eczacı", "Prof.", "Dr.", "Uzm.", "Yakını", "Onaylayan", "Doktoru", "Yatan", "Ekibi", "Cerrah", "Hekim", "Hekimi", "Hastanede", "Klinik", "Raporu", "Sonucu", "Planı", "Notu", "Tanı", "Muayene"];
const EXCLUDE_LIST = ["Doğum", "Tarih", "Bulgu", "Dosya", "İletişim", "Adres", "Laboratuvar", "Glikoz", "Üre", "Kreatinin", "Saat", "HBG", "WBC", "PLT", "Cihaz", "Nem", "Hata", "Sürüm", "Bakım", "Teknisyen", "Parça", "Fiyat|Adet", "Toplam", "Kimlik", "TC", "No", "E-posta", "Email", "Telefon", "Adı", "Soyadı", "Yedek", "Bellek", "Kodu", "Son", "Seri", "Yüzde", "Oran", "Değer", "Aralığı", "Grade", "HER2", "SUVmax", "LAP", "Evre", "USG", "Patojenik", "Modifiye", "Radikal", "Aksiller", "Bölgede", "Hipermetabolik", "Metastatik", "Kemik", "Lezyonları", "Meme", "Dış", "Üst", "Duktal", "Karsinom", "İnvaziv", "Onkoloji", "Konsey", "Kararı", "Kemoterapi", "Protokolü", "Epikriz", "Sevk", "Takip", "Radyoterapi", "Genetik", "Bulgular", "Laboratuvarı", "Sorumlusu", "Teknik", "Analiz", "İmza", "Kaşe", "Mühür", "Onaylanacak", "Planlanmıştır", "Bilgilendirildi", "Üzerinden", "Sonraki", "Randevu", "Giriş", "Önizleme", "İcra", "Edildi", "Edilmiştir", "Yapıldı", "Saptanmıştır", "De", "Da", "Ki", "Mi", "Mı", "Mu", "Mü", "Ya", "Yok", "Var", "Ne"];

function scan(text) {
    const localMap = {};
    for (const [type, regex] of Object.entries(PATTERNS)) {
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
            let originalValue = match[0];

            if (type === 'PERSON') {
                originalValue = originalValue.replace(/^[\s"'(]+/, '');
                const words = originalValue.trim().split(/\s+/);
                if (words.length < 2) continue;

                const isExcluded = words.some(w => {
                    const cleanWord = w.replace(/[.,!?;:'")]*$/, '').toLowerCase();
                    return EXCLUDE_LIST.some(e => e.toLowerCase() === cleanWord) || STRIP_LIST.some(s => s.toLowerCase() === cleanWord);
                });

                if (isExcluded) continue;
            }

            if (!globalVault[originalValue]) {
                globalCounters[type]++;
                globalVault[originalValue] = `[${TOKEN_LABELS[type]}_${globalCounters[type]}]`;
            }
            localMap[originalValue] = globalVault[originalValue];
        }
    }
    return localMap;
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
let shieldEnabled = true;
let typingTimer;
const TYPING_DELAY = 600;

chrome.storage.local.get(['shieldEnabled'], (result) => {
    if (result.shieldEnabled !== undefined) {
        shieldEnabled = result.shieldEnabled;
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TOGGLE_SHIELD') {
        shieldEnabled = message.value;
        console.log('🛡️ Context-Shield state changed:', shieldEnabled);
    }
});

function handleInput(event) {
    if (!shieldEnabled || isProcessing) return;

    const target = event.target;
    clearTimeout(typingTimer);

    typingTimer = setTimeout(() => {
        let isEditable = target.getAttribute('contenteditable') === 'true' || target.isContentEditable;
        let currentText = isEditable ? target.innerText : target.value;

        if (!currentText) return;

        const map = scan(currentText);

        if (Object.keys(map).length > 0) {
            isProcessing = true;
            let modified = false;

            if (isEditable) {
                const selection = window.getSelection();
                let offset = 0;
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const preCaretRange = range.cloneRange();
                    preCaretRange.selectNodeContents(target);
                    preCaretRange.setEnd(range.endContainer, range.endOffset);
                    offset = preCaretRange.toString().length;
                }

                let oldLength = target.innerText.length;

                function walkAndReplace(node) {
                    if (node.nodeType === 3) {
                        let text = node.nodeValue;
                        let replacedText = mask(text, map);
                        if (replacedText !== text) {
                            node.nodeValue = replacedText;
                            modified = true;
                        }
                    } else if (node.nodeType === 1) {
                        node.childNodes.forEach(child => walkAndReplace(child));
                    }
                }

                walkAndReplace(target);

                if (modified) {
                    let newLength = target.innerText.length;
                    let lengthDiff = newLength - oldLength;
                    let newOffset = Math.max(0, offset + lengthDiff);

                    restoreCaretPosition(target, newOffset);
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else {
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const maskedText = mask(currentText, map);

                if (maskedText !== currentText) {
                    let lengthDiff = maskedText.length - currentText.length;
                    target.value = maskedText;
                    target.setSelectionRange(Math.max(0, start + lengthDiff), Math.max(0, end + lengthDiff));
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                    modified = true;
                }
            }

            // KİLİT NOKTA: Tek bir yerden hem sayacı hem de tablo verisini (vaultData) gönderiyoruz
            if (modified) {
                chrome.storage.local.get(['maskedCount'], (result) => {
                    const newCount = (result.maskedCount || 0) + Object.keys(map).length;
                    chrome.storage.local.set({
                        maskedCount: newCount,
                        vaultData: globalVault
                    });
                });
                console.log("🛡️ Context-Shield: PII Detected and Masked.");
            }

            setTimeout(() => {
                isProcessing = false;
            }, 50);
        }
    }, TYPING_DELAY);
}

// --- 3. Atomic Deletion (Tek Tuşla Etiket Silme) ---
function handleKeyDown(event) {
    if (!shieldEnabled) return;

    if (event.key === 'Backspace' || event.key === 'Delete') {
        const target = event.target;
        let isEditable = target.getAttribute('contenteditable') === 'true' || target.isContentEditable;

        if (isEditable) {
            const selection = window.getSelection();
            if (!selection.isCollapsed) return;

            const node = selection.focusNode;
            const offset = selection.focusOffset;

            if (node && node.nodeType === 3) {
                const text = node.nodeValue;

                if (event.key === 'Backspace') {
                    const textBefore = text.slice(0, offset);
                    const match = textBefore.match(/\[(KİŞİ|TC|EPOSTA|TELEFON)_\d+\]$/);

                    if (match) {
                        event.preventDefault();
                        const tokenLength = match[0].length;
                        node.nodeValue = text.slice(0, offset - tokenLength) + text.slice(offset);

                        const range = document.createRange();
                        range.setStart(node, offset - tokenLength);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } else if (event.key === 'Delete') {
                    const textAfter = text.slice(offset);
                    const match = textAfter.match(/^\[(KİŞİ|TC|EPOSTA|TELEFON)_\d+\]/);

                    if (match) {
                        event.preventDefault();
                        const tokenLength = match[0].length;
                        node.nodeValue = text.slice(0, offset) + text.slice(offset + tokenLength);

                        const range = document.createRange();
                        range.setStart(node, offset);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            }
        } else {
            if (target.selectionStart !== target.selectionEnd) return;
            const offset = target.selectionStart;
            const text = target.value;

            if (event.key === 'Backspace') {
                const textBefore = text.slice(0, offset);
                const match = textBefore.match(/\[(KİŞİ|TC|EPOSTA|TELEFON)_\d+\]$/);

                if (match) {
                    event.preventDefault();
                    const tokenLength = match[0].length;
                    target.value = text.slice(0, offset - tokenLength) + text.slice(offset);
                    target.setSelectionRange(offset - tokenLength, offset - tokenLength);
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else if (event.key === 'Delete') {
                const textAfter = text.slice(offset);
                const match = textAfter.match(/^\[(KİŞİ|TC|EPOSTA|TELEFON)_\d+\]/);

                if (match) {
                    event.preventDefault();
                    const tokenLength = match[0].length;
                    target.value = text.slice(0, offset) + text.slice(offset + tokenLength);
                    target.setSelectionRange(offset, offset);
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    }
}

// --- 4. Caret Position Logic (Güçlendirilmiş Sigortalı Versiyon) ---
function restoreCaretPosition(el, offset) {
    const selection = window.getSelection();
    const range = document.createRange();
    let currentOffset = 0;
    let nodeStack = [el];
    let found = false;

    if (offset <= 0) {
        range.setStart(el, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
    }

    while (nodeStack.length > 0 && !found) {
        let node = nodeStack.pop();
        if (node.nodeType === 3) {
            let nextOffset = currentOffset + node.length;
            if (offset <= nextOffset) {
                range.setStart(node, offset - currentOffset);
                range.collapse(true);
                found = true;
            }
            currentOffset = nextOffset;
        } else {
            let i = node.childNodes.length;
            while (i--) {
                nodeStack.push(node.childNodes[i]);
            }
        }
    }

    if (!found && currentOffset > 0) {
        let lastTextNode = null;
        let stack = [el];
        while (stack.length > 0) {
            let n = stack.pop();
            if (n.nodeType === 3) lastTextNode = n;
            else {
                for (let i = n.childNodes.length - 1; i >= 0; i--) stack.push(n.childNodes[i]);
            }
        }
        if (lastTextNode) {
            range.setStart(lastTextNode, lastTextNode.length);
            range.collapse(true);
            found = true;
        }
    }

    if (found) {
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

// --- 5. Listeners & Observers ---
function attachListeners() {
    const selectors = 'input[type="text"], textarea, [contenteditable="true"]';
    const elements = document.querySelectorAll(selectors);
    elements.forEach(el => {
        if (!el.dataset.shieldActive) {
            el.addEventListener('input', handleInput);
            el.addEventListener('keydown', handleKeyDown); // Atomik silme dinleyicisi eklendi
            el.dataset.shieldActive = "true";
        }
    });
}

const observer = new MutationObserver((mutations) => {
    let shouldReattach = false;
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            shouldReattach = true;
        } else if (mutation.type === 'characterData' && mutation.target.parentElement) {
            const parent = mutation.target.parentElement.closest('[contenteditable="true"]');
            if (parent && !isProcessing) {
                handleInput({ target: parent });
            }
        }
    }
    if (shouldReattach) attachListeners();
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

// --- 6. Clipboard Interceptor ---
let isPasteProcessing = false;

function handlePaste(event) {
    if (!shieldEnabled || isPasteProcessing) return;

    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');

    if (!pastedText) return;

    const map = scan(pastedText);

    if (Object.keys(map).length > 0) {
        event.preventDefault();
        event.stopPropagation();

        isPasteProcessing = true;
        const maskedText = mask(pastedText, map);

        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', maskedText);

        const syntheticEvent = new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true,
            cancelable: true
        });

        event.target.dispatchEvent(syntheticEvent);

        setTimeout(() => {
            isPasteProcessing = false;
        }, 100);

        // KİLİT NOKTA: Kopyala-Yapıştır işleminde de tablo verisini (vaultData) gönderiyoruz
        chrome.storage.local.get(['maskedCount'], (result) => {
            const newCount = (result.maskedCount || 0) + Object.keys(map).length;
            chrome.storage.local.set({
                maskedCount: newCount,
                vaultData: globalVault
            });
        });
    }
}

window.addEventListener('paste', handlePaste, true);
attachListeners();
console.log("🚀 Context-Shield AI Extension Active (Strict Mode w/ Vault & Atomic Delete).");