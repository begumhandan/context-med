'use strict';

/**
 * PII Scanner (Regex-Based NER)
 */

const PATTERNS = {
  TC: /\b[1-9][0-9]{10}\b/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /\b(0?5[0-9]{2}[-.\s]??[0-9]{3}[-.\s]??[0-9]{2}[-.\s]??[0-9]{2}|0?5[0-9]{9})\b/g,
  PERSON: /(?<![A-ZÇĞİÖŞÜa-zçğıöşü])(?!(?:Hasta|Doğum|Tarih|Klinik|Rapor|Bulgu|Dosya|Yakını|Tanı|İletişim|Adres|Muayene|Laboratuvar|Glikoz|Üre|Kreatinin|Saat|HBG|WBC|PLT|Cihaz|Nem|Hata|Sürüm|Bakım|Teknisyen|Parça|Fiyat|Adet|Toplam|Kimlik|TC|No|Sayın|Doktor|Prof|Dr|Uzm|E-posta|Email|Telefon|Adı|Soyadı|Yedek|Bellek|Kodu|Son|Seri|Yüzde|Oran|Değer|Aralığı)\b)((?:[A-ZÇĞİÖŞÜ]{2,}|[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)(?:[ \t](?:[A-ZÇĞİÖŞÜ]{2,}|[A-ZÇĞİÖŞÜ][a-zçğıöşü]+))+)(?![A-ZÇĞİÖŞÜa-zçğıöşü])/gu
};

const TOKEN_LABELS = {
  TC: 'TC',
  EMAIL: 'EPOSTA',
  PHONE: 'TELEFON',
  PERSON: 'KİŞİ'
};

function scan(text) {
  const entities = [];
  const map = {};
  const counters = {
    TC: 0,
    EMAIL: 0,
    PHONE: 0,
    PERSON: 0
  };

  // Find matches for each pattern
  for (const [type, regex] of Object.entries(PATTERNS)) {
    let match;
    // Reset regex index for global searches
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      // Use first capturing group if it exists, otherwise the whole match
      const originalValue = match[1] || match[0];

      // Skip if already mapped
      if (!map[originalValue]) {
        counters[type]++;
        const label = TOKEN_LABELS[type];
        const token = `[${label}_${counters[type]}]`;
        map[originalValue] = token;
      }

      entities.push({
        pii: originalValue,
        entity: type,
        detected: true,
        token: map[originalValue],
        index: match.index
      });
    }
  }

  // Sort entities by index for consistency
  entities.sort((a, b) => a.index - b.index);

  return {
    text,
    entities,
    map
  };
}

module.exports = { scan };
