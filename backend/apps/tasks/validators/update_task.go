package validators

import (
	CommonValidators "taskflow/apps/common/validators"
	"taskflow/apps/tasks/requests"
)

type UpdateTaskRequestValidator struct {
}

func (validators *UpdateTaskRequestValidator) Validate(request requests.UpdateTaskRequest, requestID string) {
	CommonValidators.GenericValidator(requestID, &request)
}
