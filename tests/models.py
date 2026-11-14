from django.db import models

from bd_editor.fields import RichTextField


class Article(models.Model):
    title = models.CharField(max_length=120, blank=True)
    body = RichTextField()

    class Meta:
        app_label = "tests"
