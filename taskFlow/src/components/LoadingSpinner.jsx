export default function LoadingSpinner({ size = 'md', label = 'Loading…' }) {
  const cls = `spinner spinner--${size}`;
  return (
    <div className="spinner-wrapper" role="status" aria-label={label}>
      <div className={cls} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <LoadingSpinner size="lg" />
    </div>
  );
}
