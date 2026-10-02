from datetime import timezone
from xml.etree import ElementTree as ET
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpResponse
from django.utils import timezone as django_timezone
from apps.content.models import CaseStudy, JobOpening, Post

SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NS = "http://www.w3.org/1999/xhtml"
ET.register_namespace("xhtml", XHTML_NS)


def site_base():
    base = settings.PUBLIC_SITE_URL.rstrip("/")
    if not base and not settings.DEBUG:
        raise ImproperlyConfigured(
            "PUBLIC_SITE_URL is required for canonical content feeds"
        )
    return base


def content_sitemap(request):
    base = site_base()
    root = ET.Element("urlset", {"xmlns": SITEMAP_NS, "xmlns:xhtml": XHTML_NS})
    for model, route in (
        (Post, "posts"),
        (CaseStudy, "case-studies"),
        (JobOpening, "jobs"),
    ):
        for item in model.objects.filter(status="published"):
            for locale in ("fa", "en"):
                path = f"/{locale}/{route}/{item.slug}/"
                url = ET.SubElement(root, "url")
                ET.SubElement(url, "loc").text = f"{base}{path}"
                ET.SubElement(url, "lastmod").text = item.updated_at.date().isoformat()
                for alt in ("fa", "en"):
                    ET.SubElement(
                        url,
                        f"{{{XHTML_NS}}}link",
                        {
                            "rel": "alternate",
                            "hreflang": alt,
                            "href": f"{base}/{alt}/{route}/{item.slug}/",
                        },
                    )
    return HttpResponse(
        ET.tostring(root, encoding="utf-8", xml_declaration=True),
        content_type="application/xml; charset=utf-8",
    )


def posts_feed(request):
    base = site_base()
    root = ET.Element("rss", {"version": "2.0"})
    channel = ET.SubElement(root, "channel")
    ET.SubElement(channel, "title").text = "Emmett · امت"
    ET.SubElement(channel, "link").text = base
    ET.SubElement(channel, "description").text = "یادداشت‌های امت"
    ET.SubElement(channel, "lastBuildDate").text = (
        django_timezone.now()
        .astimezone(timezone.utc)
        .strftime("%a, %d %b %Y %H:%M:%S GMT")
    )
    for post in Post.objects.filter(status="published").order_by(
        "-published_at", "-created_at"
    )[:50]:
        link = f"{base}/fa/posts/{post.slug}/"
        item = ET.SubElement(channel, "item")
        ET.SubElement(item, "title").text = post.title_fa
        ET.SubElement(item, "link").text = link
        ET.SubElement(item, "guid").text = link
        ET.SubElement(item, "description").text = post.body_fa[:500]
        pub = (post.published_at or post.updated_at).astimezone(timezone.utc)
        ET.SubElement(item, "pubDate").text = pub.strftime("%a, %d %b %Y %H:%M:%S GMT")
    return HttpResponse(
        ET.tostring(root, encoding="utf-8", xml_declaration=True),
        content_type="application/rss+xml; charset=utf-8",
    )
