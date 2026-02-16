from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib import messages

def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "").strip()
        role = request.POST.get("role")

        # ✅ BASIC VALIDATIONS
        if not role:
            messages.error(request, "Please select a login role.")
            return redirect("login")

        if not username:
            messages.error(request, "Username is required.")
            return redirect("login")

        if not password:
            messages.error(request, "Password is required.")
            return redirect("login")

        # 🔐 AUTHENTICATION (existing logic stays)
        user = authenticate(request, username=username, password=password)

        if user:
            if role == "admin" and user.is_staff:
                login(request, user)
                return redirect("leads")

            elif role == "team" and not user.is_staff:
                login(request, user)
                return redirect("leads")

            else:
                messages.error(request, "You are not authorized for this login type.")
        else:
            messages.error(request, "Invalid username or password.")

    return render(request, "login.html")



# leads section
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .models import Lead

from django.db.models import Sum
from .models import Lead

# def leads_view(request):
#     auto_move_new_to_followup(days_before=14)
#     new_leads = Lead.objects.filter(status="NEW")
#     follow_up = Lead.objects.filter(status="FOLLOW_UP")
#     accepted = Lead.objects.filter(status="ACCEPTED")
#     lost = Lead.objects.filter(status="LOST")

#     context = {
#         "new_leads": new_leads,
#         "follow_up": follow_up,
#         "accepted": accepted,
#         "lost": lost,

#         # ✅ OVERVIEW COUNTS
#         "total_leads": Lead.objects.count(),

#         # ✅ AMOUNTS (safe even if NULL)
#         "total_amount": Lead.objects.aggregate(
#             total=Sum("total_amount")
#         )["total"] or 0,

#         "accepted_amount": accepted.aggregate(
#             total=Sum("paid_amount")
#         )["total"] or 0,

#         "lost_amount": lost.aggregate(
#             total=Sum("total_amount")
#         )["total"] or 0,
#     }

#     return render(request, "leads.html", context)

from datetime import timedelta
from django.shortcuts import render
from django.utils.timezone import now
from django.db.models import Sum, F, Q

from .models import Lead


def leads_view(request):
    # 🔁 AUTOMATIC MOVE (NEW → FOLLOW_UP)
    auto_move_new_to_followup(days_before=14)

    leads = Lead.objects.all()
    today = now().date()

    # =====================================================
    # 1️⃣ EVENT DATE FILTER
    # =====================================================
    event_range = request.GET.get("event_range")

    if event_range == "7":
        leads = leads.filter(
            event_start_date__range=(today, today + timedelta(days=7))
        )
    elif event_range == "14":
        leads = leads.filter(
            event_start_date__range=(today, today + timedelta(days=14))
        )
    elif event_range == "month":
        leads = leads.filter(
            event_start_date__year=today.year,
            event_start_date__month=today.month
        )

    event_from = request.GET.get("event_from")
    event_to = request.GET.get("event_to")
    if event_from and event_to:
        leads = leads.filter(
            event_start_date__range=(event_from, event_to)
        )

    # =====================================================
    # 2️⃣ FOLLOW-UP DATE FILTER
    # =====================================================
    follow_up = request.GET.get("follow_up")

    if follow_up == "today":
        leads = leads.filter(follow_up_date=today)

    elif follow_up == "week":
        leads = leads.filter(
            follow_up_date__range=(today, today + timedelta(days=7))
        )

    elif follow_up == "overdue":
        leads = leads.filter(follow_up_date__lt=today)

    # =====================================================
    # 3️⃣ STATUS FILTER
    # =====================================================
    statuses = request.GET.getlist("status")
    if statuses:
        leads = leads.filter(status__in=statuses)

    # =====================================================
    # 4️⃣ AMOUNT FILTER
    # =====================================================
    amount = request.GET.get("amount")

    if amount == "low":
        leads = leads.filter(total_amount__lt=20000)

    elif amount == "mid":
        leads = leads.filter(total_amount__range=(20000, 50000))

    elif amount == "high":
        leads = leads.filter(total_amount__gt=50000)

    min_amount = request.GET.get("min_amount")
    max_amount = request.GET.get("max_amount")

    if min_amount and max_amount:
        leads = leads.filter(
            total_amount__range=(min_amount, max_amount)
        )

    # =====================================================
    # 5️⃣ PAYMENT STATUS
    # =====================================================
    payment = request.GET.get("payment")

    if payment == "full":
        leads = leads.filter(paid_amount=F("total_amount"))

    elif payment == "partial":
        leads = leads.filter(
            paid_amount__gt=0,
            paid_amount__lt=F("total_amount")
        )

    elif payment == "none":
        leads = leads.filter(paid_amount=0)

    # =====================================================
    # 6️⃣ EVENT TYPE
    # =====================================================
    event_types = request.GET.getlist("event_type")
    if event_types:
        leads = leads.filter(event_type__in=event_types)

    # =====================================================
    # 7️⃣ PRIORITY (DERIVED)
    # =====================================================
    priority = request.GET.get("priority")

    if priority == "urgent":
        leads = leads.filter(follow_up_date__lte=today)

    elif priority == "upcoming":
        leads = leads.filter(
            follow_up_date__range=(today, today + timedelta(days=7))
        )

    elif priority == "safe":
        leads = leads.filter(
            follow_up_date__gt=today + timedelta(days=7)
        )

    # =====================================================
    # 8️⃣ SEARCH (CLIENT / PHONE / EMAIL / LOCATION)
    # =====================================================
    search = request.GET.get("search")

    if search:
        leads = leads.filter(
            Q(client_name__icontains=search) |
            Q(phone__icontains=search) |
            Q(email__icontains=search) |
            Q(event_location__icontains=search)
        )

    # =====================================================
    # SPLIT FOR KANBAN
    # =====================================================
    new_leads = leads.filter(status="NEW")
    follow_up_leads = leads.filter(status="FOLLOW_UP")
    accepted_leads = leads.filter(status="ACCEPTED")
    lost_leads = leads.filter(status="LOST")

    # =====================================================
    # CONTEXT
    # =====================================================
    context = {
        "new_leads": new_leads,
        "follow_up": follow_up_leads,
        "accepted": accepted_leads,
        "lost": lost_leads,

        "total_leads": leads.count(),

        "total_amount": leads.aggregate(
            total=Sum("total_amount")
        )["total"] or 0,

        "accepted_amount": accepted_leads.aggregate(
            total=Sum("paid_amount")
        )["total"] or 0,

       "lost_quoted_amount": lost_leads.aggregate(
    total=Sum("total_amount")
)["total"] or 0,

"lost_paid_amount": lost_leads.aggregate(
    total=Sum("paid_amount")
)["total"] or 0,
    }

    return render(request, "leads.html", context)






