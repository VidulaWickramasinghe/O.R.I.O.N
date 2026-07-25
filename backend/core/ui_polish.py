from datetime import datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];FRONTEND=ROOT/'frontend';OUT=ROOT/'backend/data/ui_polish';OUT.mkdir(parents=True,exist_ok=True)
FILES=['src/app/public-demo/page.tsx','src/components/public-demo/PublicHero.tsx','src/components/public-demo/PublicSection.tsx','src/components/public-demo/PublicFeatureCard.tsx','src/components/public-demo/PublicScreenshotCard.tsx','src/app/globals.css']
def inspect_ui_polish():
 files=[{'path':x,'exists':(FRONTEND/x).is_file()} for x in FILES];text=(FRONTEND/FILES[0]).read_text() if (FRONTEND/FILES[0]).exists() else '';markers=[{'marker':m,'present':m in text} for m in ['sm:','md:','lg:','max-w-7xl','grid','flex-wrap','overflow-x-auto']];n=sum(x['present'] for x in markers);return {'status':'ready' if all(x['exists'] for x in files) and n>=5 else 'review_needed','generated_at':datetime.now().isoformat(timespec='seconds'),'files':files,'missing':[x for x in files if not x['exists']],'missing_count':sum(not x['exists'] for x in files),'responsive_markers':markers,'responsive_marker_count':n,'mobile_ready':n>=5,'safety':{'frontend_only':True,'publishes':False,'pushes_to_github':False,'changes_backend_tools':False}}
def render_ui_polish_report():
 s=inspect_ui_polish();return f"# O.R.I.O.N. v5.8 Final UI Polish Report\n\nStatus: {s['status']}\nMobile Ready: {s['mobile_ready']}\nSafety: frontend-only; no publishing, push, secrets, or backend tool changes.\n"
def save_ui_polish_report():
 r=render_ui_polish_report();p=OUT/f'UI_POLISH_REPORT_{datetime.now():%Y%m%d_%H%M%S}.md';p.write_text(r);return {'status':'saved','generated_at':datetime.now().isoformat(timespec='seconds'),'path':str(p),'report':r}
