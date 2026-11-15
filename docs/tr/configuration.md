# Yapılandırma başvurusu

Tüm ayarlar Django `settings.py` içindeki `BD_EDITOR` sözlüğünde tutulur:

```python
BD_EDITOR = {
    "defaults": {
        # Tüm uygulamalar için varsayılanlar.
    },
    "apps": {
        "blog": {
            # app_label="blog" modellerine özel geçersiz kılmalar.
        },
    },
}
```

Birleşim sırası yerleşik varsayılanlar, ardından `defaults`, sonra ilgili
`apps[app_label]` ayarıdır. İç içe sözlükler derin birleştirilir; liste
değerleri önceki listenin yerine geçer. Böylece bir uygulama diğer araç
çubuğu seçeneklerini tekrar yazmadan tek bir düğmeyi değiştirebilir. App
etiketleri kurulu Django uygulamalarına ait olmalıdır.

## Araç çubuğu

`toolbar_preset` değerini global veya uygulama bazında seçin:

```python
BD_EDITOR = {
    "defaults": {"toolbar_preset": "standard"},
    "apps": {
        "blog": {"toolbar_preset": "full"},
        "pages": {"toolbar_preset": "small"},
    },
}
```

- `small`: başlıklar, temel biçimlendirme, listeler, bağlantılar ve geri al/yinele.
- `standard` (varsayılan): metin/arka plan rengi paletlerini, alıntı, kod,
  tablo, metin hizalama, seçili görsel düzenleme, video gömme ve Metin/HTML
  anahtarını ekler.
- `full`: `standard` profiline altı çizili biçimlendirme ve görsel yüklemeyi
  ekler. Yükleme için `images` eklentisi ve `uploads.enabled = True` gerekir.

Profil ilgili ayar katmanı için başlangıç araç çubuğunu belirler; aynı
katmandaki açık `toolbar` seçenekleri sonradan uygulanır. Uygulama profili
uygulamanın başlangıç profilini seçer.

`toolbar`, boolean değerlerden oluşan bir sözlüktür:

| Anahtar | Varsayılan | Açıklama |
| --- | --- | --- |
| `heading` | `true` | Paragraf ve 1-6 başlık düzeyi seçimi |
| `bold` | `true` | Kalın |
| `italic` | `true` | İtalik |
| `text_color` | `true` | Editör paletinden metin rengi seçimi |
| `background_color` | `true` | Seçili metne arka plan rengi uygulama |
| `underline` | `false` | Altı çizili |
| `strike` | `true` | Üstü çizili |
| `bullet_list` | `true` | Madde işaretli liste |
| `ordered_list` | `true` | Numaralı liste |
| `blockquote` | `true` | Alıntı |
| `code_block` | `true` | Kaçışlanmış kod bloğu |
| `link` | `true` | Güvenli bağlantı aracı |
| `image` | `false` | Görsel yükleme; Pillow ve yüklemeler etkin olmalı |
| `image_editing` | `true` | Seçili görselin boyut, yerleşim, alternatif metin ve başlığını düzenleme |
| `embed` | `true` | Etkin sağlayıcılardan video gömme |
| `table` | `true` | HTML tablosu ekleme ve düzenleme |
| `text_align` | `true` | Paragraf ve başlıkları sola, ortaya veya sağa hizalama |
| `source` | `true` | HTML kaynak düzenleme modu |
| `undo` | `true` | Geri al |
| `redo` | `true` | Yinele |

Araç çubuğunun görünürlüğü yalnızca kullanıcı arayüzü tercihidir, güvenlik
sınırı değildir. Saklanan HTML'yi sunucu tarafındaki izin listesi belirler.
Tablo araçları etkinken hücre/satır arka plan rengi ve iki renkli zebra efekti
kullanılabilir. Temizleyici izin listelerini değiştirirken bu renklerin
korunması için `td`/`th` üzerindeki `style` ve `css_properties` içindeki
`background-color` değerlerini tutun.
Metin hizalaması için `sanitizer.css_properties` içinde `text-align` ve izinli
paragraf/başlık etiketlerinde `style` bulunmalıdır. Görsel düzenleme etkinse
`img` için `src`, `alt`, `title`, `style` (boyutlandırma açıksa `width` ve
`height`) özellikleri ve seçilen yerleşimlerin güvenli CSS özellikleri de izin
listesinde kalmalıdır.

