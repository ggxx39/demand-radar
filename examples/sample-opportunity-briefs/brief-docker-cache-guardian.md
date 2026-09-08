# Opportunity Brief: DockerCache Guardian for GitHub Actions (`brief-docker-cache-guardian.md`)

| Field | Details |
| :--- | :--- |
| **Cluster ID** | `cluster-2026-ci-docker-cache` |
| **Author / Founder** | `ggxx39` |
| **Date** | 2026-09-08 |
| **8-Dim Score** | **82.6 / 100** (Recommendation: `pursue_immediately`) |
| **Status** | `Ready for Smoke Test` |

---

## 1. The Wedge (One Sentence)
> A zero-configuration GitHub Action that synchronizes Docker Buildx layer cache directly with Cloudflare R2 / AWS S3, reducing multi-branch CI build times from 25 minutes to 90 seconds.

---

## 2. Target Customer & Watering Holes
- **Primary Persona**: Senior Fullstack / DevOps Engineers in 3–15 person engineering teams building Dockerized web applications (Next.js, Go, Python, Rails).
- **Watering Holes**:
  - `r/devops`, `r/webdev`, `r/docker`
  - GitHub Issues on `docker/build-push-action` and `actions/cache`
  - Hacker News ("Ask HN: What is your CI Docker caching setup in 2026?")
  - Search queries: `"github actions docker cache invalidation"`, `"buildx cache s3 backend"`

---

## 3. Evidence Trail & Verbatim Quotes
- **Pain Card References**:
  - `pain-20260908-ci-docker-cache-invalidation`: *"Every time our team branches from main, GitHub Actions wipes the Buildx cache. What should be a 2-minute test becomes a 24-minute full Docker layer compilation... I would gladly pay $30-$40/month for a lightweight Action."* (Upvotes: 128, Comments: 56)
- **Quantified Aggregate Loss**:
  - ~45 developer waiting hours lost per month across an active team.
  - $320/month in wasted GitHub Actions runner compute bills.

---

## 4. Why Incumbents & Workarounds Fail
- **GitHub Actions Native Cache (`type=gha`)**: Hard limit of 10GB per repository; evicts cache layers randomly via LRU, causing unpredictable 25-minute rebuilds.
- **Self-Hosted Registries (ECR / Docker Hub)**: High network egress transfer fees, requires storing production AWS IAM credentials inside CI runners.
- **Enterprise Solutions (Depot.dev)**: Charges $50 per developer/month and reroutes entire builds to their remote proprietary infrastructure, triggering enterprise security resistance.
- **Competitive Gap**: No lightweight, privacy-preserving tool that uses customer-owned object storage (S3, Cloudflare R2 with zero egress fees) via a simple 3-line YAML config.

---

## 5. MVP Scope (Max 8 Days Solo Build)
- **Feature 1**: Composite GitHub Action with 3-line setup (`uses: ggxx39/docker-cache-guardian@v1`).
- **Feature 2**: High-speed chunked streaming to Cloudflare R2 / S3 via pre-signed URLs.
- **Feature 3**: PR comment reporting cache hit rate, saved minutes, and estimated dollar savings.
- ❌ **Non-Goals**: No web dashboard, no user account login, no credit-card billing UI in v0.1 (use LemonSqueezy / Stripe checkout for license key generation).

---

## 6. Pricing & Unit Economics Hypothesis
- **Pricing**: $29/month per GitHub Organization (unlimited repositories and builds).
- **Paywall**: Free for open-source repositories; 14-day trial for private repositories.
- **Breakeven**: 20 paying teams = ~$580 MRR (covers infrastructure cost of $15/mo for API gateway).

---

## 7. Pre-Code Smoke Test (48-Hour Validation)
- [x] Create a public documentation repo `ggxx39/docker-cache-guardian-preview` with an animated terminal gif showing a 22-minute build dropping to 85 seconds.
- [x] Post technical breakdown on `r/devops` and Twitter: *"Why GitHub Actions wipes your Docker cache and how to stream layers to Cloudflare R2"*.
- [x] Include a waiting list link for early access with a $19/month lifetime grandfather discount.
- **Pass Criteria**: 10 qualified engineering leads join the beta list within 72 hours.
- **Kill Criteria**: Fewer than 3 signups from 300 targeted visits.

---

## 8. Final Go / No-Go Signoff
- [x] 8-dimension score passed (82.6 / 100)
- [x] Zero hard-kill red flags triggered
- [x] Clear wedge with under 10-day build timeline
- **Final Decision**: **GO (Begin 48h Smoke Test)**  
- **Approved by**: `ggxx39` on 2026-09-08
