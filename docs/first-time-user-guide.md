# O.R.I.O.N. — first-time user and trainer guide

Use this guide with the 6.7.0 development application. The systematic operator handbook is available under **System → User guide**: workspace workflow, empty approvals, mission execution, security profiles, production boundaries, every sidebar option and recovery. No technical knowledge is required for the learning exercises after an administrator has installed and configured the application.

## What the application does

O.R.I.O.N. helps you discuss an objective, organize a mission into steps, review proposed actions, and inspect results. **Aurora OS** is the interface. The **backend** stores records, talks to the AI provider and enforces policy. A **workspace** is a project folder you have explicitly trusted. A **tool** is a capability the assistant can request. An **approval** is your permission for a specific action—not proof that it has already succeeded.

Local-first does not mean offline-only. Chat and optional semantic search may send selected information to an external AI provider. Never use credentials, financial records, confidential work or private personal information in training examples. Do not assume an AI answer is correct; inspect its evidence.

## Administrator: install and start the web application

For macOS or Linux, install Python with `venv`, Node.js/npm and Git first. CI validates Python 3.12 and Node.js 22. Rust is needed for desktop packaging, not for the web application. Windows desktop packages remain preview targets; do not promise a supported Windows installation based on these shell instructions.

For a new clone:

```sh
cd ~
git clone https://github.com/VidulaWickramasinghe/O.R.I.O.N.git O.R.I.O.N
cd ~/O.R.I.O.N
./scripts/setup_orion.sh
```

For an existing checkout, open that folder in IntelliJ and use its Terminal tab. Do not clone over an existing folder or delete its data. The examples use `~/O.R.I.O.N`; if your checkout is elsewhere, open a terminal in that actual folder.

An administrator adds the provider key to `backend/.env` using the editor. This file is private and ignored by Git. Do not enter the key in chat, memory, the browser address bar or a shell command that saves it in history. Provider billing and model access are separate from application installation. Without a valid provider key you can still inspect the UI, create plans and review local records, but AI execution is unavailable.

Start both services in one terminal:

```sh
cd ~/O.R.I.O.N
./scripts/start_orion.sh
```

Open **http://localhost:3000** in a browser. Wait for **Backend connected** in the top bar. Detailed authentication and work state is now in **Analytics → Live operations**, not a persistent bar on every page. Leave the terminal running. To verify the API from another terminal:

```sh
cd ~/O.R.I.O.N
./scripts/verify_api.sh
```

This check negotiates the same local session as the frontend. It prints endpoint results, never the token. A browser visit to `http://127.0.0.1:8000/` can correctly return “Local control API authentication required.” Port 8000 is the protected API, not the website. The public health check is `http://127.0.0.1:8000/api/health`.

Alternatively, use two IntelliJ terminals:

```sh
# Terminal 1, from the project root
./scripts/run_backend.sh
```

```sh
# Terminal 2, from the same project root
./scripts/run_frontend.sh
```

Do not run the combined launcher and separate launchers together. If a port is occupied, stop the existing service in its own terminal. O.R.I.O.N. deliberately does not kill unknown processes. To use different ports, pass the same pair to both separate commands, or use the combined command:

```sh
./scripts/start_orion.sh --backend-port 8001 --frontend-port 3001
```

Then open **http://localhost:3001**. The launcher coordinates the backend port, frontend API URL and allowed browser origins. Use one backend per checkout; run a separate checkout for a separate isolated development instance.

Stop with **Ctrl+C** in the launcher terminal. This stops the services that launcher started. Separate terminals each need Ctrl+C. The launcher does not erase saved missions, settings or memory. During development, restart the services after backend code or `.env` changes. `npm run build` validates the web build; it does not install a desktop app or start the authenticated development server.

## Learner: your first 20 minutes

### 1. Understand the screen

The top bar retains a compact backend connection indicator. **Analytics → Live operations** shows authentication, current execution, approval counts and freshness, refreshing every 30 seconds while open. Ready plans are not running jobs. “Backend connected” does not mean the AI provider is configured. Empty metrics mean there is no recorded evidence, not that the system achieved a success rate.

The sidebar has seven areas:

