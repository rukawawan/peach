import { SettingsRow } from '@/components/application/settings/settings-rows';
import { Switch } from '@/components/base/switch/switch';

import { t } from '../../i18n';
import { StatusLabel } from '../components/status-label';
import { busyProps } from './busy-props';
import { Rows, Stack } from './section';

export function SharingChoice({ label, description, selected, available, disabled, busy = false, onChange }: {
  label: string; description: string; selected: boolean; available?: boolean;
  disabled?: boolean; busy?: boolean; onChange(selected: boolean): void;
}) {
  return <>
    <Rows>
      <SettingsRow label={label} description={description}>
        <Switch aria-label={label} isSelected={selected} isDisabled={disabled}
          onChange={onChange} {...busyProps(busy)} />
      </SettingsRow>
    </Rows>
    {available === false ? <Stack divided>
      <StatusLabel className="self-start">{t('settings:librarySharing.unavailable')}</StatusLabel>
    </Stack> : null}
  </>;
}
