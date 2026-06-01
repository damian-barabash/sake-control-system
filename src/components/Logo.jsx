export function Logo({ size = 28, withText = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src="./logo.png" alt="Sake" style={{ width: size, height: size }} className="select-none" />
      {withText && (
        <span className="font-semibold tracking-tight text-ink">Sake Control</span>
      )}
    </span>
  )
}
