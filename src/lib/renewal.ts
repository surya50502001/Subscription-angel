export function calculateNextRenewal(lastDateStr: string | null | undefined, frequency: string): Date | null {
  if (!lastDateStr) return null;
  const lastDate = new Date(lastDateStr);
  if (isNaN(lastDate.getTime())) return null;

  const now = new Date();
  let nextDate = new Date(lastDate);

  const freq = (frequency || "").toLowerCase();
  if (freq !== "monthly" && freq !== "annual" && freq !== "annually" && freq !== "yearly" && freq !== "weekly") {
    return null;
  }

  // Prevent infinite loops if lastDate is very old (e.g. 1970)
  if (now.getTime() - lastDate.getTime() > 50 * 365 * 24 * 60 * 60 * 1000) {
    return null;
  }

  while (nextDate <= now) {
    if (freq === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (freq === "annual" || freq === "annually" || freq === "yearly") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else if (freq === "weekly") {
      nextDate.setDate(nextDate.getDate() + 7);
    }
  }
  return nextDate;
}
