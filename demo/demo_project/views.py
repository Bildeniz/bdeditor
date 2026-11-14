from pprint import pformat

from blog_a.models import Article as BlogAArticle
from blog_b.models import Article as BlogBArticle
from django.conf import settings
from django.http import Http404
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.utils.text import Truncator
from django.utils.translation import gettext as _
from django.utils.translation import ngettext

from bd_editor.sanitizer import clean_text

_ARTICLE_MODELS = {
    "blog_a": BlogAArticle,
    "blog_b": BlogBArticle,
}


def _article_entries():
    entries = []
    for app_label, model in _ARTICLE_MODELS.items():
        for article in model.objects.all()[:100]:
            excerpt = clean_text(article.body, app_label=app_label)
            entries.append(
                {
                    "article": article,
                    "app_label": app_label,
                    "app_name": _("Blog A") if app_label == "blog_a" else _("Blog B"),
                    "excerpt": Truncator(excerpt).chars(220),
                    "url": reverse(
                        "article-detail",
                        kwargs={"app_label": app_label, "pk": article.pk},
                    ),
                }
            )
    return sorted(
        entries,
        key=lambda entry: entry["article"].created_at,
        reverse=True,
    )


def _configuration_sections():
    editor_settings = settings.BD_EDITOR
    global_code = "BD_EDITOR = " + pformat(editor_settings, width=76, sort_dicts=False)
    sections = [
        {
            "title": _("Shared editor defaults"),
            "description": _(
                "The full toolbar profile is the starting point for both apps. "
                "Text and background color palettes are available. Image uploads "
                "use Django storage, accept JPEG, PNG, and WebP, and allow editors "
                "to choose output format and quality."
            ),
            "path": "demo_project/settings.py",
            "code": global_code,
        }
    ]

    explanations = {
        "blog_a": _(
            "Blog A keeps the heading selector and turns underline off. "
            "All other buttons inherit the shared profile."
        ),
        "blog_b": _(
            "Blog B hides the heading selector and turns underline on. "
            "All other buttons inherit the shared profile."
        ),
    }
    for app_label, options in editor_settings.get("apps", {}).items():
        sections.append(
            {
                "title": _("Blog A") if app_label == "blog_a" else _("Blog B"),
                "description": explanations.get(app_label, ""),
                "path": f"BD_EDITOR['apps']['{app_label}']",
                "code": pformat(options, width=76, sort_dicts=False),
            }
        )
    return sections


def home(request):
    articles = _article_entries()
    article_count = len(articles)
    article_count_label = ngettext(
        "%(article_count)s article",
        "%(article_count)s articles",
        article_count,
    ) % {"article_count": article_count}
    return render(
        request,
        "demo/home.html",
        {
            "articles": articles,
            "article_count_label": article_count_label,
            "configuration_sections": _configuration_sections(),
        },
    )


def article_detail(request, app_label, pk):
    model = _ARTICLE_MODELS.get(app_label)
    if model is None:
        raise Http404
    article = get_object_or_404(model, pk=pk)
    return render(
        request,
        "demo/article_detail.html",
        {"article": article, "app_label": app_label},
    )
