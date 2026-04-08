"""
Custom Pagination Class
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """Standard pagination with configurable page size"""
    page_size = 20
    page_size_query_param = 'per_page'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'data': {
                'results': data,
            },
            'meta': {
                'page': self.page.number,
                'per_page': self.get_page_size(self.request),
                'total': self.page.paginator.count,
                'total_pages': self.page.paginator.num_pages,
            }
        })
