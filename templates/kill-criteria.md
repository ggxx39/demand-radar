# Predefined Kill Criteria & Anti-Delusion Checklist (`kill-criteria.md`)

> *"Killing an unviable project early is not a failure; it is buying back 3 to 6 months of your finite life to work on something that actually matters."*

---

## 1. The 10 Fatal Red Flags (Automatic Project Termination)

Review this checklist before starting to code and at every milestone. If **any** of the fatal conditions are met without an immediate pivot route, execute the kill procedure.

| # | Fatal Red Flag | Trigger Symptom | Action |
| :-: | :--- | :--- | :-: |
| **1** | **The Polite Compliment Trap** | 10+ people say "Looks great! Cool project!", but 0 people agree to a pre-order, deposit, or pilot install. | 🛑 **KILL** |
| **2** | **The Complaint Sink (Zero Budget)** | High emotional venting on Reddit/Twitter, but users refuse to pay > $10/month and demand everything for free. | 🛑 **KILL** |
| **3** | **The Enterprise Gatekeeper Wall** | The solution requires SOC-2, SAML SSO, or enterprise infosec sign-off before pilot testing can occur. | 🛑 **KILL** |
| **4** | **The Incumbent Free Feature Roadkill** | The core feature is 1 release away from being swallowed by Apple, GitHub, Figma, or AWS as a native free toggle. | 🛑 **KILL** |
| **5** | **The Ephemeral Hack / Upstream Fix** | The pain is caused by a temporary upstream bug that was just merged into the next major version release. | 🛑 **KILL** |
| **6** | **The Unreachable Audience Moat** | You do not know where to find 50 target buyers without spending thousands of dollars on pay-per-click ads. | 🛑 **KILL** |
| **7** | **The Infinite Customization Trap** | Every single interviewed customer needs completely different bespoke logic; no shared standardized workflow exists. | 🛑 **KILL** |
| **8** | **The One-and-Done Churn Abyss** | The problem is solved once (e.g. one-off migration script); zero recurring value or retention. | 🛑 **PIVOT to One-Time Product / KILL SaaS** |
| **9** | **The Solo Execution Deficit** | Building the minimum viable product requires > 30 days of full-time engineering or specialized proprietary AI training. | 🛑 **KILL** |
| **10** | **The Platform Policy Risk** | The entire product relies on scraping private APIs or violates platform Terms of Service (high ban risk). | 🛑 **KILL** |

---

## 2. Quantitative Kill Thresholds

### Phase 1: Signal & Scoring Gate
- [ ] 8-Dimension Weighted Score is $< 60$
- [ ] Paying Intent Score is $< 5$
- [ ] Feasibility Score is $< 4$
- **Verdict**: If any box checked $\rightarrow$ **KILL / ARCHIVE**. Do not proceed to interviews.

### Phase 2: Customer Discovery Gate (The Mom Test)
- [ ] Completed 8 customer discovery interviews.
- [ ] Fewer than 2 interviewees spent either **$100+** or **10+ hours** fixing this problem in the last 60 days.
- **Verdict**: If checked $\rightarrow$ **KILL**. The problem is a minor irritation, not a priority.

### Phase 3: Smoke Test / Presale Gate
- [ ] Published landing page / GitHub prototype / demo video.
- [ ] Reached 200 targeted views via relevant niche communities.
- [ ] Fewer than 5 email signups OR 0 pre-orders / paid deposits within 7 days.
- **Verdict**: If checked $\rightarrow$ **KILL**. Distribution or value proposition has failed.

---

## 3. Official Kill Audit Log (Post-Mortem Record)

When an idea is killed, file a short post-mortem record here to retain institutional wisdom:

```markdown
### Post-Mortem Record: [Project / Opportunity Name]
- **Date Killed**: YYYY-MM-DD
- **Highest Stage Reached**: [Signal | Scoring | Mom Test | Smoke Test]
- **Fatal Red Flag #**: [Flag Number and Description]
- **Total Hours Invested**: [e.g. 14 hours]
- **Total Money Invested**: [e.g. $0]
- **Key Insight Learned**: [1-2 sentences on what this taught you about the market]
- **Status**: Archived into `memory/graveyard/`
```
