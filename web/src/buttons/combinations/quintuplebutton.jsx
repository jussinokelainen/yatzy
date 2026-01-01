import { useState } from "react";
import { updateTotal, perItemIndex } from "../../totals";
import { getUserKey } from '../../userkeys'
import { makePOSTrequest } from "../../App";

const Sum = (props) => {
  const values = props.values

  if (values[0] && values[1] && values[2] && values[3] && values[4]) {
    if (values[0] === values[1] &&
      values[0] === values[2] &&
      values[0] === values[3] &&
      values[0] === values[4]) {
      return 50
    } else {
      return 0
    }
  } else {
    return 0
  }
}

const Quintuplesbutton1 = (props) => {
  const [buttonText, setButtonText] = useState(props.text);
  const [isClicked, setIsClicked] = useState(false);
  const values = props.values

  const handleClick = () => {
    const sum = Sum({ values });
    makePOSTrequest('updatescores', {
      id: getUserKey(),
      target: perItemIndex.quintuples,
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

export default Quintuplesbutton1
