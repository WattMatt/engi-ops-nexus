/**
 * Tests for Common UI Components
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../lib/testUtils";
import userEvent from "@testing-library/user-event";
import { 
  StatusCard, 
  EmptyState, 
  LoadingState, 
  ErrorState, 
  NoResults,
  MetricCard,
  MetricGrid
} from "@/components/common";
import { FormField } from "@/components/common/FormField";
import { FormTextarea } from "@/components/common/FormTextarea";
import { AlertCircle, Plus, DollarSign } from "lucide-react";

describe("StatusCard", () => {
  it("renders with default variant", () => {
    render(<StatusCard title="Test Status" description="A test message" />);
    
    expect(screen.getByText("Test Status")).toBeInTheDocument();
    expect(screen.getByText("A test message")).toBeInTheDocument();
  });

  it("renders success variant correctly", () => {
    render(<StatusCard variant="success" title="Success!" />);
    
    const card = screen.getByRole("status");
    expect(card).toHaveClass("bg-green-50");
  });

  it("renders error variant correctly", () => {
    render(<StatusCard variant="error" title="Error!" />);
    
    const card = screen.getByRole("status");
    expect(card).toHaveClass("bg-red-50");
  });

  it("renders action button when provided", () => {
    const handleClick = vi.fn();
    render(
      <StatusCard 
        title="With Action" 
        action={<button onClick={handleClick}>Click Me</button>} 
      />
    );
    
    const button = screen.getByRole("button", { name: /click me/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });

  it("uses custom icon when provided", () => {
    render(<StatusCard title="Custom Icon" icon={AlertCircle} />);
    
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState 
        title="No items" 
        description="Add your first item to get started" 
      />
    );
    
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("Add your first item to get started")).toBeInTheDocument();
  });

  it("renders action button when provided", async () => {
    const handleClick = vi.fn();
    render(
      <EmptyState 
        title="No items" 
        action={{ label: "Add Item", onClick: handleClick }}
      />
    );
    
    const button = screen.getByRole("button", { name: /add item/i });
    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });

  it("uses custom icon when provided", () => {
    render(<EmptyState title="No items" icon={Plus} />);
    
    expect(screen.getByLabelText("No items")).toBeInTheDocument();
  });
});

describe("LoadingState", () => {
  it("renders with default message", () => {
    render(<LoadingState />);
    
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders with custom message", () => {
    render(<LoadingState message="Fetching data..." />);
    
    expect(screen.getByText("Fetching data...")).toBeInTheDocument();
  });

  it("has accessible loading status", () => {
    render(<LoadingState message="Processing" />);
    
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Processing");
  });
});

describe("ErrorState", () => {
  it("renders default error message", () => {
    render(<ErrorState />);
    
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders custom title and message", () => {
    render(
      <ErrorState 
        title="Connection Failed" 
        message="Unable to connect to the server" 
      />
    );
    
    expect(screen.getByText("Connection Failed")).toBeInTheDocument();
    expect(screen.getByText("Unable to connect to the server")).toBeInTheDocument();
  });

  it("calls retry function when button clicked", async () => {
    const handleRetry = vi.fn();
    render(<ErrorState retry={handleRetry} />);
    
    const button = screen.getByRole("button", { name: /try again/i });
    await userEvent.click(button);
    expect(handleRetry).toHaveBeenCalled();
  });

  it("has alert role for accessibility", () => {
    render(<ErrorState />);
    
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("NoResults", () => {
  it("renders default message", () => {
    render(<NoResults />);
    
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("renders query in message", () => {
    render(<NoResults query="test search" />);
    
    expect(screen.getByText('No results for "test search"')).toBeInTheDocument();
  });

  it("calls onClear when button clicked", async () => {
    const handleClear = vi.fn();
    render(<NoResults onClear={handleClear} />);
    
    const button = screen.getByRole("button", { name: /clear search/i });
    await userEvent.click(button);
    expect(handleClear).toHaveBeenCalled();
  });
});

describe("MetricCard", () => {
  it("renders label and value", () => {
    render(<MetricCard label="Total Users" value={1234} />);
    
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("1234")).toBeInTheDocument();
  });

  it("renders with prefix and suffix", () => {
    render(<MetricCard label="Revenue" value={5000} prefix="$" suffix="USD" />);
    
    expect(screen.getByText("$")).toBeInTheDocument();
    expect(screen.getByText("5000")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("renders trend indicator", () => {
    render(
      <MetricCard 
        label="Growth" 
        value={100} 
        trend={{ value: 12, positive: true, label: "vs last month" }}
      />
    );
    
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText("vs last month")).toBeInTheDocument();
  });

  it("handles click when onClick provided", async () => {
    const handleClick = vi.fn();
    render(<MetricCard label="Clickable" value={42} onClick={handleClick} />);
    
    const card = screen.getByRole("button");
    await userEvent.click(card);
    expect(handleClick).toHaveBeenCalled();
  });

  it("supports keyboard navigation when clickable", async () => {
    const handleClick = vi.fn();
    render(<MetricCard label="Keyboard" value={1} onClick={handleClick} />);
    
    const card = screen.getByRole("button");
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(handleClick).toHaveBeenCalled();
  });
});

describe("MetricGrid", () => {
  it("renders children in grid layout", () => {
    render(
      <MetricGrid>
        <MetricCard label="One" value={1} />
        <MetricCard label="Two" value={2} />
      </MetricGrid>
    );
    
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });
});

describe("FormField", () => {
  it("renders label and input", () => {
    render(<FormField label="Email" type="email" />);
    
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows required indicator", () => {
    render(<FormField label="Name" required />);
    
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(<FormField label="Password" error="Password is required" />);
    
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("displays hint text", () => {
    render(<FormField label="Username" hint="Must be unique" />);
    
    expect(screen.getByText("Must be unique")).toBeInTheDocument();
  });

  it("has proper aria attributes for accessibility", () => {
    render(<FormField label="Test" error="Error message" />);
    
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});

describe("FormTextarea", () => {
  it("renders label and textarea", () => {
    render(<FormTextarea label="Description" />);
    
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("shows character count when enabled", () => {
    render(
      <FormTextarea 
        label="Bio" 
        maxLength={100} 
        showCount 
        value="Test text" 
      />
    );
    
    expect(screen.getByText("9/100")).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(<FormTextarea label="Notes" error="Notes are required" />);
    
    expect(screen.getByText("Notes are required")).toBeInTheDocument();
  });
});
