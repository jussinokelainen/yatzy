import { useState } from "react";
import { makePOSTrequest, makeGETrequest } from "./requests";
import { getUserKey } from "./userkeys";

let total = 0
let subTotal = 0
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

async function getScores() {
    const response = await makeGETrequest(`getScoresByID/${getUserKey()}`)
    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }
    const data = await response.json();
    return data
}

function SelectButton({ position, reset }) {
    const [clicked, setClicked] = useState(false)
    const [text, setText] = useState('select')
    async function handleClick() {
        const id = getUserKey()
        makePOSTrequest(`selectItem/${position}`, { id: id })
        const data = await getScores(id)
        setText(data.scores[indexTextToInt.get(position)])
        total = data.total
        subTotal = data.subTotal
        reset()
        setClicked(true)
    }

    if (clicked) { return (<p className="select-container">{text}</p>) }
    else {
        return (<button className="select-container" onClick={handleClick}>{text}</button>)
    }
}

export function Scoreboard(props) {
    return (
        <table className="scoreboard-container">
            <tbody className="scoreboard1-container">
                <tr>
                    <td>{<div className='dices1'></div>}</td>
                    <td><SelectButton position={"one"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices2'></div>}</td>
                    <td><SelectButton position={"two"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices3'></div>}</td>
                    <td><SelectButton position={"three"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices4'></div>}</td>
                    <td><SelectButton position={"four"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices5'></div>}</td>
                    <td><SelectButton position={"five"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='dices6'></div>}</td>
                    <td><SelectButton position={"six"} reset={props.reset} /></td>
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
                    <td><SelectButton position={"pair"} reset={props.reset} text={"select"} /></td>
                </tr>
                <tr>
                    <td>{<div className='doublepair'></div>}</td>
                    <td><SelectButton position={"doublepair"} reset={props.reset} text={"select"} /></td>
                </tr>
                <tr>
                    <td>{<div className='triples'></div>}</td>
                    <td><SelectButton position={"triples"} reset={props.reset} text={"select"} /></td>
                </tr>
                <tr>
                    <td>{<div className='quadruples'></div>}</td>
                    <td><SelectButton position={"quadruples"} reset={props.reset} text={"select"} /></td>
                </tr>
                <tr>
                    <td>{<div className='smallstraight'></div>}</td>
                    <td><SelectButton position={"smallstraight"} reset={props.reset} text={"select"} /></td>
                </tr>
                <tr>
                    <td>{<div className='bigstraight'></div>}</td>
                    <td><SelectButton position={"bigstraight"} reset={props.reset} text={"select"} /></td>
                </tr>
                <tr>
                    <td>{<div className='fullhouse'></div>}</td>
                    <td><SelectButton position={"fullhouse"} reset={props.reset} text={"select"} /></td>
                </tr>
                <tr>
                    <td>{<div className='sattuma'></div>}</td>
                    <td><SelectButton position={"mixed"} reset={props.reset} text={"select"} /></td>
                </tr>
                <tr>
                    <td>{<div className='jatsi'></div>}</td>
                    <td><SelectButton position={"quintuples"} reset={props.reset} text={"select"} /></td>
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
