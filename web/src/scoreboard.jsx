import { total, subTotal } from "./totals";
import Pairbutton from "./buttons/combinations/pairbutton";
import Doublepairbutton from "./buttons/combinations/doublepairbutton";
import Triplesbutton from "./buttons/combinations/triplesbutton";
import Quadruplesbutton from "./buttons/combinations/quadruplesbutton";
import Smallstraightbutton from "./buttons/combinations/smallstraightbutton";
import Bigstraightbutton from "./buttons/combinations/bigstraightbutton";
import Fullhousebutton from "./buttons/combinations/fullhousebutton";
import Quintuplesbutton from "./buttons/combinations/quintuplebutton";
import Sattumabutton from "./buttons/combinations/sattumabutton";
import Numberbuttons from "./buttons/numberbuttons";


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
                    <td><Numberbuttons
                        target={1}
                        values={props.values}
                        reset={props.reset}
                        text='select' />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='dices2'></div>}</td>
                    <td><Numberbuttons
                        target={2}
                        values={props.values}
                        reset={props.reset}
                        text='select' />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='dices3'></div>}</td>
                    <td><Numberbuttons
                        target={3}
                        values={props.values}
                        reset={props.reset}
                        text='select' />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='dices4'></div>}</td>
                    <td><Numberbuttons
                        target={4}
                        values={props.values}
                        reset={props.reset}
                        text='select' />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='dices5'></div>}</td>
                    <td><Numberbuttons
                        target={5}
                        values={props.values}
                        reset={props.reset}
                        text='select' />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='dices6'></div>}</td>
                    <td><Numberbuttons
                        target={6}
                        values={props.values}
                        reset={props.reset}
                        text='select' />
                    </td>
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
                    <td><Pairbutton
                        text='select'
                        values={props.values}
                        reset={props.reset} />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='doublepair'></div>}</td>
                    <td><Doublepairbutton
                        text='select'
                        values={props.values}
                        reset={props.reset} />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='triples'></div>}</td>
                    <td><Triplesbutton
                        text='select'
                        values={props.values}
                        reset={props.reset} />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='quadruples'></div>}</td>
                    <td><Quadruplesbutton
                        text='select'
                        values={props.values}
                        reset={props.reset} />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='smallstraight'></div>}</td>
                    <td><Smallstraightbutton
                        text='select'
                        values={props.values}
                        reset={props.reset} />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='bigstraight'></div>}</td>
                    <td><Bigstraightbutton
                        text='select'
                        values={props.values}
                        reset={props.reset} />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='fullhouse'></div>}</td>
                    <td><Fullhousebutton
                        text='select'
                        values={props.values}
                        reset={props.reset} />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='sattuma'></div>}</td>
                    <td><Sattumabutton
                        text='select'
                        values={props.values}
                        reset={props.reset} />
                    </td>
                </tr>
                <tr>
                    <td>{<div className='jatsi'></div>}</td>
                    <td><Quintuplesbutton
                        text='select'
                        values={props.values}
                        reset={props.reset} />
                    </td>
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
