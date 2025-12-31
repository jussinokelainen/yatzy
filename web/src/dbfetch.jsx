const DBPORT = 3000; // Go server port

// Add score to the leaderboard
export function saveScore(name, total, id, row) {
  console.log('Saving scores')
  const apiUrl = `${window.location.protocol}//${window.location.hostname}:${DBPORT}/api/addscore`;
  const totalNum = total;
  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, score: totalNum, id, row }),
  });
}

// Load leaderboard
export async function loadLb(setlb, type) {
  console.log('Fetching leaderboard')
  let apiUrl = ``;
  if (type === 'name') {
    apiUrl = `${window.location.protocol}//${window.location.hostname}:${DBPORT}/api/getscores`
  }
  if (type === 'id') {
    apiUrl = `${window.location.protocol}//${window.location.hostname}:${DBPORT}/api/getstats`
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
