import { useState } from "react";
import { updateTotal, perItemArray, perItemIndex } from "../../totals";

const Sum = (props) => {
  const values = props.values
  const sortedValues = values.slice().sort();
  const smallStraight = [1, 2, 3, 4, 5];

  if (JSON.stringify(sortedValues) === JSON.stringify(smallStraight)) {
    return 15
  } else return 0
}

const Smallstraightbutton1 = (props) => {
  const [buttonText, setButtonText] = useState(props.text);
  const [isClicked, setIsClicked] = useState(false);
  const values = props.values

  const handleClick = () => {
    const sum = Sum({ values });
    perItemArray[perItemIndex.smallstraight] = sum
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

export default Smallstraightbutton1
