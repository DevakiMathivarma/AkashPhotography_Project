from django.db import models
from django.contrib.auth.models import User

class Lead(models.Model):

    STATUS_CHOICES = [
        ("NEW", "New"),
        ("FOLLOW_UP", "Follow Up"),
        ("ACCEPTED", "Accepted"),
        ("LOST", "Lost"),
    ]

    # CLIENT DETAILS
    client_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)

    # EVENT DETAILS
# EVENT DETAILS
    event_type = models.CharField(max_length=50)

    event_start_date = models.DateField()
    event_start_session = models.CharField(
    max_length=10,
    choices=[("Morning", "Morning"), ("Evening", "Evening")]
)

    event_end_date = models.DateField()
    event_end_session = models.CharField(
    max_length=10,
    choices=[("Morning", "Morning"), ("Evening", "Evening")]
)

    follow_up_date = models.DateField(null=True, blank=True)

    event_location = models.CharField(max_length=150)


    # PAYMENT (ONLY FILLED WHEN ACCEPTED)
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    paid_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="NEW"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.client_name


# projects
from django.db import models

class Project(models.Model):
    STATUS_CHOICES = [
        ("ASSIGNED", "To Be Assigned"),
        ("PRE", "Pre Production"),
        ("SELECTION", "Selection"),
        ("POST", "Post Production"),
        ("COMPLETED", "Completed"),
    ]

    lead = models.OneToOneField(
        "Lead",
        on_delete=models.CASCADE,
        related_name="project"
    )

    client_name = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    event_type = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    start_date = models.DateField(
        blank=True,
        null=True
    )

    end_date = models.DateField(
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ASSIGNED"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.client_name or f"Project #{self.id}"


# Team member
class TeamMember(models.Model):

    ROLE_CHOICES = [
        ("PHOTOGRAPHER", "Photographer"),
        ("VIDEOGRAPHER", "Videographer"),
        ("EDITOR", "Editor"),
        ("ASSISTANT", "Assistant"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="team_profile"
    )

    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.role})"


class ProjectTeam(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="team_assignments"
    )
    member = models.ForeignKey(
        TeamMember,
        on_delete=models.CASCADE
    )

    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "member")

    def __str__(self):
        return f"{self.member.name} → {self.project}"


class ProjectTask(models.Model):
    PHASE_CHOICES = [
        ("PLANNING", "Planning & Coordination"),
        ("HARD_DISK", "Hard Disk Collection"),
        ("PRE_WEDDING", "Pre Wedding Shoot"),
        ("MAIN", "Main Coverage Phase"),
         ("SELECTION", "Selection Phase"),
          ("POST", "Post Production"),  
    ]
    STATUS_CHOICES = [
        ("OPEN", "Open"),
        ("ON_HOLD", "On Hold"),
        ("COMPLETED", "Completed"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="tasks"
    )
    
    phase = models.CharField(
        max_length=30,
        choices=PHASE_CHOICES
    )

    title = models.CharField(max_length=150)
    
    description = models.TextField(blank=True, null=True)

    assigned_to = models.ForeignKey(
        TeamMember,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    start_date = models.DateField(null=True, blank=True)

    due_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="OPEN"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
