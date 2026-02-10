from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Lead, Project

@receiver(post_save, sender=Lead)
def create_project_when_accepted(sender, instance, created, **kwargs):
    print("🔥 SIGNAL FIRED:", instance.id, instance.status)

    if instance.status == "ACCEPTED":
        project, created = Project.objects.get_or_create(
            lead=instance,
            defaults={
                "client_name": instance.client_name,
                "event_type": instance.event_type,
                "start_date": instance.event_start_date,
                "end_date": instance.event_end_date,
                "status": "ASSIGNED",
            }
        )
        print("✅ PROJECT CREATED:", project.id)
