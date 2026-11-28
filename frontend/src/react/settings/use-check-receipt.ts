import { useContext } from 'react';
import { ShellActionsContext } from '../router/router';

export function useCheckReceipt() {
  const actions = useContext(ShellActionsContext);
  return {
    checked: (message: string) => actions?.receipt(message),
    checkFailed: (action: string, message: string) => actions?.failure(action, new Error(message)),
  };
}
