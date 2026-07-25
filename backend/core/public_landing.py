from datetime import datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; FRONTEND=ROOT/'frontend'; OUT=ROOT/'backend/data/public_landing';OUT.mkdir(parents=True,exist_ok=True)
EXPECTED=['src/app/public-demo/page.tsx','src/lib/publicLandingRegistry.ts','src/lib/portfolioRegistry.ts','public/screenshots']
def inspect_public_landing():
 files=[{'path':x,'exists':(FRONTEND/x).exists()} for x in EXPECTED];shot=FRONTEND/'public/screenshots';return {'status':'ready' if all(x['exists'] for x in files) else 'review_needed','generated_at':datetime.now().isoformat(timespec='seconds'),'route':'/public-demo','files':files,'missing':[x for x in files if not x['exists']],'missing_count':sum(not x['exists'] for x in files),'route_exists':(FRONTEND/'src/app/public-demo/page.tsx').exists(),'screenshot_dir_exists':shot.exists(),'screenshot_count':len(list(shot.glob('*.png'))) if shot.exists() else 0,'static_export_ready':True,'safety':{'publishes':False,'pushes_to_github':False,'exposes_secrets':False,'bypasses_approvals':False}}
def render_public_landing_report():
 s=inspect_public_landing();return f"# O.R.I.O.N. v5.7 Public Demo Website Report\n\nStatus: {s['status']}\nRoute: {s['route']}\nSafety: presentation-only; no publishing, push, secret exposure, or approval bypass.\n"
def save_public_landing_report():
 r=render_public_landing_report();p=OUT/f'PUBLIC_LANDING_REPORT_{datetime.now():%Y%m%d_%H%M%S}.md';p.write_text(r);return {'status':'saved','generated_at':datetime.now().isoformat(timespec='seconds'),'path':str(p),'report':r}