from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Lead

@csrf_exempt
@csrf_exempt
def save_lead(request):
    if request.method == "POST":
        try:
            lead_id = request.POST.get("lead_id")

            # EDIT
            if lead_id:
                lead = Lead.objects.get(id=lead_id)
            # CREATE
            else:
                lead = Lead(status="NEW")

            # Client details (read-only in UI, but still saved)
            lead.client_name = request.POST.get("client_name")
            lead.phone = request.POST.get("phone")
            lead.email = request.POST.get("email")

            # Event details (editable)
            lead.event_type = request.POST.get("event_type")
            lead.event_start_date = request.POST.get("event_start_date")
            lead.event_start_session = request.POST.get("event_start_session")
            lead.event_end_date = request.POST.get("event_end_date")
            lead.event_end_session = request.POST.get("event_end_session")
            lead.follow_up_date = request.POST.get("follow_up_date") or None
            lead.event_location = request.POST.get("event_location")
            lead.total_amount = request.POST.get("total_amount") or 0

            lead.save()

            return JsonResponse({
                "success": True,
                "mode": "updated" if lead_id else "created",
                "id": lead.id
            })

        except Exception as e:
            return JsonResponse(
                {"success": False, "error": str(e)},
                status=400
            )


def update_lead_status(request):
    if request.method == "POST":
        lead = Lead.objects.get(id=request.POST["lead_id"])
        lead.status = request.POST["status"]

        if request.POST.get("paid_amount"):
            lead.paid_amount = request.POST["paid_amount"]
            lead.total_amount = request.POST["total_amount"]

        lead.save()
        return JsonResponse({
    "success": True,
    "follow_up_date": lead.follow_up_date.strftime("%b %d, %Y") if lead.follow_up_date else None
})
    
# editing lead
from django.http import JsonResponse
from .models import Lead

def get_lead(request, lead_id):
    lead = Lead.objects.get(id=lead_id)

    return JsonResponse({
        "id": lead.id,
        "client_name": lead.client_name,
        "phone": lead.phone,
        "email": lead.email,
        "event_type": lead.event_type,
        "event_start_date": lead.event_start_date,
        "event_start_session": lead.event_start_session,
        "event_end_date": lead.event_end_date,
        "event_end_session": lead.event_end_session,
        "follow_up_date": lead.follow_up_date,
        "event_location": lead.event_location,
        "total_amount": lead.total_amount
    })

