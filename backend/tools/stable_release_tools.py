from agents import function_tool
from core.stable_release import *
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
for_name=lambda n:lambda f:function_tool(instrument_tool(n)(enforce_tool_permission(n)(f)))
@for_name('get_stable_release_report')
def get_stable_release_report():return render_stable_release_report()
@for_name('save_stable_release_report')
def save_stable_release_report_tool():return str(save_stable_release_report())
@for_name('lock_stable_release')
def lock_stable_release_tool(reason='O.R.I.O.N. v6.0 stable public release lock.'):return str(lock_stable_release(reason))
@for_name('unlock_stable_release')
def unlock_stable_release_tool(reason='O.R.I.O.N. v6.0 stable release lock lifted.'):return str(unlock_stable_release(reason))
@for_name('generate_stable_release_package')
def generate_stable_release_package_tool():return str(generate_stable_release_package())
