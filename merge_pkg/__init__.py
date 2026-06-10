"""
merge_pkg — fusion de sauvegardes JW Library.

Usage minimal :
    from merge_pkg import run
    stats = run("backup_a.jwlibrary", "backup_b.jwlibrary", "merged.jwlibrary")
    print(stats)

Usage avancé (fusion sélective) :
    from merge_pkg import run, MergeOptions, NoteOptions
    opts = MergeOptions(
        notes=NoteOptions(sources="a", conflict_strategy="keep_newest"),
    )
    stats = run("a.jwlibrary", "b.jwlibrary", "out.jwlibrary", options=opts)
"""
from .merger import run, MergeStats
from .options import MergeOptions, NoteOptions, HighlightOptions, AnnotationOptions, MediaOptions

__all__ = [
    "run",
    "MergeStats",
    "MergeOptions",
    "NoteOptions",
    "HighlightOptions",
    "AnnotationOptions",
    "MediaOptions",
]