## Tarayıcı taslakları

Taslaklar isteğe bağlıdır ve varsayılan olarak kapalıdır:

```python
BD_EDITOR = {
    "defaults": {
        "drafts": {"enabled": True, "ttl_days": 7},
    },
}
```

Etkinleştirildiğinde içerik bu tarayıcının `localStorage` alanına kaydedilir.
Taslak anahtarı admin sayfası, model, kayıt ve alana göre ayrılır; `ttl_days`
(1-90) sonunda silinir ve başarılı form gönderiminden sonra temizlenir.
İçerik BD-Editor sunucusuna ayrıca gönderilmez. Ortak bilgisayarlarda süre
dolana dek saklanabileceğinden, hassas içerikler için bu özelliği dikkatle
etkinleştirin.

## Görsel yükleme ayarları

- `enabled` (`false`): Görsel yükleme ucunu etkinleştirir; `bd-editor[images]`
  kurulmuş olmalıdır.
- `max_file_size` (5 MiB): Görsel dosyasının bayt cinsinden üst sınırı;
  en fazla 100 MiB olabilir.
- `max_image_pixels` (20 milyon): çözümlenen genişlik x yükseklik üst sınırı;
  en fazla 50 milyon olabilir.
- `output_format` (`"keep"`): `keep`, `JPEG`, `PNG` veya `WEBP`.
- `allowed_formats` (`["JPEG", "PNG", "WEBP"]`): kabul edilen girdi ve çıktı
  biçimleri.
- `allow_format_selection` (`true`): editörün izinli biçimler arasından çıktı
  seçmesine izin verir. `output_format` pencerede ilk seçilen biçimdir.
- `allow_quality_selection` (`true`): editörün JPEG/WEBP kalitesini seçmesine
  izin verir.
- `quality` (`85`): varsayılan JPEG/WEBP kalitesi, 1-100 arası.
- `min_quality` (`1`) ve `max_quality` (`100`): editör seçimlerinde izin
  verilen JPEG/WEBP kalite aralığı; sınırlar dahildir. Varsayılan `quality`
  bu aralıkta olmalı ve yükleme ucu sınırları ayrıca uygular.
- `show_size_estimates` (`true`): mevcut kalite seçenekleri için tarayıcıda
  tahmini çıktı boyutlarını gösterir. Tahminler sunucuya gönderilmez ve Pillow
  çıktısından farklı olabilir.
- `warn_missing_alt` (`false`): görselde alternatif metin yoksa engelleyici
  olmayan bir hatırlatma gösterir.
- `storage_alias` (`"default"`): Django `STORAGES` ayarındaki anahtar.

Paket Django Storage API'sini kullanır. ImageKit ile uyumlu storage
backend'leri `STORAGES` üzerinden seçilebilir; BD-Editor belirli bir bulut
hizmetine bağımlı değildir.
Görsel penceresi seçilen görselin boyutuna ve piksel ölçülerine göre kalite
önerir. PNG kayıpsızdır ve JPEG/WEBP kalite kaydırıcısı kullanmaz.
`allow_format_selection` veya `allow_quality_selection` değerini `false`
yaparak seçimi sunucu yapılandırmasına sabitleyebilirsiniz.

Uygulamaya özel kalite sınırları ve isteğe bağlı hatırlatma örneği:

```python
BD_EDITOR = {
    "apps": {
        "blog": {
            "uploads": {
                "quality": 82,
                "min_quality": 60,
                "max_quality": 92,
                "warn_missing_alt": True,
            },
        },
    },
}
```

## Görsel düzenleme ayarları

`images`, yüklenen dosyanın dönüştürülmesinden bağımsız olarak HTML'deki
görüntü boyutunu ve yerleşim seçeneklerini belirler:

- `allow_resize` (`true`): seçili görseller için genişlik/yükseklik alanlarını
  gösterir.
- `max_width` ve `max_height` (her biri `2048`): görüntülenen boyutların piksel
  cinsinden üst sınırı; 1-10.000 aralığında olmalıdır. Temizleyici saklanan
  görsel boyutlarını bu sınırlara indirger.
- `float_max_width_percent` (`50`): metin kaydırmalı görsellerin içerik
  alanına göre en büyük genişlik yüzdesi; 25-75 aralığında tam sayı olmalıdır.
