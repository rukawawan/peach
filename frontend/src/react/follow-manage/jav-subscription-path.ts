export function javSubscriptionPath(name: string) {
  const params = new URLSearchParams({ tab: 'add', performer: name });
  return `/subscriptions?${params}#add-jav-subscription`;
}
