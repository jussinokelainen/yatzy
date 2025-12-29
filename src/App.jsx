import './App.css'
import Button from './buttons/button'
import Button2 from './buttons/button2'
import { useState } from 'react'
import { saveScore, loadLb } from './dbfetch'
import { Total, Scoreboard } from './scoreboard'
import { resetTotal, resetSubTotal, perItemArray } from "./totals";
import { values, startValues, startLockMap, diceImages } from './valuemaps'
import { getUserKey, createUserKey, checkUserKey } from './userkeys'
let showTotalGames = false
let LBWIDTH = 3

function refreshValues(newValues) {
  values.set(1, newValues.get(1));
  values.set(2, newValues.get(2));
  values.set(3, newValues.get(3));
  values.set(4, newValues.get(4));
  values.set(5, newValues.get(5));
}

const App = () => {
  const [diceState, setDiceState] = useState(values);
  const [lockState, setLockState] = useState(startLockMap);
  const [name, setName] = useState('');
  const [nameIsSet, setNameIsSet] = useState(false);
  const [roundNum, setRoundNum] = useState(0);
  const [showLb, setShowLb] = useState(false);
  const [lbScores, setLbScores] = useState([]);
  const [rollCount, setRollCount] = useState(0);

  function startGame() {
    perItemArray.fill(0)
    setNameIsSet(true)
    const hasKey = checkUserKey()
    try {
      hasKey ? null : createUserKey()
    } catch (e) {
      console.log('Cannot access localStorage:', e);
    }
  }

  function restartGame() {
    perItemArray.fill(0)
    setNameIsSet(false)
    setRoundNum(0)
    setShowLb(false)
    setLockState(startLockMap)
    setDiceState(startValues)
    refreshValues(startValues)
    setRollCount(0)
    resetTotal()
    resetSubTotal()
  }

  function endGame() {
    let perfect = 1
    if (perItemArray.includes(0)) {
      perfect = 0
    }
    saveScore(name, Number(Total()), getUserKey(), perfect)
  }

  function toggleLock(i) {
    const newLockMap = new Map(lockState)
    const current = lockState.get(i)
    newLockMap.set(i, !current)
    setLockState(newLockMap)
  };

  function rollAllOnce() {
    const nextValues = new Map(values)

    for (let i = 1; i <= 5; i++) {
      if (lockState.get(i)) {
        const newValue = Math.floor(Math.random() * 6) + 1;
        nextValues.set(i, newValue);
      }
    }
    refreshValues(nextValues)
    setDiceState(nextValues)
  }

  function rollDice() {
    if (rollCount >= 3) {
      return;
    }

    rollAllOnce()
    setTimeout(rollAllOnce, 200)
    setTimeout(rollAllOnce, 400)
    setTimeout(rollAllOnce, 600)
    setTimeout(rollAllOnce, 800)
    setTimeout(rollAllOnce, 1000)
    setTimeout(setDiceState(values), 1100)

    setRollCount(prevCount => prevCount + 1);
  };

  function handleReset() {
    refreshValues(startValues)
    setLockState(startLockMap)
    setDiceState(startValues)
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
                  values={[values.get(1), values.get(2), values.get(3), values.get(4), values.get(5)]}
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
                    <div className={lockState.get(i) ? null : 'locked'} />
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
              <p className="gameover-text">Final score: <Total /></p>
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
