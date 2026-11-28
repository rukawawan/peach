import { useEffect, useState } from 'react';
import { activityKind } from '../../activity-kinds';
import { AnimatedNumber } from '../components/animated-number';
import { TaskProgress, TaskStage } from '../components/task-progress';
import { processingLine, type LibraryProcessingData } from './library-processing';

/** 服务端等待时长作为起点，本地时钟只推进当前显示。 */
function useProcessingLine(state: LibraryProcessingData) {
  const [clock, setClock] = useState({ snapshot: state, seconds: 0 });
  const waiting = state.waited_seconds;
  const ticking = state.status === 'running' && waiting != null && Number.isFinite(waiting) && waiting >= 0;
  useEffect(() => {
    if (!ticking) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      setClock({ snapshot: state, seconds: Math.max(0, Math.floor((performance.now() - started) / 1000)) });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state, ticking]);
  const seconds = ticking && clock.snapshot === state ? clock.seconds : 0;
  return processingLine(seconds ? { ...state, waited_seconds: waiting! + seconds } : state);
}

export function ProcessingLine({ state }: { state: LibraryProcessingData }) {
  const line = useProcessingLine(state);
  return <ProcessingReadout line={line} state={state} />;
}

function ProcessingReadout({ line, state }: { line: ReturnType<typeof processingLine>; state: LibraryProcessingData }) {
  const phase = `${state.status}:${state.stage_code || ''}:${state.current_action || ''}`;
  return <><TaskStage phase={phase}>{line.status}</TaskStage>
    {line.count ? <> · <AnimatedNumber value={line.count} /></> : null}</>;
}

/** 每秒只更新当前进度子树，控件和结果清单沿用接口快照。 */
export function ProcessingProgress({ state }: { state: LibraryProcessingData }) {
  const line = useProcessingLine(state);
  return <TaskProgress embedded kind={activityKind('library-processing', state.stage_code)}
    label={line.label} labelContent={<ProcessingReadout line={line} state={state} />}
    value={Math.min(state.checked || 0, state.total || 0)} total={state.total} />;
}
