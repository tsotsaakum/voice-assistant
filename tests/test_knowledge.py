from src.brain import think
from src.knowledge import (
    LEARNED,
    SKIPPED,
    TEACH_PROMPT,
    find_best_match,
    get_answer_for_question,
    lookup,
    parse_teach_command,
    teach,
)


def test_find_best_match_uses_sixty_percent_cutoff():
    questions = ["hello", "how are you"]
    assert find_best_match("hello", questions) == "hello"
    assert find_best_match("how are you mate", questions) == "how are you"
    assert find_best_match("zzzz", questions) is None


def test_get_answer_for_question():
    kb = {"questions": [{"question": "hello", "answer": "hey there"}]}
    assert get_answer_for_question("hello", kb) == "hey there"
    assert get_answer_for_question("nope", kb) is None


def test_teach_persists_and_fuzzy_lookup():
    teach("hello", "hey there")
    assert lookup("hello") == "hey there"
    assert lookup("hello there") == "hey there"
    teach("how are you", "good thanks for asking")
    assert lookup("how are you mate") == "good thanks for asking"


def test_parse_when_i_say_command():
    assert parse_teach_command("when I say hello, reply hey there") == (
        "hello",
        "hey there",
    )
    assert parse_teach_command("teach: office wifi -> guest-lentswe") == (
        "office wifi",
        "guest-lentswe",
    )
    assert parse_teach_command("hello") is None


def test_think_asks_to_be_taught_then_recalls(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    cid = "teach-chat"
    first = think("what's the canteen special?", "english", conversation_id=cid)
    assert first == TEACH_PROMPT
    second = think("Bunny chow on Thursdays", "english", conversation_id=cid)
    assert second == LEARNED
    third = think("canteen special", "english", conversation_id=cid)
    assert third == "Bunny chow on Thursdays"


def test_skip_does_not_save(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    cid = "skip-chat"
    think("what is the wifi password?", "english", conversation_id=cid)
    assert think("skip", "english", conversation_id=cid) == SKIPPED
    again = think("what is the wifi password?", "english", conversation_id=cid)
    assert again == TEACH_PROMPT


def test_taught_replies_survive_new_chat(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    think("what's the canteen special?", "english", conversation_id="one")
    think("Bunny chow on Thursdays", "english", conversation_id="one")
    other = think("what's the canteen special?", "english", conversation_id="two")
    assert other == "Bunny chow on Thursdays"


def test_conversation_memory_still_isolated(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    think("my name is Akum", "english", conversation_id="named")
    isolated = think("what is my name?", "english", conversation_id="fresh")
    assert "Akum" not in isolated
    assert "do not have your name" in isolated.lower()


def test_explicit_teach_overrides_greeting(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    reply = think("when I say hello, reply hey there", "english", conversation_id="greet")
    assert reply == LEARNED
    assert think("hello", "english", conversation_id="greet") == "hey there"
