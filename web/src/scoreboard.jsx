import { total, subTotal } from "./totals";
import { makePOSTrequest } from "./requests";
import { getUserKey } from "./userkeys";

function SelectButton({ position, reset }) {
    const handleClick = () => {
        makePOSTrequest(`selectItem/${position}`, { id: getUserKey() })
        reset()
    }
    return (
        <button
            className="select-container"
            onClick={handleClick}
        >
            select
        </button>
    );
}

function Bonus() {
    if (subTotal < 63) {
        return 0
    } else return 50
}

export function Total() {
    if (subTotal < 63) {
        return subTotal + total
    } else return (
        subTotal + 50 + total
    )
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
                    <td>Bonus: <Bonus /></td>
                    <td>Total: {subTotal}</td>
                </tr>
            </tbody>
            <tbody className="scoreboard3-container">
                <tr>
                    <td>{<div className='pair'></div>}</td>
                    <td><SelectButton position={"pair"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='doublepair'></div>}</td>
                    <td><SelectButton position={"doublepair"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='triples'></div>}</td>
                    <td><SelectButton position={"triples"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='quadruples'></div>}</td>
                    <td><SelectButton position={"quadruples"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='smallstraight'></div>}</td>
                    <td><SelectButton position={"smallstraight"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='bigstraight'></div>}</td>
                    <td><SelectButton position={"bigstraight"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='fullhouse'></div>}</td>
                    <td><SelectButton position={"fullhouse"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='sattuma'></div>}</td>
                    <td><SelectButton position={"mixed"} reset={props.reset} /></td>
                </tr>
                <tr>
                    <td>{<div className='jatsi'></div>}</td>
                    <td><SelectButton position={"quintuples"} reset={props.reset} /></td>
                </tr>
            </tbody>
            <tbody className="scoreboard4-container">
                <tr>
                    <td>{props.name}</td>
                    <td><Total /></td>
                </tr>
            </tbody>
        </table>
    )
}
