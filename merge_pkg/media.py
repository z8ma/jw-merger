"""
Fusion des médias : IndependentMedia, PlaylistItem et sous-tables.
Déduplication par Hash pour IndependentMedia (même contenu = même fichier).
Gestion du filepath_map pour corriger les références ThumbnailFilePath.
"""
from __future__ import annotations
import json
import sqlite3
from typing import Any

from .context import MergeContext, rows, query_one, insert


def run(ctx: MergeContext) -> None:
    if not ctx.options.media.include_playlists:
        return
    _merge_independent_media(ctx)
    _merge_playlist_items(ctx)
    _merge_playlist_sub_tables(ctx)


# ------------------------------------------------------------------ #
# IndependentMedia                                                     #
# ------------------------------------------------------------------ #

def _merge_independent_media(ctx: MergeContext) -> None:
    for i, db in enumerate(ctx.sources):
        for row in rows(db, "IndependentMedia"):
            old_id   = row["IndependentMediaId"]
            file_path = row["FilePath"]

            # Déduplication par Hash (même contenu)
            hit = query_one(ctx.out,
                "SELECT IndependentMediaId, FilePath FROM IndependentMedia WHERE Hash = ?",
                (row["Hash"],))
            if hit:
                ctx.media_map[i][old_id] = hit["IndependentMediaId"]
                # Si le fichier portait un autre nom, mémoriser la redirection
                if hit["FilePath"] != file_path:
                    ctx.filepath_map[i][file_path] = hit["FilePath"]
            else:
                new_id = insert(ctx.out, "IndependentMedia", {
                    "OriginalFilename": row["OriginalFilename"],
                    "FilePath":         file_path,
                    "MimeType":         row["MimeType"],
                    "Hash":             row["Hash"],
                })
                ctx.media_map[i][old_id] = new_id
    ctx.out.commit()


# ------------------------------------------------------------------ #
# PlaylistItem                                                         #
# ------------------------------------------------------------------ #

def _playlist_signatures(ctx: MergeContext, i: int, db: sqlite3.Connection) -> dict[int, str]:
    """
    Deux éléments sont le même s'ils ont le même libellé, les mêmes réglages,
    les mêmes médias et appartiennent aux mêmes playlists.
    """
    parts: dict[int, list[str]] = {}
    for r in db.execute("""
        SELECT m.PlaylistItemId, im.Hash FROM PlaylistItemIndependentMediaMap m
        JOIN IndependentMedia im ON im.IndependentMediaId = m.IndependentMediaId
    """):
        parts.setdefault(r["PlaylistItemId"], []).append(f"media:{r['Hash']}")
    for r in rows(db, "PlaylistItemLocationMap"):
        parts.setdefault(r["PlaylistItemId"], []).append(f"loc:{ctx.loc_map[i].get(r['LocationId'])}")
    for r in db.execute("SELECT PlaylistItemId, TagId FROM TagMap WHERE PlaylistItemId IS NOT NULL"):
        parts.setdefault(r["PlaylistItemId"], []).append(f"tag:{ctx.tag_map[i].get(r['TagId'])}")

    return {
        row["PlaylistItemId"]: json.dumps([
            row["Label"], row["StartTrimOffsetTicks"], row["EndTrimOffsetTicks"],
            row["Accuracy"], row["EndAction"],
            *sorted(parts.get(row["PlaylistItemId"], [])),
        ])
        for row in rows(db, "PlaylistItem")
    }


