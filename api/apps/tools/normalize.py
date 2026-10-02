"""Persian text normaliser (server port of ``web/src/features/toolbox/matn-farsi/logic.ts``).

Same conservative rule set and the same rule ids, so the terminal command and the browser tool
produce identical output. Keep the lists in sync with the TypeScript module — a parity test
(``test_normalize_parity_with_client_examples``) pins the shared examples.
"""

import re

RULES_VERSION = "1404.07-r1"
ZWNJ = "\u200c"

PERSIAN_LETTER = "\u0621-\u0628\u062a-\u063a\u0641-\u064a\u066e-\u06d3\u06fa-\u06ff"
_LETTERS = f"[{PERSIAN_LETTER}]"

MI_EXCEPTIONS = (
    "میز", "میزان", "میراث", "میرا", "میر", "میوه", "میهن", "میدان", "میانه", "میان",
    "میلیون", "میلیارد", "میلیمتر", "میکرو", "میکروسکوپ", "میگو", "میخ", "میخانه",
    "میم", "مینا", "میمنت", "میانگین", "میلی", "میدانی", "میرزا", "میهنی",
)
SUFFIXES = (("ترین", 3), ("هایی", 2), ("های", 2), ("ها", 2), ("تر", 3))
SUFFIX_EXCEPTIONS = (
    "دختر", "دفتر", "اختر", "بستر", "کبوتر", "دکتر", "مستر", "کشور", "بهتر", "مهتر",
    "کهتر", "استر", "دفترها", "دخترها", "کشورها",
)
RA_EXCEPTIONS = ("زهرا", "عذرا", "دارا", "چرا", "برای", "زیرا", "حاشا")

RULE_IDS = ("yeh", "kaf", "digits", "latin-digits", "diacritics", "zwnj", "spaces", "quotes", "ra", "kashida")
DEFAULT_RULES = ("yeh", "kaf", "digits", "diacritics", "zwnj", "spaces", "quotes", "ra", "kashida")

PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"


def _to_persian_digits(value: str) -> str:
    return value.translate(str.maketrans("0123456789", PERSIAN_DIGITS))


def _extract_samples(before: str, after: str, limit: int = 3):
    if before == after:
        return []
    samples = []
    length = max(len(before), len(after))
    index = 0
    while index < length and len(samples) < limit:
        left = before[index] if index < len(before) else ""
        right = after[index] if index < len(after) else ""
        if left != right:
            start = max(0, index - 12)
            end = min(length, index + 18)
            samples.append(f"{_visible(before[start:end])} → {_visible(after[start:end])}")
            index += 12
        else:
            index += 1
    return samples


def _visible(value: str) -> str:
    return value.replace(ZWNJ, "⌴").replace("\n", "⏎")


def _apply_yeh(text: str):
    new = re.sub(r"[\u064a\u0649]", "ی", text)
    return new, len(re.findall(r"[\u064a\u0649]", text))


def _apply_kaf(text: str):
    count = text.count("\u0643")
    return text.replace("\u0643", "ک"), count


def _apply_digits(text: str):
    matches = re.findall(r"[\u0660-\u0669]", text)
    return re.sub(r"[\u0660-\u0669]", lambda m: PERSIAN_DIGITS[ord(m.group()) - 0x0660], text), len(matches)


def _apply_latin_digits(text: str):
    matches = re.findall(r"\d", text)
    return re.sub(r"\d", lambda m: PERSIAN_DIGITS[int(m.group())], text), len(matches)


def _apply_diacritics(text: str):
    matches = re.findall(r"[\u064b-\u0655\u0670]", text)
    return re.sub(r"[\u064b-\u0655\u0670]", "", text), len(matches)


def _apply_kashida(text: str):
    matches = re.findall(r"\u0640+", text)
    return re.sub(r"\u0640+", "", text), len(matches)


