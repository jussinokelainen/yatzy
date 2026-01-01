import { useState } from "react";
import { updateTotal, perItemIndex } from "../../totals";
import { getUserKey } from '../../userkeys'
import { makePOSTrequest } from "../../App";

const Sum = (props) => {
  const dicesum = props.values[0] + props.values[1] + props.values[2] + props.values[3] + props.values[4]

  return (
    dicesum
  )
}

const Sattumabutton1 = (props) => {
  const [buttonText, setButtonText] = useState(props.text);
  const [isClicked, setIsClicked] = useState(false);
  const values = props.values

  const handleClick = () => {
    const sum = Sum({ values });
    makePOSTrequest('updatescores', {
      id: getUserKey(),
      target: perItemIndex.mixed,
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

export default Sattumabutton1
