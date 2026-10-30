import { makePOSTrequest, makeGETrequest } from "./requests";
import { rollCount_global, DICE_ROLLING, MAXROUND } from "./App";
import { useNavigate } from "react-router-dom";

// Function to get the score of current client id
export async function getScores() {
    const response = await makeGETrequest(`gameapi/getgamestats`);
    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }
    const data = await response.json();
    return data;
}

type FunctionProps = {
    reset: Function;
    setTotal: Function;
    setSubTotal: Function;
    markSelected: Function;
};

type SelectButtonProps = {
    position: any;
    idx: number;
    score: number;
    clicked: boolean;
    functions: FunctionProps;
};

// React component used for the button/number of all items in the scoreboard.
// What the cell shows comes from the score and clicked props
function SelectButton({
    position,
    idx,
    score,
    clicked,
    functions,
}: SelectButtonProps) {
    const navigate = useNavigate();
    async function handleClick() {
        if (rollCount_global != 0 && !DICE_ROLLING) {
            const response = await makePOSTrequest(
                `gameapi/selectitem/${position}`,
            );
            if (!response.ok) {
                // The server did not accept the selection, so the
                // board is left as it is instead of showing a score
                // the game does not have
                console.error(
                    `Error selecting ${position}: ${response.status}`,
                );
                return;
            }
            // The answer of the selection already carries the score of
            // this cell and the totals, so nothing is read back
            const data = await response.json();
            functions.markSelected(idx, data.score);
            functions.setTotal(data.total);
            functions.setSubTotal(data.subtotal);
            functions.reset();
            if (data.roundnumber >= MAXROUND) {
                // The end screen reads the final score itself
                navigate("/end");
            }
        }
    }

    // Return a clickable button or plain text indicating the
    // value of current item if the button has been clicked
    if (clicked) {
        return <p className="select-container">{score}</p>;
    } else {
        return (
            <button className="select-container" onClick={handleClick}>
                select
            </button>
        );
    }
}

type ScoreboardProps = {
    name: string;
    total: number;
    subtotal: number;
    scores: number[];
    clicked: boolean[];
    functions: FunctionProps;
};

// Main scoreboard React component
export function Scoreboard({
    name,
    total,
    subtotal,
    scores,
    clicked,
    functions,
}: ScoreboardProps) {
    return (
        <table className="scoreboard-container">
            <tbody className="scoreboard1-container">
                <tr>
                    <td>{<div className="dices1"></div>}</td>
                    <td>
                        <SelectButton
                            position={"one"}
                            idx={0}
                            score={scores[0]}
                            clicked={clicked[0]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="dices2"></div>}</td>
                    <td>
                        <SelectButton
                            position={"two"}
                            idx={1}
                            score={scores[1]}
                            clicked={clicked[1]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="dices3"></div>}</td>
                    <td>
                        <SelectButton
                            position={"three"}
                            idx={2}
                            score={scores[2]}
                            clicked={clicked[2]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="dices4"></div>}</td>
                    <td>
                        <SelectButton
                            position={"four"}
                            idx={3}
                            score={scores[3]}
                            clicked={clicked[3]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="dices5"></div>}</td>
                    <td>
                        <SelectButton
                            position={"five"}
                            idx={4}
                            score={scores[4]}
                            clicked={clicked[4]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="dices6"></div>}</td>
                    <td>
                        <SelectButton
                            position={"six"}
                            idx={5}
                            score={scores[5]}
                            clicked={clicked[5]}
                            functions={functions}
                        />
                    </td>
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
                    <td>{<div className="pair"></div>}</td>
                    <td>
                        <SelectButton
                            position={"pair"}
                            idx={6}
                            score={scores[6]}
                            clicked={clicked[6]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="doublepair"></div>}</td>
                    <td>
                        <SelectButton
                            position={"doublepair"}
                            idx={7}
                            score={scores[7]}
                            clicked={clicked[7]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="triples"></div>}</td>
                    <td>
                        <SelectButton
                            position={"triples"}
                            idx={8}
                            score={scores[8]}
                            clicked={clicked[8]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="quadruples"></div>}</td>
                    <td>
                        <SelectButton
                            position={"quadruples"}
                            idx={9}
                            score={scores[9]}
                            clicked={clicked[9]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="smallstraight"></div>}</td>
                    <td>
                        <SelectButton
                            position={"smallstraight"}
                            idx={10}
                            score={scores[10]}
                            clicked={clicked[10]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="bigstraight"></div>}</td>
                    <td>
                        <SelectButton
                            position={"bigstraight"}
                            idx={11}
                            score={scores[11]}
                            clicked={clicked[11]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="fullhouse"></div>}</td>
                    <td>
                        <SelectButton
                            position={"fullhouse"}
                            idx={12}
                            score={scores[12]}
                            clicked={clicked[12]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="sattuma"></div>}</td>
                    <td>
                        <SelectButton
                            position={"mixed"}
                            idx={13}
                            score={scores[13]}
                            clicked={clicked[13]}
                            functions={functions}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{<div className="jatsi"></div>}</td>
                    <td>
                        <SelectButton
                            position={"quintuples"}
                            idx={14}
                            score={scores[14]}
                            clicked={clicked[14]}
                            functions={functions}
                        />
                    </td>
                </tr>
            </tbody>
            <tbody className="scoreboard4-container">
                <tr>
                    <td>{name}</td>
                    <td>{total}</td>
                </tr>
            </tbody>
        </table>
    );
}
