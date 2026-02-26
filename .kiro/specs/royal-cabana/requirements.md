# Gereksinimler Dokümanı — Royal Cabana

## Giriş

Royal Cabana, bir otel/casino tatil köyünün sahil/iskele bölgesindeki lüks kabana alanlarını yönetmek ve rezervasyon süreçlerini dijitalleştirmek için tasarlanan premium bir sistemdir. Sistem beş ana modülden oluşur: Sistem Yöneticisi Modülü (master data, tanımlar ve konfigürasyon), Admin Modülü (gözetim, onay/red, fiyatlandırma, kullanıcı yönetimi), Casino Rezervasyon Modülü (talep oluşturma, takvim görünümü, 2D/3D kabana gezinme), F&B Rezervasyon Modülü (talep görüntüleme, konsept dışı ekstra ekleme, hizmet yürütme) ve Raporlama ve Sunum Modülü (detaylı raporlama, sunum oluşturma).

Talep akışı: Casino departmanı misafirler/VIP'ler için kabana talepleri oluşturur → Admin tüm talepleri değerlendirir ve onaylar/reddeder → F&B departmanı onaylanan rezervasyonları görüntüler ve hizmet yürütmesini gerçekleştirir → Casino kullanıcısı onay/red bildirimi alır.

Sistemin genel renk teması ve görsel kimliği `logo.png` dosyasından türetilir; premium, lüks tatil köyü estetiği hedeflenir.

## Sözlük (Glossary)

- **Sistem**: Royal Cabana uygulamasının tamamını ifade eder
- **Sistem_Yöneticisi_Modülü**: Kullanıcı tanımları, kabana yerleşimi (2D harita), kabana sınıfları, konseptler, ürünler ve tüm sistem konfigürasyonunu yöneten en üst seviye modül
- **Admin_Modülü**: Tüm sistemi kuşbakışı gören, Casino'dan gelen tüm talepleri onaylayan/reddeden, dinamik fiyatlandırma yapan, kullanıcı yönetimi sağlayan gözetim ve karar modülü
- **Casino_Rezervasyon_Modülü**: Casino departmanının misafirler/VIP'ler için kabana rezervasyon talepleri oluşturduğu, takvim görünümünde rezervasyonları takip ettiği, 2D/3D kabana görünümlerini incelediği, değişiklik/iptal/ek konsept talepleri gönderdiği modül
- **F&B_Rezervasyon_Modülü**: F&B departmanının Casino taleplerini ve rezervasyon durumlarını görüntülediği, onaylanan rezervasyonlarda konsept dışı ekstra ürün ve hizmet eklediği, hizmet yürütmesini gerçekleştirdiği operasyonel modül
- **Raporlama_Sunum_Modülü**: Sistem verilerinden detaylı raporlar ve otel yönetimine sunulabilecek formatta sunumlar oluşturan modül; Sistem Yöneticisi yetkisiyle erişilir
- **Kabana**: Sahil/iskele bölgesinde konumlanan, misafirlere tahsis edilen lüks yapı birimi
- **Kabana_Sınıfı**: Kabanaların kategorize edildiği, kendine özgü standartları ve dinamik özellikleri olan sınıf tipi (4-5 farklı sınıf)
- **Konsept**: Bir kabana sınıfına atanan, ürün seçimlerini ve hizmet paketini tanımlayan tema/paket
- **Ürün**: Sistemde kayıtlı, alış ve satış fiyatı olan, konseptlere dahil edilebilen mal veya hizmet kalemi
- **Harita_Görünümü**: Kabanaların gerçek konumlarına uygun şekilde 2D olarak görselleştirildiği Leaflet tabanlı harita arayüzü
- **3D_Görünüm**: Kabanaların sınıflarına göre farklı 3D modellerle görselleştirildiği ileri aşama arayüz
- **Kroki**: Kabanaların fiziksel yerleşim planını gösteren referans çizim (`gorsel/kroki.png` ve ek görünümler)
- **Dinamik_Fiyatlandırma**: Kabana, konsept, ürün ve ek özellik bazında esnek şekilde yapılandırılabilen fiyat sistemi
- **Takvim_Görünümü**: Rezervasyonların zaman çizelgesi olarak görüntülendiği, yeni talep oluşturma ve mevcut talepleri yönetme imkanı sunan profesyonel ve şık takvim arayüzü
- **Rezervasyon_Talebi**: Casino departmanının oluşturduğu, Admin onayı gerektiren kabana rezervasyon isteği
- **Değişiklik_Talebi**: Mevcut bir rezervasyon üzerinde Casino departmanının talep ettiği değişiklik isteği
- **İptal_Talebi**: Mevcut bir rezervasyonun iptali için Casino departmanının gönderdiği talep
- **Ek_Konsept_Talebi**: Mevcut bir rezervasyona ek konsept/ekstra eklenmesi için Casino departmanının gönderdiği talep
- **Konsept_Dışı_Ekstra**: F&B departmanının onaylanan bir rezervasyona konsept kapsamı dışında eklediği ek ürün veya hizmet
- **Sistem_Yöneticisi**: Sistem Yöneticisi Modülüne ve Raporlama Sunum Modülüne erişim yetkisi olan, tüm master data ve konfigürasyonu yöneten kullanıcı
- **Admin**: Admin Modülüne erişim yetkisi olan, tüm talepleri onaylayan/reddeden, fiyatlandırma ve kullanıcı yönetimi yapan gözetim kullanıcısı
- **Casino_Kullanıcısı**: Casino Rezervasyon Modülünü kullanan, misafirler/VIP'ler için talep oluşturan Casino departmanı personeli
- **F&B_Kullanıcısı**: F&B Rezervasyon Modülünü kullanan, talepleri görüntüleyen ve konsept dışı ekstra ekleyen F&B departmanı personeli
- **Sunum_Motoru**: Sistem verilerinden otomatik sunum/rapor oluşturan, Raporlama_Sunum_Modülüne ait bileşen

