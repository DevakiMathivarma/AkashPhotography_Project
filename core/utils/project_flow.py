# core/utils/project_flow.py
from core.utils.selection_flow import ensure_selection_tasks
from core.utils.post_flow import ensure_post_tasks

def auto_move_pre_to_selection(project):
    PRE_PRODUCTION_PHASES = [
        "PLANNING",
        "HARD_DISK",
        "PRE_WEDDING",
        "MAIN",
    ]

    tasks = project.tasks.filter(phase__in=PRE_PRODUCTION_PHASES)

    if not tasks.exists():
        return

    if not tasks.exclude(status="COMPLETED").exists():
        if project.status == "PRE":
            project.status = "SELECTION"
            project.save()
            ensure_selection_tasks(project)


def auto_move_selection_to_post(project):
    selection_tasks = project.tasks.filter(phase="SELECTION")

    if not selection_tasks.exists():
        return

    if not selection_tasks.exclude(status="COMPLETED").exists():
        if project.status == "SELECTION":
            project.status = "POST"
            project.save()
            ensure_post_tasks(project)   # 🔥 ADD THIS


def auto_move_post_to_completed(project):
    post_tasks = project.tasks.filter(phase="POST")

    if not post_tasks.exists():
        return

    if not post_tasks.exclude(status="COMPLETED").exists():
        project.status = "COMPLETED"
        project.save()
