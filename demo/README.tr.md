# BD-Editor demo projesi

Demo, araç çubukları farklı yapılandırılmış iki Django uygulaması içerir:

- `blog_a`: başlık seçimi açık, altı çizili biçimlendirme kapalıdır.
- `blog_b`: başlık seçimi kapalı, altı çizili biçimlendirme açıktır.

Depo kökünden paketi ve isteğe bağlı görsel desteğini kurun:

```shell
pip install -e ".[images]"
cd demo
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

`http://127.0.0.1:8000/` adresinde iki uygulamadaki yazıları birlikte
görüntüleyin ve çalışan `BD_EDITOR` ayarlarını inceleyin. Dil seçicisi demo
sayfasını ve editörü İngilizce ile Türkçe arasında değiştirir. Gösterilen
yapılandırma parçaları `demo_project/settings.py` dosyasındaki gerçek global
ve uygulama bazlı ayarlardan üretilir.

`http://127.0.0.1:8000/admin/` adresinde oturum açıp iki uygulamadan birinde
yazı oluşturabilirsiniz. Görsel yükleme ucu `/bd-editor/` altında bulunur ve
aktif Django personeliyle sınırlandırılmıştır. SQLite ve yerel medya depolaması
kullanan bu demo yalnızca geliştirme içindir; üretim dağıtım şablonu değildir.

Varsayılan `DJANGO_DEBUG=1` ayarında demo, `runserver` kod değişikliklerinden
sonra yeniden başladığında oturumların geçerliliğini korumak için
yoksayılan `demo/.secret_key` dosyasında sabit, geliştirmeye özel bir anahtar
oluşturur. Üretimde gizli bir `DJANGO_SECRET_KEY` belirleyip `DJANGO_DEBUG=0`
kullanın; açık bir anahtar olmadan üretim ayarları başlatılmaz.

Önceki rastgele anahtarla imzalanmış mevcut oturumlar bu değişiklikten sonra
bir kez yeniden giriş gerektirebilir. Yerel oturumların korunması için
`demo/.secret_key` dosyasını sonraki çalıştırmalarda saklayın; silinmesi
mevcut demo oturumlarını geçersiz kılar.
