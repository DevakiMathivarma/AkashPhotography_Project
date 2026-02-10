from core.models import ProjectTask

POST_TASKS = ["Invoice"]

def ensure_post_tasks(project):
    existing = set(
        project.tasks.filter(phase="POST")
        .values_list("title", flat=True)
    )

    for title in POST_TASKS:
        if title not in existing:
            ProjectTask.objects.create(
                project=project,
                phase="POST",
                title=title,
                status="OPEN"
            )
