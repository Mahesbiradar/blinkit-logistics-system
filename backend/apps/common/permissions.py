"""
Custom Permissions
"""
from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """Permission for Owner users only"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_owner()
        )


class IsCoordinator(permissions.BasePermission):
    """Permission for Coordinator users only"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_coordinator()
        )


class IsOwnerOrCoordinator(permissions.BasePermission):
    """Permission for Owner or Coordinator users"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_owner() or request.user.is_coordinator())
        )


class IsDriver(permissions.BasePermission):
    """Permission for Driver users only"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_driver_role()
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        return obj.user == request.user
