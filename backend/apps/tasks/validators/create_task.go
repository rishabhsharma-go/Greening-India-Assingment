package validators

import (
	CommonValidators "taskflow/apps/common/validators"
	"taskflow/apps/tasks/requests"
)

type CreateTaskRequestValidator struct {
}

func (validators *CreateTaskRequestValidator) Validate(request requests.CreateTaskRequest, requestID string) {
	CommonValidators.GenericValidator(requestID, &request)
}