# automatic moving from new to column
from datetime import timedelta
from django.utils.timezone import now
from .models import Lead

def auto_move_new_to_followup(days_before=14):
    """
    Automatically move NEW leads to FOLLOW_UP
    when event date is within `days_before`
    """
    today = now().date()
    threshold_date = today + timedelta(days=days_before)

    Lead.objects.filter(
        status="NEW",
        event_start_date__lte=threshold_date
    ).update(status="FOLLOW_UP")



# ------follow up reminder
from django.utils.timezone import now
from django.views.decorators.http import require_POST

def followup_panel_data(request):
    today = now().date()

    base_qs = Lead.objects.filter(
        follow_up_date__isnull=False
    ).exclude(status__in=["ACCEPTED", "LOST"])

    overdue = base_qs.filter(follow_up_date__lt=today)
    today_qs = base_qs.filter(follow_up_date=today)
    upcoming = base_qs.filter(follow_up_date__gt=today)

    return JsonResponse({
        "counts": {
            "overdue": overdue.count(),
            "today": today_qs.count(),
            "upcoming": upcoming.count(),
            "total": base_qs.count()
        },
        "today": list(today_qs.values(
            "id", "client_name", "phone", "event_type", "follow_up_date"
        )),
        "overdue": list(overdue.values(
            "id", "client_name", "phone", "event_type", "follow_up_date"
        )),
        "upcoming": list(upcoming.values(
            "id", "client_name", "phone", "event_type", "follow_up_date"
        )),
    })


@require_POST
def mark_followup_done(request):
    lead = Lead.objects.get(id=request.POST["lead_id"])
    lead.follow_up_date = None
    lead.save()
    return JsonResponse({"success": True})

# ---------------projects section
from collections import defaultdict
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import Project, TeamMember

# helper function for pre production card
from .utils.project_cards import build_pre_card_data

ROLE_CATEGORY_MAP = {
    "ASSISTANT": "general",
    "PHOTOGRAPHER": "pre",
    "VIDEOGRAPHER": "pre",
    "EDITOR": "post",
}

from collections import defaultdict
from django.shortcuts import render
from .models import Project, TeamMember
from .utils.project_cards import build_pre_card_data,build_post_card_data
from .utils.project_overview import (
    get_pending_internal_projects,
    get_awaiting_client_projects
)
from django.db.models import Count, Q
from datetime import date
from calendar import monthrange

ROLE_CATEGORY_MAP = {
    "ASSISTANT": "general",
    "PHOTOGRAPHER": "pre",
    "VIDEOGRAPHER": "pre",
    "EDITOR": "post",
}

def projects_view(request):
    # =====================
    # PROJECT QUERY (OPTIMIZED)
    # =====================
    projects = Project.objects.select_related("lead").prefetch_related(
    "tasks",
    "team_assignments__member__user"
)
     # ---- Month + Year ----
    month = request.GET.get("month")
    year  = request.GET.get("year")

    if month and year:
        month = int(month)
        year = int(year)

        start = date(year, month, 1)
        end = date(year, month, monthrange(year, month)[1])

        projects = projects.filter(
            lead__event_start_date__range=(start, end)
        )

    # ---- Custom Date Override ----
    from_date = request.GET.get("from_date")
    to_date   = request.GET.get("to_date")

    if from_date and to_date:
        projects = projects.filter(
            lead__event_start_date__range=(from_date, to_date)
        )

    # ---- Status ----
    statuses = request.GET.getlist("status")
    if statuses:
        projects = projects.filter(status__in=statuses)

    # ---- Completion ----
    completion = request.GET.get("completion")

    if completion == "COMPLETED":
        projects = projects.filter(
            ~Q(tasks__status__in=["OPEN", "ON_HOLD"])
        )

    elif completion == "PENDING":
        projects = projects.filter(
            tasks__status__in=["OPEN", "ON_HOLD"]
        )

    

    # =====================
    # TEAM MEMBERS
    # =====================
    members = TeamMember.objects.filter(is_active=True)
    grouped_team = defaultdict(list)

    for member in members:
        category = ROLE_CATEGORY_MAP.get(member.role)
        if category:
            grouped_team[category].append(member)

    # =====================
    # PROJECT OVERVIEW DATA
    # =====================
    pending_internal = get_pending_internal_projects(projects)
    awaiting_client = get_awaiting_client_projects(projects)

    # =====================
    # CONTEXT
    # =====================
    context = {
        # PROJECT COLUMNS
        "assigned": projects.filter(status="ASSIGNED"),
        "pre_cards": build_pre_card_data(projects.filter(status="PRE")),
        "selection": projects.filter(status="SELECTION"),
        "post": build_post_card_data(
    projects.filter(status="POST")
),
        "completed": projects.filter(status="COMPLETED"),

        # TEAM GROUPS
        "general_team": grouped_team["general"],
        "pre_team": grouped_team["pre"],
        "post_team": grouped_team["post"],
          # 🔥 PROJECT OVERVIEW
        "pending_internal": pending_internal,
        "awaiting_client": awaiting_client,
    }

    return render(request, "projects.html", context)




