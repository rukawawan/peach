/* 元数据字段那一类卡片的正文：一组互斥的来源值，加上还没收录的 genre。
 *
 * 一张候选卡上下两段读的是两件事：上段是这个来源给的那个值，也就是选中它就会写进数据库
 * 的东西；下段是同一来源顺带交回来的其它字段，只作判断依据。两段各自铺底色并由一条线
 * 隔开，选哪一段能改数据库就不用猜。 */
import { useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { RadioGroup } from '@/components/base/radio/radio';
import { RadioCard } from '@/components/base/radio/radio-card';

import { Button } from '@/components/base/buttons/button';
import { InputBase, TextField } from '@/components/base/input/input';
import { CollapseChevron, CollapseRegion } from '../components/collapse-region';
import { errorMessage } from '../../api';
import { codedText, serverLabelList } from '../../core/server-text';
import type { ReviewCandidate, ReviewRow } from './review';
import { pendingGenres, recordGenre, reloadReview } from './review';
import { ComparisonText } from './comparison-text';
import { composingKey } from '../components/ime';
import { t } from '../../i18n';

/** 候选顺带交回来的那些字段在界面上叫什么。表里没有的按原名显示。 */
const EVIDENCE_LABELS: Record<string, string> = {
  title: t('manage:shared.title'), original_title: t('manage:reviewCandidate.originalTitle'), runtime: t('manage:reviewCandidate.sourceRuntime'), director: t('manage:reviewCandidate.director'),
  label: 'Label', poster_url: t('manage:reviewCandidate.poster'), cover_url: t('manage:shared.cover'), screenshot_urls: t('manage:reviewCandidate.screenshots'),
  trailer_url: t('manage:reviewCandidate.trailer'),
};

/** 收录 genre 时的候选词表，一份挂在整页上：每张卡各写一遍的话，同一百来个 option 会在
 *  DOM 里重复几十份。 */
export const GENRE_TAGS_ID = 'reviewgenretags';

export function GenreTagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <datalist id={GENRE_TAGS_ID}>
      {tags.map((tag) => <option key={tag} value={tag} />)}
    </datalist>
  );
}

/** 来源依据独立展开，点击说明不会同时选中另一个来源。 */
function CandidateEvidence({ candidate, row }: { candidate: ReviewCandidate; row: ReviewRow }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const evidence = Object.entries(candidate.catalog_evidence || {})
    .filter(([, item]) => item && item.display_value);
  if (!evidence.length) return null;
  return (
    <div className="min-w-0">
      <Button variant="secondary" size="small" leadingIcon={CollapseChevron}
        aria-expanded={open} aria-controls={panel}
        aria-label={t(open ? 'manage:reviewCandidate.collapseEvidence' : 'manage:reviewCandidate.expandEvidence', { source: candidate.source || t('manage:reviewCandidate.thisSource') })}
        onClick={() => setOpen(!open)}>
        <span data-copy-key="review.card.source_evidence">{t('manage:reviewCandidate.sourceEvidence')}</span>{` · ${evidence.length}`}
      </Button>
      <CollapseRegion id={panel} open={open}>
        <dl className="flex min-w-0 flex-col gap-2 px-3 pt-2 pb-1">
          {evidence.map(([field, item]) => (
            <div key={field} className="flex min-w-0 flex-wrap gap-x-2">
              <dt className="text-caption-1-regular text-text-tertiary">
                {EVIDENCE_LABELS[field] || field}
              </dt>
              <dd className="min-w-0 text-body-2-regular break-words text-text-primary">
                <ComparisonText value={codedText(item, 'display_value')}
                  reference={field === row.field && row.current_value
                    ? row.current_value
                    : codedText(row.candidates?.find(peer => peer.candidate_key !== candidate.candidate_key
                        && peer.catalog_evidence?.[field]?.display_value)?.catalog_evidence?.[field], 'display_value')} />
              </dd>
              {serverLabelList(item.warnings, item.warning_codes, item.warning_params).map((warning) => (
                <small key={warning} className="w-full text-caption-1-regular text-status-yellow-text">
                  {warning}
                </small>
              ))}
            </div>
          ))}
        </dl>
      </CollapseRegion>
    </div>
  );
}

function candidateHeading(candidate: ReviewCandidate) {
  const id = candidate.content_id || candidate.provider_id;
  return `${candidate.source || t('manage:reviewQueue.unspecifiedSource')}${candidate.official ? ` · ${t('manage:reviewCandidate.officialFirst')}` : ''}${id ? ` · ID ${id}` : ''}`;
}

function CandidateValue({ candidate, reference }: { candidate: ReviewCandidate; reference?: string }) {
  return <span className="flex min-w-0 flex-col gap-2 whitespace-normal wrap-anywhere">
    <span className="text-body-regular text-text-primary">
      <ComparisonText value={candidate.display_value || ''} reference={reference} />
    </span>
    {serverLabelList(candidate.warnings, candidate.warning_codes, candidate.warning_params).map(warning => (
      <span key={warning} className="text-body-2-regular text-status-yellow-text">{warning}</span>
    ))}
  </span>;
}

/** 互斥的几个来源值。只有一个候选时没什么可选的：单选圈只会让人以为还有别的选项，
 *  所以改成纯展示，而提交仍按这一个候选走。 */
