export function GuideFieldDetails({ details }: { details?: readonly [string, string][] }) {
  return details?.length ? <dl className="flex flex-col gap-3">{details.map(([title, body]) => <div key={title} className="flex flex-col gap-1"><dt className="text-body-2-medium text-text-primary">{title}</dt><dd className="text-body-2-regular text-text-secondary">{body}</dd></div>)}</dl> : null;
}
