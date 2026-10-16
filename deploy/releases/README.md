# Versioned production releases

Each production version has one immutable directory named `vMAJOR.MINOR.PATCH`. Copy `_template`, complete it, and validate it before push.

`CURRENT` contains the exact release package deployed by `main`. Every application release must update it to the new version. Cloud Build validates `CURRENT` before running application tests, so a missing or incomplete package blocks deployment.

The release package owns intent, compatibility decisions, SQL and human-readable evidence. Generated command logs, screenshots, browser reports, secret values and database exports must not be committed.

`v1.0.0` is the production baseline. All later packages preserve production data and use incremental migrations/corrections.
