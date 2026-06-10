"""
CLI : python -m merge_pkg backup_a.jwlibrary backup_b.jwlibrary [output.jwlibrary]

Options :
  --notes-source {both,a,b}            Sources de notes à inclure (défaut: both)
  --notes-conflict {concat,keep_newest,keep_a,keep_b}
                                        Stratégie de conflit notes (défaut: concat)
  --highlights-source {both,a,b}       Sources de surlignages (défaut: both)
  --highlights-conflict {keep_with_note,keep_a,keep_b}
                                        Stratégie de conflit surlignages (défaut: keep_with_note)
  --no-bookmarks                        Exclure les signets
  --no-input-fields                     Exclure les champs de saisie
  --no-playlists                        Exclure les playlists
  --separator SEP                       Séparateur texte pour les concaténations
  --quiet                               Pas de sortie de progression
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

from . import run, MergeOptions, NoteOptions, HighlightOptions, AnnotationOptions, MediaOptions


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m merge_pkg",
        description="Fusionne deux sauvegardes JW Library sans perte de données.",
    )
    p.add_argument("backup_a", help="Première sauvegarde .jwlibrary")
    p.add_argument("backup_b", help="Deuxième sauvegarde .jwlibrary")
    p.add_argument("output",   nargs="?", help="Fichier de sortie (défaut: merged.jwlibrary)")

    p.add_argument("--notes-source",     choices=["both","a","b"], default="both")
    p.add_argument("--notes-conflict",   choices=["concat","keep_newest","keep_a","keep_b"], default="concat")
    p.add_argument("--highlights-source", choices=["both","a","b"], default="both")
    p.add_argument("--highlights-conflict", choices=["keep_with_note","keep_a","keep_b"], default="keep_with_note")
    p.add_argument("--no-bookmarks",     action="store_true")
    p.add_argument("--no-input-fields",  action="store_true")
    p.add_argument("--no-playlists",     action="store_true")
    p.add_argument("--separator",        default="\n\n— — —\n\n")
    p.add_argument("--quiet", "-q",      action="store_true")
    return p


def main() -> None:
    args = _build_parser().parse_args()

    output = args.output
    if not output:
        stem = Path(args.backup_a).stem
        output = f"{stem}_merged.jwlibrary"

    options = MergeOptions(
        notes=NoteOptions(
            sources=args.notes_source,
            conflict_strategy=args.notes_conflict,
        ),
        highlights=HighlightOptions(
            sources=args.highlights_source,
            conflict_strategy=args.highlights_conflict,
        ),
        annotations=AnnotationOptions(
            include_bookmarks=not args.no_bookmarks,
            include_input_fields=not args.no_input_fields,
        ),
        media=MediaOptions(
            include_playlists=not args.no_playlists,
        ),
        text_separator=args.separator,
    )

    def _progress(msg: str) -> None:
        if not args.quiet:
            print(f"  {msg}", flush=True)

    if not args.quiet:
        print(f"Fusion de :\n  A: {args.backup_a}\n  B: {args.backup_b}\n→ {output}\n")

    try:
        stats = run(args.backup_a, args.backup_b, output, options=options, progress=_progress)
    except Exception as e:
        print(f"\nErreur : {e}", file=sys.stderr)
        sys.exit(1)

    if not args.quiet:
        print(f"\n{stats}")


if __name__ == "__main__":
    main()
