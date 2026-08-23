# Split collection and ranking pipeline

Daily AI Radar uses two execution environments with separate responsibilities.

1. GitHub Actions runs `collect.yml` at 07:17 Asia/Shanghai. It fetches public
   sources, normalizes every candidate into a `ContentItem`, and commits one
   gzip-compressed snapshot to the `collector` branch. Collection does not call
   an AI provider and does not deliver notifications.
2. Hermes runs at 08:00 Asia/Shanghai. It fetches the dated snapshot, validates
   that it is no more than three hours old, and passes it to Horizon for
   cross-source deduplication, GitHub release bundling, Codex scoring,
   source-grouped ranking, Markdown archival, and Feishu delivery.
3. If the snapshot is absent, corrupt, or stale, Hermes collects the previous
   24 hours locally and adds a visible collection-warning header to the digest.

The raw snapshot is captured before deduplication or AI processing so a day can
be audited and re-ranked without querying the upstream sources again. Snapshot
files use `snapshots/YYYY/MM/YYYY-MM-DD.json.gz` and contain a schema version,
UTC collection window, configuration fingerprint, source fetch report, and all
normalized items.

Only source credentials belong in GitHub Actions secrets:

- `PRODUCT_HUNT_TOKEN` is required for Product Hunt.
- `HF_TOKEN` is optional for Hugging Face.
- `APIFY_TOKEN` is required for Twitter/X collection.
- The workflow-provided `GITHUB_TOKEN` is used for GitHub API access and for
  pushing the snapshot branch.

Codex authentication and Feishu credentials remain on the Hermes host. The
workflow has only `contents: write` permission and never runs for pull requests.
