import { useState } from "react";
import { updateTotal, perItemIndex } from "../../totals";
import { getUserKey } from '../../userkeys'
import { makePOSTrequest } from "../../App";

const Sum = (props) => {
  const values = props.values
  const counts = {};

  for (let i = 0; i < values.length; i++) {
    if (counts[values[i]]) {
      counts[values[i]]++;
    } else {
      counts[values[i]] = 1;
    }
  }

  let quadruplesValue = 0;
  for (const value in counts) {
    if (counts[value] >= 4) {
      quadruplesValue = Number(value);
      return quadruplesValue * 4;
    }
  }

  return 0;
};

const Quadruplesbutton = (props) => {
  const [buttonText, setButtonText] = useState(props.text);
  const [isClicked, setIsClicked] = useState(false);
  const values = props.values

  const handleClick = () => {
    const sum = Sum({ values });
    makePOSTrequest('updatescores', {
      id: getUserKey(),
      target: perItemIndex.quadruples,
      value: sum
    })
    setButtonText(`${sum}`);
    setIsClicked(true);
    updateTotal(sum);
    props.reset()
  };

  return (
    <button className="select-container" onClick={handleClick} disabled={isClicked}>
      {buttonText}
    </button>
  );
};
export default Quadruplesbutton
