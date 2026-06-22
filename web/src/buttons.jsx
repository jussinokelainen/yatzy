export const Button = ({ handleClick, text, className }) => (
  <button className={className} onClick={handleClick}>
    {text}
  </button>
)

export const Button2 = ({ handleClick, text }) => (
  <button className='button2-container' onClick={handleClick}>
    {text}
  </button>
)
