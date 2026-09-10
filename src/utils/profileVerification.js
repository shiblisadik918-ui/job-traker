/**
 * Profile Verification & CV Utilities
 * Evaluates candidate completeness, manages verification badge state, and provides CV defaults.
 */

export const ESSENTIAL_CV_FIELDS = [
  { key: 'displayName', label: 'পুরো নাম (Full Name)', minLength: 2 },
  { key: 'targetRole', label: 'পদের নাম / টার্গেট জব (Target Role)', minLength: 2 },
  { key: 'phone', label: 'ফোন নম্বর (Phone Number)', minLength: 6 },
  { key: 'email', label: 'ইমেইল (Email Address)', minLength: 5 },
  { key: 'address', label: 'ঠিকানা (Address)', minLength: 5 },
  { key: 'careerObjective', label: 'Career Objective', minLength: 15 },
  { key: 'careerSummary', label: 'Career Summary', minLength: 15 },
  { key: 'workExperience', label: 'Work Experience (কাজের অভিজ্ঞতা)', minLength: 10 },
  { key: 'specialQualifications', label: 'Special Qualifications (দক্ষতা)', minLength: 10 },
  { key: 'languageProficiency', label: 'Language Proficiency (ভাষাগত দক্ষতা)', minLength: 10 },
  { key: 'personalDetails', label: 'Personal Details (পিতার নাম, জন্মতারিখ ইত্যাদি)', minLength: 10 },
];

/**
 * Sample CV template data from user's model
 */
export const SAMPLE_CV_DATA = {
  displayName: 'SHIBLI SADIK SWACHHA',
  targetRole: 'Aspirant Sales Associate at Aarong',
  phone: '01608462178',
  email: 'swachhasadik89@gmail.com',
  address: 'Ghashipara, Dinajpur Sadar, Dinajpur',
  careerObjective:
    'To obtain a Sales Associate position where I can utilize my communication, teamwork and customer-service skills to contribute positively to the retail team and ensure exceptional customer shopping experiences.',
  careerSummary:
    'A motivated and responsible university student with a positive attitude, good communication skills, polite manners, and a strong willingness to learn retail store operations and customer care.',
  workExperience:
    'Fresher. No formal professional work experience yet.\nEager to learn sales operations, polite customer assistance, product presentation, inventory organization, and cashiering duties.',
  specialQualifications:
    '• Customer communication & polite service\n• Teamwork, responsibility & store organization\n• Basic computer, email & smartphone skills\n• Punctuality and active listening ability',
  languageProficiency:
    'Bangla: Reading - High, Writing - High, Speaking - High\nEnglish: Reading - Medium, Writing - Medium, Speaking - Basic',
  personalDetails:
    "Father's Name: MD. SAIFUL ISLAM\nDate of Birth: 11 September 2002\nNationality: Bangladeshi\nReligion: Islam\nMarital Status: Single",
  jobSearchStatus: 'Actively Looking',
  workMode: 'On-site',
  targetSalary: '15,000 - 22,000 BDT / month',
  preferredLocation: 'Dinajpur / Dhaka',
  bio: 'Energetic and customer-focused candidate eager to excel in retail sales and operations.',
  photoURL: '',
};

/**
 * Calculates candidate profile completeness and verification status.
 * Profile is 100% verified when all essential fields have valid data.
 */
export function calculateProfileCompleteness(profile = {}) {
  if (!profile) {
    return {
      percentage: 0,
      isVerified: false,
      completedFields: [],
      missingFields: ESSENTIAL_CV_FIELDS,
      totalCount: ESSENTIAL_CV_FIELDS.length,
      completedCount: 0,
    };
  }

  const completedFields = [];
  const missingFields = [];

  for (const field of ESSENTIAL_CV_FIELDS) {
    const val = profile[field.key];
    if (typeof val === 'string' && val.trim().length >= (field.minLength || 2)) {
      completedFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  const completedCount = completedFields.length;
  const totalCount = ESSENTIAL_CV_FIELDS.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isVerified = percentage === 100;

  return {
    percentage,
    isVerified,
    completedFields,
    missingFields,
    totalCount,
    completedCount,
  };
}
