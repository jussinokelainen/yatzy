import { useState } from "react";
import { updateTotal } from "../../totals";

const Sum = (props) => {
  const values = props.values
  for (let i = 0; i < values.length - 2; i++) {
    for (let j = i + 1; j < values.length - 1; j++) {
      for (let k = j + 1; k < values.length; k++) {
        if (values[i] === values[j] && values[j] === values[k]) {
          const tripleValue = values[i];
          const tripleSum = tripleValue * 3;
          return tripleSum;
        }
      }
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
