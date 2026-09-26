export function Brand({ light }: { light?: boolean }) {
  return (
    <div className="brand" style={light ? { color: '#fff' } : undefined}>
      <svg className="brand-mark" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
        <rect width="16" height="16" rx="3" fill={light ? '#6a5fc0' : '#4b3f8f'} />
        <rect x="4" y="4" width="8" height="6" fill="#f7f3ec" />
        <rect x="3" y="5" width="1" height="4" fill="#f7f3ec" />
        <rect x="12" y="5" width="1" height="4" fill="#f7f3ec" />
        <rect x="6" y="6" width="1" height="2" fill="#4b3f8f" />
        <rect x="9" y="6" width="1" height="2" fill="#4b3f8f" />
        <rect x="5" y="11" width="6" height="2" fill="#e6b84a" />
      </svg>
      Cozy Compute
    </div>
  );
}
