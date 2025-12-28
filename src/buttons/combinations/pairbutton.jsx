import { useState } from "react";
import { updateTotal, perItemArray, perItemIndex } from "../../totals";

const Sum = (props) => {
  const values = props.values
  let pairValue1 = 0;
  let pairValue2 = 0;

  for (let i = 0; i < values.length - 1; i++) {
    if (values.slice(i + 1).includes(values[i])) {
      const pairValue = values[i];
      if (pairValue1 === null) {
        pairValue1 = pairValue;
      } else if (pairValue2 === null || pairValue > pairValue2) {
        pairValue2 = pairValue;
      }
    }
  }

  if (pairValue2 > pairValue1) {
    const pairSum = pairValue2 * 2;
    return pairSum;
  } else if (pairValue1 !== 0) {
    const pairSum = pairValue1 * 2;
    return pairSum;
  } else {
    return 0;
  }
};


const Pairbutton = (props) => {
  const [buttonText, setButtonText] = useState(props.text);
  const [isClicked, setIsClicked] = useState(false);
  const values = props.values

  const handleClick = () => {
    const sum = Sum({ values });
    perItemArray[perItemIndex.pair] = sum
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

export default Pairbutton
