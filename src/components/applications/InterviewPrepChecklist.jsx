import { useState } from 'react';
import { updateInterviewChecklist } from '../../services/applicationsService';
import { useToast } from '../../hooks/useToast';
import ConfirmationModal from '../common/ConfirmationModal';

export const DEFAULT_CHECKLIST_ITEMS = [
  {
    id: 'prep-1',
    text: 'Research company culture, business model, and recent product launches',
    category: 'Company Research',
    completed: false,
  },
  {
    id: 'prep-2',
    text: 'Analyze the job requirements and prepare 3 key matching value propositions',
    category: 'Company Research',
    completed: false,
  },
  {
    id: 'prep-3',
    text: 'Prepare 4 STAR stories (Leadership, Overcoming Obstacle, Technical Challenge, High Impact)',
    category: 'Behavioral',
    completed: false,
  },
  {
    id: 'prep-4',
    text: 'Formulate a crisp 90-second "Tell Me About Yourself" executive summary',
    category: 'Behavioral',
    completed: false,
  },
  {
    id: 'prep-5',
    text: 'Review core domain concepts, system architecture, and algorithmic trade-offs',
    category: 'Technical',
    completed: false,
  },
  {
    id: 'prep-6',
    text: 'Prepare 4 thoughtful questions to ask the hiring team about roadmap and team health',
    category: 'Questions',
    completed: false,
  },
  {
    id: 'prep-7',
    text: 'Test webcam, microphone clarity, screen sharing, and quiet environment',
    category: 'Logistics',
    completed: false,
  },
  {
    id: 'prep-8',
    text: 'Draft post-interview personalized thank-you note within 24 hours',
    category: 'Follow-up',
    completed: false,
  },
];

const CATEGORIES = [
  'All',
  'Company Research',
  'Behavioral',
  'Technical',
  'Questions',
  'Logistics',
  'Follow-up',
];

