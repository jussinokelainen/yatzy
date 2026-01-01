export const PORT = 2222; // Go server port

// Load leaderboard
export async function loadLb(setlb, type) {
  console.log('Fetching leaderboard')
  let apiUrl = ``;
  if (type === 'name') {
    apiUrl = `${window.location.protocol}//${window.location.hostname}:${PORT}/api/getscores`
  }
  if (type === 'id') {
    apiUrl = `${window.location.protocol}//${window.location.hostname}:${PORT}/api/getstats`
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      setlb(data.result);
    } else {
      console.error('Failed to load scores:', data.error);
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
  }
}
