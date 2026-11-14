from django.urls import path

from .views import upload_image

app_name = "bd_editor"

urlpatterns = [path("upload/", upload_image, name="upload")]
