# API başvurusu

## `RichTextField`

```python
from bd_editor.fields import RichTextField

class Article(models.Model):
    body = RichTextField()
```

`RichTextField`, `TextField` alt sınıfıdır. Değerleri alan dönüşümünde, model
kaydında, veritabanı hazırlığında (ORM güncelleme/toplu işlemleri dahil) ve
Django ORM ile okunurken temizler. `ModelForm` ve Django admin, modelin
`app_label` değerine göre editör aracını otomatik kullanır.

## `RichTextFormField` ve `BDRichTextWidget`

Standart formlarda `bd_editor.forms` içindeki `RichTextFormField` kullanılabilir.
Widget `bd_editor.widgets` içindeki `BDRichTextWidget` sınıfıdır. JavaScript
kapalıysa normal textarea görünür; tüm statik dosyalar paketle birlikte gelir.

İsteğe bağlı görsel yükleme ucu için kök URL yapılandırmasına
`bd_editor.urls` eklenmelidir. Uç CSRF korumalıdır; personel kullanıcısının
ilgili model için ekleme/değiştirme izni bulunmalıdır. Bağımsız formlar
görsel yükleme etkinse widget'a model etiketini sağlamalıdır.

## Araç çubuğu profilleri ve tablolar

Global veya app bazında `toolbar_preset` için `small`, `standard` veya `full`
seçin. Ardından boolean `toolbar` ayarlarıyla düğmeleri özelleştirin.
`standard` ve `full` profillerinde tablo ekleme bulunur. İmleç tablodayken
bağlamsal araçlarla satır/sütun ekleyip silebilir, başlık satırını
değiştirebilir veya tabloyu silebilirsiniz. Aynı araç çubuğundan geçerli
hücreye ya da satıra özel arka plan rengi uygulayabilir, rengi temizleyebilir
ve iki renkle dönüşümlü satır (zebra) efekti verebilirsiniz. Renkler hücre
düzeyindeki `background-color` stilleri olarak saklanır ve temizleyici izin
listesine tabidir.

## Metin hizalama ve görsel düzenleme

`text_align` araç çubuğu seçeneği geçerli paragrafı veya başlığı sola/ortaya/
sağa hizalar. `image_editing` etkinse görsel seçildiğinde görüntülenen boyutu,
alternatif metni, başlığı ve yerleşimi değiştiren bir pencere açılır. Görsel
ayrı satırda sola/ortaya/sağa alınabilir, metin içine konabilir veya sola/sağa
kaydırılarak yakınındaki metnin etrafında akması sağlanabilir. Boyut ayarı
dosyayı yeniden ölçeklemez veya kodlamaz; yalnızca HTML görüntüleme
boyutlarını değiştirir. Temizleyici genişlik/yüksekliği sınırlar ve görsel
stillerini CSS izin listesine göre temizler. Seçili görsel etrafında sürükleme
tutamakları ve canlı boyut/oran bilgisi gösterilir. Satır içi görsellerin
dikey hizalaması üst/orta/alt olarak ayrıca seçilebilir; float yerleşimlerde
metin görselin üstünden başlar.

## Temizleme yardımcıları

```python
from bd_editor.sanitizer import clean_text, only_html, sanitize_html

safe_fragment = sanitize_html(untrusted_html, app_label="blog")
style_free_fragment = only_html(untrusted_html, app_label="blog")
plain_text = clean_text(untrusted_html, app_label="blog")
```

- `sanitize_html(value, *, app_label=None)`: izin verilen HTML parçası döndürür.
- `only_html(value, *, app_label=None)`: izin verilen HTML'yi satır içi stiller
  olmadan döndürür.
- `clean_text(value, *, app_label=None)`: biçimlendirmeyi kaldırıp
  normalleştirilmiş düz metin döndürür.

Yalnızca `str` ve `None` kabul edilir; diğer türlerde `TypeError` oluşur.
Şablon çıktısı için `bd_richtext` veya `bd_only_html` kullanın; içerik güvenli
olduktan sonra `safe` olarak işaretlenir. Güvenilmeyen değere `safe` filtresi
uygulamayın.

## Şablon filtreleri

```django
{% load bd_editor_tags %}

{{ value|bd_richtext:"blog" }}
{{ value|bd_only_html:"blog" }}
{{ value|bd_clean_text:"blog" }}
```

App bazlı temizleyici kullanılıyorsa filtreye modelin `app_label` değeri
aktarılabilir. Argüman verilmezse global ayarlar kullanılır.

## Embed URL yardımcısı

`bd_editor.embeds.canonicalize_embed_url(value, providers)`, etkin bir YouTube
veya Vimeo adresi için kanonik HTTPS URL'si; geçersiz adres için `None`
döndürür. Iframe kaynağını temizlerken bu yardımcı kullanılır; diğer HTML
içeriğinin sunucu tarafında temizlenmesinin yerine geçmez.
