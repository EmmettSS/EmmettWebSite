from django.core.management.base import BaseCommand

from apps.assistant.indexer import corpus_stats, sync_corpus


class Command(BaseCommand):
    help = "Re-chunk the assistant corpus and embed only changed content (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--no-embed", action="store_true", help="chunk only, skip provider calls")

    def handle(self, *args, **options):
        stats = sync_corpus(embed=not options["no_embed"])
        self.stdout.write(str(stats))
        self.stdout.write(str(corpus_stats()))
