import { useState } from "react";
import { makePOSTrequest, makeGETrequest } from "./requests";
import { getUserKey } from "./userkeys";
import { preClicked, rollCount_global } from "./App";

let total = 0
let subTotal = 0
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
    const response = await makeGETrequest(`getScoresByID/${getUserKey()}`)
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
}
// React component used for the button/number of all items in the scoreboard
function SelectButton({ position, reset, idx }: SelectButtonProps) {
    const [clicked, setClicked] = useState(false)
    const [text, setText] = useState('select')
    async function setAsClicked() {
        const data = await getScores()
        const data_index = indexTextToInt.get(position)
        if (data_index !== undefined) {
            setText(data.scores[data_index])
        }
        total = data.total
        subTotal = data.subTotal
        setClicked(true)
    }
    async function handleClick() {
        if (rollCount_global != 0) {
            const id = getUserKey()
            await makePOSTrequest(`selectItem/${position}`, { id: id })
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

// Main scoreboard React component
export function Scoreboard(props: any) {
    return (
        <table className="scoreboard-container">
            <tbody className="scoreboard1-container">
                <tr>
                    <td>{<div className='dices1'></div>}</td>
                    <td><SelectButton position={"one"} reset={props.reset} idx={0} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices2'></div>}</td>
                    <td><SelectButton position={"two"} reset={props.reset} idx={1} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices3'></div>}</td>
                    <td><SelectButton position={"three"} reset={props.reset} idx={2} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices4'></div>}</td>
                    <td><SelectButton position={"four"} reset={props.reset} idx={3} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices5'></div>}</td>
                    <td><SelectButton position={"five"} reset={props.reset} idx={4} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices6'></div>}</td>
                    <td><SelectButton position={"six"} reset={props.reset} idx={5} /></td>
                </tr>
            </tbody>
            <tbody className="scoreboard2-container">
                <tr>
                    <td>Bonus: {subTotal < 63 ? 0 : 50}</td>
                    <td>Total: {subTotal}</td>
                </tr>
            </tbody>
            <tbody className="scoreboard3-container">
                <tr>
                    <td>{<div className='pair'></div>}</td>
                    <td><SelectButton position={"pair"} reset={props.reset} idx={6} /></td>
                </tr>
                <tr>
                    <td>{<div className='doublepair'></div>}</td>
                    <td><SelectButton position={"doublepair"} reset={props.reset} idx={7} /></td>
                </tr>
                <tr>
                    <td>{<div className='triples'></div>}</td>
                    <td><SelectButton position={"triples"} reset={props.reset} idx={8} /></td>
                </tr>
                <tr>
                    <td>{<div className='quadruples'></div>}</td>
                    <td><SelectButton position={"quadruples"} reset={props.reset} idx={9} /></td>
                </tr>
                <tr>
                    <td>{<div className='smallstraight'></div>}</td>
                    <td><SelectButton position={"smallstraight"} reset={props.reset} idx={10} /></td>
                </tr>
                <tr>
                    <td>{<div className='bigstraight'></div>}</td>
                    <td><SelectButton position={"bigstraight"} reset={props.reset} idx={11} /></td>
                </tr>
                <tr>
                    <td>{<div className='fullhouse'></div>}</td>
                    <td><SelectButton position={"fullhouse"} reset={props.reset} idx={12} /></td>
                </tr>
                <tr>
                    <td>{<div className='sattuma'></div>}</td>
                    <td><SelectButton position={"mixed"} reset={props.reset} idx={13} /></td>
                </tr>
                <tr>
                    <td>{<div className='jatsi'></div>}</td>
                    <td><SelectButton position={"quintuples"} reset={props.reset} idx={14} /></td>
                </tr>
            </tbody>
            <tbody className="scoreboard4-container">
                <tr>
                    <td>{props.name}</td>
                    <td>{total}</td>
                </tr>
            </tbody>
        </table>
    )
}
