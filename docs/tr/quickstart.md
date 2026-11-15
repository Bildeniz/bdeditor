# Hızlı başlangıç

## Gereksinimler ve kurulum

BD-Editor Python 3.10+ ve Django 5.2 LTS ile 6.2 öncesindeki uyumlu Django
6.x sürümlerini destekler:

```shell
pip install bd-editor
```

Görsel yükleme için isteğe bağlı Pillow eklentisini kurun:

```shell
pip install "bd-editor[images]"
```

## Django projesine ekleme

```python
# settings.py
INSTALLED_APPS = [
    # ...
    "bd_editor",
]
```

Yükleme URL'sini kök URL yapılandırmasına ekleyin:

```python
# urls.py
from django.urls import include, path

urlpatterns = [
    # ...
    path("bd-editor/", include("bd_editor.urls")),
]
```

Modelinizde `RichTextField` kullanın:

```python
# blog/models.py
from django.db import models
from bd_editor.fields import RichTextField


class Article(models.Model):
    title = models.CharField(max_length=200)
    body = RichTextField()
```

Django admin ve `ModelForm`, alan için editör arayüzünü otomatik kullanır.
Ardından normal Django migration komutlarını çalıştırın:

```shell
python manage.py makemigrations
python manage.py migrate
```

## İçeriği güvenli görüntüleme

Şablonda `safe` yerine sağlanan filtreleri kullanın:

```django
{% load bd_editor_tags %}

{{ article.body|bd_richtext }}
{{ article.body|bd_only_html }}
{{ article.body|bd_clean_text }}
```

`bd_richtext` izin verilen HTML'yi temizleyip görüntüler. `bd_only_html` ayrıca
satır içi stilleri kaldırır. `bd_clean_text` düz metin döndürür ve Django'nun
normal HTML kaçışını korur. Python yardımcıları `bd_editor.sanitizer`
modülündedir.

## Araç çubuğunu yapılandırma

Hazır profiller için `toolbar_preset` değerini (`small`, `standard`, `full`)
seçin; sonra yalnızca değiştirmek istediğiniz düğmeleri yazın:

```python
# settings.py
BD_EDITOR = {
    "defaults": {
        "toolbar_preset": "standard",
        "toolbar": {
            "heading": True,
            "bold": True,
            "italic": True,
            "underline": False,
            "image": False,
        },
    },
    "apps": {
        "blog": {"toolbar": {"heading": True, "underline": False}},
        "pages": {"toolbar": {"heading": False, "underline": True}},
    },
}
```

`apps` anahtarları Python modül yolu değil, Django `app_label` değerleridir.
Geçersiz ya da bilinmeyen güvenlik ayarları uygulama başlatılırken açık hata
üretir.

## Görsel yükleme ve video gömme

```python
BD_EDITOR = {
    "defaults": {
        "toolbar": {
            "image": True,
            "image_editing": True,
            "text_align": True,
            "embed": True,
        },
        "uploads": {
            "enabled": True,
            "max_file_size": 5 * 1024 * 1024,
            "max_image_pixels": 20_000_000,
            "output_format": "WEBP",
            "allowed_formats": ["JPEG", "PNG", "WEBP"],
            "allow_format_selection": True,
            "allow_quality_selection": True,
            "quality": 85,
            "storage_alias": "default",
        },
        "embeds": {"providers": ["youtube", "vimeo"]},
        "images": {
            "max_width": 1600,
            "max_height": 1200,
            "preserve_aspect_ratio": True,
            "allowed_layouts": [
                "block-left",
                "block-center",
                "block-right",
                "inline",
                "float-left",
                "float-right",
            ],
            "default_layout": "block-left",
            "inline_vertical_alignments": ["top", "middle", "bottom"],
            "default_inline_vertical_alignment": "top",
        },
    },
}
```

Yükleme ucu CSRF korumalıdır; aktif personel kullanıcısının ilgili model için
ekleme veya değiştirme izni de olmalıdır. Dosya Pillow ile gerçek görsel içeriğine göre
çözümlenir, bayt/piksel sınırları denetlenir, yeniden kodlanır ve Django
Storage'a kaydedilir. `output_format`, `keep`, `JPEG`, `PNG` veya `WEBP`
olabilir. Video dosyaları reddedilir; yalnızca etkin video sağlayıcılarına ait
URL'ler gömülebilir.
Görsel penceresinde izinli çıktı biçimini, boyut ve piksel ölçülerine göre
önerilen kalite seçeneğini ve alternatif metni belirleyebilirsiniz. PNG
kayıpsızdır. `standard` araç çubuğu metni hizalar ve seçili bir görselin
görüntüleme boyutunu, yerleşimini, alternatif metnini ya da başlığını
değiştirir. Görseller metin içine alınabilir veya sola/sağa kaydırılarak
yakındaki metnin etraflarında akması sağlanabilir. Seçili görselde mavi
boyutlandırma tutamakları ve canlı boyut/oran bilgisi görünür; satır içi
görseller üstten, ortadan veya alttan hizalanabilir.

`standard` profili HTML tabloları da ekler. Tablo içinde satır ve sütun ekleyip
kaldırmak için bağlamsal tablo araçlarını kullanın.

## İsteğe bağlı tarayıcı taslağı

Taslak kaydı varsayılan olarak kapalıdır. Yarım kalan içeriği yalnızca bu
tarayıcıda saklamak için:

```python
BD_EDITOR = {
    "defaults": {
        "drafts": {"enabled": True, "ttl_days": 7},
    },
}
```

Taslaklar `localStorage` alanında saklanır, süresi dolar ve başarılı form
kaydından sonra temizlenir. Ortak bilgisayarda veya hassas içerikte
etkinleştirmeden önce [güvenlik notlarını](security.md) okuyun.

## Demo

Depoda app bazlı farklı araç çubuklarını gösteren iki uygulamalı demo bulunur.
Depo kökünden:

```shell
pip install -e ".[images]"
cd demo
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Birleşik yazı listesi ve yerelleştirilmiş ayar açıklamaları için `/` adresini
açın. `/admin/` adresinden demo uygulamalarından birinde yazı oluşturun;
kaydedilen yazılar demo ana sayfasında listelenir.
[Yapılandırma](configuration.md), [API](api.md) ve
[güvenlik](security.md) belgelerine de bakın.
