// Load leaderboard
export async function loadLb(setlb: Function, type: string) {
  let apiUrl = ``;
  if (type === 'name') {
    apiUrl = `api/getscores`
  }
  if (type === 'user') {
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

// Function to make sending POST requests simpler
export async function makePOSTrequest(url: string, body?: any) {
  const fullUrl = `/${url}`;
  const response = await fetch(fullUrl, {
    method: 'POST',
    // Cookies are needed to identify the player
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return response
}

// Function to make sending GET requests simpler
export async function makeGETrequest(url: string) {
  const fullUrl = `/${url}`;
  const response = await fetch(fullUrl, {
    method: 'GET',
    // Cookies are needed to identify the player
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  return response
}
