"""Download the two face models into backend/models/.

Run once after `uv sync`:

    uv run python scripts/fetch_models.py

They are not committed: SFace is ~37MB, and a binary that large in git history
is a tax on everyone forever. The Dockerfile runs this at build time so the
image ships with them.

Both come from OpenCV's own model zoo. YuNet is MIT, SFace is Apache 2.0 -- both
usable in a product, unlike InsightFace's pretrained models, which are licensed
for non-commercial research only.
"""

import sys
import urllib.request
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"

# The zoo stores these via git-lfs, so fetch from the media host: the plain
# raw.githubusercontent URL returns an LFS pointer file, and OpenCV then fails
# with an unhelpful "cannot load network" error.
BASE = "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models"
_YUNET = "face_detection_yunet_2026may.onnx"
_SFACE = "face_recognition_sface_2021dec.onnx"
MODELS = {
    _YUNET: f"{BASE}/face_detection_yunet/{_YUNET}",
    _SFACE: f"{BASE}/face_recognition_sface/{_SFACE}",
}

# An LFS pointer is a few hundred bytes; a real model is hundreds of KB at least.
MIN_PLAUSIBLE_BYTES = 100_000


def main() -> int:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    for name, url in MODELS.items():
        target = MODEL_DIR / name
        if target.exists() and target.stat().st_size > MIN_PLAUSIBLE_BYTES:
            print(f"  ok    {name} ({target.stat().st_size // 1024}KB)")
            continue

        print(f"  fetch {name} ...", flush=True)
        try:
            urllib.request.urlretrieve(url, target)  # noqa: S310 -- constant https URL
        except OSError as exc:
            print(f"  FAIL  {name}: {exc}", file=sys.stderr)
            return 1

        size = target.stat().st_size
        if size < MIN_PLAUSIBLE_BYTES:
            target.unlink()
            print(f"  FAIL  {name}: got {size} bytes, likely an LFS pointer", file=sys.stderr)
            return 1
        print(f"  done  {name} ({size // 1024}KB)")

    print(f"\nModels ready in {MODEL_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
