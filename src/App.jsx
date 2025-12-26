import { total, subTotal } from "./totals";
import Button from './buttons/button'
import Button2 from './buttons/button2'
import Scoreboard from './scoreboard'
import { useState } from 'react'
import './App.css'
const DBPORT = 3000; // Node server port

const diceImages = new Map([
  [0, 'dice0'],
  [1, 'dice1'],
  [2, 'dice2'],
  [3, 'dice3'],
  [4, 'dice4'],
  [5, 'dice5'],
  [6, 'dice6'],
]);

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

function saveScore(name) {
  console.log('Saving scores')
  const apiUrl = `${window.location.protocol}//${window.location.hostname}:${DBPORT}/api/save-score`;
  const totalNum = Number(Total());
  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, score: totalNum }),
  });
}

const App = () => {
  const [nameIsSet, setNameIsSet] = useState(false);
  const [name, setName] = useState('');
  const [values, setValues] = useState([0, 0, 0, 0, 0]);
  const [locked, setLocked] = useState([false, false, false, false, false])
  const [roundNum, setRoundNum] = useState(0);
  const [showLb, setShowLb] = useState(false);
  const [lbScores, setLbScores] = useState([]);
  const [rollCount, setRollCount] = useState(0);

  async function loadLb() {
    console.log('Fetching leaderboard')
    const apiUrl = `${window.location.protocol}//${window.location.hostname}:${DBPORT}/api/load-scores`;

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
        setLbScores(data.result);
      } else {
        console.error('Failed to load scores:', data.error);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  }

  const handleLock = (index) => {
    setLocked(prevLocked => prevLocked.map((lock, i) => i === index ? !lock : lock));
  };

  const handleFullRoll = () => {

    const newValues = [...values];
    let rolled = false;

    do {
      rolled = false;
      for (let i = 0; i < newValues.length; i++) {
        if (!locked[i]) {
          const newValue = Math.floor(Math.random() * 6) + 1;
          if (newValue !== newValues[i]) {
            newValues[i] = newValue;
            rolled = true;
          }
        }
      }
    } while (rolled);

    setValues(newValues);
  }

  const handleRolling = () => {

    if (rollCount >= 3) {
      return;
    }

    const handleDelay = () => {
      handleFullRoll()
      setTimeout(handleFullRoll, 200)
      setTimeout(handleFullRoll, 400)
      setTimeout(handleFullRoll, 600)
      setTimeout(handleFullRoll, 800)
      setTimeout(handleFullRoll, 1000)
    };

    handleDelay();
    setRollCount(prevCount => prevCount + 1);
  };

  const handleReset = () => {
    setValues([0, 0, 0, 0, 0])
    setLocked([false, false, false, false, false])
    setRollCount(0)
    setRoundNum(roundNum + 1)
  }

  const RollsLeft = () => {
    const rolls = 3 - rollCount
    if (rollCount === 0) {
      return (
        <p>Roll the dice</p>
      )
    }
    if (rolls === 0) {
      return (
        <p>No more rolls left!</p>
      )
    }
    return (
      <p>Roll the dice ({rolls} rolls left)</p>
    )
  }


  const startGame = () => {
    setNameIsSet(true)
  }

  const showLeaderBoard = () => {
    loadLb()
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
        <Button handleClick={handleRolling} text={<RollsLeft />} className="rollbtn-container" />

        {values.map((value, i) => (
          <div className='dice-container' key={i}>
            {<Button2 handleClick={() => handleLock(i)} text={<div className={diceImages.get(value)}></div>} />}
            <div className={locked[i] ? 'locked' : null} />
          </div>
        ))}

        <Scoreboard
          values={[values[0], values[1], values[2], values[3], values[4]]}
          reset={handleReset}
          name={name}
        />

        <Button handleClick={restartGame} text='Restart game' className="restart-container" />
      </div>
    );
  }

  // End of game screen
  saveScore(name)
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