from django.http import JsonResponse
from .models import Project

@require_POST
def update_project_status(request):
    project = get_object_or_404(Project, id=request.POST.get("project_id"))
    project.status = request.POST.get("status")
    project.save()

    return JsonResponse({"success": True})
# ============================
# PROJECTS – POPUP HANDLERS
# ============================

from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Project,ProjectTeam
@require_POST
def assign_team_members(request):
    project = get_object_or_404(Project, id=request.POST["project_id"])
    member_ids = request.POST.get("members", "").split(",")

    ProjectTeam.objects.filter(project=project).delete()

    assigned_members = []

    for mid in member_ids:
        if mid:
            pt = ProjectTeam.objects.create(
                project=project,
                member_id=mid
            )
            assigned_members.append({
                "id": pt.member.id,
                "name": pt.member.user.get_full_name() or pt.member.user.username
            })

    return JsonResponse({
        "success": True,
        "project_id": project.id,
        "assigned_team": assigned_members
    })


# @require_POST
# def assign_team_members(request):
#     project = get_object_or_404(Project, id=request.POST["project_id"])
#     member_ids = request.POST.get("members", "").split(",")

#     ProjectTeam.objects.filter(project=project).delete()

#     for mid in member_ids:
#         if mid:
#             ProjectTeam.objects.create(
#                 project=project,
#                 member_id=mid
#             )

#     return JsonResponse({"success": True})
# @require_POST
# def assign_team_members(request):
#     project = get_object_or_404(Project, id=request.POST["project_id"])
#     member_ids = request.POST.get("members", "").split(",")

#     # 1️⃣ Clear old assignments
#     ProjectTeam.objects.filter(project=project).delete()

#     assigned_members = []

#     # 2️⃣ Assign new members
#     for mid in member_ids:
#         if mid:
#             pt = ProjectTeam.objects.create(
#                 project=project,
#                 member_id=mid
#             )
#             assigned_members.append({
#                 "id": pt.member.id,
#                 "name": pt.member.user.get_full_name() or pt.member.user.username
#             })

#     # 3️⃣ 🔥 THIS IS THE KEY LINE
#     project.status = "PRE"   # or "IN_PROGRESS" if you prefer
#     project.save()

#     # 4️⃣ Send data back to frontend
#     return JsonResponse({
#         "success": True,
#         "project_id": project.id,
#         "status": project.status,
#         "assigned_team": assigned_members
#     })





@require_POST
def assign_project_tasks(request):
    """
    TEMP IMPLEMENTATION

    Handles task assignment popup.
    Currently:
    - Validates project
    - Keeps status as PRE
    - No task persistence yet

    Future:
    - Create Task model
    - Assign tasks to members
    - Track progress per task
    """

    project_id = request.POST.get("project_id")

    if not project_id:
        return JsonResponse(
            {"success": False, "error": "Project ID missing"},
            status=400
        )

    project = get_object_or_404(Project, id=project_id)

    # 🔒 No DB update yet
    # project.status = "PRE"  ← already handled by drag-drop logic

    return JsonResponse({
        "success": True,
        "message": "Tasks assigned (temporary)",
        "project_id": project.id
    })


# team memeber adding 
from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth.models import User
from .models import TeamMember

def is_admin(user):
    return user.is_authenticated and user.is_staff


@user_passes_test(is_admin)
def team_members_view(request):
    members = TeamMember.objects.all()

    context = {
        "members": members,
        "total": members.count(),
        "active": members.filter(is_active=True).count(),
        "inactive": members.filter(is_active=False).count(),
    }
    return render(request, "team_members.html", context)

