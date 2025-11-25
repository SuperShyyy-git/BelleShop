from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from simple_history.admin import SimpleHistoryAdmin # ADDED
from .models import User, AuditLog


@admin.register(User)
# Use multiple inheritance to get both history and base user fields
class UserAdmin(SimpleHistoryAdmin, BaseUserAdmin): # CHANGED inheritance order
    list_display = ('username', 'email', 'full_name', 'role', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'full_name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'email', 'phone')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'full_name', 'role', 'password1', 'password2'),
        }),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    # This is a custom log table and remains admin.ModelAdmin
    list_display = ('user', 'action', 'table_name', 'timestamp', 'ip_address')
    list_filter = ('action', 'table_name', 'timestamp')
    search_fields = ('user__username', 'table_name', 'description')
    readonly_fields = ('user', 'action', 'table_name', 'record_id', 'old_values', 
                        'new_values', 'ip_address', 'user_agent', 'timestamp', 'description')
    ordering = ('-timestamp',)
    
    def has_add_permission(self, request):
        return False  # Audit logs cannot be manually created
    
    def has_delete_permission(self, request, obj=None):
        return False  # Audit logs cannot be deleted