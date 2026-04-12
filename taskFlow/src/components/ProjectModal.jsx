import { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import { projectsApi } from '../api/projects.js';
import { useToast } from '../context/ToastContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

const EMPTY_FORM = { name: '', description: '' };

export default function ProjectModal({ isOpen, onClose, project, onSaved }) {
  const isEditing = Boolean(project);
  const { addToast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(
        project
          ? { name: project.name ?? '', description: project.description ?? '' }
          : EMPTY_FORM
      );
      setErrors({});
    }
  }, [isOpen, project]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Project name is required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      let saved;
      const payload = { name: form.name.trim(), description: form.description.trim() };

      if (isEditing) {
        saved = await projectsApi.update(project.id, payload);
      } else {
        saved = await projectsApi.create(payload);
      }

      addToast(isEditing ? 'Project updated' : 'Project created', 'success');
      onSaved(saved, isEditing);
      onClose();
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
      } else {
        addToast(err.message ?? 'Something went wrong', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Project' : 'New Project'}>
      <form id="project-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="project-name" className="form-label">
            Name <span className="form-required">*</span>
          </label>
          <input
            id="project-name"
            name="name"
            type="text"
            className={`form-input${errors.name ? ' form-input--error' : ''}`}
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Website Redesign"
            autoFocus
            maxLength={100}
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="project-description" className="form-label">
            Description
          </label>
          <textarea
            id="project-description"
            name="description"
            className="form-input form-textarea"
            value={form.description}
            onChange={handleChange}
            placeholder="What is this project about?"
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            id={isEditing ? 'save-project-btn' : 'create-project-btn'}
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
          >
            {submitting ? (
              <LoadingSpinner size="sm" label="Saving…" />
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Create Project'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
