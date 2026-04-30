# phraseGuesser.js — Onboarding & Design History

## What It Does

`guessThePhrase()` maps a Photoshop layer (smart object or text) to an EN phrase from a loaded XLSX translation table — even when the layer isn't inside a correctly-named folder. It's the fallback when direct parent-folder matching (in `parsingLogic.js`) fails.

---

## The Problem

Photoshop PSDs have wildly inconsistent layer hierarchies. A phrase like **"TOTAL CREDITS WON"** might be structured as:

```
outroTotalCreditsWonLandscape        ← "phrase container" (unreliable name)
├── BG                               ← structural noise
├── EN                               ← language folder (noise)
│   └── credits won                  ← phrase sub-folder (partial name!)
│       ├── credits/                 ← word-folder
│       │   └── credits won (SO)     ← the actual layer
│       ├── won/                     ← word-folder
│       │   └── won copy 2 (SO)     ← ← selected layer lives here
│       └── total/                   ← word-folder
│           └── Total Credits (SO)
├── common/                          ← structural noise
├── Slices/                          ← structural noise
└── background/                      ← structural noise
```

The algorithm must figure out that "won copy 2" belongs to the phrase **"TOTAL CREDITS WON"**, not **"CREDITS WON"** or **"TOTAL WON"**.

---

## Algorithm

### Key Insights

1. **Only SO/text layer names are meaningful.** Folder names are always traversed transparently — never collected. This avoids CamelCase scene folder names polluting the compound.

2. **SO/text names are filtered by an 80% phrase-match threshold** (`_nameMatchesSomePhrase`). A name is kept only if ≥ 80% of its words appear in at least one EN phrase. This dismisses noise names like `off` (0/1 match), `doubleChanceOnLandscape` (CamelCase → single token, no match), while keeping `chance` (1/1) and `for bonus` (2/2). The denominator is the candidate's own word count, not `max(...)`, so short but valid names always pass.

3. **Find the container by climbing, not by fixed depth.** Walk up from the layer, collecting the compound of SO/text names at each ancestor level. Keep climbing as long as all words in the compound can be explained by the current best-matching phrase. Stop when a word appears that doesn't belong to any phrase — that word came from a sibling phrase's SO leaking in.

4. **Allow the best-match phrase to upgrade while climbing.** A layer inside `won/` starts with compound `{WON}` → seeds "TOTAL WON". As climbing adds `CREDITS` and `TOTAL`, the phrase upgrades to "TOTAL CREDITS WON" — all words still explained → correct.

### Step-by-step

1. **Find phrase container** (`_findPhraseContainer`): Walk up from the layer's parent toward the document root. At each ancestor:
   - Collect all SO/text layer names recursively via `_collectVocabNames` (folders are transparent; only names passing the 80% threshold are kept).
   - Score the compound against all EN phrases (word-overlap ratio).
   - If score ≥ 0.5: check for **unexplained words** — any compound word not present in the best-match phrase. If found → a sibling phrase leaked in → **stop**, return the previous ancestor (`lastGoodAncestor`).
   - Otherwise: update `lastGoodAncestor = current` and keep climbing.
   - If score drops below 0.5 after seeding → **stop**.
   - Fallback: if nothing ever matched, use depth-2 logic (climb until `current.parent.parent` is null).

2. **Collect ancestor candidates:** Walk up from the layer to the container, collecting non-noise ancestor folder names as individual candidates. E.g., `"won"`, `"credits won"`.

3. **Collect SO/text names from container** (`_collectVocabNames`): Recursively scan the container, collecting SO/text baseNames (with "copy N" stripped) that pass the 80% phrase-match threshold. All names are deduplicated (case-insensitive). Result is joined into a single compound candidate.

4. **Score candidates:** Each candidate is normalized (uppercase, strip `(...)` and `[...]`) and scored against each EN phrase using **word-overlap ratio** = `shared_words / max(words_in_candidate, words_in_phrase)`. Ties broken by absolute shared-word count.

5. **Return best match** if score ≥ 0.5.

### Why Unexplained-Words Stops at the Right Place

```
buttons
└── Landscape
    ├── buyBonusBtn
    │   └── buyFeatureOff
    │       └── EN
    │           ├── BONUS (SO)   ← vocab word
    │           └── BUY (SO)     ← vocab word
    └── doubleChanceBtn
        └── doubleChanceOffLandscape
            └── txt only
                └── EN
                    ├── x2 (SO)
                    ├── for bonus (SO)
                    └── chance (SO)   ← selected layer
```

Walking up from `chance`:
| Level | Compound | Best match | Unexplained? | Action |
|---|---|---|---|---|
| `EN` | `{X2, FOR BONUS, CHANCE}` | "X2 CHANCE FOR BONUS" 1.0 | none | advance |
| `txt only` | same | same | none | advance |
| `doubleChanceOffLandscape` | same | same | none | advance |
| `doubleChanceBtn` | same | same | none | advance |
| `Landscape` | adds `BUY` | "X2 CHANCE FOR BONUS" | `BUY` not in phrase | **STOP** |

Returns `doubleChanceBtn` ✓

### Scoring Tiebreaker — Why It Matters

Without the `bestShared` tiebreaker, `"credits won"` (2 words, ratio 1.0 vs "CREDITS WON") would beat `"credits\nwon\ntotal"` (3 words, ratio 1.0 vs "TOTAL CREDITS WON") because the algorithm used strict `>`. The tiebreaker ensures more-specific matches win.

---

## Important UXP/Photoshop Gotchas

- **`child.layers` is unreliable:** Collapsed/unexpanded groups may have `undefined` or empty `.layers` in UXP. Never use this as the sole check for "is this a folder."
- **`child.kind` is unreliable for groups:** Groups with effects or certain internal states may not report `LayerKind.GROUP`. The current code avoids relying on kind for folder detection entirely.
- **Photoshop layer order:** `group.layers` returns bottom-to-top order. We reverse to get top-down (document panel order).
- **"copy N" suffix:** Photoshop auto-appends `copy`, `copy 2`, etc. when duplicating layers. Always strip this before matching.

---

## Noise Detection

`_NOISE_NAMES` (`BG`, `SLICES`, `BACKGROUND`, all language codes) and `Group N` patterns are still defined but **no longer used inside `_collectVocabNames`** — all non-translatable children are now treated uniformly as transparent containers. The noise set is kept for the ancestor-candidates walk in `_buildPhraseCandidates`, which skips noise folder names when building individual ancestor candidates.

---

## File Dependencies

- **`parsingLogic.js`** calls `guessThePhrase()` as a fallback when direct parent-folder matching fails. If the guess returns `null`, `parsingLogic` shows `app.showAlert("Parent folder does not match any EN phrase.")`.
- **`parseRawPhrase()`** from `parsingLogic.js` is used to extract the translated phrase from the XLSX data (handles `"strict"` mode parsing).
- **`globals.js`** provides the `photoshop` API object and `constants.LayerKind`.
