const DBPORT = 3000; // Node server port

// Add score to the leaderboard
export function saveScore(name, total, id) {
  console.log('Saving scores')
  const apiUrl = `${window.location.protocol}//${window.location.hostname}:${DBPORT}/api/save-score`;
  const totalNum = total;
  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, score: totalNum, id }),
  });
}

// Load leaderboard
export async function loadLb(setlb, type) {
  console.log('Fetching leaderboard')
  const apiUrl = `${window.location.protocol}//${window.location.hostname}:${DBPORT}/api/load-scores?type=${type}`;

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
