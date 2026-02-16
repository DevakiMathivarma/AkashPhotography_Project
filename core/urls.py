from django.urls import path
from .views import (
    login_view,

    # Leads
    leads_view,
    save_lead,
    update_lead_status,
    get_lead,

    # Projects
    projects_view,
    update_project_status,
    assign_team_members,
    assign_project_tasks,

    # Follow-ups
    followup_panel_data,
    mark_followup_done,

    # team member
     team_members_view, create_team_member,project_details_api,
    #  task assigning
    project_tasks_api,add_project_task,update_project_task,delete_project_task,
    # sessionpage
    sessions_view
)

urlpatterns = [

    # ==========================
    # AUTH
    # ==========================
    path("", login_view, name="home"),
    path("login/", login_view, name="login"),

    # ==========================
    # LEADS
    # ==========================
    path("leads/", leads_view, name="leads"),
    path("leads/save/", save_lead, name="save_lead"),
    path("leads/update-status/", update_lead_status, name="update_lead_status"),
    path("leads/get/<int:lead_id>/", get_lead, name="get_lead"),

    # ==========================
    # PROJECTS
    # ==========================
    path("projects/", projects_view, name="projects"),
    path("projects/update-status/", update_project_status, name="update_project_status"),

    # 🔽 Popups (Team + Tasks)
    path("projects/assign-team/", assign_team_members, name="assign_team_members"),
    path("projects/assign-tasks/", assign_project_tasks, name="assign_project_tasks"),

    # ==========================
    # FOLLOW-UP REMINDERS
    # ==========================
    path("followups/data/", followup_panel_data, name="followup_panel_data"),
    path("followups/done/", mark_followup_done, name="mark_followup_done"),
     path("team-members/", team_members_view, name="team_members"),
    path("team-members/create/", create_team_member, name="create_team_member"),
    path(
    "projects/details/<int:project_id>/",
    project_details_api,
    name="project_details_api"
),
 path("projects/<int:project_id>/tasks/", project_tasks_api),
    path("projects/tasks/add/", add_project_task),
    path("projects/tasks/update/", update_project_task),
    path("projects/tasks/delete/", delete_project_task),

    # sessions page
    path("sessions/", sessions_view, name="sessions"),


]
