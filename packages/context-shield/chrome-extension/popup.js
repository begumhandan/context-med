/**
 * Context-Shield AI - Popup Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Şalteri Yakala (Hem 'shieldToggle' istenen ID'yi, hem de eskisini koruma amaçlı destekliyor)
    const shieldToggle = document.getElementById('shieldToggle') || document.getElementById('shield-toggle');
    const maskedCountEl = document.getElementById('masked-count') || document.getElementById('maskedCountDisplay');

    if (!shieldToggle) return;

    // Durumu Oku (Init)
    chrome.storage.local.get(['shieldEnabled', 'maskedCount'], (result) => {
        // Varsayılan olarak true (açık) kabul et
        const isEnabled = result.shieldEnabled !== undefined ? result.shieldEnabled : true;
        shieldToggle.checked = isEnabled;

        // Eğer eklenti ilk kez çalışıyorsa varsayılan durumu (true) hafızaya yaz
        if (result.shieldEnabled === undefined) {
            chrome.storage.local.set({ shieldEnabled: true });
        }

        // Maskelenen Sayıcı (Kod kesinlikle bozulmadan korundu)
        if (maskedCountEl && result.maskedCount !== undefined) {
            maskedCountEl.textContent = result.maskedCount;
        }
    });

    // Değişimi Dinle ve Kaydet
    shieldToggle.addEventListener('change', () => {
        const isEnabled = shieldToggle.checked;
        chrome.storage.local.set({ shieldEnabled: isEnabled }, () => {
            console.log('🛡️ Shield durumu güncellendi:', isEnabled);

            // Motora Haber Ver: Durum değiştiğinde aktif sekmeye mesaj at
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SHIELD', value: isEnabled }, (response) => {
                        // Hata yutucu: Sekmede content.js çalışmıyorsa chrome konsolunda kırmızı hata basmasını engeller
                        if (chrome.runtime.lastError) {
                            console.log("Context-Shield bu sayfada aktif değil.");
                        }
                    });
                }
            });
        });
    });

    // // --- YENİ EKLENEN: Eşleşme Tablosu (Vault Accordion) Mantığı ---
    // const toggleVaultBtn = document.getElementById('toggleVaultBtn');
    // const vaultContainer = document.getElementById('vaultContainer');
    // const vaultArrow = document.getElementById('vaultArrow');
    // const vaultTableBody = document.getElementById('vaultTableBody');

    // if (toggleVaultBtn && vaultContainer && vaultTableBody) {
    //     // 1. Tablo Render Fonksiyonu
    //     const renderVaultTable = (data) => {
    //         vaultTableBody.innerHTML = ''; // Tabloyu temizle

    //         if (!data || Object.keys(data).length === 0) {
    //             vaultTableBody.innerHTML = '<tr><td colspan="2" style="padding: 12px; text-align: center; color: #8b949e; font-style: italic;">Henüz eşleşme yok.</td></tr>';
    //             return;
    //         }

    //         // data formatı: { "Ahmet Yılmaz": "[KİŞİ_1]" }
    //         // Arayüze Maske (Value) -> Orijinal (Key) olarak yazdırıyoruz
    //         for (const [originalValue, maskedToken] of Object.entries(data)) {
    //             const row = document.createElement('tr');
    //             row.innerHTML = `
    //                 <td style="padding: 8px 12px; border-bottom: 1px solid #30363d; color: #58a6ff; font-family: monospace; font-weight: 500;">${maskedToken}</td>
    //                 <td style="padding: 8px 12px; border-bottom: 1px solid #30363d; color: #c9d1d9;">${originalValue}</td>
    //             `;
    //             vaultTableBody.appendChild(row);
    //         }
    //     };

    //     // İlk açılışta veriyi çek ve tabloya yaz
    //     chrome.storage.local.get(['vaultData'], (result) => {
    //         renderVaultTable(result.vaultData);
    //     });

    //     // Canlı Güncelleme: Arka planda yeni biri maskelendiğinde tabloyu anında yenile
    //     chrome.storage.onChanged.addListener((changes, namespace) => {
    //         if (namespace === 'local' && changes.vaultData) {
    //             renderVaultTable(changes.vaultData.newValue);
    //         }
    //     });

    //     // 2. Aç/Kapat (Accordion Toggle) Dinleyicisi
    //     toggleVaultBtn.addEventListener('click', () => {
    //         if (vaultContainer.style.display === 'none') {
    //             vaultContainer.style.display = 'block';
    //             vaultArrow.textContent = '▲';
    //         } else {
    //             vaultContainer.style.display = 'none';
    //             vaultArrow.textContent = '▼';
    //         }
    //     });
    // }
});