| Area | Use it for |
| --- | --- |
| Command | Dashboard and Assistant |
| Operations | Missions, Approvals and Activity |
| Intelligence | Memory and Knowledge |
| Environment | Workspaces and Developer Mode |
| Capabilities | Tools and Plugins |
| Governance | Security, Audit and Release Center |
| System | Analytics, Diagnostics, Settings and this guide |

Use the sidebar visibility control if you need more space. Command centre (`Cmd+K` on macOS, `Ctrl+K` elsewhere) searches navigation/actions. Interface changes and operational permissions are different things.

### 2. Set preferences without changing permissions

Open **User settings**. Set your display name and preferred theme/density. You can show or hide the bottom-right pet; it is optional. Keep **Strict Mode** for the introductory exercises. Ask your administrator about model configuration. Changing a display label or preferred model does not provision a provider account or prove that model is available.

Do not switch security profiles simply because a tool was denied. Read the denial and ask the trainer whether that capability is appropriate. Broad profiles enable additional tools but do not remove the requirement for specific approvals.

### 3. Ask a harmless question

Open **Assistant → New conversation**. Enter:

> Explain the difference between a mission, a tool and an approval. Do not use tools or change anything.

Before sending, inspect **Context sent to the provider**. On a narrow window, scroll below the chat to find these controls. Turn off memory/knowledge if they are not needed. Leave semantic search off while learning: it may send the query to an embedding provider. Profile and activity context are also optional.

Click **Preview Context**, read it, then **Send** if you agree. Preview covers this turn's prepared input and system instructions, not the full provider wire request, earlier conversation history or future tool results. Changing context choices starts a new conversation so earlier included context is not reused. If a preview becomes stale, review it again. Do not send until a provider error has been explained and resolved by the administrator.

### 4. Create a plan without executing it

Open **Missions**. In **Create a mission from your goal**, enter:

- Title: `My first sample-project review`
- Goal: `Prepare a read-only review of a sample project. Do not change any files.`
- Step 1: `Inspect the sample project structure.`
- Step 2: `List any risks and missing information.`
- Step 3: `Summarize findings with evidence.`

Use **Add step**, **Up** and **Remove** to review the order. Click **Save mission plan**. The plan appears below; saving has not run any tool. Refresh the page and confirm it remains saved. Workflow blueprints are optional templates, not a requirement.

With your trainer, inspect **Run Next Step** before using it. It starts one controlled mission cycle and can call the AI provider. Do not begin with **Run 3 Steps**. Read every result and approval interruption. Use pause/cancel controls when you need to stop further work; cancellation cannot undo an external action already performed.

### 5. Learn to reject before learning to approve

Open **Approvals**. If the queue is empty, that is normal. Ask the trainer to demonstrate a deliberately harmless request in a disposable sample workspace. Do not create a risky request just to populate the queue.

For each request, explain the action, mission/step if present, exact target, normalized arguments, risk and expected effect. For package commands, inspect the resolved scripts and lifecycle hooks; `npm run build` and `npm run dev` can run arbitrary workspace code.

Practice **Reject** with a reason such as `Training only; do not execute`. Confirm the record changes state and the action does not run. Later, approve only a specific action you understand. A denied/failed action is not success. Rejected, completed and failed approvals cannot be replayed as fresh permission; request new evidence when necessary.

### 6. Register a sample workspace

Have the trainer prepare a small existing project folder containing only non-sensitive sample files. Open **Workspaces → Register a workspace**. Enter a name and its full local folder path. Read both consent statements and explicitly check them only for that folder. Changing the path clears consent.

Click **Register trusted workspace**. Read the returned canonical path. Registration enables inspection of that trusted source; it does not start a terminal or index documents. Select the workspace separately in Assistant or Knowledge.

Registration also **creates no approval**. The **Open approval queue** link is navigation, not a request. Choose **Request folder**, **Request VS Code**, or an intended mission action first. Only a permitted request returning an approval ID appears in Approvals. Strict Mode denies desktop requests before creating a queue entry. Read the original response; do not repeatedly refresh an empty queue or weaken security to populate it.

After deciding a request, approved/rejected/failed records leave the pending queue. Use **Show recent history** to inspect the outcome. An approval requested directly from a workspace has no mission owner and cannot start or resolve an unrelated mission.

