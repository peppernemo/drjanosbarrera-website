#!/usr/bin/env python3
"""Generate search-index.json for the client-side site search.

Run from the repo root after adding/renaming/retitling pages:
    python3 build-search-index.py

One entry per page (all languages). Fields: t (title), d (meta description),
h (h1, only if different from title), u (root-relative URL), l (lang).
script.js fetches this once and filters by the current page's language.
"""
import os, re, json, html

ROOT = os.path.dirname(os.path.abspath(__file__))

TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
DESC_RE  = re.compile(r'<meta\s+name="description"\s+content="(.*?)"', re.S | re.I)
H1_RE    = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S | re.I)
TAG_RE   = re.compile(r"<[^>]+>")


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(TAG_RE.sub(" ", s))).strip()


def lang_of(fn):
    if fn.endswith("-es.html"):
        return "es"
    if fn.endswith("-ht.html"):
        return "ht"
    return "en"


def url_for(relpath, fn):
    d = os.path.dirname(relpath)
    base = "/" + (d + "/" if d else "")
    if fn == "index.html":
        return base
    return base + fn


def main():
    entries = []
    for dp, dirs, files in os.walk(ROOT):
        if "/.git" in dp or "/_build" in dp:
            continue
        for fn in files:
            if not (fn.startswith("index") and fn.endswith(".html")):
                continue
            rel = os.path.relpath(os.path.join(dp, fn), ROOT)
            src = open(os.path.join(dp, fn), encoding="utf-8").read()
            tm, dm, hm = TITLE_RE.search(src), DESC_RE.search(src), H1_RE.search(src)
            title = clean(tm.group(1)) if tm else ""
            disp = title.split("|")[0].strip() or title
            desc = clean(dm.group(1)) if dm else ""
            h1 = clean(hm.group(1)) if hm else ""
            entries.append({
                "t": disp,
                "d": desc,
                "h": h1 if h1 and h1.lower() != disp.lower() else "",
                "u": url_for(rel, fn),
                "l": lang_of(fn),
            })
    entries.sort(key=lambda e: (e["l"], e["u"]))
    out = os.path.join(ROOT, "search-index.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, separators=(",", ":"))
    by = {}
    for e in entries:
        by[e["l"]] = by.get(e["l"], 0) + 1
    print(f"wrote search-index.json: {len(entries)} entries {by}")


if __name__ == "__main__":
    main()
