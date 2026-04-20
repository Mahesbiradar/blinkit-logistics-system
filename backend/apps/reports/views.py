"""
Reports Views - Excel and PDF report generation
"""
import io
import calendar
from datetime import date

from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsOwnerOrCoordinator
from apps.trips.models import Trip
from apps.expenses.models import Expense
from apps.payments.models import Payment


def _month_label(year, month):
    return f"{calendar.month_name[month]} {year}"


def _make_excel_styles():
    """Return a dict of reusable openpyxl style objects."""
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    return {
        'center': Alignment(horizontal='center', vertical='center', wrap_text=True),
        'right': Alignment(horizontal='right', vertical='center'),
        'thin': Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin'),
        ),
    }


class MonthlyMISReportView(APIView):
    """Monthly MIS Excel - regular trips sheet + adhoc trips sheet."""
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrCoordinator]

    def get(self, request):
        import openpyxl
        from openpyxl.styles import Font, PatternFill
        from openpyxl.utils import get_column_letter

        year_str = request.query_params.get('year')
        month_str = request.query_params.get('month')
        vehicle_id = request.query_params.get('vehicle_id')

        if not year_str or not month_str:
            return Response(
                {'success': False, 'message': 'year and month are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            year, month = int(year_str), int(month_str)
            if not 1 <= month <= 12:
                raise ValueError
        except ValueError:
            return Response(
                {'success': False, 'message': 'Invalid year or month'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Trip.objects.select_related('driver__user', 'vehicle').filter(
            trip_date__year=year,
            trip_date__month=month,
        ).order_by('vehicle__vehicle_number', 'trip_date')

        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)

        regular = list(qs.filter(trip_category='regular'))
        adhoc = list(qs.filter(trip_category='adhoc'))

        s = _make_excel_styles()
        HDR_FONT = Font(bold=True, color='FFFFFF', size=10)
        HDR_FILL = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
        TOT_FONT = Font(bold=True, size=10)
        TOT_FILL = PatternFill(start_color='FEF08A', end_color='FEF08A', fill_type='solid')
        EVEN_FILL = PatternFill(start_color='EFF6FF', end_color='EFF6FF', fill_type='solid')

        COLS = [
            ('Date', 12),
            ('Driver Name', 20),
            ('Vehicle No.', 14),
            ('Store 1', 22),
            ('KM 1 (One-way)', 15),
            ('KM 1 (Round)', 13),
            ('Store 2', 22),
            ('KM 2 (One-way)', 15),
            ('KM 2 (Round)', 13),
            ('Total KM', 10),
            ('Dispatch Time', 13),
            ('Status', 11),
            ('Remarks', 26),
        ]
        label = _month_label(year, month)

        def build_sheet(ws, trips, sheet_title):
            ws.title = sheet_title
            ws.freeze_panes = 'A3'

            last_col = get_column_letter(len(COLS))
            ws.merge_cells(f'A1:{last_col}1')
            ws['A1'].value = f"JJR Logistics \u2014 {sheet_title} | {label}"
            ws['A1'].font = Font(bold=True, size=13, color='1E3A8A')
            ws['A1'].alignment = s['center']
            ws.row_dimensions[1].height = 26

            for ci, (name, width) in enumerate(COLS, 1):
                c = ws.cell(row=2, column=ci, value=name)
                c.font = HDR_FONT
                c.fill = HDR_FILL
                c.alignment = s['center']
                c.border = s['thin']
                ws.column_dimensions[get_column_letter(ci)].width = width
            ws.row_dimensions[2].height = 22

            total_km_sum = 0
            last_row = 2

            for ri, trip in enumerate(trips, 3):
                last_row = ri
                driver_name = ''
                if trip.driver and trip.driver.user:
                    u = trip.driver.user
                    driver_name = u.get_full_name() or str(u.phone or '')
                vehicle_num = trip.vehicle.vehicle_number if trip.vehicle else ''
                dispatch_str = trip.dispatch_time_1.strftime('%H:%M') if trip.dispatch_time_1 else ''
                km1_1w = float(trip.one_way_km_1 or 0)
                km2_1w = float(trip.one_way_km_2 or 0)
                total_km = float(trip.total_km or 0)
                total_km_sum += total_km

                row_data = [
                    trip.trip_date.strftime('%d-%m-%Y'),
                    driver_name,
                    vehicle_num,
                    trip.store_name_1 or '\u2014',
                    km1_1w or '\u2014',
                    km1_1w * 2 or '\u2014',
                    trip.store_name_2 or '\u2014',
                    km2_1w or '\u2014',
                    km2_1w * 2 or '\u2014',
                    total_km,
                    dispatch_str or '\u2014',
                    trip.get_status_display(),
                    trip.remarks or '',
                ]
                fill = EVEN_FILL if ri % 2 == 0 else None

                for ci, val in enumerate(row_data, 1):
                    c = ws.cell(row=ri, column=ci, value=val)
                    c.border = s['thin']
                    if fill:
                        c.fill = fill
                    if ci == 1:
                        c.alignment = s['center']
                    elif ci in (5, 6, 8, 9, 10) and isinstance(val, float):
                        c.alignment = s['right']
                        c.number_format = '0.0'

            # Totals row
            tr = last_row + 1
            for ci in range(1, len(COLS) + 1):
                c = ws.cell(row=tr, column=ci)
                c.border = s['thin']
                c.fill = TOT_FILL
                c.font = TOT_FONT
            ws.cell(row=tr, column=1).value = 'TOTAL'
            ws.cell(row=tr, column=1).alignment = s['center']
            tc = ws.cell(row=tr, column=10)
            tc.value = round(total_km_sum, 1)
            tc.number_format = '0.0'
            tc.alignment = s['right']

            summary_row = tr + 2
            ws.cell(row=summary_row, column=1).value = f"Total Trips: {len(trips)}"
            ws.cell(row=summary_row, column=1).font = Font(bold=True, size=10, color='374151')

        wb = openpyxl.Workbook()
        build_sheet(wb.active, regular, 'Regular Trips')
        build_sheet(wb.create_sheet(), adhoc, 'Adhoc Trips')

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        fname = f"MIS_{month:02d}_{year}.xlsx"
        resp = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        resp['Content-Disposition'] = f'attachment; filename="{fname}"'
        resp['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return resp


class ExpenseReportView(APIView):
    """Expense report Excel with optional filters."""
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrCoordinator]

    def get(self, request):
        import openpyxl
        from openpyxl.styles import Font, PatternFill
        from openpyxl.utils import get_column_letter
        from django.db.models import Sum

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        driver_id = request.query_params.get('driver_id')
        vehicle_id = request.query_params.get('vehicle_id')
        expense_type = request.query_params.get('expense_type')

        qs = Expense.objects.select_related('driver__user', 'vehicle', 'trip').order_by(
            'expense_date', 'expense_type'
        )
        if start_date:
            qs = qs.filter(expense_date__gte=start_date)
        if end_date:
            qs = qs.filter(expense_date__lte=end_date)
        if driver_id:
            qs = qs.filter(driver_id=driver_id)
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        if expense_type:
            qs = qs.filter(expense_type=expense_type)

        expenses = list(qs)

        s = _make_excel_styles()
        HDR_FONT = Font(bold=True, color='FFFFFF', size=10)
        HDR_FILL = PatternFill(start_color='065F46', end_color='065F46', fill_type='solid')
        TOT_FONT = Font(bold=True, size=10)
        TOT_FILL = PatternFill(start_color='D1FAE5', end_color='D1FAE5', fill_type='solid')
        EVEN_FILL = PatternFill(start_color='ECFDF5', end_color='ECFDF5', fill_type='solid')

        COLS = [
            ('Date', 12),
            ('Driver', 20),
            ('Vehicle', 14),
            ('Expense Type', 18),
            ('Amount (\u20b9)', 14),
            ('Payment Mode', 15),
            ('Linked Trip Date', 16),
            ('Reimbursable', 13),
            ('Deducted', 10),
            ('Description', 30),
        ]

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Expenses'
        ws.freeze_panes = 'A3'

        date_range = f"{start_date or 'All'} to {end_date or 'All'}"
        last_col = get_column_letter(len(COLS))
        ws.merge_cells(f'A1:{last_col}1')
        ws['A1'].value = f"JJR Logistics \u2014 Expense Report | {date_range}"
        ws['A1'].font = Font(bold=True, size=13, color='065F46')
        ws['A1'].alignment = s['center']
        ws.row_dimensions[1].height = 26

        for ci, (name, width) in enumerate(COLS, 1):
            c = ws.cell(row=2, column=ci, value=name)
            c.font = HDR_FONT
            c.fill = HDR_FILL
            c.alignment = s['center']
            c.border = s['thin']
            ws.column_dimensions[get_column_letter(ci)].width = width
        ws.row_dimensions[2].height = 22

        total_amount = 0

        for ri, exp in enumerate(expenses, 3):
            driver_name = ''
            if exp.driver and exp.driver.user:
                u = exp.driver.user
                driver_name = u.get_full_name() or str(u.phone or '')
            vehicle_num = exp.vehicle.vehicle_number if exp.vehicle else ''
            trip_date = exp.trip.trip_date.strftime('%d-%m-%Y') if exp.trip else ''
            amount = float(exp.amount)
            total_amount += amount

            row_data = [
                exp.expense_date.strftime('%d-%m-%Y'),
                driver_name or '\u2014',
                vehicle_num or '\u2014',
                exp.get_expense_type_display(),
                amount,
                exp.get_payment_mode_display() if exp.payment_mode else '\u2014',
                trip_date or '\u2014',
                'Yes' if exp.is_blinkit_reimbursable else 'No',
                'Yes' if exp.is_deducted else 'No',
                exp.description or '',
            ]
            fill = EVEN_FILL if ri % 2 == 0 else None

            for ci, val in enumerate(row_data, 1):
                c = ws.cell(row=ri, column=ci, value=val)
                c.border = s['thin']
                if fill:
                    c.fill = fill
                if ci == 1:
                    c.alignment = s['center']
                elif ci == 5:
                    c.alignment = s['right']
                    c.number_format = '#,##0.00'

        # Totals row
        tr = len(expenses) + 3
        for ci in range(1, len(COLS) + 1):
            c = ws.cell(row=tr, column=ci)
            c.border = s['thin']
            c.fill = TOT_FILL
            c.font = TOT_FONT
        ws.cell(row=tr, column=1).value = 'TOTAL'
        ws.cell(row=tr, column=1).alignment = s['center']
        tc = ws.cell(row=tr, column=5)
        tc.value = round(total_amount, 2)
        tc.number_format = '#,##0.00'
        tc.alignment = s['right']

        # Breakdown by type
        summary_start = tr + 2
        ws.cell(row=summary_start, column=1).value = 'Breakdown by Type'
        ws.cell(row=summary_start, column=1).font = Font(bold=True, size=10)

        type_totals = qs.values('expense_type').annotate(total=Sum('amount')).order_by('expense_type')
        for i, row in enumerate(type_totals, 1):
            ws.cell(row=summary_start + i, column=1).value = (
                row['expense_type'].replace('_', ' ').title()
            )
            c = ws.cell(row=summary_start + i, column=2)
            c.value = float(row['total'])
            c.number_format = '#,##0.00'
            c.alignment = s['right']

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        suffix = f"{start_date or 'all'}_{end_date or 'all'}"
        resp = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        resp['Content-Disposition'] = f'attachment; filename="Expenses_{suffix}.xlsx"'
        resp['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return resp


class PaymentSummaryReportView(APIView):
    """Payment summary as Excel (default) or PDF (format=pdf)."""
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrCoordinator]

    def get(self, request):
        year_str = request.query_params.get('year')
        month_str = request.query_params.get('month')
        fmt = request.query_params.get('format', 'excel')

        if not year_str or not month_str:
            return Response(
                {'success': False, 'message': 'year and month are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            year, month = int(year_str), int(month_str)
            if not 1 <= month <= 12:
                raise ValueError
        except ValueError:
            return Response(
                {'success': False, 'message': 'Invalid year or month'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        month_start = date(year, month, 1)
        payments = list(
            Payment.objects.select_related('driver__user', 'vehicle', 'vendor')
            .filter(month_year=month_start)
            .order_by('payment_type', 'driver__user__first_name')
        )
        label = _month_label(year, month)

        if fmt == 'pdf':
            return self._build_pdf(payments, label, year, month)
        return self._build_excel(payments, label, year, month)

    def _build_excel(self, payments, label, year, month):
        import openpyxl
        from openpyxl.styles import Font, PatternFill
        from openpyxl.utils import get_column_letter

        s = _make_excel_styles()
        HDR_FONT = Font(bold=True, color='FFFFFF', size=10)
        HDR_FILL = PatternFill(start_color='7C3AED', end_color='7C3AED', fill_type='solid')
        TOT_FONT = Font(bold=True, size=10)
        TOT_FILL = PatternFill(start_color='EDE9FE', end_color='EDE9FE', fill_type='solid')
        EVEN_FILL = PatternFill(start_color='F5F3FF', end_color='F5F3FF', fill_type='solid')

        COLS = [
            ('Driver / Vendor', 22),
            ('Vehicle', 14),
            ('Type', 15),
            ('Trips', 8),
            ('Total KM', 10),
            ('Gross (\u20b9)', 14),
            ('Fuel (\u20b9)', 12),
            ('Advance (\u20b9)', 12),
            ('Allowance (\u20b9)', 13),
            ('Toll (\u20b9)', 11),
            ('Other (\u20b9)', 11),
            ('Total Dedn (\u20b9)', 14),
            ('Final Payable (\u20b9)', 16),
            ('Status', 11),
        ]

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Payment Summary'
        ws.freeze_panes = 'A3'

        last_col = get_column_letter(len(COLS))
        ws.merge_cells(f'A1:{last_col}1')
        ws['A1'].value = f"JJR Logistics \u2014 Payment Summary | {label}"
        ws['A1'].font = Font(bold=True, size=13, color='7C3AED')
        ws['A1'].alignment = s['center']
        ws.row_dimensions[1].height = 26

        for ci, (name, width) in enumerate(COLS, 1):
            c = ws.cell(row=2, column=ci, value=name)
            c.font = HDR_FONT
            c.fill = HDR_FILL
            c.alignment = s['center']
            c.border = s['thin']
            ws.column_dimensions[get_column_letter(ci)].width = width
        ws.row_dimensions[2].height = 28

        total_final = 0

        for ri, pmt in enumerate(payments, 3):
            if pmt.driver and pmt.driver.user:
                u = pmt.driver.user
                name = u.get_full_name() or str(u.phone or '')
            elif pmt.vendor:
                name = pmt.vendor.name
            else:
                name = '\u2014'
            vehicle_num = pmt.vehicle.vehicle_number if pmt.vehicle else '\u2014'
            final = float(pmt.final_amount)
            total_final += final

            row_data = [
                name,
                vehicle_num,
                pmt.get_payment_type_display(),
                pmt.total_trips,
                float(pmt.total_km),
                float(pmt.gross_amount),
                float(pmt.total_fuel_expenses),
                float(pmt.total_advance),
                float(pmt.total_allowance),
                float(pmt.total_toll_expenses),
                float(pmt.other_deductions),
                float(pmt.total_deductions),
                final,
                pmt.get_status_display(),
            ]
            fill = EVEN_FILL if ri % 2 == 0 else None

            for ci, val in enumerate(row_data, 1):
                c = ws.cell(row=ri, column=ci, value=val)
                c.border = s['thin']
                if fill:
                    c.fill = fill
                if ci in (6, 7, 8, 9, 10, 11, 12, 13):
                    c.alignment = s['right']
                    c.number_format = '#,##0.00'
                elif ci in (4, 5):
                    c.alignment = s['right']
                elif ci == 14:
                    c.alignment = s['center']

        # Totals
        tr = len(payments) + 3
        for ci in range(1, len(COLS) + 1):
            c = ws.cell(row=tr, column=ci)
            c.border = s['thin']
            c.fill = TOT_FILL
            c.font = TOT_FONT
        ws.cell(row=tr, column=1).value = 'TOTAL PAYABLE'
        ws.cell(row=tr, column=1).alignment = s['center']
        tc = ws.cell(row=tr, column=13)
        tc.value = round(total_final, 2)
        tc.number_format = '#,##0.00'
        tc.alignment = s['right']

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        fname = f"Payments_{month:02d}_{year}.xlsx"
        resp = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        resp['Content-Disposition'] = f'attachment; filename="{fname}"'
        resp['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return resp

    def _build_pdf(self, payments, label, year, month):
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.lib.enums import TA_CENTER
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=landscape(A4),
            rightMargin=10 * mm,
            leftMargin=10 * mm,
            topMargin=12 * mm,
            bottomMargin=12 * mm,
        )
        styles = getSampleStyleSheet()
        purple = colors.HexColor('#7C3AED')
        light_purple = colors.HexColor('#F5F3FF')
        yellow = colors.HexColor('#FEF08A')

        title_style = ParagraphStyle(
            'ReportTitle', parent=styles['Title'],
            textColor=purple, fontSize=15, spaceAfter=2,
        )
        sub_style = ParagraphStyle(
            'ReportSub', parent=styles['Normal'],
            textColor=colors.HexColor('#374151'), fontSize=10, spaceAfter=6,
        )

        elements = [
            Paragraph("JJR Logistics \u2014 Payment Summary", title_style),
            Paragraph(label, sub_style),
            Spacer(1, 4 * mm),
        ]

        headers = [
            'Driver / Vendor', 'Vehicle', 'Type', 'Trips', 'KM',
            'Gross (\u20b9)', 'Fuel (\u20b9)', 'Advance (\u20b9)', 'Allowance (\u20b9)',
            'Deductions (\u20b9)', 'Final (\u20b9)', 'Status',
        ]
        data = [headers]
        total_final = 0

        for pmt in payments:
            if pmt.driver and pmt.driver.user:
                u = pmt.driver.user
                name = u.get_full_name() or str(u.phone or '')
            elif pmt.vendor:
                name = pmt.vendor.name
            else:
                name = '\u2014'
            final = float(pmt.final_amount)
            total_final += final
            data.append([
                name,
                pmt.vehicle.vehicle_number if pmt.vehicle else '\u2014',
                pmt.get_payment_type_display(),
                str(pmt.total_trips),
                f"{float(pmt.total_km):.1f}",
                f"{float(pmt.gross_amount):,.0f}",
                f"{float(pmt.total_fuel_expenses):,.0f}",
                f"{float(pmt.total_advance):,.0f}",
                f"{float(pmt.total_allowance):,.0f}",
                f"{float(pmt.total_deductions):,.0f}",
                f"{final:,.0f}",
                pmt.get_status_display(),
            ])

        data.append(['TOTAL', '', '', '', '', '', '', '', '', '', f"{total_final:,.0f}", ''])

        col_widths = [38*mm, 20*mm, 20*mm, 12*mm, 14*mm, 20*mm, 17*mm, 19*mm, 19*mm, 22*mm, 20*mm, 15*mm]

        table = Table(data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), purple),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 8),
            ('ALIGN', (3, 1), (-2, -2), 'RIGHT'),
            ('ALIGN', (0, 1), (2, -1), 'LEFT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, light_purple]),
            ('BACKGROUND', (0, -1), (-1, -1), yellow),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 9),
            ('ALIGN', (10, -1), (10, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWHEIGHT', (0, 0), (-1, 0), 16),
            ('ROWHEIGHT', (0, 1), (-1, -1), 14),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 5 * mm))
        elements.append(Paragraph(
            f"Generated: {date.today().strftime('%d %B %Y')} | "
            f"Records: {len(payments)} | "
            f"Total Payable: \u20b9{total_final:,.0f}",
            styles['Normal'],
        ))

        doc.build(elements)
        buf.seek(0)

        fname = f"Payments_{month:02d}_{year}.pdf"
        resp = HttpResponse(buf.getvalue(), content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{fname}"'
        resp['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return resp
