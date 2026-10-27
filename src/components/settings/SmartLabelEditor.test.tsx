import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SmartLabelEditor } from "./SmartLabelEditor";
import { useAccountStore } from "@/stores/accountStore";

vi.mock("@/services/db/labels", () => ({
  getLabelsForAccount: vi.fn(() =>
    Promise.resolve([
      { id: "label-work", name: "Work", type: "user", account_id: "acc1" },
      { id: "label-personal", name: "Personal", type: "user", account_id: "acc1" },
      { id: "INBOX", name: "Inbox", type: "system", account_id: "acc1" },
    ]),
  ),
}));

const mockGetRules = vi.fn(() => Promise.resolve([]));
const mockInsertRule = vi.fn(() => Promise.resolve("new-id"));
const mockUpdateRule = vi.fn(() => Promise.resolve());
const mockDeleteRule = vi.fn(() => Promise.resolve());

vi.mock("@/services/db/smartLabelRules", () => ({
  getSmartLabelRulesForAccount: (...args: unknown[]) => mockGetRules(...args),
  insertSmartLabelRule: (...args: unknown[]) => mockInsertRule(...args),
  updateSmartLabelRule: (...args: unknown[]) => mockUpdateRule(...args),
  deleteSmartLabelRule: (...args: unknown[]) => mockDeleteRule(...args),
}));

const mockBackfill = vi.fn(() => Promise.resolve(5));

vi.mock("@/services/smartLabels/backfillService", () => ({
  backfillSmartLabels: (...args: unknown[]) => mockBackfill(...args),
}));

