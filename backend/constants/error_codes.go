package constants

type CustomErrorCode string

const CUSTOM_ERROR_STRING = "*customError.CustomError"

const (
	VALIDATION_ERROR_CODE       CustomErrorCode = "TF-400"
	UNAUTHORIZED_ERROR_CODE     CustomErrorCode = "TF-401"
	FORBIDDEN_ERROR_CODE        CustomErrorCode = "TF-403"
	RECORD_NOT_FOUND_ERROR_CODE CustomErrorCode = "TF-404"
	INTERNAL_SERVER_ERROR_CODE  CustomErrorCode = "TF-500"
	GENERIC_ERROR_CODE          CustomErrorCode = "TF-501"
)
