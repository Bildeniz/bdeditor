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

```python
# settings.py
BD_EDITOR = {
    "defaults": {
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
        "toolbar": {"image": True, "embed": True},
        "uploads": {
            "enabled": True,
            "max_file_size": 5 * 1024 * 1024,
            "max_image_pixels": 20_000_000,
            "output_format": "WEBP",
            "allowed_formats": ["JPEG", "PNG", "WEBP"],
            "quality": 85,
            "storage_alias": "default",
        },
        "embeds": {"providers": ["youtube", "vimeo"]},
    },
}
```

Yükleme ucu CSRF korumalıdır; aktif personel kullanıcısının ilgili model için
ekleme veya değiştirme izni de olmalıdır. Dosya Pillow ile gerçek görsel içeriğine göre
çözümlenir, bayt/piksel sınırları denetlenir, yeniden kodlanır ve Django
Storage'a kaydedilir. `output_format`, `keep`, `JPEG`, `PNG` veya `WEBP`
olabilir. Video dosyaları reddedilir; yalnızca etkin video sağlayıcılarına ait
URL'ler gömülebilir.

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

`/admin/` adresini açıp iki demo uygulamasından birinde yazı oluşturun.
[Yapılandırma](configuration.md), [API](api.md) ve
[güvenlik](security.md) belgelerine de bakın.
