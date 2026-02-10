from django.db.models import Q
from ..models import Project, ProjectTask, ProjectTeam


def get_pending_internal_projects(projects):
    """
    Projects having at least one non-completed task
    """

    pending_projects = []

    for project in projects:
        pending_tasks = project.tasks.filter(
            status__in=["OPEN", "ON_HOLD"]
        )

        if not pending_tasks.exists():
            continue

        # team members
        team = [
            {
                "id": pt.member.id,
                "initials": (pt.member.user.first_name[:1] or pt.member.user.username[:1]).upper()
            }
            for pt in project.team_assignments.select_related("member__user")
        ]

        pending_projects.append({
            "id": project.id,
            "lead": project.lead,
            "team": team,
            "pending_tasks": pending_tasks,
        })

    return pending_projects


def get_awaiting_client_projects(projects):
    """
    Projects waiting on client action
    """

    result = []

    for project in projects:
        lead = project.lead
        pending_list = []

        # 💰 Payment pending
        if lead.total_amount and lead.paid_amount < lead.total_amount:
            pending_list.append("Payment Pending")

        # 📩 Follow-up pending
        if lead.follow_up_date:
            pending_list.append("Awaiting Client Response")

        if not pending_list:
            continue

        result.append({
            "id": project.id,
            "lead": lead,
            "due_date": lead.follow_up_date,
            "pending_list": pending_list
        })

    return result
