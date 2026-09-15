import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { uploadFileToDrive } from '../../services/googleDriveService';
import {
  APPLICATION_STATUSES,
  JOB_TYPES,
  APPLICATION_SOURCES,
  PRIORITY_LEVELS,
  JOB_DISTINCTION_TYPES,
  GOVT_JOB_GRADES,
  GOVT_PAYMENT_STATUSES,
  GOVT_ADMIT_CARD_STATUSES,
  GOVT_STAGE_STATUSES,
  DEFAULT_GOVT_EXAM_STAGES,
  PRIVATE_ROUND_STATUSES,
  DEFAULT_PRIVATE_INTERVIEW_ROUNDS,
} from '../../utils/constants';

export default function ApplicationFormModal({
  isOpen,
  initialData = null,
  isSubmitting = false,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(initialData && initialData.id);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const defaultFormState = {
    job_type: 'Private', // 'Government' | 'Private'
    companyName: '',
    ministryDepartment: '',
    jobTitle: '',
    companyLogo: '',
    location: '',
    jobType: 'Full-time',
    jobUrl: '',
    applicationDate: getTodayString(),
    status: 'Applied',
    priority: 'Medium',
    deadline: '',
    applicationSource: 'LinkedIn',
    salary: '',
    notes: '',
    fileUrl: '',
    fileName: '',
    
    // Government specific
    jobGrade: '9th Grade (First Class / BCS)',
    circularId: '',
    applicationFee: '',
    paymentStatus: 'Pending',
    admitCardStatus: 'Not Published',
    userRollNumber: '',
    govtExamStages: JSON.parse(JSON.stringify(DEFAULT_GOVT_EXAM_STAGES)),

    // Private specific
    recruiterName: '',
    recruiterEmail: '',
    recruiterRole: '',
    recruiterPhone: '',
    privateInterviewRounds: JSON.parse(JSON.stringify(DEFAULT_PRIVATE_INTERVIEW_ROUNDS)),
  };

  const {
    hasGoogleDriveAccess,
    connectGoogleDrive,
    getGoogleAccessToken,
  } = useAuth();

  const [formData, setFormData] = useState(defaultFormState);
  const [validationErrors, setValidationErrors] = useState({});
  const [isCloudinaryUploading, setIsCloudinaryUploading] = useState(false);
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadSource, setUploadSource] = useState(''); // 'cloudinary' | 'drive'

  useEffect(() => {
    if (!isOpen) return;

    // Check if initialData is a valid object and NOT a synthetic click event
    const isSyntheticEvent =
      initialData &&
      (initialData.nativeEvent ||
        initialData.target ||
        typeof initialData.preventDefault === 'function');
    const validData = isSyntheticEvent ? null : initialData;

    if (validData) {
      const initialJobType = validData.job_type || (validData.ministryDepartment ? 'Government' : 'Private');
      setFormData({
        job_type: initialJobType,
        companyName: validData.companyName || '',
        ministryDepartment: validData.ministryDepartment || (initialJobType === 'Government' ? validData.companyName : ''),
        jobTitle: validData.jobTitle || '',
        companyLogo: validData.companyLogo || '',
        location: validData.location || '',
        jobType: validData.jobType || 'Full-time',
        jobUrl: validData.jobUrl || '',
        applicationDate: validData.applicationDate || getTodayString(),
        status: validData.status || 'Applied',
        priority: validData.priority || 'Medium',
        deadline: validData.deadline || '',
        applicationSource: validData.applicationSource || (initialJobType === 'Government' ? 'Govt Official Gazette / Circular' : 'LinkedIn'),
        salary: validData.salary || '',
        notes: validData.notes || '',
        fileUrl: validData.fileUrl || '',
        fileName: validData.fileName || '',
        
        // Govt fields
        jobGrade: validData.jobGrade || '9th Grade (First Class / BCS)',
        circularId: validData.circularId || '',
        applicationFee: validData.applicationFee || '',
        paymentStatus: validData.paymentStatus || 'Pending',
        admitCardStatus: validData.admitCardStatus || 'Not Published',
        userRollNumber: validData.userRollNumber || '',
        govtExamStages: Array.isArray(validData.govtExamStages) && validData.govtExamStages.length > 0
          ? validData.govtExamStages
          : JSON.parse(JSON.stringify(DEFAULT_GOVT_EXAM_STAGES)),

        // Private fields
        recruiterName: validData.recruiterName || '',
        recruiterEmail: validData.recruiterEmail || '',
        recruiterRole: validData.recruiterRole || '',
        recruiterPhone: validData.recruiterPhone || '',
        privateInterviewRounds: Array.isArray(validData.privateInterviewRounds) && validData.privateInterviewRounds.length > 0
          ? validData.privateInterviewRounds
          : JSON.parse(JSON.stringify(DEFAULT_PRIVATE_INTERVIEW_ROUNDS)),
      });
    } else {
      setFormData(defaultFormState);
    }
    setValidationErrors({});
    setIsCloudinaryUploading(false);
    setUploadMessage('');
  }, [isOpen, initialData?.id]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'ministryDepartment' && prev.job_type === 'Government') {
        updated.companyName = value;
      }
      return updated;
    });
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleJobTypeChange = (newType) => {
    setFormData((prev) => {
      const updated = { ...prev, job_type: newType };
      if (newType === 'Government') {
        if (!prev.ministryDepartment && prev.companyName) {
          updated.ministryDepartment = prev.companyName;
        }
        if (!prev.applicationSource || prev.applicationSource === 'LinkedIn') {
          updated.applicationSource = 'Govt Official Gazette / Circular';
        }
      } else {
        if (!prev.companyName && prev.ministryDepartment) {
          updated.companyName = prev.ministryDepartment;
        }
        if (!prev.applicationSource || prev.applicationSource === 'Govt Official Gazette / Circular') {
          updated.applicationSource = 'LinkedIn';
        }
      }
      return updated;
    });
  };

  // Handler for updating a Government Exam Stage
  const handleGovtStageChange = (index, field, value) => {
    setFormData((prev) => {
      const newStages = [...prev.govtExamStages];
      newStages[index] = { ...newStages[index], [field]: value };
      return { ...prev, govtExamStages: newStages };
    });
  };

  // Handler for updating a Private Interview Round
  const handlePrivateRoundChange = (index, field, value) => {
    setFormData((prev) => {
      const newRounds = [...prev.privateInterviewRounds];
      newRounds[index] = { ...newRounds[index], [field]: value };
      return { ...prev, privateInterviewRounds: newRounds };
    });
  };

  // Handler for direct file upload (CV / Photo / Circular) via Cloudinary
  const handleCloudinaryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCloudinaryUploading(true);
    setUploadMessage('Uploading file to Cloudinary...');

    try {
      const result = await uploadToCloudinary(file);
      if (result && result.url) {
        setFormData((prev) => ({
          ...prev,
          fileUrl: result.url,
          fileName: file.name,
        }));
        setUploadSource('cloudinary');
        setUploadMessage(`Uploaded successfully to Cloudinary: ${file.name}`);
      }
    } catch (err) {
      console.error(err);
      setUploadMessage('Upload failed: ' + (err.message || 'Check connection.'));
    } finally {
      setIsCloudinaryUploading(false);
    }
  };

  // Handler for direct file upload into user's Google Drive
  const handleGoogleDriveUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = getGoogleAccessToken();
    if (!token) {
      setUploadMessage('Google Drive not connected. Please connect your Google account.');
      return;
    }

    setIsDriveUploading(true);
    setUploadMessage('Uploading directly to your Google Drive...');

    try {
      const result = await uploadFileToDrive(token, file, file.name, file.type || 'application/octet-stream');
      const viewUrl = result.webViewLink || result.webContentLink || '';
      setFormData((prev) => ({
        ...prev,
        fileUrl: viewUrl,
        fileName: file.name,
      }));
      setUploadSource('drive');
      setUploadMessage(`Uploaded to Google Drive successfully: ${file.name}`);
    } catch (err) {
      console.error(err);
      setUploadMessage('Drive upload failed: ' + (err.message || 'Check permissions.'));
    } finally {
      setIsDriveUploading(false);
    }
  };

  const validate = () => {
    const errors = {};
    if (formData.job_type === 'Government') {
      if (!formData.ministryDepartment?.trim()) {
        errors.ministryDepartment = 'Ministry or Department name is required';
      }
    } else {
      if (!formData.companyName?.trim()) {
        errors.companyName = 'Company name is required';
      }
    }

    if (!formData.jobTitle.trim()) {
      errors.jobTitle = 'Job title / Position is required';
    }
    if (!formData.applicationDate) {
      errors.applicationDate = 'Application date is required';
    }
    if (!formData.status) {
      errors.status = 'Status is required';
    }
    if (formData.jobUrl && formData.jobUrl.trim()) {
      const url = formData.jobUrl.trim();
      if (!/^https?:\/\/.+/i.test(url)) {
        errors.jobUrl = 'URL must start with http:// or https://';
      }
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const payload = {
      ...formData,
      companyName: formData.job_type === 'Government' 
        ? (formData.ministryDepartment?.trim() || 'Bangladesh Government')
        : formData.companyName.trim(),
    };

    onSave(payload);
  };

  const isGovt = formData.job_type === 'Government';

  const monogram = isGovt
    ? (formData.ministryDepartment ? formData.ministryDepartment.trim().slice(0, 2).toUpperCase() : 'BD')
    : (formData.companyName ? formData.companyName.trim().slice(0, 2).toUpperCase() : 'JT');

  return (
    <div
      id="application-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="application-form-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-form-modal-title"
        className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl max-w-2xl w-full my-6 p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-xs ${
              isGovt ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-primary-fixed text-primary'
            }`}>
              {monogram}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="application-form-modal-title" className="font-headline-sm text-headline-sm text-on-surface">
                  {isEditing ? 'Edit Job Record' : 'Add New Job Application'}
                </h2>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  isGovt 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {isGovt ? '🏛️ Government Job' : '💼 Private Job'}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {isGovt
                  ? 'Track Bangladesh Government circulars, grade, admit cards, and sequential exams.'
                  : 'Track corporate opportunities, HR rounds, technical evaluations, and compensation.'}
              </p>
            </div>
          </div>
          <button
            id="close-application-form-modal-btn"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="text-outline hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition-colors focus:outline-none cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px] pointer-events-none">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form id="application-modal-form" onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Job Type Switcher */}
          <div className="bg-surface-container-low p-3 rounded-2xl border border-surface-container-high/60 space-y-2">
            <label className="block font-label-md text-label-md text-on-surface font-semibold">
              Select Job Classification <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-job-type-govt"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleJobTypeChange('Government');
                }}
                className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-[0.98] ${
                  isGovt
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400/40'
                    : 'bg-surface hover:bg-surface-container text-on-surface border-outline-variant/40 hover:border-emerald-600/40'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] pointer-events-none">account_balance</span>
                <span className="pointer-events-none font-medium">Government (সরকারি চাকরি)</span>
              </button>
              <button
                type="button"
                id="btn-job-type-private"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleJobTypeChange('Private');
                }}
                className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-[0.98] ${
                  !isGovt
                    ? 'bg-primary text-on-primary border-primary shadow-sm ring-2 ring-primary/40'
                    : 'bg-surface hover:bg-surface-container text-on-surface border-outline-variant/40 hover:border-primary/40'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] pointer-events-none">corporate_fare</span>
                <span className="pointer-events-none font-medium">Private / MNC (বেসরকারি)</span>
              </button>
            </div>
            <p className="text-[11px] text-on-surface-variant px-1">
              {isGovt
                ? 'Shows circular references, pay scale grades, Teletalk SMS payment, and sequential exam stages.'
                : 'Shows company name, recruiters, salary packages, and sequential interview rounds.'}
            </p>
          </div>

          {/* 2. Core Organization & Role Details */}
          <div className="space-y-3.5">
            <h3 className="font-label-sm text-label-sm text-primary uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-[16px]">
                {isGovt ? 'account_balance' : 'domain'}
              </span>
              <span>{isGovt ? 'Ministry / Department & Position' : 'Company & Role'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Dynamic Org Name: Ministry for Govt / Company for Private */}
              {isGovt ? (
                <div>
                  <label
                    htmlFor="input-ministry-dept"
                    className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                  >
                    Ministry / Department / Agency <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                      account_balance
                    </span>
                    <input
                      id="input-ministry-dept"
                      name="ministryDepartment"
                      type="text"
                      placeholder="e.g. BPSC, Bangladesh Bank, Ministry of Finance"
                      value={formData.ministryDepartment}
                      onChange={handleChange}
                      className={`w-full pl-9 pr-3 py-2 bg-surface-container-low border rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                        validationErrors.ministryDepartment
                          ? 'border-error bg-error-container/20'
                          : 'border-outline-variant/50'
                      }`}
                    />
                  </div>
                  {validationErrors.ministryDepartment && (
                    <p className="text-[11px] text-error mt-1">{validationErrors.ministryDepartment}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="input-company-name"
                    className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                  >
                    Company / Employer Name <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                      business
                    </span>
                    <input
                      id="input-company-name"
                      name="companyName"
                      type="text"
                      placeholder="e.g. bKash, Grameenphone, Brain Station 23"
                      value={formData.companyName}
                      onChange={handleChange}
                      className={`w-full pl-9 pr-3 py-2 bg-surface-container-low border rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                        validationErrors.companyName
                          ? 'border-error bg-error-container/20'
                          : 'border-outline-variant/50'
                      }`}
                    />
                  </div>
                  {validationErrors.companyName && (
                    <p className="text-[11px] text-error mt-1">{validationErrors.companyName}</p>
                  )}
                </div>
              )}

              {/* Job Title */}
              <div>
                <label
                  htmlFor="input-job-title"
                  className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                >
                  Job Title / Designation <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                    badge
                  </span>
                  <input
                    id="input-job-title"
                    name="jobTitle"
                    type="text"
                    placeholder={isGovt ? 'e.g. Assistant Director, Sub-Inspector' : 'e.g. Senior Frontend Engineer, Product Manager'}
                    value={formData.jobTitle}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 bg-surface-container-low border rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      validationErrors.jobTitle
                        ? 'border-error bg-error-container/20'
                        : 'border-outline-variant/50'
                    }`}
                  />
                </div>
                {validationErrors.jobTitle && (
                  <p className="text-[11px] text-error mt-1">{validationErrors.jobTitle}</p>
                )}
              </div>

              {/* Government Specific: Job Grade & Circular ID */}
              {isGovt && (
                <>
                  <div>
                    <label
                      htmlFor="select-job-grade"
                      className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                    >
                      Pay Scale Grade
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                        military_tech
                      </span>
                      <select
                        id="select-job-grade"
                        name="jobGrade"
                        value={formData.jobGrade}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        {GOVT_JOB_GRADES.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="input-circular-id"
                      className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                    >
                      Circular ID / Reference
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                        tag
                      </span>
                      <input
                        id="input-circular-id"
                        name="circularId"
                        type="text"
                        placeholder="e.g. 05.00.0000.130.00.001.26-114"
                        value={formData.circularId}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Location */}
              <div>
                <label
                  htmlFor="input-location"
                  className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                >
                  {isGovt ? 'Posting / Zone Location' : 'Location / Modality'}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                    location_on
                  </span>
                  <input
                    id="input-location"
                    name="location"
                    type="text"
                    placeholder={isGovt ? 'e.g. Dhaka (Head Office) or Any District' : 'e.g. Remote, Hybrid, or Dhaka'}
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Job Type / Nature */}
              <div>
                <label
                  htmlFor="select-job-type"
                  className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                >
                  Employment Nature
                </label>
                <select
                  id="select-job-type"
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {JOB_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Listing or Circular URL */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="input-job-url"
                  className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                >
                  {isGovt ? 'Official Circular / Teletalk URL' : 'Job Posting URL'}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                    link
                  </span>
                  <input
                    id="input-job-url"
                    name="jobUrl"
                    type="url"
                    placeholder={isGovt ? 'http://bpsc.teletalk.com.bd or circular notice link' : 'https://company.com/careers/...'}
                    value={formData.jobUrl}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 bg-surface-container-low border rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      validationErrors.jobUrl
                        ? 'border-error bg-error-container/20'
                        : 'border-outline-variant/50'
                    }`}
                  />
                </div>
                {validationErrors.jobUrl && (
                  <p className="text-[11px] text-error mt-1">{validationErrors.jobUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* 3. Government Specific: Fees, Payment Status, Admit Card & Roll Number */}
          {isGovt && (
            <div className="space-y-3.5 pt-2 border-t border-surface-container">
              <h3 className="font-label-sm text-label-sm text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                <span>Application Fee, Payment &amp; Admit Card</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Fee */}
                <div>
                  <label htmlFor="input-app-fee" className="block font-label-md text-label-md text-on-surface mb-1 font-medium">
                    Application Fee
                  </label>
                  <input
                    id="input-app-fee"
                    name="applicationFee"
                    type="text"
                    placeholder="e.g. ৳ 500 or ৳ 200"
                    value={formData.applicationFee}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Payment Status */}
                <div>
                  <label htmlFor="select-payment-status" className="block font-label-md text-label-md text-on-surface mb-1 font-medium">
                    Payment Status
                  </label>
                  <select
                    id="select-payment-status"
                    name="paymentStatus"
                    value={formData.paymentStatus}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {GOVT_PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Admit Card Status */}
                <div>
                  <label htmlFor="select-admit-status" className="block font-label-md text-label-md text-on-surface mb-1 font-medium">
                    Admit Card
                  </label>
                  <select
                    id="select-admit-status"
                    name="admitCardStatus"
                    value={formData.admitCardStatus}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {GOVT_ADMIT_CARD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Roll Number / User ID */}
                <div>
                  <label htmlFor="input-user-roll" className="block font-label-md text-label-md text-on-surface mb-1 font-medium">
                    Roll No. / User ID
                  </label>
                  <input
                    id="input-user-roll"
                    name="userRollNumber"
                    type="text"
                    placeholder="e.g. 102458"
                    value={formData.userRollNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. WORKFLOW SECTION */}
          {/* A. If Government: Sequential Exam Stages (Prelims -> Written -> Viva -> Final Result) */}
          {isGovt ? (
            <div className="space-y-3.5 pt-2 border-t border-surface-container">
              <div className="flex items-center justify-between">
                <h3 className="font-label-sm text-label-sm text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[16px]">checklist</span>
                  <span>Government Exam Stages (Sequential)</span>
                </h3>
                <span className="text-[11px] text-on-surface-variant">Prelims → Written → Viva → Recommendation</span>
              </div>

              <div className="space-y-2.5">
                {formData.govtExamStages.map((stage, idx) => (
                  <div
                    key={stage.id}
                    className="p-3 bg-surface-container-low/70 border border-outline-variant/40 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm text-on-surface">{stage.name}</span>
                        {stage.subtitle && (
                          <span className="text-xs text-on-surface-variant hidden sm:inline">({stage.subtitle})</span>
                        )}
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        stage.status === 'Passed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : stage.status === 'Failed'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : stage.status === 'Appeared'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {stage.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {/* Exam Date */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-0.5">Exam Date</label>
                        <input
                          type="date"
                          value={stage.date || ''}
                          onChange={(e) => handleGovtStageChange(idx, 'date', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container border border-outline-variant/40 rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Center / Venue */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-0.5">Center / Location</label>
                        <input
                          type="text"
                          placeholder="e.g. Dhaka College / Agargaon"
                          value={stage.center || ''}
                          onChange={(e) => handleGovtStageChange(idx, 'center', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container border border-outline-variant/40 rounded-lg text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Stage Status */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-0.5">Result Status</label>
                        <select
                          value={stage.status || 'Pending'}
                          onChange={(e) => handleGovtStageChange(idx, 'status', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container border border-outline-variant/40 rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                        >
                          {GOVT_STAGE_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* B. If Private: Sequential Interview Rounds (Phone Screen -> Tech -> HR -> Final Offer) */
            <div className="space-y-3.5 pt-2 border-t border-surface-container">
              <div className="flex items-center justify-between">
                <h3 className="font-label-sm text-label-sm text-primary uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  <span>Interview Rounds Workflow</span>
                </h3>
                <span className="text-[11px] text-on-surface-variant">Screening → Tech → HR → Final Offer</span>
              </div>

              <div className="space-y-2.5">
                {formData.privateInterviewRounds.map((round, idx) => (
                  <div
                    key={round.id}
                    className="p-3 bg-surface-container-low/70 border border-outline-variant/40 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary-fixed text-primary text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm text-on-surface">{round.name}</span>
                        {round.subtitle && (
                          <span className="text-xs text-on-surface-variant hidden sm:inline">({round.subtitle})</span>
                        )}
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        round.status === 'Passed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : round.status === 'Failed'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : round.status === 'Scheduled'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : round.status === 'Completed'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {round.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {/* Round Date */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-0.5">Round Date</label>
                        <input
                          type="date"
                          value={round.date || ''}
                          onChange={(e) => handlePrivateRoundChange(idx, 'date', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container border border-outline-variant/40 rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Interviewer */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-0.5">Interviewer / Panel</label>
                        <input
                          type="text"
                          placeholder="e.g. Lead Engineer / VP Tech"
                          value={round.interviewer || ''}
                          onChange={(e) => handlePrivateRoundChange(idx, 'interviewer', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container border border-outline-variant/40 rounded-lg text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-0.5">Round Status</label>
                        <select
                          value={round.status || 'Pending'}
                          onChange={(e) => handlePrivateRoundChange(idx, 'status', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container border border-outline-variant/40 rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                        >
                          {PRIVATE_ROUND_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. General Timeline, Status & Source */}
          <div className="space-y-3.5 pt-2 border-t border-surface-container">
            <h3 className="font-label-sm text-label-sm text-primary uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-[16px]">timeline</span>
              <span>Overall Pipeline Status &amp; Timeline</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Overall Status */}
              <div>
                <label
                  htmlFor="select-status"
                  className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                >
                  Overall Status <span className="text-error">*</span>
                </label>
                <select
                  id="select-status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Application Date */}
              <div>
                <label
                  htmlFor="input-application-date"
                  className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                >
                  Applied Date <span className="text-error">*</span>
                </label>
                <input
                  id="input-application-date"
                  name="applicationDate"
                  type="date"
                  value={formData.applicationDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Priority */}
              <div>
                <label
                  htmlFor="select-priority"
                  className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                >
                  Priority
                </label>
                <select
                  id="select-priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {PRIORITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deadline */}
              <div>
                <label
                  htmlFor="input-deadline"
                  className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                >
                  {isGovt ? 'Application Deadline' : 'Deadline / Follow-up'}
                </label>
                <input
                  id="input-deadline"
                  name="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Application Source */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="select-application-source"
                  className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                >
                  Source / Portal
                </label>
                <select
                  id="select-application-source"
                  name="applicationSource"
                  value={formData.applicationSource}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {APPLICATION_SOURCES.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 6. Compensation & Contacts / Recruiter Info (For Private) or Notes (For Both) */}
          <div className="space-y-3.5 pt-2 border-t border-surface-container">
            <h3 className="font-label-sm text-label-sm text-primary uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-[16px]">
                {isGovt ? 'notes' : 'contact_mail'}
              </span>
              <span>{isGovt ? 'Additional Notes' : 'Compensation & Recruiter Contacts'}</span>
            </h3>

            {/* If Private: Show Compensation & HR contacts */}
            {!isGovt && (
              <>
                <div>
                  <label
                    htmlFor="input-salary"
                    className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                  >
                    Salary Range / Package
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                      payments
                    </span>
                    <input
                      id="input-salary"
                      name="salary"
                      type="text"
                      placeholder="e.g. ৳ 80,000 - 120,000 / mo or $90,000 / yr"
                      value={formData.salary}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="input-recruiter-name"
                      className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                    >
                      HR / Recruiter Name
                    </label>
                    <input
                      id="input-recruiter-name"
                      name="recruiterName"
                      type="text"
                      placeholder="e.g. Sarah Khan"
                      value={formData.recruiterName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="input-recruiter-email"
                      className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                    >
                      Recruiter Email
                    </label>
                    <input
                      id="input-recruiter-email"
                      name="recruiterEmail"
                      type="email"
                      placeholder="hr@company.com"
                      value={formData.recruiterEmail}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="input-recruiter-phone"
                      className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
                    >
                      Recruiter Phone
                    </label>
                    <input
                      id="input-recruiter-phone"
                      name="recruiterPhone"
                      type="text"
                      placeholder="+880 1711..."
                      value={formData.recruiterPhone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="textarea-notes"
                className="block font-label-md text-label-md text-on-surface mb-1 font-medium"
              >
                Notes &amp; Details
              </label>
              <textarea
                id="textarea-notes"
                name="notes"
                rows={3}
                placeholder={isGovt ? 'Syllabus focus, quota information, reference book notes, or roll number memo...' : 'Tech stack requirements, interviewer feedback, cultural notes, or referral info...'}
                value={formData.notes}
                onChange={handleChange}
                className="w-full p-3 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed"
              />
            </div>

            {/* CV / Document / Circular Upload: Cloudinary & Google Drive */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low/60 border border-outline-variant/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">cloud_upload</span>
                  <span>সংযুক্ত ফাইল / CV / সার্কুলার আপলোড</span>
                </span>
                <span className="text-[11px] text-outline">PDF, Docx, Image</span>
              </div>

              <p className="text-[11px] text-on-surface-variant">
                সিভি, জব সার্কুলার বা অ্যাডমিট কার্ড আপনার পছন্দমতো <strong>Google Drive</strong> অথবা <strong>Cloudinary</strong> স্টোরেজে আপলোড করতে পারেন।
              </p>

              {/* Upload Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Google Drive Upload Option */}
                <div className="flex flex-col gap-1">
                  <label className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed text-xs font-semibold cursor-pointer transition-all ${
                    isDriveUploading
                      ? 'bg-surface-container border-outline/30 text-outline cursor-wait'
                      : 'bg-surface-container-lowest border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                  }`}>
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">
                      {isDriveUploading ? 'sync' : 'add_to_drive'}
                    </span>
                    <span className="truncate">
                      {isDriveUploading ? 'Saving to Drive...' : 'Upload to Google Drive'}
                    </span>
                    <input
                      type="file"
                      disabled={isDriveUploading || isCloudinaryUploading}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                      onChange={handleGoogleDriveUpload}
                      className="hidden"
                    />
                  </label>
                  {!hasGoogleDriveAccess && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] text-outline">Drive auth needed</span>
                      <button
                        type="button"
                        onClick={connectGoogleDrive}
                        className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                      >
                        Connect Drive
                      </button>
                    </div>
                  )}
                </div>

                {/* Cloudinary Upload Option */}
                <div className="flex flex-col gap-1">
                  <label className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed text-xs font-semibold cursor-pointer transition-all ${
                    isCloudinaryUploading
                      ? 'bg-surface-container border-outline/30 text-outline cursor-wait'
                      : 'bg-surface-container-lowest border-primary/40 text-primary hover:bg-primary/10'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {isCloudinaryUploading ? 'sync' : 'upload_file'}
                    </span>
                    <span className="truncate">
                      {isCloudinaryUploading ? 'Uploading...' : 'Upload to Cloudinary'}
                    </span>
                    <input
                      type="file"
                      disabled={isCloudinaryUploading || isDriveUploading}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                      onChange={handleCloudinaryUpload}
                      className="hidden"
                    />
                  </label>
                  <div className="px-1 text-[10px] text-outline text-right">
                    Instant CDN hosting
                  </div>
                </div>
              </div>

              {/* Current Attached File Display */}
              {formData.fileUrl && (
                <div className="p-2 rounded-xl bg-surface-container-lowest border border-surface-container flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`material-symbols-outlined text-[18px] shrink-0 ${
                      uploadSource === 'drive' || formData.fileUrl.includes('drive.google.com')
                        ? 'text-emerald-600'
                        : 'text-primary'
                    }`}>
                      {uploadSource === 'drive' || formData.fileUrl.includes('drive.google.com') ? 'add_to_drive' : 'description'}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-on-surface truncate">
                        {formData.fileName || 'Attached Document'}
                      </span>
                      <span className="text-[10px] text-outline truncate">
                        {uploadSource === 'drive' || formData.fileUrl.includes('drive.google.com') ? 'Saved in Google Drive' : 'Stored in Cloudinary'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={formData.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                      <span>View</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fileUrl: '', fileName: '' }))}
                      title="Remove attachment"
                      className="p-1 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>
              )}

              {uploadMessage && (
                <p className={`text-[11px] font-semibold flex items-center gap-1 ${
                  uploadMessage.includes('failed') ? 'text-error' : 'text-emerald-700 dark:text-emerald-300'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {uploadMessage.includes('failed') ? 'error' : 'check_circle'}
                  </span>
                  <span>{uploadMessage}</span>
                </p>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
            <button
              id="cancel-form-modal-btn"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors min-h-[40px] cursor-pointer hover:text-on-surface active:scale-95"
            >
              Cancel
            </button>
            <button
              id="submit-application-btn"
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 font-label-md text-label-md active:scale-[0.98] rounded-xl shadow-sm transition-all disabled:opacity-50 min-h-[40px] flex items-center gap-1.5 font-semibold text-white ${
                isGovt ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-primary hover:bg-primary-container hover:text-on-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isEditing ? 'check' : 'add'}
              </span>
              <span>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Opportunity' : isGovt ? 'Save Government Job' : 'Save Private Job'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

