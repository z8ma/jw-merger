#!/usr/bin/env python3
"""
JW Library backup merger — wrapper vers merge_pkg.
Usage : python3 merge.py <backup_a.jwlibrary> <backup_b.jwlibrary> [output.jwlibrary]

Pour les options avancées : python -m merge_pkg --help
"""
import sys
from pathlib import Path

from merge_pkg import run


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python3 merge.py <backup_a.jwlibrary> <backup_b.jwlibrary> [output.jwlibrary]")
        sys.exit(1)

    path_a = sys.argv[1]
    path_b = sys.argv[2]
    output = sys.argv[3] if len(sys.argv) > 3 else f"{Path(path_a).stem}_merged.jwlibrary"

    print(f"Fusion de :\n  A: {path_a}\n  B: {path_b}\n→ {output}\n")

    stats = run(path_a, path_b, output, progress=lambda msg: print(f"  {msg}", flush=True))
    print(f"\n{stats}")


if __name__ == "__main__":
    main()
