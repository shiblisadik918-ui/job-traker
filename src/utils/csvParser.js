/**
 * CSV Parser and Generator Utility for JobTrack
 */

export function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const rowObj = {};

    headers.forEach((header, index) => {
      rowObj[header] = values[index] ? values[index].trim() : '';
    });

    // Normalize keys to JobTrack schema
    const companyName = rowObj['company'] || rowObj['company name'] || rowObj['companyname'] || '';
    const jobTitle = rowObj['job title'] || rowObj['jobtitle'] || rowObj['title'] || rowObj['role'] || '';

    if (!companyName && !jobTitle) {
      // Skip empty or invalid rows
      continue;
    }

    const rawStatus = rowObj['status'] || 'Applied';
    const status = normalizeStatus(rawStatus);

    const application = {
      companyName,
      jobTitle,
      status,
      location: rowObj['location'] || rowObj['city'] || '',
      salary: rowObj['salary'] || rowObj['compensation'] || '',
      jobType: rowObj['job type'] || rowObj['jobtype'] || rowObj['type'] || 'Full-time',
      applicationSource: rowObj['application source'] || rowObj['source'] || 'LinkedIn',
      applicationDate: rowObj['applied date'] || rowObj['date'] || rowObj['application date'] || new Date().toISOString().split('T')[0],
      notes: rowObj['notes'] || rowObj['description'] || '',
      url: rowObj['url'] || rowObj['job link'] || rowObj['link'] || '',
      recruiterName: rowObj['recruiter name'] || rowObj['recruiter'] || '',
      recruiterEmail: rowObj['recruiter email'] || rowObj['recruiter contact'] || '',
      priority: rowObj['priority'] || 'Medium',
    };

    rows.push(application);
  }

  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

function normalizeStatus(input) {
  if (!input) return 'Applied';
  const clean = input.trim().toLowerCase();
  if (clean.includes('save') || clean.includes('wish')) return 'Saved';
  if (clean.includes('short')) return 'Shortlisted';
  if (clean.includes('interview')) return 'Interview';
  if (clean.includes('offer')) return 'Offer';
  if (clean.includes('reject')) return 'Rejected';
  if (clean.includes('withdraw')) return 'Withdrawn';
  return 'Applied';
}

export function generateSampleCSV() {
  const headers = [
    'Company',
    'Job Title',
    'Status',
    'Location',
    'Salary',
    'Job Type',
    'Application Source',
    'Applied Date',
    'Notes',
    'URL',
    'Recruiter Name',
    'Recruiter Email',
  ];

  const today = new Date().toISOString().split('T')[0];

  const rows = [
    [
      'Google',
      'Senior Frontend Engineer',
      'Interview',
      'Mountain View, CA (Hybrid)',
      '$180,000 - $210,000',
      'Full-time',
      'LinkedIn',
      today,
      'Technical interview scheduled for next week.',
      'https://careers.google.com/jobs/results/12345',
      'Sarah Connor',
      'sarah.recruiting@google.com',
    ],
    [
      'Stripe',
      'Staff Full Stack Engineer',
      'Applied',
      'Remote',
      '$190,000 - $220,000',
      'Full-time',
      'Company Website',
      today,
      'Referral by Alex from Engineering.',
      'https://stripe.com/jobs/67890',
      'Michael Scott',
      'michael.talent@stripe.com',
    ],
    [
      'Shopify',
      'React Developer',
      'Shortlisted',
      'Remote',
      '$140,000 - $160,000',
      'Full-time',
      'Referral',
      today,
      'Recruiter phone screen passed.',
      'https://shopify.com/careers/54321',
      'Elena Vance',
      'elena.recruiter@shopify.com',
    ],
  ];

  const escapeCSV = (val) => {
    const stringVal = String(val || '');
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  return csvContent;
}

export function downloadSampleCSVFile() {
  const content = generateSampleCSV();
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'jobtrack_applications_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