---

## Gereksinimler

### Gereksinim 1: Kullanıcı Tanımları ve Yönetimi

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, sisteme kullanıcı tanımlamak ve rol atamak istiyorum, böylece her departman personeli kendi yetkilerine uygun modüle erişebilsin.

#### Kabul Kriterleri

1. THE Sistem_Yöneticisi_Modülü SHALL Sistem_Yöneticisi, Admin, Casino_Kullanıcısı ve F&B_Kullanıcısı rollerinde kullanıcı tanımlamaya olanak sağlamalıdır
2. WHEN Sistem_Yöneticisi yeni bir kullanıcı oluşturduğunda, THE Sistem_Yöneticisi_Modülü SHALL kullanıcı adı, e-posta, şifre ve rol alanlarını zorunlu olarak istemelidir
3. WHEN Sistem_Yöneticisi bir kullanıcıya rol atadığında, THE Sistem SHALL kullanıcının yalnızca atanan role ait modüle erişmesini sağlamalıdır
4. THE Admin_Modülü SHALL Casino_Kullanıcısı ve F&B_Kullanıcısı rollerinde kullanıcı oluşturma yetkisine sahip olmalıdır
5. WHEN Admin yeni bir kullanıcı oluşturduğunda, THE Admin_Modülü SHALL kullanıcı adı, e-posta, şifre ve rol alanlarını zorunlu olarak istemelidir
6. IF bir kullanıcı yetkisi olmayan bir modüle erişmeye çalışırsa, THEN THE Sistem SHALL "Bu modüle erişim yetkiniz bulunmamaktadır" mesajı göstermeli ve erişim denemesini kaydetmelidir
7. THE Sistem_Yöneticisi_Modülü SHALL mevcut kullanıcıları listeleme, düzenleme ve devre dışı bırakma işlevlerini sağlamalıdır
8. THE Admin_Modülü SHALL mevcut Casino_Kullanıcısı ve F&B_Kullanıcısı hesaplarını listeleme, düzenleme ve devre dışı bırakma işlevlerini sağlamalıdır

---

### Gereksinim 2: Kabana Yerleşim ve Harita Yönetimi

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, kabanaların gerçek konumlarını 2D harita üzerinde yönetmek istiyorum, böylece fiziksel yerleşim planını dijital ortamda doğru şekilde temsil edebilirim.

#### Kabul Kriterleri

1. THE Sistem_Yöneticisi_Modülü SHALL Kroki (`gorsel/kroki.png`) referans alınarak kabana konumlarını Harita_Görünümü üzerinde görüntülemek için Leaflet tabanlı bir arayüz sağlamalıdır
2. WHEN Sistem_Yöneticisi bir kabana konumunu Harita_Görünümü üzerinde sürükleyerek değiştirdiğinde, THE Sistem_Yöneticisi_Modülü SHALL yeni koordinatları kaydetmelidir
3. WHEN Sistem_Yöneticisi yeni bir kabana eklediğinde, THE Sistem_Yöneticisi_Modülü SHALL kabanayı Harita_Görünümü üzerinde varsayılan konumda görüntülemelidir
4. THE Harita_Görünümü SHALL her kabanayı durumuna göre renk kodlaması ile (müsait, rezerve, kapalı) görüntülemelidir
5. WHEN Sistem_Yöneticisi bir kabana üzerine tıkladığında, THE Sistem_Yöneticisi_Modülü SHALL kabananın sınıf, konsept, durum ve fiyat bilgilerini özet olarak göstermelidir
6. IF Kroki dosyası (`gorsel/kroki.png`) yüklenemezse, THEN THE Sistem_Yöneticisi_Modülü SHALL kullanıcıya "Kroki yüklenemedi" hata mesajı göstermelidir
7. THE Sistem_Yöneticisi_Modülü SHALL ek kroki görünümlerini (`gorsel/kroki1.png`, `gorsel/kroki2.png`, `gorsel/kroki3.png`) referans olarak görüntüleme seçeneği sağlamalıdır

