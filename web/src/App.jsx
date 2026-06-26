import './App.css'
import { Button, Button2 } from './buttons'
import { useState, useEffect } from 'react'
import { loadLb, makePOSTrequest, makeGETrequest } from './requests'
import { Scoreboard, getScores } from './scoreboard'
import { getUserKey, createUserKey, checkUserKey } from './userkeys'
let showTotalGames = false
let LBWIDTH = 3

const MAXROUND = 15
const STATE = {
  askName: 0,
  showLeaderBoard: 1,
  mainGameUI: 2,
  endScreen: 3
}

// Global data to load already clicked items into
// when loading progress, and global turn count
export let preClicked = {}
export let rollCount_global = 0

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
  const [gameState, setGameState] = useState(STATE.askName)
  const [diceState, setDiceState] = useState([0, 0, 0, 0, 0]);
  const [lockState, setLockState] = useState([false, false, false, false, false]);
  const [name, setName] = useState('');
  const [lbScores, setLbScores] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [total, setTotal] = useState(0)

  // Function to check whether a player has existing progress stored
  // in the database. returns [<bool>, <name>] where <bool> is whether
  // progress exists, and <name> is the name saved with the progress.
  // If the bool is false, <name> might be undefined
  async function checkProgressPreGame() {
    const response = await makeGETrequest(`checkExistingProgress/${getUserKey()}`)
    if (!response.ok) { throw new Error(`Server error: ${response.status}`); }
    const progress = await response.json();
    if (progress.exists) {
      setName(progress.name)
    }
    return [progress.exists, progress.name]
  }

  // useEffect that gets ran once when the website is first opened
  // if i understand correctly
  useEffect(() => {
    async function load() {
      const check = await checkProgressPreGame()
      if (check[0]) {
        startGame(check[1])
      } else {
        setGameState(STATE.askName)
      }
    }

    load()
  }, [])

  // Start game with either existing progress or a new game
  async function startGame(newName) {
    // Game already runnińg, nothing to do
    if (gameState == STATE.mainGameUI) { return }

    // No name is given, do not start the game
    if (newName == '') { return }

    // Start a new game
    const hasKey = checkUserKey()
    try {
      hasKey ? null : createUserKey()
    } catch (e) {
      console.log('Cannot access localStorage:', e);
    }

    // Get game data from server, loads existing progress if it exists,
    // otherwise a new game is initialized
    const response = await makeGETrequest(`start/${getUserKey()}/${newName}`)
    if (!response.ok) { throw new Error(`Server error: ${response.status}`); }
    const progressData = await response.json();
    preClicked = progressData.clickedrow
    setGameState(STATE.mainGameUI)
  }

  // Reset client side game values
  function resetClient() {
    setLockState([false, false, false, false, false])
    setDiceState([0, 0, 0, 0, 0])
    setRollCount(0)
    rollCount_global = 0
    setTotal(0)
    setGameState(STATE.askName)
  }

  // Restart the game
  function restartGame() {
    makePOSTrequest('restart', { id: getUserKey(), name })
    resetClient()
  }

  // Function that is called when the game ends,
  // this function does not in itself end the game
  async function endGame() {
    const data = await getScores(getUserKey())
    setTotal(data.total)
  }

  // Toggle the locking of a dice
  async function toggleLock(i) {
    if (diceState[i] != 0) {
      await makePOSTrequest(`lockDice/${i}`, { id: getUserKey() })
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

  // Function that rolls the dice with visual client side rolling and
  // then setting the values to ones rolled by the server
  async function rollDice() {
    if (rollCount >= 3) {
      return;
    }

    const response = await makeGETrequest(`rollDice/${getUserKey()}`)
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    const data = await response.json();

    simulateRollOnce()
    setTimeout(simulateRollOnce, 200)
    setTimeout(simulateRollOnce, 400)
    setTimeout(simulateRollOnce, 600)
    setTimeout(simulateRollOnce, 800)
    setTimeout(simulateRollOnce, 1000)

    setTimeout(() => {
      setDiceState(data.values)
    }, 1100)

    setRollCount(prevCount => prevCount + 1);
    rollCount_global = prevCount => prevCount + 1
  };

  // Function that handles resetting client side game state
  // after selecting an item
  async function handleReset() {
    setLockState([false, false, false, false, false])
    setDiceState([0, 0, 0, 0, 0])
    setRollCount(0)
    rollCount_global = 0
    const response = await makeGETrequest(`getRoundNumber/${getUserKey()}`)
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
  function showLeaderBoard(type) {
    if (type === 'id') {
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
    case STATE.askName:
      // Ask for name from user
      return (
        <div className="gameover-table">
          <table className="gameover-table">
            <tbody>
              <tr>
                <td className="gameover-table">
                  <p className="gameover-text">Enter your name</p>
                </td>
              </tr>
              <tr>
                <td className="gameover-table">
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="nameinput-box"
                    onFocus={() => { setName('') }}
                  />
                </td>
              </tr>
              <tr>
                <td className="gameover-table">
                  <Button handleClick={() => startGame(name)} text="Start game" className="gameover-buttons" />
                </td>
              </tr>
              <tr>
                <td className="gameover-table">
                  <Button handleClick={() => showLeaderBoard('name')} text="Top 20 results" className="gameover-buttons" />
                </td>
              </tr>
              <tr>
                <td className="gameover-table">
                  <Button handleClick={() => showLeaderBoard('id')} text="Leaderboard by id" className="gameover-buttons" />
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
              {lbScores.map((score, index) => (
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
                  <Button handleClick={resetClient} text='Back' className="gameover-buttons" />
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

                  <Button handleClick={restartGame} text='Restart game' className="restart-container" />
                </td>
                <td className="scoreboard-table">
                  <p className="gameover-text"><RollsLeft /></p>
                  <Button handleClick={rollDice} text='Roll' className="rollbtn-container" />

                  {Array.from(diceState.entries()).map(([i, value]) => (
                    <div className='dice-container' key={i}>
                      {<Button2 handleClick={() => toggleLock(i)} text={<div className={diceImages.get(value)}></div>} />}
                      <div className={lockState[i] ? 'locked' : null} />
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
                  <Button handleClick={restartGame} text='Main menu' className="gameover-buttons" />
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
