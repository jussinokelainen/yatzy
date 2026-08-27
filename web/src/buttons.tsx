type ButtonProps = {
  handleClick: any;
  text: string;
  className: string;
}

export const Button = ({ handleClick, text, className }: ButtonProps) => (
  <button className={className} onClick={handleClick}>
    {text}
  </button>
)

type Button2Props = {
  handleClick: any;
  text: any;
}

export const Button2 = ({ handleClick, text }: Button2Props) => (
  <button className='button2-container' onClick={handleClick}>
    {text}
  </button>
)
