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

type FunctionProps = {
    reset: Function;
    setTotal: Function,
    setSubTotal: Function,
}

type SelectButtonProps = {
    position: any;
    idx: number;
    functions: FunctionProps
}
// React component used for the button/number of all items in the scoreboard
function SelectButton({ position, idx, functions }: SelectButtonProps) {
    const [clicked, setClicked] = useState(false)
    const [text, setText] = useState('select')
    async function setAsClicked() {
        const data = await getScores()
        const data_index = indexTextToInt.get(position)
        if (data_index !== undefined) {
            setText(data.scores[data_index])
        }
        functions.setTotal(data.total)
        functions.setSubTotal(data.subTotal)
        setClicked(true)
    }
    async function handleClick() {
        if (rollCount_global != 0 && !DICE_ROLLING) {
            await makePOSTrequest(`selectItem/${position}`)
            await setAsClicked()
            functions.reset()
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
    name: string,
    total: number,
    subtotal: number
    functions: FunctionProps
}

// Main scoreboard React component
export function Scoreboard({ name, total, subtotal, functions }: ScoreboardProps) {
    return (
        <table className="scoreboard-container">
            <tbody className="scoreboard1-container">
                <tr>
                    <td>{<div className='dices1'></div>}</td>
                    <td><SelectButton position={"one"} idx={0} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices2'></div>}</td>
                    <td><SelectButton position={"two"} idx={1} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices3'></div>}</td>
                    <td><SelectButton position={"three"} idx={2} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices4'></div>}</td>
                    <td><SelectButton position={"four"} idx={3} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices5'></div>}</td>
                    <td><SelectButton position={"five"} idx={4} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices6'></div>}</td>
                    <td><SelectButton position={"six"} idx={5} functions={functions} /></td>
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
                    <td><SelectButton position={"pair"} idx={6} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='doublepair'></div>}</td>
                    <td><SelectButton position={"doublepair"} idx={7} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='triples'></div>}</td>
                    <td><SelectButton position={"triples"} idx={8} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='quadruples'></div>}</td>
                    <td><SelectButton position={"quadruples"} idx={9} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='smallstraight'></div>}</td>
                    <td><SelectButton position={"smallstraight"} idx={10} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='bigstraight'></div>}</td>
                    <td><SelectButton position={"bigstraight"} idx={11} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='fullhouse'></div>}</td>
                    <td><SelectButton position={"fullhouse"} idx={12} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='sattuma'></div>}</td>
                    <td><SelectButton position={"mixed"} idx={13} functions={functions} /></td>
                </tr>
                <tr>
                    <td>{<div className='jatsi'></div>}</td>
                    <td><SelectButton position={"quintuples"} idx={14} functions={functions} /></td>
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
