"""
Orchestrateur principal — point d'entrée public du package.
"""
from __future__ import annotations
import os
import tempfile
from dataclasses import dataclass, field
from typing import Callable

from .options import MergeOptions
from .context import MergeContext
from .packager import (
    open_backup, create_merged_db, copy_media_files,
    write_manifest, package_output, finalize_last_modified,
)
from . import locations, highlights, notes, media, annotations


# ------------------------------------------------------------------ #
# Statistiques                                                         #
# ------------------------------------------------------------------ #

@dataclass
class MergeStats:
    locations_a: int = 0
    locations_b: int = 0
    locations_merged: int = 0

    tags_a: int = 0
    tags_b: int = 0
    tags_merged: int = 0

    marks_a: int = 0
    marks_b: int = 0
    marks_merged: int = 0
    mark_conflicts: int = 0

    notes_a: int = 0
    notes_b: int = 0
    notes_merged: int = 0
    note_conflicts: int = 0

    media_a: int = 0
    media_b: int = 0
    media_merged: int = 0

    playlists_a: int = 0
    playlists_b: int = 0
    playlists_merged: int = 0

    bookmarks_a: int = 0
    bookmarks_b: int = 0
    bookmarks_merged: int = 0

    input_fields_merged: int = 0
    tagmaps_merged: int = 0

    def __str__(self) -> str:
        lines = [
            "── Statistiques de fusion ──────────────────────",
            f"  Locations  : {self.locations_merged:4d}  (A={self.locations_a}, B={self.locations_b})",
            f"  Tags       : {self.tags_merged:4d}  (A={self.tags_a}, B={self.tags_b})",
            f"  Surlignages: {self.marks_merged:4d}  (A={self.marks_a}, B={self.marks_b})"
              + (f"  — {self.mark_conflicts} conflit(s)" if self.mark_conflicts else ""),
            f"  Notes      : {self.notes_merged:4d}  (A={self.notes_a}, B={self.notes_b})"
              + (f"  — {self.note_conflicts} conflit(s)" if self.note_conflicts else ""),
            f"  Médias     : {self.media_merged:4d}  (A={self.media_a}, B={self.media_b})",
            f"  Playlists  : {self.playlists_merged:4d}  (A={self.playlists_a}, B={self.playlists_b})",
            f"  Signets    : {self.bookmarks_merged:4d}  (A={self.bookmarks_a}, B={self.bookmarks_b})",
            f"  TagMaps    : {self.tagmaps_merged:4d}",
            f"  InputFields: {self.input_fields_merged:4d}",
            "─────────────────────────────────────────────────",
        ]
        return "\n".join(lines)


# ------------------------------------------------------------------ #
# Fusion                                                               #
# ------------------------------------------------------------------ #

def _count(db, table: str) -> int:
    return db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def run(
    path_a: str,
    path_b: str,
    output_path: str,
    options: MergeOptions | None = None,
    progress: Callable[[str], None] | None = None,
) -> MergeStats:
    """
    Fusionne deux archives .jwlibrary et écrit le résultat dans output_path.

    Args:
        path_a:      Chemin vers la première sauvegarde.
        path_b:      Chemin vers la deuxième sauvegarde.
        output_path: Chemin de sortie (.jwlibrary).
        options:     Options de fusion (None = comportement par défaut tout inclure).
        progress:    Callback optionnel appelé avec un message à chaque étape.

    Returns:
        MergeStats avec le détail des compteurs.
    """
    if options is None:
        options = MergeOptions.default()

    def _progress(msg: str) -> None:
        if progress:
            progress(msg)

    stats = MergeStats()
    tmp_a = tmp_b = tmp_out = None

    try:
        _progress("Ouverture des archives…")
        tmp_a, db_a = open_backup(path_a)
        tmp_b, db_b = open_backup(path_b)
        tmp_out = tempfile.mkdtemp()
        out = create_merged_db(tmp_a, tmp_out)

        # Désactiver les FK pour accélérer les insertions
        out.execute("PRAGMA foreign_keys = OFF")
        out.execute("PRAGMA journal_mode = WAL")
        out.execute("PRAGMA synchronous = NORMAL")

        ctx = MergeContext(db_a=db_a, db_b=db_b, out=out, options=options)

        # Compter les données sources
        stats.locations_a = _count(db_a, "Location")
        stats.locations_b = _count(db_b, "Location")
        stats.tags_a      = _count(db_a, "Tag")
        stats.tags_b      = _count(db_b, "Tag")
        stats.marks_a     = _count(db_a, "UserMark")
        stats.marks_b     = _count(db_b, "UserMark")
        stats.notes_a     = _count(db_a, "Note")
        stats.notes_b     = _count(db_b, "Note")
        stats.media_a     = _count(db_a, "IndependentMedia")
        stats.media_b     = _count(db_b, "IndependentMedia")
        stats.playlists_a = _count(db_a, "PlaylistItem")
        stats.playlists_b = _count(db_b, "PlaylistItem")
        stats.bookmarks_a = _count(db_a, "Bookmark")
        stats.bookmarks_b = _count(db_b, "Bookmark")

        _progress("Fusion des Locations et Tags…")
        locations.run(ctx)
        stats.locations_merged = _count(out, "Location")
        stats.tags_merged      = _count(out, "Tag")

        _progress("Fusion des surlignages…")
        n_conflicts = highlights.run(ctx)
        stats.marks_merged  = _count(out, "UserMark")
        stats.mark_conflicts = n_conflicts

        _progress("Fusion des notes…")
        total_notes, note_conflicts = notes.run(ctx)
        stats.notes_merged  = total_notes
        stats.note_conflicts = note_conflicts

        _progress("Fusion des médias et playlists…")
        media.run(ctx)
        stats.media_merged    = _count(out, "IndependentMedia")
        stats.playlists_merged = _count(out, "PlaylistItem")

        _progress("Fusion des annotations…")
        annotations.run(ctx)
        stats.tagmaps_merged    = _count(out, "TagMap")
        stats.bookmarks_merged  = _count(out, "Bookmark")
        stats.input_fields_merged = _count(out, "InputField")

        _progress("Finalisation…")
        out.execute("PRAGMA foreign_keys = ON")
        finalize_last_modified(out)
        out.close()
        db_a.close()
        db_b.close()

        copy_media_files(tmp_a, tmp_b, tmp_out)
        write_manifest(tmp_out, output_path)
        package_output(tmp_out, output_path)

        _progress("Fusion terminée.")
        return stats

    finally:
        import shutil
        for d in [tmp_a, tmp_b, tmp_out]:
            if d and os.path.isdir(d):
                shutil.rmtree(d, ignore_errors=True)
