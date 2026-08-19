import SpinnerIcon from '../Icon/Spinner'

// The icon SVG carries no intrinsic size, so the box is set here. Without it
// the spinner inherited the browser's 300x150 default inside a button.
// The colour is inherited on purpose: the same spinner sits on the accent-filled
// save button and on a plain surface.
const Spinner = () => (
  <div class="flex items-center justify-center">
    <SpinnerIcon className="inline size-5 animate-spin" />
  </div>
)

export default Spinner
