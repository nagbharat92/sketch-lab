import { RoughSlider } from "./rough-slider"

export function BloomStudySlider(props: Parameters<typeof RoughSlider>[0]) {
  return (
    <div className="bloom-study-slider-row" data-disabled={props.disabled || undefined}>
      <span className="bloom-study-slider-label">{props.label}</span>
      <RoughSlider {...props} bare showValue={false} />
    </div>
  )
}
