"""
08_generate_all_synthetic.py
Generates synthetic transition matrices for ALL 133 RGINTs.

Delegates to 07_generate_synthetic_matrices.run() with no RGINT filter,
producing webapp/data/rgint_matrix/{rgint_id}.json for every RGINT that
has diagonal data in webapp/data/rgint/.

Run after: 01_load_sources.py (diagonal JSONs must exist in webapp/data/rgint/)
Output:    webapp/data/rgint_matrix/{rgint_id}.json  (up to 133 files)

These are SYNTHETIC matrices. Replace with real data by running 05+06
once the anchor ILUC datasets (2008, 2017, 2024) are available.
"""

import importlib.util
from pathlib import Path


def _load_script(stem):
    path = Path(__file__).parent / f"{stem}.py"
    spec = importlib.util.spec_from_file_location(stem, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    gen = _load_script("07_generate_synthetic_matrices")
    print("Generating synthetic matrices for all RGINTs...")
    n = gen.run()
    print(f"Done. {n} files written to {gen.OUT_DIR}")
    if n < 133:
        print(f"Note: only {n} of 133 RGINTs had diagonal data — run 01_load_sources.py first.")


if __name__ == "__main__":
    main()
