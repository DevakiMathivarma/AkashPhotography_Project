# core/utils/selection_flow.py
from core.models import ProjectTask

def ensure_selection_tasks(project):
    titles = ["Gallery Link", "Selection Link"]

    existing = project.tasks.filter(
        phase="SELECTION",
        title__in=titles
    ).values_list("title", flat=True)

    for title in titles:
        if title not in existing:
            ProjectTask.objects.create(
                project=project,
                phase="SELECTION",
                title=title,
                status="OPEN"
            )
