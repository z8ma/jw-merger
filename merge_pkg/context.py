"""
MergeContext — état partagé entre tous les modules de fusion.
Contient les maps d'IDs et les helpers SQL.
"""
from __future__ import annotations
import re
import sqlite3
from dataclasses import dataclass, field
from typing import Any

from .options import MergeOptions


@dataclass
class MergeContext:
    db_a: sqlite3.Connection
    db_b: sqlite3.Connection
    out: sqlite3.Connection
    options: MergeOptions

    # Maps de remapping : maps[0] = source A → merged, maps[1] = source B → merged
    loc_map:      tuple[dict[int, int], dict[int, int]] = field(default_factory=lambda: ({}, {}))
    tag_map:      tuple[dict[int, int], dict[int, int]] = field(default_factory=lambda: ({}, {}))
    mark_map:     tuple[dict[int, int], dict[int, int]] = field(default_factory=lambda: ({}, {}))
    note_map:     tuple[dict[int, int], dict[int, int]] = field(default_factory=lambda: ({}, {}))
    media_map:    tuple[dict[int, int], dict[int, int]] = field(default_factory=lambda: ({}, {}))
    playlist_map: tuple[dict[int, int], dict[int, int]] = field(default_factory=lambda: ({}, {}))
    marker_map:   tuple[dict[int, int], dict[int, int]] = field(default_factory=lambda: ({}, {}))

    # Remapping de chemins de fichiers média dédupliqués par hash
    filepath_map: tuple[dict[str, str], dict[str, str]] = field(default_factory=lambda: ({}, {}))

    @property
    def sources(self) -> tuple[sqlite3.Connection, sqlite3.Connection]:
        return (self.db_a, self.db_b)


# ------------------------------------------------------------------ #
# Helpers SQL                                                          #
# ------------------------------------------------------------------ #

def rows(db: sqlite3.Connection, table: str) -> list[sqlite3.Row]:
    return db.execute(f"SELECT * FROM {table}").fetchall()


def query_one(db: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> sqlite3.Row | None:
    return db.execute(sql, params).fetchone()


def insert(db: sqlite3.Connection, table: str, data: dict[str, Any]) -> int:
    """INSERT et retourne le rowid généré."""
    cols = ", ".join(data.keys())
    ph   = ", ".join("?" * len(data))
    db.execute(f"INSERT INTO {table} ({cols}) VALUES ({ph})", list(data.values()))
    return db.execute("SELECT last_insert_rowid()").fetchone()[0]


# ------------------------------------------------------------------ #
# Manipulation de texte                                               #
# ------------------------------------------------------------------ #

def merge_text(a: str | None, b: str | None, separator: str) -> str | None:
    ta = (a or "").strip()
    tb = (b or "").strip()
    if not ta: return b
    if not tb: return a
    if ta == tb: return a
    # Un texte déjà concaténé lors d'une fusion précédente ne doit pas être répété : on réunit les blocs.
    marker = separator.strip()
    split = (lambda t: re.split(rf"\s*^{re.escape(marker)}$\s*", t, flags=re.MULTILINE)) if marker else (lambda t: [t])
    blocks_a, blocks_b = split(ta), split(tb)
    missing_from_a = [block for block in blocks_b if block not in blocks_a]
    if not missing_from_a: return a
    if all(block in blocks_b for block in blocks_a): return b
    return separator.join(blocks_a + missing_from_a)


def resolve_text(a: str | None, b: str | None, lm_a: str, lm_b: str,
                 strategy: str, separator: str) -> str | None:
    """
    Résout un conflit de contenu texte selon la stratégie choisie.
    Utilisé par notes.py et annotations.py.
    """
    match strategy:
        case "keep_newest": return a if lm_a >= lm_b else b
        case "keep_a":      return a
        case "keep_b":      return b
        case _:             return merge_text(a, b, separator)  # concat par défaut
