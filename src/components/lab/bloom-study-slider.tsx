import { RoughSlider } from "./rough-slider"

export function BloomStudySlider(props: Parameters<typeof RoughSlider>[0]) {
  return (
    <div className="bloom-study-slider-row" data-disabled={props.disabled || undefined}
      onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })}>
      <span className="bloom-study-slider-label">{props.label}</span>
      <RoughSlider {...props} bare showValue={false} />
    </div>
  )
}
