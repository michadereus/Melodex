import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

function Dummy() {
  return <div>hello</div>;
}

describe('UI-010', () => {
  it('renders placeholder component', () => {
    render(<Dummy />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});