def _apply_zwnj(text: str):
    before = text
    current = text

    for prefix in ("می", "نمی"):
        pattern = re.compile(rf"(^|[^{PERSIAN_LETTER}]){prefix}(?!{ZWNJ})([{PERSIAN_LETTER}]{{3,}})")

        def prefix_replacer(match: re.Match) -> str:
            lead, rest = match.group(1), match.group(2)
            word_match = re.match(rf"[{PERSIAN_LETTER}]+", rest)
            word = word_match.group(0) if word_match else ""
            token = prefix
            if any((token + word).startswith(exception) for exception in MI_EXCEPTIONS):
                return match.group(0)
            return f"{lead}{token}{ZWNJ}{rest}"

        current = pattern.sub(prefix_replacer, current)

    for suffix, min_stem in SUFFIXES:
        pattern = re.compile(rf"([{PERSIAN_LETTER}]{{{min_stem},}})(?!{ZWNJ})({suffix})(?![{PERSIAN_LETTER}])")

        def suffix_replacer(match: re.Match, suffix=suffix) -> str:
            stem, tail = match.group(1), match.group(2)
            if stem + tail in SUFFIX_EXCEPTIONS:
                return match.group(0)
            if suffix == "تر" and len(stem + tail) < 4:
                return match.group(0)
            return f"{stem}{ZWNJ}{tail}"

        current = pattern.sub(suffix_replacer, current)

    current = re.sub(rf"{ZWNJ}{{2,}}", ZWNJ, current)
    current = re.sub(rf" ?{ZWNJ} ", ZWNJ, current)
    current = re.sub(rf" {ZWNJ}", ZWNJ, current)
    count = abs(current.count(ZWNJ) - before.count(ZWNJ))
    if count == 0 and current != before:
        count = 1
    return current, count


def _apply_spaces(text: str):
    current = re.sub(r"[ \t]+", " ", text)
    current = re.sub(r" ?\n ?", "\n", current)
    current = re.sub(r"\n{3,}", "\n\n", current).strip()
    current = re.sub(r" ([.,،؛:!؟»%])", r"\1", current)
    current = re.sub(r"([«(]) ", r"\1", current)
    current = re.sub(rf"([.,،؛:!؟])(?=[{PERSIAN_LETTER}])", r"\1 ", current)
    current = re.sub(rf" ?{ZWNJ} ?", ZWNJ, current)
    return current, (0 if current == text else 1)


def _apply_quotes(text: str):
    state = {"open": True, "count": 0}

    def pair(_match: re.Match) -> str:
        char = "«" if state["open"] else "»"
        state["open"] = not state["open"]
        state["count"] += 1
        return char

    current = re.sub(r'["“”„‟]', pair, text)

    def single(match: re.Match) -> str:
        state["count"] += 1
        return f"{match.group(1)}{ZWNJ}{match.group(2)}"

    current = re.sub(rf"([{PERSIAN_LETTER}])[\u2019']([{PERSIAN_LETTER}])", single, current)

    def drop(_match: re.Match) -> str:
        state["count"] += 1
        return ""

    current = re.sub(r"[\u2018\u2019']", drop, current)
    return current, state["count"]


def _apply_ra(text: str):
    pattern = re.compile(rf"([{PERSIAN_LETTER}]{{3,}})(را)(?=[\s.,،؛:!؟»)]|$)")

    def replacer(match: re.Match) -> str:
        stem = match.group(1)
        if stem + "را" in RA_EXCEPTIONS:
            return match.group(0)
        return f"{stem} را"

    new = pattern.sub(replacer, text)
    return new, len(pattern.findall(text))


_RULES = {
    "yeh": _apply_yeh,
    "kaf": _apply_kaf,
    "digits": _apply_digits,
    "latin-digits": _apply_latin_digits,
    "diacritics": _apply_diacritics,
    "zwnj": _apply_zwnj,
    "spaces": _apply_spaces,
    "quotes": _apply_quotes,
    "ra": _apply_ra,
    "kashida": _apply_kashida,
}


def normalize_persian(text: str, enabled=None):
    enabled = set(enabled if enabled is not None else DEFAULT_RULES)
    current = text
    changes = []
    for rule_id in RULE_IDS:
        if rule_id not in enabled:
            continue
        before = current
        after, count = _RULES[rule_id](before)
        current = after
        if after != before and count > 0:
            changes.append({"rule": rule_id, "count": count, "samples": _extract_samples(before, after)})
    total = sum(change["count"] for change in changes)
    return {"normalized": current, "changes": changes, "total": total, "rules_version": RULES_VERSION}


assert set(_RULES) == set(RULE_IDS)
