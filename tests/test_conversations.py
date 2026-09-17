from src.brain import think
from src.conversations import (
    SESSION_ENDED,
    end_conversation,
    get_or_create,
    is_name_question,
    parse_stated_name,
    public_payload,
    remembered_name,
    snapshot,
)


def test_parse_stated_name():
    assert parse_stated_name("my name is Akum") == "Akum"
    assert parse_stated_name("Call me Deep Jain") == "Deep Jain"
    assert parse_stated_name("what is my name?") is None


def test_name_question_ignores_identity_and_statements():
    assert is_name_question("what is my name?")
    assert is_name_question("do you remember my name")
    assert not is_name_question("what is your name?")
    assert not is_name_question("my name is Akum")


def test_conversations_are_isolated():
    one = get_or_create("alpha")
    two = get_or_create("beta")
    one.append("user", "my name is Akum")
    assert remembered_name(one.chat_history()) == "Akum"
    assert remembered_name(two.chat_history()) is None
    assert snapshot("alpha")["turn_count"] == 1
    assert snapshot("beta")["turn_count"] == 0


def test_ended_session_rejects_think(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    conv = get_or_create("done-chat")
    end_conversation(conv.conversation_id)
    reply = think("hello", "english", conversation_id=conv.conversation_id)
    assert reply == SESSION_ENDED


def test_think_remembers_name_without_client_history(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    cid = "akum-chat"
    first = think("my name is Akum", "english", conversation_id=cid)
    assert "Akum" in first
    second = think("what is my name?", "english", conversation_id=cid)
    assert "Akum" in second
    other = think("what is my name?", "english", conversation_id="fresh-chat")
    assert "Akum" not in other
    assert "do not have your name" in other.lower()


def test_public_payload_hides_system_prompt():
    conv = get_or_create("shown")
    conv.append("user", "hi")
    conv.append("assistant", "hello")
    payload = public_payload(conv)
    assert payload["active"] is True
    assert all(m["role"] in {"user", "assistant"} for m in payload["messages"])
