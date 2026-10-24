import './App.css'
import { Button, Button2 } from './buttons'
import { useState, useEffect } from 'react'
import { loadLb, makePOSTrequest, makeGETrequest } from './requests'
import { Scoreboard, getScores } from './scoreboard'
let showTotalGames = false
let LBWIDTH = 3
let CAN_ROLL = true

const MAXROUND = 15
const STATE = {
  loading: 0,
  auth: 1,
  pending: 2,
  mainMenu: 3,
  showLeaderBoard: 4,
  mainGameUI: 5,
  endScreen: 6
}

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

// Main app function
const App = () => {
  const [gameState, setGameState] = useState(STATE.loading)
  const [diceState, setDiceState] = useState([0, 0, 0, 0, 0]);
  const [lockState, setLockState] = useState([false, false, false, false, false]);
  const [name, setName] = useState('');
  const [lbScores, setLbScores] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [total, setTotal] = useState(0)

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
      setGameState(STATE.auth)
      return true
    }
    return false
  }

  // Reload the account of the logged in user and decide
  // which screen to show based on it
  async function loadAccount() {
    const response = await makeGETrequest(`api/me`)
    if (!response.ok) { setGameState(STATE.auth); return }
    const me = await response.json();
    if (!me.logged_in) {
      setGameState(STATE.auth)
      return
    }

    setName(me.username)
    if (!me.allowed) {
      // The account has not been enabled yet
      setGameState(STATE.pending)
      return
    }

    // Check whether the user has a game they can continue
    const progressResponse = await makeGETrequest(`checkExistingProgress`)
    if (await handleAuthError(progressResponse)) { return }
    if (progressResponse.ok) {
      const progress = await progressResponse.json();
      setHasProgress(progress.exists)
    }

    setGameState(STATE.mainMenu)
  }

  // useEffect that gets ran once when the website is first opened
  // if i understand correctly
  useEffect(() => {
    loadAccount()
  }, [])

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
    await loadAccount()
  }

  // Send the user to the login screen and
  // reset client side game values
  function resetClient() {
    setLockState([false, false, false, false, false])
    setDiceState([0, 0, 0, 0, 0])
    setRollCount(0)
    rollCount_global = 0
    setTotal(0)
  }

  // Log the user out and show the login screen
  async function logout() {
    await makePOSTrequest('api/logout')
    resetClient()
    setName('')
    setHasProgress(false)
    setGameState(STATE.auth)
  }

  // Load the game state of the logged in user and
  // go to the game screen
  async function loadGame() {
    // Get game data from server, loads existing progress if it exists,
    // otherwise a new game is initialized. The player is identified by
    // the session cookie the server set when logging in.
    const response = await makeGETrequest(`start`)
    if (await handleAuthError(response)) { return }
    if (!response.ok) { throw new Error(`Server error: ${response.status}`); }
    const gameData = await response.json();
    preClicked = gameData.clickedrow
    setDiceState(gameData.dice)
    setLockState(gameData.locked)
    setRollCount(0)
    rollCount_global = 0
    setGameState(STATE.mainGameUI)
  }

  // Start a new game, throwing away any ongoing one
  async function newGame() {
    await makePOSTrequest('restart')
    await loadGame()
  }

  // Go back to the main menu with a fresh game state
  async function backToMenu() {
    await makePOSTrequest('restart')
    resetClient()
    await loadAccount()
  }

  // Function that is called when the game ends,
  // this function does not in itself end the game
  async function endGame() {
    const data = await getScores()
    setTotal(data.total)
  }

  // Toggle the locking of a dice
  async function toggleLock(i: number) {
    if (diceState[i] != 0) {
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

  function enable_rolling() {
    CAN_ROLL = true
  }

  function disable_rolling() {
    CAN_ROLL = false
  }

  // Function that rolls the dice with visual client side rolling and
  // then setting the values to ones rolled by the server
  async function rollDice() {
    if (rollCount >= 3 || !CAN_ROLL) {
      return;
    }

    const response = await makeGETrequest(`rollDice`)
    if (await handleAuthError(response)) { return }
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    const data = await response.json();

    disable_rolling()

    simulateRollOnce()
    setTimeout(simulateRollOnce, 200)
    setTimeout(simulateRollOnce, 400)
    setTimeout(simulateRollOnce, 600)
    setTimeout(simulateRollOnce, 800)
    setTimeout(simulateRollOnce, 1000)
    setTimeout(enable_rolling, 1200)

    setTimeout(() => {
      setDiceState(data.values)
    }, 1100)

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
      endGame();
      setGameState(STATE.endScreen)
    }
  }

  // Why does this function exist
  function RollsLeft() {
    return 3 - rollCount
  }

  // Function to load leaderboard data and set the width
  // to match the type of leaderboard that gets shown
  function showLeaderBoard(type: string) {
    if (type === 'user') {
      showTotalGames = true
      LBWIDTH = 4
    } else {
      showTotalGames = false
      LBWIDTH = 3
    }

    loadLb(setLbScores, type)
    setGameState(STATE.showLeaderBoard)
  }

  switch (gameState) {
    case STATE.loading:
      // Checking the login status, nothing to show yet
      return (
        <div></div>
      )
    case STATE.auth:
      // Ask the user to log in or create an account
      return (
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
                  <Button handleClick={() => showLeaderBoard('name')} text="Top 20 results" className="gameover-buttons" />
                </td>
              </tr>
              <tr>
                <td className="gameover-table">
                  <Button handleClick={() => showLeaderBoard('user')} text="Leaderboard by user" className="gameover-buttons" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    case STATE.pending:
      // The account exists but has not been allowed to play yet
      return (
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
    case STATE.mainMenu:
      // Main menu of a logged in user
      return (
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
                    <Button handleClick={loadGame} text='Continue game' className="gameover-buttons" />
                  </td>
                </tr> : null
              }
              <tr>
                <td className="gameover-table">
                  <Button handleClick={() => showLeaderBoard('name')} text='Top 20 results' className="gameover-buttons" />
                </td>
              </tr>
              <tr>
                <td className="gameover-table">
                  <Button handleClick={() => showLeaderBoard('user')} text='Leaderboard by user' className="gameover-buttons" />
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
    case STATE.showLeaderBoard:
      // Show the leaderboard
      return (
        <div>
          <table className="leaderboard-screen">
            <tbody>
              <tr>
                <th colSpan={LBWIDTH} className="leaderboard-screen">
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
                <td colSpan={LBWIDTH} className="leaderboard-screen">
                  <Button handleClick={loadAccount} text='Back' className="gameover-buttons" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    case STATE.mainGameUI:
      // Main game ui
      return (
        <div>
          <table className="scoreboard-table">
            <tbody>
              <tr>
                <td className="scoreboard-table">
                  <Scoreboard
                    values={diceState}
                    reset={handleReset}
                    name={name}
                  />

                  <Button handleClick={backToMenu} text='Restart game' className="restart-container" />
                </td>
                <td className="scoreboard-table">
                  <p className="gameover-text"><RollsLeft /></p>
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
      );
    case STATE.endScreen:
      // End of game screen
      return (
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
    default:
      return (
        <div>
          <p>Unexpected game state.</p>
        </div>
      )
  }
}

export default App
