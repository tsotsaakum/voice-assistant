"""Short-term chat memory for one session."""


class Memory:
    def __init__(self, limit: int = 16):
        self.limit = limit
        self.turns: list[dict] = []

    def add(self, role: str, content: str) -> None:
        self.turns.append({"role": role, "content": content})
        self.turns = self.turns[-self.limit :]

    def history(self) -> list[dict]:
        return list(self.turns)

    def clear(self) -> None:
        self.turns = []

    def last(self) -> dict | None:
        if not self.turns:
            return None
        return self.turns[-1]
        
    