export function CandidateChoices(
  { row, fieldName, value, onChange, locked }: {
    row: ReviewRow;
    fieldName: string;
    value: string;
    onChange(candidateKey: string): void;
    locked: boolean;
  },
) {
  const candidates = row.candidates || [];
  if (!candidates.length) return null;
  if (candidates.length === 1) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-2 rounded-2lg bg-background-primary-default px-4 py-3">
          <p className="text-body-medium text-text-primary">{candidateHeading(candidates[0]!)}</p>
          <CandidateValue candidate={candidates[0]!} reference={row.current_value || undefined} />
        </div>
        <CandidateEvidence candidate={candidates[0]!} row={row} />
      </div>
    );
  }
  return (
    <RadioGroup aria-label={t('manage:reviewCandidate.sourceFor', { field: fieldName || t('manage:scanFetch.slowWhatMetadata') })} value={value} isDisabled={locked}
      onChange={onChange}>
      <div className="flex min-w-0 flex-col gap-3">
      {candidates.map((candidate) => (
        <div key={candidate.candidate_key} className="flex min-w-0 flex-col gap-1">
          <RadioCard value={candidate.candidate_key} className="relative items-start"
            title={<span title={candidateHeading(candidate)}>{candidateHeading(candidate)}</span>}
            description={<CandidateValue candidate={candidate}
              reference={row.current_value || candidates.find(peer => peer.candidate_key !== candidate.candidate_key)?.display_value} />} />
          <CandidateEvidence candidate={candidate} row={row} />
        </div>
      ))}
      </div>
    </RadioGroup>
  );
}

/** 一个还没收录的 genre。给中文名就是收录成那个标签，判「不是内容」就是永久排除。 */
function GenreRow(
  { genre, tags, locked, toast }: {
    genre: string; tags: string[]; locked: boolean; toast(message: string): void;
  },
) {
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState('');
  const record = useMutation({
    mutationFn: (tag: string) => recordGenre(genre, tag),
    onSuccess: async (result, tag) => {
      if (!result.ok) { setProblem(result.error || t('manage:reviewCandidate.mapRejected')); return }
      toast(tag ? t('manage:reviewCandidate.mapped', { genre, tag }) : t('manage:reviewCandidate.markedNonContent', { genre }));
      await reloadReview();
    },
    onError: (cause) => setProblem(errorMessage(cause)),
  });
  const accept = () => {
    const tag = draft.trim();
    if (!tag) { setProblem(t('manage:reviewCandidate.tagRequired')); return }
    setProblem('');
    record.mutate(tag);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <b lang="ja" className="text-body-medium text-text-primary">{genre}</b>
      <TextField aria-label={t('manage:reviewCandidate.tagFor', { genre })} value={draft} onChange={setDraft}
        maxLength={40} isDisabled={locked || record.isPending} className="min-w-40 flex-1">
        {/* 输入法还在组词时的那一下 Enter 是「选这个词」，不是「提交」。 */}
        <InputBase size="small" list={tags.length ? GENRE_TAGS_ID : undefined}
          autoComplete="off" placeholder={t('manage:reviewCandidate.tagPlaceholder')}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || composingKey(event.nativeEvent)) return;
            event.preventDefault();
            accept();
          }} />
      </TextField>
      {/* 两个结论都是次级键：这张卡上的主动作是「通过」，把词收进表里只是让那一步有得
          可选。收录挂上 primary 的话，同一张卡上会有两个蓝底键在抢「按这里」。 */}
      <Button variant="secondary" size="small" disabled={locked || record.isPending}
        onClick={accept}>{t('manage:reviewCandidate.map')}</Button>
      <Button variant="secondary" size="small" disabled={locked || record.isPending}
        onClick={() => { setProblem(''); record.mutate('') }}>{t('manage:reviewCandidate.notContent')}</Button>
      {problem
        ? <p role="status" className="w-full text-body-2-regular text-text-error-primary">{problem}</p>
        : null}
    </div>
  );
}

/** 未收录 genre 是这张卡上唯一一件不判候选的事：来源给了值，Peach 还没决定它算哪个标签，
 *  于是那句「来源还有 2 个未收录 genre」每批都原样再来一次。收录一次是对整张词表说的，
 *  不属于其中某一个来源，所以单列一块摆在候选下面。 */
export function PendingGenres(
  { row, tags, locked, toast }: {
    row: ReviewRow; tags: string[]; locked: boolean; toast(message: string): void;
  },
) {
  const genres = pendingGenres(row);
  if (!genres.length) return null;
  return (
    <div role="group" aria-label={t('manage:reviewCandidate.unmappedGenres')} className="flex flex-col gap-2 border-t border-separator-border pt-4">
      <h5 className="text-body-2-medium text-text-secondary">{t('manage:reviewCandidate.unmappedGenresCount', { count: genres.length })}</h5>
      <div role="list" className="flex flex-col">
        {genres.map((genre, index) => (
          <div key={genre} role="listitem"
            className={`py-3 first:pt-0 last:pb-0 ${index ? 'border-t border-separator-border' : ''}`}>
            <GenreRow genre={genre} tags={tags} locked={locked} toast={toast} />
          </div>
        ))}
      </div>
    </div>
  );
}
