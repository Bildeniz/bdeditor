# Güvenlik modeli ve sınırlar

BD-Editor, biçimlendirilmiş içeriğin XSS veya güvensiz dosya yüklemesi
oluşturma olasılığını azaltır. Uygulama yetkilendirmesinin, güvenli şablon
kullanımının, CSP'nin veya veritabanı erişim kontrollerinin yerine geçmez.

## İçerik işleme

Tarayıcı arayüzü Tiptap/ProseMirror'ın yerel paketlenmiş dosyalarını kullanır;
CDN'den JavaScript yüklemez. Tarayıcı denetimleri yalnızca kullanım kolaylığı
sağlar. Python `nh3` temizleyicisi Django formlarında, model alanı hazırlığında,
ORM okumalarında ve şablon görüntülemesinde esas güvenlik sınırıdır.

Temizleyici:

- `script`, `style`, `object`, `embed`, `video`, `audio` ve `source` etiketlerini
  ve içeriklerini kaldırır;
- `onclick`, `onerror` gibi olay özelliklerini siler;
- yalnızca açıkça desteklenen HTML etiket ve özelliklerini korur;
- varsayılan olarak yalnızca `http`, `https`, `mailto` ve `tel` URL şemalarına
  izin verir;
- satır içi stilleri güvenli CSS özellikleri allowlist'iyle sınırlar;
- bağlantılara koruyucu `rel` değerleri ekler, kullanıcı tanımlı `target`
  özelliğini kabul etmez;
- kod bloğu içeriğini çalıştırılabilir HTML olarak yorumlamaz.

Kaynak düzenleyici bir textarea'dır. İçeriği editör belge şemasından geçer ve
Django tarafından yeniden temizlenir. Script örnekleri kod bloğuna metin olarak
eklenmelidir; gerçek `<script>` elementi kaldırılır.

## Video embedleri

Video dosyası yüklenemez. Yerleşik embed aracı yalnızca etkinleştirilmiş
YouTube/Vimeo URL'lerini kabul eder. Sunucu tam host adını ve video
tanımlayıcısını doğrulayıp kanonik HTTPS URL'si üretir. `srcdoc`, keyfi iframe
hostları, kullanıcı tarafından girilen iframe izinleri, olay özellikleri ve
çalıştırılabilir URL şemaları atılır. Iframe sabit izinlerle sandbox
uygulamasından geçer.

Etkin sağlayıcının video oynatıcısı kendi kodunu sitenizle aynı origin'de
olmayan iframe içinde çalıştırabilir. Hiçbir üçüncü taraf içeriğe izin
verilmeyecekse embed özelliğini ve toolbar düğmesini kapatın.

## Görsel yüklemeleri

Görsel ucu giriş yapmış aktif personel kullanıcı, ilgili model için
ekleme/değiştirme yetkisi ve Django CSRF koruması gerektirir. İstek/görsel boyutunu sınırlar, dosyanın gerçek içeriğini Pillow ile
çözümler, biçim ve piksel sayısını doğrular, EXIF yönünü uygular, hedef biçime
yeniden kodlayıp meta verileri kaldırır ve rastgele storage yolu kullanır.
İstemci dosya adına ve MIME beyanına güvenilmez. SVG, video ve diğer raster
olmayan dosyalar reddedilir.

Üretimde web sunucusu ve storage limitlerini de ayarlayın. Kullanıcı
medyalarını mümkünse ayrı bir origin'den sunun, reverse proxy üzerinde istek
boyutu sınırı koyun ve storage erişim yetkilerini ayrıca düzenleyin.

## Veritabanı ve görüntüleme sınırı

`RichTextField`, Django tarafından yönetilen form/alan/ORM yollarında
(`save()`, `QuerySet.update()` ve test edilen toplu alan işlemleri dahil)
temizleme yapar. ORM okumaları da temizlenir. **Doğrudan SQL, veritabanı
konsolu, başka servisler veya alanı atlayan yazımlar kaydetme sırasındaki
temizliği atlar.** Kütüphane bu yolları yakalayamaz.

HTML çıktısında `bd_richtext` veya `bd_only_html` kullanın; filtreler içeriği
temizlemeden güvenli olarak işaretlemez. Temizlenmemiş değerlere `mark_safe`,
Django `safe` filtresi veya eşdeğer bir bypass uygulamayın. Uygun bir
Content Security Policy de etkinleştirilmelidir.

## Yapılandırma güvenlik sınırı

Ayarlar güvenli etiketleri, özellikleri, URL şemalarını, CSS özelliklerini,
toolbar seçeneklerini, yükleme limitlerini, çıktı biçimini ve sağlayıcıları
daraltabilir. Script etiketleri, olay özellikleri, keyfi iframe özellikleri,
çalıştırılabilir URL şemaları, video yüklemesi veya güvensiz CSS açılamaz.
Geçersiz ayarlar `ImproperlyConfigured` hatası verir.

Bu önlemler yaygın yanlış yapılandırma ve içerik risklerini azaltır; her
storage sağlayıcısının, tarayıcı eklentisinin, sonraki şablonun veya uygulamaya
özel entegrasyonun güvenli olduğunu garanti etmez. BD-Editor ve bağımlılıklarını
güncel tutun.