---

### Gereksinim 3: Kabana Sınıflandırma Sistemi

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, kabanaları farklı sınıflara ayırmak ve her sınıfa dinamik özellikler tanımlamak istiyorum, böylece farklı hizmet seviyelerini sistematik şekilde yönetebilirim.

#### Kabul Kriterleri

1. THE Sistem_Yöneticisi_Modülü SHALL en az 4, en fazla 5 farklı Kabana_Sınıfı tanımlamaya olanak sağlamalıdır
2. WHEN Sistem_Yöneticisi yeni bir Kabana_Sınıfı oluşturduğunda, THE Sistem_Yöneticisi_Modülü SHALL sınıf adı, açıklama ve varsayılan standartlar alanlarını zorunlu olarak istemelidir
3. WHEN Sistem_Yöneticisi bir Kabana_Sınıfına yeni bir özellik eklediğinde, THE Sistem_Yöneticisi_Modülü SHALL özelliği sınıfın standartlar listesine kaydetmelidir
4. WHEN Sistem_Yöneticisi bir Kabana_Sınıfını bir kabanaya atadığında, THE Sistem_Yöneticisi_Modülü SHALL sınıfa bağlı konsepti otomatik olarak kabanaya atamalıdır
5. THE Sistem_Yöneticisi_Modülü SHALL her Kabana_Sınıfının özellik listesini dinamik olarak genişletmeye ve düzenlemeye izin vermelidir
6. IF Sistem_Yöneticisi, üzerinde aktif kabana bulunan bir Kabana_Sınıfını silmeye çalışırsa, THEN THE Sistem_Yöneticisi_Modülü SHALL "Bu sınıfa atanmış kabanalar mevcut, önce kabanaların sınıfını değiştirin" uyarısı göstermelidir

---

### Gereksinim 4: Konsept Yönetimi

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, kabana sınıflarına atanacak konseptler oluşturmak ve bu konseptlere ürün seçimleri eklemek istiyorum, böylece her kabana tipinin sunduğu hizmet paketini tanımlayabileyim.

#### Kabul Kriterleri

1. WHEN Sistem_Yöneticisi yeni bir Konsept oluşturduğunda, THE Sistem_Yöneticisi_Modülü SHALL konsept adı, açıklama ve dahil edilen ürün listesi alanlarını sağlamalıdır
2. WHEN Sistem_Yöneticisi bir Konsepte ürün eklediğinde, THE Sistem_Yöneticisi_Modülü SHALL ürünü kayıtlı ürünler listesinden seçtirmelidir
3. WHEN Sistem_Yöneticisi bir Konsepti bir Kabana_Sınıfına atadığında, THE Sistem_Yöneticisi_Modülü SHALL o sınıftaki tüm kabanalara konsepti otomatik olarak yansıtmalıdır
4. THE Sistem_Yöneticisi_Modülü SHALL bir Konsepte dinamik olarak yeni özellikler ve ürünler eklemeye izin vermelidir
5. WHEN Sistem_Yöneticisi bir Konsepti düzenlediğinde, THE Sistem_Yöneticisi_Modülü SHALL değişiklikleri o konsepte bağlı tüm kabanalara yansıtmalıdır
6. IF Sistem_Yöneticisi, bir Kabana_Sınıfına atanmış bir Konsepti silmeye çalışırsa, THEN THE Sistem_Yöneticisi_Modülü SHALL "Bu konsept aktif bir sınıfa atanmış, önce sınıf atamasını kaldırın" uyarısı göstermelidir

---

### Gereksinim 5: Ürün Yönetimi

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, sistemde ürünleri kaydetmek ve her ürünün alış/satış fiyatlarını yönetmek istiyorum, böylece konseptlere dahil edilecek ürünleri ve maliyet/gelir analizini takip edebilirim.

#### Kabul Kriterleri

