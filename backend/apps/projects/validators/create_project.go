package validators

import (
	CommonValidators "taskflow/apps/common/validators"
	"taskflow/apps/projects/requests"
)

type CreateTaskRequestValidator struct {
}

func (validators *CreateTaskRequestValidator) Validate(request requests.CreateProjectRequest, requestID string) {
	CommonValidators.GenericValidator(requestID, &request)
}
