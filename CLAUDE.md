# CLAUDE.md

## Knowledge base

- Never update the knowledge base (`kb/` and everything in it: `architecture/`, `modules/`, `platform/`, `template/`) unless the user explicitly asks for it in the current request.
- This applies even when an OpenSpec proposal, design or task says to update a `kb/` document. Leave the document unchanged and tell the user which update was skipped, so they can ask for it.
- Reading `kb/` is always allowed.
