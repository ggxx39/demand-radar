# 1-Page Opportunity Brief Template (`opportunity-brief.md`)

> **Usage**: Once an opportunity cluster scores $\ge 75$ on the 8-dimension rubric, complete this 1-page memo BEFORE writing a single line of application code. Keep it strictly to one page (under 600 words).

---

# [Project Code Name]: 1-Page Opportunity Memo

| Field | Details |
| :--- | :--- |
| **Cluster ID** | `cluster-YYYYMMDD-<slug>` |
| **Author / Founder** | `ggxx39` |
| **Date** | YYYY-MM-DD |
| **8-Dim Score** | **XX / 100** (Recommendation: `pursue_immediately`) |
| **Status** | `In Smoke Test` \| `Ready to Build` \| `Killed` |

---

## 1. The Wedge (One Sentence)
> *What is the sharp, single-feature wedge that solves 80% of the pain immediately?*  
> **Example**: "A zero-config GitHub Action that streams Docker cache to Cloudflare R2, cutting CI minutes and build failure rates by 70%."

---

## 2. Target Customer & Watering Holes
- **Primary Persona**: (e.g. Senior Frontend / Fullstack Devs in 3–15 person software houses)
- **Where They Hang Out (Watering Holes)**:
  - Subreddits: `r/...`, `r/...`
  - Discord / Slack Communities: `...`
  - GitHub Repositories / Topics: `...`
  - Search Queries (High Intent): `"how to cache docker in gha without docker hub"`, `"buildx cache miss"`

---

## 3. Evidence Trail & Verbatim Quotes
- **Pain Card References**:
  1. `pain-YYYYMMDD-01`: *"Verbatim quote illustrating acute agony or financial loss."*
  2. `pain-YYYYMMDD-02`: *"Verbatim quote demonstrating existing spend or failed workaround."*
- **Quantified Aggregate Loss**:
  - Time: ~X hours/month per team.
  - Money: $X/month in wasted cloud/CI bills or contractor costs.

---

## 4. Why Incumbents & Workarounds Fail
- **Existing Workaround**: (e.g., Writing 50 lines of custom bash + storing blobs in GitHub Actions cache)
- **Why It Sucks**: (e.g., 10GB hard cache limit, cache eviction policy drops layers randomly, 20min debugging time)
- **Competitive Gap**: (e.g., Enterprise solutions like Depot.dev charge $50+/seat and require transferring all builds to their remote infrastructure; no lightweight self-hosted S3/R2 option exists).

---

## 5. MVP Scope (Max 10 Days Solo Build)
- **Core Feature 1**: (e.g., CLI / Action with 1-line YAML configuration)
- **Core Feature 2**: (e.g., Automated S3 / Cloudflare R2 cache backend)
- **Core Feature 3**: (e.g., PR comment summary of cache hit rate and saved seconds)
- ❌ **Strict Non-Goals (Scope Fence)**:
  - No complex web dashboard / user login (CLI API token only)
  - No team permission hierarchy or multi-org billing in v0.1

---

## 6. Pricing & Unit Economics Hypothesis
- **Pricing Model**: Flat $19/month per active repo OR $0.005 per cached gigabyte.
- **Paywall Point**: Free for open-source repos; requires Stripe license key for private repos.
- **Expected Conversion**: 3 paid customers from the first 50 free pilot users.

---

## 7. Pre-Code Smoke Test (Skin in the Game)
Before building full functionality, how will you prove demand in < 48 hours?
- [ ] **Landing Page / GitHub README Smoke Test**: Publish public repo with CLI docs and mock demo gif.
- [ ] **Call to Action**: "Apply for Early Access / Pre-order lifetime license for $49."
- [ ] **Pass Criteria**: At least 5 qualified developers submit their repo URL or commit to a Zoom setup call.
- [ ] **Kill Criteria**: Zero interest or pushback on payment after 100 unique visits from relevant watering holes.

---

## 8. Final Go / No-Go Signoff
- [ ] Passed 8-dimension score $\ge 75$
- [ ] Zero hard-kill red flags triggered
- [ ] 5 Mom Test interviews completed with verified past behavior
- **Final Decision**: **[ GO / NO-GO / PIVOT ]**  
- **Approved by**: `ggxx39` on `YYYY-MM-DD`
