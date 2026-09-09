/**
 * Recruiter & Candidate Email Templates Utility
 */

export const EMAIL_TEMPLATES = [
  {
    id: 'thank_you',
    name: 'Post-Interview Thank You',
    subject: 'Thank you for your time – {jobTitle} Interview',
    category: 'Interview',
    body: `Hi {recruiterName},

Thank you so much for taking the time to speak with me today regarding the {jobTitle} role at {companyName}.

I really enjoyed learning more about the team's upcoming goals and current engineering initiatives. Our conversation reinforced my strong enthusiasm for joining {companyName} and contributing to your team's success.

Please let me know if there are any additional details or references I can provide from my side. I look forward to hearing about the next steps.

Best regards,
{candidateName}`,
  },
  {
    id: 'status_follow_up',
    name: 'Application Status Follow-up',
    subject: 'Checking in on my application for {jobTitle} at {companyName}',
    category: 'Follow-up',
    body: `Hi {recruiterName},

I hope this week is treating you well!

I am writing to politely check in on the status of my application for the {jobTitle} position at {companyName}, submitted recently.

I remain very excited about this opportunity and believe my background would be a great fit for your team. If you need any further work samples, project repositories, or details regarding my experience, please do not hesitate to reach out.

Thank you again for your time and consideration.

Warm regards,
{candidateName}`,
  },
  {
    id: 'interview_prep',
    name: 'Interview Preparation & Details Inquiry',
    subject: 'Inquiry regarding upcoming {jobTitle} Interview – {companyName}',
    category: 'Interview',
    body: `Hi {recruiterName},

Thank you again for scheduling our upcoming interview for the {jobTitle} position.

To make sure I come as prepared as possible, could you kindly confirm if there are specific technical topics, live coding exercises, or presentation slides I should have ready for our session? Also, if there are any specific team members I will be meeting with, please feel free to share.

Looking forward to our conversation!

Best regards,
{candidateName}`,
  },
  {
    id: 'offer_appreciation',
    name: 'Offer Appreciation & Review Inquiry',
    subject: 'Thank you for the {jobTitle} Offer – {companyName}',
    category: 'Offer',
    body: `Dear {recruiterName},

Thank you very much for extending the offer to join {companyName} as a {jobTitle}! I am thrilled about the opportunity to work with you and the team.

I am currently reviewing the details of the offer letter and benefits package. I had a couple of quick questions regarding [specific questions e.g. start date / equity vesting / health coverage] and would love to schedule a brief 10-minute call to discuss them.

Thank you once again for your support throughout this interview journey.

Warm regards,
{candidateName}`,
  },
  {
    id: 'networking_intro',
    name: 'Networking / InMail Warm Outreach',
    subject: 'Passionate {jobTitle} interested in opportunities at {companyName}',
    category: 'Outreach',
    body: `Hi {recruiterName},

I came across {companyName}'s work and recent engineering developments, and I am deeply impressed by your team's mission.

I am an experienced candidate specializing in {jobTitle} responsibilities. I noticed your recent open roles and wanted to introduce myself. I would love the chance to connect briefly or share my resume if you are actively looking for candidates.

Thank you for your time, and I look forward to connecting!

Best regards,
{candidateName}`,
  },
];

/**
 * Replace placeholders in template
 */
export function populateTemplate(template, data = {}) {
  const candidateName = data.candidateName || 'Candidate';
  const recruiterName = data.recruiterName || 'Hiring Team';
  const companyName = data.companyName || 'Company';
  const jobTitle = data.jobTitle || 'Role';

  const replaceMap = {
    '{candidateName}': candidateName,
    '{recruiterName}': recruiterName,
    '{companyName}': companyName,
    '{jobTitle}': jobTitle,
  };

  let subject = template.subject;
  let body = template.body;

  Object.entries(replaceMap).forEach(([placeholder, value]) => {
    subject = subject.replaceAll(placeholder, value);
    body = body.replaceAll(placeholder, value);
  });

  return { subject, body };
}
