"""Face detection and embedding. The only module that imports cv2.

Two models, both permissively licensed and both small enough to ship in the
image:

* **YuNet** (MIT, ~350KB) finds faces and their five landmarks.
* **SFace** (Apache 2.0, ~37MB) turns an aligned crop into a 128-d embedding.

InsightFace is the more obvious choice and the wrong one: its code is MIT but
its pretrained models are licensed for non-commercial research only.

Everything runs in this process. No image, face, or embedding is sent to a third
party -- which is the honest answer to "where does our data go", and separate
from the question of how consent was obtained.

Models are downloaded by `scripts/fetch_models.py` rather than committed. If
they are missing, `detect` returns no faces and the admin tool falls back to
manual tagging; a missing model degrades the feature instead of breaking it.
"""

import logging
import threading
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"

# The 2026may export replaces YuNet's static height/width with symbolic dims for
# OpenCV 5's graph engine. Both work today; preferring the newer one means an
# opencv bump does not quietly break detection. Either file alone is enough.
DETECTOR_CANDIDATES = (
    "face_detection_yunet_2026may.onnx",
    "face_detection_yunet_2023mar.onnx",
)
RECOGNIZER_FILE = MODEL_DIR / "face_recognition_sface_2021dec.onnx"


def detector_file() -> Path | None:
    for name in DETECTOR_CANDIDATES:
        candidate = MODEL_DIR / name
        if candidate.exists():
            return candidate
    return None


# YuNet's own confidence for "this is a face", distinct from the threshold for
# "this face is that person".
_DETECTION_CONFIDENCE = 0.85

_lock = threading.Lock()
_models: tuple[object, object] | None = None


@dataclass(frozen=True)
class DetectedFace:
    """A face found in an image, with coordinates normalised to 0..1.

    Normalised so the frontend can render the box over any display size without
    knowing the original pixel dimensions.
    """

    box_x: float
    box_y: float
    box_w: float
    box_h: float
    confidence: float
    embedding: list[float]


def models_available() -> bool:
    return detector_file() is not None and RECOGNIZER_FILE.exists()


def _load() -> tuple[object, object] | None:
    """Build the two nets once, on first use.

    Lazily, so importing the app neither costs the load nor fails when the model
    files are absent.
    """
    global _models
    if _models is not None:
        return _models
    detector_path = detector_file()
    if detector_path is None or not RECOGNIZER_FILE.exists():
        return None

    with _lock:
        if _models is None:
            import cv2

            detector = cv2.FaceDetectorYN.create(
                str(detector_path), "", (320, 320), _DETECTION_CONFIDENCE
            )
            recognizer = cv2.FaceRecognizerSF.create(str(RECOGNIZER_FILE), "")
            _models = (detector, recognizer)
    return _models


def image_size(image_bytes: bytes) -> tuple[int, int]:
    """(width, height), needed to lay out normalised boxes before load."""
    import cv2
    import numpy as np

    image = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode this image")
    height, width = image.shape[:2]
    return width, height


def detect(image_bytes: bytes) -> list[DetectedFace]:
    """Every face in the image, each with an embedding ready to match.

    Returns an empty list when the models are absent, so callers do not need to
    special-case an unconfigured install.
    """
    models = _load()
    if models is None:
        logger.warning("Face models missing in %s; skipping detection", MODEL_DIR)
        return []

    import cv2
    import numpy as np

    detector, recognizer = models
    image = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode this image")

    height, width = image.shape[:2]
    detector.setInputSize((width, height))
    _, raw = detector.detect(image)
    if raw is None:
        return []

    faces: list[DetectedFace] = []
    for row in raw:
        # SFace needs a crop aligned on the eyes, not the bare bounding box.
        # alignCrop wants the *whole* 15-value detection row -- box, five
        # landmarks, score. Cropping the box by hand instead produces embeddings
        # that silently fail to match anything.
        aligned = recognizer.alignCrop(image, row)
        embedding = recognizer.feature(aligned).flatten().astype(float)

        # Unit-length, so cosine similarity is a plain dot product and scores
        # are comparable between calls.
        norm = float(np.linalg.norm(embedding))
        if norm > 0:
            embedding = embedding / norm

        x, y, w, h = (float(value) for value in row[:4])
        faces.append(
            DetectedFace(
                # Clamped: YuNet can return a box running slightly off the edge,
                # and the database checks these are within 0..1.
                box_x=max(0.0, min(1.0, x / width)),
                box_y=max(0.0, min(1.0, y / height)),
                box_w=max(0.001, min(1.0, w / width)),
                box_h=max(0.001, min(1.0, h / height)),
                confidence=float(row[-1]),
                embedding=[round(value, 6) for value in embedding.tolist()],
            )
        )
    return faces