def _merge_playlist_items(ctx: MergeContext) -> None:
    # Éléments déjà fusionnés qu'un élément identique de l'autre source peut encore réutiliser.
    # Un même élément présent deux fois dans une source reste présent deux fois.
    unclaimed: dict[str, list[int]] = {}

    for i, db in enumerate(ctx.sources):
        signatures = _playlist_signatures(ctx, i, db)
        inserted: list[tuple[str, int]] = []
        for row in rows(db, "PlaylistItem"):
            old_id = row["PlaylistItemId"]
            signature = signatures[old_id]

            if unclaimed.get(signature):
                ctx.playlist_map[i][old_id] = unclaimed[signature].pop(0)
            else:
                thumb = row["ThumbnailFilePath"]
                if thumb and thumb in ctx.filepath_map[i]:
                    thumb = ctx.filepath_map[i][thumb]

                new_id = insert(ctx.out, "PlaylistItem", {
                    "Label":                  row["Label"],
                    "StartTrimOffsetTicks":   row["StartTrimOffsetTicks"],
                    "EndTrimOffsetTicks":     row["EndTrimOffsetTicks"],
                    "Accuracy":               row["Accuracy"],
                    "EndAction":              row["EndAction"],
                    "ThumbnailFilePath":      thumb,
                })
                ctx.playlist_map[i][old_id] = new_id
                inserted.append((signature, new_id))

        for signature, new_id in inserted:
            unclaimed.setdefault(signature, []).append(new_id)
    ctx.out.commit()


# ------------------------------------------------------------------ #
# Sous-tables PlaylistItem                                             #
# ------------------------------------------------------------------ #

def _exists(out: sqlite3.Connection, table: str, where: dict[str, Any]) -> bool:
    clause = " AND ".join(f"{col} IS ?" for col in where)
    return query_one(out, f"SELECT 1 FROM {table} WHERE {clause}", tuple(where.values())) is not None


def _merge_playlist_sub_tables(ctx: MergeContext) -> None:
    # Les lignes sont recopiées avec leurs propres colonnes (seules les clés étrangères sont
    # remappées) : aucun nom de colonne spécifique à une version du schéma n'est supposé.
    for i, db in enumerate(ctx.sources):
        for row in rows(db, "PlaylistItemIndependentMediaMap"):
            new_playlist = ctx.playlist_map[i].get(row["PlaylistItemId"])
            new_media    = ctx.media_map[i].get(row["IndependentMediaId"])
            if new_playlist is None or new_media is None:
                continue
            key = {"PlaylistItemId": new_playlist, "IndependentMediaId": new_media}
            if not _exists(ctx.out, "PlaylistItemIndependentMediaMap", key):
                insert(ctx.out, "PlaylistItemIndependentMediaMap", {**dict(row), **key})

        for row in rows(db, "PlaylistItemLocationMap"):
            new_playlist = ctx.playlist_map[i].get(row["PlaylistItemId"])
            new_loc      = ctx.loc_map[i].get(row["LocationId"])
            if new_playlist is None or new_loc is None:
                continue
            key = {"PlaylistItemId": new_playlist, "LocationId": new_loc}
            if not _exists(ctx.out, "PlaylistItemLocationMap", key):
                insert(ctx.out, "PlaylistItemLocationMap", {**dict(row), **key})

        for row in rows(db, "PlaylistItemMarker"):
            new_playlist = ctx.playlist_map[i].get(row["PlaylistItemId"])
            if new_playlist is None:
                continue
            hit = query_one(ctx.out, """
                SELECT PlaylistItemMarkerId FROM PlaylistItemMarker
                WHERE PlaylistItemId = ? AND StartTimeTicks = ?
            """, (new_playlist, row["StartTimeTicks"]))
            if hit:
                ctx.marker_map[i][row["PlaylistItemMarkerId"]] = hit["PlaylistItemMarkerId"]
            else:
                data = {**dict(row), "PlaylistItemId": new_playlist}
                del data["PlaylistItemMarkerId"]
                ctx.marker_map[i][row["PlaylistItemMarkerId"]] = insert(ctx.out, "PlaylistItemMarker", data)

        for table in ("PlaylistItemMarkerBibleVerseMap", "PlaylistItemMarkerParagraphMap"):
            for row in rows(db, table):
                new_marker = ctx.marker_map[i].get(row["PlaylistItemMarkerId"])
                if new_marker is None:
                    continue
                data = {**dict(row), "PlaylistItemMarkerId": new_marker}
                if not _exists(ctx.out, table, data):
                    insert(ctx.out, table, data)

    ctx.out.commit()
