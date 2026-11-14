from django.db import models

from bd_editor.fields import RichTextField


class Article(models.Model):
    title = models.CharField(max_length=200)
    body = RichTextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
