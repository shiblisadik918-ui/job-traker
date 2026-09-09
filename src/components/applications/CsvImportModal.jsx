import { useState, useRef } from 'react';
import { parseCSV, downloadSampleCSVFile } from '../../utils/csvParser';
import { createApplicationsBatch } from '../../services/applicationsService';
import { useToast } from '../../hooks/useToast';

export default function CsvImportModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const { showSuccess, showError } = useToast();

  if (!isOpen) return null;

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setParseError('Please upload a valid .csv file.');
      return;
    }

    setFile(selectedFile);
    setParseError('');
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setParseError('No valid application rows found in CSV. Please ensure you have Company and Job Title columns.');
          setParsedRows([]);
        } else {
          setParsedRows(rows);
        }
      } catch (err) {
        setParseError('Failed to parse CSV file: ' + err.message);
        setParsedRows([]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read file.');
      setIsParsing(false);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setIsImporting(true);
    const result = await createApplicationsBatch(parsedRows);
    setIsImporting(false);

    if (result.success) {
      showSuccess(`Successfully imported ${result.count} job application${result.count !== 1 ? 's' : ''}!`);
      handleReset();
      onClose();
      if (onImportSuccess) onImportSuccess();
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { action: 'csv-import' } }));
    } else {
      showError(result.error || 'Failed to import CSV applications.');
    }
  };

  return (
    <div
      id="csv-import-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="csv-import-modal-container"
        className="w-full max-w-2xl bg-surface-container-lowest rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-outline-variant/30 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-surface-container-high/40 shrink-0">
          <div className="flex items-center gap-space-xs">
            <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">upload_file</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Import Applications via CSV
              </h2>
              <p className="font-body-sm text-[12px] text-outline">
                Bulk upload existing opportunities from spreadsheet or job tracker.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-space-md space-y-space-md overflow-y-auto flex-1 font-body-sm">
          {/* Template Download Guidance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-space-sm rounded-2xl bg-surface-container-low border border-outline-variant/20 gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">description</span>
              <span className="text-xs text-on-surface-variant font-medium">
                Need the standard column format? Download sample template.
              </span>
            </div>
            <button
              type="button"
              onClick={downloadSampleCSVFile}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container text-primary font-semibold text-xs hover:bg-surface-container-high transition-colors border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Download Template (.csv)</span>
            </button>
          </div>

          {/* Upload Area */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                isDragOver
                  ? 'border-primary bg-primary-fixed/20'
                  : 'border-outline-variant/50 hover:border-primary hover:bg-surface-container-low'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
              </div>
              <div>
                <p className="font-semibold text-on-surface text-sm">
                  Click to select or drag and drop your CSV file
                </p>
                <p className="text-xs text-outline mt-0.5">
                  Supported format: .csv (UTF-8 encoded)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-space-sm">
              {/* Selected File Card */}
              <div className="flex items-center justify-between p-space-sm rounded-2xl bg-surface-container-low border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">table_chart</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-on-surface truncate max-w-xs sm:max-w-md">
                      {file.name}
                    </p>
                    <p className="text-xs text-outline">
                      {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} valid row{parsedRows.length !== 1 ? 's' : ''} detected
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isImporting}
                  className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                  title="Remove file and choose another"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>

              {/* Parsing Indicator */}
              {isParsing && (
                <div className="p-4 text-center text-xs text-outline animate-pulse">
                  Parsing CSV rows...
                </div>
              )}

              {/* Preview Table of Parsed Rows */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                    <span>Preview (Showing first {Math.min(5, parsedRows.length)} of {parsedRows.length} rows):</span>
                    <span className="text-secondary font-semibold">✓ Ready to import</span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-surface-container-high/40 max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container text-on-surface-variant sticky top-0 font-semibold border-b border-surface-container-high/40">
                        <tr>
                          <th className="py-2 px-3">Company</th>
                          <th className="py-2 px-3">Job Title</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Location</th>
                          <th className="py-2 px-3">Salary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high/30 text-on-surface">
                        {parsedRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-surface-container-low/50">
                            <td className="py-2 px-3 font-semibold">{row.companyName}</td>
                            <td className="py-2 px-3">{row.jobTitle}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-[11px] font-medium">
                                {row.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-outline truncate max-w-[120px]">{row.location || '—'}</td>
                            <td className="py-2 px-3 text-outline">{row.salary || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{parseError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-space-md py-space-sm border-t border-surface-container-high/40 bg-surface-container-lowest shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-space-md py-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors text-xs font-semibold"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={isImporting || parsedRows.length === 0}
            className="flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {isImporting ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                <span>Importing {parsedRows.length} Items...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">file_download_done</span>
                <span>Import {parsedRows.length > 0 ? `${parsedRows.length} Applications` : 'Applications'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
