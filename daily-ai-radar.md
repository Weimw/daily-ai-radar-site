# Daily AI Radar operations

This private deployment uses Horizon for collection and analysis, Hermes cron for scheduling, and Hermes's configured Feishu home channel for delivery. GitHub Pages and Horizon's direct webhook delivery are intentionally disabled.

## Runtime configuration

The committed, credential-free configuration is `data/config.hermes.json`. The runner copies it to the ignored `data/config.json` immediately before each run.

Project diversity is enabled with a one-item-per-project limit. Multiple GitHub
release tags from the same repository are condensed into one scored digest
candidate, and the rendered item retains links to every included release.

GitHub coverage uses a manually approved allowlist of 16 canonical AI projects.
Plugins, secondary language bindings, examples, learning resources, companion
utilities, and incidental starred repositories are excluded. New repositories
require explicit review and a committed configuration change. Repository stars,
forks, license, and release channel are supplied to scoring; the compact digest
displays the adoption and release signals.

Codex alpha releases and TensorRT-LLM release candidates are included. All
other repositories are stable-only, including Gemini CLI, whose nightly builds
are intentionally excluded.

The private digest uses all-item compact mode: profile score thresholds and
semantic topic removal do not hide candidates, sections are source families,
and every candidate is ranked by first-pass analysis score. Compact mode skips
the more expensive enrichment pass.

The ranking and summarization backend is the locally installed Codex CLI,
explicitly pinned to `gpt-5.6-terra`. It uses the host's existing ChatGPT
sign-in, runs each completion as an ephemeral read-only task, and does not
require an OpenAI or DeepSeek API key. Verify the host session with
`codex login status` before relying on the schedule.

Required source credentials live in `~/.hermes/.env` and must never be committed:

- `PRODUCT_HUNT_TOKEN`
- `APIFY_TOKEN` (also configured as a GitHub Actions secret for collection)

`HF_TOKEN` is optional for public Daily Papers access.

Twitter/X monitors OpenAI, Anthropic, Google DeepMind, and Andrej Karpathy via
Apify. OpenBB uses the credential-free `yfinance` provider for a compact
AI-megacap watchlist: NVDA, MSFT, GOOGL, META, AMZN, AMD, and TSM. SEC filings
remain disabled to avoid flooding the daily digest.

`GITHUB_TOKEN` is obtained from the existing host `gh` login when it is not
already provided by the Hermes environment. It authenticates repository and
release metadata requests and raises the GitHub API rate limit.

## Schedule

The installed wrapper under `~/.hermes/scripts/daily-ai-radar.sh` calls `scripts/run-daily-ai-radar.sh`. The Hermes job is a no-agent job scheduled for `0 8 * * *` in the configured Asia/Shanghai timezone and delivers stdout to `feishu`.

Useful checks:

```bash
hermes cron list --all
hermes cron status
hermes cron runs
```

## Archive and failure behavior

Successful runs write `digests/YYYY/MM/YYYY-MM-DD.md`, commit that one file, and push `main` to the private `origin`. Diagnostics go to stderr so Feishu receives only the digest.

If GitHub push fails after generation, Feishu still receives the digest with an archive warning and the local commit remains available for retry. A collection or generation failure emits a short failure notice and a non-zero durable Hermes run.

## Upstream updates

The public Horizon repository is the `upstream` remote. Review and test upstream changes before merging them into private `main`; do not automatically merge upstream from the daily job.
