# Roadmap and Safety Governance

The Roadmap Planner stores bounded local feature proposals, assigns deterministic
priority and release buckets, and never implements work automatically. Safety-
sensitive proposals enter the Safety Review Board.

Reviews preserve history while only the latest decision controls current
eligibility. Critical-risk proposals cannot be approved without design changes
and a new review. All registries and packages use atomic local writes under
ignored `backend/data/` directories.

These workflows never modify GitHub, push code, publish releases, delete files,
or bypass approvals. Run project commands from `~/O.R.I.O.N/`.