- `preserve_aspect_ratio` (`true`): boyut değiştirirken en-boy oranını ilk
  durumda korur. Yazar görsel penceresinde bu seçeneği değiştirebilir.
- `inline_vertical_alignments` (`["top", "middle", "bottom"]`): satır içi
  görseller için `top`, `middle`, `bottom`, `baseline` değerlerinin tekrarsız
  alt kümesi.
- `default_inline_vertical_alignment` (`"top"`): başlangıç satır içi
  hizalaması; `inline_vertical_alignments` içinde bulunmalıdır.
- `allowed_layouts`: `block-left`, `block-center`, `block-right`, `inline`,
  `float-left`, `float-right` değerlerinin tekrarsız alt kümesi.
- `default_layout` (`"block-left"`): başlangıç yerleşimi; `allowed_layouts`
  içinde bulunmalıdır.

Blok yerleşimleri görseli ayrı satıra alır. `inline`, görseli mevcut metin
satırına koyar; satır yetmediğinde devam eden metin görselin altından sürer.
Paragrafın görselin yanında satır satır akması için `float-left` (metin sağda)
veya `float-right` (metin solda) seçin. Bu yerleşimler görseli varsayılan
olarak içerik genişliğinin yüzde 50'siyle sınırlar; `float_max_width_percent`
bu sınırı değiştirir. Görsel seçiliyken akış ve satır içi hizalama araç
çubuğundan değiştirilebilir. `inline_vertical_alignments`, satır içi yerleşimde
yan metnin görsele göre üst/orta/alt konumunu seçtirir.
Boyut ayarı yüklenen dosyanın piksel verisini değil, HTML'de görüntülenme
boyutunu değiştirir. Bu ayarlar diğer `BD_EDITOR` seçenekleri gibi global ve
uygulama bazında birleştirilir. Seçili görsellerde sekiz sürükleme tutamacı ve
canlı boyut/oran bilgisi görünür. Float yerleşimlerde metin görselin üstünden
başlar.

## Video sağlayıcıları

`embeds.providers`, `youtube`, `vimeo` veya ikisini içerebilir. Varsayılan
`["youtube"]` değeridir. URL'ler tam alan adı eşleşmesiyle denetlenir ve
kanonik HTTPS embed URL'sine çevrilir. Keyfi alan adları, iframe izinleri ve
`srcdoc` yapılandırılabilir değildir.

## Temizleyici ayarları

- `tags`: desteklenen güvenli HTML etiketlerinin yerine geçen liste. Script
  çalıştırabilen etiketler eklenemez.
- `attributes`: etiket başına özellik listeleri. Her değer izinli güvenli
  özellikler alt kümesinden olmalıdır.
- `css_properties`: güvenli satır içi CSS özelliklerinin yerine geçen liste.
- `url_schemes`: `http`, `https`, `mailto`, `tel` alt kümesi.
- `allow_relative_urls` (`true`): göreli bağlantı ve görsel yollarını korur.

```python
BD_EDITOR = {
    "defaults": {
        "sanitizer": {
            "css_properties": ["color", "background-color", "font-size", "text-align"],
            "url_schemes": ["https", "mailto"],
        },
    },
}
```

Renk araç çubuğu düğmeleri etkinse temizleyici izin listesinde `span` etiketi,
bu etiketin `style` özelliği ve ilgili `color` veya `background-color` CSS
özelliği bulunmalıdır. Çelişen ayarlarda yapılandırma doğrulaması hata verir.

Bilinmeyen anahtarlar, güvensiz etiket/özellikler, geçersiz türler ve birbiriyle
çelişen araç çubuğu/yükleme ayarları `ImproperlyConfigured` hatası üretir.

## Yerelleştirme

Varsayılan editör dili İngilizcedir. Arayüz etiketleri
`bd_editor/locale/en.json` ve `bd_editor/locale/tr.json` içindedir.
`BD_EDITOR["defaults"]["locale"]` değerini `"en"` veya `"tr"` yaparak dili
sabit seçebilir; `None` değeri etkin Django dilini izler.

Sunucu mesajlarının Django çeviri katalogları
`bd_editor/locale/<dil>/` altındadır. Çevrilmiş belgeler `docs/en/` ve
`docs/tr/` klasörlerinde tutulur.
