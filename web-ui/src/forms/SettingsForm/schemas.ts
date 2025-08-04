import {
  enum as vEnum,
  integer as vInteger,
  minValue as vMinValue,
  nonOptional as vNonOptional,
  number as vNumber,
  object as vObject,
  optional as vOptional,
  pipe as vPipe,
  string as vString,
} from 'valibot'

export const SettingsFormSchema = vObject({
  wifi: vObject({
    interface: vEnum({ C: 'C', AP: 'AP' }),
    ssid: vNonOptional(vString()),
    key: vOptional(vString()),
  }),
  waterTank: vObject({
    height: vNonOptional(vPipe(vNumber(), vInteger(), vMinValue(1))),
    minDistance: vNonOptional(vPipe(vNumber(), vInteger(), vMinValue(0))),
  }),
})
