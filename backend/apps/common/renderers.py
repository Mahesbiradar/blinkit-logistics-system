"""
Custom JSON Renderer
"""
from rest_framework.renderers import JSONRenderer


class StandardJSONRenderer(JSONRenderer):
    """Standard JSON response format"""
    
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context['response']
        
        # If data already has success field, render as-is
        if isinstance(data, dict) and 'success' in data:
            return super().render(data, accepted_media_type, renderer_context)
        
        # Wrap response in standard format
        if response.status_code >= 400:
            # Error response
            wrapped_data = {
                'success': False,
                'message': data.get('detail', 'An error occurred'),
                'errors': data if not isinstance(data, dict) or 'detail' not in data else {}
            }
        else:
            # Success response
            wrapped_data = {
                'success': True,
                'data': data
            }
        
        return super().render(wrapped_data, accepted_media_type, renderer_context)