1. WHEN Sistem_Yöneticisi yeni bir Ürün kaydettiğinde, THE Sistem_Yöneticisi_Modülü SHALL ürün adı, alış fiyatı ve satış fiyatı alanlarını zorunlu olarak istemelidir
2. THE Sistem_Yöneticisi_Modülü SHALL her Ürün için konsepte göre farklı satış fiyatları tanımlamaya izin vermelidir
3. WHEN Sistem_Yöneticisi bir Ürünün fiyatını güncellediğinde, THE Sistem_Yöneticisi_Modülü SHALL güncellenen fiyatı ilgili tüm konseptlerde yansıtmalıdır
4. THE Sistem_Yöneticisi_Modülü SHALL tüm kayıtlı ürünleri ad, alış fiyatı ve satış fiyatı bilgileriyle listeleyebilmelidir
5. WHEN Sistem_Yöneticisi bir Ürünü silmek istediğinde ve Ürün aktif bir Konsepte dahilse, THEN THE Sistem_Yöneticisi_Modülü SHALL "Bu ürün aktif konseptlerde kullanılıyor, önce konseptlerden çıkarın" uyarısı göstermelidir
6. IF Sistem_Yöneticisi alış fiyatını satış fiyatından yüksek girerse, THEN THE Sistem_Yöneticisi_Modülü SHALL "Alış fiyatı satış fiyatından yüksek, devam etmek istiyor musunuz?" onay mesajı göstermelidir

---

### Gereksinim 6: Dinamik Fiyatlandırma Sistemi

**Kullanıcı Hikayesi:** Bir admin olarak, kabana, konsept, ürün ve ek özellik bazında esnek fiyatlandırma yapılandırmak istiyorum, böylece gelen talepleri fiyatlandırabileyim ve farklı senaryolara göre fiyatları özelleştirebilirim.

#### Kabul Kriterleri

1. THE Admin_Modülü SHALL kabana bazında günlük fiyat tanımlamaya olanak sağlamalıdır
2. THE Admin_Modülü SHALL konsept bazında toplam paket fiyatı ve kalem bazlı (itemized) fiyat tanımlamaya olanak sağlamalıdır
3. THE Admin_Modülü SHALL ek özellikler ve ekstra konseptler için ayrı fiyat tanımlamaya olanak sağlamalıdır
4. WHEN Admin belirli bir kabana için özel fiyat tanımladığında, THE Dinamik_Fiyatlandırma SHALL o kabanaya özel fiyatı genel fiyatın önüne geçirerek uygulamalıdır
5. WHEN Admin belirli bir konsept için özel ürün fiyatı tanımladığında, THE Dinamik_Fiyatlandırma SHALL konsepte özel fiyatı genel ürün fiyatının önüne geçirerek uygulamalıdır
6. THE Dinamik_Fiyatlandırma SHALL fiyat öncelik sırasını şu şekilde uygulamalıdır: kabana özel fiyat > konsept özel fiyat > genel ürün fiyatı
7. IF bir kabana için hiçbir fiyat tanımlanmamışsa, THEN THE Dinamik_Fiyatlandırma SHALL kabanayı "fiyat belirlenmemiş" durumunda göstermelidir
8. WHEN Admin bir Rezervasyon_Talebi için fiyat belirlediğinde, THE Admin_Modülü SHALL toplam fiyatı talep detayında görüntülemelidir

---

### Gereksinim 7: Sistem Kontrolü

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, tüm sistemin veya tek tek kabanaların rezervasyona açık/kapalı durumunu kontrol etmek istiyorum, böylece operasyonel ihtiyaçlara göre müsaitlik yönetimi yapabileyim.

#### Kabul Kriterleri

1. THE Sistem_Yöneticisi_Modülü SHALL tüm sistemi rezervasyona açma ve kapatma kontrolü sağlamalıdır
2. WHEN Sistem_Yöneticisi sistemi rezervasyona kapattığında, THE Casino_Rezervasyon_Modülü SHALL yeni talep oluşturma işlemini devre dışı bırakmalı ve "Sistem şu anda rezervasyona kapalıdır" mesajı göstermelidir
3. THE Sistem_Yöneticisi_Modülü SHALL her kabana için bireysel olarak rezervasyona açma ve kapatma kontrolü sağlamalıdır
4. WHEN Sistem_Yöneticisi bir kabanayı rezervasyona kapattığında, THE Casino_Rezervasyon_Modülü SHALL o kabanayı "kapalı" durumunda göstermeli ve seçime izin vermemelidir
5. WHILE sistem rezervasyona kapalıyken, THE Admin_Modülü SHALL mevcut rezervasyonları görüntüleme ve yönetme işlevlerini aktif tutmalıdır
6. WHEN Sistem_Yöneticisi sistemi yeniden açtığında, THE Casino_Rezervasyon_Modülü SHALL tüm müsait kabanaları anında talep oluşturmaya uygun duruma getirmelidir

---

### Gereksinim 8: Casino Kabana Görüntüleme (2D ve 3D)

**Kullanıcı Hikayesi:** Bir casino kullanıcısı olarak, kabanaları 2D harita ve 3D görünüm üzerinde incelemek istiyorum, böylece misafirler için en uygun kabanayı seçebilirim.

#### Kabul Kriterleri

