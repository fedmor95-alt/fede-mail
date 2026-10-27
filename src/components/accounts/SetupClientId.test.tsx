import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SetupClientId } from "./SetupClientId";

vi.mock("@/services/db/settings", () => ({
  setSetting: vi.fn().mockResolvedValue(undefined),
  setSecureSetting: vi.fn().mockResolvedValue(undefined),
}));

describe("SetupClientId", () => {
  it("disables Save button when both fields are empty", () => {
    render(<SetupClientId onComplete={() => {}} onCancel={() => {}} />);
    const saveButton = screen.getByText("Salva e continua");
    expect(saveButton).toBeDisabled();
  });

  it("disables Save button when only client ID is provided", () => {
    render(<SetupClientId onComplete={() => {}} onCancel={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    // Client ID is the text input; secret is password (not a textbox role)
    const clientIdInput = screen.getByPlaceholderText(
      "Incolla qui il tuo ID client...",
    );
    fireEvent.change(clientIdInput, { target: { value: "my-client-id" } });

    const saveButton = screen.getByText("Salva e continua");
    expect(saveButton).toBeDisabled();
  });

  it("disables Save button when only client secret is provided", () => {
    render(<SetupClientId onComplete={() => {}} onCancel={() => {}} />);
    const secretInput = screen.getByPlaceholderText(
      "Incolla qui il tuo segreto client...",
    );
    fireEvent.change(secretInput, { target: { value: "my-secret" } });

    const saveButton = screen.getByText("Salva e continua");
    expect(saveButton).toBeDisabled();
  });

  it("enables Save button when both fields are filled", () => {
    render(<SetupClientId onComplete={() => {}} onCancel={() => {}} />);
    const clientIdInput = screen.getByPlaceholderText(
      "Incolla qui il tuo ID client...",
    );
    const secretInput = screen.getByPlaceholderText(
      "Incolla qui il tuo segreto client...",
    );

    fireEvent.change(clientIdInput, { target: { value: "my-client-id" } });
    fireEvent.change(secretInput, { target: { value: "my-secret" } });

    const saveButton = screen.getByText("Salva e continua");
    expect(saveButton).not.toBeDisabled();
  });

  it("shows helper text about client secret being required", () => {
    render(<SetupClientId onComplete={() => {}} onCancel={() => {}} />);
    expect(
      screen.getByText("Richiesto per le credenziali di tipo Applicazione web"),
    ).toBeInTheDocument();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<SetupClientId onComplete={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Annulla"));
    expect(onCancel).toHaveBeenCalled();
  });
});
