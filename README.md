# Vizit Sade

Fonet Canlı Vizit'in çalışan hasta toplama ve ayrıntı çekme altyapısını temel alan; yoğun servis vizitine uygun kompakt klinik panel ve toplu Word/Google Docs çıktısı sunan bağımsız tarayıcı betiği.

## Güvenli kullanım

- Mevcut GitHub dosyasını ve çalışan `window.__FONET_SERVICE_PANEL__` durumunu değiştirmez.
- Kendi `window.__VIZIT_SADE__` ad alanını kullanır.
- Tema, bildirim, kart ve sıralama ayarlarını `vizitSade*` anahtarlarında tutar; Acil OtoExport ayarlarına dokunmaz.
- Hasta verisini başka bir sunucuya göndermez; yalnızca açık Fonet oturumundaki istekleri kullanır.
- Gerçek hasta verisi içeren çıktıların yalnızca kurumun yetkili ortamında saklanması gerekir.

## Kullanım

1. `index.html` sayfasındaki **Vizit Sade** düğmesini yer imleri çubuğuna sürükleyin.
2. Bookmarklet'i Fonet servis hasta listesi açıkken çalıştırın.
3. Panel hastaları toplar ve ayrıntıları arka planda tarar.
4. **Araçlar** menüsünden Word, Google Docs, eski DOCX yükleme ve klinik sırası seçeneklerine erişin.

Google Docs seçeneği biçimi koruyan DOCX dosyasını indirir ve Google Drive'ı açar.

## Klinik panel

- Kompakt üst bar ve tek satırlık servis özeti
- Hasta, oda, tanı, doktor ve klinik için Türkçe karakter duyarlı arama
- Kritik, yeni order, bekleyen konsültasyon, kritik laboratuvar ve postop filtreleri
- FONET, kritik, oda ve isim sıralaması
- Ekran genişliğine göre 4–5 sütunlu hasta kartları
- Klinik anlamlı kırmızı/turuncu/yeşil/mavi/gri durum etiketleri
- Sağdan açılan geniş hasta detay çekmecesi ve açılır klinik bölümler
- Açık/koyu tema, bildirim sesi ve kritik alarm ayarları
- Değişmeyen kartları yeniden oluşturmayan parçalı DOM güncellemesi

## Belge biçimi

- A4, Word/LibreOffice için zorunlu iki sütunlu tablo yerleşimi
- Tahoma
- Belge başlığı: 17 pt
- Hasta başlığı: 15 pt
- Görüntüleme/ana metin: 9 pt
- Order satırı: ilaç adı ve başlangıç tarihi
- Takip: tarihli klinik izlem kayıtları
- Gözlem: en güncel hemşire devir notu
- Tarihli görüntüleme ve konsültasyon bölümleri
- Exportta konsültasyonlar hem son bir takvim ayıyla hem de hastanın yatış tarih-saatinden sonrasıyla sınırlandırılır.
- Görüntülemeler son 45 günle sınırlandırılır.
- Ayrıntılı Görüntüleme bölümünde alt/üst/tüm abdomen BT, toraks BT, abdomen USG, MRCP, ERCP, EUS ve PTK gösterilir.
- BT raporlarında `SONUÇ:` başlığından önceki metin; ERCP ve EUS raporlarında yalnızca `SONUÇ:` bölümü yazılır.
- EKG, PAAG, ADBG, BT, ERCP, PTK ve diğer tüm son 45 günlük görüntülemeler Takip'te yalnızca ad olarak listelenir.
- Eski DOCX'te olup güncel FONET hasta listesinde olmayan hastalar belgenin en sonunda kırmızı korunur.
- Eski DOCX'ten eşleşen hastaların sabit alanları kilitli kalır. Yeni hastaların tanısında en son yanıtlanan Genel Cerrahi konsültasyonu, yoksa FONET tanı listesi kullanılır.

## Not

Fonet kurulumları arasında endpoint ve alan adları değişebilir. Görüntüleme listesinin boş kalması halinde kurum sürümündeki RIS liste endpointi `fetchImaging` içindeki adaylara eklenmelidir.
