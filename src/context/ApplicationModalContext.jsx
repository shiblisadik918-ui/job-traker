import { createContext, useContext, useState, useCallback } from 'react';
import { createApplication, updateApplication } from '../services/applicationsService';
import { useToast } from '../hooks/useToast';
import ApplicationFormModal from '../components/applications/ApplicationFormModal';

const ApplicationModalContext = createContext({
  openAddModal: () => {},
  openEditModal: () => {},
  closeModal: () => {},
});

export function ApplicationModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const openAddModal = useCallback((defaultValues = null) => {
    // Sanitize: If defaultValues is a DOM/React SyntheticEvent, ignore it
    const isSyntheticEvent =
      defaultValues &&
      (defaultValues.nativeEvent ||
        defaultValues.target ||
        typeof defaultValues.preventDefault === 'function');
    const safeData = isSyntheticEvent || !defaultValues ? null : defaultValues;
    setEditingApp(safeData);
    setIsSubmitting(false);
    setIsOpen(true);
  }, []);

  const openEditModal = useCallback((app) => {
    setEditingApp(app || null);
    setIsSubmitting(false);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsSubmitting(false);
    setIsOpen(false);
    setEditingApp(null);
  }, []);

  const handleSave = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingApp && editingApp.id) {
        const { success, error } = await updateApplication(editingApp.id, formData);
        if (success) {
          showSuccess('Application updated successfully.');
          setIsOpen(false);
          setEditingApp(null);
          window.dispatchEvent(
            new CustomEvent('jobtrack:application-changed', {
              detail: { id: editingApp.id, action: 'update' },
            })
          );
        } else {
          showError(error || 'Failed to update application.');
        }
      } else {
        const { data, error } = await createApplication(formData);
        if (error) {
          showError(error);
        } else {
          showSuccess('Application saved successfully.');
          setIsOpen(false);
          setEditingApp(null);
          window.dispatchEvent(
            new CustomEvent('jobtrack:application-changed', {
              detail: { data, action: 'create' },
            })
          );
        }
      }
    } catch (err) {
      showError(err?.message || 'Failed to save application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ApplicationModalContext.Provider value={{ openAddModal, openEditModal, closeModal }}>
      {children}
      <ApplicationFormModal
        isOpen={isOpen}
        initialData={editingApp}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onSave={handleSave}
      />
    </ApplicationModalContext.Provider>
  );
}

export function useApplicationModal() {
  return useContext(ApplicationModalContext);
}
