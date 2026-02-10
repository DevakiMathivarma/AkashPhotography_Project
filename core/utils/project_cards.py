# utils/project_cards.py

from django.db.models import Count, Q
from collections import defaultdict

def build_pre_card_data(projects):
    cards = []

    for project in projects:
        # ---------------------------
        # TASK SUMMARY
        # ---------------------------
        task_summary = defaultdict(lambda: {"total": 0, "done": 0})

        tasks = project.tasks.all()
        for t in tasks:
            task_summary[t.phase]["total"] += 1
            if t.status == "COMPLETED":
                task_summary[t.phase]["done"] += 1

        task_chips = []
        for phase, counts in task_summary.items():
            task_chips.append({
                "phase": phase.replace("_", " ").title(),
                "total": counts["total"],
                "done": counts["done"]
            })

        # ---------------------------
        # TEAM MEMBERS
        # ---------------------------
        team = []
        for pt in project.team_assignments.select_related("member__user"):
            user = pt.member.user
            initials = (
                (user.first_name[:1] + user.last_name[:1]).upper()
                if user.first_name and user.last_name
                else user.username[:2].upper()
            )
            team.append({
                "initials": initials
            })

        # ---------------------------
        # FINAL CARD OBJECT
        # ---------------------------
        cards.append({
            "id": project.id,
            "client_name": project.client_name or project.lead.client_name,
            "event_type": project.lead.event_type,
            "start_date": project.lead.event_start_date,
            "end_date": project.lead.event_end_date,
            "status": project.status,
            "tasks": task_chips,
            "team": team
        })

    return cards

def build_post_card_data(projects):
    cards = []

    for p in projects:
        total_tasks = p.tasks.count()
        completed_tasks = p.tasks.filter(status="COMPLETED").count()

        cards.append({
            "id": p.id,
            "client_name": p.client_name or p.lead.client_name,
            "event_type": p.lead.event_type,
            "start_date": p.lead.event_start_date,
            "end_date": p.lead.event_end_date,
            "completed": completed_tasks,
            "total": total_tasks,
            "team": p.team_assignments.all(),
        })

    return cards

