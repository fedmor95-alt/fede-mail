import { personToContacts } from "./people";

describe("personToContacts", () => {
  it("uses the primary name and skips the default photo", () => {
    const contacts = personToContacts({
      names: [
        { displayName: "M. Rossi" },
        { displayName: "Mario Rossi", metadata: { primary: true } },
      ],
      emailAddresses: [
        { value: "Mario.Rossi@Example.com " },
        { value: "mario@work.example", metadata: { primary: true } },
      ],
      photos: [{ url: "https://x/default", default: true }],
    });
    expect(contacts).toEqual([
      { email: "mario@work.example", displayName: "Mario Rossi", avatarUrl: null },
      { email: "mario.rossi@example.com", displayName: "Mario Rossi", avatarUrl: null },
    ]);
  });

  it("drops people without a usable email", () => {
    expect(personToContacts({ names: [{ displayName: "Nobody" }] })).toEqual([]);
    expect(personToContacts({ emailAddresses: [{ value: "not-an-email" }] })).toEqual([]);
  });
});
