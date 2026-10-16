from rest_framework.exceptions import APIException


class FinancialConflict(APIException):
    status_code = 409
    default_code = "financial_conflict"
    default_detail = "The operation conflicts with recorded financial history."
