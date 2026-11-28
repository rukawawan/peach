import { spinnerHtml } from '../../ui-kit/markup';

const markup = { __html: spinnerHtml('') };

/** 按钮文字提供名称，转圈只反馈请求正在等待。 */
export function ActionSpinner({ className }: { className?: string }) {
  return <span className={className} aria-hidden dangerouslySetInnerHTML={markup} />;
}
