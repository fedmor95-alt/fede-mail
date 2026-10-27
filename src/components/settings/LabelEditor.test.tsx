import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LabelEditor } from "./LabelEditor";
import { useAccountStore } from "@/stores/accountStore";
import { useLabelStore } from "@/stores/labelStore";

// Mock the label store actions
const mockCreateLabel = vi.fn();
const mockUpdateLabel = vi.fn();
const mockDeleteLabel = vi.fn();
const mockReorderLabels = vi.fn();
const mockLoadLabels = vi.fn();

function setStoreWithLabels(labels: { id: string; accountId: string; name: string; type: string; colorBg: string | null; colorFg: string | null; sortOrder: number }[]) {
  useLabelStore.setState({
    labels,
    isLoading: false,
    createLabel: mockCreateLabel,
    updateLabel: mockUpdateLabel,
    deleteLabel: mockDeleteLabel,
    reorderLabels: mockReorderLabels,
    loadLabels: mockLoadLabels,
  });
}

describe("LabelEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAccountStore.setState({
      accounts: [{ id: "acc1", email: "test@test.com", displayName: "Test", avatarUrl: null, isActive: true }],
      activeAccountId: "acc1",
    });
    setStoreWithLabels([]);
  });

  it("renders empty state", () => {
    render(<LabelEditor />);
    expect(screen.getByText("Nessuna etichetta personale")).toBeInTheDocument();
    expect(screen.getByText("+ Aggiungi etichetta")).toBeInTheDocument();
  });

  it("renders labels list", () => {
    setStoreWithLabels([
      { id: "L1", accountId: "acc1", name: "Work", type: "user", colorBg: "#fb4c2f", colorFg: "#ffffff", sortOrder: 0 },
      { id: "L2", accountId: "acc1", name: "Personal", type: "user", colorBg: null, colorFg: null, sortOrder: 1 },
    ]);
    render(<LabelEditor />);
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("shows form when + Aggiungi etichetta is clicked", () => {
    render(<LabelEditor />);
    fireEvent.click(screen.getByText("+ Aggiungi etichetta"));
    expect(screen.getByPlaceholderText("Nome etichetta")).toBeInTheDocument();
    expect(screen.getByText("Salva")).toBeInTheDocument();
    expect(screen.getByText("Annulla")).toBeInTheDocument();
  });

  it("hides form when Cancel is clicked", () => {
    render(<LabelEditor />);
    fireEvent.click(screen.getByText("+ Aggiungi etichetta"));
    expect(screen.getByPlaceholderText("Nome etichetta")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Annulla"));
    expect(screen.queryByPlaceholderText("Nome etichetta")).not.toBeInTheDocument();
  });

  it("calls createLabel on save with name", async () => {
    mockCreateLabel.mockResolvedValue(undefined);
    render(<LabelEditor />);
    fireEvent.click(screen.getByText("+ Aggiungi etichetta"));
    fireEvent.change(screen.getByPlaceholderText("Nome etichetta"), { target: { value: "New Label" } });
    fireEvent.click(screen.getByText("Salva"));

    await waitFor(() => {
      expect(mockCreateLabel).toHaveBeenCalledWith("acc1", "New Label", undefined);
    });
  });

  it("populates form when edit button is clicked", () => {
    setStoreWithLabels([
      { id: "L1", accountId: "acc1", name: "Work", type: "user", colorBg: "#fb4c2f", colorFg: "#ffffff", sortOrder: 0 },
    ]);
    render(<LabelEditor />);

    // Click the edit button (pencil icon)
    const editButtons = screen.getAllByTitle("Modifica");
    fireEvent.click(editButtons[0]!);

    const input = screen.getByPlaceholderText("Nome etichetta") as HTMLInputElement;
    expect(input.value).toBe("Work");
    expect(screen.getByText("Aggiorna")).toBeInTheDocument();
  });

  it("calls updateLabel on save when editing", async () => {
    mockUpdateLabel.mockResolvedValue(undefined);
    setStoreWithLabels([
      { id: "L1", accountId: "acc1", name: "Work", type: "user", colorBg: null, colorFg: null, sortOrder: 0 },
    ]);
    render(<LabelEditor />);

    fireEvent.click(screen.getAllByTitle("Modifica")[0]!);
    fireEvent.change(screen.getByPlaceholderText("Nome etichetta"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByText("Aggiorna"));

    await waitFor(() => {
      expect(mockUpdateLabel).toHaveBeenCalledWith("acc1", "L1", {
        name: "Updated",
        color: null,
      });
    });
  });

  it("calls deleteLabel when delete button is clicked", async () => {
    mockDeleteLabel.mockResolvedValue(undefined);
    setStoreWithLabels([
      { id: "L1", accountId: "acc1", name: "Work", type: "user", colorBg: null, colorFg: null, sortOrder: 0 },
    ]);
    render(<LabelEditor />);

    fireEvent.click(screen.getAllByTitle("Elimina")[0]!);

    await waitFor(() => {
      expect(mockDeleteLabel).toHaveBeenCalledWith("acc1", "L1");
    });
  });

  it("disables move up for first label and move down for last", () => {
    setStoreWithLabels([
      { id: "L1", accountId: "acc1", name: "First", type: "user", colorBg: null, colorFg: null, sortOrder: 0 },
      { id: "L2", accountId: "acc1", name: "Last", type: "user", colorBg: null, colorFg: null, sortOrder: 1 },
    ]);
    render(<LabelEditor />);

    const moveUpButtons = screen.getAllByTitle("Sposta su");
    const moveDownButtons = screen.getAllByTitle("Sposta giù");

    expect(moveUpButtons[0]!).toBeDisabled();
    expect(moveDownButtons[1]!).toBeDisabled();
    expect(moveDownButtons[0]!).not.toBeDisabled();
    expect(moveUpButtons[1]!).not.toBeDisabled();
  });

  it("calls reorderLabels when move down is clicked", async () => {
    mockReorderLabels.mockResolvedValue(undefined);
    setStoreWithLabels([
      { id: "L1", accountId: "acc1", name: "First", type: "user", colorBg: null, colorFg: null, sortOrder: 0 },
      { id: "L2", accountId: "acc1", name: "Second", type: "user", colorBg: null, colorFg: null, sortOrder: 1 },
    ]);
    render(<LabelEditor />);

    const moveDownButtons = screen.getAllByTitle("Sposta giù");
    fireEvent.click(moveDownButtons[0]!);

    await waitFor(() => {
      expect(mockReorderLabels).toHaveBeenCalledWith("acc1", ["L2", "L1"]);
    });
  });

  it("shows error on delete failure", async () => {
    mockDeleteLabel.mockRejectedValue(new Error("API error"));
    setStoreWithLabels([
      { id: "L1", accountId: "acc1", name: "Work", type: "user", colorBg: null, colorFg: null, sortOrder: 0 },
    ]);
    render(<LabelEditor />);
    fireEvent.click(screen.getAllByTitle("Elimina")[0]!);

    await waitFor(() => {
      expect(screen.getByText("API error")).toBeInTheDocument();
    });
  });

  it("disables save button when name is empty", () => {
    render(<LabelEditor />);
    fireEvent.click(screen.getByText("+ Aggiungi etichetta"));
    expect(screen.getByText("Salva")).toBeDisabled();
  });

  it("selects a color in the color picker", () => {
    render(<LabelEditor />);
    fireEvent.click(screen.getByText("+ Aggiungi etichetta"));

    // Click a color swatch (the red one #fb4c2f)
    const colorButton = screen.getByTitle("#fb4c2f");
    fireEvent.click(colorButton);

    // The button should now have a ring indicating selection
    expect(colorButton.className).toContain("ring-1");
  });

  it("shows edit form under the label being edited, not at bottom", () => {
    setStoreWithLabels([
      { id: "L1", accountId: "acc1", name: "First", type: "user", colorBg: null, colorFg: null, sortOrder: 0 },
      { id: "L2", accountId: "acc1", name: "Second", type: "user", colorBg: null, colorFg: null, sortOrder: 1 },
    ]);
    render(<LabelEditor />);

    // Click edit on the first label
    fireEvent.click(screen.getAllByTitle("Modifica")[0]!);

    // Form should be visible
    const input = screen.getByPlaceholderText("Nome etichetta") as HTMLInputElement;
    expect(input.value).toBe("First");

    // The "+ Aggiungi etichetta" button should not be visible while editing
    expect(screen.queryByText("+ Aggiungi etichetta")).not.toBeInTheDocument();
  });
});
