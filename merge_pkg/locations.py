"""
Fusion des tables de référence : Location et Tag.
Ces tables sont toujours fusionnées automatiquement (pas d'options utilisateur).
"""
from __future__ import annotations
import sqlite3

from .context import MergeContext, rows, query_one, insert


def run(ctx: MergeContext) -> None:
    _merge_locations(ctx)
    _merge_tags(ctx)


# ------------------------------------------------------------------ #
# Location                                                             #
# ------------------------------------------------------------------ #

def _find_location(out: sqlite3.Connection, row: sqlite3.Row) -> int | None:
    """
    Cherche une Location existante par clé naturelle.
    Quatre cas selon les champs non-nuls (voir schéma : CHECK constraints).
    """
    r = dict(row)

    # Cas 1 : chapitre ou livre biblique
    if r["BookNumber"]:
        hit = query_one(out, """
            SELECT LocationId FROM Location
            WHERE BookNumber = ? AND ChapterNumber IS ?
              AND KeySymbol = ? AND MepsLanguage IS ? AND Type = ?
        """, (r["BookNumber"], r["ChapterNumber"], r["KeySymbol"], r["MepsLanguage"], r["Type"]))
        return hit["LocationId"] if hit else None

    # Cas 2 : article de publication (DocumentId non nul)
    if r["DocumentId"]:
        hit = query_one(out, """
            SELECT LocationId FROM Location
            WHERE DocumentId = ? AND KeySymbol IS ? AND IssueTagNumber = ?
              AND MepsLanguage IS ? AND Type = ?
              AND COALESCE(Specialty, '') = COALESCE(?, '')
              AND COALESCE(Edition,  '') = COALESCE(?, '')
        """, (r["DocumentId"], r["KeySymbol"], r["IssueTagNumber"],
              r["MepsLanguage"], r["Type"], r["Specialty"], r["Edition"]))
        return hit["LocationId"] if hit else None

    # Cas 3 : piste audio/vidéo
    if r["Track"] is not None:
        hit = query_one(out, """
            SELECT LocationId FROM Location
            WHERE Track = ? AND KeySymbol IS ? AND IssueTagNumber = ?
              AND MepsLanguage IS ? AND Type = ?
        """, (r["Track"], r["KeySymbol"], r["IssueTagNumber"], r["MepsLanguage"], r["Type"]))
        return hit["LocationId"] if hit else None

    # Cas 4 : racine de publication (Type = 1) ou entrée minimale
    hit = query_one(out, """
        SELECT LocationId FROM Location
        WHERE (BookNumber IS NULL OR BookNumber = 0)
          AND (ChapterNumber IS NULL OR ChapterNumber = 0)
          AND (DocumentId IS NULL OR DocumentId = 0)
          AND Track IS NULL
          AND KeySymbol IS ? AND IssueTagNumber = ?
          AND MepsLanguage IS ? AND Type = ?
          AND COALESCE(Specialty, '') = COALESCE(?, '')
          AND COALESCE(Edition,  '') = COALESCE(?, '')
    """, (r["KeySymbol"], r["IssueTagNumber"], r["MepsLanguage"], r["Type"],
          r["Specialty"], r["Edition"]))
    return hit["LocationId"] if hit else None


def _merge_locations(ctx: MergeContext) -> None:
    for i, db in enumerate(ctx.sources):
        for row in rows(db, "Location"):
            old_id = row["LocationId"]
            existing = _find_location(ctx.out, row)
            if existing is not None:
                ctx.loc_map[i][old_id] = existing
            else:
                data = dict(row)
                del data["LocationId"]
                new_id = insert(ctx.out, "Location", data)
                ctx.loc_map[i][old_id] = new_id
    ctx.out.commit()


# ------------------------------------------------------------------ #
# Tag                                                                  #
# ------------------------------------------------------------------ #

def _merge_tags(ctx: MergeContext) -> None:
    for i, db in enumerate(ctx.sources):
        for row in rows(db, "Tag"):
            old_id = row["TagId"]
            hit = query_one(ctx.out,
                "SELECT TagId FROM Tag WHERE Type = ? AND Name = ?",
                (row["Type"], row["Name"]))
            if hit:
                ctx.tag_map[i][old_id] = hit["TagId"]
            else:
                new_id = insert(ctx.out, "Tag", {"Type": row["Type"], "Name": row["Name"]})
                ctx.tag_map[i][old_id] = new_id
    ctx.out.commit()
