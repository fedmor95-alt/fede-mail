import type { GmailClient } from "@/services/gmail/client";

const PEOPLE_API_BASE = "https://people.googleapis.com/v1";

export interface GoogleContact {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface Person {
  names?: { displayName?: string; metadata?: { primary?: boolean } }[];
  emailAddresses?: { value?: string; metadata?: { primary?: boolean } }[];
  photos?: { url?: string; default?: boolean; metadata?: { primary?: boolean } }[];
}

interface PeopleListResponse {
  connections?: Person[];
  otherContacts?: Person[];
  nextPageToken?: string;
}

/** Thrown when the token predates the contacts scopes: the account needs re-authorizing. */
export class PeopleScopeError extends Error {
  constructor() {
    super("Google contacts need the account to be re-authorized");
    this.name = "PeopleScopeError";
  }
}

function primaryFirst<T extends { metadata?: { primary?: boolean } }>(items: T[] | undefined): T[] {
  return [...(items ?? [])].sort((a, b) => Number(b.metadata?.primary ?? false) - Number(a.metadata?.primary ?? false));
}

/** One contact per email address; the primary name and a non-default photo when there is one. */
export function personToContacts(person: Person): GoogleContact[] {
  const displayName = primaryFirst(person.names)[0]?.displayName?.trim() || null;
  const photo = primaryFirst(person.photos).find((p) => p.url && !p.default);
  const avatarUrl = photo?.url ?? null;
  const seen = new Set<string>();
  const out: GoogleContact[] = [];
  for (const entry of primaryFirst(person.emailAddresses)) {
    const email = entry.value?.trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    out.push({ email, displayName, avatarUrl });
  }
  return out;
}

async function listAll(
  client: GmailClient,
  path: string,
  params: Record<string, string>,
  pick: (r: PeopleListResponse) => Person[] | undefined,
): Promise<Person[]> {
  const people: Person[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ ...params, pageSize: "1000" });
    if (pageToken) query.set("pageToken", pageToken);
    let page: PeopleListResponse;
    try {
      page = await client.request<PeopleListResponse>(`${PEOPLE_API_BASE}${path}?${query}`);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      if (/error: 403\b|insufficient|PERMISSION_DENIED/i.test(text)) {
        throw new PeopleScopeError();
      }
      throw err;
    }
    people.push(...(pick(page) ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return people;
}

/**
 * The account's address book ("Contacts") plus the people Google has seen it
 * write to ("Other contacts"). Needs the contacts.readonly and
 * contacts.other.readonly scopes.
 */
export async function fetchGoogleContacts(client: GmailClient): Promise<GoogleContact[]> {
  const connections = await listAll(
    client,
    "/people/me/connections",
    { personFields: "names,emailAddresses,photos" },
    (r) => r.connections,
  );
  const others = await listAll(
    client,
    "/otherContacts",
    { readMask: "names,emailAddresses,photos" },
    (r) => r.otherContacts,
  );
  const byEmail = new Map<string, GoogleContact>();
  // Address book entries win over "other contacts" for the same address
  for (const person of [...others, ...connections]) {
    for (const contact of personToContacts(person)) byEmail.set(contact.email, contact);
  }
  return [...byEmail.values()];
}
