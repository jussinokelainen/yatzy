import { useState } from "react";
import { updateTotal, perItemArray, perItemIndex } from "../../totals";

const Sum = (props) => {
  const values = props.values
  const valueCounts = {};
  let pairValues = [];

  for (const value of values) {
    if (valueCounts[value]) {
      valueCounts[value]++;
    } else {
      valueCounts[value] = 1;
    }
  }

  let pairCount = 0;
  let pairSum = 0;
  for (const [value, count] of Object.entries(valueCounts)) {
    if (count === 2) {
      pairCount++;
      pairSum += parseInt(value) * 2;
      pairValues.push(parseInt(value));
    } else if (count === 3) {
      pairCount++;
      pairSum += parseInt(value) * 2;
      pairValues.push(parseInt(value));
      pairValues.push(parseInt(value));
    }
  }

  if (pairCount === 2) {
    return pairSum;
  } else {
    return 0;
  }
};


const Doublepairbutton = (props) => {
  const [buttonText, setButtonText] = useState(props.text);
  const [isClicked, setIsClicked] = useState(false);
  const values = props.values

  const handleClick = () => {
    const sum = Sum({ values });
    perItemArray[perItemIndex.doublepair] = sum
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

export default Doublepairbutton 
