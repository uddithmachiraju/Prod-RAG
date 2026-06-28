/**
 * Formats a Date object, timestamp, or ISO string into a relative time string (e.g., "2 hr ago", "1 day ago").
 * If the input is already in a relative format (e.g., "1h ago"), it returns it as-is.
 */
export function formatTimeAgo(dateInput) {
  if (!dateInput) return '';

  // If it's already a relative format (e.g. contains 'ago'), return as is
  if (typeof dateInput === 'string' && dateInput.toLowerCase().includes('ago')) {
    return dateInput;
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 0) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} wk${weeks > 1 ? 's' : ''} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo${months > 1 ? 's' : ''} ago`;

  const years = Math.floor(days / 365);
  return `${years} yr${years > 1 ? 's' : ''} ago`;
}

/**
 * Groups an array of chats into semantic date buckets: Today, Yesterday, This Week, This Month, and Older.
 * Handles both ISO timestamp strings (production) and "X ago" mock strings.
 */
export function groupChatsByDate(chats) {
  const groups = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    'This Month': [],
    Older: [],
  };

  if (!Array.isArray(chats)) return groups;

  chats.forEach(chat => {
    const dateInput = chat.updatedAt;
    if (!dateInput) {
      groups.Older.push(chat);
      return;
    }

    let diffDays = 0;

    // Handle mock strings (e.g., "1h ago", "2d ago")
    if (typeof dateInput === 'string' && dateInput.toLowerCase().includes('ago')) {
      const lower = dateInput.toLowerCase();
      if (lower.includes('min') || lower.includes('h')) {
        diffDays = 0;
      } else if (lower.includes('1d')) {
        diffDays = 1;
      } else if (lower.includes('d')) {
        const match = lower.match(/(\d+)d/);
        diffDays = match ? parseInt(match[1], 10) : 2;
      } else if (lower.includes('w')) {
        const match = lower.match(/(\d+)w/);
        diffDays = match ? parseInt(match[1], 10) * 7 : 7;
      } else {
        diffDays = 30; // default fallback for month/year ago
      }
    } else {
      // Handle standard Date inputs
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        const now = new Date();
        const dateDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffTime = nowDate - dateDate;
        diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else {
        diffDays = 0; // fallback if unparseable
      }
    }

    if (diffDays <= 0) {
      groups.Today.push(chat);
    } else if (diffDays === 1) {
      groups.Yesterday.push(chat);
    } else if (diffDays < 7) {
      groups['This Week'].push(chat);
    } else if (diffDays < 30) {
      groups['This Month'].push(chat);
    } else {
      groups.Older.push(chat);
    }
  });

  return groups;
}