Desktop actions request approval. Knowledge indexing requires the registered scope and explicit indexing consent; some capabilities are disabled by Strict Mode. A policy denial is expected protection, not a broken connection. The trainer must decide whether a policy change is justified—never bypass it.

### 7. Review memory, knowledge and evidence

**Memory** stores retained facts. Inspect provenance, scope and sensitivity; exclude inaccurate or unwanted memories. **Knowledge** indexes authorized workspace documents. Use a small sample text file, read source consent, and inspect search results before including them in AI context. Never index an entire home folder.

**Activity** explains what happened in human-readable form. **Audit** distinguishes policy decisions, execution starts and results. **Analytics** summarizes recorded terminal capability calls; a permitted tool call is not automatically a successful execution. **Release Center** is an engineering view, not a beginner task: do not freeze, package or claim readiness during training.

## Recovery reference

| What you see | Safe next action |
| --- | --- |
| Port already in use | Stop the known old server in its terminal or choose another paired port. Never kill an unidentified PID. |
| API authentication required at port 8000 | Open the frontend at port 3000; run the authenticated verification script. Do not disable auth. |
| Connecting/authenticating | Let startup finish. If it persists, inspect both terminals and retry connection. |
| Backend unavailable | Confirm the backend is still running from the same checkout. Use `/api/health` and `verify_api.sh`. |
| Provider unavailable or invalid key | Ask the administrator to check private `.env`, provider access and model configuration; restart the backend afterward. |
| Tool denied | Inspect policy/plugin availability. Ask the trainer to review the required permission. |
| Workspace path rejected | Confirm that the folder exists locally and that the returned trusted scope is correct. Re-register deliberately if its path changed. |
| Approval rejected or script evidence changed | Review the reason or new script evidence. Request a fresh approval; never replay old permission. |
| Mission failed/interrupted | Read its error, state and audit evidence. Retry explicitly only after understanding whether an action already occurred. |
| Context changed since preview | Preview again before sending. Start a new conversation when changing source choices. |
| Storage/corruption warning | Stop risky work, preserve data and ask the administrator to use Diagnostics/backup recovery. Do not delete databases. |

## Trainer sign-off checklist

The learner can work independently only when they can demonstrate all of these:

- Distinguish the frontend, backend and external AI provider.
- Find connection/authentication and data-freshness status.
- Save and reload a mission without executing it.
- Explain one-step execution and when to pause/cancel.
- Read the exact target and risk of an approval, then reject it with a reason.
- Explain that approval is permission, not proof of completion or rollback.
- Preview context and exclude sources they do not want sent.
- Register only an authorized sample folder with explicit consent.
- Locate Activity/Audit evidence and recognize a real failure.
- Stop their local services without deleting data or disabling protections.

## Workspace-to-mission follow-up

1. Register a sample folder, confirm its canonical path and note the workspace ID.
2. In Assistant, select that workspace explicitly, review source inclusion and Preview Context. The sidebar selection is only a preference; it does not automatically set every screen's context.
3. For a mission, include the workspace ID, target files, read/write limits and completion condition in the goal. Example: “Review workspace ID [your ID], read only the sample README and report three findings with evidence. Do not change files.”
4. Save small ordered steps, reload to confirm persistence, then choose **Run Next Step** once. A valid provider configuration is required for AI execution.
5. If waiting, inspect the approval with the same mission and step IDs. After its action completes, return to Missions, inspect the updated state and explicitly run the next eligible cycle. Approval does not start a new unattended batch.
6. If paused, Resume restores eligibility; then run deliberately. If failed or blocked, inspect run/audit evidence and use the offered explicit retry only after resolving the cause. No offered safe recovery means stop and ask the administrator.
7. At completion, review step results and generate **Report**. Cancel prevents future work; it cannot undo an already performed action.

A mission named “Daily timetable” can draft a timetable but is not automatically a recurring schedule. Goal text is not a filesystem sandbox. Registered-root checks and capability policy remain authoritative. Assistant context choices apply to its conversation and are not automatically inherited by mission runs.

## Security profiles and environment labels

