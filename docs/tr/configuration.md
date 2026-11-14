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

`toolbar`, boolean değerlerden oluşan bir sözlüktür:

| Anahtar | Varsayılan | Açıklama |
| --- | --- | --- |
| `heading` | `true` | Paragraf ve 1-6 başlık düzeyi seçimi |
| `bold` | `true` | Kalın |
| `italic` | `true` | İtalik |
| `underline` | `false` | Altı çizili |
| `strike` | `true` | Üstü çizili |
| `bullet_list` | `true` | Madde işaretli liste |
| `ordered_list` | `true` | Numaralı liste |
| `blockquote` | `true` | Alıntı |
| `code_block` | `true` | Kaçışlanmış kod bloğu |
| `link` | `true` | Güvenli bağlantı aracı |
| `image` | `false` | Görsel yükleme; Pillow ve yüklemeler etkin olmalı |
| `embed` | `true` | Etkin sağlayıcılardan video gömme |
| `source` | `true` | HTML kaynak düzenleme modu |
| `undo` | `true` | Geri al |
| `redo` | `true` | Yinele |

Araç çubuğunun görünürlüğü yalnızca kullanıcı arayüzü tercihidir, güvenlik
sınırı değildir. Saklanan HTML'yi sunucu tarafındaki izin listesi belirler.

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
- `quality` (`85`): JPEG/WEBP kalite değeri, 1-100 arası.
- `storage_alias` (`"default"`): Django `STORAGES` ayarındaki anahtar.

Paket Django Storage API'sini kullanır. ImageKit ile uyumlu storage
backend'leri `STORAGES` üzerinden seçilebilir; BD-Editor belirli bir bulut
hizmetine bağımlı değildir.

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
