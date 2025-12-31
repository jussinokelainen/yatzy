import { useState } from "react";
import { updateTotal, perItemArray, perItemIndex } from "../../totals";

const Sum = (props) => {
  const values = props.values
  const valueCounts = {};

  for (let i = 0; i < values.length; i++) {
    if (valueCounts[values[i]]) {
      valueCounts[values[i]]++;
    } else {
      valueCounts[values[i]] = 1;
    }
  }

  let tripleValue = null;
  let pairValue = null;
  for (const value in valueCounts) {
    if (valueCounts[value] === 3) {
      tripleValue = parseInt(value);
    } else if (valueCounts[value] === 2) {
      pairValue = parseInt(value);
    }
  }

  if (tripleValue !== null && pairValue !== null) {
    const tripleSum = tripleValue * 3;
    const pairSum = pairValue * 2;
    const fullHouseSum = tripleSum + pairSum;
    return fullHouseSum;
  }

  return 0;
}

const Fullhousebutton1 = (props) => {
  const [buttonText, setButtonText] = useState(props.text);
  const [isClicked, setIsClicked] = useState(false);
  const values = props.values

  const handleClick = () => {
    const sum = Sum({ values });
    perItemArray[perItemIndex.fullhouse] = sum
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

export default Fullhousebutton1