1. THE Casino_Rezervasyon_Modülü SHALL kabanaları Harita_Görünümü üzerinde gerçek konumlarıyla görüntülemelidir
2. THE Casino_Rezervasyon_Modülü SHALL her kabanayı müsaitlik durumuna göre renk kodlamasıyla (müsait: yeşil, rezerve: kırmızı, kapalı: gri) göstermelidir
3. WHEN Casino_Kullanıcısı bir kabana üzerine tıkladığında, THE Casino_Rezervasyon_Modülü SHALL kabananın sınıf bilgisi, konsept detayları ve görsellerini göstermelidir
4. THE Casino_Rezervasyon_Modülü SHALL kabanaları 3D_Görünüm üzerinde sınıflarına göre farklı 3D modellerle görselleştirmelidir
5. WHEN Casino_Kullanıcısı 3D_Görünüm üzerinde bir kabana seçtiğinde, THE Casino_Rezervasyon_Modülü SHALL kabananın detay bilgilerini ve fotoğraf açılarını (`gorsel/arka.jpg`, `gorsel/on.png`, `gorsel/sag.png`, `gorsel/sol.png`, `gorsel/ust.png`) göstermelidir
6. WHERE fiyat görüntüleme seçeneği aktifse, THE Casino_Rezervasyon_Modülü SHALL kabana detaylarında günlük fiyat ve konsept fiyat bilgilerini göstermelidir
7. WHILE Harita_Görünümü veya 3D_Görünüm yüklenirken, THE Casino_Rezervasyon_Modülü SHALL bir yükleniyor göstergesi (loading indicator) sunmalıdır
8. THE Casino_Rezervasyon_Modülü SHALL 2D ve 3D görünümler arasında geçiş yapma seçeneği sağlamalıdır

---

### Gereksinim 9: Casino Takvim Görünümü ve Rezervasyon Yönetimi

**Kullanıcı Hikayesi:** Bir casino kullanıcısı olarak, mevcut rezervasyonları profesyonel ve şık bir takvim arayüzünde görüntülemek, bu takvim üzerinden yeni talep oluşturmak ve mevcut talepleri yönetmek istiyorum, böylece tüm rezervasyon sürecini tek bir arayüzden takip edebilirim.

#### Kabul Kriterleri

1. THE Casino_Rezervasyon_Modülü SHALL tüm rezervasyonları Takvim_Görünümü üzerinde zaman çizelgesi olarak görüntülemelidir
2. THE Takvim_Görünümü SHALL günlük, haftalık ve aylık görünüm seçenekleri sağlamalıdır
3. THE Takvim_Görünümü SHALL her rezervasyonu durumuna göre renk kodlamasıyla (onay bekliyor: sarı, onaylandı: yeşil, reddedildi: kırmızı, iptal edildi: gri) göstermelidir
4. WHEN Casino_Kullanıcısı takvimde bir rezervasyon üzerine tıkladığında, THE Casino_Rezervasyon_Modülü SHALL rezervasyon detaylarını (kabana, misafir, tarih, durum, konsept) özet olarak göstermelidir
5. WHEN Casino_Kullanıcısı takvimde boş bir zaman dilimine tıkladığında, THE Casino_Rezervasyon_Modülü SHALL yeni Rezervasyon_Talebi oluşturma formunu açmalıdır
6. WHEN Casino_Kullanıcısı takvimde mevcut bir rezervasyona sağ tıkladığında, THE Casino_Rezervasyon_Modülü SHALL Değişiklik_Talebi, İptal_Talebi ve Ek_Konsept_Talebi seçeneklerini içeren bir bağlam menüsü göstermelidir
7. THE Takvim_Görünümü SHALL kabana bazında ve kabana sınıfı bazında filtreleme seçeneği sağlamalıdır
8. THE Takvim_Görünümü SHALL profesyonel, modern ve şık bir tasarıma sahip olmalıdır
9. THE Takvim_Görünümü SHALL kabanaları satır olarak, tarihleri sütun olarak gösteren bir kaynak zaman çizelgesi (resource timeline) formatında görüntüleme seçeneği sağlamalıdır

---

### Gereksinim 10: Casino Rezervasyon Talep Oluşturma

**Kullanıcı Hikayesi:** Bir casino kullanıcısı olarak, misafirler ve VIP'ler için müsait bir kabana seçerek rezervasyon talebi oluşturmak istiyorum, böylece kabana ayırtma sürecini başlatabileyim.

#### Kabul Kriterleri

