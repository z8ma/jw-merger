"""
Fusion des notes : Note table avec résolution de conflits de contenu.
Supporte NoteOptions pour filtrer les notes à inclure.
"""
from __future__ import annotations

from .context import MergeContext, rows, query_one, insert, resolve_text
from .options import NoteOptions


def run(ctx: MergeContext) -> tuple[int, int]:
    """
    Retourne (total_notes, nb_conflits_texte).
    Doit être appelé après highlights.run() car les notes peuvent référencer UserMarkId.
    """
    return _merge_notes(ctx)


def _get_tag_names(db, old_note_id: int, tag_map: dict[int, int]) -> set[str]:
    """Récupère les noms d'étiquettes d'une note (depuis la source)."""
    result = db.execute("""
        SELECT t.Name FROM TagMap tm
        JOIN Tag t ON t.TagId = tm.TagId
        WHERE tm.NoteId = ?
    """, (old_note_id,)).fetchall()
    return {r["Name"] for r in result}


def _merge_notes(ctx: MergeContext) -> tuple[int, int]:
    opts: NoteOptions = ctx.options.notes
    sep = ctx.options.text_separator
    source_labels = ("a", "b")

    # Phase 1 : construire un dict guid → {source, row, tag_names} pour chaque source
    note_data: dict[str, list[dict]] = {}  # guid → liste des entrées (1 ou 2)

    for i, db in enumerate(ctx.sources):
        src = source_labels[i]
        for row in rows(db, "Note"):
            guid = row["Guid"]
            tag_names = _get_tag_names(db, row["NoteId"], ctx.tag_map[i])
            if not opts.should_include(guid, src, tag_names):
                continue
            if guid not in note_data:
                note_data[guid] = []
            note_data[guid].append({
                "source_idx": i,
                "source":     src,
                "row":        row,
                "tag_names":  tag_names,
            })

    total = 0
    conflicts = 0

    for guid, entries in note_data.items():
        if len(entries) == 1:
            # Note présente dans une seule source
            e = entries[0]
            new_id = _insert_note(ctx, e["source_idx"], e["row"])
            ctx.note_map[e["source_idx"]][e["row"]["NoteId"]] = new_id
            total += 1

        else:
            # Note présente dans les deux sources (même GUID)
            e_a, e_b = entries[0], entries[1]
            row_a, row_b = e_a["row"], e_b["row"]

            content_a = (row_a["Content"] or "").strip()
            content_b = (row_b["Content"] or "").strip()

            if content_a != content_b:
                conflicts += 1

            resolved_content = resolve_text(
                row_a["Content"], row_b["Content"],
                row_a["LastModified"], row_b["LastModified"],
                opts.conflict_strategy, sep,
            )

            # Titre : préférer le plus récent
            title = row_a["Title"]
            if (row_b["LastModified"] or "") > (row_a["LastModified"] or ""):
                title = row_b["Title"]

            last_modified = max(
                row_a["LastModified"] or "",
                row_b["LastModified"] or "",
            ) or None

            # UserMarkId : préférer celui lié à une note si possible
            new_mark = (ctx.mark_map[0].get(row_a["UserMarkId"])
                        or ctx.mark_map[1].get(row_b["UserMarkId"]))
            new_loc = (ctx.loc_map[0].get(row_a["LocationId"])
                       or ctx.loc_map[1].get(row_b["LocationId"]))

            new_id = insert(ctx.out, "Note", {
                "Guid":         guid,
                "Title":        title,
                "Content":      resolved_content,
                "LastModified": last_modified,
                "Created":      row_a["Created"] or row_b["Created"],
                "BlockType":    row_a["BlockType"],
                "BlockIdentifier": row_a["BlockIdentifier"],
                "UserMarkId":   new_mark,
                "LocationId":   new_loc,
            })

            ctx.note_map[0][row_a["NoteId"]] = new_id
            ctx.note_map[1][row_b["NoteId"]] = new_id
            total += 1

    ctx.out.commit()
    return total, conflicts


def _insert_note(ctx: MergeContext, i: int, row) -> int:
    new_mark = ctx.mark_map[i].get(row["UserMarkId"])
    new_loc  = ctx.loc_map[i].get(row["LocationId"])
    return insert(ctx.out, "Note", {
        "Guid":            row["Guid"],
        "Title":           row["Title"],
        "Content":         row["Content"],
        "LastModified":    row["LastModified"],
        "Created":         row["Created"],
        "BlockType":       row["BlockType"],
        "BlockIdentifier": row["BlockIdentifier"],
        "UserMarkId":      new_mark,
        "LocationId":      new_loc,
    })
