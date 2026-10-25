import './App.css'
import { Button, Button2 } from './buttons'
import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { loadLb, makePOSTrequest, makeGETrequest } from './requests'
import { Scoreboard, getScores } from './scoreboard'

export let DICE_ROLLING = false

const MAXROUND = 15

// Global data to load already clicked items into
// when loading progress, and global turn count
export let preClicked: Record<number, boolean> = {}
export let rollCount_global: number = 0

// Map to connect dice with their corresponding image names
const diceImages = new Map([
  [0, 'dice0'],
  [1, 'dice1'],
  [2, 'dice2'],
  [3, 'dice3'],
  [4, 'dice4'],
  [5, 'dice5'],
  [6, 'dice6'],
]);

// Screens that only a logged in player whose account has been allowed
// may see are wrapped in this. When the player is not allowed to be
// there it shows a screen they are allowed to use instead. The server
// checks the same things on every request anyway, this only keeps the
// url in sync with what is shown on the screen.
function RequireAccount({ loggedIn, allowed, children }: {
  loggedIn: boolean;
  allowed: boolean;
  children: ReactNode;
}) {
  if (!loggedIn) { return <Navigate to="/login" replace /> }
  if (!allowed) { return <Navigate to="/pending" replace /> }
  return <>{children}</>
}

