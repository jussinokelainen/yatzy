import { saveScore, loadLb } from './dbfetch'
import { total, subTotal, updateTotal, resetTotal, resetSubTotal } from "./totals";
import Button from './buttons/button'
import Button2 from './buttons/button2'
import { Total, Scoreboard } from './scoreboard'
import { useState } from 'react'
import './App.css'

const values = new Map([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0],]);
const startLockMap = new Map([[1, true], [2, true], [3, true], [4, true], [5, true],]);
const startValues = new Map([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0],]);
const diceImages = new Map([
  [0, 'dice0'],
  [1, 'dice1'],
  [2, 'dice2'],
  [3, 'dice3'],
  [4, 'dice4'],
  [5, 'dice5'],
  [6, 'dice6'],
]);

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

  function restartGame() {
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

  function updateDice() {
    setDiceState(values)
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
    setTimeout(updateDice, 1100)

    setRollCount(prevCount => prevCount + 1);
  };

  function handleReset() {
    refreshValues(startValues)
    setLockState(startLockMap)
    setRollCount(0)
    setRoundNum(roundNum + 1)
  }

  function RollsLeft() {
    return 3 - rollCount
  }


  function startGame() {
    setNameIsSet(true)
  }

  function showLeaderBoard() {
    loadLb(setLbScores)
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
                <Button handleClick={showLeaderBoard} text="Show leaderboard" className="gameover-buttons" />
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
              <td className="leaderboard-screen">
                <p className="gameover-text">Top 20 players</p>
              </td>
            </tr>
            <tr>
              <td className="leaderboard-table">
                <ul>
                  {lbScores.map((score, index) => (
                    <li key={index}>
                      {index + 1}. {score.name}: {score.score}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
            <tr>
              <td className="leaderboard-screen">
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
  saveScore(name, Number(Total()))
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
              <Button handleClick={restartGame} text='Restart game' className="gameover-buttons" />
            </td>
          </tr>
          <tr>
            <td className="gameover-table">
              <Button handleClick={showLeaderBoard} text="Show leaderboard" className="gameover-buttons" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default App
