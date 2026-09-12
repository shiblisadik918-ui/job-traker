/**
 * JobTrack Core Data Types & Schema Definitions
 * Supporting both Bangladesh Government jobs and Private/MNC jobs simultaneously.
 */

export type JobTypeCategory = 'Government' | 'Private';

export type GovtExamStageId = 'prelims' | 'written' | 'viva' | 'final';

export type GovtStageStatus = 'Pending' | 'Passed' | 'Failed' | 'Appeared';

export interface GovtExamStage {
  id: GovtExamStageId;
  name: string;
  subtitle?: string;
  date: string;
  center: string;
  status: GovtStageStatus;
  notes?: string;
}

export type PrivateRoundId = 'phone_screen' | 'technical_round' | 'hr_round' | 'final_offer';

export type PrivateRoundStatus = 'Pending' | 'Passed' | 'Failed' | 'Scheduled' | 'Completed';

export interface PrivateInterviewRound {
  id: PrivateRoundId;
  name: string;
  subtitle?: string;
  date: string;
  interviewer: string;
  status: PrivateRoundStatus;
  notes?: string;
}

export interface ApplicationModel {
  id: string;
  userId: string;
  
  // 1. Job Type Distinction
  job_type: JobTypeCategory; // 'Government' | 'Private'

  // General Fields
  jobTitle: string;
  location?: string;
  jobType?: string; // Full-time, Part-time, etc.
  applicationDate: string;
  deadline?: string;
  jobUrl?: string;
  status: 'Saved' | 'Applied' | 'Shortlisted' | 'Interview' | 'Offer' | 'Rejected' | 'Withdrawn';
  priority?: 'Low' | 'Medium' | 'High';
  notes?: string;
  companyLogo?: string;

  // 2. Government Job Specific Fields
  ministryDepartment?: string; // e.g., 'Ministry of Public Administration', 'BPSC'
  jobGrade?: string; // e.g., '9th Grade', '11th Grade'
  circularId?: string; // Circular ID / Reference Number
  applicationFee?: string; // Fee amount e.g. '৳ 200'
  paymentStatus?: 'Pending' | 'Paid via Teletalk SMS' | 'Paid via Online/bKash/Nagad' | 'Exempted';
  admitCardStatus?: 'Not Published' | 'Download Available' | 'Downloaded' | 'Center Assigned';
  userRollNumber?: string; // Roll number or Applicant ID
  govtExamStages?: GovtExamStage[]; // Prelims -> Written -> Viva -> Final Result

  // 3. Private Job Specific Fields
  companyName: string; // Company / MNC Name
  salary?: string; // Salary Range or Package
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterPhone?: string;
  recruiterRole?: string;
  applicationSource?: string; // LinkedIn, BDjobs, Chakri.com, etc.
  privateInterviewRounds?: PrivateInterviewRound[]; // Phone Screen -> Tech -> HR -> Offer

