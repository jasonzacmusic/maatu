"""A small, vetted script boundary for common beginner phrases.

The provider must still compose native script. These replacements protect
high-frequency greetings copied from an English ASR question. They preserve
the words/meaning and run before both speech and the displayed transcript.
"""
import re
from livekit.agents import Agent, llm

PHRASES = {
    "hi": [(r"aap\s+kaise\s+hain", "आप कैसे हैं"), (r"main\s+theek\s+hoon", "मैं ठीक हूँ"), (r"namaste", "नमस्ते"), (r"shukriya", "शुक्रिया"), (r"mera\s+naam", "मेरा नाम")],
    "kn": [(r"heg[iy]d{1,2}[ie]{1,2}ra", "ಹೇಗಿದ್ದೀರಾ"), (r"namaska{1,2}ra", "ನಮಸ್ಕಾರ"), (r"naanu\s+chennagid{1,2}ini", "ನಾನು ಚೆನ್ನಾಗಿದ್ದೀನಿ"), (r"nanna\s+hesaru", "ನನ್ನ ಹೆಸರು")],
    "ta": [(r"eppadi\s+iruk{1,2}[iee]{1,3}ngaa?", "எப்படி இருக்கீங்க"), (r"vanak{1,2}am", "வணக்கம்"), (r"naan\s+nalla\s+irukken", "நான் நல்லா இருக்கேன்"), (r"en\s+peru", "என் பேரு")],
}

def normalize_speech(text: str, lang: str) -> str:
    for pattern, native in PHRASES.get(lang, []):
        text = re.sub(r"(?<!\w)" + pattern + r"(?!\w)", native, text, flags=re.I)
    if lang == "kn":
        # 'naavu' is 'we'; a first-person gloss must use 'naanu'.
        text = re.sub(r"ನಾವು(?=\s+(?:means|is)\s+I\b)", "ನಾನು", text, flags=re.I)
    return text.replace("\u2014", ",")

class NativeSpeechAgent(Agent):
    def __init__(self, *, language: str, instructions: str):
        super().__init__(instructions=instructions)
        self.language = language

    async def llm_node(self, chat_ctx, tools, model_settings):
        pending = ""
        async for chunk in Agent.default.llm_node(self, chat_ctx, tools, model_settings):
            if isinstance(chunk, str):
                pending += chunk
            elif isinstance(chunk, llm.ChatChunk) and chunk.delta and chunk.delta.content:
                pending += chunk.delta.content
                if chunk.usage or chunk.delta.tool_calls:
                    meta = chunk.model_copy(deep=True)
                    meta.delta.content = None
                    yield meta
            else:
                yield chunk
            # Complete short sentences let a multiword phrase span provider
            # chunks without a partial Roman quote reaching native TTS.
            while (boundary := re.search(r"(?<=[.!?।])\s+|\n\n", pending)):
                cut = boundary.end()
                yield normalize_speech(pending[:cut], self.language)
                pending = pending[cut:]
        if pending:
            yield normalize_speech(pending, self.language)
