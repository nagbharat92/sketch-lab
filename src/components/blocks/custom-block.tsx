import type { CustomBlock } from "@/data/pages"
import { LabHome } from "@/components/blocks/custom/lab-home"
import { FolderLab } from "@/components/blocks/custom/folder-lab"
import { TypeLab } from "@/components/blocks/custom/type-lab"
import { ColorLab } from "@/components/blocks/custom/color-lab"
import { MotionLab } from "@/components/blocks/custom/motion-lab"
import { FlowerLab } from "@/components/blocks/custom/flower-lab"
import { ControlsLab } from "@/components/blocks/custom/controls-lab"
import { TextBoilLab } from "@/components/blocks/custom/text-boil-lab"
import { SeattleLab } from "@/components/blocks/custom/seattle-lab"

type CustomBlockComponent = React.ComponentType<{
  index: number
  props?: Record<string, unknown>
}>

/**
 * REGISTRY — maps componentId strings to React components.
 *
 * To add a new custom block:
 *   1. Create the component in src/components/blocks/custom/
 *   2. Import it here
 *   3. Add one entry to REGISTRY
 */
const REGISTRY: Record<string, CustomBlockComponent> = {
  'lab-home':    LabHome,
  'folder-lab':  FolderLab,
  'type-lab':    TypeLab,
  'color-lab':   ColorLab,
  'motion-lab':  MotionLab,
  'flower-lab':  FlowerLab,
  'controls-lab': ControlsLab,
  'text-boil':    TextBoilLab,
  'seattle-lab':  SeattleLab,
}

export function CustomBlockRenderer({
  block,
  index,
}: {
  block: CustomBlock
  index: number
}) {
  const Component = REGISTRY[block.componentId]

  if (!Component) {
    if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV) {
      console.warn(
        `[CustomBlock] No component registered for componentId: "${block.componentId}"`
      )
    }
    return null
  }

  return <Component index={index} props={block.props} />
}
