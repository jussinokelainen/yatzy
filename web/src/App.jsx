import './App.css'
import Button from './buttons/button'
import Button2 from './buttons/button2'
import { useState } from 'react'
import { loadLb, makePOSTrequest, makeGETrequest } from './requests'
import { Scoreboard } from './scoreboard'
import { getUserKey, createUserKey, checkUserKey } from './userkeys'
let showTotalGames = false
let LBWIDTH = 3

// TODO: Get totals to work visually

const diceImages = new Map([
  [0, 'dice0'],
  [1, 'dice1'],
  [2, 'dice2'],
  [3, 'dice3'],
  [4, 'dice4'],
  [5, 'dice5'],
  [6, 'dice6'],
]);

const App = () => {
  const [diceState, setDiceState] = useState([0, 0, 0, 0, 0]);
  const [lockState, setLockState] = useState([false, false, false, false, false]);
  const [name, setName] = useState('');
  const [nameIsSet, setNameIsSet] = useState(false);
  const [roundNum, setRoundNum] = useState(0);
  const [showLb, setShowLb] = useState(false);
  const [lbScores, setLbScores] = useState([]);
  const [rollCount, setRollCount] = useState(0);

  function startGame() {
    const hasKey = checkUserKey()
    try {
      hasKey ? null : createUserKey()
    } catch (e) {
      console.log('Cannot access localStorage:', e);
    }

    makePOSTrequest('start', { id: getUserKey(), name })
    setNameIsSet(true)
  }

  function restartGame() {
    makePOSTrequest('restart', { id: getUserKey(), name })
    setLockState([false, false, false, false, false])
    setDiceState([0, 0, 0, 0, 0])
    setNameIsSet(false)
    setRoundNum(0)
    setShowLb(false)
    setRollCount(0)
  }

  function endGame() {
    makePOSTrequest('end', { id: getUserKey(), name })
  }

  function toggleLock(i) {
    makePOSTrequest(`lockDice/${i}`, { id: getUserKey() })
    const newLocks = [...lockState]
    newLocks[i] = !newLocks[i]
    setLockState(newLocks)
  };

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
  };

  function handleReset() {
    setLockState([false, false, false, false, false])
    setDiceState([0, 0, 0, 0, 0])
    setRollCount(0)
    setRoundNum(roundNum + 1)
  }

  function RollsLeft() {
    return 3 - rollCount
  }

  function showLeaderBoard(type) {
    if (type === 'id') {
      showTotalGames = true
      LBWIDTH = 4
    } else {
      showTotalGames = false
      LBWIDTH = 3

    }
    loadLb(setLbScores, type)
    setNameIsSet(true)
    setShowLb(true)
  }

  // Ask for name before game starts
  if (!nameIsSet) {
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
                <Button handleClick={startGame} text="Start game" className="gameover-buttons" />
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
  }

  if (showLb) {
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
                <Button handleClick={restartGame} text='Back' className="gameover-buttons" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  // Main game ui
  if (roundNum < 15) {
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
  }

  // End of game screen
  endGame()
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
              <p className="gameover-text">Final score: 0</p>
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
}

export default App
