# The Mom Test Interview Script & Question Bank (`mom-test-questions.md`)

> *"You shouldn't ask anyone whether your business is a good idea. It's a bad question, because everyone will lie to you a little bit."* — Rob Fitzpatrick, *The Mom Test*

---

## 1. Golden Rules of Validation Interviews

1. **Never mention your solution, prototype, or idea.** Once you pitch, their brain switches from honest memory to polite encouragement.
2. **Anchor exclusively in past, real behavior.** Disregard all future promises ("I would definitely buy that"). Listen only to what they actually did last week.
3. **Hunt for money, time, and emotional loss.** If they haven't spent money or hours hacking a solution already, it is not an acute pain.
4. **Talk 10%, listen 90%.** Embrace awkward pauses. When the user hesitates, let silence prompt them to share the messy reality.

---

## 2. Bad Questions vs. Good Questions

| ❌ Lethal / Biased Question (Guaranteed False Positive) | ✅ Mom-Test Compliant Question (Unearths Ground Truth) | Why? |
| :--- | :--- | :--- |
| "Do you think an AI tool that syncs Figma with code is a good idea?" | "When was the last time you updated design tokens in production? Walk me through what happened step-by-step." | Replaces hypothetical opinion with actual episodic memory. |
| "Would you pay $20/month for a tool that fixes this?" | "What are you currently paying for or using to prevent this problem right now?" | Hypothetical money is free; existing line-item budgets are real. |
| "How often do you struggle with Docker cache in CI?" | "Can you pull up your CI dashboard or git commit log from last sprint? How many builds failed or timed out?" | Eliminates recall bias; grounds in verifiable telemetry. |
| "Would you love a dashboard that summarizes everything?" | "What did you do after that happened? Who did you have to message?" | Uncovers the true friction chain and internal stakeholder drama. |

---

## 3. The 20-Minute Discovery Interview Script

### Stage 1: Warmup & Role Context (2 minutes)
- *"Thanks so much for taking 15 minutes. I'm doing research on how developer teams handle CI pipelines and build caches. Not selling anything at all."*
- *"To make sure I have the right context, what does your team's stack look like, and what are you personally responsible for shipping day-to-day?"*

### Stage 2: Digging into the Pain Incident (8 minutes)
- *"When was the last time you ran into [specific problem: e.g. Docker cache busting / token sync / receipt chaos]? Walk me through that specific day."*
- *"What was the immediate symptom that alerted you to it?"*
- *"What were you trying to achieve right before it broke?"*
- *"What made that particularly frustrating or difficult?"*
- *(Follow-up probe)*: *"Why was that a big deal? What would have happened if you just ignored it?"*

### Stage 3: Workaround & Cost Auditing (5 minutes)
- *"How did you end up solving or working around it?"*
- *"How long did you spend fixing it?"*
- *"What tools or scripts did you stitch together to keep it moving?"*
- *"What do you dislike most about that workaround?"*
- *"Has anyone else on your team tried to fix this before?"*

### Stage 4: Current Spend & Alternative Tools (3 minutes)
- *"Have you looked for commercial tools or open-source libraries to handle this?"*
- *"If yes: What did you try, and why didn't you stick with it?"*
- *"If no: What made you decide to stick with the duct-tape workaround rather than shopping for a tool?"*
- *"Are you currently paying for any SaaS subscriptions or cloud add-ons connected to this workflow?"*

### Stage 5: The Commitment Gate (2 minutes)
> **Crucial Rule**: Never ask "Can I email you when we build it?" Ask for skin in the game.
- *"I'm writing up a benchmark teardown of how 10 teams solve this exact cache bottleneck. Would you like me to share the anonymized data with you?"*
- *"Who is the one person you know who suffers from this even worse than you do? Would you mind introducing me?"*
- *(Skin-in-the-game ask)*: *"If we build a private CLI alpha that plugs into your repo next month, would you be willing to run it on a staging branch with me on Zoom?"*

---

## 4. Cold Outreach Templates (Getting 10 Interviews)

### Channel: Reddit DM / Comment Reply
```text
Hey [Username], saw your comment on r/[Subreddit] about [specific quote/pain: e.g. Figma variables drifting in CSS].
I'm an indie engineer doing an engineering research teardown on why design handoff tools break down at this exact step.
Not selling anything, zero pitch.
Would you be open to a 12-minute chat (or even async in DMs) about how your team currently handles that workaround?
Happy to share the teardown document with you once done.
```

### Channel: GitHub Issue / Discussion
```text
Hi @[Username] — noticed your issue on [Repo] regarding [error/bottleneck].
I'm researching how teams are working around this limitation before upstream merges a fix.
Could I ask you 3 quick questions about how you resolved this in your project?
1. Did your workaround hold up in production?
2. What broke first when traffic scaled?
3. Did you end up paying for a third-party service?
```
