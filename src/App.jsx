import { total, subTotal } from "./totals";
import { saveScore, loadLb } from './dbfetch'
import Button from './buttons/button'
import Button2 from './buttons/button2'
import Scoreboard from './scoreboard'
import { useState } from 'react'
import './App.css'

const values = new Map([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0],]);
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

function refreshValues(nextValues) {
  values.set(1, nextValues.get(1));
  values.set(2, nextValues.get(2));
  values.set(3, nextValues.get(3));
  values.set(4, nextValues.get(4));
  values.set(5, nextValues.get(5));
}

const Total = () => {
  if (subTotal < 63) {
    return subTotal + total
  } else return (
    subTotal + 50 + total
  )
}

function restartGame() {
  window.location.reload()
}

const App = () => {
  const [diceState, setDiceState] = useState(values);
  const [name, setName] = useState('');
  const [nameIsSet, setNameIsSet] = useState(false);
  const [locked, setLocked] = useState([false, false, false, false, false])
  const [roundNum, setRoundNum] = useState(0);
  const [showLb, setShowLb] = useState(false);
  const [lbScores, setLbScores] = useState([]);
  const [rollCount, setRollCount] = useState(0);


  const toggleLock = (index) => {
    setLocked(prevLocked => prevLocked.map((lock, i) => i === index ? !lock : lock));
  };

  const rollAllOnce = () => {
    const nextValues = new Map(values)

    for (let i = 1; i <= 5; i++) {
      if (!locked[i]) {
        const newValue = Math.floor(Math.random() * 6) + 1;
        nextValues.set(i, newValue);
      }
    }
    refreshValues(nextValues)
    setDiceState(nextValues)
  }

  const updateDice = () => {
    setDiceState(values)
    console.log('Dice were updated to')
    console.log(values)
  }

  const rollDice = () => {
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

  const handleReset = () => {
    refreshValues(startValues)
    setLocked([false, false, false, false, false])
    setRollCount(0)
    setRoundNum(roundNum + 1)
  }

  const RollsLeft = () => {
    return 3 - rollCount
  }


  const startGame = () => {
    setNameIsSet(true)
  }

  const showLeaderBoard = () => {
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
                <input onChange={e => setName(e.target.value)} className="nameinput-box" />
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
                <p className="gameover-text">Top 10 scores</p>
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
                    <div className={locked[i] ? 'locked' : null} />
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
