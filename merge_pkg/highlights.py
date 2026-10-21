"""
Fusion des surlignages : UserMark, BlockRange, et résolution des conflits.
Supporte HighlightOptions pour filtrer ou orienter la stratégie de conflit.
"""
from __future__ import annotations
import sqlite3
from typing import Literal

from .context import MergeContext, rows, query_one, insert
from .options import HighlightOptions


def run(ctx: MergeContext) -> int:
    """
    Retourne le nombre de conflits résolus.
    """
    _merge_usermarks(ctx)
    _merge_blockranges(ctx)
    return _resolve_conflicts(ctx)


# ------------------------------------------------------------------ #
# UserMark                                                             #
# ------------------------------------------------------------------ #

def _build_key_symbol_map(db: sqlite3.Connection) -> dict[int, str]:
    """UserMarkId → KeySymbol via la table Location."""
    result = db.execute("""
        SELECT um.UserMarkId, COALESCE(l.KeySymbol, '__unknown__') AS ks
        FROM UserMark um JOIN Location l ON l.LocationId = um.LocationId
    """).fetchall()
    return {r["UserMarkId"]: r["ks"] for r in result}


def _merge_usermarks(ctx: MergeContext) -> None:
    opts: HighlightOptions = ctx.options.highlights
    source_labels: tuple[Literal["a", "b"], ...] = ("a", "b")

    for i, db in enumerate(ctx.sources):
        src = source_labels[i]
        ks_map = _build_key_symbol_map(db)
        for row in rows(db, "UserMark"):
            old_id  = row["UserMarkId"]
            guid    = row["UserMarkGuid"]
            ks      = ks_map.get(old_id)

            if not opts.should_include(guid, src, ks):
                continue

            hit = query_one(ctx.out,
                "SELECT UserMarkId FROM UserMark WHERE UserMarkGuid = ?", (guid,))
            if hit:
                ctx.mark_map[i][old_id] = hit["UserMarkId"]
            else:
                new_loc = ctx.loc_map[i].get(row["LocationId"])
                new_id  = insert(ctx.out, "UserMark", {
                    "ColorIndex":    row["ColorIndex"],
                    "LocationId":    new_loc,
                    "StyleIndex":    row["StyleIndex"],
                    "UserMarkGuid":  guid,
                    "Version":       row["Version"],
                })
                ctx.mark_map[i][old_id] = new_id
    ctx.out.commit()


# ------------------------------------------------------------------ #
# BlockRange                                                           #
# ------------------------------------------------------------------ #

def _merge_blockranges(ctx: MergeContext) -> None:
    for i, db in enumerate(ctx.sources):
        for row in rows(db, "BlockRange"):
            new_mark = ctx.mark_map[i].get(row["UserMarkId"])
            if new_mark is None:
                continue
            exists = query_one(ctx.out,
                "SELECT 1 FROM BlockRange WHERE UserMarkId = ? AND BlockType = ? AND Identifier = ?",
                (new_mark, row["BlockType"], row["Identifier"]))
            if not exists:
                insert(ctx.out, "BlockRange", {
                    "BlockType":  row["BlockType"],
                    "Identifier": row["Identifier"],
                    "StartToken": row["StartToken"],
                    "EndToken":   row["EndToken"],
                    "UserMarkId": new_mark,
                })
    ctx.out.commit()


# ------------------------------------------------------------------ #
# Résolution des conflits                                              #
# ------------------------------------------------------------------ #

def _resolve_conflicts(ctx: MergeContext) -> int:
    """
    Détecte deux UserMarks différents couvrant exactement le même texte
    sur la même Location, et en conserve un seul selon la stratégie.
    Retourne le nombre de conflits résolus.
    """
    strategy = ctx.options.highlights.conflict_strategy

    # Les notes ne sont pas encore fusionnées : on lit dans les sources quels surlignages en portent une
    with_note: set[int] = set()
    for i, db in enumerate(ctx.sources):
        for r in db.execute("SELECT DISTINCT UserMarkId FROM Note WHERE UserMarkId IS NOT NULL"):
            new_id = ctx.mark_map[i].get(r["UserMarkId"])
            if new_id is not None:
                with_note.add(new_id)

    conflicts = ctx.out.execute("""
        SELECT br1.UserMarkId AS id1, br2.UserMarkId AS id2
        FROM BlockRange br1
        JOIN BlockRange br2
          ON br1.UserMarkId < br2.UserMarkId
         AND br1.BlockType   = br2.BlockType
         AND br1.Identifier  = br2.Identifier
         AND br1.StartToken  IS br2.StartToken
         AND br1.EndToken    IS br2.EndToken
        JOIN UserMark um1 ON um1.UserMarkId = br1.UserMarkId
        JOIN UserMark um2 ON um2.UserMarkId = br2.UserMarkId
        WHERE um1.LocationId = um2.LocationId
    """).fetchall()

    # perdant → gagnant ; un perdant peut lui-même avoir gagné un conflit précédent
    replaced_by: dict[int, int] = {}

    def survivor(mark_id: int) -> int:
        while mark_id in replaced_by:
            mark_id = replaced_by[mark_id]
        return mark_id

    for c in conflicts:
        id1, id2 = survivor(c["id1"]), survivor(c["id2"])
        if id1 == id2:
            continue
        winner, loser = _pick_winner(with_note, id1, id2, strategy)
        ctx.out.execute("DELETE FROM BlockRange WHERE UserMarkId = ?", (loser,))
        ctx.out.execute("DELETE FROM UserMark WHERE UserMarkId = ?", (loser,))
        replaced_by[loser] = winner
        # notes.run rattachera les notes du perdant au gagnant via mark_map
        if loser in with_note:
            with_note.add(winner)

    if replaced_by:
        for m in ctx.mark_map:
            for k, v in m.items():
                if v in replaced_by:
                    m[k] = survivor(v)
        ctx.out.commit()

    return len(replaced_by)


def _pick_winner(with_note: set[int], id1: int, id2: int,
                 strategy: str) -> tuple[int, int]:
    """Retourne (winner_id, loser_id) selon la stratégie."""
    match strategy:
        case "keep_a":
            return id1, id2
        case "keep_b":
            return id2, id1
        case _:  # keep_with_note (défaut)
            if id2 in with_note and id1 not in with_note:
                return id2, id1
            return id1, id2
