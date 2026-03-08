import Index from "@/app/index";
import { render } from "@testing-library/react-native";

describe("Index screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render", () => {
    const { getByTestId } = render(<Index />);
    expect(getByTestId("index-screen")).toBeTruthy();
  });
});
