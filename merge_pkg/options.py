"""
Options de fusion — c'est le fichier que le dashboard (ou la CLI) manipulera
pour permettre à l'utilisateur de choisir ce qu'il fusionne.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal


# ------------------------------------------------------------------ #
# Options par domaine                                                  #
# ------------------------------------------------------------------ #

@dataclass
class NoteOptions:
    """Contrôle la fusion des notes."""

    # Quelles sources inclure
    sources: Literal["both", "a", "b"] = "both"

    # Stratégie quand deux notes ont le même GUID mais un contenu différent
    conflict_strategy: Literal["concat", "keep_newest", "keep_a", "keep_b"] = "concat"

    # GUIDs à exclure explicitement
    exclude_guids: set[str] = field(default_factory=set)

    # Si renseigné, seuls ces GUIDs sont inclus (liste blanche)
    only_guids: set[str] | None = None

    # Noms d'étiquettes : exclure les notes qui ont l'une de ces étiquettes
    exclude_tags: set[str] = field(default_factory=set)

    # Si renseigné, n'inclure que les notes qui ont au moins une de ces étiquettes
    only_tags: set[str] | None = None

    def should_include(self, guid: str, source: Literal["a", "b"], tag_names: set[str]) -> bool:
        """Retourne True si cette note doit figurer dans la fusion."""
        if self.sources != "both" and self.sources != source:
            return False
        if guid in self.exclude_guids:
            return False
        if self.only_guids is not None and guid not in self.only_guids:
            return False
        if self.exclude_tags and tag_names & self.exclude_tags:
            return False
        if self.only_tags is not None and not (tag_names & self.only_tags):
            return False
        return True


@dataclass
class HighlightOptions:
    """Contrôle la fusion des surlignages (UserMark)."""

    sources: Literal["both", "a", "b"] = "both"

    # Quand deux surlignages différents couvrent exactement le même texte
    conflict_strategy: Literal["keep_with_note", "keep_a", "keep_b"] = "keep_with_note"

    # GUIDs (UserMarkGuid) à exclure
    exclude_guids: set[str] = field(default_factory=set)

    # Choix par publication (KeySymbol → "both"|"a"|"b").
    # Prend le dessus sur `sources` pour les publications listées.
    # Exemple : {"nwt": "a", "w": "both"}
    per_publication: dict[str, Literal["both", "a", "b"]] = field(default_factory=dict)

    def should_include(self, guid: str, source: Literal["a", "b"],
                       key_symbol: str | None = None) -> bool:
        if guid in self.exclude_guids:
            return False
        # Priorité : réglage par publication > réglage global
        if key_symbol and key_symbol in self.per_publication:
            pub_src = self.per_publication[key_symbol]
            if pub_src != "both" and pub_src != source:
                return False
        elif self.sources != "both" and self.sources != source:
            return False
        return True


@dataclass
class AnnotationOptions:
    """Contrôle les métadonnées annexes."""
    include_bookmarks: bool = True
    include_input_fields: bool = True
    # Stratégie pour les InputFields avec contenu différent
    input_conflict_strategy: Literal["concat", "keep_a", "keep_b"] = "concat"


@dataclass
class MediaOptions:
    include_playlists: bool = True


# ------------------------------------------------------------------ #
# Options globales                                                     #
# ------------------------------------------------------------------ #

@dataclass
class MergeOptions:
    """
    Point d'entrée unique pour configurer une fusion.
    Passer une instance à merger.run() pour personnaliser le comportement.
    """
    notes: NoteOptions = field(default_factory=NoteOptions)
    highlights: HighlightOptions = field(default_factory=HighlightOptions)
    annotations: AnnotationOptions = field(default_factory=AnnotationOptions)
    media: MediaOptions = field(default_factory=MediaOptions)

    # Séparateur inséré entre deux contenus texte lors d'un concat
    text_separator: str = "\n\n— — —\n\n"

    @classmethod
    def default(cls) -> "MergeOptions":
        """Fusion complète sans restriction — comportement historique de merge.py."""
        return cls()
