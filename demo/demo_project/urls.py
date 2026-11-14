from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("articles/<str:app_label>/<int:pk>/", views.article_detail, name="article-detail"),
    path("admin/", admin.site.urls),
    path("bd-editor/", include("bd_editor.urls")),
    path("i18n/", include("django.conf.urls.i18n")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
