const Button = ({ handleClick, text, className }) => (
  <button className={className} onClick={handleClick}>
    {text}
  </button>
)

export default Button
