"""
I/O pur : ouverture des archives, création de la DB fusionnée, packaging final.
Aucune logique métier ici.
"""
from __future__ import annotations
import hashlib
import json
import os
import shutil
import sqlite3
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path


def open_backup(path: str) -> tuple[str, sqlite3.Connection]:
    """
    Extrait une archive .jwlibrary dans un dossier temporaire.
    Retourne (tmp_dir, connexion SQLite).
    Le appelant est responsable de fermer la connexion et supprimer tmp_dir.
    """
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(path) as z:
        z.extractall(tmp)
    db = sqlite3.connect(os.path.join(tmp, "userData.db"))
    db.row_factory = sqlite3.Row
    return tmp, db


def create_merged_db(src_dir: str, out_dir: str) -> sqlite3.Connection:
    """
    Copie le schéma de la source A dans out_dir/userData.db,
    vide toutes les tables de données, et retourne la connexion.
    """
    src_db = os.path.join(src_dir, "userData.db")
    dst_db = os.path.join(out_dir, "userData.db")
    shutil.copy(src_db, dst_db)

    db = sqlite3.connect(dst_db)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = OFF")

    for table in [
        "PlaylistItemMarkerParagraphMap", "PlaylistItemMarkerBibleVerseMap",
        "PlaylistItemMarker", "PlaylistItemIndependentMediaMap",
        "PlaylistItemLocationMap", "TagMap", "BlockRange", "Note",
        "UserMark", "Bookmark", "InputField", "PlaylistItem",
        "IndependentMedia", "Tag", "Location",
    ]:
        db.execute(f"DELETE FROM {table}")
    db.commit()
    return db


def copy_media_files(dir_a: str, dir_b: str, out_dir: str) -> None:
    """Copie tous les fichiers médias des deux sources vers le dossier de sortie."""
    skip = {"userData.db", "manifest.json"}
    for src in [dir_a, dir_b]:
        for fname in os.listdir(src):
            if fname in skip:
                continue
            dst = os.path.join(out_dir, fname)
            if not os.path.exists(dst):
                shutil.copy(os.path.join(src, fname), dst)


def write_manifest(out_dir: str, output_path: str, schema_version: int = 16) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    db_path = os.path.join(out_dir, "userData.db")
    h = hashlib.sha256()
    with open(db_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)

    manifest = {
        "type": 0,
        "name": Path(output_path).name,
        "creationDate": now,
        "version": 1,
        "userDataBackup": {
            "deviceName": "Merged",
            "lastModifiedDate": now,
            "hash": h.hexdigest(),
            "databaseName": "userData.db",
            "schemaVersion": schema_version,
        },
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False)


def package_output(out_dir: str, output_path: str) -> None:
    """Repackage le dossier de sortie en archive .jwlibrary."""
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as z:
        for fname in os.listdir(out_dir):
            z.write(os.path.join(out_dir, fname), fname)


def finalize_last_modified(db: sqlite3.Connection) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    db.execute("UPDATE LastModified SET LastModified = ?", (now,))
    db.commit()
