import { VersionGraph } from '@start9labs/start-sdk'
import { v_29_0_0_6 } from './v29.0.0.6'
import { v_29_0_0_5 } from './v29.0.0.5'
import { v_29_0_0_4 } from './v29.0.0.4'
import { v_29_0_0_3 } from './v29.0.0.3'
import { v_29_0_0_2 } from './v29.0.0.2'
import { v_29_0_0_1 } from './v29.0.0.1'
import { v_29_0_0_0 } from './v29.0.0.0'
import { v_28_0_2_1 } from './v28.0.2.1'
import { v_28_0_2_0 } from './v28.0.2.0'

export const versionGraph = VersionGraph.of({
  current: v_29_0_0_6,
  other: [v_29_0_0_5, v_29_0_0_4, v_29_0_0_3, v_29_0_0_2, v_29_0_0_1, v_29_0_0_0, v_28_0_2_1, v_28_0_2_0],
})
