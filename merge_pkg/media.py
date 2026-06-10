"""
Fusion des médias : IndependentMedia, PlaylistItem et sous-tables.
Déduplication par Hash pour IndependentMedia (même contenu = même fichier).
Gestion du filepath_map pour corriger les références ThumbnailFilePath.
"""
from __future__ import annotations

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

def _merge_playlist_items(ctx: MergeContext) -> None:
    for i, db in enumerate(ctx.sources):
        for row in rows(db, "PlaylistItem"):
            old_id = row["PlaylistItemId"]

            # Déduplication par (Label, StartTrimOffsetTicks, EndTrimOffsetTicks)
            hit = query_one(ctx.out, """
                SELECT PlaylistItemId FROM PlaylistItem
                WHERE Label IS ? AND StartTrimOffsetTicks IS ? AND EndTrimOffsetTicks IS ?
            """, (row["Label"], row["StartTrimOffsetTicks"], row["EndTrimOffsetTicks"]))

            if hit:
                ctx.playlist_map[i][old_id] = hit["PlaylistItemId"]
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
    ctx.out.commit()


# ------------------------------------------------------------------ #
# Sous-tables PlaylistItem                                             #
# ------------------------------------------------------------------ #

def _merge_playlist_sub_tables(ctx: MergeContext) -> None:
    for i, db in enumerate(ctx.sources):
        for row in rows(db, "PlaylistItemIndependentMediaMap"):
            new_playlist = ctx.playlist_map[i].get(row["PlaylistItemId"])
            new_media    = ctx.media_map[i].get(row["IndependentMediaId"])
            if new_playlist is None or new_media is None:
                continue
            exists = query_one(ctx.out, """
                SELECT 1 FROM PlaylistItemIndependentMediaMap
                WHERE PlaylistItemId = ? AND IndependentMediaId = ?
            """, (new_playlist, new_media))
            if not exists:
                insert(ctx.out, "PlaylistItemIndependentMediaMap", {
                    "PlaylistItemId":    new_playlist,
                    "IndependentMediaId": new_media,
                    "DurationTicks":     row["DurationTicks"],
                })

        for row in rows(db, "PlaylistItemLocationMap"):
            new_playlist = ctx.playlist_map[i].get(row["PlaylistItemId"])
            new_loc      = ctx.loc_map[i].get(row["LocationId"])
            if new_playlist is None or new_loc is None:
                continue
            exists = query_one(ctx.out, """
                SELECT 1 FROM PlaylistItemLocationMap
                WHERE PlaylistItemId = ? AND LocationId = ?
            """, (new_playlist, new_loc))
            if not exists:
                insert(ctx.out, "PlaylistItemLocationMap", {
                    "PlaylistItemId": new_playlist,
                    "LocationId":     new_loc,
                    "MajorMultiMark": row["MajorMultiMark"],
                })

        for row in rows(db, "PlaylistItemMarker"):
            new_playlist = ctx.playlist_map[i].get(row["PlaylistItemId"])
            if new_playlist is None:
                continue
            hit = query_one(ctx.out, """
                SELECT PlaylistItemMarkerId FROM PlaylistItemMarker
                WHERE PlaylistItemId = ? AND Label IS ?
            """, (new_playlist, row["Label"]))
            if hit:
                ctx.marker_map[i][row["PlaylistItemMarkerId"]] = hit["PlaylistItemMarkerId"]
            else:
                new_id = insert(ctx.out, "PlaylistItemMarker", {
                    "PlaylistItemId":        new_playlist,
                    "Label":                 row["Label"],
                    "StartTimeTicks":        row["StartTimeTicks"],
                    "DurationTicks":         row["DurationTicks"],
                    "EndTransitionDuration": row["EndTransitionDuration"],
                })
                ctx.marker_map[i][row["PlaylistItemMarkerId"]] = new_id

        for row in rows(db, "PlaylistItemMarkerBibleVerseMap"):
            new_marker = ctx.marker_map[i].get(row["PlaylistItemMarkerId"])
            if new_marker is None:
                continue
            exists = query_one(ctx.out, """
                SELECT 1 FROM PlaylistItemMarkerBibleVerseMap
                WHERE PlaylistItemMarkerId = ? AND VerseNumber = ?
            """, (new_marker, row["VerseNumber"]))
            if not exists:
                insert(ctx.out, "PlaylistItemMarkerBibleVerseMap", {
                    "PlaylistItemMarkerId": new_marker,
                    "VerseNumber":          row["VerseNumber"],
                })

        for row in rows(db, "PlaylistItemMarkerParagraphMap"):
            new_marker = ctx.marker_map[i].get(row["PlaylistItemMarkerId"])
            if new_marker is None:
                continue
            exists = query_one(ctx.out, """
                SELECT 1 FROM PlaylistItemMarkerParagraphMap
                WHERE PlaylistItemMarkerId = ? AND MepsDocumentId = ?
            """, (new_marker, row["MepsDocumentId"]))
            if not exists:
                insert(ctx.out, "PlaylistItemMarkerParagraphMap", {
                    "PlaylistItemMarkerId": new_marker,
                    "MepsDocumentId":       row["MepsDocumentId"],
                    "ParagraphIndex":       row["ParagraphIndex"],
                    "MarkerIndexWithinParagraph": row["MarkerIndexWithinParagraph"],
                })

    ctx.out.commit()
