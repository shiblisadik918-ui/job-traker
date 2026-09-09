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
    setEditingApp(defaultValues);
    setIsOpen(true);
  }, []);

  const openEditModal = useCallback((app) => {
    setEditingApp(app);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (!isSubmitting) {
      setIsOpen(false);
      setEditingApp(null);
    }
  }, [isSubmitting]);

  const handleSave = async (formData) => {
    setIsSubmitting(true);
    if (editingApp && editingApp.id) {
      const { success, error } = await updateApplication(editingApp.id, formData);
      setIsSubmitting(false);
      if (success) {
        showSuccess('Application updated successfully.');
        setIsOpen(false);
        setEditingApp(null);
        window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id: editingApp.id, action: 'update' } }));
      } else {
        showError(error || 'Failed to update application.');
      }
    } else {
      const { data, error } = await createApplication(formData);
      setIsSubmitting(false);
      if (error) {
        showError(error);
      } else {
        showSuccess('Application saved successfully.');
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { data, action: 'create' } }));
      }
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
