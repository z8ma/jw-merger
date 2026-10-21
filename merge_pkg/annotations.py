"""
Fusion des annotations : TagMap, Bookmark, InputField.
Dépend de note_map, tag_map, loc_map, mark_map, playlist_map.
"""
from __future__ import annotations

from .context import MergeContext, rows, query_one, insert, resolve_text
from .options import AnnotationOptions


def run(ctx: MergeContext) -> None:
    _merge_tagmaps(ctx)
    if ctx.options.annotations.include_bookmarks:
        _merge_bookmarks(ctx)
    if ctx.options.annotations.include_input_fields:
        _merge_input_fields(ctx)


# ------------------------------------------------------------------ #
# TagMap                                                               #
# ------------------------------------------------------------------ #

def _merge_tagmaps(ctx: MergeContext) -> None:
    for i, db in enumerate(ctx.sources):
        for row in rows(db, "TagMap"):
            new_tag = ctx.tag_map[i].get(row["TagId"])
            if new_tag is None:
                continue

            new_note     = ctx.note_map[i].get(row["NoteId"]) if row["NoteId"] else None
            new_location = ctx.loc_map[i].get(row["LocationId"]) if row["LocationId"] else None
            new_playlist = ctx.playlist_map[i].get(row["PlaylistItemId"]) if row["PlaylistItemId"] else None

            # Une TagMap doit pointer vers au moins un objet
            if new_note is None and new_location is None and new_playlist is None:
                continue

            exists = query_one(ctx.out, """
                SELECT 1 FROM TagMap
                WHERE TagId IS ? AND NoteId IS ? AND LocationId IS ? AND PlaylistItemId IS ?
            """, (new_tag, new_note, new_location, new_playlist))
            if not exists:
                # Position must be unique per TagId; compute next available
                max_pos = ctx.out.execute(
                    "SELECT COALESCE(MAX(Position), -1) FROM TagMap WHERE TagId = ?", (new_tag,)
                ).fetchone()[0]
                insert(ctx.out, "TagMap", {
                    "TagId":          new_tag,
                    "NoteId":         new_note,
                    "LocationId":     new_location,
                    "PlaylistItemId": new_playlist,
                    "Position":       max_pos + 1,
                })
    ctx.out.commit()


# ------------------------------------------------------------------ #
# Bookmark                                                             #
# ------------------------------------------------------------------ #

def _merge_bookmarks(ctx: MergeContext) -> None:
    for i, db in enumerate(ctx.sources):
        for row in rows(db, "Bookmark"):
            new_loc     = ctx.loc_map[i].get(row["LocationId"])
            new_pub_loc = ctx.loc_map[i].get(row["PublicationLocationId"])
            if new_loc is None or new_pub_loc is None:
                continue

            # Contrainte du schéma : UNIQUE(PublicationLocationId, Slot)
            exists = query_one(ctx.out,
                "SELECT 1 FROM Bookmark WHERE PublicationLocationId = ? AND Slot = ?",
                (new_pub_loc, row["Slot"]))
            if not exists:
                insert(ctx.out, "Bookmark", {
                    "LocationId":            new_loc,
                    "PublicationLocationId": new_pub_loc,
                    "Slot":                  row["Slot"],
                    "Title":                 row["Title"],
                    "Snippet":               row["Snippet"],
                    "BlockType":             row["BlockType"],
                    "BlockIdentifier":       row["BlockIdentifier"],
                })
    ctx.out.commit()


# ------------------------------------------------------------------ #
# InputField                                                           #
# ------------------------------------------------------------------ #

def _merge_input_fields(ctx: MergeContext) -> None:
    opts: AnnotationOptions = ctx.options.annotations
    sep = ctx.options.text_separator

    for i, db in enumerate(ctx.sources):
        for row in rows(db, "InputField"):
            new_loc = ctx.loc_map[i].get(row["LocationId"])
            if new_loc is None:
                continue

            text_tag = row["TextTag"]
            hit = query_one(ctx.out,
                "SELECT Value FROM InputField WHERE LocationId = ? AND TextTag = ?",
                (new_loc, text_tag))

            if hit:
                existing_val = hit["Value"] or ""
                new_val      = row["Value"] or ""
                if existing_val.strip() == new_val.strip():
                    continue  # contenu identique, rien à faire
                # Conflit de contenu
                resolved = resolve_text(
                    existing_val, new_val,
                    "", "",  # pas de LastModified sur InputField
                    opts.input_conflict_strategy, sep,
                )
                ctx.out.execute(
                    "UPDATE InputField SET Value = ? WHERE LocationId = ? AND TextTag = ?",
                    (resolved, new_loc, text_tag))
            else:
                insert(ctx.out, "InputField", {
                    "LocationId": new_loc,
                    "TextTag":    text_tag,
                    "Value":      row["Value"],
                })
    ctx.out.commit()
