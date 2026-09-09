"""Optional local TTS for languages without a Microsoft neural voice.

Install torch + transformers + scipy if you want Sepedi, isiXhosa, etc. spoken.
Without those packages, those languages still work as text.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

_MODELS: dict[str, tuple] = {}


def speak_mms(text: str, mms_code: str | None) -> bytes | None:
    if not mms_code:
        return None
    import scipy.io.wavfile
    import torch
    from transformers import AutoTokenizer, VitsModel

    if mms_code not in _MODELS:
        repo = f"facebook/mms-tts-{mms_code}"
        model = VitsModel.from_pretrained(repo)
        tokenizer = AutoTokenizer.from_pretrained(repo)
        _MODELS[mms_code] = (model, tokenizer)

    model, tokenizer = _MODELS[mms_code]
    inputs = tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        waveform = model(**inputs).waveform
    data = waveform.squeeze().cpu().numpy()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        path = Path(tmp.name)
    try:
        scipy.io.wavfile.write(path, rate=model.config.sampling_rate, data=data)
        return path.read_bytes()
    finally:
        path.unlink(missing_ok=True)
