package customError

import (
	"errors"
	"taskflow/constants"
)

type CustomError struct {
	errorField     error
	errorCode      constants.CustomErrorCode
	httpStatusCode int
	fields         map[string]string
}

func NewCustomError(err error, errorCode constants.CustomErrorCode, httpErrorCode int) *CustomError {
	return &CustomError{
		errorField:     err,
		errorCode:      errorCode,
		httpStatusCode: httpErrorCode,
	}
}

func NewValidationError(err error, fields map[string]string) *CustomError {
	return &CustomError{
		errorField:     err,
		errorCode:      constants.VALIDATION_ERROR_CODE,
		httpStatusCode: 400,
		fields:         fields,
	}
}

func (e *CustomError) GetErrorField() error {
	return e.errorField
}
func (e *CustomError) GetErrorCode() string {
	return string(e.errorCode)
}
func (e *CustomError) GetHttpStatusCode() int {
	return e.httpStatusCode
}
func (e *CustomError) GetFields() map[string]string {
	return e.fields
}
func (e *CustomError) Error() string {
	return e.errorField.Error()
}

func ErrNotFound(msg string) *CustomError {
	return NewCustomError(errors.New(msg), constants.RECORD_NOT_FOUND_ERROR_CODE, 404)
}

func ErrForbidden() *CustomError {
	return NewCustomError(errors.New(constants.ERR_FORBIDDEN), constants.FORBIDDEN_ERROR_CODE, 403)
}

func ErrUnauthorized() *CustomError {
	return NewCustomError(errors.New(constants.ERR_UNAUTHORIZED), constants.UNAUTHORIZED_ERROR_CODE, 401)
}

func ErrInternal() *CustomError {
	return NewCustomError(errors.New(constants.ERR_INTERNAL), constants.INTERNAL_SERVER_ERROR_CODE, 500)
}