| Control | Actual effect | Safe operating boundary |
| --- | --- | --- |
| Strict Mode | Enables core planning, memory and workspace registration; disables desktop, knowledge/vector, browser, voice, blueprints and advanced developer plugins. | Use for introductory exercises. Disabled requests do not create approvals. |
| Balanced | Enables the broader installed plugin set, including desktop, knowledge and developer capabilities. | Only after an operator reviews the needed access. Tool disablement, trusted roots and specific approvals still apply. |
| Developer Lab | Currently uses the same enabled plugin set as Balanced, with an experimental safety-level label. | Not an OS sandbox or an approval-free mode; do not claim stronger isolation based on the name. |
| Production / Development / Demo | Saves a sidebar environment label. | Does not separate databases, credentials, networks or roots; does not certify a release or change effective policy. |

To change profile deliberately: pause affected missions, inspect executing and pending actions, obtain the responsible operator's authorization, open **Security → Security Policy**, read effects and counts, then Apply. Verify **Active Policy**, the backend response and **Recent Policy Events**. Inspect **Tools** and **Plugins** for actual availability before requesting new work. Profile changes cannot undo in-flight effects. Restore the restrictive profile required by the operator when finished.

For production work, require administrator-reviewed deployment, provider/data-sharing policy, least-privilege capability access, tested backup/restore and exact CI/artifact release evidence. Provision genuinely separate state, workspace roots and credentials for separate environments. The development launcher and a Production label do not provide that separation. Stop if release checks, integrity or recovery are unverified.

## Every sidebar option: the next path

| Option | Work through it | Expected result / next step |
| --- | --- | --- |
| Dashboard | Check connection and meaningful activity; choose a concrete task. | Go to Assistant, Missions or a real approval request. |
| Assistant | New conversation → select workspace/sources → Preview Context → Send. | Inspect answer, tools and evidence; chat is not automatically a mission. |
| Missions | Goal/scope → steps → save → Run Next Step → resolve approval → continue → Report. | Durable results; Ready is not running or scheduled. |
| Approvals | Match ID/owner → inspect target/arguments/risk → approve once or reject → read outcome/history. | A decision plus execution result, not a registration receipt. |
| Activity | Read messages → locate affected mission/approval → compare Audit. | Human-readable history; investigate before retrying. |
| Memory | Inspect content/scope/provenance → edit/exclude/delete. | Control future retrieval; previous provider disclosures cannot be recalled. |
| Knowledge | Select trusted workspace/relative source → consent → index → search → inspect matches. | Searchable sources, subject to policy; registration alone indexes nothing. |
| Workspaces | Register/consent → confirm ID/path → choose Assistant, mission, indexing or desktop request. | A trusted source, not an automatic approval. |
| Developer Mode | Select → inspect → diagnose → patch plan → review exact content/path → request approval → validate. | Controlled development; plan is not applied patch, and scripts are high risk. |
| Tools | Inspect capability, owner, risk and effective permission. | Request via its workflow; listed is not enabled/approved. |
| Plugins | Inspect installed tools, states and permissions; operator reviews changes. | Governance, not arbitrary third-party code installation. |
| Security | Inspect policy → authorize deliberate change → Apply → verify event/effective tools. | Availability changes without bypassing approvals. |
| Audit | Inspect actor/policy/correlation/owner; distinguish decision/start/result. | Evidence: allowed does not mean completed. |
| Release Center | Inspect build/check/artifact evidence; release owner resolves failures. | Release decision evidence, not historical-version promises. |
| Analytics | Live operations snapshot → separate historical range/charts → underlying evidence. | Current work and event history; unavailable is not zero. |
| Diagnostics | Inspect backend/desktop/storage errors → review recovery actions. | Safe recovery; do not delete databases or kill unidentified processes. |
| User settings | Set interface/profile/notifications/pet preferences; read explanations and save. | Preferences, not provider provisioning or environment isolation. |
| User guide | Follow sample workflows → expand each sidebar lesson → demonstrate trainer checklist. | A repeatable operating routine with safe stopping points. |

Secondary pages remain available in the in-app guide: Browser research for policy-permitted public sources, Voice for explicit push-to-talk/transcript confirmation, and Workflow blueprints for optional reviewed plan templates. None grants extra permissions.

This is a development application, not a production certification. Do not train with sensitive or business-critical material until your organization has reviewed its deployment, provider, security and recovery requirements.
