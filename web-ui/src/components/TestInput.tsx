import { asFormControl } from '@shelacek/formica'

const TestInput = asFormControl(({ children, ...attrs }) => (
  <label>
    {children}
    <input {...attrs} />
  </label>
))

export default TestInput
