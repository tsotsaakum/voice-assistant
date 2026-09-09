"""Wake word placeholder. Browser mic is used today; this is for a later desktop loop."""

WAKE_WORDS = ("lentswe", "hey lentswe", "hello lentswe")


def is_wake(text: str) -> bool:
    lowered = text.lower().strip()
    return any(word in lowered for word in WAKE_WORDS)

def strip_wake(text: str) -> str:
    leftover = text.strip()
    lowered = leftover.lower()
    for word in sorted(WAKE_WORDS, key=len, reverse=True):
        index = lowered.find(word)
        if index != -1:
            leftover = leftover[:index] + leftover[index + len(word) :]
            return leftover.strip(" ,.")
    return leftover 