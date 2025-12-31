import { useState } from "react";
import { updateSubTotal, perItemArray } from "../totals";

function Numberbuttons(props) {
  const [buttonText, setButtonText] = useState(props.text);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    const values = props.values

    const targetNumber = props.target;
    const count = values.filter(value => value === targetNumber).length;
    const sum = props.target * count;

    perItemArray[targetNumber - 1] = sum
    setButtonText(`${sum}`);
    setIsClicked(true);
    updateSubTotal(sum);
    props.reset()
  }

  return (
    <button
      className="select-container"
      onClick={handleClick}
      disabled={isClicked}
    >
      {buttonText}
    </button>
  );
}

export default Numberbuttons
