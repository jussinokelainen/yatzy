import { useState } from "react";
import { makePOSTrequest } from "../../App";
import { updateTotal, perItemIndex } from "../../totals";
import { getUserKey } from '../../userkeys'

const Sum = (props) => {
  const values = props.values
  const sortedValues = values.slice().sort();
  const smallStraight = [2, 3, 4, 5, 6];

  if (JSON.stringify(sortedValues) === JSON.stringify(smallStraight)) {
    return 20
  } else return 0
}

const Bigstraightbutton1 = (props) => {
  const [buttonText, setButtonText] = useState(props.text);
  const [isClicked, setIsClicked] = useState(false);
  const values = props.values

  const handleClick = () => {
    const sum = Sum({ values });
    makePOSTrequest('updatescores', {
      id: getUserKey(),
      target: perItemIndex.bigstraight,
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

export default Bigstraightbutton1
