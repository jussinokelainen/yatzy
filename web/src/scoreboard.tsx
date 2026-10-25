import { useState } from "react";
import { makePOSTrequest, makeGETrequest } from "./requests";
import { preClicked, rollCount_global, DICE_ROLLING } from "./App";

// Map to index all items by their name and number index correctly
const indexTextToInt = new Map([
    ["one", 0],
    ["two", 1],
    ["three", 2],
    ["four", 3],
    ["five", 4],
    ["six", 5],
    ["pair", 6],
    ["doublepair", 7],
    ["triples", 8],
    ["quadruples", 9],
    ["smallstraight", 10],
    ["bigstraight", 11],
    ["fullhouse", 12],
    ["mixed", 13],
    ["quintuples", 14],
]);

// Function to get the score of current client id
export async function getScores() {
    const response = await makeGETrequest(`getScoresByID`)
    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }
    const data = await response.json();
    return data
}

type SelectButtonProps = {
    position: any;
    reset: Function;
    idx: number;
    setTotal: Function,
    setSubTotal: Function,
}
// React component used for the button/number of all items in the scoreboard
function SelectButton({ position, reset, idx, setTotal, setSubTotal }: SelectButtonProps) {
    const [clicked, setClicked] = useState(false)
    const [text, setText] = useState('select')
    async function setAsClicked() {
        const data = await getScores()
        const data_index = indexTextToInt.get(position)
        if (data_index !== undefined) {
            setText(data.scores[data_index])
        }
        setTotal(data.total)
        setSubTotal(data.subTotal)
        setClicked(true)
    }
    async function handleClick() {
        if (rollCount_global != 0 && !DICE_ROLLING) {
            await makePOSTrequest(`selectItem/${position}`)
            await setAsClicked()
            reset()
        }
    }
    // Check if the current item was already clicked in data that
    // was loaded when loading previous game progress
    if (preClicked[idx]) {
        setAsClicked()
        preClicked[idx] = false
    }

    // Return a clickable button or plain text indicating the
    // value of current item if the button has been clicked
    if (clicked) { return (<p className="select-container">{text}</p>) }
    else {
        return (<button className="select-container" onClick={handleClick}>{text}</button>)
    }
}

type ScoreboardProps = {
    reset: any,
    name: string,
    total: number,
    subtotal: number
    setTotal: Function
    setSubTotal: Function
}

// Main scoreboard React component
export function Scoreboard({ reset, name, total, subtotal, setTotal, setSubTotal }: ScoreboardProps) {
    return (
        <table className="scoreboard-container">
            <tbody className="scoreboard1-container">
                <tr>
                    <td>{<div className='dices1'></div>}</td>
                    <td><SelectButton position={"one"} reset={reset} idx={0} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices2'></div>}</td>
                    <td><SelectButton position={"two"} reset={reset} idx={1} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices3'></div>}</td>
                    <td><SelectButton position={"three"} reset={reset} idx={2} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices4'></div>}</td>
                    <td><SelectButton position={"four"} reset={reset} idx={3} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices5'></div>}</td>
                    <td><SelectButton position={"five"} reset={reset} idx={4} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices6'></div>}</td>
                    <td><SelectButton position={"six"} reset={reset} idx={5} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
            </tbody>
            <tbody className="scoreboard2-container">
                <tr>
                    <td>Bonus: {subtotal < 63 ? 0 : 50}</td>
                    <td>Total: {subtotal}</td>
                </tr>
            </tbody>
            <tbody className="scoreboard3-container">
                <tr>
                    <td>{<div className='pair'></div>}</td>
                    <td><SelectButton position={"pair"} reset={reset} idx={6} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='doublepair'></div>}</td>
                    <td><SelectButton position={"doublepair"} reset={reset} idx={7} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='triples'></div>}</td>
                    <td><SelectButton position={"triples"} reset={reset} idx={8} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='quadruples'></div>}</td>
                    <td><SelectButton position={"quadruples"} reset={reset} idx={9} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='smallstraight'></div>}</td>
                    <td><SelectButton position={"smallstraight"} reset={reset} idx={10} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='bigstraight'></div>}</td>
                    <td><SelectButton position={"bigstraight"} reset={reset} idx={11} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='fullhouse'></div>}</td>
                    <td><SelectButton position={"fullhouse"} reset={reset} idx={12} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='sattuma'></div>}</td>
                    <td><SelectButton position={"mixed"} reset={reset} idx={13} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
                <tr>
                    <td>{<div className='jatsi'></div>}</td>
                    <td><SelectButton position={"quintuples"} reset={reset} idx={14} setTotal={setTotal} setSubTotal={setSubTotal} /></td>
                </tr>
            </tbody>
            <tbody className="scoreboard4-container">
                <tr>
                    <td>{name}</td>
                    <td>{total}</td>
                </tr>
            </tbody>
        </table>
    )
}
