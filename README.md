# Vizit Sade

Güncel sürüm: **V1.13**

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

Bookmarklet yalnızca yükleyicidir ve her tıklamada `main` dalındaki güncel `vizit-sade.js`
dosyasını GitHub API üzerinden önbelleksiz indirir. Yeni sürümlerde yeniden bookmark
oluşturmak gerekmez; FONET sekmesinde mevcut bookmark'a yeniden tıklamak yeterlidir.

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
- Klinik İzlem: Order üstünde kalın başlık altında yatış sonrası en son klinik izlem kaydı
- Gözlem: en güncel hemşire devir notu
- Tarihli görüntüleme ve konsültasyon bölümleri
- Exportta konsültasyonlar hem son bir takvim ayıyla hem de hastanın yatış tarih-saatinden sonrasıyla sınırlandırılır.
- Görüntülemeler son 45 günle sınırlandırılır; abdomen USG yanında hepatobilier USG de ayrıntılı gösterilir.
- Ayrıntılı Görüntüleme bölümünde alt/üst/tüm abdomen BT, toraks BT, kontrastlı boyun BT, yüzeyel doku USG, abdomen ve hepatobilier USG, tüm Doppler US/RDUS, PET-CT, dinamik karaciğer/pankreas incelemeleri, MRCP, ERCP, EUS, PTK, özefagoskopi, kolonoskopi, rektoskopi ve sigmoidoskopi gösterilir. Perkütan safra kesesi drenajı hem Görüntüleme hem Takip bölümünde yer alır; drenajın kolanjiografi bulguları ve dinamik pankreas BT raporu sonuç dahil korunur.
- BT raporlarında `SONUÇ:` başlığından önceki metin; ERCP ve EUS raporlarında yalnızca `SONUÇ:` bölümü yazılır.
- Takip bölümünde yalnızca yatış tarihinden sonraki işlem kayıtları bulunur; klinik izlem ayrı başlık altındadır. Bütün satırlar en güncel tarih en üstte olacak şekilde sıralanır ve konsültasyonlar `01.10 Kardiyoloji kons` biçiminde yalnız bölüm adıyla gösterilir. Güncel ve geçmiş orderlardaki kan ürünleri adetleriyle `1 ES`, `2 TDP`, `3 TS` olarak yazılır; adet bilgisi yoksa sayı üretilmez.
- Gastroenterolojik Cerrahi ile Cerrahi Onkoloji tek başlıkta birleştirilir ve hastalar oda numarasına göre sıralanır.
- Export klinik sırası `Acil Genel Cerrahi → Genel Cerrahi 6 → Genel Cerrahi 1 → Genel Cerrahi 2 → Gastroenterolojik ve Onkolojik Cerrahi → Genel Cerrahi 3 → Genel Cerrahi 4 → diğer klinikler` şeklindedir; yoğun bakım en sonda, `KONTROL` hastaları ise belgenin sonunda kalır.
- Dünkü DOCX'te olup güncel FONET listesinde bulunmayan hastalar, özgün hasta blokları değiştirilmeden çıktının sonundaki `KONTROL` başlığında kırmızı korunur; satıra bölünmüş hasta başlıkları da tanınır.
- Microsoft Word tarafından eklenen `w14` ve diğer OOXML ad alanlarını kullanan DOCX dosyalarındaki hasta blokları da tam olarak okunur ve `KONTROL` bölümüne taşınır.
- Dünkü DOCX okunurken Word ve Google Docs düğmeleri kilitlenir; `YÜKLENDİ ✓` mesajı görünmeden export alınamadığı için eski belgedeki tanı ve diğer sabit alanların canlı FONET verisiyle değişmesi engellenir.
- `Görüntüleme eşliğinde karaciğer lezyon biopsi işlemi` dahil biyopsi kayıtları Takip'te kısaca `Biyopsi` olarak gösterilir.
- Biyopsi, radyoloji raporu çıkmadan Takip'e eklenmez; rapor çıktığında istem tarihi yerine rapor tarihi kullanılır.
- EKG, PAAG, ADBG, BT, ERCP, PTK ve diğer tüm son 45 günlük görüntülemeler Takip'te yalnızca ad olarak listelenir.
- Eski DOCX'te olup güncel FONET hasta listesinde olmayan hastalar belgenin en sonunda `KONTROL` başlığı altında kırmızı korunur.
- Order başlangıcı, günlük yeniden giriş tarihi yerine kesintisiz yatış sürecindeki bütün servis/yoğun bakım sevkleri taranarak aynı ilacın ilk kez order edildiği tarih olarak gösterilir.
- Yatış tarihi, taburculuk olmadan acil/ameliyathane/yoğun bakım/servis arasında yapılan nakillerde ilk yatış tarihidir. Farklı hasta gelişlerindeki ardışık hareketler de taranır; farklı gelişler arasında en fazla 24 saatlik geçiş aralığı kabul edilir. Eve çıkış/taburcu/exitus ile biten eski yatışlar birleştirilmez. Hareketlerden belirlenen tarih eski DOCX'teki servis yatış tarihinin önüne geçer.
- CA 19-9, CA 125, CA 15-3, CA 72-4, CEA, AFP, PSA, NSE ve diğer desteklenen tümör belirteçlerinin hasta geçmişindeki en güncel değerleri, yeni sonuç çalışılmayan günlerde de Vital satırının altında sabit gösterilir.
- Eski DOCX'ten eşleşen hastaların sabit alanları kilitli kalır. Yeni hastaların tanısında en son yanıtlanan Genel Cerrahi konsültasyonu, yoksa FONET tanı listesi kullanılır.
- BH alanına `CA` yalnızca doğrulanmış kanser ifadesi varsa eklenir; "malignite/tümör izlenmedi" ve kalsiyum gibi kullanımlar CA sayılmaz.
- Aynı tarihteki dört ERCP işlem kalemi Takip'te tek `19.08 ERCP` satırına birleştirilir.
- TANI, OP ve PLAN 11 punto; rejim, yatış ve operasyon tarihi 10 punto yazılır. Rejim satırı `POSTOP 4-R1/Açık sıvı` biçimindedir; gerçekleşmiş ameliyat yoksa yatıştan itibaren `PREOP` kullanılır.
- Genel Cerrahi hastasının son 31 günde gerçekleşmiş ameliyatı varsa ameliyat mevcut servis yatışından önce olsa bile POSTOP kabul edilir; bu, yoğun bakımdan servise gelen hastaları kapsar.

## Not

Fonet kurulumları arasında endpoint ve alan adları değişebilir. Görüntüleme listesinin boş kalması halinde kurum sürümündeki RIS liste endpointi `fetchRadiology` içinde kontrol edilmelidir. Kan ürünü takibi, alınan güncel/geçmiş order ve klinik izlem kayıtlarındaki istem bilgilerini kullanır; ayrı kan bankası modülü için doğrulanmış bir endpoint yoktur.

## Doğrulama

`node --check vizit-sade.js` ve `node tests/regression.cjs` ile sözdizimi ve örnek veri testleri çalıştırılır. Testler görüntüleme adlarını, raporların korunmasını, kan ürünü adetlerini, yatış zincirini, klinik sırasını ve HTML/Word yerleşimini kapsar. Canlı FONET bağlantısı ve gerçek hasta verisiyle uçtan uca doğrulama ayrıca gereklidir.
