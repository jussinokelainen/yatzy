export const PORT = 2222; // Go server port

// Load leaderboard
export async function loadLb(setlb, type) {
  console.log('Fetching leaderboard')
  let apiUrl = ``;
  if (type === 'name') {
    apiUrl = `api/getscores`
  }
  if (type === 'id') {
    apiUrl = `api/getstats`
  }
  try {
    const response = await makeGETrequest(apiUrl)
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

export function makePOSTrequest(url, body) {
  const fullUrl = `${window.location.protocol}//${window.location.hostname}:${PORT}/${url}`;
  fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function makeGETrequest(url, body) {
  const fullUrl = `${window.location.protocol}//${window.location.hostname}:${PORT}/${url}`;
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return response
}