describe("SmartLabelEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAccountStore.setState({
      accounts: [{ id: "acc1", email: "test@test.com", displayName: "Test", avatarUrl: null, isActive: true }],
      activeAccountId: "acc1",
    });
    mockGetRules.mockResolvedValue([]);
  });

  it("renders add button", async () => {
    render(<SmartLabelEditor />);
    await waitFor(() => {
      expect(screen.getByText("+ Aggiungi etichetta smart")).toBeInTheDocument();
    });
  });

  it("shows form when + Aggiungi etichetta smart is clicked", async () => {
    render(<SmartLabelEditor />);
    await waitFor(() => screen.getByText("+ Aggiungi etichetta smart"));

    fireEvent.click(screen.getByText("+ Aggiungi etichetta smart"));

    expect(screen.getByText("Etichetta")).toBeInTheDocument();
    expect(screen.getByText("Descrizione per l'IA")).toBeInTheDocument();
    expect(screen.getByText("Salva")).toBeInTheDocument();
    expect(screen.getByText("Annulla")).toBeInTheDocument();
  });

  it("hides form when Cancel is clicked", async () => {
    render(<SmartLabelEditor />);
    await waitFor(() => screen.getByText("+ Aggiungi etichetta smart"));

    fireEvent.click(screen.getByText("+ Aggiungi etichetta smart"));
    expect(screen.getByText("Descrizione per l'IA")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Annulla"));
    expect(screen.queryByText("Descrizione per l'IA")).not.toBeInTheDocument();
  });

  it("renders existing rules", async () => {
    mockGetRules.mockResolvedValue([
      {
        id: "r1",
        account_id: "acc1",
        label_id: "label-work",
        ai_description: "Work-related emails",
        criteria_json: null,
        is_enabled: 1,
        sort_order: 0,
        created_at: 100,
      },
    ]);

    render(<SmartLabelEditor />);

    await waitFor(() => {
      expect(screen.getByText("Work")).toBeInTheDocument();
      expect(screen.getByText("Work-related emails")).toBeInTheDocument();
    });
  });

  it("shows disabled badge for disabled rules", async () => {
    mockGetRules.mockResolvedValue([
      {
        id: "r1",
        account_id: "acc1",
        label_id: "label-work",
        ai_description: "Work emails",
        criteria_json: null,
        is_enabled: 0,
        sort_order: 0,
        created_at: 100,
      },
    ]);

    render(<SmartLabelEditor />);

    await waitFor(() => {
      expect(screen.getByText("Disattivato")).toBeInTheDocument();
    });
  });

  it("calls insertSmartLabelRule on save", async () => {
    render(<SmartLabelEditor />);
    await waitFor(() => screen.getByText("+ Aggiungi etichetta smart"));

    fireEvent.click(screen.getByText("+ Aggiungi etichetta smart"));

    // Select label
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "label-work" } });

    // Enter description
    const textarea = screen.getByPlaceholderText("es. Candidature di lavoro e opportunità di carriera");
    fireEvent.change(textarea, { target: { value: "Work-related emails" } });

    fireEvent.click(screen.getByText("Salva"));

    await waitFor(() => {
      expect(mockInsertRule).toHaveBeenCalledWith({
        accountId: "acc1",
        labelId: "label-work",
        aiDescription: "Work-related emails",
        criteria: undefined,
      });
    });
  });

  it("shows backfill button when rules exist", async () => {
    mockGetRules.mockResolvedValue([
      {
        id: "r1",
        account_id: "acc1",
        label_id: "label-work",
        ai_description: "Work emails",
        criteria_json: null,
        is_enabled: 1,
        sort_order: 0,
        created_at: 100,
      },
    ]);

    render(<SmartLabelEditor />);

    await waitFor(() => {
      expect(screen.getByText("Applica alle email esistenti")).toBeInTheDocument();
    });
  });

  it("triggers backfill and shows result", async () => {
    mockGetRules.mockResolvedValue([
      {
        id: "r1",
        account_id: "acc1",
        label_id: "label-work",
        ai_description: "Work emails",
        criteria_json: null,
        is_enabled: 1,
        sort_order: 0,
        created_at: 100,
      },
    ]);

    render(<SmartLabelEditor />);

    await waitFor(() => screen.getByText("Applica alle email esistenti"));

    fireEvent.click(screen.getByText("Applica alle email esistenti"));

    await waitFor(() => {
      expect(mockBackfill).toHaveBeenCalledWith("acc1");
      expect(screen.getByText("5 etichette applicate alle email esistenti.")).toBeInTheDocument();
    });
  });

  it("only shows user labels in dropdown (filters out system labels)", async () => {
    render(<SmartLabelEditor />);
    await waitFor(() => screen.getByText("+ Aggiungi etichetta smart"));

    fireEvent.click(screen.getByText("+ Aggiungi etichetta smart"));

    const options = screen.getAllByRole("option");
    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).toContain("Work");
    expect(optionTexts).toContain("Personal");
    expect(optionTexts).not.toContain("Inbox");
  });

  it("shows optional criteria section when toggled", async () => {
    render(<SmartLabelEditor />);
    await waitFor(() => screen.getByText("+ Aggiungi etichetta smart"));

    fireEvent.click(screen.getByText("+ Aggiungi etichetta smart"));
    fireEvent.click(screen.getByText("Criteri di filtro facoltativi"));

    expect(screen.getByPlaceholderText("Da contiene...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Oggetto contiene...")).toBeInTheDocument();
  });

  it("deletes a rule", async () => {
    mockGetRules.mockResolvedValue([
      {
        id: "r1",
        account_id: "acc1",
        label_id: "label-work",
        ai_description: "Work emails",
        criteria_json: null,
        is_enabled: 1,
        sort_order: 0,
        created_at: 100,
      },
    ]);

    render(<SmartLabelEditor />);

    await waitFor(() => screen.getByText("Work"));

    // Click the delete button (last button in the row, with hover:text-danger class)
    const dangerButtons = document.querySelectorAll("button.p-1.text-text-tertiary");
    const deleteBtn = dangerButtons[dangerButtons.length - 1];
    if (deleteBtn) fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteRule).toHaveBeenCalledWith("r1");
    });
  });
});