  // Telemetry & Meta
  timeline?: Array<{
    status: string;
    date: string;
    timestamp: number;
    notes?: string;
  }>;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * =========================================================================
 * PRISMA SCHEMA DEFINITION (For PostgreSQL / MySQL)
 * =========================================================================
 * 
 * enum JobTypeCategory {
 *   Government
 *   Private
 * }
 * 
 * enum GovtStageStatus {
 *   Pending
 *   Passed
 *   Failed
 *   Appeared
 * }
 * 
 * enum PrivateRoundStatus {
 *   Pending
 *   Passed
 *   Failed
 *   Scheduled
 *   Completed
 * }
 * 
 * model JobApplication {
 *   id                    String           @id @default(cuid())
 *   userId                String
 *   job_type              JobTypeCategory  @default(Private)
 *   jobTitle              String
 *   companyName           String?          // Required for Private, mapped to Ministry if Govt
 *   location              String?
 *   jobType               String?          @default("Full-time")
 *   applicationDate       DateTime         @default(now())
 *   deadline              DateTime?
 *   jobUrl                String?
 *   status                String           @default("Applied")
 *   priority              String           @default("Medium")
 *   notes                 String?          @db.Text
 *   
 *   // Government Specific Fields
 *   ministryDepartment    String?
 *   jobGrade              String?          // e.g. "9th Grade", "11th Grade"
 *   circularId            String?          // Circular Reference ID
 *   applicationFee        String?
 *   paymentStatus         String?          @default("Pending") // Teletalk SMS / Online
 *   admitCardStatus       String?          @default("Not Published")
 *   userRollNumber        String?
 *   govtExamStages        Json?            // Stores [{ id, name, date, center, status, notes }]
 * 
 *   // Private Specific Fields
 *   salary                String?
 *   applicationSource     String?          @default("LinkedIn")
 *   recruiterName         String?
 *   recruiterEmail        String?
 *   recruiterPhone        String?
 *   privateInterviewRounds Json?           // Stores [{ id, name, date, interviewer, status, notes }]
 * 
 *   createdAt             DateTime         @default(now())
 *   updatedAt             DateTime         @updatedAt
 * 
 *   @@index([userId, job_type])
 *   @@index([userId, status])
 * }
 * 
 * =========================================================================
 * MONGOOSE (MongoDB) SCHEMA DEFINITION
 * =========================================================================
 * 
 * const JobApplicationSchema = new mongoose.Schema({
 *   userId: { type: String, required: true, index: true },
 *   job_type: { type: String, enum: ['Government', 'Private'], default: 'Private', required: true },
 *   jobTitle: { type: String, required: true },
 *   companyName: { type: String, default: '' },
 *   location: { type: String, default: '' },
 *   jobType: { type: String, default: 'Full-time' },
 *   applicationDate: { type: String, required: true },
 *   deadline: { type: String, default: '' },
 *   jobUrl: { type: String, default: '' },
 *   status: { type: String, default: 'Applied' },
 *   priority: { type: String, default: 'Medium' },
 *   notes: { type: String, default: '' },
 * 
 *   // Government Specific
 *   ministryDepartment: { type: String, default: '' },
 *   jobGrade: { type: String, default: '' },
 *   circularId: { type: String, default: '' },
 *   applicationFee: { type: String, default: '' },
 *   paymentStatus: { 
 *     type: String, 
 *     enum: ['Pending', 'Paid via Teletalk SMS', 'Paid via Online/bKash/Nagad', 'Exempted'], 
 *     default: 'Pending' 
 *   },
 *   admitCardStatus: { 
 *     type: String, 
 *     enum: ['Not Published', 'Download Available', 'Downloaded', 'Center Assigned'], 
 *     default: 'Not Published' 
 *   },
 *   userRollNumber: { type: String, default: '' },
 *   govtExamStages: [{
 *     id: String,
 *     name: String,
 *     date: String,
 *     center: String,
 *     status: { type: String, enum: ['Pending', 'Passed', 'Failed', 'Appeared'], default: 'Pending' },
 *     notes: String
 *   }],
 * 
 *   // Private Specific
 *   salary: { type: String, default: '' },
 *   applicationSource: { type: String, default: 'LinkedIn' },
 *   recruiterName: { type: String, default: '' },
 *   recruiterEmail: { type: String, default: '' },
 *   recruiterPhone: { type: String, default: '' },
 *   privateInterviewRounds: [{
 *     id: String,
 *     name: String,
 *     date: String,
 *     interviewer: String,
 *     status: { type: String, enum: ['Pending', 'Passed', 'Failed', 'Scheduled', 'Completed'], default: 'Pending' },
 *     notes: String
 *   }],
 * 
 *   timeline: [{
 *     status: String,
 *     date: String,
 *     timestamp: Number,
 *     notes: String
 *   }]
 * }, { timestamps: true });
 * 
 * =========================================================================
 * RELATIONAL SQL (PostgreSQL DDL)
 * =========================================================================
 * 
 * CREATE TABLE job_applications (
 *   id VARCHAR(64) PRIMARY KEY,
 *   user_id VARCHAR(64) NOT NULL,
 *   job_type VARCHAR(20) NOT NULL DEFAULT 'Private', -- 'Government' or 'Private'
 *   job_title VARCHAR(255) NOT NULL,
 *   company_name VARCHAR(255),
 *   location VARCHAR(255),
 *   job_type_modality VARCHAR(50) DEFAULT 'Full-time',
 *   application_date DATE NOT NULL,
 *   deadline DATE,
 *   job_url TEXT,
 *   status VARCHAR(50) NOT NULL DEFAULT 'Applied',
 *   priority VARCHAR(20) DEFAULT 'Medium',
 *   notes TEXT,
 * 
 *   -- Government Fields
 *   ministry_department VARCHAR(255),
 *   job_grade VARCHAR(100),
 *   circular_id VARCHAR(100),
 *   application_fee VARCHAR(50),
 *   payment_status VARCHAR(50) DEFAULT 'Pending',
 *   admit_card_status VARCHAR(50) DEFAULT 'Not Published',
 *   user_roll_number VARCHAR(100),
 *   govt_exam_stages JSONB,
 * 
 *   -- Private Fields
 *   salary VARCHAR(100),
 *   application_source VARCHAR(100) DEFAULT 'LinkedIn',
 *   recruiter_name VARCHAR(255),
 *   recruiter_email VARCHAR(255),
 *   recruiter_phone VARCHAR(50),
 *   private_interview_rounds JSONB,
 * 
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * CREATE INDEX idx_user_job_type ON job_applications(user_id, job_type);
 * CREATE INDEX idx_user_status ON job_applications(user_id, status);
 */
