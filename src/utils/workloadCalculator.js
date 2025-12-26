/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WORKLOAD CALCULATOR
 * Core logic for calculating and analyzing student workload
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// WEIGHT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const WORKLOAD_WEIGHTS = {
  // Regular homework
  homework: {
    LIGHT: 1,      // Petit exercice
    MEDIUM: 2,     // DM / rédaction moyenne
    HEAVY: 3,      // Rédaction longue / projet
  },
  // Tests & Controls
  test: {
    QUIZ: 2,       // Interrogation courte
    CONTROL: 3,    // Contrôle normal
    DST: 5,        // Devoir Surveillé (samedi)
    EXAM: 7,       // Examen / bac blanc
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLD CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const WORKLOAD_THRESHOLDS = {
  daily: {
    LIGHT: 2,      // 🟢 1-2 devoirs simples ou moins
    MEDIUM: 4,     // 🟠 3-4 devoirs ou 1-2 évaluations
    HEAVY: 6,      // 🔴 2+ évaluations ou 5+ devoirs
    // > HEAVY = ❌ Critique
  },
  weekly: {
    LIGHT: 8,      // 🟢 Semaine légère
    MEDIUM: 15,    // 🟠 Semaine moyenne
    HEAVY: 20,     // 🔴 Semaine chargée
    // > HEAVY = ❌ Semaine critique
  },
  // DST rules (kept for future use)
  dst: {
    MAX_PER_WEEK: 1,
    MIN_WEEKS_BETWEEN: 2,
    MAX_CONSECUTIVE_SATURDAYS: 2,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LOAD STATUS TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const LOAD_STATUS = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
  CRITICAL: 'critical',
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format date to YYYY-MM-DD string
 * Returns null for invalid dates
 */
export function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

/**
 * Get start of week (Monday)
 */
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Get end of week (Sunday)
 */
export function getWeekEnd(date) {
  const start = getWeekStart(date);
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
}

/**
 * Check if a date is Saturday
 */
export function isSaturday(date) {
  return new Date(date).getDay() === 6;
}

/**
 * Get week number (ISO 8601)
 */
export function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKLOAD CALCULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the weight of a single assignment
 * Simple system:
 * - Homework = 1 point
 * - Evaluation (test) = 3 points
 * @param {Object} assignment - Assignment object with type property
 * @returns {number} - Calculated weight
 */
export function getAssignmentWeight(assignment) {
  const { type } = assignment;

  // Évaluation = 3 points
  if (type === 'test') {
    return 3;
  }

  // Devoir = 1 point
  return 1;
}

/**
 * Calculate total workload for a specific day
 * @param {Array} assignments - Array of assignments
 * @param {Date|string} date - Target date
 * @returns {Object} - { score, status, assignments }
 */
export function calculateDailyWorkload(assignments, date) {
  const targetDate = formatDate(date);

  const dayAssignments = assignments.filter(
    a => formatDate(a.dueDate) === targetDate
  );

  const score = dayAssignments.reduce(
    (total, assignment) => total + getAssignmentWeight(assignment),
    0
  );

  return {
    date: targetDate,
    score,
    status: getDailyLoadStatus(score),
    assignments: dayAssignments,
    count: dayAssignments.length,
  };
}

/**
 * Calculate total workload for a week
 * @param {Array} assignments - Array of assignments
 * @param {Date|string} dateInWeek - Any date within the target week
 * @returns {Object} - Weekly workload summary
 */
export function calculateWeeklyWorkload(assignments, dateInWeek) {
  const weekStart = getWeekStart(dateInWeek);
  const weekEnd = getWeekEnd(dateInWeek);
  const weekNumber = getWeekNumber(dateInWeek);

  const weekAssignments = assignments.filter(a => {
    const dueDate = new Date(a.dueDate);
    return dueDate >= weekStart && dueDate <= weekEnd;
  });

  const score = weekAssignments.reduce(
    (total, assignment) => total + getAssignmentWeight(assignment),
    0
  );

  // Calculate daily breakdown
  const dailyBreakdown = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    dailyBreakdown.push(calculateDailyWorkload(assignments, day));
  }

  // Count DSTs this week
  const dstCount = weekAssignments.filter(
    a => a.type === 'dst' || a.weight === 'DST'
  ).length;

  return {
    weekNumber,
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd),
    score,
    status: getWeeklyLoadStatus(score),
    assignments: weekAssignments,
    count: weekAssignments.length,
    dailyBreakdown,
    dstCount,
  };
}

/**
 * Get load status for a daily score
 */
export function getDailyLoadStatus(score) {
  const { LIGHT, MEDIUM, HEAVY } = WORKLOAD_THRESHOLDS.daily;

  if (score <= LIGHT) return LOAD_STATUS.LIGHT;
  if (score <= MEDIUM) return LOAD_STATUS.MEDIUM;
  if (score <= HEAVY) return LOAD_STATUS.HEAVY;
  return LOAD_STATUS.CRITICAL;
}

/**
 * Get load status for a weekly score
 */
export function getWeeklyLoadStatus(score) {
  const { LIGHT, MEDIUM, HEAVY } = WORKLOAD_THRESHOLDS.weekly;

  if (score <= LIGHT) return LOAD_STATUS.LIGHT;
  if (score <= MEDIUM) return LOAD_STATUS.MEDIUM;
  if (score <= HEAVY) return LOAD_STATUS.HEAVY;
  return LOAD_STATUS.CRITICAL;
}

// ─────────────────────────────────────────────────────────────────────────────
// DST ANALYSIS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze DST schedule for conflicts and overload
 * @param {Array} dstList - Array of DST objects
 * @returns {Object} - Analysis result with warnings
 */
export function analyzeDSTSchedule(dstList) {
  const warnings = [];
  const sortedDSTs = [...dstList].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Check consecutive Saturdays
  let consecutiveCount = 0;
  let lastSaturday = null;

  for (const dst of sortedDSTs) {
    const dstDate = new Date(dst.date);

    if (!isSaturday(dstDate)) {
      warnings.push({
        type: 'NOT_SATURDAY',
        message: `Le DST "${dst.subject}" n'est pas programmé un samedi`,
        dst,
        severity: 'info',
      });
      continue;
    }

    if (lastSaturday) {
      const daysDiff = (dstDate - lastSaturday) / (1000 * 60 * 60 * 24);

      if (daysDiff === 7) {
        consecutiveCount++;
        if (consecutiveCount >= WORKLOAD_THRESHOLDS.dst.MAX_CONSECUTIVE_SATURDAYS) {
          warnings.push({
            type: 'CONSECUTIVE_SATURDAYS',
            message: `${consecutiveCount + 1} samedis consécutifs avec DST détectés`,
            severity: 'high',
            dates: [formatDate(lastSaturday), formatDate(dstDate)],
          });
        }
      } else if (daysDiff < 7 * WORKLOAD_THRESHOLDS.dst.MIN_WEEKS_BETWEEN) {
        warnings.push({
          type: 'TOO_CLOSE',
          message: `DST trop rapprochés: "${dst.subject}" moins de ${WORKLOAD_THRESHOLDS.dst.MIN_WEEKS_BETWEEN} semaines après le précédent`,
          severity: 'medium',
          dst,
        });
        consecutiveCount = 0;
      } else {
        consecutiveCount = 0;
      }
    }

    lastSaturday = dstDate;
  }

  // Check DST per week
  const dstByWeek = {};
  for (const dst of sortedDSTs) {
    const week = getWeekNumber(dst.date);
    const year = new Date(dst.date).getFullYear();
    const key = `${year}-W${week}`;

    if (!dstByWeek[key]) {
      dstByWeek[key] = [];
    }
    dstByWeek[key].push(dst);

    if (dstByWeek[key].length > WORKLOAD_THRESHOLDS.dst.MAX_PER_WEEK) {
      warnings.push({
        type: 'TOO_MANY_PER_WEEK',
        message: `Semaine ${week}: ${dstByWeek[key].length} DST programmés (max recommandé: ${WORKLOAD_THRESHOLDS.dst.MAX_PER_WEEK})`,
        severity: 'high',
        week: key,
        dsts: dstByWeek[key],
      });
    }
  }

  return {
    total: dstList.length,
    warnings,
    byWeek: dstByWeek,
    hasHighSeverity: warnings.some(w => w.severity === 'high'),
  };
}

/**
 * Suggest alternative dates for a new DST
 * @param {Array} existingDSTs - List of existing DSTs
 * @param {Date|string} preferredDate - Originally preferred date
 * @param {number} range - Number of weeks to search
 * @returns {Array} - Suggested alternative dates
 */
export function suggestDSTDates(existingDSTs, preferredDate, range = 4) {
  const suggestions = [];
  const preferred = new Date(preferredDate);

  // Always suggest Saturdays
  for (let weekOffset = -range; weekOffset <= range; weekOffset++) {
    if (weekOffset === 0) continue; // Skip the preferred date

    const candidateDate = new Date(preferred);
    candidateDate.setDate(candidateDate.getDate() + (weekOffset * 7));

    // Ensure it's a Saturday
    const dayOfWeek = candidateDate.getDay();
    if (dayOfWeek !== 6) {
      candidateDate.setDate(candidateDate.getDate() + (6 - dayOfWeek));
    }

    // Check if there's already a DST on this date
    const hasConflict = existingDSTs.some(
      dst => formatDate(dst.date) === formatDate(candidateDate)
    );

    if (!hasConflict) {
      // Calculate the load for this week
      const weekLoad = calculateWeeklyWorkload(existingDSTs, candidateDate);

      suggestions.push({
        date: formatDate(candidateDate),
        weekNumber: getWeekNumber(candidateDate),
        existingLoad: weekLoad.status,
        score: weekLoad.score,
        recommended: weekLoad.status === LOAD_STATUS.LIGHT,
      });
    }
  }

  // Sort by recommendation and score
  return suggestions.sort((a, b) => {
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    return a.score - b.score;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if adding a new assignment would cause overload
 * @param {Array} existingAssignments - Current assignments
 * @param {Object} newAssignment - Assignment to check
 * @returns {Object} - Conflict analysis
 */
export function checkForConflicts(existingAssignments, newAssignment) {
  const { dueDate } = newAssignment;
  const newWeight = getAssignmentWeight(newAssignment);

  // Daily analysis
  const dailyLoad = calculateDailyWorkload(existingAssignments, dueDate);
  const projectedDailyScore = dailyLoad.score + newWeight;
  const projectedDailyStatus = getDailyLoadStatus(projectedDailyScore);

  // Weekly analysis
  const weeklyLoad = calculateWeeklyWorkload(existingAssignments, dueDate);
  const projectedWeeklyScore = weeklyLoad.score + newWeight;
  const projectedWeeklyStatus = getWeeklyLoadStatus(projectedWeeklyScore);

  // Adjacent days analysis
  const prevDay = new Date(dueDate);
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(dueDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const prevDayLoad = calculateDailyWorkload(existingAssignments, prevDay);
  const nextDayLoad = calculateDailyWorkload(existingAssignments, nextDay);

  // Build warnings
  const warnings = [];

  if (projectedDailyStatus === LOAD_STATUS.HEAVY) {
    warnings.push({
      type: 'DAILY_OVERLOAD',
      severity: 'high',
      message: `Surcharge journalière détectée: score ${projectedDailyScore} (seuil: ${WORKLOAD_THRESHOLDS.daily.HEAVY})`,
      existingAssignments: dailyLoad.assignments,
    });
  } else if (projectedDailyStatus === LOAD_STATUS.CRITICAL) {
    warnings.push({
      type: 'DAILY_CRITICAL',
      severity: 'critical',
      message: `Charge critique ce jour: score ${projectedDailyScore}. Fortement déconseillé.`,
      existingAssignments: dailyLoad.assignments,
    });
  }

  if (projectedWeeklyStatus === LOAD_STATUS.HEAVY || projectedWeeklyStatus === LOAD_STATUS.CRITICAL) {
    warnings.push({
      type: 'WEEKLY_OVERLOAD',
      severity: 'medium',
      message: `Semaine déjà chargée: score ${projectedWeeklyScore} (seuil: ${WORKLOAD_THRESHOLDS.weekly.HEAVY})`,
    });
  }

  if (prevDayLoad.status === LOAD_STATUS.HEAVY || prevDayLoad.status === LOAD_STATUS.CRITICAL) {
    warnings.push({
      type: 'ADJACENT_DAY',
      severity: 'low',
      message: `La veille est déjà très chargée (score: ${prevDayLoad.score})`,
    });
  }

  if (nextDayLoad.status === LOAD_STATUS.HEAVY || nextDayLoad.status === LOAD_STATUS.CRITICAL) {
    warnings.push({
      type: 'ADJACENT_DAY',
      severity: 'low',
      message: `Le lendemain est déjà très chargé (score: ${nextDayLoad.score})`,
    });
  }

  return {
    canAdd: projectedDailyStatus !== LOAD_STATUS.CRITICAL,
    dailyStatus: projectedDailyStatus,
    weeklyStatus: projectedWeeklyStatus,
    projectedDailyScore,
    projectedWeeklyScore,
    warnings,
    hasHighSeverity: warnings.some(w => w.severity === 'high' || w.severity === 'critical'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate workload statistics for a class over a period
 * @param {Array} assignments - All assignments
 * @param {Date|string} startDate - Period start
 * @param {Date|string} endDate - Period end
 * @returns {Object} - Statistics summary
 */
export function generateWorkloadStats(assignments, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  const filteredAssignments = assignments.filter(a => {
    const date = new Date(a.dueDate);
    return date >= start && date <= end;
  });

  // Calculate daily scores
  const dailyScores = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayLoad = calculateDailyWorkload(filteredAssignments, new Date(d));
    dailyScores.push(dayLoad);
  }

  // Find peaks
  const sortedByScore = [...dailyScores].sort((a, b) => b.score - a.score);
  const peakDays = sortedByScore.slice(0, 5).filter(d => d.score > 0);

  // Count by status
  const statusCounts = dailyScores.reduce((acc, day) => {
    acc[day.status] = (acc[day.status] || 0) + 1;
    return acc;
  }, {});

  // By subject
  const bySubject = filteredAssignments.reduce((acc, a) => {
    const subject = a.subject || 'Autre';
    if (!acc[subject]) {
      acc[subject] = { count: 0, totalWeight: 0 };
    }
    acc[subject].count++;
    acc[subject].totalWeight += getAssignmentWeight(a);
    return acc;
  }, {});

  // Average daily load
  const totalScore = dailyScores.reduce((sum, d) => sum + d.score, 0);
  const averageDailyLoad = totalScore / days;

  return {
    period: {
      start: formatDate(start),
      end: formatDate(end),
      days,
    },
    totalAssignments: filteredAssignments.length,
    totalScore,
    averageDailyLoad: Math.round(averageDailyLoad * 10) / 10,
    peakDays,
    statusCounts,
    bySubject,
    overloadDays: dailyScores.filter(
      d => d.status === LOAD_STATUS.HEAVY || d.status === LOAD_STATUS.CRITICAL
    ).length,
  };
}