1. WHEN Casino_Kullanıcısı müsait bir kabana seçtiğinde, THE Casino_Rezervasyon_Modülü SHALL misafir adı, başlangıç tarihi, bitiş tarihi ve özel notlar alanlarını içeren bir talep formu göstermelidir
2. WHEN Casino_Kullanıcısı talep formunu doldurarak gönderdiğinde, THE Casino_Rezervasyon_Modülü SHALL Rezervasyon_Talebi durumunu "onay bekliyor" olarak kaydetmelidir
3. WHEN Casino_Kullanıcısı talep formunu gönderdiğinde, THE Sistem SHALL Admin_Modülüne bildirim göndererek yeni talebi iletmelidir
4. IF Casino_Kullanıcısı seçilen tarih aralığında zaten rezerve edilmiş bir kabana için talep oluşturursa, THEN THE Casino_Rezervasyon_Modülü SHALL "Seçilen tarih aralığında bu kabana müsait değildir" uyarısı göstermelidir
5. IF Casino_Kullanıcısı başlangıç tarihini bitiş tarihinden sonraya ayarlarsa, THEN THE Casino_Rezervasyon_Modülü SHALL "Başlangıç tarihi bitiş tarihinden önce olmalıdır" hata mesajı göstermelidir
6. IF Casino_Kullanıcısı geçmiş bir tarih seçerse, THEN THE Casino_Rezervasyon_Modülü SHALL "Geçmiş tarihler için talep oluşturulamaz" hata mesajı göstermelidir

---

### Gereksinim 11: Casino Değişiklik, İptal ve Ek Konsept Talepleri

**Kullanıcı Hikayesi:** Bir casino kullanıcısı olarak, mevcut rezervasyonlar üzerinde değişiklik, iptal veya ek konsept talepleri göndermek istiyorum, böylece misafir ihtiyaçlarına göre rezervasyonu güncelleyebilirim.

#### Kabul Kriterleri

1. WHEN Casino_Kullanıcısı mevcut bir rezervasyon için değişiklik talep ettiğinde, THE Casino_Rezervasyon_Modülü SHALL değiştirilmek istenen alanları (tarih, kabana, misafir bilgisi) içeren bir Değişiklik_Talebi formu göstermelidir
2. WHEN Casino_Kullanıcısı Değişiklik_Talebi formunu gönderdiğinde, THE Casino_Rezervasyon_Modülü SHALL talebi "değişiklik onayı bekliyor" durumunda kaydetmelidir
3. WHEN Casino_Kullanıcısı mevcut bir rezervasyonun iptali için talep oluşturduğunda, THE Casino_Rezervasyon_Modülü SHALL iptal nedenini zorunlu alan olarak isteyerek İptal_Talebi kaydetmelidir
4. WHEN Casino_Kullanıcısı mevcut bir rezervasyona ek konsept/ekstra talep ettiğinde, THE Casino_Rezervasyon_Modülü SHALL mevcut konsepte ek olarak seçilebilecek ürün ve hizmetleri listeleyerek Ek_Konsept_Talebi formu göstermelidir
5. WHEN Casino_Kullanıcısı Ek_Konsept_Talebi formunu gönderdiğinde, THE Casino_Rezervasyon_Modülü SHALL talebi "ek konsept onayı bekliyor" durumunda kaydetmelidir
6. THE Casino_Rezervasyon_Modülü SHALL tüm taleplerin (rezervasyon, değişiklik, iptal, ek konsept) durum geçmişini görüntülemelidir
7. WHEN herhangi bir talep durumu değiştiğinde, THE Sistem SHALL Casino_Kullanıcısına bildirim göndererek güncel durumu iletmelidir

---

### Gereksinim 12: Admin Talep Değerlendirme ve Onay İş Akışı

**Kullanıcı Hikayesi:** Bir admin olarak, Casino departmanından gelen tüm talepleri (rezervasyon, değişiklik, iptal, ek konsept) değerlendirmek, fiyatlandırmak ve onaylamak/reddetmek istiyorum, böylece operasyonel kontrolü sağlayabileyim.

#### Kabul Kriterleri

1. THE Admin_Modülü SHALL tüm bekleyen talepleri (Rezervasyon_Talebi, Değişiklik_Talebi, İptal_Talebi, Ek_Konsept_Talebi) tek bir listede görüntülemelidir
2. WHEN Admin bir Rezervasyon_Talebi değerlendirdiğinde, THE Admin_Modülü SHALL talep detaylarını, kabana bilgilerini ve fiyat önerisini göstermelidir
3. WHEN Admin bir talebi onayladığında, THE Sistem SHALL talep durumunu "onaylandı" olarak güncellemeli ve Casino_Kullanıcısına bildirim göndermelidir
4. WHEN Admin bir talebi reddettiğinde, THE Admin_Modülü SHALL ret nedenini zorunlu alan olarak istemelidir
5. WHEN Admin bir talebi reddettiğinde, THE Sistem SHALL talep durumunu "reddedildi" olarak güncellemeli, ret nedenini kaydetmeli ve Casino_Kullanıcısına bildirim göndermelidir
6. WHEN Admin bir Rezervasyon_Talebi için fiyat belirlediğinde, THE Admin_Modülü SHALL Dinamik_Fiyatlandırma kurallarına göre toplam fiyatı hesaplayarak göstermelidir
7. WHEN Admin bir Ek_Konsept_Talebi değerlendirdiğinde, THE Admin_Modülü SHALL konsept dışı ekstra ürün ve hizmetleri fiyatlandırarak ekleme seçeneği sağlamalıdır
8. THE Admin_Modülü SHALL onaylanan, reddedilen ve bekleyen talepleri ayrı ayrı filtreleyerek görüntülemelidir
9. WHEN Admin bir talebi onayladığında, THE Sistem SHALL F&B_Kullanıcısına bildirim göndererek onaylanan rezervasyonu iletmelidir