// The routes of the website:
//
//   /                   where the player is currently allowed to go
//   /login              log in or create an account
//   /pending            account created but not allowed to play yet
//   /menu               main menu of a logged in player
//   /leaderboard        top 20 results
//   /leaderboard/users  leaderboard grouped by player
//   /game               the game itself
//   /end                final score of a finished game
//
// Each of the screens is shown by the route matching the url,
// the handlers below move between the screens with navigate().
const App = () => {
  const navigate = useNavigate()
  // Which screen to show is decided by the url, so every screen
  // change is just a navigate() to the url of that screen
  const pathname = useLocation().pathname

  const [name, setName] = useState('');
  const [allowed, setAllowed] = useState(false);
  // True while the login status is read on startup. Until that is
  // known the url does not mean anything yet, so nothing is routed.
  const [checkingSession, setCheckingSession] = useState(true);

  const [diceState, setDiceState] = useState([0, 0, 0, 0, 0]);
  const [lockState, setLockState] = useState([false, false, false, false, false]);
  const [lbScores, setLbScores] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [total, setTotal] = useState(0)
  const [subtotal, setSubTotal] = useState(0)
  // False while the game is being read from the server, so that
  // /game does not flash an empty scoreboard for a moment
  const [gameLoaded, setGameLoaded] = useState(false)

  // Auth screen values
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')

  // Whether the logged in user has a game they can continue
  const [hasProgress, setHasProgress] = useState(false)

  // Check whether the request lost the login, for example
  // because the session expired, and go to the login screen if so
  async function handleAuthError(response: Response): Promise<boolean> {
    if (response.status === 401) {
      setName('')
      setAllowed(false)
      setHasProgress(false)
      resetClient()
      navigate('/login', { replace: true })
      return true
    }
    return false
  }

  // Reload the account of the logged in user. This does not navigate
  // anywhere, the guards of the screens decide where the player
  // belongs based on name and allowed.
  async function loadAccount() {
    const response = await makeGETrequest(`api/me`)
    if (!response.ok) {
      setName('')
      setAllowed(false)
      setHasProgress(false)
      return
    }
    const me = await response.json();
    if (!me.logged_in) {
      setName('')
      setAllowed(false)
      setHasProgress(false)
      return
    }

    setName(me.username)
    setAllowed(me.allowed)
    if (!me.allowed) {
      // The account has not been enabled yet
      return
    }

    // Check whether the user has a game they can continue
    const progressResponse = await makeGETrequest(`checkExistingProgress`)
    if (await handleAuthError(progressResponse)) { return }
    if (progressResponse.ok) {
      const progress = await progressResponse.json();
      setHasProgress(progress.exists)
    }
  }

  // useEffect that gets ran once when the website is first opened
  useEffect(() => {
    loadAccount()
      // The url only means something once it is known who is playing
      .finally(() => setCheckingSession(false))
  }, [])

  // Read the game whenever the url points at /game, so that
  // refreshing the page or opening the url directly continues
  // the game of the player instead of losing it
  useEffect(() => {
    if (checkingSession || !allowed || pathname !== '/game') { return }
    // Only navigate from the catch if /game is still the screen
    // being shown, otherwise a slow failure would yank the player
    // away from wherever they went in the meantime
    let active = true
    loadGame().catch(() => {
      if (active) {
        // The game could not be read, going back to the menu
        // gives the player a way to try again
        navigate('/menu', { replace: true })
      }
    })
    return () => { active = false }
  }, [pathname, checkingSession, allowed])

  // Read the final score whenever the url points at /end, which
  // keeps the end screen working after a refresh
  useEffect(() => {
    if (checkingSession || !allowed || pathname !== '/end') { return }
    let cancelled = false
    setTotal(0)
    getScores()
      .then(data => { if (!cancelled) { setTotal(data.total) } })
      .catch(() => {
        // There is no finished game to show, so there is
        // nothing to do on this screen
        if (!cancelled) { navigate('/menu', { replace: true }) }
      })
    return () => { cancelled = true }
  }, [pathname, checkingSession, allowed])

  // Read the leaderboard whenever the url points at one of the
  // leaderboard screens. The leaderboards are public, so unlike
  // the screens above they do not need a logged in player
  useEffect(() => {
    if (pathname !== '/leaderboard' && pathname !== '/leaderboard/users') { return }
    // Drop the old rows so a different leaderboard does not
    // show the previous one while it loads
    setLbScores([])
    loadLb(setLbScores, pathname === '/leaderboard/users' ? 'user' : 'name')
  }, [pathname])

  // Log in or create an account with the values typed
  // into the auth screen
  async function authSubmit() {
    setAuthError('')
    if (usernameInput == '' || passwordInput == '') {
      setAuthError('Username and password are required')
      return
    }

    const response = await makePOSTrequest(`api/${authMode}`, {
      username: usernameInput,
      password: passwordInput,
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setAuthError(data.error ?? 'Something went wrong')
      return
    }

    // Clean the password field, but keep the username
    setPasswordInput('')
    // Once this has filled in name and allowed, the guard of the
    // login screen sends the player to the screen they belong on
    await loadAccount()
  }

  // Reset client side game values when the player leaves the game
  function resetClient() {
    setLockState([false, false, false, false, false])
    setDiceState([0, 0, 0, 0, 0])
    setRollCount(0)
    rollCount_global = 0
    setTotal(0)
    setSubTotal(0)
    setGameLoaded(false)
  }

  // Log the user out and show the login screen
  async function logout() {
    await makePOSTrequest('api/logout')
    resetClient()
    setName('')
    setAllowed(false)
    setHasProgress(false)
    navigate('/login', { replace: true })
  }

  // Read the game state of the logged in user, called by /game
  async function loadGame() {
    // Get game data from server, loads existing progress if it exists,
    // otherwise a new game is initialized. The player is identified by
    // the session cookie the server set when logging in.
    setGameLoaded(false)
    const response = await makeGETrequest(`start`)
    if (await handleAuthError(response)) { return }
    if (!response.ok) { throw new Error(`Server error: ${response.status}`); }
    const gameData = await response.json();
    preClicked = gameData.clickedrow
    setDiceState(gameData.dice)
    setLockState(gameData.locked)
    setRollCount(gameData.roll_count)
    setTotal(gameData.total)
    setSubTotal(gameData.subtotal)
    rollCount_global = gameData.roll_count
    setGameLoaded(true)
  }

  // Start a new game, throwing away any ongoing one
  async function newGame() {
    await makePOSTrequest('restart')
    // /game reads the fresh game when it is opened
    navigate('/game')
  }

  // Go back to the main menu with a fresh game state
  async function backToMenu() {
    await makePOSTrequest('restart')
    resetClient()
    // The ongoing game was thrown away, so there is nothing to continue
    setHasProgress(false)
    navigate('/menu')
  }

  // Toggle the locking of a dice
  async function toggleLock(i: number) {
    if (diceState[i] != 0 && !DICE_ROLLING) {
      const response = await makePOSTrequest(`lockDice/${i}`)
      if (await handleAuthError(response)) { return }
      const newLocks = [...lockState]
      newLocks[i] = !newLocks[i]
      setLockState(newLocks)
    }
  };

  // Function used for visual client side dice rolling effect
  function simulateRollOnce() {
    const newValues = [...diceState]

    for (let i = 0; i < 5; i++) {
      if (!lockState[i]) {
        const newValue = Math.floor(Math.random() * 6) + 1;
        newValues[i] = newValue
      }
    }
    setDiceState(newValues)
  }

  function start_rolling() {
    DICE_ROLLING = true
  }

  function stop_rolling() {
    DICE_ROLLING = false
  }

  // Function that rolls the dice with visual client side rolling and
  // then setting the values to ones rolled by the server
  async function rollDice() {
    if (rollCount >= 3 || DICE_ROLLING) {
      return;
    }

    const response = await makeGETrequest(`rollDice`)
    if (await handleAuthError(response)) { return }
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    const data = await response.json();

    start_rolling()

    simulateRollOnce()
    setTimeout(simulateRollOnce, 200)
    setTimeout(simulateRollOnce, 400)
    setTimeout(simulateRollOnce, 600)
    setTimeout(simulateRollOnce, 800)
    setTimeout(simulateRollOnce, 1000)

    setTimeout(() => {
      setDiceState(data.values)
    }, 1200)
    setTimeout(stop_rolling, 1400)

    setRollCount(prevCount => prevCount + 1);
    rollCount_global += 1
  };

  // Function that handles resetting client side game state
  // after selecting an item
  async function handleReset() {
    setLockState([false, false, false, false, false])
    setDiceState([0, 0, 0, 0, 0])
    setRollCount(0)
    rollCount_global = 0
    const response = await makeGETrequest(`getRoundNumber`)
    if (await handleAuthError(response)) { return }
    if (!response.ok) { throw new Error(`Server error: ${response.status}`); }
    const roundNum = await response.json();
    if (roundNum.roundnumber >= MAXROUND) {
      // The end screen reads the final score itself
      navigate('/end')
    }
  }

  // The url does not mean anything until it is known who is
  // playing, so nothing is routed while the login is checked
  if (checkingSession) {
    // Checking the login status, nothing to show yet
    return (
      <div></div>
    )
  }

  // Where the player is allowed to go from here
  const home = !name ? '/login' : (!allowed ? '/pending' : '/menu')
  const loggedIn = name !== ''

  const authScreen = (
    <div className="gameover-table">
      <table className="gameover-table">
        <tbody>
          <tr>
            <td className="gameover-table">
              <p className="gameover-text">{authMode === 'login' ? 'Log in' : 'Create account'}</p>
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <input
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                className="nameinput-box"
                placeholder="Username"
                autoComplete="username"
              />
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="nameinput-box"
                placeholder="Password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                onKeyDown={e => { if (e.key === 'Enter') { authSubmit() } }}
              />
            </td>
          </tr>
          {authError !== '' ?
            <tr>
              <td className="gameover-table">
                <p className="auth-error">{authError}</p>
              </td>
            </tr> : null
          }
          <tr>
            <td className="gameover-table">
              <Button handleClick={authSubmit} text={authMode === 'login' ? 'Log in' : 'Create account'} className="gameover-buttons" />
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <Button
                handleClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}
                text={authMode === 'login' ? 'Create an account' : 'Log in instead'}
                className="gameover-buttons"
              />
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <Button handleClick={() => navigate('/leaderboard')} text="Top 20 results" className="gameover-buttons" />
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <Button handleClick={() => navigate('/leaderboard/users')} text="Leaderboard by user" className="gameover-buttons" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  const pendingScreen = (
    <div className="gameover-table">
      <table className="gameover-table">
        <tbody>
          <tr>
            <td className="gameover-table">
              <p className="gameover-text">Logged in as {name}</p>
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <p className="gameover-text">Your account is currently disabled</p>
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <p className="gameover-text">Ask the admin to enable it</p>
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <Button handleClick={logout} text='Log out' className="gameover-buttons" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  const menuScreen = (
    <div className="gameover-table">
      <table className="gameover-table">
        <tbody>
          <tr>
            <td className="gameover-table">
              <p className="gameover-text">Logged in as {name}</p>
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <Button handleClick={newGame} text='New game' className="gameover-buttons" />
            </td>
          </tr>
          {hasProgress ?
            <tr>
              <td className="gameover-table">
                <Button handleClick={() => navigate('/game')} text='Continue game' className="gameover-buttons" />
              </td>
            </tr> : null
          }
          <tr>
            <td className="gameover-table">
              <Button handleClick={() => navigate('/leaderboard')} text='Top 20 results' className="gameover-buttons" />
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <Button handleClick={() => navigate('/leaderboard/users')} text='Leaderboard by user' className="gameover-buttons" />
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <Button handleClick={logout} text='Log out' className="gameover-buttons" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  // The user leaderboard has an extra column for the number of games
  const showTotalGames = pathname === '/leaderboard/users'
  const lbWidth = showTotalGames ? 4 : 3

  const leaderboardScreen = (
    <div>
      <table className="leaderboard-screen">
        <tbody>
          <tr>
            <th colSpan={lbWidth} className="leaderboard-screen">
              <p className="gameover-text">Leaderboard</p>
            </th>
          </tr>
          <tr>
            <td className="leaderboard-table">
              <p>Place</p>
            </td>
            <td className="leaderboard-table">
              <p>Name</p>
            </td>
            <td className="leaderboard-table">
              <p>Score</p>
            </td>
            {showTotalGames ?
              <td className="leaderboard-table">
                <p>Games</p>
              </td> : null
            }
          </tr>
          {lbScores.map((score: any, index: number) => (
            <tr key={index}>
              <td className="leaderboard-table">{index + 1}.</td>
              <td className="leaderboard-table">{score.name}</td>
              <td className="leaderboard-table">{score.score}</td>
              {showTotalGames ?
                <td className="leaderboard-table">
                  {score.count}
                </td> : null
              }
            </tr>
          ))}
          <tr>
            <td colSpan={lbWidth} className="leaderboard-screen">
              <Button handleClick={() => navigate(home)} text='Back' className="gameover-buttons" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  const gameScreen = (
    <div>
      <table className="scoreboard-table">
        <tbody>
          <tr>
            <td className="scoreboard-table">
              <Scoreboard
                reset={handleReset}
                name={name}
                total={total}
                subtotal={subtotal}
                setTotal={setTotal}
                setSubTotal={setSubTotal}
              />

              <Button handleClick={backToMenu} text='Restart game' className="restart-container" />
            </td>
            <td className="scoreboard-table">
              <p className="gameover-text">{3 - rollCount}</p>
              <Button handleClick={rollDice} text='Roll' className="rollbtn-container" />

              {Array.from(diceState.entries()).map(([i, value]) => (
                <div className='dice-container' key={i}>
                  {<Button2 handleClick={async () => await toggleLock(i)} text={<div className={diceImages.get(value)}></div>} />}
                  <div className={lockState[i] ? 'locked' : ''} />
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  const endScreen = (
    <div>
      <table className="gameover-table">
        <tbody>
          <tr>
            <td className="gameover-table">
              <p className="gameover-text">Game Over!</p>
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <p className="gameover-text">Final score: {total}</p>
            </td>
          </tr>
          <tr>
          </tr>
          <tr>
            <td className="gameover-table">
              <Button handleClick={backToMenu} text='Main menu' className="gameover-buttons" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <Routes>
      {/* The root of the site points at the screen the player
          is currently allowed to use */}
      <Route path="/" element={<Navigate to={home} replace />} />

      {/* A logged in player has no business on the login screen */}
      <Route
        path="/login"
        element={loggedIn ? <Navigate to={home} replace /> : authScreen}
      />

      {/* Accounts that have not been allowed yet wait here */}
      <Route
        path="/pending"
        element={
          !loggedIn ? <Navigate to="/login" replace />
            : allowed ? <Navigate to="/menu" replace />
              : pendingScreen
        }
      />

      <Route
        path="/menu"
        element={
          <RequireAccount loggedIn={loggedIn} allowed={allowed}>
            {menuScreen}
          </RequireAccount>
        }
      />

      {/* The leaderboards are public */}
      <Route path="/leaderboard" element={leaderboardScreen} />
      <Route path="/leaderboard/users" element={leaderboardScreen} />

      <Route
        path="/game"
        element={
          <RequireAccount loggedIn={loggedIn} allowed={allowed}>
            {gameLoaded ? gameScreen : <div></div>}
          </RequireAccount>
        }
      />

      <Route
        path="/end"
        element={
          <RequireAccount loggedIn={loggedIn} allowed={allowed}>
            {endScreen}
          </RequireAccount>
        }
      />

      {/* Unknown urls go back to the start */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
