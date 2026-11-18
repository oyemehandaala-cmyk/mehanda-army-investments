export const TRACKING_STAGES = [
  { id: 'submitted', label: 'Enquiry Submitted', stepNumber: 1 },
  { id: 'verification', label: 'Initial Verification', stepNumber: 2 },
  { id: 'review', label: 'Under Review', stepNumber: 3 },
  { id: 'completed', label: 'Review Completed', stepNumber: 4 },
];

export function formatStageDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatFullDateTime(isoString) {
  if (!isoString) return 'Not available';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function computeStageDetails(application) {
  const currentStatus = (application?.status || 'Submitted').trim();
  const lower = currentStatus.toLowerCase();
  const history = Array.isArray(application?.statusHistory) ? application.statusHistory : [];

  const stage1Date = application?.submittedAt || null;
  let stage2Date = null;
  let stage3Date = null;
  let stage4Date = null;

  // Scan status history to capture stage timestamps
  for (const entry of history) {
    const s = (entry.status || entry.new_status || '').toLowerCase();
    const time = entry.createdAt || entry.created_at;
    if (!time) continue;

    if (s.includes('verification') || s.includes('information') || s.includes('hold') || s.includes('pending')) {
      if (!stage2Date) stage2Date = time;
    }
    if (s.includes('review') && !s.includes('completed')) {
      if (!stage3Date) stage3Date = time;
    }
    if (s.includes('completed') || s.includes('closed') || s.includes('rejected')) {
      if (!stage4Date) stage4Date = time;
    }
  }

  // Determine active stage index (0 to 3)
  let activeIndex = 0;
  if (lower.includes('completed') || lower.includes('closed') || lower.includes('rejected')) {
    activeIndex = 3;
    if (!stage4Date) stage4Date = application?.updatedAt || application?.submittedAt;
    if (!stage3Date) stage3Date = stage4Date;
    if (!stage2Date) stage2Date = stage1Date;
  } else if (lower.includes('under review')) {
    activeIndex = 2;
    if (!stage3Date) stage3Date = application?.updatedAt || null;
    if (!stage2Date) stage2Date = stage1Date;
  } else if (
    lower.includes('verification') ||
    lower.includes('information') ||
    lower.includes('hold') ||
    lower.includes('pending')
  ) {
    activeIndex = 1;
    if (!stage2Date) stage2Date = application?.updatedAt || null;
  } else {
    // Default 'Submitted': Stage 1 is completed, Stage 2 is in-progress
    activeIndex = 1;
  }

  const stages = [
    {
      ...TRACKING_STAGES[0],
      state: 'completed',
      date: stage1Date,
    },
    {
      ...TRACKING_STAGES[1],
      state: activeIndex > 1 ? 'completed' : activeIndex === 1 ? 'current' : 'future',
      date: stage2Date || (activeIndex === 1 ? application?.updatedAt : null),
    },
    {
      ...TRACKING_STAGES[2],
      state: activeIndex > 2 ? 'completed' : activeIndex === 2 ? 'current' : 'future',
      date: stage3Date || (activeIndex === 2 ? application?.updatedAt : null),
    },
    {
      ...TRACKING_STAGES[3],
      state: activeIndex === 3 ? 'completed' : 'future',
      date: stage4Date || (activeIndex === 3 ? application?.updatedAt : null),
    },
  ];

  let stageSubtext = 'Your enquiry has been received in the system.';
  if (activeIndex === 1) {
    stageSubtext = 'Student identity and application details are currently undergoing initial verification.';
  } else if (activeIndex === 2) {
    stageSubtext = 'Your enquiry is under review by our institutional verification team.';
  } else if (activeIndex === 3) {
    stageSubtext = 'Official enquiry review has been finalized. Review remarks are recorded below.';
  }

  return { activeIndex, stages, currentStatus, stageSubtext };
}