export default function InterviewPrepChecklist({
  applicationId,
  companyName = 'Company',
  jobTitle = 'Role',
  initialChecklist = [],
  onChecklistUpdated,
}) {
  const { showSuccess, showError } = useToast();

  const [checklist, setChecklist] = useState(() => {
    if (initialChecklist && initialChecklist.length > 0) {
      return initialChecklist;
    }
    return DEFAULT_CHECKLIST_ITEMS;
  });

  const [filterCategory, setFilterCategory] = useState('All');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('Company Research');
  const [isSaving, setIsSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  // Calculations
  const totalCount = checklist.length;
  const completedCount = checklist.filter((item) => item.completed).length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredItems = checklist.filter((item) => {
    if (filterCategory === 'All') return true;
    return item.category === filterCategory;
  });

  // Persist to backend
  const persistChecklist = async (updatedList, successMsg) => {
    setChecklist(updatedList);
    setIsSaving(true);
    const { success, error } = await updateInterviewChecklist(applicationId, updatedList);
    setIsSaving(false);

    if (success) {
      if (successMsg) showSuccess(successMsg);
      if (onChecklistUpdated) onChecklistUpdated(updatedList);
    } else {
      showError(error || 'Failed to save checklist.');
    }
  };

  // Toggle item
  const handleToggleItem = (itemId) => {
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    persistChecklist(updated);
  };

  // Add new item
  const handleAddItem = (e) => {
    e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed) return;

    const newItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: trimmed,
      category: newCategory,
      completed: false,
    };

    const updated = [...checklist, newItem];
    setNewText('');
    persistChecklist(updated, 'New prep task added.');
  };

  // Delete item
  const handleDeleteItem = (itemId) => {
    const updated = checklist.filter((item) => item.id !== itemId);
    persistChecklist(updated, 'Prep task removed.');
  };

  // Edit item inline
  const handleStartEdit = (item) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = (itemId) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, text: trimmed } : item
    );
    setEditingItemId(null);
    persistChecklist(updated, 'Prep task updated.');
  };

  // Reset to default template
  const handleResetTemplate = () => {
    setShowResetModal(true);
  };

  const handleConfirmReset = () => {
    setShowResetModal(false);
    persistChecklist(DEFAULT_CHECKLIST_ITEMS, 'Reset to standard interview checklist.');
  };

  // Copy checklist to clipboard
  const handleCopyClipboard = () => {
    const text = checklist
      .map((item) => `[${item.completed ? 'x' : ' '}] (${item.category}) ${item.text}`)
      .join('\n');
    navigator.clipboard?.writeText(
      `Interview Prep Checklist for ${companyName} (${jobTitle})\n\n${text}`
    );
    showSuccess('Copied checklist to clipboard.');
  };

  return (
    <div
      id="interview-prep-checklist-section"
      className="rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 p-space-md sm:p-space-lg space-y-space-md"
    >
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs border-b border-surface-container-high/30">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary text-[22px]">
            fact_check
          </span>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Interview Prep Checklist
            </h2>
            <p className="font-body-sm text-[12px] text-outline">
              Structured preparation for {companyName} • {jobTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors border border-outline-variant/30"
            title="Copy checklist as text"
          >
            <span className="material-symbols-outlined text-[15px]">content_copy</span>
            <span>Copy</span>
          </button>

          <button
            type="button"
            onClick={handleResetTemplate}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-outline hover:text-primary hover:bg-surface-container text-xs font-semibold transition-colors border border-outline-variant/30"
            title="Reset to recommended checklist"
          >
            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            <span>Reset Template</span>
          </button>
        </div>
      </div>

      {/* Progress Bar & Velocity */}
      <div className="bg-surface-container-low/80 p-3 rounded-xl space-y-2 border border-surface-container-high/30">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-on-surface">
            Readiness Progress: {completedCount} of {totalCount} completed
          </span>
          <span className="font-mono font-bold text-primary">{percentComplete}%</span>
        </div>

        <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              percentComplete === 100
                ? 'bg-emerald-500'
                : percentComplete > 50
                ? 'bg-primary'
                : 'bg-amber-500'
            }`}
            style={{ width: `${percentComplete}%` }}
          />
        </div>

        {percentComplete === 100 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold pt-1">
            <span className="material-symbols-outlined text-[16px]">celebration</span>
            <span>All interview preparation tasks checked off! You're ready to ace this.</span>
          </div>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all font-medium ${
              filterCategory === cat
                ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Checklist Items Stream */}
      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-outline text-xs">
            No checklist items in this category.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isEditing = editingItemId === item.id;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 group ${
                  item.completed
                    ? 'bg-surface-container-low/40 border-surface-container-high/30 opacity-75'
                    : 'bg-surface-container-lowest border-surface-container-high/50 hover:border-primary/40 shadow-xs'
                }`}
              >
                {/* Checkbox and Text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleItem(item.id)}
                    className="mt-0.5 w-4 h-4 rounded border-outline text-primary focus:ring-primary cursor-pointer shrink-0"
                    id={`check-prep-${item.id}`}
                  />

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item.id);
                            if (e.key === 'Escape') setEditingItemId(null);
                          }}
                          className="flex-1 px-2 py-1 text-xs bg-surface-container-low border border-primary rounded-lg focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-2 py-1 bg-primary text-on-primary text-xs rounded-lg font-semibold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="px-2 py-1 text-outline hover:text-on-surface text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label
                          htmlFor={`check-prep-${item.id}`}
                          className={`text-xs font-medium cursor-pointer block leading-relaxed ${
                            item.completed
                              ? 'line-through text-outline'
                              : 'text-on-surface'
                          }`}
                        >
                          {item.text}
                        </label>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-container text-outline">
                          {item.category}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Controls */}
                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1 text-outline hover:text-on-surface rounded transition-colors"
                      title="Edit task text"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-outline hover:text-error rounded transition-colors"
                      title="Remove task"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom Task Form */}
      <form
        onSubmit={handleAddItem}
        className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-surface-container-high/30"
      >
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add custom preparation task (e.g., practice LeetCode 206, review GraphQL...)"
          className="flex-1 w-full px-3 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-2.5 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none"
          >
            {CATEGORIES.filter((c) => c !== 'All').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!newText.trim() || isSaving}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary-container text-on-primary font-semibold text-xs hover:bg-primary transition-colors disabled:opacity-50 shrink-0"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Add Task</span>
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showResetModal}
        title="Reset Interview Checklist?"
        message="This will reset all preparation items for this role to the recommended standard template. Any custom items you added will be removed."
        confirmText="Reset Checklist"
        confirmVariant="danger"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
}
