# Maintenance and Patch Release Workflows

O.R.I.O.N. provides a local known-issue tracker and a manual patch workflow.
Issue input is bounded and normalized, state files are written atomically, and
status reads do not create files.

Patch versions use `v6.2.N`, patch types are restricted to maintenance, bugfix,
or hotfix, and packaging requires an active workflow. Neither workflow modifies
GitHub, pushes code, publishes a release, deletes user files, or bypasses approval.

Generated state and reports remain in ignored `backend/data/` directories. Run
commands from `~/O.R.I.O.N/` and review every artifact before manual release work.
