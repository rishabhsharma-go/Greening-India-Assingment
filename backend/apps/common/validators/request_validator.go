package validators

import (
	"errors"
	"fmt"
	"strings"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"

	"github.com/go-playground/validator/v10"
)

func ValidationMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "is required"
	case "email":
		return "must be a valid email"
	case "min":
		return fmt.Sprintf("must be at least %s characters", fe.Param())
	case "max":
		return fmt.Sprintf("must be at most %s characters", fe.Param())
	case "oneof":
		return fmt.Sprintf("must be one of: %s", fe.Param())
	case "uuid":
		return "must be a valid UUID"
	default:
		return "is invalid"
	}
}

func GenericValidator(requestID string, request interface{}) {
	if err := validator.New().Struct(request); err != nil {
		fields := make(map[string]string)
		for _, fe := range err.(validator.ValidationErrors) {
			fields[strings.ToLower(fe.Field())] = ValidationMessage(fe)
		}
		panic(customError.NewValidationError(errors.New(constants.ERR_VALIDATION_FAILED), fields))
	}
}
