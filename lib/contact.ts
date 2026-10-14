/**
 * Contact form topics — shared by the form component (renders the select)
 * and the /api/contact route (whitelists the submitted value).
 */
export const CONTACT_TOPICS = [
  'General question',
  'Question about my order',
  'Question about a service',
  'Something else',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const DEFAULT_CONTACT_TOPIC: ContactTopic = 'General question';
