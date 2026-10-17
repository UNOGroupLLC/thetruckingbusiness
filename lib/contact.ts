/**
 * Contact form topics — shared by the form component (renders the select)
 * and the /api/contact route (whitelists the submitted value).
 * Owner approved list, Oct 16, 2026: plain categories a visitor picks from
 * under the label "What is this about?".
 */
export const CONTACT_TOPICS = [
  'General inquiry',
  'Starting a trucking company',
  'DOT compliance',
  'My order',
  'A subscription',
  'Courses and digital products',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const DEFAULT_CONTACT_TOPIC: ContactTopic = 'General inquiry';
