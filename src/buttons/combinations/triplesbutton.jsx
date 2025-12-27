import { useState } from "react";
import { updateTotal } from "../../totals";

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

  let triplesValue = 0;
  for (const value in counts) {
    if (counts[value] >= 3) {
      triplesValue = Number(value);
      return triplesValue * 3;
    }
  }

  return 0;
};

const Triplesbutton = (props) => {
  const [buttonText, setButtonText] = useState(props.text);
  const [isClicked, setIsClicked] = useState(false);
  const values = props.values

  const handleClick = () => {
    const sum = Sum({ values });
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

export default Triplesbutton