@user_passes_test(is_admin)
def create_team_member(request):
    if request.method == "POST":
        name = request.POST["name"]
        username = request.POST["username"]
        password = request.POST["password"]
        role = request.POST["role"]

        # ✅ Create login user
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=name,   # ✅ store name here
            is_staff=False
        )

        # ✅ Create team profile
        TeamMember.objects.create(
            user=user,        # 🔥 THIS WAS MISSING
            role=role,
            is_active=True
        )

        return redirect("team_members")



# 
# from django.http import JsonResponse
# from django.shortcuts import get_object_or_404
# from .models import Project

# def project_details_api(request, project_id):
#     project = get_object_or_404(Project, id=project_id)
#     lead = project.lead

#     return JsonResponse({
#         "client_name": project.client_name or lead.client_name,
#         "location": lead.event_location,
#         "start_date": lead.event_start_date.strftime("%d/%m/%Y"),
#         "end_date": lead.event_end_date.strftime("%d/%m/%Y"),
#         "start_session": lead.event_start_session,
#         "event_type": lead.event_type,
#           "available_members": lead.available_members_data,
#     "booked_members": booked_members_data,
#     })
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Project, TeamMember, ProjectTeam
from django.db.models import Q

def project_details_api(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    lead = project.lead

    start_date = lead.event_start_date
    end_date = lead.event_end_date

    available_members = []
    booked_members = []

    members = TeamMember.objects.select_related("user")

    for member in members:
        overlapping_projects = Project.objects.filter(
            team_assignments__member=member
        ).exclude(id=project.id).filter(
            Q(lead__event_start_date__lte=end_date) &
            Q(lead__event_end_date__gte=start_date)
        )

        data = {
            "id": member.id,
            "name": member.user.get_full_name() or member.user.username,
            "role": member.role,
        }

        if overlapping_projects.exists():
            booked_project = overlapping_projects.first()
            data["booked_info"] = f"{booked_project.lead.event_type} | {booked_project.lead.event_start_date}"
            booked_members.append(data)
        else:
            available_members.append(data)

    return JsonResponse({
        "client_name": project.client_name or lead.client_name,
        "location": lead.event_location,
        "start_date": lead.event_start_date.strftime("%d/%m/%Y"),
        "end_date": lead.event_end_date.strftime("%d/%m/%Y"),
        "start_session": lead.event_start_session,
        "event_type": lead.event_type,
        "general_team": available_members,
        "booked_members": booked_members,
    })



# Projects tab task assigning

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Project, ProjectTask, TeamMember

DEFAULT_TASKS = {
    "WEDDING": [
        ("PLANNING", "Create Excel Sheet"),
        ("PLANNING", "Create WhatsApp Group"),
        ("PLANNING", "Dates & Schedule"),
        ("PLANNING", "Team Schedule"),
        ("HARD_DISK", "Hard Disk Collection"),
        ("HARD_DISK", "Acknowledgement From Client"),
        ("PRE_WEDDING", "Fix Pre-Wedding Date With Client"),
        ("MAIN", "Final Confirmation & Checklist"),
    ],
    "BABY_SHOWER": [
        ("PLANNING", "Client Coordination"),
        ("MAIN", "Main Event Coverage"),
    ]
}

def project_tasks_api(request, project_id):
    project = get_object_or_404(Project, id=project_id)

    # ==================================
    # 1️⃣ NORMALIZE EVENT TYPE
    # ==================================
    raw_event = (project.lead.event_type or "").strip().upper()

    EVENT_TYPE_MAP = {
        "WEDDING": "WEDDING",
        "MARRIAGE": "WEDDING",
        "BIRTHDAY": "WEDDING",
        "BABY SHOWER": "BABY_SHOWER",
        "BABY_SHOWER": "BABY_SHOWER",
    }

    event_key = EVENT_TYPE_MAP.get(raw_event)

    # ==================================
    # 2️⃣ CREATE DEFAULT TASKS (ONCE)
    # ==================================
    # if event_key and project.tasks.count() == 0:
    #     for phase, title in DEFAULT_TASKS.get(event_key, []):
    #         ProjectTask.objects.create(
    #             project=project,
    #             phase=phase,
    #             title=title,
    #             status="PENDING"
    #         )
    if event_key:
        existing = set(
        project.tasks.values_list("phase", "title")
    )

    for phase, title in DEFAULT_TASKS.get(event_key, []):
        if (phase, title) not in existing:
            ProjectTask.objects.create(
                project=project,
                phase=phase,
                title=title,
                status="PENDING"
            )


    # ==================================
    # 3️⃣ FETCH TASKS
    # ==================================
    tasks = project.tasks.select_related("assigned_to__user")

    response = {
        "tasks": {},
        "team_members": []
    }

    # ==================================
    # 4️⃣ GROUP TASKS BY PHASE KEY
    # ==================================
    for task in tasks:
        phase_key = task.phase   # 🔥 IMPORTANT

        response["tasks"].setdefault(phase_key, []).append({
            "id": task.id,
            "code": f"AK-{task.id}",
            "title": task.title,
            "assigned_to_id": task.assigned_to.id if task.assigned_to else None,
            "status": task.status,
            "start_date": task.start_date,
            "due_date": task.due_date,
            "progress": 0
        })

    # ==================================
    # 5️⃣ ASSIGNED TEAM MEMBERS
    # ==================================
    assigned_members = TeamMember.objects.filter(
        projectteam__project=project
    ).select_related("user").distinct()

    for m in assigned_members:
        response["team_members"].append({
            "id": m.id,
            "name": m.user.get_full_name() or m.user.username,
            "role": m.role
        })

    return JsonResponse(response)


# adding new task
from django.views.decorators.http import require_POST

@require_POST
def add_project_task(request):
    project = get_object_or_404(Project, id=request.POST["project_id"])

    task = ProjectTask.objects.create(
        project=project,
        phase=request.POST["phase"],
        title=request.POST["title"],
        description=request.POST.get("description"),
        assigned_to_id=request.POST.get("assigned_to") or None,
        start_date=request.POST.get("start_date") or None,
        due_date=request.POST.get("due_date") or None,
        status="PENDING"
    )

    return JsonResponse({"success": True, "task_id": task.id})


# editing tasks
from core.utils.project_flow import auto_move_pre_to_selection,auto_move_selection_to_post ,  auto_move_post_to_completed
@require_POST
def update_project_task(request):
    task = get_object_or_404(ProjectTask, id=request.POST["task_id"])

    task.title = request.POST.get("title", task.title)
    task.assigned_to_id = request.POST.get("assigned_to", task.assigned_to)
    task.start_date = request.POST.get("start_date", task.start_date)
    task.due_date = request.POST.get("due_date", task.due_date)
    task.status = request.POST.get("status", task.status)

    task.save()
    project = task.project
    
    if task.assigned_to and project.status == "PRE":
        project.status = "PRE"   # explicit (safe)
        project.save()
    # 🔥 ONE LINE BUSINESS LOGIC
    auto_move_pre_to_selection(task.project)
    auto_move_selection_to_post(task.project)
    auto_move_post_to_completed(project) 

    return JsonResponse({"success": True})



# deleting
@require_POST
def delete_project_task(request):
    task = get_object_or_404(ProjectTask, id=request.POST["task_id"])
    task.delete()
    return JsonResponse({"success": True})



# core/views/sessions.py
from django.shortcuts import render
from django.utils.timezone import now
from collections import defaultdict
from core.models import Project

def sessions_view(request):
    today = now().date()
    current_year = today.year
    current_month = today.month

    tab = request.GET.get("tab")  # no default → no active tab initially

    projects = Project.objects.select_related("lead").prefetch_related(
        "tasks",
        "team_assignments__member__user"
    )

    # 🔥 STRICT MONTH-BASED FILTERING (FIXED)
    if tab == "upcoming":
        # ONLY current month
        projects = projects.filter(
            lead__event_start_date__year=current_year,
            lead__event_start_date__month=current_month
        )

    elif tab == "past":
        # ANY month BEFORE current month (same year OR previous years)
        projects = projects.filter(
            lead__event_start_date__lt=now().date().replace(
                year=current_year,
                month=current_month,
                day=1
            )
        )

    elif tab == "future":
        # ANY month AFTER current month
        projects = projects.filter(
            lead__event_start_date__year__gte=current_year
        ).exclude(
            lead__event_start_date__year=current_year,
            lead__event_start_date__month__lte=current_month
        )

    # tab == None → NO FILTER → ALL PROJECTS

    # ✅ MONTH GROUPING (SAFE)
    grouped = defaultdict(list)
    for p in projects:
        if p.lead and p.lead.event_start_date:
            month_key = p.lead.event_start_date.strftime("%B %Y")
            grouped[month_key].append(p)

    return render(request, "sessions.html", {
        "grouped_projects": dict(grouped),
        "active_tab": tab,
    })
