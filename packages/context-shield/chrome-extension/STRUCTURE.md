# Chrome Extension Porting Guide (Phase 2)

Bu klasör, `packages/context-shield` altındaki Faz 2 mimarisinin Chrome eklentisi versiyonudur.

## Dosya Yapısı
- `manifest.json`: Eklenti tanımları ve izinler.
- `content.js`: Anlık maskeleme yapan ana script (Scanner + Masker entegre edildi).
- `icon.png`: Eklenti simgesi (Kullanıcı tarafından eklenmelidir).

## Porting Mantığı
1. **Core Entegrasyonu**: `src/core/scanner.js` ve `src/core/masker.js` içerisindeki regex desenleri ve mantık, tarayıcı uyumluluğu için `content.js` içine doğrudan dahil edildi.
2. **Bağımlılık Yönetimi**: Eklenti ortamında `require` kullanılmadığı için kodlar "standalone" hale getirildi.
3. **Anlık (Real-time) Maskeleme**: `MutationObserver` ve `input` event listener'ları ile kullanıcı herhangi bir `input` veya `textarea` alanına yazı yazdığında zırhlı regex motoru çalıştırılır.

## Kurulum
1. Chrome'da `chrome://extensions` sayfasına gidin.
2. "Developer Mode" (Geliştirici Modu) seçeneğini açın.
3. "Load unpacked" (Paketlenmemiş öğe yükle) butonuna tıklayarak `packages/context-shield/chrome-extension/` klasörünü seçin.
