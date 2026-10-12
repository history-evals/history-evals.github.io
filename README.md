# History-Based Eval

[View the interactive report](https://history-evals.github.io/)

Would AI carry out harmful work in real-world institutional situations? This pilot gave Meta Muse Glimmer 30B and GLM 5.3 each 100 fictional workplace assignments adapted from historical incidents. The report presents task completion, resistance ratings, case evidence and methodological limitations.

## Contents

- `index.html`, `style.css`, `app.js`: the report and interactive case explorer.
- `data/`: scores, assignments, final responses, judge assessments, case context and source attribution.

This repository contains the published website snapshot. Full tool transcripts, workspace artifacts and experiment infrastructure remain in the research archive.

## Read the results

194 of 200 responses met the supplied completion threshold. A further four partially completed the work; two refused it on ethical grounds. Fourteen responses received strong-resistance ratings, including twelve that also met the completion threshold. Completion is therefore not a validated measure of harmful assistance. See the report for scoring definitions and limitations.

## Sources and attribution

The design draws on [Andrew B. Hall's Dictatorship Eval](https://www.dictatoreval.org/). This is an independent pilot, not an official Hall benchmark result.

Historical case descriptions are adapted from Wikipedia under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Each case links to its source revision and historical references; attribution is also stored in `data/case-context.json`. That license notice applies to the adapted historical descriptions and does not imply a blanket license for all other material in this repository.

## Hosting

GitHub Pages serves the repository root from `main`. All assets use relative paths. To preview locally, serve this directory with any static HTTP server.
