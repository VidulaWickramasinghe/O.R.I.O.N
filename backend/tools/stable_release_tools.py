from agents import function_tool
from core.stable_release import generate_stable_release_package as generate_package, lock_stable_release as lock_release, render_stable_release_report, save_stable_release_report as save_report, unlock_stable_release as unlock_release
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission

def decorators(name):
    def apply(function): return function_tool(instrument_tool(name)(enforce_tool_permission(name)(function)))
    return apply
@decorators("get_stable_release_report")
def get_stable_release_report()->str: return render_stable_release_report()
@decorators("save_stable_release_report")
def save_stable_release_report()->str:
    result=save_report(); return f"Stable release report saved.\nPath: {result['path']}"
@decorators("lock_stable_release")
def lock_stable_release(reason:str="O.R.I.O.N. stable public release lock.")->str: return str(lock_release(reason))
@decorators("unlock_stable_release")
def unlock_stable_release(reason:str="O.R.I.O.N. stable release lock lifted.")->str: return str(unlock_release(reason))
@decorators("generate_stable_release_package")
def generate_stable_release_package()->str:
    result=generate_package(); return f"Stable release package generated.\nStatus: {result['status']}\nSummary: {result['summary_path']}"