---

### Gereksinim 13: Admin Kuşbakışı Gözetim

**Kullanıcı Hikayesi:** Bir admin olarak, tüm modüllerdeki aktiviteleri kuşbakışı görmek ve operasyonel kararları veriye dayalı olarak vermek istiyorum, böylece sistemin genel durumunu her an takip edebilirim.

#### Kabul Kriterleri

1. THE Admin_Modülü SHALL tüm modüllerdeki aktiviteleri kuşbakışı (bird's eye view) olarak tek bir dashboard üzerinde görüntülemelidir
2. THE Admin_Modülü SHALL kabana doluluk oranları, talep istatistikleri ve gelir analizlerini dashboard üzerinde göstermelidir
3. THE Admin_Modülü SHALL tüm rezervasyon taleplerini, onay/red durumlarını ve fiyatlandırma geçmişini raporlayabilmelidir
4. WHEN Admin bir operasyonel rapor talep ettiğinde, THE Admin_Modülü SHALL raporu tarih aralığı, durum ve departman bazında filtreleme seçenekleriyle sunmalıdır
5. THE Admin_Modülü SHALL F&B_Rezervasyon_Modülü tarafındaki konsept dışı ekstra ekleme aktivitelerini izleyebilmelidir
6. THE Admin_Modülü SHALL Casino_Rezervasyon_Modülü tarafındaki talep oluşturma aktivitelerini izleyebilmelidir

---

### Gereksinim 14: F&B Rezervasyon Görüntüleme ve Hizmet Yürütme

**Kullanıcı Hikayesi:** Bir F&B kullanıcısı olarak, Casino departmanından gelen talepleri ve onaylanan rezervasyonları görüntülemek, konsept dışı ekstra ürün ve hizmetler eklemek istiyorum, böylece kabana hizmet sürecini yönetebilir ve misafir deneyimini zenginleştirebilirim.

#### Kabul Kriterleri

1. THE F&B_Rezervasyon_Modülü SHALL Casino departmanından gelen tüm Rezervasyon_Talebi kayıtlarını görüntülemelidir
2. THE F&B_Rezervasyon_Modülü SHALL her rezervasyonun güncel durumunu (onay bekliyor, onaylandı, reddedildi, iptal edildi) göstermelidir
3. THE F&B_Rezervasyon_Modülü SHALL onaylanan rezervasyonların konsept detaylarını, ürün listelerini ve ek konseptleri görüntülemelidir
4. WHEN F&B_Kullanıcısı onaylanan bir rezervasyona Konsept_Dışı_Ekstra eklemek istediğinde, THE F&B_Rezervasyon_Modülü SHALL kayıtlı ürünler listesinden seçim yapılabilen bir ekstra ekleme formu göstermelidir
5. WHEN F&B_Kullanıcısı Konsept_Dışı_Ekstra eklediğinde, THE F&B_Rezervasyon_Modülü SHALL eklenen ekstraları rezervasyon detayına kaydetmeli ve fiyat bilgisini göstermelidir
6. THE F&B_Rezervasyon_Modülü SHALL talep onaylama, reddetme veya yeni talep oluşturma işlevlerini devre dışı bırakmalıdır
7. THE F&B_Rezervasyon_Modülü SHALL rezervasyonları tarih, kabana ve durum bazında filtreleme seçeneği sağlamalıdır
8. THE F&B_Rezervasyon_Modülü SHALL Değişiklik_Talebi, İptal_Talebi ve Ek_Konsept_Talebi kayıtlarını salt okunur olarak görüntülemelidir
9. WHEN bir rezervasyon durumu değiştiğinde, THE F&B_Rezervasyon_Modülü SHALL güncellenen durumu gerçek zamanlı olarak yansıtmalıdır

---

### Gereksinim 15: Raporlama ve Sunum Modülü

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, sistem verilerinden detaylı raporlar ve otomatik sunumlar oluşturmak istiyorum, böylece otel yönetimine kabana sayıları, konseptler, içerikler, maliyetler ve satış fiyatları hakkında profesyonel bir şekilde bilgi sunabileyim.

#### Kabul Kriterleri

1. THE Raporlama_Sunum_Modülü SHALL kabana sayıları, konseptler, konsept içerikleri, maliyetler ve satış fiyatları bazında detaylı raporlar oluşturabilmelidir
2. WHEN Sistem_Yöneticisi bir rapor talep ettiğinde, THE Raporlama_Sunum_Modülü SHALL raporu filtreleme seçenekleriyle (tarih aralığı, kabana sınıfı, konsept) birlikte sunmalıdır
3. THE Sunum_Motoru SHALL sistem verilerinden otomatik olarak otel yönetimine sunulabilecek formatta sunum oluşturabilmelidir
4. WHEN Sistem_Yöneticisi sunum oluşturma işlemini başlattığında, THE Sunum_Motoru SHALL kabana yerleşimi, sınıf bilgileri, konseptler, fiyatlandırma ve görsel materyalleri içeren bir sunum hazırlamalıdır
5. THE Raporlama_Sunum_Modülü SHALL raporları PDF ve Excel formatlarında dışa aktarma seçeneği sağlamalıdır
6. THE Raporlama_Sunum_Modülü SHALL kabana doluluk oranları, talep istatistikleri, gelir analizleri ve maliyet karşılaştırma raporları sunabilmelidir
7. IF rapor oluşturma sırasında veri eksikliği tespit edilirse, THEN THE Raporlama_Sunum_Modülü SHALL eksik veri alanlarını belirterek "Eksik veri alanları: [alan listesi]" uyarısı göstermelidir

---

### Gereksinim 16: Logo ve Tema Yönetimi

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, sistemin görsel kimliğinin logo dosyasından türetilen renk temasıyla uyumlu olmasını istiyorum, böylece tüm modüllerde tutarlı ve premium bir görsel deneyim sağlanabilsin.

#### Kabul Kriterleri

1. THE Sistem SHALL genel renk temasını `logo.png` dosyasından türetilen renk paletine göre uygulamalıdır
2. THE Sistem SHALL tüm modüllerde (Sistem_Yöneticisi_Modülü, Admin_Modülü, Casino_Rezervasyon_Modülü, F&B_Rezervasyon_Modülü, Raporlama_Sunum_Modülü) tutarlı renk teması kullanmalıdır
3. THE Sistem SHALL premium, lüks tatil köyü estetiğine uygun bir görsel tasarım dili uygulamalıdır
4. THE Sistem SHALL `logo.png` dosyasını tüm modüllerin üst navigasyon çubuğunda görüntülemelidir
5. IF `logo.png` dosyası yüklenemezse, THEN THE Sistem SHALL varsayılan bir renk teması ve metin tabanlı logo kullanmalıdır

---

### Gereksinim 17: Bildirim Sistemi

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, talep durumu değişikliklerinden anında haberdar olmak istiyorum, böylece gerekli aksiyonları zamanında alabileyim.

#### Kabul Kriterleri

1. WHEN Casino_Kullanıcısı yeni bir talep oluşturduğunda, THE Sistem SHALL Admin_Modülüne anlık bildirim göndermelidir
2. WHEN Admin bir talebi onayladığında, THE Sistem SHALL Casino_Kullanıcısına ve F&B_Kullanıcısına bildirim göndermelidir
3. WHEN Admin bir talebi reddettiğinde, THE Sistem SHALL Casino_Kullanıcısına ret nedeniyle birlikte bildirim göndermelidir
4. WHEN F&B_Kullanıcısı bir rezervasyona Konsept_Dışı_Ekstra eklediğinde, THE Sistem SHALL Admin_Modülüne bildirim göndermelidir
5. THE Sistem SHALL tüm bildirimleri ilgili kullanıcının bildirim panelinde listeleyerek okundu/okunmadı durumunu takip etmelidir

---

### Gereksinim 18: Veri Bütünlüğü ve Güvenlik

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, tüm verilerin tutarlı ve güvenli olmasını istiyorum, böylece sistem güvenilir şekilde çalışabilsin.

#### Kabul Kriterleri

1. THE Sistem SHALL tüm kullanıcı şifrelerini hash algoritması ile şifreleyerek saklamalıdır
2. THE Sistem SHALL her veri değişikliğini (oluşturma, güncelleme, silme) zaman damgası ve kullanıcı bilgisiyle kaydetmelidir
3. IF bir silme işlemi referans bütünlüğünü bozacaksa, THEN THE Sistem SHALL silme işlemini engellemeli ve ilişkili kayıtları belirten bir uyarı göstermelidir
4. THE Sistem SHALL eşzamanlı veri erişiminde tutarlılığı sağlamak için uygun kilitleme mekanizması uygulamalıdır
5. THE Sistem SHALL oturum yönetimini güvenli token tabanlı kimlik doğrulama ile sağlamalıdır
6. WHEN bir kullanıcı oturumu belirli bir süre boyunca aktif olmadığında, THE Sistem SHALL oturumu otomatik olarak sonlandırmalıdır
